<script setup lang="ts">
withDefaults(
  defineProps<{
    showMenuToggle?: boolean;
    showSearch?: boolean;
    showWriteButton?: boolean;
    writeActions?: boolean;
  }>(),
  {
    showMenuToggle: false,
    showSearch: true,
    showWriteButton: true,
    writeActions: false,
  },
);

defineEmits<{
  toggleNavigation: [];
}>();
const editorStore = useEditorStore();
const publishing = ref(false);
const publishDialog = ref(false);

const saveStatus = computed(() => {
  if (editorStore.saving) return "Saving…";
  if (editorStore.saveError) return editorStore.saveError;
  if (editorStore.dirty) return "Unsaved changes";
  if (editorStore.savedAt) return "Saved";
  return "";
});

const scheduledLabel = computed(() => {
  if (editorStore.articleState !== "scheduled" || !editorStore.publishedAt) return "";
  return new Date(editorStore.publishedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
});

async function onUnpublish() {
  publishing.value = true;
  try {
    await editorStore.unpublish();
  } finally {
    publishing.value = false;
  }
}
</script>

<template>
  <v-app-bar
    class="px-4"
    color="surface"
    flat
    style="border-bottom: thin solid rgb(var(--v-theme-border-strong))"
  >
    <div class="d-flex align-center ga-8 ml-2">
      <v-btn
        v-if="showMenuToggle"
        class="menu-btn"
        icon="menu"
        size="small"
        color="ink"
        @click="$emit('toggleNavigation')"
      >
      </v-btn>
      <NuxtLink to="/" class="d-flex align-center text-decoration-none">
        <AppLogo height="35" />
      </NuxtLink>
      <SearchBar v-if="showSearch" />
    </div>

    <v-spacer />

    <div class="d-flex align-center ga-4">
      <template v-if="writeActions">
        <span
          class="text-body-2 text-medium-emphasis d-none d-sm-inline mr-1"
          aria-live="polite"
        >
          {{ saveStatus }}
        </span>
        <v-btn
          v-if="editorStore.saveError"
          size="small"
          variant="text"
          @click="editorStore.flush()"
        >
          Retry
        </v-btn>
        <span class="text-body-2 text-medium-emphasis d-none d-md-inline">
          {{ editorStore.wordCount }} words
        </span>
        <v-btn
          v-if="editorStore.published && editorStore.slug"
          :to="`/articles/${editorStore.slug}`"
          variant="text"
          size="small"
        >
          View
        </v-btn>

        <v-chip
          v-if="editorStore.articleState === 'scheduled'"
          size="small"
          color="tertiary"
          variant="tonal"
          prepend-icon="calendar"
        >
          Scheduled · {{ scheduledLabel }}
        </v-chip>

        <v-btn
          v-if="editorStore.articleState !== 'draft'"
          variant="outlined"
          size="small"
          rounded="pill"
          :loading="publishing"
          @click="onUnpublish"
        >
          {{ editorStore.articleState === "scheduled" ? "Cancel" : "Unpublish" }}
        </v-btn>
        <v-btn
          v-if="editorStore.articleState !== 'published'"
          color="tertiary"
          variant="flat"
          size="small"
          rounded="pill"
          class="font-weight-bold"
          @click="publishDialog = true"
        >
          {{ editorStore.articleState === "scheduled" ? "Reschedule" : "Publish" }}
        </v-btn>
        <ThemeToggleButton />
      </template>

      <template v-else>
        <v-btn
          v-if="showWriteButton"
          variant="flat"
          color="primary"
          rounded="pill"
          density="comfortable"
          class="font-weight-bold"
          prepend-icon="edit-3"
          to="/write"
        >
          Write
        </v-btn>
        <ThemeToggleButton />
        <v-badge color="primary" dot location="top end" offset-x="2" offset-y="2">
          <v-icon icon="bell" :size="20" color="ink" />
          <v-tooltip
            activator="parent"
            location="bottom"
            content-class="navbar-tooltip"
            text="Notifications"
          />
        </v-badge>
      </template>
      <v-avatar
        size="40"
        image="https://randomuser.me/api/portraits/women/44.jpg"
      />
    </div>

    <PublishDialog v-if="writeActions" v-model="publishDialog" />
  </v-app-bar>
</template>

<style scoped lang="scss">
.menu-btn {
  margin-right: 0.375rem;
}
</style>
