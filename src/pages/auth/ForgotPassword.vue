<template>
  <div class="auth-container">
    <EagerLogo class="mb-6" :height="'3rem'" :width="'3rem'" :is-white-bg="true" />
    <VaForm ref="formRef" @submit.prevent="submit">
      <div class="form-group">
        <label for="email">Email</label>
        <VaInput
          id="email"
          v-model="formData.email"
          :rules="[validators.required, validators.email]"
          type="email"
          bordered
          class="w-full"
          placeholder="Enter your email"
        />
      </div>

      <VaButton
        :loading="authStore.sendingResetOtp"
        :disabled="authStore.sendingResetOtp"
        class="w-full mt-4"
        type="submit"
      >
        Send Reset OTP
      </VaButton>

      <p class="text-center mt-4 text-sm">
        <RouterLink :to="{ name: 'login' }" class="font-semibold text-primary">
          Back to Login
        </RouterLink>
      </p>
    </VaForm>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vuestic-ui';
import { useAuthStore } from '../../stores/auth-store';
import { validators } from '../../services/utils';
import EagerLogo from '../../components/EagerLogo.vue';
import type { ErrorResponseData } from '../../types/auth';

// Type guard to check if response data is ErrorResponseData
const isErrorResponseData = (data: unknown): data is ErrorResponseData => {
  return typeof data === 'object' && data !== null && 'message' in data;
};

const formRef = ref();
const router = useRouter();
const { init: toast } = useToast();
const authStore = useAuthStore();

const formData = reactive({ email: '' });

const submit = async () => {
  if (authStore.sendingResetOtp) return;

  const isValid = await formRef.value.validate();
  if (!isValid) {
    toast({ message: 'Please enter a valid email address', color: 'danger' });
    return;
  }

  try {
    const response = await authStore.sendPasswordResetOtp(formData.email);
    if (response.status === 200 && response.data?.data && !isErrorResponseData(response.data.data)) {
      toast({ message: 'Password reset OTP sent to your email', color: 'success' });
      await router.push({
        name: 'recover-password-otp',
        query: { email: formData.email, user_id: response.data.data.user_id },
      });
    } else {
      const errorData = response.data.data as ErrorResponseData;
      throw new Error(errorData.message || 'Failed to send OTP');
    }
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to send OTP';
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