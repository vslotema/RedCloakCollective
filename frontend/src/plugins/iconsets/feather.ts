import { h } from 'vue'
import VueFeather from 'vue-feather'
import featherIcons from 'feather-icons/dist/icons.json'
import type { IconAliases, IconSet } from 'vuetify'

const FALLBACK_ICON = 'help-circle'

// Feather has no exact match for these Vuetify internal glyphs:
// - ratingEmpty/Full/Half all resolve to the same "star" outline (Feather has no filled star)
// - eyeDropper, color: no palette/eyedropper icon, approximated
// - ctrl, alt: no keyboard-modifier glyphs in Feather, left as plain "square"
export const aliases: Partial<IconAliases> = {
  collapse: 'chevron-up',
  complete: 'check',
  cancel: 'x-circle',
  close: 'x',
  delete: 'x-circle',
  clear: 'x-circle',
  success: 'check-circle',
  info: 'info',
  warning: 'alert-circle',
  error: 'x-circle',
  prev: 'chevron-left',
  next: 'chevron-right',
  checkboxOn: 'check-square',
  checkboxOff: 'square',
  checkboxIndeterminate: 'minus-square',
  delimiter: 'circle',
  sortAsc: 'arrow-up',
  sortDesc: 'arrow-down',
  expand: 'chevron-down',
  menu: 'menu',
  subgroup: 'chevron-down',
  dropdown: 'chevron-down',
  radioOn: 'disc',
  radioOff: 'circle',
  edit: 'edit-2',
  ratingEmpty: 'star',
  ratingFull: 'star',
  ratingHalf: 'star',
  loading: 'refresh-cw',
  first: 'chevrons-left',
  last: 'chevrons-right',
  unfold: 'chevrons-down',
  file: 'paperclip',
  plus: 'plus',
  minus: 'minus',
  calendar: 'calendar',
  treeviewCollapse: 'chevron-down',
  treeviewExpand: 'chevron-right',
  tableGroupCollapse: 'chevron-down',
  tableGroupExpand: 'chevron-right',
  eyeDropper: 'crosshair',
  upload: 'upload-cloud',
  color: 'droplet',
  command: 'command',
  ctrl: 'square',
  space: 'minus',
  shift: 'arrow-up',
  alt: 'square',
  enter: 'corner-down-left',
  arrowup: 'arrow-up',
  arrowdown: 'arrow-down',
  arrowleft: 'arrow-left',
  arrowright: 'arrow-right',
  backspace: 'delete',
  play: 'play',
  pause: 'pause',
  fullscreen: 'maximize',
  fullscreenExit: 'minimize',
  volumeHigh: 'volume-2',
  volumeMedium: 'volume-1',
  volumeLow: 'volume',
  volumeOff: 'volume-x',
  search: 'search',
}

export const feather: IconSet = {
  component: (props) => {
    const name = props.icon as string
    // vue-feather's `type` prop validator THROWS on an unknown name, which
    // crashes the whole render. Guard against typos / non-Feather names.
    const isKnown = Object.prototype.hasOwnProperty.call(featherIcons, name)
    if (!isKnown && import.meta.env.DEV) {
      console.warn(`[feather iconset] unknown icon "${name}" — falling back to "${FALLBACK_ICON}"`)
    }
    return h(VueFeather, {
      type: isKnown ? name : FALLBACK_ICON,
      size: 20,
    })
  },
}
