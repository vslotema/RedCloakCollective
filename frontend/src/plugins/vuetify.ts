import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import { aliases, feather, light, dark, defaults } from '@redcloak/theme'

export default createVuetify({
  display: {
    mobileBreakpoint: 'sm',
  },
  icons: {
    defaultSet: 'feather',
    aliases,
    sets: {
      feather,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light,
      dark,
    },
  },
  defaults,
})
