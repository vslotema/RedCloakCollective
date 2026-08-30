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

defineExpose({
  toggleNavigation,
})
</script>

<template>
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
      <v-tooltip
        activator="parent"
        location="end"
        content-class="navbar-tooltip"
        :text="item.title"
        :disabled="wider"
      />
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
       <v-tooltip
        activator="parent"
        location="end"
        content-class="navbar-tooltip"
        text="Following"
        :disabled="wider"
      />
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
       <v-tooltip
        activator="parent"
        location="end"
        content-class="navbar-tooltip"
        :text="user.name"
        :disabled="wider"
      />
    </v-list-item>
    </v-list>

    </v-list>
  </v-navigation-drawer>
</template>

<style scoped lang="scss">
.nav-list-item {

  &.is-active :deep(.v-list-item__overlay),
  &:hover :deep(.v-list-item__overlay) {
    opacity: 0;
  }

  &:hover {
    color: black;

    :deep(.v-list-item__prepend > .v-icon) {
      opacity: 1;
    }
  }
}

.v-list-item--density-comfortable.v-list-item--one-line {
  min-height: 35px;
}
</style>

<style lang="scss">
// Tooltip content is teleported to <body>, so it must be targeted outside the scoped block.
.v-tooltip > .navbar-tooltip.v-overlay__content {
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: .5rem;
  padding: .25rem .75rem;
}
</style>
