<script setup lang="ts">
interface Profile {
  id: number
  name: string
  username: string
  articles_count: number
  lists_count: number
  followers_count: number
  viewer_is_following: boolean
}

const route = useRoute()
const api = useApi()
const username = route.params.username as string

const { data: profile, error } = await useAsyncData(`profile-${username}`, () =>
  api<Profile>(`/users/${username}`),
)

if (error.value) {
  throw createError({
    statusCode: (error.value as any).statusCode ?? 404,
    statusMessage: 'Profile not found',
    fatal: true,
  })
}

useSeoMeta({
  title: () => profile.value?.name,
  description: () => `${profile.value?.name} on RedCloak Collective`,
  ogTitle: () => profile.value?.name,
})
</script>

<template>
  <v-container v-if="profile" class="py-8" style="max-width: 640px">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">{{ profile.name }}</h1>
        <div class="text-body-2 text-medium-emphasis">@{{ profile.username }}</div>
      </div>
      <FollowButton :username="profile.username" :initial-following="profile.viewer_is_following" />
    </div>

    <div class="d-flex ga-6 mb-6 text-body-2 text-medium-emphasis">
      <span>{{ profile.articles_count }} articles</span>
      <span>{{ profile.lists_count }} public lists</span>
      <span>{{ profile.followers_count }} followers</span>
    </div>
  </v-container>
</template>
