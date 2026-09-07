export const useEditorStore = defineStore('editor', () => {
  const title = ref('')
  // Plain-text placeholder body — becomes rich content once TipTap is reintroduced.
  const content = ref('')
  const statusMessage = ref('Ready')

  // Object URL for the chosen header image — local preview only this phase,
  // not uploaded or persisted. Lives on the store (not the field component) so
  // it survives the component unmounting and there's one place that revokes it.
  const headerImageUrl = ref<string | null>(null)
  // object-position for the preview, as x/y percentages (0–100). Only shifts
  // anything on an axis where the image overflows its frame under
  // object-fit: cover — the field component drives it from drag / arrow keys.
  const headerImagePosition = ref({ x: 50, y: 50 })

  function setHeaderImage(file: File) {
    if (headerImageUrl.value) URL.revokeObjectURL(headerImageUrl.value)
    headerImageUrl.value = URL.createObjectURL(file)
    headerImagePosition.value = { x: 50, y: 50 }
  }

  function clearHeaderImage() {
    if (headerImageUrl.value) URL.revokeObjectURL(headerImageUrl.value)
    headerImageUrl.value = null
    headerImagePosition.value = { x: 50, y: 50 }
  }

  function moveHeaderImage(x: number, y: number) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    headerImagePosition.value = { x: clamp(x), y: clamp(y) }
  }

  const wordCount = computed(() =>
    content.value.trim() ? content.value.trim().split(/\s+/).length : 0,
  )

  return {
    title,
    content,
    statusMessage,
    headerImageUrl,
    headerImagePosition,
    setHeaderImage,
    clearHeaderImage,
    moveHeaderImage,
    wordCount,
  }
})
