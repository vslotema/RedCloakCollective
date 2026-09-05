import { light, dark, defaults } from './theme'

const backendOrigin = process.env.NUXT_BACKEND_ORIGIN ?? 'http://127.0.0.1:8000'
const apiBase = process.env.NUXT_API_BASE ?? `${backendOrigin}/api`

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  modules: ['vuetify-nuxt-module', '@nuxtjs/sitemap', '@pinia/nuxt'],

  ssr: true,

  // Components are auto-imported by filename only (no directory prefix), so
  // `components/content/filters/ContentFilterBar.vue` is `<ContentFilterBar>`.
  // The filenames are already descriptively prefixed, so the path-based names
  // would just be redundant (`<ContentFiltersContentFilterBar>`).
  components: [{ path: '~/components', pathPrefix: false }],

  css: ['~/assets/styles/style.scss'],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Forwarded into every SCSS block (SFCs included), matching the old
          // Vite SPA's setup — tokens/mixins available with no per-file @use.
          additionalData: '@use "~/assets/styles" as *;\n',
        },
      },
    },
  },

  runtimeConfig: {
    // Server-only: SSR fetches hit Laravel directly.
    apiBase,
    public: {
      // Browser-relative: same-origin, forwarded to Laravel by the
      // '/api/**' proxy routeRule below (there's no separate proxy process
      // anymore now that it's one Nuxt app — Nitro does this itself).
      apiBase: '/api',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    },
  },

  routeRules: {
    // The browser talks to same-origin '/api' and '/sanctum/csrf-cookie'
    // (bearer-token client, and Sanctum's CSRF priming respectively) — Nitro
    // forwards both straight through to the separate Laravel process.
    '/api/**': { proxy: `${backendOrigin}/api/**` },
    '/sanctum/**': { proxy: `${backendOrigin}/sanctum/**` },

    // --- Public, SSR'd, cacheable content ---
    '/articles/**': { swr: 3600 },
    '/equipment': { swr: 3600 },
    // List *detail* visibility is data-dependent (public/followers/private) and
    // can't be resolved at the routing layer, so default every detail page to
    // no shared caching — mirrors the Cache-Control the backend itself sets.
    '/equipment/**': { headers: { 'cache-control': 'private, no-store' } },
    '/u/**': { swr: 300 },
    // Explore has no personalization/auth dependency (unlike For You) — it's
    // a general discovery surface, so it belongs with the public content.
    '/explore': { swr: 3600 },

    // --- Authenticated app: plain CSR, same behavior as the old SPA ---
    '/': { ssr: false },
    '/home/explore': { ssr: false },
    '/library': { ssr: false },
    '/profile': { ssr: false },
    '/dashboard/**': { ssr: false },
    '/write': { ssr: false },
    '/settings': { ssr: false },
    '/onboarding': { ssr: false },
  },

  vuetify: {
    vuetifyOptions: {
      display: { mobileBreakpoint: 'sm' },
      // Real icon config is injected in plugins/vuetify-icons.ts via the
      // module's `vuetify:before-create` hook — `defaultSet: 'custom'` here
      // just tells the module to skip its own (font-set-only) resolution,
      // which otherwise crashes on a component-based custom IconSet.
      icons: { defaultSet: 'custom' },
      theme: {
        defaultTheme: 'light',
        themes: { light, dark },
      },
      defaults,
    },
    styles: {
      configFile: 'assets/styles/vuetify-settings.scss',
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  },

  sitemap: {
    sources: [`${apiBase}/sitemap-urls`],
    // Everything here is one Nuxt app now, so the module's automatic route
    // discovery would otherwise also list the authenticated app's pages —
    // exclude those explicitly; only the public surface should be indexed.
    exclude: [
      '/',
      '/home/explore',
      '/library',
      '/profile',
      '/settings',
      '/write',
      '/onboarding',
      '/dashboard/**',
    ],
  },
})
