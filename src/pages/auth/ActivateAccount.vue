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
          :rules="[validators.required, validators.email]"
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
          :rules="[validators.required, validators.digits(6)]"
          type="text"
          maxlength="6"
          bordered
          class="bordered-input"
          placeholder="Enter 6-digit OTP"
          inputmode="numeric"
          pattern="[0-9]*"
          @input="logValidation"
        />
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

      <!-- Debug Information -->
      <div v-if="debugInfo" class="mt-4 text-sm text-gray-500">
        <p><strong>Debug Info:</strong></p>
        <p>User ID: {{ userId }}</p>
        <p>OTP Provided: {{ formData.otp }}</p>
        <p>Existing OTPs: {{ JSON.stringify(debugInfo.existing_otps) }}</p>
      </div>
    </VaForm>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useForm, useToast } from 'vuestic-ui';
import { useAuthStore } from '../../stores/auth-store';
import { validators } from '../../services/utils';
import type { ResendOtpPayload, ApiResponse } from '../../types/auth';

export default defineComponent({
  name: 'ActivateAccount',
  setup() {
    const { validate, isValid } = useForm('form');
    const { push, currentRoute } = useRouter();
    const { query } = useRoute();
    const { init } = useToast();

    const email = ref((query.email as string) || '');
    const userId = ref((query.user_id as string) || localStorage.getItem('pending_user_id') || '');
    const formData = reactive({
      email: (query.email as string) || '',
      otp: '',
    });
    const isSubmitting = ref(false);
    const isResending = ref(false);
    const debugInfo = ref<any>(null);
    const isResendOtpRoute = computed(() => currentRoute.value.name === 'resend-otp');
    const isButtonDisabled = computed(() => {
      const disabled = !isValid.value || isSubmitting.value || (!isResendOtpRoute.value && !userId.value);
      console.log('Button disabled state:', {
        isValid: isValid.value,
        isSubmitting: isSubmitting.value,
        isResendOtpRoute: isResendOtpRoute.value,
        userId: userId.value,
        disabled,
      });
      return disabled;
    });

    onMounted(() => {
      console.log('Route query:', query);
      console.log('userId:', userId.value, 'email:', email.value);
      if (!isResendOtpRoute.value && (!userId.value || !email.value)) {
        init({ message: 'Missing user ID or email. Please register again.', color: 'danger' });
        push({ name: 'signup' });
      }
    });

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
      debugInfo,
      push,
      init,
      validators,
    };
  },
  methods: {
    logValidation() {
      console.log('OTP input:', this.formData.otp, 'isValid:', this.isValid);
    },

    async resendOtp() {
      if (this.isResending || !this.email) return;

      this.isResending = true;
      try {
        const response = await useAuthStore().resendOtp({ email: this.formData.email });
        this.init({ message: 'OTP resent successfully', color: 'success' });
        if (!this.userId && response.data.data && 'user_id' in response.data.data && response.data.data.user_id) {
          this.userId = response.data.data.user_id;
          localStorage.setItem('pending_user_id', this.userId);
        }
      } catch (error: any) {
        this.init({
          message: error.response?.data?.message || 'Failed to resend OTP',
          color: 'danger',
        });
      } finally {
        this.isResending = false;
      }
    },

    async handleButtonClick() {
      console.log('Button clicked, isResendOtpRoute:', this.isResendOtpRoute);
      if (this.isResendOtpRoute) {
        await this.resendOtp();
      } else {
        await this.submit();
      }
    },

    async submit() {
      console.log('Submit method called');
      if (this.isSubmitting || !this.userId) {
        console.log('Submit blocked: isSubmitting or missing userId', {
          isSubmitting: this.isSubmitting,
          userId: this.userId,
        });
        return;
      }

      if (!this.validate()) {
        this.init({ message: 'Please enter a valid 6-digit OTP', color: 'danger' });
        return;
      }

      this.isSubmitting = true;
      try {
        const response = await useAuthStore().verifyOtp({
          user_id: this.userId,
          otp: this.formData.otp,
        });

        console.log('OTP verification response', response);

        if (response.status === 200) {
          this.init({ message: 'Account activated successfully!', color: 'success' });
          localStorage.removeItem('pending_user_id');
          this.push(response.redirectTo || { name: 'tenant-dashboard' });
        }
      } catch (error: any) {
        console.error('OTP verification error', error, 'Response:', error.response);
        this.debugInfo = error.response?.data?.debug || null;
        this.init({
          message: error.response?.data?.message || 'Failed to verify OTP. Please try again.',
          color: 'danger',
        });
        this.formData.otp = ''; // Clear OTP input on error
      } finally {
        this.isSubmitting = false;
      }
    },
  },
});
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