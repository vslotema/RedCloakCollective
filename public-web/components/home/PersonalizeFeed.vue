<script setup lang="ts">
import type { FeedRecommendations } from "~/types/recommendation";

const authStore = useAuthStore();
const api = useApi();

const loading = ref(true);
const error = ref(false);
const saving = ref(false);
const recs = ref<FeedRecommendations | null>(null);

// Everything is pre-selected so the common case ("this all looks right") is a
// single click. The user unticks anything they don't want.
const selectedTopicIds = ref<Set<number>>(new Set());
const selectedUsernames = ref<Set<string>>(new Set());

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const data = await api<FeedRecommendations>("/onboarding/recommendations");
    recs.value = data;
    selectedTopicIds.value = new Set(
      data.topics.filter((t) => t.following).map((t) => t.id),
    );
    selectedUsernames.value = new Set(data.people.map((p) => p.username));
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function toggleTopic(id: number) {
  const next = new Set(selectedTopicIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedTopicIds.value = next;
}

function togglePerson(username: string) {
  const next = new Set(selectedUsernames.value);
  if (next.has(username)) next.delete(username);
  else next.add(username);
  selectedUsernames.value = next;
}

async function submit(topicIds: number[], usernames: string[]) {
  saving.value = true;
  try {
    await authStore.personalizeFeed({ topicIds, usernames });
  } finally {
    saving.value = false;
  }
}

const applySelection = () =>
  submit([...selectedTopicIds.value], [...selectedUsernames.value]);

const skip = () => submit([], []);
</script>

<template>
  <div class="personalize">
    <h1 class="text-h5">Personalize your feed</h1>
    <p>
      Based on your answers, here's what we'd suggest following. Pick what looks
      useful — you can change any of this later.
    </p>

    <div v-if="loading" class="personalize__state">
      <v-progress-circular indeterminate color="primary" size="32" />
      <span>Setting up your recommendations…</span>
    </div>

    <div v-else-if="error" class="personalize__state">
      <v-alert type="error" variant="tonal" density="compact">
        We couldn't load your recommendations.
      </v-alert>
      <v-btn variant="text" @click="load">Try again</v-btn>
    </div>

    <template v-else-if="recs">
      <section v-if="recs.topics.length" class="mt-8">
        <h2 class="text-medium font-heading mb-4">Topics</h2>
        <div class="d-flex flex-wrap ga-2">
          <RecommendedTopicChip
            v-for="topic in recs.topics"
            :key="topic.id"
            :label="topic.name"
            :added="selectedTopicIds.has(topic.id)"
            @toggle="toggleTopic(topic.id)"
          />
        </div>
      </section>

      <section v-if="recs.people.length" class="mt-8">
        <h2 class="text-medium font-heading mb-4">People to follow</h2>
        <div class="d-flex flex-column ga-6">
          <SuggestedFollowItem
            v-for="person in recs.people"
            :key="person.id"
            :person="person"
            :selected="selectedUsernames.has(person.username)"
            @toggle="togglePerson(person.username)"
          />
        </div>
      </section>

      <div
        class="personalize__actions d-flex align-center justify-end ga-3 mt-10"
      >
        <v-btn variant="text" :disabled="saving" @click="skip"
          >Skip for now</v-btn
        >
        <v-btn
          color="primary"
          rounded="pill"
          class="font-weight-bold"
          :loading="saving"
          @click="applySelection"
        >
          Follow selected & continue
        </v-btn>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.personalize {
  max-width: 940px;

  &__state {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8) 0;
    color: rgb(var(--v-theme-on-surface-variant));
  }
}
</style>
