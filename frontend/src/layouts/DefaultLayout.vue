<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import type { User } from '@/types/user'

const drawer = ref(true)
const rail = ref(true)
const wider = ref(true)
const { mobile, width } = useDisplay()
const fullWidthNav = computed(() => mobile.value ? width.value : 250)
const menuItems = ref([
  { title: 'Home', route: '/', icon: 'home' },
  { title: 'Library', route: '/library', icon: 'bookmark' },
  { title: 'Profile', route: '/profile', icon: 'user' },
  { title: 'Your Articles', route: '/article', icon: 'book-open' },
  { title: 'Equipment Lists', route: '/explore', icon: 'package' },
])
const following = ref<Pick<User, 'id' | 'name' | 'avatar'>[]>([
  { id: 5, name: 'Ethan Wright', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 6, name: 'Mia Chen', avatar: 'https://i.pravatar.cc/150?img=6' },
  { id: 7, name: 'Oliver James', avatar: 'https://i.pravatar.cc/150?img=7' },
])

const toggleNavigation = () => {
  
  if(!mobile.value) {
    wider.value = !wider.value;
  } else {
    rail.value = false; 
    wider.value = true;
    drawer.value = !drawer.value;
  }
}

</script>

<template>
  <v-app-bar color="background" flat style="border-bottom: thin solid #d5d5d5;">
    <v-btn class='menu-btn' icon="menu" size="small" color="black" @click="toggleNavigation">
    </v-btn>
    <div class="logo">
        <h1 class="text-h6 font-weight-bold mb-0"><span class="text-primary">R</span>EDCLOAK COLLECTIVE</h1>
    </div>
  </v-app-bar>
  <v-navigation-drawer
    v-model="drawer"
    color="background"
    :width="fullWidthNav"
    :rail="rail"
    :rail-width="wider ? fullWidthNav : 52"
    permanent
   >
   <v-list class="mt-4">
    <v-list-item
      v-for="item in menuItems"
      :key="item.title"
      :to="item.route"
      :exact="item.route === '/'"
      :prepend-icon="item.icon"
      active-color="black"
      active-class="is-active"
      prepend-gap="1rem"
      class="nav-list-item"
    >
      <v-list-item-title class="text-gray"> {{ item.title }} </v-list-item-title>
    </v-list-item>

    <div class="my-6 px-4">
      <v-divider></v-divider>
    </div>
    <v-list-item
      prepend-icon="users"
      prepend-gap="1rem"
      active-color="black"
      active-class="is-active"
      density="compact"
      class="nav-list-item"
    >
      <v-list-item-title class="text-gray">Following</v-list-item-title>
    </v-list-item>

    <v-list>
      <v-list-item
      v-for="user in following"
      :key="user.id"
      :prepend-avatar="user.avatar"
      prepend-gap="1rem"
      density="comfortable"
      class="following-item"
    >
      <v-list-item-title class="text-gray text-small"> {{ user.name }} </v-list-item-title>
    </v-list-item>
    </v-list>
    
    </v-list>
  </v-navigation-drawer>
  <v-main>
    <router-view />
  </v-main>
</template>

<style scoped>
.menu-btn {
  margin-right: .375rem;
}

.nav-list-item.is-active :deep(.v-list-item__overlay) {
  opacity: 0;
}

.nav-list-item:hover {
  color: black;
}

.nav-list-item:hover :deep(.v-list-item__prepend > .v-icon) {
  opacity: 1;
}

.nav-list-item:hover :deep(.v-list-item__overlay) {
  opacity: 0.03;
}

.v-list-item--density-comfortable.v-list-item--one-line {
  min-height: 35px;
}

</style>
