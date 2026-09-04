<script setup lang="ts">
interface Owner {
  id: number
  name: string
  username: string
}

interface ListDetail {
  id: number
  name: string
  visibility: 'public' | 'followers' | 'private'
  owner: Owner
  articles: { id: number; title: string; slug: string }[]
}

interface GatedResponse {
  visibility: 'followers'
  owner: Owner
}

const route = useRoute()
const api = useApi()
const id = route.params.id as string

const { data: list, error } = await useAsyncData(`equipment-${id}`, () =>
  api<ListDetail>(`/lists/${id}`),
)

const gated = computed<GatedResponse | null>(() => {
  const err = error.value as any
  return err?.statusCode === 403 ? (err.data as GatedResponse) : null
})

if (error.value && !gated.value) {
  throw createError({
    statusCode: (error.value as any).statusCode ?? 404,
    statusMessage: 'Equipment list not found',
    fatal: true,
  })
}

useSeoMeta({
  title: () => list.value?.name ?? 'Followers-only equipment list',
  description: () =>
    list.value ? `Equipment list by ${list.value.owner.name}` : 'This list is followers-only.',
})
</script>

<template>
  <v-container v-if="list" class="py-8" style="max-width: 720px">
    <h1 class="text-h3 font-weight-bold mb-2">{{ list.name }}</h1>
    <div class="text-body-2 text-medium-emphasis mb-6">
      by
      <NuxtLink :to="`/u/${list.owner.username}`">{{ list.owner.name }}</NuxtLink>
    </div>
    <v-list>
      <v-list-item v-for="article in list.articles" :key="article.id" :to="`/articles/${article.slug}`">
        {{ article.title }}
      </v-list-item>
    </v-list>
  </v-container>

  <v-container v-else-if="gated" class="py-8 text-center" style="max-width: 480px">
    <v-icon icon="lock" size="40" class="mb-4" />
    <h1 class="text-h5 font-weight-bold mb-2">Followers only</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      This equipment list is only visible to followers of {{ gated.owner.name }}.
    </p>
    <FollowButton :username="gated.owner.username" :initial-following="false" />
  </v-container>
</template>
