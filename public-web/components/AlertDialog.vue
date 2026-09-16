<script setup lang="ts">
const open = defineModel<boolean>({ default: false });

const {
  icon,
  tone = "danger",
  title,
  message,
  confirmText = "Acknowledge",
  cancelText,
  loading = false,
} = defineProps<{
  icon: string;
  tone?: "danger" | "warning";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function onCancel() {
  emit("cancel");
  open.value = false;
}

function onConfirm() {
  emit("confirm");
  if (!cancelText) open.value = false;
}
</script>

<template>
  <v-dialog v-model="open" max-width="420">
    <v-card
      rounded="lg"
      color="surface"
      elevation="0"
      class="alert-dialog-card pa-8 text-center"
    >
      <div class="alert-dialog__icon" :class="`alert-dialog__icon--${tone}`">
        <v-icon :icon="icon" :size="28" />
      </div>

      <h2 class="text-h5 font-weight-bold mt-4 mb-2">{{ title }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-6">{{ message }}</p>

      <div class="d-flex ga-3">
        <v-btn
          v-if="cancelText"
          variant="flat"
          color="surface-variant"
          rounded="pill"
          class="flex-1-1-0"
          @click="onCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          :color="tone === 'danger' ? 'primary' : 'warning'"
          variant="flat"
          rounded="pill"
          class="flex-1-1-0 font-weight-bold"
          :loading="loading"
          @click="onConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.alert-dialog-card {
  border: 1px solid rgb(var(--v-theme-border-color));
}

.alert-dialog__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 50%;

  &--danger {
    color: rgb(var(--v-theme-primary));
    background: rgb(var(--v-theme-primary) / 0.1);
  }

  &--warning {
    color: rgb(var(--v-theme-warning));
    background: rgb(var(--v-theme-warning) / 0.1);
  }
}
</style>
