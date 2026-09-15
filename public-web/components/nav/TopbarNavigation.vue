<template>
  <v-app-bar
    class="px-4"
    color="background"
    flat
    style="border-bottom: thin solid rgb(var(--v-theme-border-strong))"
  >
    <div class="d-flex align-center ga-6">
      <NuxtLink to="/" class="d-flex align-center text-decoration-none">
        <AppLogo height="35" />
      </NuxtLink>
      <SearchBar />
    </div>

    <v-spacer />

    <div class="d-flex align-center ga-4">
      <v-btn
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
      <v-badge color="primary" dot location="top end" offset-x="2" offset-y="2">
        <v-icon icon="bell" :size="20" color="ink" />
        <v-tooltip
          activator="parent"
          location="bottom"
          content-class="navbar-tooltip"
          text="Notifications"
        />
      </v-badge>
      <v-avatar
        size="40"
        image="https://randomuser.me/api/portraits/women/44.jpg"
      />
    </div>
  </v-app-bar>
</template>
