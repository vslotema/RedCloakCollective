import { defineVitestConfig } from '@nuxt/test-utils/config'

// Nuxt test environment so specs get the `~/` alias, auto-import resolution
// (useApi, useRuntimeConfig, …) and `import.meta.client === true` — the editor
// store no-ops its persistence when that is false.
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
})
