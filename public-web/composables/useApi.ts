/**
 * The single HTTP client for the Laravel API.
 *
 * Server: hits Laravel directly and forwards the incoming request's cookie
 * header so the Sanctum stateful guard can identify the SSR viewer.
 * Client: relative `/api`, same-origin through the dev/prod proxy, and
 * credentialed so the shared session cookie rides along. If the browser holds a
 * bearer token it's attached, and Sanctum's CSRF cookie is primed once before
 * the first mutating request.
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

export function useApi() {
  const config = useRuntimeConfig()
  const serverHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return $fetch.create({
    baseURL: import.meta.server ? config.apiBase : config.public.apiBase,
    credentials: 'include',
    headers: serverHeaders,
    async onRequest({ options }) {
      if (!import.meta.client) return

      const token = localStorage.getItem('auth_token')
      if (token) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }

      const method = (options.method ?? 'GET').toUpperCase()
      if (method !== 'GET' && method !== 'HEAD') {
        await ensureCsrfCookie()
      }
    },
  })
}
