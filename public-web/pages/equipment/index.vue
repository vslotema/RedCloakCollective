<script setup lang="ts">
interface ListSummary {
  id: number
  name: string
  owner: { id: number; name: string; username: string }
}

const api = useApi()
const { data } = await useAsyncData('equipment-index', () =>
  api<{ data: ListSummary[] }>('/lists'),
)

useSeoMeta({
  title: 'Equipment lists',
  description: 'Browse public equipment lists.',
})
</script>

<template>
  <v-container class="py-8">
    <h1 class="text-h4 font-weight-bold mb-6">Equipment lists</h1>
    <v-row>
      <v-col v-for="list in data?.data" :key="list.id" cols="12" md="6">
        <v-card :to="`/equipment/${list.id}`" class="pa-4" variant="outlined">
          <div class="text-h6">{{ list.name }}</div>
          <div class="text-body-2 text-medium-emphasis">by {{ list.owner.name }}</div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
