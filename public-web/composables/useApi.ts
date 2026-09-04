/**
 * Server: hits Laravel directly and forwards the incoming request's cookie
 * header so the Sanctum stateful guard can identify the SSR viewer.
 * Client: relative `/api`, same-origin through the dev/prod proxy, and
 * credentialed so the shared session cookie rides along automatically.
 */
export function useApi() {
  const config = useRuntimeConfig()

  return $fetch.create({
    baseURL: import.meta.server ? config.apiBase : config.public.apiBase,
    credentials: 'include',
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  })
}
