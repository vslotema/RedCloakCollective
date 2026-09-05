<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { countries } from '@/lib/countries'
import { usStates } from '@/lib/usStates'

const model = defineModel<boolean>({ default: false })

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')
const country = ref<string | null>(null)
const state = ref<string | null>(null)

const isUs = computed(() => country.value === 'US')

const rules = {
  required: (v: string | null) => !!v || 'This field is required',
}

async function submit() {
  if (!country.value || (isUs.value && !state.value)) return

  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.updateLocation(country.value, isUs.value ? state.value : null)
    model.value = false
    router.push('/')
  } catch {
    errorMessage.value = 'Could not save your details. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog v-model="model" max-width="400" persistent>
    <v-card rounded="lg" color="white" elevation="0" class="pa-10 auth-card">
      <h2 class="text-h5 font-weight-bold mb-1">Almost there</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Tell us where you're based so we can show you relevant articles.
      </p>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-3">
        {{ errorMessage }}
      </v-alert>

      <v-form @submit.prevent="submit">
        <span class="field-label">Country</span>
        <v-autocomplete
          v-model="country"
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
            v-model="state"
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
          Continue
        </v-btn>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.auth-card {
  border: 1px solid #e0e0e0;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 2px;
}
</style>
