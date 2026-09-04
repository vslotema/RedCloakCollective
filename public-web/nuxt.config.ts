import { light, dark, defaults } from '@redcloak/theme'

const apiBase = process.env.NUXT_API_BASE ?? 'http://127.0.0.1:8000/api'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  modules: ['vuetify-nuxt-module', '@nuxtjs/sitemap'],

  ssr: true,

  runtimeConfig: {
    // Server-only: SSR fetches hit Laravel directly, not through the dev proxy.
    apiBase,
    public: {
      // Browser-relative: same-origin through the dev proxy (and prod proxy later).
      apiBase: '/api',
    },
  },

  routeRules: {
    // Published articles: content is the same for every viewer, safe to
    // cache/revalidate rather than rebuild on every publish.
    '/articles/**': { swr: 3600 },
    // Public list listing only (the index endpoint already filters to public).
    '/equipment': { swr: 3600 },
    // List *detail* visibility is data-dependent (public/followers/private) and
    // can't be resolved at the routing layer, so default every detail page to
    // no shared caching — mirrors the Cache-Control the backend itself sets.
    '/equipment/**': { headers: { 'cache-control': 'private, no-store' } },
    // Profile content is public; follow/edit state hydrates client-side.
    '/u/**': { swr: 300 },
  },

  vuetify: {
    vuetifyOptions: {
      display: { mobileBreakpoint: 'sm' },
      // NOTE: the SPA's custom feather icon set isn't wired in here yet —
      // vuetify-nuxt-module's `icons.sets` expects its own font-set descriptor
      // shape, not a raw Vuetify IconSet object. Falls back to Vuetify's
      // default (MDI) for now; colors/component defaults (the load-bearing
      // "ink token" consistency) are shared via @redcloak/theme regardless.
      theme: {
        defaultTheme: 'light',
        themes: { light, dark },
      },
      defaults,
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:4000',
  },

  sitemap: {
    sources: [`${apiBase}/sitemap-urls`],
  },
})
