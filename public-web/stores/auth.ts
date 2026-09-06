export interface User {
  id: number
  name: string
  email: string
  country: string | null
  state: string | null
  hasFollows: boolean
  topicsOnboarded: boolean
  feedPersonalized: boolean
  onboarding_answers: Record<string, unknown> | null
}

export const useAuthStore = defineStore('auth', () => {
  const api = useApi()

  const user = ref<User | null>(null)
  // This store is instantiated on every page (app.vue calls useAuthStore()
  // unconditionally), including SSR'd public pages where localStorage doesn't
  // exist — only read/write it client-side.
  const token = ref<string | null>(import.meta.client ? localStorage.getItem('auth_token') : null)

  async function fetchUser() {
    if (!token.value) return
    user.value = await api<User>('/user')
  }

  function setToken(newToken: string) {
    token.value = newToken
    if (import.meta.client) localStorage.setItem('auth_token', newToken)
  }

  async function updateLocation(country: string, state: string | null) {
    const { user: updated } = await api<{ user: User }>('/user/location', {
      method: 'PATCH',
      body: { country, state },
    })
    user.value = updated
  }

  async function saveOnboardingAnswers(answers: Record<string, unknown> | null) {
    const { user: updated } = await api<{ user: User }>('/onboarding', {
      method: 'POST',
      body: { answers },
    })
    user.value = updated
    return updated
  }

  // Persist the explicit follow choices from the "Personalize your feed" screen.
  // Empty arrays are the "skip" path (feed marked personalised, nothing followed).
  async function personalizeFeed(payload: { topicIds: number[]; usernames: string[] }) {
    const { user: updated } = await api<{ user: User }>('/onboarding/personalize', {
      method: 'POST',
      body: { topic_ids: payload.topicIds, usernames: payload.usernames },
    })
    user.value = updated
    return updated
  }

  function logout() {
    token.value = null
    user.value = null
    if (import.meta.client) localStorage.removeItem('auth_token')
  }

  return {
    user,
    token,
    fetchUser,
    setToken,
    updateLocation,
    saveOnboardingAnswers,
    personalizeFeed,
    logout,
  }
})
