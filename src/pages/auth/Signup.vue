<template>
  <div class="w-full max-w-2xl mx-auto p-6">
    <VaForm ref="form" @submit.prevent="submit">
      <p class="text-center mb-6 text-xl font-semibold text-gray-800">
        Already have an account?
        <RouterLink :to="{ name: 'login' }" class="text-primary font-bold underline">Login</RouterLink>
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- First Name -->
        <div class="mb-4">
          <label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <VaInput
            id="first_name"
            v-model="formData.first_name"
            :rules="[(v) => !!v || 'First name is required']"
            type="text"
            bordered
            class="bordered-input"
          />
        </div>
        <!-- Last Name -->
        <div class="mb-4">
          <label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <VaInput
            id="last_name"
            v-model="formData.last_name"
            :rules="[(v) => !!v || 'Last name is required']"
            type="text"
            bordered
            class="bordered-input"
          />
        </div>
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <VaInput
          id="email"
          v-model="formData.email"
          :rules="[(v) => !!v || 'Email is required', (v) => /.+@.+\..+/.test(v) || 'Enter a valid email']"
          type="email"
          bordered
          class="bordered-input"
          placeholder="eg. eagersky@gmail.com"
        />
      </div>
      <!-- Phone -->
      <div class="mb-4">
        <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <VaInput
          id="phone"
          v-model="formData.phone"
          :rules="[
            (v) => !!v || 'Phone number is required',
            (v) =>
              /^0\d{9}$/.test(v) ||
              /^\+255\d{9}$/.test(v) ||
              'Phone must be 10 digits starting with 0 or 13 digits starting with +255',
          ]"
          type="text"
          bordered
          class="bordered-input"
          placeholder="e.g. 0712345678 or +255712345678"
        />
      </div>
      <!-- Password & Repeat -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <VaInput
            id="password"
            v-model="formData.password"
            :rules="passwordRules"
            :type="isPasswordVisible ? 'text' : 'password'"
            bordered
            class="bordered-input"
            @clickAppendInner.stop="isPasswordVisible = !isPasswordVisible"
          >
            <template #appendInner>
              <VaIcon
                :name="isPasswordVisible ? 'mso-visibility_off' : 'mso-visibility'"
                class="cursor-pointer"
                color="secondary"
              />
            </template>
          </VaInput>
        </div>
        <div>
          <label for="repeatPassword" class="block text-sm font-medium text-gray-700 mb-1">Repeat Password</label>
          <VaInput
            id="repeatPassword"
            v-model="formData.repeatPassword"
            :rules="[
              (v) => !!v || 'Repeat password is required',
              (v) => v === formData.password || 'Passwords do not match',
            ]"
            :type="isPasswordVisible ? 'text' : 'password'"
            bordered
            class="bordered-input"
            @clickAppendInner.stop="isPasswordVisible = !isPasswordVisible"
          >
            <template #appendInner>
              <VaIcon
                :name="isPasswordVisible ? 'mso-visibility_off' : 'mso-visibility'"
                class="cursor-pointer"
                color="secondary"
              />
            </template>
          </VaInput>
        </div>
      </div>
      <!-- PIN -->
      <div class="mb-6">
        <label for="pin" class="block text-sm font-medium text-gray-700 mb-1">PIN</label>
        <VaInput
          id="pin"
          v-model="formData.pin"
          :rules="[
            (v) => !!v || 'PIN is required',
            (v) => /^\d{4}$/.test(v) || 'PIN must be exactly 4 digits',
            (v) => !['1234', '0000', '1111', '2222', '1000', '2000', '4321'].includes(v) || 'Choose a stronger PIN',
          ]"
          type="password"
          bordered
          class="bordered-input"
          placeholder="4-digit secure PIN"
        />
      </div>
      <!-- Submit Button -->
      <div class="flex justify-center mt-6">
        <VaButton
          class="w-full max-w-xs"
          color="primary"
          :loading="_signingUp"
          :disabled="!isValid || _signingUp"
          @click="submit"
        >
          Create Account
        </VaButton>
      </div>
    </VaForm>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useForm, useToast } from 'vuestic-ui';
import { useAuthStore } from '../../stores/auth-store';
import { mapActions, mapWritableState } from 'pinia';
import type { SignupFormData, SignupPayload, ApiResponse, UserData } from '../../types/auth';

export default defineComponent({
  name: 'Signup',
  setup() {
    const { validate, isValid } = useForm('form');
    const { push } = useRouter();
    const { init } = useToast();
    const isPasswordVisible = ref(false);

    const formData = reactive<SignupFormData>({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
      repeatPassword: '',
      pin: '',
      role_id: 1,
    });

    const validationErrors = reactive<Record<string, string>>({});

    const passwordRules = [
      (v: string) => !!v || 'Password is required',
      (v: string) => v.length >= 8 || 'Minimum 8 characters',
      () => !validationErrors.password || validationErrors.password,
    ];

    return {
      formData,
      validate,
      isValid,
      push,
      init,
      passwordRules,
      isPasswordVisible,
      validationErrors,
    };
  },
  computed: {
    ...mapWritableState(useAuthStore, { _signingUp: 'signingUp' }),
  },
  methods: {
    ...mapActions(useAuthStore, ['signup']),
    async submit() {
      if (!this.validate()) {
        this._signingUp = false;
        this.init({
          message: 'Please fill all required fields correctly',
          color: 'danger',
        });
        return;
      }

      this._signingUp = true;

      try {
        const payload: SignupPayload = {
          first_name: this.formData.first_name,
          last_name: this.formData.last_name,
          phone: this.formData.phone,
          email: this.formData.email,
          password: this.formData.password,
          password_confirmation: this.formData.repeatPassword,
          pin: this.formData.pin,
          role_id: this.formData.role_id,
        };

        const response: ApiResponse<UserData> = await this.signup(payload);

        const responseData = response.data;

        if ('data' in responseData && response.status === 201) {
          const userData = responseData.data;
          this.init({
            message: 'Signup successful! Please check your email to activate your account.',
            color: 'success',
          });

          localStorage.setItem('pending_user_id', userData.id);
          this.push({
            name: 'activate-account',
            query: {
              email: this.formData.email,
              user_id: userData.id,
            },
          });

        } else if ('message' in responseData) {
          Object.keys(this.validationErrors).forEach((key) => delete this.validationErrors[key]);

          this.validationErrors['general'] = responseData.message || 'Signup failed.';
          this.init({
            message: this.validationErrors['general'],
            color: 'danger',
          });
        }
      } catch (error: any) {
        console.error('Signup error:', error);
        Object.keys(this.validationErrors).forEach((key) => delete this.validationErrors[key]);

        const errorData = error.response?.data;

        if (error.response?.status === 422 && errorData?.errors) {
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            this.validationErrors[field] = (messages as string[])[0];
          });
          this.init({
            message: Object.values(this.validationErrors).join('; '),
            color: 'danger',
          });

        } else if (
          error.response?.status === 500 &&
          errorData?.message === 'User registered, but failed to send OTP email'
        ) {
          const userId = errorData?.data?.id;
          if (userId) {
            localStorage.setItem('pending_user_id', userId);
            this.push({
              name: 'activate-account',
              query: {
                email: this.formData.email,
                user_id: userId,
              },
            });
          }

          this.init({
            message: 'Signup successful, but failed to send OTP email. Please use the Resend OTP option.',
            color: 'warning',
          });

        } else {
          let errorMessage = errorData?.message || 'Signup failed. Please try again.';
          if (!navigator.onLine) {
            errorMessage = 'No internet connection. Please check your network.';
          }
          this.validationErrors['general'] = errorMessage;
          this.init({ message: errorMessage, color: 'danger' });
        }
      } finally {
        this._signingUp = false;
      }
    },
  },
});
</script>

<style scoped>
@media (max-width: 640px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
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