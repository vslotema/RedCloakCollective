import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export interface User {
  id: number
  name: string
  email: string
  country: string | null
  state: string | null
  hasFollows: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  // This store is instantiated on every page (app.vue calls useAuthStore()
  // unconditionally), including SSR'd public pages where localStorage doesn't
  // exist — only read/write it client-side.
  const token = ref<string | null>(import.meta.client ? localStorage.getItem('auth_token') : null)

  async function fetchUser() {
    if (!token.value) return
    const { data } = await api.get<User>('/user')
    user.value = data
  }

  function setToken(newToken: string) {
    token.value = newToken
    if (import.meta.client) localStorage.setItem('auth_token', newToken)
  }

  async function updateLocation(country: string, state: string | null) {
    const { data } = await api.patch<{ user: User }>('/user/location', { country, state })
    user.value = data.user
  }

  function logout() {
    token.value = null
    user.value = null
    if (import.meta.client) localStorage.removeItem('auth_token')
  }

  return { user, token, fetchUser, setToken, updateLocation, logout }
})
