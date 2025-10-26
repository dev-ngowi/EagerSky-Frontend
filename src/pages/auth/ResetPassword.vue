<template>
  <div class="auth-container">
    <EagerLogo class="mb-6" :height="'3rem'" :width="'3rem'" :is-white-bg="true" />
    <VaForm ref="formRef" @submit.prevent="submit">
      <div class="form-group">
        <label for="otp">Enter OTP</label>
        <VaInput
          id="otp"
          v-model="formData.otp"
          :rules="[validators.required, validators.digits(6)]"
          type="text"
          maxlength="6"
          bordered
          class="w-full"
          placeholder="6-digit OTP"
        />
      </div>
      <VaValue v-slot="isPasswordVisible" :default-value="false">
        <div class="form-group">
          <label for="password">New Password</label>
          <VaInput
            id="password"
            v-model="formData.password"
            :rules="[validators.required, v => v.length >= 8 || 'Password must be at least 8 characters']"
            :type="isPasswordVisible.value ? 'text' : 'password'"
            bordered
            class="w-full"
            placeholder="Enter new password"
            @clickAppendInner.stop="isPasswordVisible.value = !isPasswordVisible.value"
          >
            <template #appendInner>
              <VaIcon
                :name="isPasswordVisible.value ? 'mso-visibility_off' : 'mso-visibility'"
                class="cursor-pointer"
                color="secondary"
              />
            </template>
          </VaInput>
        </div>
      </VaValue>
      <VaValue v-slot="isPasswordConfirmVisible" :default-value="false">
        <div class="form-group">
          <label for="password_confirmation">Confirm Password</label>
          <VaInput
            id="password_confirmation"
            v-model="formData.password_confirmation"
            :rules="[validators.required, v => v === formData.password || 'Passwords must match']"
            :type="isPasswordConfirmVisible.value ? 'text' : 'password'"
            bordered
            class="w-full"
            placeholder="Re-enter new password"
            @clickAppendInner.stop="isPasswordConfirmVisible.value = !isPasswordConfirmVisible.value"
          >
            <template #appendInner>
              <VaIcon
                :name="isPasswordConfirmVisible.value ? 'mso-visibility_off' : 'mso-visibility'"
                class="cursor-pointer"
                color="secondary"
              />
            </template>
          </VaInput>
        </div>
      </VaValue>
      <VaButton
        :loading="authStore.verifyingResetOtp || authStore.resettingPassword"
        :disabled="authStore.verifyingResetOtp || authStore.resettingPassword"
        class="w-full mt-4"
        type="submit"
      >
        Reset Password
      </VaButton>
      <div class="flex justify-between items-center mt-4 text-sm">
        <VaButton
          preset="secondary"
          :loading="authStore.sendingResetOtp"
          :disabled="authStore.sendingResetOtp"
          class="text-sm"
          @click="resendOtp"
        >
          Resend OTP
        </VaButton>
        <RouterLink :to="{ name: 'login' }" class="text-primary font-semibold">
          Back to Login
        </RouterLink>
      </div>
    </VaForm>
  </div>
</template>
<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vuestic-ui';
import { useAuthStore } from '../../stores/auth-store';
import { validators } from '../../services/utils';
import EagerLogo from '../../components/EagerLogo.vue';
import type { ErrorResponseData } from '../../types/auth';
// Type guard to check if response data is ErrorResponseData
const isErrorResponseData = (data: unknown): data is ErrorResponseData => {
  return typeof data === 'object' && data !== null && 'message' in data;
};
// Type guard for verify response data
const isVerifyResponseData = (
  data: unknown
): data is { user_id: string; email: string; reset_token: string } => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'user_id' in data &&
    'email' in data &&
    'reset_token' in data
  );
};
// Type guard for reset response data
const isResetResponseData = (
  data: unknown
): data is { user_id: string; email: string } => {
  return typeof data === 'object' && data !== null && 'user_id' in data && 'email' in data;
};
const formRef = ref();
const router = useRouter();
const route = useRoute();
const { init: toast } = useToast();
const authStore = useAuthStore();
const formData = reactive({
  otp: '',
  password: '',
  password_confirmation: '',
});
const email = route.query.email as string;
const userId = route.query.user_id as string;
const submit = async () => {
  if (authStore.verifyingResetOtp || authStore.resettingPassword) return;
  const isValid = await formRef.value.validate();
  if (!isValid) {
    toast({ message: 'Please fill in all fields correctly', color: 'danger' });
    return;
  }
  try {
    const verifyResponse = await authStore.verifyPasswordResetOtp({ user_id: userId, otp: formData.otp });
    if (verifyResponse.status === 200 && (verifyResponse.data as any)?.data && isVerifyResponseData((verifyResponse.data as any).data)) {
      const resetResponse = await authStore.resetPassword({
        user_id: userId,
        reset_token: (verifyResponse.data as any).data.reset_token,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });
      if (resetResponse.status === 200 && (resetResponse.data as any)?.data && isResetResponseData((resetResponse.data as any).data)) {
        toast({ message: 'Password reset successfully.', color: 'success' });
        await router.push({ name: 'login' });
      } else {
        const errorData = (resetResponse.data as any).data as ErrorResponseData;
        throw new Error(errorData.message || 'Failed to reset password');
      }
    } else {
      const errorData = (verifyResponse.data as any).data as ErrorResponseData;
      throw new Error(errorData.message || 'Invalid OTP');
    }
  } catch (error: any) {
    const errorMessage =
      (error.response?.data as any)?.message || error.message || 'Failed to reset password';
    toast({ message: errorMessage, color: 'danger' });
    formData.otp = '';
    formData.password = '';
    formData.password_confirmation = '';
  }
};
const resendOtp = async () => {
  if (authStore.sendingResetOtp) return;
  try {
    const response = await authStore.resendPasswordResetOtp(email);
    if (response.status === 200 && (response.data as any)?.data && !isErrorResponseData((response.data as any).data)) {
      toast({ message: 'A new OTP has been sent to your email', color: 'success' });
    } else {
      const errorData = (response.data as any).data as ErrorResponseData;
      throw new Error(errorData.message || 'Failed to resend OTP');
    }
  } catch (error: any) {
    const errorMessage =
      (error.response?.data as any)?.message || error.message || 'Failed to resend OTP';
    toast({ message: errorMessage, color: 'danger' });
  }
};
</script>
<style scoped>
.auth-container {
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  margin: auto;
  text-align: center;
}
.form-group {
  text-align: left;
  margin-bottom: 1.25rem;
}
label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}
.text-sm {
  font-size: 0.875rem;
}
@media (max-width: 400px) {
  .auth-container {
    padding: 1rem;
  }
  label {
    font-size: 0.85rem;
  }
}
</style>