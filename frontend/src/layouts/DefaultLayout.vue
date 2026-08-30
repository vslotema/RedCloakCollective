<script setup lang="ts">
import { ref } from 'vue'

const drawer = ref(true) 
const rail = ref(false)
const wider = ref(true)
const menuItems = ref([
  { title: 'Home', route: '/' },
  { title: 'Explore', route: '/explore' },
  { title: 'Articles', route: '/article' },
])

</script>

<template>
  <v-app-bar color="background" flat style="border-bottom: thin solid #d5d5d5;">
    <v-btn icon="menu" color="black" @click="drawer = !drawer">
    </v-btn>
    <div class="logo">
        <h1 class="text-h5 font-weight-bold mb-0"><span class="text-primary">R</span>EDCLOACK COLLECTIVE</h1>
    </div>
  </v-app-bar>
  <v-navigation-drawer
    v-model="drawer"
    color="background"
    width="250"
    :rail="rail"
    :rail-width="wider ? 80 : undefined"
    permanent
    @click="rail = false"
   >
   <v-list>
    <v-list-item
      v-for="item in menuItems"
      :key="item.title"
      :to="item.route"
    >
      <v-list-item-title class="text-gray"> {{ item.title }} </v-list-item-title>
    </v-list-item>
    </v-list></v-navigation-drawer>
  <v-main>
    <router-view />
  </v-main>
</template>
