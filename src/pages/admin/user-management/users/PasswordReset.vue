<template>
  <div class="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg">
    <h2 class="text-xl font-bold mb-4">{{ $t('Reset Password') }}</h2>
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

      <div class="mb-4">
        <VaInput
          v-model="form.token"
          label="Reset Token"
          placeholder="Enter reset token"
          :error="!!errors.token"
          :error-messages="errors.token ? [errors.token] : []"
          :disabled="isSubmitting"
          required
        />
      </div>

      <div class="mb-4">
        <VaInput
          v-model="form.password"
          type="password"
          label="New Password"
          placeholder="Enter new password"
          :error="!!errors.password"
          :error-messages="errors.password ? [errors.password] : []"
          :disabled="isSubmitting"
          required
        />
      </div>

      <div class="mb-4">
        <VaInput
          v-model="form.password_confirmation"
          type="password"
          label="Confirm Password"
          placeholder="Confirm new password"
          :error="!!errors.password_confirmation"
          :error-messages="errors.password_confirmation ? [errors.password_confirmation] : []"
          :disabled="isSubmitting"
          required
        />
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$router.push('/login')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Reset Password</span>
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
import { FormData, Errors, Payload } from '../../../../types/password'

export default defineComponent({
  name: 'PasswordReset',
  data() {
    return {
      form: {
        email: '' as string,
        token: Array.isArray(this.$route.query.token) ? this.$route.query.token[0] || '' : this.$route.query.token || '',
        password: '' as string,
        password_confirmation: '' as string,
      } as FormData,
      errors: {
        email: '' as string,
        token: '' as string,
        password: '' as string,
        password_confirmation: '' as string,
      } as Errors,
      isSubmitting: false as boolean,
    }
  },
  methods: {
    ...mapActions(useUserStore, ['resetPassword']),
    async submitForm() {
      // Reset errors
      this.errors = {
        email: '',
        token: '',
        password: '',
        password_confirmation: '',
      }

      // Client-side validation
      if (!this.form.email) this.errors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) this.errors.email = 'Invalid email format'
      if (!this.form.token) this.errors.token = 'Reset token is required'
      if (!this.form.password) this.errors.password = 'Password is required'
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(this.form.password)) {
        this.errors.password =
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }
      if (!this.form.password_confirmation) this.errors.password_confirmation = 'Password confirmation is required'
      else if (this.form.password !== this.form.password_confirmation)
        this.errors.password_confirmation = 'Passwords must match'

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          email: this.form.email,
          token: this.form.token,
          password: this.form.password,
          password_confirmation: this.form.password_confirmation,
        }

        const response = await this.resetPassword(payload)
        if (response.status === 200) {
          this.$router.push('/login')
        }
      } catch (error: any) {
        console.error('Submission error:', error.message)
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors)
        } else {
          this.errors.email = error.response?.data?.message || 'An unexpected error occurred'
        }
        Swal.fire({
          title: 'Error!',
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