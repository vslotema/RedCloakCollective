<script setup lang="ts">
import type { Topic } from '~/types/article'
import type { DraftTopic } from '~/stores/editor'

const open = defineModel<boolean>({ default: false })

const editorStore = useEditorStore()
const api = useApi()

const MAX_TOPICS = 5

/** Combobox model — existing topics come back as objects, typed ones as strings. */
const selected = ref<(Topic | string)[]>([])
const excerpt = ref('')
const mode = ref<'now' | 'schedule'>('now')
const scheduleAt = ref('')

const allTopics = ref<Topic[]>([])
const topicsLoading = ref(false)
const submitting = ref(false)
const error = ref('')

const scheduling = computed(() => mode.value === 'schedule')
const atLimit = computed(() => selected.value.length >= MAX_TOPICS)

const selectedNames = computed(
  () =>
    new Set(
      selected.value.map((e) => (typeof e === 'string' ? e : e.name).trim().toLowerCase()),
    ),
)

/** List options minus what's already picked. */
const menuItems = computed(() =>
  allTopics.value.filter((t) => !selectedNames.value.has(t.name.toLowerCase())),
)

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in the viewer's local time. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const minDateTime = computed(() => toLocalInput(new Date(Date.now() + 5 * 60_000)))

const scheduleLabel = computed(() => {
  if (!scheduleAt.value) return 'Schedule'
  const d = new Date(scheduleAt.value)
  return `Schedule for ${d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  selected.value = editorStore.topics.map((t) =>
    t.id === null ? t.name : ({ id: t.id, name: t.name, slug: t.slug ?? '', curated: false } as Topic),
  )
  excerpt.value = editorStore.excerpt
  const wasScheduled = editorStore.articleState === 'scheduled'
  mode.value = wasScheduled ? 'schedule' : 'now'
  scheduleAt.value =
    wasScheduled && editorStore.publishedAt ? toLocalInput(new Date(editorStore.publishedAt)) : ''
  error.value = ''
  if (!allTopics.value.length) await loadTopics()
})

async function loadTopics() {
  topicsLoading.value = true
  try {
    allTopics.value = await api<Topic[]>('/topics')
  } catch {
    // The picker still works for typing new topics.
  } finally {
    topicsLoading.value = false
  }
}

// Cap the selection and drop case-insensitive duplicates of typed topics.
watch(selected, (value) => {
  const seen = new Set<string>()
  const deduped = value.filter((entry) => {
    const key = (typeof entry === 'string' ? entry : entry.name).trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  const capped = deduped.slice(0, MAX_TOPICS)
  if (capped.length !== value.length) selected.value = capped
})

function toDraftTopics(): DraftTopic[] {
  return selected.value.map((entry) =>
    typeof entry === 'string'
      ? { id: null, name: entry.trim() }
      : { id: entry.id, name: entry.name, slug: entry.slug },
  )
}

async function submit() {
  error.value = ''
  const topics = toDraftTopics()
  if (topics.length === 0) {
    error.value = 'Add at least one topic.'
    return
  }
  if (scheduling.value && !scheduleAt.value) {
    error.value = 'Pick a date and time.'
    return
  }

  submitting.value = true
  editorStore.setTopics(topics)
  editorStore.setExcerpt(excerpt.value)
  try {
    await editorStore.publish(
      scheduling.value ? { publishAt: new Date(scheduleAt.value).toISOString() } : {},
    )
    open.value = false
  } catch {
    error.value = editorStore.saveError || 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="560" scrollable>
    <v-card rounded="lg" color="white" elevation="0" class="publish-card pa-8">
      <h2 class="text-h5 font-weight-bold mb-1">Ready to publish</h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Add topics and a preview so readers can find your story.
      </p>

      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
        {{ error }}
      </v-alert>

      <span class="field-label">
        Topics
        <span class="text-medium-emphasis">— {{ selected.length }}/{{ MAX_TOPICS }}</span>
      </span>
      <v-combobox
        v-model="selected"
        :items="menuItems"
        :loading="topicsLoading"
        item-title="name"
        return-object
        multiple
        chips
        closable-chips
        variant="outlined"
        rounded="lg"
        density="compact"
        :placeholder="atLimit ? '' : 'Choose a topic or type your own'"
        :menu-props="{ maxHeight: 260 }"
        :disabled="submitting"
        hint="Pick from the list or type a new topic and press Enter"
        persistent-hint
        class="mb-5"
      />

      <span class="field-label">Preview subtitle <span class="text-medium-emphasis">(optional)</span></span>
      <v-textarea
        v-model="excerpt"
        variant="outlined"
        rounded="lg"
        density="compact"
        rows="2"
        auto-grow
        counter="280"
        maxlength="280"
        placeholder="A sentence or two shown on cards and in search results."
        :disabled="submitting"
        class="mb-5"
      />

      <span class="field-label">When</span>
      <v-btn-toggle
        v-model="mode"
        mandatory
        divided
        density="comfortable"
        variant="outlined"
        rounded="lg"
        class="mb-3 d-flex"
      >
        <v-btn value="now" class="flex-grow-1">Publish now</v-btn>
        <v-btn value="schedule" class="flex-grow-1">Schedule</v-btn>
      </v-btn-toggle>

      <v-expand-transition>
        <v-text-field
          v-if="scheduling"
          v-model="scheduleAt"
          type="datetime-local"
          :min="minDateTime"
          variant="outlined"
          rounded="lg"
          density="compact"
          hide-details
          :disabled="submitting"
          class="mb-2"
        />
      </v-expand-transition>

      <div class="d-flex justify-end ga-2 mt-6">
        <v-btn variant="text" rounded="pill" :disabled="submitting" @click="open = false">
          Cancel
        </v-btn>
        <v-btn
          color="tertiary"
          variant="flat"
          rounded="pill"
          class="font-weight-bold"
          :loading="submitting"
          @click="submit"
        >
          {{ scheduling ? scheduleLabel : 'Publish' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.publish-card {
  border: 1px solid #e0e0e0;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}
</style>
