<template>
  <div class="container">
    <div class="w-full max-w-sm mx-auto mt-6 p-5 bg-white shadow-lg rounded-lg">
      <VaForm ref="form" @submit.prevent="submit">
        <h2 class="text-center mb-3 text-xl font-semibold text-gray-800">
          {{ isResendOtpRoute ? 'Resend OTP' : 'Activate Your Account' }}
        </h2>
        <!-- Email Input for Resend OTP Route -->
        <div v-if="isResendOtpRoute" class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <VaInput
            id="email"
            v-model="formData.email"
            :rules="[validators.required, validators.email]"
            type="email"
            bordered
            class="bordered-input"
            placeholder="Enter your email"
            @input="validateEmail"
          />
        </div>
        <!-- OTP Input for Activate Account Route -->
        <div v-else-if="email" class="mb-4">
          <p class="text-center mb-2 text-gray-600 text-sm">Please enter the 6-digit OTP sent to {{ email }}.</p>
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
        <p v-else class="text-center mb-4 text-red-600 text-sm">Email is missing. Please register again.</p>
        <!-- Submit Button -->
        <div class="flex justify-center mt-2">
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
        <p v-if="!isResendOtpRoute" class="text-center mt-2 text-sm text-gray-600">
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
        <div v-if="debugInfo" class="mt-2 text-xs text-gray-500">
          <p><strong>Debug Info:</strong></p>
          <p>User ID: {{ userId }}</p>
          <p>OTP Provided: {{ formData.otp }}</p>
          <p>Existing OTPs: {{ JSON.stringify(debugInfo.existing_otps) }}</p>
        </div>
      </VaForm>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useForm, useToast } from 'vuestic-ui';
import { useAuthStore } from '../../stores/auth-store';
import { validators } from '../../services/utils';
import type {
  ResendOtpPayload,
  ResendOtpApiResponse,
  VerifyOtpApiResponse,
  ResendOtpData, // Kept for reference but not strictly needed for this logic
  ErrorResponseData,
  ResendOtpSuccessData, // New import for better type narrowing
} from '../../types/auth';
import { AuthMiddleware } from '../../utils/authMiddleware';
export default defineComponent({
  name: 'ActivateAccount',
  setup() {
    // ... (setup properties remain the same)
    const { validate, isValid } = useForm('form');
    const router = useRouter();
    const route = useRoute();
    const { init } = useToast();
    const email = ref((route.query.email as string)?.trim().toLowerCase() || '');
    const userId = ref((route.query.user_id as string) || localStorage.getItem('pending_user_id') || '');
    const formData = reactive({
      email: (route.query.email as string)?.trim().toLowerCase() || '',
      otp: '',
    });
    const isSubmitting = ref(false);
    const isResending = ref(false);
    const debugInfo = ref<any>(null);
    const isResendOtpRoute = computed(() => route.name === 'resend-otp');
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
      // ... (onMounted logic remains the same)
      console.log('Route query:', route.query);
      console.log('userId:', userId.value, 'email:', email.value);
      const authStore = useAuthStore();
      if (authStore.token) {
        console.warn('Found existing token during activation - clearing old session');
        authStore.clearAuthData();
      }
      if (!isResendOtpRoute.value && (!userId.value || !email.value)) {
        init({ message: 'Missing user ID or email. Please register again.', color: 'danger' });
        router.push({ name: 'signup' });
      }
    });
    // Helper function to safely extract user ID from resend OTP response
    const extractUserIdFromResponse = (response: ResendOtpApiResponse): string | null => {
      const data = response.data;
      // Type guard to narrow down to the success data structure
      const isSuccessData = (data: ResendOtpData): data is ResendOtpSuccessData => {
        return 'message' in data && (!('errors' in data) || data.errors === undefined);
      };
      if (!isSuccessData(data)) {
        // It's an ErrorResponseData or unexpected structure without user_id in common locations
        return null;
      }
      // data is now narrowed to ResendOtpSuccessData
      
      // Case 1: direct user_id
      if (data.user_id && typeof data.user_id === 'string') {
        return data.user_id;
      }
      // Case 2: user.id
      // FIX: The original code was using object destructuring/checking that TypeScript was complaining about
      // because it couldn't guarantee 'user' existed on all parts of the union.
      // With the 'isSuccessData' guard, we can now check 'user' safely.
      if (data.user && typeof data.user === 'object' && 'id' in data.user && typeof data.user.id === 'string') {
        return data.user.id;
      }
      // Case 3: id field
      if (data.id && typeof data.id === 'string') {
        return data.id;
      }
      return null;
    };
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
      router,
      init,
      validators,
      extractUserIdFromResponse,
    };
  },
  methods: {
    logValidation() {
      console.log('OTP input:', this.formData.otp, 'isValid:', this.isValid);
    },
    validateEmail() {
      // ... (validateEmail remains the same)
      const email = this.formData.email?.trim().toLowerCase();
      if (!email || !this.validators.email(email)) {
        this.init({ message: 'Please enter a valid email address.', color: 'danger' });
        return false;
      }
      return true;
    },
    async resendOtp() {
      // ... (resendOtp logic remains the same)
      if (this.isResending) return;
      const emailToUse = this.isResendOtpRoute ? this.formData.email?.trim().toLowerCase() : this.email;
      if (!emailToUse) {
        this.init({ message: 'Email is required to resend OTP.', color: 'danger' });
        return;
      }
      if (!this.validators.email(emailToUse)) {
        this.init({ message: 'Please enter a valid email address.', color: 'danger' });
        return;
      }
      this.isResending = true;
      try {
        const response: ResendOtpApiResponse = await useAuthStore().resendOtp({
          email: emailToUse
        } as ResendOtpPayload);
        console.log('Resend OTP response:', JSON.stringify(response, null, 2));
        this.init({ message: 'OTP resent successfully. Please check your email.', color: 'success' });
        // Use the helper function to safely extract user ID
        const extractedUserId = this.extractUserIdFromResponse(response);
        if (extractedUserId && !this.userId) {
          this.userId = extractedUserId;
          localStorage.setItem('pending_user_id', this.userId);
          console.log('Stored userId from resend:', this.userId);
        } else if (!extractedUserId && !this.userId) {
          console.warn('No user_id found in resend OTP response and no existing userId');
        }
        this.formData.otp = '';
        if (this.isResendOtpRoute && extractedUserId) {
          this.router.push({
            name: 'activate-account',
            query: { email: emailToUse, user_id: extractedUserId }
          });
        }
      } catch (error: any) {
        // ... (error handling remains the same)
        console.error('Resend OTP error:', error, 'Response:', error.response);
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Failed to resend OTP. Please ensure the email is registered.';
        this.init({ message: errorMessage, color: 'danger' });
      } finally {
        this.isResending = false;
      }
    },
    async handleButtonClick() {
      // ... (handleButtonClick remains the same)
      console.log('Button clicked, isResendOtpRoute:', this.isResendOtpRoute);
      if (this.isResendOtpRoute) {
        if (this.validateEmail()) {
          await this.resendOtp();
        }
      } else {
        await this.submit();
      }
    },
    async submit() {
      console.log('Submit method called');
      if (this.isSubmitting || !this.userId) {
        // ... (check remains the same)
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
        // Use the explicit VerifyOtpApiResponse type now that it's fixed
        const response = await useAuthStore().verifyOtp({
          user_id: this.userId,
          otp: this.formData.otp,
        }); // Removed 'as VerifyOtpApiResponse' as it's now explicitly typed
        console.log('OTP verification response:', JSON.stringify(response, null, 2));
        // Check if response indicates success
        // FIX: The original logic for checking success was incorrect as the response structure is now better defined.
        const responseData = (response.data as any);
        const isSuccess = response.status === 200 && responseData && !('errors' in responseData); // Check for no errors
        if (isSuccess) {
          this.init({ message: 'Account activated successfully!', color: 'success' });
          localStorage.removeItem('pending_user_id');
          // Handle redirect - check multiple possible locations
          const redirectRoute =
            response.redirectTo ||
            (responseData as any)?.redirectTo || // Cast to any to access redirectTo on the union type safely if necessary
            { name: AuthMiddleware.getDashboardRoute() };
          console.log('Redirecting to:', redirectRoute);
          this.router.push(redirectRoute);
        }
      } catch (error: any) {
        // ... (error handling remains the same)
        console.error('OTP verification error:', error, 'Response:', error.response);
        this.debugInfo = error.response?.data?.debug || null;
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Failed to verify OTP. Please check the code and try again.';
        this.init({ message: errorMessage, color: 'danger' });
        this.formData.otp = '';
      } finally {
        this.isSubmitting = false;
      }
    },
  },
});
</script>
<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--va-background-secondary);
}
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