// Applied to authenticated app pages (all ssr:false) — ported from the old
// SPA's router.beforeEach guard. Named rather than global so it can never
// accidentally apply to the public SSR'd routes.
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const { token } = useAuthStore()
  if (!token) {
    return navigateTo('/onboarding')
  }
})
