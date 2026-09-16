export function useHomeFeedState() {
  const authStore = useAuthStore()

  const topicsOnboarded = computed(() => authStore.user?.topicsOnboarded ?? true)
  const feedPersonalized = computed(() => authStore.user?.feedPersonalized ?? true)

  const showQuestionnaire = computed(() => !topicsOnboarded.value)
  const showPersonalize = computed(() => topicsOnboarded.value && !feedPersonalized.value)
  const showFeed = computed(() => !showQuestionnaire.value && !showPersonalize.value)

  return { showQuestionnaire, showPersonalize, showFeed }
}
