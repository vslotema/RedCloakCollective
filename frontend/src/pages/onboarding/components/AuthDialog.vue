<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { countries } from '@/lib/countries'
import { usStates } from '@/lib/usStates'
import { renderGoogleButton } from '@/lib/googleIdentity'
import CompleteProfileDialog from './CompleteProfileDialog.vue'

const model = defineModel<boolean>({ default: false })
const mode = defineModel<'signin' | 'signup'>('mode', { default: 'signup' })

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')
const googleButton = ref<HTMLElement | null>(null)
const completeProfile = ref(false)

const signInForm = ref({
  email: '',
  password: '',
})

const signUpForm = ref({
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  country: null as string | null,
  state: null as string | null,
})

const isUs = computed(() => signUpForm.value.country === 'US')

const rules = {
  required: (v: string | null) => !!v || 'This field is required',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Enter a valid email',
  minLength: (v: string) => v.length >= 8 || 'Must be at least 8 characters',
  matchesPassword: (v: string) =>
    v === signUpForm.value.password || 'Passwords do not match',
}

function close() {
  model.value = false
  errorMessage.value = ''
}

async function handleSignIn() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post<{ token: string }>('/login', signInForm.value)
    authStore.setToken(data.token)
    await authStore.fetchUser()
    close()
    router.push({ name: 'home' })
  } catch {
    errorMessage.value = 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}

async function handleSignUp() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post<{ token: string }>('/register', {
      name: signUpForm.value.name,
      email: signUpForm.value.email,
      password: signUpForm.value.password,
      password_confirmation: signUpForm.value.passwordConfirmation,
      country: signUpForm.value.country,
      state: isUs.value ? signUpForm.value.state : null,
    })
    authStore.setToken(data.token)
    await authStore.fetchUser()
    close()
    router.push({ name: 'home' })
  } catch {
    errorMessage.value = 'Could not create your account. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleGoogleCredential(credential: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post<{ token: string }>('/auth/google', { credential })
    authStore.setToken(data.token)
    await authStore.fetchUser()
    close()
    if (authStore.user && authStore.user.country === null) {
      completeProfile.value = true
    } else {
      router.push({ name: 'home' })
    }
  } catch {
    errorMessage.value = 'Could not sign in with Google. Please try again.'
  } finally {
    loading.value = false
  }
}

watch(
  [model, googleButton],
  async ([isOpen, el]) => {
    if (isOpen && el) {
      await nextTick()
      renderGoogleButton(el, handleGoogleCredential)
    }
  },
  { immediate: true },
)
</script>

<template>
  <v-dialog v-model="model" max-width="400">
    <v-card rounded="lg" color="white" elevation="0" class="pa-10 auth-card">
      <div class="tab-switch d-flex mb-4">
        <v-tabs
          width="100%"
          v-model="mode"
        >
          <v-tab 
            :value="'signin'" 
            width="50%"
            hide-slider
            :class="mode === 'signin' ? 'tab-active' : 'tab-inactive'">Sign in</v-tab>
          <v-tab 
            :value="'signup'" 
            width="50%"
            hide-slider
            :class="mode === 'signup' ? 'tab-active' : 'tab-inactive'">Get started</v-tab>
        </v-tabs>
      </div>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
      >
        {{ errorMessage }}
      </v-alert>

      <v-form v-if="mode === 'signin'" @submit.prevent="handleSignIn">
        <h2 class="text-h5 font-weight-bold mb-3">Welcome back</h2>

        <span class="field-label">Email</span>
        <v-text-field
          v-model="signInForm.email"
          placeholder="you@example.com"
          type="email"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required, rules.email]"
        />

        <span class="field-label">Password</span>
        <v-text-field
          v-model="signInForm.password"
          placeholder="••••••••"
          type="password"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required]"
        />

        <v-btn
          type="submit"
          color="primary"
          rounded="pill"
          block
          :loading="loading"
          class="font-weight-bold"
        >
          Sign in
        </v-btn>
      </v-form>

      <v-form v-else @submit.prevent="handleSignUp">
        <h2 class="text-h5 font-weight-bold mb-3">Create your account</h2>

        <span class="field-label">Name</span>
        <v-text-field
          v-model="signUpForm.name"
          placeholder="Your name"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required]"
        />

        <span class="field-label">Email</span>
        <v-text-field
          v-model="signUpForm.email"
          placeholder="you@example.com"
          type="email"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required, rules.email]"
        />

        <span class="field-label">Password</span>
        <v-text-field
          v-model="signUpForm.password"
          placeholder="••••••••"
          type="password"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required, rules.minLength]"
        />

        <span class="field-label">Confirm Password</span>
        <v-text-field
          v-model="signUpForm.passwordConfirmation"
          placeholder="••••••••"
          type="password"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required, rules.matchesPassword]"
        />

        <span class="field-label">Country</span>
        <v-autocomplete
          v-model="signUpForm.country"
          :items="countries"
          item-title="name"
          item-value="code"
          placeholder="Select your country"
          variant="outlined"
          rounded="lg"
          density="compact"
          :rules="[rules.required]"
        />

        <template v-if="isUs">
          <span class="field-label">State</span>
          <v-autocomplete
            v-model="signUpForm.state"
            :items="usStates"
            item-title="name"
            item-value="code"
            placeholder="Select your state"
            variant="outlined"
            rounded="lg"
            density="compact"
            :rules="[rules.required]"
          />
        </template>

        <v-btn
          type="submit"
          color="primary"
          rounded="pill"
          block
          :loading="loading"
          class="font-weight-bold"
        >
          Create Account
        </v-btn>
      </v-form>

      <div class="or-divider d-flex align-center my-3">
        <v-divider />
        <span class="mx-3 text-medium-emphasis text-caption">or</span>
        <v-divider />
      </div>

      <div ref="googleButton" class="google-btn-container d-flex justify-center"></div>
    </v-card>
  </v-dialog>

  <CompleteProfileDialog v-model="completeProfile" />
</template>

<style scoped>
.auth-card {
  border: 1px solid #e0e0e0;
}

.v-slide-group {
  width: 100%;
}
.tab-switch {
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
}

.tab-btn:first-child {
  border-radius: 7px 0 0 7px;
}

.tab-btn:last-child {
  border-radius: 0 7px 7px 0;
}

.tab-active {
  background: black;
  color: white;
}

.tab-inactive {
  background: white;
  color: black;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 2px;
}
</style>
