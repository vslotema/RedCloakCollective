/**
 * The single HTTP client for the Laravel API.
 *
 * Server: hits Laravel directly and forwards the incoming request's cookie
 * header so the Sanctum stateful guard can identify the SSR viewer.
 * Client: relative `/api`, same-origin through the dev/prod proxy, and
 * credentialed so the httpOnly session + device cookies ride along. Auth is
 * cookie-only — nothing readable by JavaScript identifies the user. Mutating
 * requests prime Sanctum's CSRF cookie once and echo it back as X-XSRF-TOKEN;
 * a 419 (session expired or rotated mid-flight) re-primes and retries once.
 *
 * Returns an ofetch instance: `await api<T>('/path')` for GET,
 * `await api<T>('/path', { method: 'POST', body })` otherwise — the parsed body
 * is returned directly (no axios-style `{ data }` wrapper).
 */
let csrfCookiePromise: Promise<unknown> | null = null

function ensureCsrfCookie() {
  if (!csrfCookiePromise) {
    csrfCookiePromise = $fetch('/sanctum/csrf-cookie', { credentials: 'include' }).catch((err) => {
      csrfCookiePromise = null
      throw err
    })
  }
  return csrfCookiePromise
}

function readXsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]!) : null
}

export function useApi() {
  const config = useRuntimeConfig()
  const serverHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return $fetch.create({
    baseURL: import.meta.server ? config.apiBase : config.public.apiBase,
    credentials: 'include',
    headers: serverHeaders,
    async onRequest({ options }) {
      if (!import.meta.client) return

      const method = (options.method ?? 'GET').toUpperCase()
      if (method === 'GET' || method === 'HEAD') return

      await ensureCsrfCookie()
      const xsrfToken = readXsrfToken()
      if (xsrfToken) {
        const headers = new Headers(options.headers)
        headers.set('X-XSRF-TOKEN', xsrfToken)
        options.headers = headers
      }

      if (options.retry === undefined) {
        options.retry = 1
        options.retryStatusCodes = [419]
      }
    },
    onResponseError({ response }) {
      if (response.status === 419) csrfCookiePromise = null
    },
  })
}
