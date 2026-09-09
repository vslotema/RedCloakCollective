// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

// Guards the assumption the store specs depend on: under the Nuxt test env
// `import.meta.client` is truthy, so editor autosave / flush / recovery run.
describe('nuxt test environment', () => {
  it('reports a client runtime', () => {
    expect(import.meta.client).toBe(true)
  })

  it('provides localStorage', () => {
    localStorage.setItem('probe', '1')
    expect(localStorage.getItem('probe')).toBe('1')
    localStorage.clear()
  })
})
