export const useEditorStore = defineStore('editor', () => {
  const title = ref('')
  // Plain-text placeholder body — becomes rich content once TipTap is reintroduced.
  const content = ref('')
  const statusMessage = ref('Ready')

  const wordCount = computed(() =>
    content.value.trim() ? content.value.trim().split(/\s+/).length : 0,
  )

  return { title, content, statusMessage, wordCount }
})
