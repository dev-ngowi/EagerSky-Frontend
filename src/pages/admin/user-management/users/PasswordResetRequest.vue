<template>
  <div class="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg">
    <h2 class="text-xl font-bold mb-4">{{ $t('Request Password Reset') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="mb-4">
        <VaInput
          v-model="form.email"
          type="email"
          label="Email"
          placeholder="Enter email"
          :error="!!errors.email"
          :error-messages="errors.email ? [errors.email] : []"
          :disabled="isSubmitting"
          required
        />
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$router.push('/login')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Send Reset Link</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions } from 'pinia'
import { useUserStore } from '../../../../stores/userStore'
import Swal from 'sweetalert2'
import { FormData, Errors } from '../../../../types/password-request'
import type { VueI18n } from 'vue-i18n'

export default defineComponent({
  name: 'PasswordResetRequest',
  data() {
    return {
      form: {
        email: '' as string,
      } as FormData,
      errors: {
        email: '' as string,
      } as Errors,
      isSubmitting: false as boolean,
    }
  },
  methods: {
    ...mapActions(useUserStore, ['requestPasswordReset']),
    async submitForm() {
      // Reset errors
      this.errors = { email: '' }

      // Client-side validation
      if (!this.form.email) this.errors.email = this.$t('Email is required')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) this.errors.email = this.$t('Invalid email format')

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const response = await this.requestPasswordReset(this.form.email)
        if (response.status === 200) {
          this.$router.push('/login')
        }
      } catch (error: any) {
        console.error('Submission error:', error.message)
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors)
        } else {
          this.errors.email = error.response?.data?.message || this.$t('An unexpected error occurred')
        }
        Swal.fire({
          title: this.$t('Error!'),
          text: this.errors.email,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.isSubmitting = false
      }
    },
  },
})

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: VueI18n['t']
  }
}
</script>

<style scoped>
.max-w-md {
  max-width: 28rem;
}
.mx-auto {
  margin-left: auto;
  margin-right: auto;
}
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-4 {
  padding: 1rem;
}
.mb-4 {
  margin-bottom: 1rem;
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