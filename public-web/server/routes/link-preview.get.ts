// GET /link-preview?url=<encoded> — fetches the target page server-side and
// pulls its Open Graph / Twitter / JSON-LD / <title> metadata for the editor's
// link card.
//
// Lives under server/routes/ (not server/api/) because nuxt.config routeRules
// proxies every /api/** path straight to Laravel.
//
// Limits: this is a plain fetch + regex scrape. It's good for sites that serve
// Open Graph tags (news, blogs, YouTube, Wikipedia, GitHub, most CMSes) but
// can't get past bot-blocking retail sites (Amazon, etc.) that return a stub
// page to any non-browser client — those would need a paid extraction service.
//
// SSRF note: the host/IP checks below are a first pass and don't defend against
// DNS rebinding. Fine while this is only reachable from the editor; revisit if
// it's ever exposed more widely.

export interface LinkPreview {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

const FETCH_TIMEOUT_MS = 5000
const MAX_HTML_BYTES = 512_000
const MAX_DESCRIPTION = 300

// A real browser UA + Accept-Language gets full markup from sites that do light
// filtering (it won't fool Amazon-grade bot detection, nothing server-side will).
const BROWSER_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

// Image URLs that are almost certainly chrome (site logo, sprite sheet) rather
// than the page's own hero image.
const GENERIC_IMAGE =
  /(?:^|[/_-])(?:logo|logos|sprite|sprites|icon|icons|favicon|placeholder|default|blank|shoppingportal)(?:[/_.-]|$)/i

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost')) {
    return true
  }
  // IPv6 loopback / unique-local / link-local
  if (host === '::1' || /^f[cd][0-9a-f]{2}:/i.test(host) || /^fe80:/i.test(host)) {
    return true
  }
  // IPv4 private / loopback / link-local / this-network
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b] = v4.slice(1).map(Number)
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  return false
}

function validateTarget(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported protocol' })
  }
  if (isBlockedHost(parsed.hostname)) {
    throw createError({ statusCode: 400, statusMessage: 'Blocked host' })
  }
  return parsed
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .trim()
}

function clampDescription(value: string | null): string | null {
  if (!value) return null
  const text = value.trim()
  if (!text) return null
  // Trim to a word boundary; the card clamps to 2 lines and adds its own "…".
  return text.length > MAX_DESCRIPTION
    ? text.slice(0, MAX_DESCRIPTION).replace(/\s+\S*$/, '')
    : text
}

function resolveUrl(candidate: string | null, base: string): string | null {
  if (!candidate) return null
  try {
    return new URL(candidate, base).toString()
  } catch {
    return null
  }
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // property/name/itemprop="og:x" content="..." — in either attribute order
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]+content=["']([^"']*)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name|itemprop)=["']${key}["']`,
        'i',
      ),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]) return decodeEntities(m[1]).trim()
    }
  }
  return null
}

/** First <link> whose rel attribute contains `relToken` (rel can be multi-valued). */
function linkHref(html: string, relToken: string): string | null {
  const rel = `["'][^"']*\\b${relToken}\\b[^"']*["']`
  const m =
    html.match(new RegExp(`<link[^>]+rel=${rel}[^>]+href=["']([^"']+)["']`, 'i')) ??
    html.match(new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=${rel}`, 'i'))
  return m?.[1] ? decodeEntities(m[1]).trim() : null
}

function isGenericImage(url: string): boolean {
  try {
    return GENERIC_IMAGE.test(new URL(url).pathname)
  } catch {
    return true
  }
}

/** Flattened JSON-LD nodes (unwraps @graph), newest schema.org convention. */
function jsonLdNodes(html: string): Record<string, unknown>[] {
  const blocks =
    html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? []
  const nodes: Record<string, unknown>[] = []
  for (const block of blocks) {
    const raw = block
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim()
    try {
      const parsed = JSON.parse(raw)
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        if (node && typeof node === 'object') {
          nodes.push(node as Record<string, unknown>)
          const graph = (node as Record<string, unknown>)['@graph']
          if (Array.isArray(graph)) {
            nodes.push(
              ...graph.filter(
                (n): n is Record<string, unknown> => !!n && typeof n === 'object',
              ),
            )
          }
        }
      }
    } catch {
      // malformed JSON-LD — skip it
    }
  }
  return nodes
}

function ldString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = ldString(item)
      if (s) return s
    }
    return null
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    return ldString(o.url ?? o.name ?? o.headline ?? o['@value'] ?? o.caption)
  }
  return null
}

function ldPick(nodes: Record<string, unknown>[], keys: string[]): string | null {
  for (const key of keys) {
    for (const node of nodes) {
      const s = ldString(node[key])
      if (s) return s
    }
  }
  return null
}

function extract(html: string, finalUrl: string): Omit<LinkPreview, 'url'> {
  const head = html.slice(0, html.search(/<\/head>/i) + 1 || html.length)
  const ld = jsonLdNodes(html)
  const host = (() => {
    try {
      return new URL(finalUrl).hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  })()

  const rawTitleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const title =
    metaContent(head, ['og:title', 'twitter:title']) ||
    ldPick(ld, ['headline', 'name']) ||
    (rawTitleTag ? decodeEntities(stripTags(rawTitleTag)) : null)

  let description = clampDescription(
    metaContent(head, [
      'og:description',
      'twitter:description',
      'description',
    ]) ||
      ldPick(ld, ['description']) ||
      bodyDescription(html),
  )

  // Prefer a real content image; fall back to whatever *can* be fetched (a
  // brand logo, apple-touch-icon) so the thumbnail isn't blank — only null if
  // the page exposes no image at all.
  const heroImage = resolveUrl(
    metaContent(head, [
      'og:image',
      'og:image:url',
      'og:image:secure_url',
      'twitter:image',
    ]) ||
      ldPick(ld, ['image', 'thumbnailUrl']) ||
      linkHref(head, 'image_src'),
    finalUrl,
  )
  const fallbackImage =
    resolveUrl(ldPick(ld, ['logo']), finalUrl) ||
    resolveUrl(linkHref(head, 'apple-touch-icon'), finalUrl) ||
    resolveUrl(linkHref(head, 'apple-touch-icon-precomposed'), finalUrl) ||
    resolveUrl(linkHref(head, 'icon'), finalUrl)
  const image =
    heroImage && !isGenericImage(heroImage)
      ? heroImage
      : heroImage || fallbackImage || null

  const siteName =
    metaContent(head, ['og:site_name', 'application-name']) || host

  // Clean up low-signal results so the card doesn't read "Amazon / Amazon".
  // (A bare site-name title is still kept — better than nothing.)
  if (
    description &&
    (description === title ||
      description === siteName ||
      description.toLowerCase() === host)
  ) {
    description = null
  }
  return {
    title: title || null,
    description: description || null,
    image,
    siteName: siteName || null,
  }
}

/**
 * Fallback description for pages with no og:/meta/JSON-LD description
 * (Wikipedia, many news sites): the first reasonably-long paragraph of the body.
 */
function bodyDescription(html: string): string | null {
  const body = html
    .slice((html.search(/<\/head>/i) + 1) || 0)
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  const paragraphs = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) ?? []
  for (const p of paragraphs) {
    const text = decodeEntities(stripTags(p))
    if (text.length >= 60) return text
  }
  return null
}

export default defineEventHandler(async (event): Promise<LinkPreview> => {
  const raw = String(getQuery(event).url ?? '')
  const target = validateTarget(raw)
  const empty: LinkPreview = {
    url: target.toString(),
    title: null,
    description: null,
    image: null,
    siteName: null,
  }

  try {
    const res = await fetch(target, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: BROWSER_HEADERS,
    })
    if (!res.ok) return empty
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) return empty
    if (isBlockedHost(new URL(res.url).hostname)) return empty

    const buf = await res.arrayBuffer()
    const html = new TextDecoder('utf-8').decode(buf.slice(0, MAX_HTML_BYTES))
    const finalUrl = res.url || target.toString()
    return { url: finalUrl, ...extract(html, finalUrl) }
  } catch {
    return empty
  }
})
