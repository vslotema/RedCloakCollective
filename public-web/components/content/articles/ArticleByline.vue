<script setup lang="ts">
import type { ArticleAuthor } from "~/types/article";

interface ViewerRelationship {
  viewer_is_self: boolean;
  viewer_is_following: boolean;
}

const props = defineProps<{
  author: ArticleAuthor;
  publishedAt: string | null;
  readingMinutes: number;
  interactive: boolean;
}>();

const api = useApi();
const authStore = useAuthStore();

const viewerRelationship = ref<ViewerRelationship | null>(null);
const viewerRelationshipLoaded = ref(false);

onMounted(async () => {
  if (props.interactive && (await authStore.ensureUser())) {
    try {
      viewerRelationship.value = await api<ViewerRelationship>(
        `/users/${props.author.username}`,
      );
    } catch {
      viewerRelationship.value = null;
    }
  }
  viewerRelationshipLoaded.value = true;
});

const showFollowButton = computed(
  () =>
    viewerRelationshipLoaded.value && !viewerRelationship.value?.viewer_is_self,
);

const authorInitials = computed(() =>
  props.author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join(""),
);

const publishedDateLabel = computed(() =>
  props.publishedAt
    ? new Date(props.publishedAt).toLocaleDateString(undefined, {
        dateStyle: "long",
      })
    : "Not published yet",
);
</script>

<template>
  <div class="d-flex align-center flex-wrap ga-4">
    <div class="d-flex align-center ga-2">
      <v-avatar
        size="32"
        color="secondary-lighten-5"
        class="text-secondary font-weight-bold"
      >
        {{ authorInitials }}
      </v-avatar>

      <NuxtLink
        :to="`/u/${author.username}`"
        class="author-name text-small text-decoration-none"
      >
        {{ author.name }}
      </NuxtLink>
      <FollowButton
        v-if="showFollowButton"
        :username="author.username"
        :initial-following="viewerRelationship?.viewer_is_following ?? false"
        :disabled="!interactive"
        size="small"
        outlined
      />
    </div>

    <span class="d-inline-flex align-center ga-2 text-x-small">
      <span>{{ readingMinutes }} min read</span>
      <span aria-hidden="true">·</span>
      <span>{{ publishedDateLabel }}</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
.author-name {
  color: rgb(var(--v-theme-ink));
}
</style>
