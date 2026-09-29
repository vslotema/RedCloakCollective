// Applied to /onboarding — the inverse of middleware/auth.ts. Already-logged-in
// visitors get sent to the home feed instead of seeing the sign-in screen.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const user = await useAuthStore().ensureUser()
  if (user) {
    return navigateTo('/')
  }
})
