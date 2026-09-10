import { vi } from 'vitest'

// happy-dom doesn't always implement the object-URL helpers the editor store
// uses for header-image previews. Provide inert stand-ins.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn()
}
