import type { ThemeDefinition } from "vuetify";

export { aliases, feather } from "./icons";

// Design system — Cormorant Garamond / system-ui, red
// on a warm paper ground, sage as the secondary accent.
export const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: "#FFFFFF",
    surface: "#f5f5f5",
    "surface-variant": "#F8F4F4",
    "on-background": "#6b6b6b",
    "on-surface": "#6b6b6b",
    "on-surface-variant": "#474238",
    "border-color": "#d5d5d5",
    ink: "#000000",
    primary: "#de0038",
    "primary-darken-1": "#b8002f",
    secondary: "#535fc1",
    "secondary-lighten-5": "#e4e9ff",
    "secondary-darken-1": "#3642a0",
    tertiary: "#35ab45",
    "tertiary-darken-1": "#268332",
    error: "#b04e72",
    info: "#5b7596",
    success: "#35ab45",
    warning: "#a3651f",
  },
};

export const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: "#2e2b25",
    surface: "#474238",
    "surface-variant": "#645c50",
    "on-surface-variant": "#dcd3c4",
    "border-color": "#efefef",
    ink: "#f4efe3",
    primary: "#ef5c7d",
    "primary-darken-1": "#de0038",
    secondary: "#7c85ca",
    "secondary-darken-1": "#4b58be",
    tertiary: "#78cf83",
    "tertiary-darken-1": "#44c556",
    error: "#b04e72",
    info: "#5b7596",
    success: "#78cf83",
    warning: "#a3651f",
  },
};

export const defaults = {
  VListItem: {
    VIcon: { size: 20 },
  },
  VBtn: {
    class: "text-none",
    elevation: 0,
  },
  VCard: {
    rounded: "lg",
  },
  VChip: {
    rounded: "pill",
  },
  VTextField: {
    variant: "outlined",
    rounded: "lg",
  },
  VSelect: {
    variant: "outlined",
    rounded: "lg",
  },
  VTextarea: {
    variant: "outlined",
    rounded: "lg",
  },
  VDialog: {
    VCard: {
      rounded: "lg",
    },
  },
} as const;
