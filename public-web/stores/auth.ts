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
  const resolved = ref(false)
  let pendingUser: Promise<User | null> | null = null

  async function fetchUser() {
    try {
      user.value = await api<User>('/user')
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 401) throw error
      user.value = null
    }
    resolved.value = true
    return user.value
  }

  // Auth lives in httpOnly cookies, so the only way to know who's logged in
  // is to ask the API. Resolves once per page load and is shared by callers.
  function ensureUser() {
    if (resolved.value) return Promise.resolve(user.value)
    pendingUser ??= fetchUser().finally(() => {
      pendingUser = null
    })
    return pendingUser
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

  async function logout() {
    await api('/logout', { method: 'POST' })
    user.value = null
  }

  return {
    user,
    resolved,
    fetchUser,
    ensureUser,
    updateLocation,
    saveOnboardingAnswers,
    personalizeFeed,
    logout,
  }
})
