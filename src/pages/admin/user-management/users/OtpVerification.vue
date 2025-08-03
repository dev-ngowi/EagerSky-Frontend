<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Verify OTP') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="mb-4">
        <VaInput
          v-model="form.otp"
          label="OTP"
          placeholder="Enter 6-digit OTP"
          :error="!!errors.otp"
          :error-messages="errors.otp ? [errors.otp] : []"
          :disabled="isSubmitting"
          required
        />
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Verify</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { FormData, Errors, Payload } from '../../../../types/otp'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'OtpVerification',
  props: {
    userId: {
      type: Number,
      required: true,
    },
  },
  emits: {
    close: null,
  },
  data() {
    return {
      form: {
        otp: '' as string,
      } as FormData,
      errors: {
        otp: '' as string,
      } as Errors,
      isSubmitting: false as boolean,
    }
  },
  methods: {
    async submitForm() {
      // Reset errors
      this.errors = { otp: '' }

      // Client-side validation
      if (!this.form.otp || !/^\d{6}$/.test(this.form.otp)) {
        this.errors.otp = 'OTP must be exactly 6 digits'
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          user_id: this.userId,
          otp: this.form.otp,
        }

        await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/otp/verify`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })

        Swal.fire({
          title: 'Success!',
          text: 'OTP verified successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        this.$emit('close')
      } catch (error: any) {
        console.error('Submission error:', error.message)
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors)
        } else {
          this.errors.otp = error.response?.data?.message || 'An unexpected error occurred'
        }
        Swal.fire({
          title: 'Error!',
          text: this.errors.otp,
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