<script setup lang="ts">
import type { FeedRecommendations } from "~/types/recommendation";

interface Props {
  width?: string;
}

const { width = "350px" } = defineProps<Props>();

const api = useApi();

const loading = ref(true);
const recs = ref<FeedRecommendations | null>(null);
// Topic ids that weren't followed at load time — this list is frozen for the
// session so a topic stays visible (as "added") after the user follows it, and
// only drops off on the next page load.
const shownTopicIds = ref<Set<number>>(new Set());
// usernames the viewer currently follows (seeded from nothing — the panel only
// surfaces people they don't follow yet, and flips locally on toggle).
const followedUsernames = ref<Set<string>>(new Set());
const pending = ref<Set<string | number>>(new Set());

onMounted(async () => {
  try {
    recs.value = await api<FeedRecommendations>("/onboarding/recommendations", {
      query: { topics_limit: 7, creators_limit: 3 },
    });
    shownTopicIds.value = new Set(
      recs.value.topics.filter((t) => !t.following).map((t) => t.id),
    );
  } finally {
    loading.value = false;
  }
});

// Topics that were unfollowed at load. Membership is fixed for the session;
// following one flips its chip to "added" but doesn't remove it until refresh.
const shownTopics = computed(
  () => recs.value?.topics.filter((t) => shownTopicIds.value.has(t.id)) ?? [],
);

const topicIconColors = ["#8B5CF6", "#F59E0B", "#F97316", "#10B981", "#3B82F6"];
const topicColor = (index: number) =>
  topicIconColors[index % topicIconColors.length] ?? '#8B5CF6';

async function toggleTopic(slug: string, following: boolean) {
  if (pending.value.has(slug)) return;
  pending.value.add(slug);
  try {
    await api(`/topics/${slug}/follow`, {
      method: following ? "DELETE" : "POST",
    });
    const topic = recs.value?.topics.find((t) => t.slug === slug);
    if (topic) topic.following = !following;
  } finally {
    pending.value.delete(slug);
  }
}

async function toggleCreator(username: string) {
  if (pending.value.has(username)) return;
  pending.value.add(username);
  const following = followedUsernames.value.has(username);
  try {
    await api(`/users/${username}/follow`, {
      method: following ? "DELETE" : "POST",
    });
    const next = new Set(followedUsernames.value);
    if (following) next.delete(username);
    else next.add(username);
    followedUsernames.value = next;
  } finally {
    pending.value.delete(username);
  }
}
</script>

<template>
  <div class="panel-container" :style="{ width }">
    <div v-if="loading" class="panel-loading">
      <v-progress-circular indeterminate color="primary" size="24" />
    </div>

    <template v-else-if="recs">
      <section v-if="shownTopics.length" class="mb-8">
        <h2 class="text-small mb-6">RECOMMENDED TOPICS</h2>
        <div class="d-flex flex-column ga-4">
          <RecommendedTopicRow
            v-for="(topic, index) in shownTopics"
            :key="topic.id"
            :label="topic.name"
            :added="topic.following"
            :color="topicColor(index)"
            @toggle="toggleTopic(topic.slug, topic.following)"
          />
        </div>
        <v-btn
          :ripple="false"
          variant="text"
          to="/home/explore"
          class="see-more px-0 mt-4 text-primary d-flex justify-start align-center"
        >
          See more topics <v-icon class="ml-1" icon="chevron-right" size="small"></v-icon>
        </v-btn>
      </section>

      <section v-if="recs.creators.length">
        <h2 class="text-small mb-6">RECOMMENDED FOLLOWERS</h2>
        <div class="d-flex flex-column">
          <RecommendedFollowerCard
            v-for="creator in recs.creators"
            :key="creator.id"
            :person="creator"
            :selected="followedUsernames.has(creator.username)"
            @toggle="toggleCreator(creator.username)"
          />
        </div>
        <v-btn
          :ripple="false"
          variant="text"
          to="/home/explore"
          class="see-more px-0 mt-4 text-primary"
        >
          See more suggestions <v-icon class="ml-1" icon="chevron-right" size="small"></v-icon>
        </v-btn>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.panel-container {
  background: rgb(var(--v-theme-background));
  padding: var(--space-8) var(--space-6);
}

.panel-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-8) 0;
}

.see-more {
  :deep(.v-btn__overlay) {
    opacity: 0;
  }

  &:hover {
    color: rgb(var(--v-theme-ink));
  }
}
</style>
