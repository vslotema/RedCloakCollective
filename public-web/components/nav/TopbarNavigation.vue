<script setup lang="ts">
withDefaults(
  defineProps<{
    showMenuToggle?: boolean;
    showGoBackButton?: boolean;
    showSearch?: boolean;
    showWriteButton?: boolean;
    writeActions?: boolean;
  }>(),
  {
    showMenuToggle: true,
    showGoBackButton: false,
    showSearch: true,
    showWriteButton: true,
    writeActions: false,
  },
);

defineEmits<{
  toggleNavigation: [];
}>();
const router = useRouter();
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

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
}
</script>

<template>
  <v-app-bar class="topbar-nav pl-2 pr-4" :class="{'border': showWriteButton}" flat>
    <div class="d-flex align-center">
      <v-btn
        v-if="showGoBackButton"
        icon
        size="small"
        color="ink"
        variant="text"
        aria-label="Go back"
        @click="goBack"
      >
        <v-icon icon="arrow-left" :size="20" />
        <v-tooltip
          activator="parent"
          location="bottom"
          content-class="navbar-tooltip"
          text="Go back"
        />
      </v-btn>
      <v-btn
        v-if="showMenuToggle"
        class="menu-btn"
        icon="menu"
        size="small"
        color="ink"
        @click="$emit('toggleNavigation')"
      >
      </v-btn>
      <NuxtLink to="/" class="logo-link">
        <h1 class="text-h6 font-weight-bold mb-0">
          <span class="text-primary">R</span>EDCLOAK COLLECTIVE
        </h1>
      </NuxtLink>
      <SearchBar v-if="showSearch" class="ml-6" />
    </div>

    <v-spacer />

    <div class="d-flex align-center" :class="writeActions ? 'ga-4' : 'ga-2'">
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
      </template>

      <template v-else>
        <v-btn
          v-if="showWriteButton"
          icon
          variant="flat"
          color="white"
          size="40"
          class="action-btn border"
          to="/write"
        >
          <v-icon icon="edit" :size="20" />
          <v-tooltip
            activator="parent"
            location="bottom"
            content-class="navbar-tooltip"
            text="Write"
          />
        </v-btn>
        <v-btn
          icon
          variant="flat"
          color="white"
          size="40"
          class="action-btn border"
        >
          <v-icon icon="bell" :size="20" />
          <v-tooltip
            activator="parent"
            location="bottom"
            content-class="navbar-tooltip"
            text="Notifications"
          />
        </v-btn>
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
.topbar-nav.v-app-bar.v-toolbar {
  background-color: rgba($color: var(--v-theme-background), $alpha: 1.0);
}
.topbar.border {
  border-bottom: 1px solid;
}
.menu-btn {
  margin-right: 0.375rem;
}
.action-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-on-surface));
}

.logo-link {
  margin-left: 1rem;
  text-decoration: none;
  cursor: pointer;
}
</style>
