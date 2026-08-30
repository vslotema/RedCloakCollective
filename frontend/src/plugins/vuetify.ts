import 'vuetify/styles'

import { createVuetify, type ThemeDefinition } from 'vuetify'
import { aliases, feather } from './iconsets/feather'

// Design system — Cormorant Garamond / system-ui, red
// on a warm paper ground, sage as the secondary accent.
const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F3F2F2',
    surface: '#EAE9E9',
    'surface-variant': '#F8F4F4',
    'on-background': '#6b6b6b',
    'on-surface': '#6b6b6b',
    'on-surface-variant': '#474238',
    primary: '#de0038',
    'primary-darken-1': '#b8002f',
    secondary: '#35ab45',
    'secondary-darken-1': '#268332',
    tertiary: '#535fc1',
    'tertiary-darken-1': '#3642a0',
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
    primary: '#ef5c7d',
    'primary-darken-1': '#de0038',
    secondary: '#78cf83',
    'secondary-darken-1': '#44c556',
    tertiary: '#7c85ca',
    'tertiary-darken-1': '#4b58be',
    error: '#b04e72',
    info: '#5b7596',
    success: '#78cf83',
    warning: '#a3651f',
  },
}

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
  defaults: {
    VListItem: {
      VIcon: { size: 20 },
    },
    VBtn: {
      class: 'text-none',
      elevation: 0,
    },
    VCard: {
      rounded: 'lg',
    },
    VChip: {
      rounded: 'pill',
    },
    VTextField: {
      variant: 'outlined',
      rounded: 'lg',
    },
    VSelect: {
      variant: 'outlined',
      rounded: 'lg',
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
