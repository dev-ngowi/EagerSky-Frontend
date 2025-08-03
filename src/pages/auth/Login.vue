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
          <VaCheckbox v-model="formData.keepLoggedIn" label="Keep me signed in" />
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
            type="password"
            maxlength="4"
            bordered
            class="w-full"
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
import { AuthMiddleware } from '../../utils/authMiddleware';
import { validators } from '../../services/utils';
import EagerLogo from '../../components/EagerLogo.vue';

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
      if (!AuthMiddleware.isSessionValid()) {
        console.log('Clearing stale session data on login page mount');
        AuthMiddleware.clearSession();
        authStore.clearAuthData();
      }
    });

    const checkSessionAndRedirect = async () => {
      if (AuthMiddleware.isSessionValid()) {
        console.log('User already authenticated, redirecting to dashboard');
        const dashboardRoute = AuthMiddleware.getDashboardRoute();
        await router.replace({ name: dashboardRoute });
        return true;
      }
      return false;
    };

    const submit = async () => {
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
        let response;
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
          const userData = response.data.data;
          console.log('User data:', userData);

          if (userData.requires_2fa) {
            toast({ message: 'Please verify your email with the OTP sent', color: 'info' });
            await router.push({
              name: 'activate-account',
              query: { email: userData.email, user_id: userData.id },
            });
            return;
          }

          AuthMiddleware.storeSession({ ...userData, keepLoggedIn: formData.keepLoggedIn });
          authStore.storeUserData(userData);

          await new Promise((resolve) => setTimeout(resolve, 100));

          toast({ message: 'Login successful', color: 'success' });

          const redirectPath = route.query.redirect as string || localStorage.getItem('redirect');
          const enrollmentFlag = localStorage.getItem('enrollmentInProgress');

          if (enrollmentFlag === 'true') {
            localStorage.setItem('enrollmentInProgress', 'false');
            const redirectRoute = redirectPath || AuthMiddleware.getDashboardRoute();
            await router.replace(typeof redirectRoute === 'string' ? { path: redirectRoute } : { name: redirectRoute });
            toast({
              message: "You've successfully logged in. Please click on the 'Enroll' button.",
              color: 'success',
            });
          } else {
            const dashboardRoute = AuthMiddleware.getDashboardRoute();
            if (redirectPath && redirectPath !== '/auth/login' && redirectPath !== '/') {
              await router.replace({ path: redirectPath });
            } else {
              await router.replace({ name: dashboardRoute });
            }
          }

          localStorage.removeItem('redirect');
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Login error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const errorMessage = error.message === 'No matching user found in response'
          ? 'User not found. Please check your credentials.'
          : error.message === 'Invalid user data: id, token, and role are required'
          ? 'Invalid user data received from server. Please try again.'
          : error.response?.data?.message || 'Login failed';
        toast({ message: errorMessage, color: 'danger' });

        if (selectedTab.value === 'normal') {
          formData.password = '';
        } else {
          pinData.pin = '';
        }
      } finally {
        authStore.loggingIn = false;
      }
    };

    checkSessionAndRedirect();

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