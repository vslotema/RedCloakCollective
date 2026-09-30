// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import LikeToggle from '~/components/LikeToggle.vue'

const { apiFn, ensureUser, openAuthDialog } = vi.hoisted(() => ({
  apiFn: vi.fn(),
  ensureUser: vi.fn(),
  openAuthDialog: vi.fn(),
}))
mockNuxtImport('useApi', () => () => apiFn)
mockNuxtImport('useAuthStore', () => () => ({ ensureUser }))
mockNuxtImport('useAuthDialog', () => () => ({ open: openAuthDialog }))

const endpoint = '/articles/7/like'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

async function mountToggle(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(LikeToggle, { props: { endpoint, ...props } })
  await flushPromises()
  return wrapper
}

describe('LikeToggle', () => {
  beforeEach(() => {
    apiFn.mockReset()
    ensureUser.mockReset()
    openAuthDialog.mockReset()
    ensureUser.mockResolvedValue({ id: 1 })
  })

  it('loads the like status on mount', async () => {
    apiFn.mockResolvedValueOnce({ liked: true, likes_count: 4 })

    const wrapper = await mountToggle()

    expect(apiFn).toHaveBeenCalledWith(endpoint)
    expect(wrapper.find('[data-test="likes-count"]').text()).toBe('4')
    expect(wrapper.find('button').classes()).toContain('like-toggle--liked')
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
  })

  it('shows only the icon when there are no likes', async () => {
    apiFn.mockResolvedValueOnce({ liked: false, likes_count: 0 })

    const wrapper = await mountToggle()

    expect(wrapper.find('[data-test="likes-count"]').exists()).toBe(false)
  })

  it('opens the sign up dialog for guests instead of liking', async () => {
    apiFn.mockResolvedValueOnce({ liked: false, likes_count: 3 })
    const wrapper = await mountToggle()
    ensureUser.mockResolvedValueOnce(null)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(openAuthDialog).toHaveBeenCalledWith('signup')
    expect(apiFn).toHaveBeenCalledTimes(1)
    expect(wrapper.find('button').classes()).not.toContain('like-toggle--liked')
  })

  it('applies the liked state and count only after the response returns', async () => {
    apiFn.mockResolvedValueOnce({ liked: false, likes_count: 4 })
    const wrapper = await mountToggle()
    const like = deferred<{ liked: boolean, likes_count: number }>()
    apiFn.mockReturnValueOnce(like.promise)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(apiFn).toHaveBeenLastCalledWith(endpoint, { method: 'PUT' })
    expect(wrapper.find('button').classes()).not.toContain('like-toggle--liked')
    expect(wrapper.find('[data-test="likes-count"]').text()).toBe('4')

    like.resolve({ liked: true, likes_count: 5 })
    await flushPromises()

    expect(wrapper.find('button').classes()).toContain('like-toggle--liked')
    expect(wrapper.find('[data-test="likes-count"]').text()).toBe('5')
  })

  it('unlikes with DELETE when already liked', async () => {
    apiFn.mockResolvedValueOnce({ liked: true, likes_count: 5 })
    const wrapper = await mountToggle()
    apiFn.mockResolvedValueOnce({ liked: false, likes_count: 4 })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(apiFn).toHaveBeenLastCalledWith(endpoint, { method: 'DELETE' })
    expect(wrapper.find('button').classes()).not.toContain('like-toggle--liked')
    expect(wrapper.find('[data-test="likes-count"]').text()).toBe('4')
  })

  it('ignores clicks while a request is in flight', async () => {
    apiFn.mockResolvedValueOnce({ liked: false, likes_count: 0 })
    const wrapper = await mountToggle()
    const like = deferred<{ liked: boolean, likes_count: number }>()
    apiFn.mockReturnValueOnce(like.promise)

    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(apiFn).toHaveBeenCalledTimes(2)

    like.resolve({ liked: true, likes_count: 1 })
    await flushPromises()
  })

  it('keeps the current state when the request fails', async () => {
    apiFn.mockResolvedValueOnce({ liked: false, likes_count: 2 })
    const wrapper = await mountToggle()
    apiFn.mockResolvedValueOnce({ liked: true, likes_count: 3 })
    ensureUser.mockRejectedValueOnce(new Error('offline'))
    wrapper.vm.$.appContext.config.errorHandler = () => {}

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('button').classes()).not.toContain('like-toggle--liked')
    expect(wrapper.find('[data-test="likes-count"]').text()).toBe('2')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="likes-count"]').text()).toBe('3')
  })

  it('does not load or toggle when disabled', async () => {
    const wrapper = await mountToggle({ disabled: true })

    expect(apiFn).not.toHaveBeenCalled()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="likes-count"]').exists()).toBe(false)
  })
})
