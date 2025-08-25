<template>
  <div class="login-container">
    <EagerLogo class="mb-4" :height="'3rem'" :width="'3rem'" :is-white-bg="true" />
    <VaTabs v-model="selectedTab" grow class="mb-4">
      <VaTab name="normal">Login</VaTab>
      <VaTab name="pin">PIN</VaTab>
    </VaTabs>

    <VaForm ref="formRef" @submit.prevent="submit">
      <template v-if="selectedTab === 'normal'">
        <div class="mb-3">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <VaInput
            id="email"
            v-model="formData.email"
            :rules="[validators.required, validators.email]"
            type="email"
            bordered
            class="w-full"
          />
        </div>

        <VaValue v-slot="isPasswordVisible" :default-value="false">
          <div class="mb-3" v-bind="$attrs">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <VaInput
              id="password"
              v-model="formData.password"
              :rules="[validators.required]"
              :type="isPasswordVisible.value ? 'text' : 'password'"
              class="w-full"
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

        <div class="flex justify-between items-center mb-3">
          <label>
            <input
              type="checkbox"
              v-model="formData.keepLoggedIn"
            />
            Keep me signed in
          </label>
          <RouterLink :to="{ name: 'recover-password' }" class="text-primary text-sm font-semibold">
            Forgot password?
          </RouterLink>
        </div>
      </template>

      <template v-else>
        <div class="mb-3">
          <label for="pin" class="block text-sm font-medium text-gray-700 mb-1">Enter your PIN</label>
          <VaInput
            id="pin"
            v-model="pinData.pin"
            :rules="[validators.required, validators.digits(4)]"
            type="text"
            maxlength="4"
            bordered
            class="w-full"
            inputmode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </template>

      <div class="mt-4">
        <VaButton :loading="isLoggingIn" :disabled="isLoggingIn" class="w-full" type="submit"> Login </VaButton>
      </div>
    </VaForm>
    <p class="text-center mt-6 text-sm font-semibold text-gray-800">
      If you don't have an account
      <RouterLink :to="{ name: 'signup' }" class="font-semibold text-primary">Signup</RouterLink>
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vuestic-ui';
import { useAuthStore } from '../../stores/auth-store';
import { validators } from '../../services/utils';
import EagerLogo from '../../components/EagerLogo.vue';
import type { UserData, ErrorResponseData, ApiResponse } from '../../types/auth';

export default defineComponent({
  name: 'Login',
  components: { EagerLogo },
  setup() {
    const selectedTab = ref<'normal' | 'pin'>('normal');
    const formRef = ref();
    const router = useRouter();
    const route = useRoute();
    const { init: toast } = useToast();
    const authStore = useAuthStore();

    const formData = reactive({
      email: '',
      password: '',
      keepLoggedIn: false,
    });

    const pinData = reactive({
      pin: '',
    });

    const isLoggingIn = computed(() => authStore.loggingIn);

    onMounted(() => {
      if (authStore.isAuthenticated) {
        console.log('User already authenticated, redirecting to dashboard');
        const redirectTo = authStore.getPostLoginRedirect();
        router.replace(redirectTo);
      } else {
        console.log('Clearing stale session data on login page mount');
        authStore.clearAuthData();
      }
    });

    async function submit() {
      if (isLoggingIn.value) return;

      try {
        const isValid = await formRef.value.validate();
        if (!isValid) {
          toast({ message: 'Please fill in all required fields correctly', color: 'danger' });
          return;
        }
      } catch (error) {
        console.error('Validation error:', error);
        toast({ message: 'Form validation failed', color: 'danger' });
        return;
      }

      try {
        let response: ApiResponse<UserData | ErrorResponseData>;
        if (selectedTab.value === 'normal') {
          response = await authStore.login({
            login_method: 'email',
            email: formData.email,
            password: formData.password,
          });
        } else {
          response = await authStore.login({
            login_method: 'pin',
            pin: pinData.pin,
          });
        }

        console.log('Login response:', response);

        if (response.status === 200 && response.data?.data) {
          const userData = response.data.data as UserData;

          if ('id' in userData && 'role' in userData && userData.role) {
            if (userData.requires_2fa) {
              toast({ message: 'Please verify your email with the OTP sent', color: 'info' });
              await router.push({
                name: 'activate-account',
                query: { email: userData.email || '', user_id: userData.id },
              });
              return;
            }

            authStore.storeUserData(userData);

            await new Promise((resolve) => setTimeout(resolve, 100));

            toast({ message: 'Login successful', color: 'success' });

            const redirectPathRaw = route.query.redirect as string | null || localStorage.getItem('redirect');
            const redirectPath: string | undefined = redirectPathRaw ?? undefined;
            const enrollmentFlag = localStorage.getItem('enrollmentInProgress');

            if (enrollmentFlag === 'true') {
              localStorage.setItem('enrollmentInProgress', 'false');
              const redirectTo = authStore.getPostLoginRedirect(redirectPath);
              await router.replace(redirectTo);
              toast({
                message: "You've successfully logged in. Please click on the 'Enroll' button.",
                color: 'success',
              });
            } else {
              const redirectTo = authStore.getPostLoginRedirect(redirectPath);
              await router.replace(redirectTo);
            }

            localStorage.removeItem('redirect');
          } else {
            throw new Error('Invalid user data: id and role are required');
          }
        } else if (response.status === 403 && 'message' in response.data) {
          const errorData = response.data as ErrorResponseData;
          toast({ message: errorData.message || 'Please verify your email with the OTP sent', color: 'info' });
          if (!errorData.email || !errorData.user_id) {
            console.error('Missing email or user_id in 2FA response:', errorData);
            throw new Error('Missing required fields for 2FA redirect');
          }
          await router.push({
            name: 'activate-account',
            query: { email: errorData.email, user_id: errorData.user_id },
          });
          return;
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Login error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const errorMessage = error.response?.data?.message ||
                            error.message === 'No matching user found in response'
                              ? 'User not found. Please check your credentials.'
                              : error.message === 'Invalid user data: id and role are required'
                              ? 'Invalid user data received from server. Please try again.'
                              : 'Login failed. Please check your credentials or contact support.';
        toast({ message: errorMessage, color: 'danger' });

        if (selectedTab.value === 'normal') {
          formData.password = '';
        } else {
          pinData.pin = '';
        }
      } finally {
        authStore.loggingIn = false;
      }
    }

    return {
      selectedTab,
      formRef,
      formData,
      pinData,
      validators,
      submit,
      isLoggingIn,
    };
  },
});
</script>

<style scoped>
.login-container {
  padding: 1rem;
  width: 100%;
  max-width: 480px;
}
label {
  font-size: 0.875rem;
}
@media (max-width: 399.98px) {
  label {
    font-size: 0.8rem;
  }
  .text-sm {
    font-size: 0.8rem;
  }
}
</style>