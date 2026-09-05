import { aliases, feather } from '~/theme/icons'

// vuetify-nuxt-module's own `icons` config only understands font-set
// descriptors (mdi/fa/etc.) and crashes on a raw Vuetify IconSet object
// (see nuxt.config.ts: icons.defaultSet is set to 'custom' to make the module
// skip its own resolution). This hook is the module's documented escape
// hatch for supplying a real custom icon set before Vuetify is created.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hooks.hook('vuetify:before-create', ({ vuetifyOptions }) => {
    vuetifyOptions.icons = {
      defaultSet: 'feather',
      aliases,
      sets: { feather },
    }
  })
})
