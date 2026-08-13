import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify, type ThemeDefinition } from 'vuetify'

// Design system — Cormorant Garamond / Figtree, terracotta-indigo
// on a warm paper ground, sage as the secondary accent.
const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#f5ead8',
    surface: '#ebddc5',
    'surface-variant': '#dcd3c4',
    'on-surface-variant': '#474238',
    primary: '#535fc1',
    'primary-darken-1': '#3642a0',
    secondary: '#35ab45',
    'secondary-darken-1': '#268332',
    'tertiary': '#de0038',
    'tertiary-darken-1': '#b8002f',
    error: '#b04e72',
    info: '#5b7596',
    success: '#35ab45',
    warning: '#a3651f',
  },
}

const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#2e2b25',
    surface: '#474238',
    'surface-variant': '#645c50',
    'on-surface-variant': '#dcd3c4',
    primary: '#7c85ca',
    'primary-darken-1': '#4b58be',
    secondary: '#78cf83',
    'secondary-darken-1': '#44c556',
    'tertiary': '#ef5c7d',
    'tertiary-darken-1': '#de0038',
    error: '#b04e72',
    info: '#5b7596',
    success: '#78cf83',
    warning: '#a3651f',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light,
      dark,
    },
  },
  defaults: {
    VBtn: {
      rounded: 'pill',
      class: 'text-none font-heading',
    },
    VCard: {
      rounded: 'lg',
    },
    VChip: {
      rounded: 'pill',
    },
    VTextField: {
      variant: 'outlined',
      rounded: 'pill',
    },
    VSelect: {
      variant: 'outlined',
      rounded: 'pill',
    },
    VTextarea: {
      variant: 'outlined',
      rounded: 'lg',
    },
    VDialog: {
      VCard: {
        rounded: 'lg',
      },
    },
  },
})
