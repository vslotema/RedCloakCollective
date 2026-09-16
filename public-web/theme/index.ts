import type { ThemeDefinition } from "vuetify";

export { aliases, feather } from "./icons";

// Design system — neutral gray ground, red primary,
// emerald as the tertiary/success accent.
export const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: "#FbFbFb",
    "background-darken-1": "#F1F1F1",
    surface: "#FFFFFF",
    "surface-variant": "#F5F5F5",
    "on-background": "#4B5563",
    "on-surface": "#4B5563",
    "on-surface-variant": "#4B5563",
    "border-color": "#E5E7EB",
    "border-strong": "#ababab",
    ink: "#111827",
    primary: "#DD0509",
    "primary-darken-1": "#B70407",
    secondary: "#535fc1",
    "secondary-lighten-5": "#e4e9ff",
    "secondary-darken-1": "#3642a0",
    tertiary: "#10B981",
    "tertiary-darken-1": "#059669",
    error: "#b04e72",
    info: "#5b7596",
    success: "#10B981",
    warning: "#a3651f",
  },
};

export const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: "#1A1A1E",
    "background-darken-1": "#242428",
    surface: "#242428",
    "surface-variant": "#2E2E33",
    "on-background": "#A3A3AC",
    "on-surface": "#A3A3AC",
    "on-surface-variant": "#A3A3AC",
    "border-color": "#333338",
    "border-strong": "#333338",
    ink: "#FFFFFF",
    primary: "#DD0509",
    "primary-darken-1": "#B70407",
    secondary: "#7c85ca",
    "secondary-darken-1": "#4b58be",
    tertiary: "#34D399",
    "tertiary-darken-1": "#10B981",
    error: "#b04e72",
    info: "#5b7596",
    success: "#34D399",
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
