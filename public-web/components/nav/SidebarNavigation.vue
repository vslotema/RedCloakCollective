<script setup lang="ts">
import { useDisplay } from 'vuetify'

interface MenuItem {
  title: string
  route: string
  icon: string
  // Route names that should also keep this item highlighted (e.g. Home's tabs).
  match?: string[]
}

interface FollowedUser {
  id: number
  name: string
  role: string
  avatar: string
}

const route = useRoute()
const authStore = useAuthStore()
const drawer = ref(true)
const rail = ref(true)
const wider = ref(true)
const { mobile, width } = useDisplay()
const fullWidthNav = computed(() => (mobile.value ? width.value : 250))
const menuItems = ref<MenuItem[]>([
  { title: 'Home', route: '/', icon: 'home', match: ['index', 'home-explore'] },
  { title: 'Library', route: '/library', icon: 'bookmark' },
  { title: 'Profile', route: '/profile', icon: 'user' },
  { title: 'Your Articles', route: '/dashboard/articles', icon: 'book-open' },
  { title: 'Equipment Lists', route: '/dashboard/equipment', icon: 'package' },
])

const isActive = (item: MenuItem) =>
  item.match ? item.match.includes(route.name as string) : route.path.startsWith(item.route)
const following = ref<FollowedUser[]>([
  { id: 5, name: 'Ethan Wright', role: 'Occupational Therapist', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 6, name: 'Mia Chen', role: 'Cerebral Palsy Advocate', avatar: 'https://i.pravatar.cc/150?img=6' },
  { id: 7, name: 'Oliver James', role: 'Caregiver & Father', avatar: 'https://i.pravatar.cc/150?img=7' },
])

const toggleNavigation = () => {
  if (!mobile.value) {
    wider.value = !wider.value
  } else {
    rail.value = false
    wider.value = true
    drawer.value = !drawer.value
  }
}

async function handleLogout() {
  authStore.logout()
  await navigateTo('/onboarding')
}
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    color="background"
    :width="fullWidthNav"
    :rail="rail"
    :rail-width="wider ? fullWidthNav : 52"
    permanent
    style="border-right: thin solid rgb(var(--v-theme-border-strong))"
  >
    <v-list :class="wider ? 'px-4 pt-4' : 'px-1 pt-4 nav-rail'">
      <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        :to="item.route"
        :active="isActive(item)"
        :prepend-icon="item.icon"
        active-color="ink"
        active-class="is-active"
        prepend-gap="1rem"
        :rounded="wider ? '12px' : 'circle'"
        class="nav-list-item"
      >
        <v-list-item-title> {{ item.title }} </v-list-item-title>
        <v-tooltip
          activator="parent"
          location="end"
          content-class="navbar-tooltip"
          :text="item.title"
          :disabled="wider"
        />
      </v-list-item>

      <div v-if="wider" class="my-6 px-1">
        <v-divider></v-divider>
      </div>

      <div v-if="wider" class="following-label px-1 mb-3">
        <span class="text-caption font-weight-bold following-label-text">Following</span>
      </div>

      <v-list-item
        v-for="user in following"
        :key="user.id"
        :prepend-avatar="user.avatar"
        prepend-gap="1rem"
        density="comfortable"
        class="following-item"
      >
        <v-list-item-title class="text-body-2 font-weight-medium following-name">
          {{ user.name }}
        </v-list-item-title>
        <v-list-item-subtitle v-if="wider" class="text-caption following-role">
          {{ user.role }}
        </v-list-item-subtitle>
        <v-tooltip
          activator="parent"
          location="end"
          content-class="navbar-tooltip"
          :text="user.name"
          :disabled="wider"
        />
      </v-list-item>
    </v-list>

    <template #append>
      <div :class="wider ? 'px-4 pb-4' : 'px-1 pb-4 nav-rail'">
        <v-list-item
          prepend-icon="menu"
          prepend-gap="1rem"
          class="nav-list-item"
          :rounded="wider ? '12px' : 'circle'"
          @click="toggleNavigation"
        >
          <v-list-item-title>Menu</v-list-item-title>
          <v-tooltip
            activator="parent"
            location="end"
            content-class="navbar-tooltip"
            text="Menu"
            :disabled="wider"
          />
        </v-list-item>
        <v-list-item
          prepend-icon="log-out"
          prepend-gap="1rem"
          class="nav-list-item"
          :rounded="wider ? '12px' : 'circle'"
          @click="handleLogout"
        >
          <v-list-item-title>Log out</v-list-item-title>
          <v-tooltip
            activator="parent"
            location="end"
            content-class="navbar-tooltip"
            text="Log out"
            :disabled="wider"
          />
        </v-list-item>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped lang="scss">
.nav-list-item {
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 12px;
  margin-bottom: 8px;
  min-height: 44px;
  color: rgb(var(--v-theme-on-background));

  &.is-active {
    border-color: rgb(var(--v-theme-ink));
  }

  &.is-active :deep(.v-list-item__overlay),
  &:hover :deep(.v-list-item__overlay) {
    opacity: 0;
  }

  &:hover {
    color: rgb(var(--v-theme-ink));
    border-color: rgb(var(--v-theme-ink));

    :deep(.v-list-item__prepend > .v-icon) {
      opacity: 1;
    }
  }
}

.nav-rail {
  .nav-list-item,
  .following-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    min-height: 40px;
    padding: 0;
    margin-inline: auto;

    :deep(.v-list-item__prepend) {
      margin-inline-end: 0;

      // The prepend-gap spacer between icon and title is a real DOM node
      // (not part of the hidden content area), so it still pushes the icon
      // off-center unless removed explicitly.
      .v-list-item__spacer {
        display: none;
      }
    }

    :deep(.v-list-item__content) {
      display: none;
    }
  }

  .nav-list-item {
    border-radius: 50%;

    :deep(.v-list-item__overlay) {
      border-radius: 50%;
    }
  }

  .following-item {
    border: none;
  }
}

.following-label-text {
  color: rgb(var(--v-theme-on-background));
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.following-name {
  color: rgb(var(--v-theme-ink));
}

.following-role {
  color: rgb(var(--v-theme-on-background));
}

.v-list-item--density-comfortable.v-list-item--one-line {
  min-height: 35px;
}
</style>
