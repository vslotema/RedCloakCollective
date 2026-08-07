import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export interface User {
  id: number
  name: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))

  async function fetchUser() {
    if (!token.value) return
    const { data } = await api.get<User>('/user')
    user.value = data
  }

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  return { user, token, fetchUser, setToken, logout }
})
