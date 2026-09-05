import axios from 'axios'

// This client is only ever used by the ssr:false authenticated-app pages
// (client-side only), so a plain same-origin base is always correct — no
// server/client split needed here (unlike composables/useApi.ts, which does
// need one for the SSR'd public pages).
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

// Sanctum's stateful-SPA session (used so Nuxt SSR can identify the viewer)
// requires a CSRF cookie before any mutating request. Fetch it lazily, once,
// the first time it's needed, rather than on every page load.
let csrfCookiePromise: Promise<unknown> | null = null

function ensureCsrfCookie() {
  if (!csrfCookiePromise) {
    csrfCookiePromise = axios.get('/sanctum/csrf-cookie', { withCredentials: true }).catch((err) => {
      csrfCookiePromise = null
      throw err
    })
  }
  return csrfCookiePromise
}

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.method && config.method.toLowerCase() !== 'get') {
    await ensureCsrfCookie()
  }
  return config
})

export default api
