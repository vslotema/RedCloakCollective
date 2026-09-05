// Applied to /onboarding — the inverse of middleware/auth.ts. Already-logged-in
// visitors get sent to the home feed instead of seeing the sign-in screen.
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const { token } = useAuthStore()
  if (token) {
    return navigateTo('/')
  }
})
