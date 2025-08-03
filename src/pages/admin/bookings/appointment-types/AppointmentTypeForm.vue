<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Appointment Type') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter appointment type name"
            :error="!!errorMessages.name"
            :error-messages="errorMessages.name ? [errorMessages.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useToast } from 'vuestic-ui';
import type { FormData, Errors, ErrorMessages } from '../../../../types/appointment-type';

export default defineComponent({
  name: 'AppointmentTypeForm',
  emits: {
    close: null,
    submit: (payload: FormData, mode: 'add') => true,
  },
  setup() {
    const { init: toast } = useToast();
    return { toast };
  },
  data() {
    return {
      form: {
        name: '',
      } as FormData,
      errors: {
        name: false,
      } as Errors,
      errorMessages: {
        name: '',
      } as ErrorMessages,
      isSubmitting: false,
    };
  },
  methods: {
    async submitForm() {
      // Reset errors
      this.errors = { name: false };
      this.errorMessages = { name: '' };

      // Client-side validation
      if (!this.form.name) {
        this.errors.name = true;
        this.errorMessages.name = 'Name is required';
      }
      if (this.form.name && this.form.name.length < 3) {
        this.errors.name = true;
        this.errorMessages.name = 'Name must be at least 3 characters';
      }

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        this.$emit('submit', { name: this.form.name }, 'add');
        this.toast({ message: 'Appointment type added successfully.', color: 'success' });
      } catch (error: any) {
        console.error('Submission error:', error.message);
        const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
        if (error.response?.data?.errors) {
          this.errors.name = true;
          this.errorMessages.name = error.response.data.errors.name?.[0] || errorMessage;
        } else {
          this.errors.name = true;
          this.errorMessages.name = errorMessage;
        }
        this.toast({ message: errorMessage, color: 'danger' });
      } finally {
        this.isSubmitting = false;
      }
    },
    resetForm() {
      this.form = { name: '' };
      this.errors = { name: false };
      this.errorMessages = { name: '' };
      this.$emit('close');
    },
  },
});
</script>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.gap-4 {
  gap: 1rem;
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
