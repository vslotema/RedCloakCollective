// GET /link-preview?url=<encoded> — fetches the target page server-side and
// pulls its Open Graph / Twitter / <title> metadata for the editor's link card.
//
// Lives under server/routes/ (not server/api/) because nuxt.config routeRules
// proxies every /api/** path straight to Laravel.
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
const UA =
  'Mozilla/5.0 (compatible; RedCloakBot/1.0; +https://redcloakcollective.example)'

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
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // property="og:x" content="..."  — in either attribute order
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
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

function extract(html: string, finalUrl: string): Omit<LinkPreview, 'url'> {
  const head = html.slice(0, html.search(/<\/head>/i) + 1 || html.length)

  const title =
    metaContent(head, ['og:title', 'twitter:title']) ??
    (head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
      ? decodeEntities(head.match(/<title[^>]*>([^<]*)<\/title>/i)![1]).trim()
      : null)

  const description = metaContent(head, [
    'og:description',
    'twitter:description',
    'description',
  ])

  let image = metaContent(head, ['og:image', 'og:image:url', 'twitter:image'])
  if (image) {
    try {
      image = new URL(image, finalUrl).toString()
    } catch {
      image = null
    }
  }

  const siteName =
    metaContent(head, ['og:site_name', 'application-name']) ??
    (() => {
      try {
        return new URL(finalUrl).hostname.replace(/^www\./, '')
      } catch {
        return null
      }
    })()

  return { title: title || null, description, image, siteName }
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
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    })
    if (!res.ok) return empty
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) return empty
    if (isBlockedHost(new URL(res.url).hostname)) return empty

    const buf = await res.arrayBuffer()
    const html = new TextDecoder('utf-8').decode(buf.slice(0, MAX_HTML_BYTES))
    return { url: res.url || target.toString(), ...extract(html, res.url || target.toString()) }
  } catch {
    return empty
  }
})
