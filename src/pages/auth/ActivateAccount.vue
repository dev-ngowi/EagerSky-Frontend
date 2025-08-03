<template>
  <div class="w-full max-w-md mx-auto mt-10 p-6">
    <VaForm ref="form" @submit.prevent="submit">
      <h2 class="text-center mb-6 text-2xl font-semibold text-gray-800">
        {{ isResendOtpRoute ? 'Resend OTP' : 'Activate Your Account' }}
      </h2>

      <!-- Email Input for Resend OTP Route -->
      <div v-if="isResendOtpRoute" class="mb-6">
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <VaInput
          id="email"
          v-model="formData.email"
          :rules="[(v) => !!v || 'Email is required', (v) => /.+@.+\..+/.test(v) || 'Enter a valid email']"
          type="email"
          bordered
          class="bordered-input"
          placeholder="Enter your email"
        />
      </div>

      <!-- OTP Input for Activate Account Route -->
      <div v-else-if="email" class="mb-6">
        <p class="text-center mb-4 text-gray-600">Please enter the 6-digit OTP sent to {{ email }}.</p>
        <label for="otp" class="block text-sm font-medium text-gray-700 mb-1">OTP</label>
        <VaInput
          id="otp"
          v-model="formData.otp"
          :rules="[(v) => !!v || 'OTP is required', (v) => /^\d{6}$/.test(v) || 'OTP must be 6 digits']"
          type="text"
          bordered
          class="bordered-input"
          placeholder="Enter 6-digit OTP"
          @input="logValidation"
        />
        <!-- Debug Validation -->
        <p class="text-sm text-gray-500 mt-2">Form Valid: {{ isValid }}</p>
      </div>
      <p v-else class="text-center mb-4 text-red-600">Email is missing. Please register again.</p>

      <!-- Submit Button -->
      <div class="flex justify-center mt-4">
        <VaButton
          class="w-full max-w-xs"
          color="primary"
          :loading="isSubmitting"
          :disabled="isButtonDisabled"
          @click="handleButtonClick"
        >
          {{ isResendOtpRoute ? 'Resend OTP' : 'Verify OTP' }}
        </VaButton>
      </div>

      <!-- Resend OTP Link for Activate Account Route -->
      <p v-if="!isResendOtpRoute" class="text-center mt-4 text-sm text-gray-600">
        Didn't receive the OTP?
        <VaButton
          preset="plain"
          color="secondary"
          :loading="isResending"
          :disabled="isResending || !email"
          class="text-primary underline"
          @click="resendOtp"
        >
          Resend OTP
        </VaButton>
      </p>
    </VaForm>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useToast } from 'vuestic-ui'
import { useAuthStore } from '../../stores/auth-store'
import { mapActions } from 'pinia'
import type { ResendOtpPayload, ApiResponse } from '../../types/auth'

export default defineComponent({
  name: 'ActivateAccount',
  setup() {
    const { validate, isValid } = useForm('form')
    const { push, currentRoute } = useRouter()
    const { query } = useRoute()
    const { init } = useToast()

    const email = ref((query.email as string) || '')
    const userId = ref((query.user_id as string) || localStorage.getItem('pending_user_id') || '')
    const formData = reactive({
      email: (query.email as string) || '',
      otp: '',
    })
    const isSubmitting = ref(false)
    const isResending = ref(false)
    const isResendOtpRoute = computed(() => currentRoute.value.name === 'resend-otp')
    const isButtonDisabled = computed(() => {
      const disabled = !isValid.value || isSubmitting.value || (!isResendOtpRoute.value && !userId.value)
      console.log('Button disabled state:', {
        isValid: isValid.value,
        isSubmitting: isSubmitting.value,
        isResendOtpRoute: isResendOtpRoute.value,
        userId: userId.value,
        disabled,
      })
      return disabled
    })

    onMounted(() => {
      console.log('Route query:', query)
      console.log('userId:', userId.value, 'email:', email.value)
      if (!isResendOtpRoute.value && (!userId.value || !email.value)) {
        init({ message: 'Missing user ID or email. Please register again.', color: 'danger' })
        push({ name: 'signup' })
      }
    })

    return {
      email,
      userId,
      formData,
      validate,
      isValid,
      isSubmitting,
      isResending,
      isResendOtpRoute,
      isButtonDisabled,
      push,
      init,
    }
  },
  methods: {
    ...mapActions(useAuthStore, ['verifyOtp']),
    async resendOtp(payload: ResendOtpPayload): Promise<ApiResponse<{ user_id: string }>> {
      return useAuthStore().resendOtp(payload)
    },

    logValidation() {
      console.log('OTP input:', this.formData.otp, 'isValid:', this.isValid)
    },

    handleButtonClick() {
      console.log('Button clicked, isResendOtpRoute:', this.isResendOtpRoute)
      if (this.isResendOtpRoute) {
        this.resendOtp({ email: this.formData.email })
      } else {
        this.submit()
      }
    },

    async submit() {
      console.log('Submit method called')
      if (this.isSubmitting || !this.userId) {
        console.log('Submit blocked: isSubmitting or missing userId', {
          isSubmitting: this.isSubmitting,
          userId: this.userId,
        })
        return
      }

      if (!this.validate()) {
        this.init({ message: 'Please enter a valid 6-digit OTP', color: 'danger' })
        return
      }

      this.isSubmitting = true
      try {
        const response = await this.verifyOtp({
          user_id: this.userId,
          otp: this.formData.otp,
        })

        console.log('OTP verification response', response)

        if (response.status === 200) {
          this.init({ message: 'Account activated successfully!', color: 'success' })
          localStorage.removeItem('pending_user_id')
          this.push({ name: 'login' })
        }
      } catch (error: any) {
        console.error('OTP verification error', error, 'Response:', error.response)
        this.init({
          message: error.response?.data?.message || 'Failed to verify OTP. Please try again.',
          color: 'danger',
        })
      } finally {
        this.isSubmitting = false
      }
    },
  },
})
</script>

<style scoped>
.bordered-input .va-input-wrapper {
  border: 1px solid #d1d5db !important;
  border-radius: 4px;
}

.bordered-input .va-input-wrapper:hover {
  border-color: #9ca3af !important;
}

.bordered-input .va-input-wrapper.focused {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
</style>