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
            :error-messages="validationErrors.first_name"
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
            :error-messages="validationErrors.last_name"
          />
        </div>
      </div>
      <!-- Email -->
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <VaInput
          id="email"
          v-model="formData.email"
          :rules="[
            (v) => !!v || 'Email is required',
            (v) => /.+@.+\..+/.test(v) || 'Enter a valid email',
            () => !validationErrors.email || validationErrors.email
          ]"
          type="email"
          bordered
          class="bordered-input"
          placeholder="eg. eagersky@gmail.com"
          :error-messages="validationErrors.email"
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
            () => !validationErrors.phone || validationErrors.phone
          ]"
          type="text"
          bordered
          class="bordered-input"
          placeholder="e.g. 0712345678 or +255712345678"
          :error-messages="validationErrors.phone"
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
            :error-messages="validationErrors.password"
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
              () => !validationErrors.repeatPassword || validationErrors.repeatPassword
            ]"
            :type="isPasswordVisible ? 'text' : 'password'"
            bordered
            class="bordered-input"
            @clickAppendInner.stop="isPasswordVisible = !isPasswordVisible"
            :error-messages="validationErrors.repeatPassword"
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
            () => !validationErrors.pin || validationErrors.pin
          ]"
          type="password"
          bordered
          class="bordered-input"
          placeholder="4-digit secure PIN"
          :error-messages="validationErrors.pin"
        />
      </div>
      <!-- General Error -->
      <div v-if="validationErrors.general" class="mb-4 text-red-600 text-sm text-center">
        {{ validationErrors.general }}
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
import type { SignupFormData, SignupPayload, ApiResponse, UserData, ErrorResponseData } from '../../types/auth';
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
      role_id: 3, // Default role_id set to 3 (tenant)
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
      console.log('Starting signup process...');
     
      // Clear previous validation errors
      Object.keys(this.validationErrors).forEach((key) => delete this.validationErrors[key]);
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
          role_id: this.formData.role_id, // Ensure role_id is 3 (tenant)
        };
        console.log('Submitting signup payload:', { ...payload, role_id: payload.role_id });
        const response: ApiResponse<UserData> & { redirectTo?: { name?: string; path?: string } } = await this.signup(payload);
        console.log('Signup response received:', response);
        // Handle successful registration
        if ('id' in (response.data as any).data && response.status === 201) {
          const userData = (response.data as any).data as UserData;
          console.log('Registration successful. User data:', userData);
          // Store user ID for account activation
          if (userData.id) {
            localStorage.setItem('pending_user_id', userData.id.toString());
            console.log('Stored pending user ID:', userData.id);
          }
          // Handle case where token is provided (immediate login)
          if (userData.token && response.redirectTo) {
            this.init({
              message: 'Registration successful! Redirecting to your dashboard.',
              color: 'success',
            });
            this.push(response.redirectTo);
            return;
          }
          // Show success message for account activation
          this.init({
            message: 'Registration successful! Please check your email to activate your account.',
            color: 'success',
          });
          // Navigate to activation page
          console.log('Navigating to activation page...');
          this.push({
            name: 'activate-account',
            query: {
              email: this.formData.email,
              user_id: userData.id?.toString() || '',
            },
          });
        } else {
          const errorData = (response.data as any).data as ErrorResponseData;
          console.error('Registration failed with message:', errorData.message);
          this.validationErrors['general'] = errorData.message || 'Registration failed.';
          this.init({
            message: this.validationErrors['general'],
            color: 'danger',
          });
        }
      } catch (error: any) {
        console.error('Signup error caught:', error);
       
        const errorResponse = error.response;
        const errorData = (errorResponse?.data as any)?.data as ErrorResponseData | undefined;
        console.log('Error response:', errorResponse);
        console.log('Error data:', errorData);
        // Handle validation errors (422)
        if (errorResponse?.status === 422 && errorData?.errors) {
          console.log('Validation errors detected:', errorData.errors);
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            // Map the first error message to the corresponding field
            this.validationErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          });
          // Prioritize field-specific errors for the toast message
          const errorMessage =
            this.validationErrors.email ||
            this.validationErrors.pin ||
            this.validationErrors.phone ||
            Object.values(this.validationErrors)[0] ||
            'Validation failed. Please check your inputs.';
          this.init({
            message: errorMessage,
            color: 'danger',
          });
        }
        // Handle duplicate entry errors (409)
        else if (errorResponse?.status === 409 ||
                 (errorData?.message && (
                   errorData.message.toLowerCase().includes('already exists') ||
                   errorData.message.toLowerCase().includes('duplicate') ||
                   errorData.message.toLowerCase().includes('taken')
                 ))) {
          console.log('Duplicate entry detected:', errorData?.message);
          // Map error to specific field (email or pin)
          if (errorData?.message?.toLowerCase().includes('email')) {
            this.validationErrors['email'] = 'This email is already taken.';
          } else if (errorData?.message?.toLowerCase().includes('pin')) {
            this.validationErrors['pin'] = 'This PIN is already in use.';
          } else {
            this.validationErrors['general'] = errorData?.message || 'An account with this email or PIN already exists.';
          }
          this.init({
            message: this.validationErrors['email'] || this.validationErrors['pin'] || this.validationErrors['general'],
            color: 'danger',
          });
        }
        // Handle registration success with email sending failure (500)
        else if (errorResponse?.status === 500 &&
                 errorData?.message === 'User registered, but failed to send OTP email') {
          console.log('Registration successful but email sending failed');
          const userId = (errorData as any)?.data?.id || (errorData as any)?.data?.user_id;
          if (userId) {
            localStorage.setItem('pending_user_id', userId.toString());
            this.push({
              name: 'activate-account',
              query: {
                email: this.formData.email,
                user_id: userId.toString(),
              },
            });
          }
          this.init({
            message: 'Registration successful, but failed to send OTP email. Please use the Resend OTP option.',
            color: 'warning',
          });
        }
        // Handle network errors
        else if (!navigator.onLine) {
          this.validationErrors['general'] = 'No internet connection. Please check your network and try again.';
          this.init({
            message: this.validationErrors['general'],
            color: 'danger',
          });
        }
        // Handle server errors (500, 503)
        else if (errorResponse?.status >= 500) {
          this.validationErrors['general'] = errorData?.message || 'Server error occurred. Please try again later.';
          this.init({
            message: `Server Error: ${this.validationErrors['general']}`,
            color: 'danger',
          });
        }
        // Handle client errors (400, 401, 403, 404)
        else if (errorResponse?.status >= 400 && errorResponse?.status < 500) {
          this.validationErrors['general'] = errorData?.message || `Request failed with status ${errorResponse.status}`;
          this.init({
            message: `Error: ${this.validationErrors['general']}`,
            color: 'danger',
          });
        }
        // Handle unexpected errors
        else {
          this.validationErrors['general'] = errorData?.message || error.message || 'Registration failed. Please try again.';
          this.init({
            message: `Unexpected Error: ${this.validationErrors['general']}`,
            color: 'danger',
          });
        }
      } finally {
        this._signingUp = false;
        console.log('Signup process completed');
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