<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ mode === 'add' ? 'Add New Alert' : 'Edit Alert' }}</h2>
    <div v-if="isLoadingOptions" class="text-center text-gray-500">Loading options...</div>
    <form v-else @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaSelect
            v-model.number="form.user_id"
            label="User"
            placeholder="Select user"
            :options="users"
            :error="errors.user_id"
            :error-messages="errorMessages.user_id ? [errorMessages.user_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model.number="form.property_category_id"
            label="Property Category"
            placeholder="Select property category"
            :options="propertyCategories"
            :error="errors.property_category_id"
            :error-messages="errorMessages.property_category_id ? [errorMessages.property_category_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.min_price"
            type="number"
            label="Min Price"
            placeholder="Enter minimum price"
            :error="errors.min_price"
            :error-messages="errorMessages.min_price ? [errorMessages.min_price] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.max_price"
            type="number"
            label="Max Price"
            placeholder="Enter maximum price"
            :error="errors.max_price"
            :error-messages="errorMessages.max_price ? [errorMessages.max_price] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.min_bedrooms"
            type="number"
            label="Min Bedrooms"
            placeholder="Enter minimum bedrooms"
            :error="errors.min_bedrooms"
            :error-messages="errorMessages.min_bedrooms ? [errorMessages.min_bedrooms] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.max_bedrooms"
            type="number"
            label="Max Bedrooms"
            placeholder="Enter maximum bedrooms"
            :error="errors.max_bedrooms"
            :error-messages="errorMessages.max_bedrooms ? [errorMessages.max_bedrooms] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model.number="form.location_id"
            label="Location"
            placeholder="Select location"
            :options="locations"
            :error="errors.location_id"
            :error-messages="errorMessages.location_id ? [errorMessages.location_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.notification_frequency"
            label="Notification Frequency"
            placeholder="Select notification frequency"
            :options="notificationFrequencies"
            :error="errors.notification_frequency"
            :error-messages="errorMessages.notification_frequency ? [errorMessages.notification_frequency] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch, onMounted, PropType } from 'vue';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import {
  Alert,
  FormData,
  Errors,
  ErrorMessages,
  Payload,
  NotificationFrequencyOption,
  UserOption,
  LocationOption,
  PropertyCategoryOption,
  ApiResponse,
} from '../../../../types/alert';
import { AxiosResponse } from 'axios';

export default defineComponent({
  name: 'AlertForm',
  props: {
    alert: {
      type: Object as PropType<Alert | null>,
      default: null,
    },
    mode: {
      type: String as PropType<'add' | 'edit'>,
      default: 'add',
    },
  },
  emits: {
    close: null,
    submit: (payload: Payload, mode: 'add' | 'edit') => true,
  },
  setup(props, { emit }) {
    const form = reactive<FormData>({
      id: undefined,
      user_id: null,
      property_category_id: null,
      min_price: null,
      max_price: null,
      min_bedrooms: null,
      max_bedrooms: null,
      location_id: null,
      notification_frequency: '',
    });

    const errors = reactive<Errors>({
      user_id: false,
      property_category_id: false,
      min_price: false,
      max_price: false,
      min_bedrooms: false,
      max_bedrooms: false,
      location_id: false,
      notification_frequency: false,
    });

    const errorMessages = reactive<ErrorMessages>({
      user_id: '',
      property_category_id: '',
      min_price: '',
      max_price: '',
      min_bedrooms: '',
      max_bedrooms: '',
      location_id: '',
      notification_frequency: '',
    });

    const notificationFrequencies = ref<NotificationFrequencyOption[]>([
      { value: 'immediately', text: 'Immediately' },
      { value: 'daily', text: 'Daily' },
      { value: 'weekly', text: 'Weekly' },
    ]);

    const users = ref<UserOption[]>([]);
    const locations = ref<LocationOption[]>([]);
    const propertyCategories = ref<PropertyCategoryOption[]>([]);
    const isSubmitting = ref<boolean>(false);
    const isLoadingOptions = ref<boolean>(false);

    const initializeForm = () => {
      console.log('Initializing form with alert:', props.alert);
      if (props.mode === 'edit' && props.alert) {
        Object.assign(form, {
          id: props.alert.id ?? undefined,
          user_id: props.alert.user_id ?? null,
          property_category_id: props.alert.property_category_id ?? null,
          min_price: props.alert.min_price === 'N/A' ? null : props.alert.min_price ?? null,
          max_price: props.alert.max_price === 'N/A' ? null : props.alert.max_price ?? null,
          min_bedrooms: props.alert.min_bedrooms === 'N/A' ? null : props.alert.min_bedrooms ?? null,
          max_bedrooms: props.alert.max_bedrooms === 'N/A' ? null : props.alert.max_bedrooms ?? null,
          location_id: props.alert.location_id ?? null,
          notification_frequency: props.alert.notification_frequency ?? '',
        });
        console.log('Form after edit initialization:', { ...form });
      } else {
        Object.assign(form, {
          id: undefined,
          user_id: null,
          property_category_id: null,
          min_price: null,
          max_price: null,
          min_bedrooms: null,
          max_bedrooms: null,
          location_id: null,
          notification_frequency: '',
        });
        console.log('Form after add initialization:', { ...form });
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });
        if (response.status === 200 && 'data' in response.data) {
          users.value = response.data.data.map((user: any) => ({
            value: user.id,
            text: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username || 'N/A',
          }));
        } else {
          throw new Error(response.data.message || 'Failed to fetch users');
        }
      } catch (error: any) {
        console.error('fetchUsers error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch users',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    };

    const fetchLocations = async () => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });
        if (response.status === 200 && 'data' in response.data) {
          locations.value = response.data.data.map((location: any) => ({
            value: location.id,
            text: location.name,
          }));
        } else {
          throw new Error(response.data.message || 'Failed to fetch locations');
        }
      } catch (error: any) {
        console.error('fetchLocations error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch locations',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    };

    const fetchPropertyCategories = async () => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });
        if (response.status === 200 && 'data' in response.data) {
          propertyCategories.value = response.data.data.map((category: any) => ({
            value: category.id,
            text: category.name,
          }));
        } else {
          throw new Error(response.data.message || 'Failed to fetch property categories');
        }
      } catch (error: any) {
        console.error('fetchPropertyCategories error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch property categories',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    };

    const submitForm = async () => {
      Object.keys(errors).forEach((key) => (errors[key as keyof Errors] = false));
      Object.keys(errorMessages).forEach((key) => (errorMessages[key as keyof ErrorMessages] = ''));

      if (!form.user_id) {
        errors.user_id = true;
        errorMessages.user_id = 'User is required';
      }
      if (!form.property_category_id) {
        errors.property_category_id = true;
        errorMessages.property_category_id = 'Property category is required';
      }
      if (form.min_price !== null && form.min_price < 0) {
        errors.min_price = true;
        errorMessages.min_price = 'Min price must be non-negative';
      }
      if (form.max_price !== null && form.max_price < 0) {
        errors.max_price = true;
        errorMessages.max_price = 'Max price must be non-negative';
      }
      if (form.max_price !== null && form.min_price !== null && form.max_price < form.min_price) {
        errors.max_price = true;
        errorMessages.max_price = 'Max price must be greater than or equal to min price';
      }
      if (form.min_bedrooms !== null && form.min_bedrooms < 0) {
        errors.min_bedrooms = true;
        errorMessages.min_bedrooms = 'Min bedrooms must be non-negative';
      }
      if (form.max_bedrooms !== null && form.max_bedrooms < 0) {
        errors.max_bedrooms = true;
        errorMessages.max_bedrooms = 'Max bedrooms must be non-negative';
      }
      if (form.max_bedrooms !== null && form.min_bedrooms !== null && form.max_bedrooms < form.min_bedrooms) {
        errors.max_bedrooms = true;
        errorMessages.max_bedrooms = 'Max bedrooms must be greater than or equal to min bedrooms';
      }
      if (!form.location_id) {
        errors.location_id = true;
        errorMessages.location_id = 'Location is required';
      }
      if (!form.notification_frequency) {
        errors.notification_frequency = true;
        errorMessages.notification_frequency = 'Notification frequency is required';
      }

      if (Object.values(errors).some((error) => error)) {
        console.log('Validation errors:', errors, errorMessages);
        return;
      }

      isSubmitting.value = true;
      try {
        const payload: Payload = {
          id: form.id,
          user_id: form.user_id!,
          property_category_id: form.property_category_id!,
          min_price: form.min_price,
          max_price: form.max_price,
          min_bedrooms: form.min_bedrooms,
          max_bedrooms: form.max_bedrooms,
          location_id: form.location_id!,
          notification_frequency: form.notification_frequency,
        };
        console.log('Submitting payload:', payload);
        emit('submit', payload, props.mode);
      } catch (error: any) {
        console.error('Submission error:', error.message, error.response?.data);
        const errorResponse = error.response as AxiosResponse<
          | { message: string; errors?: Record<string, string[]> }
          | { data: any; message?: string; pagination?: any }
        > | undefined;
        const errorMessage = errorResponse?.data && 'message' in errorResponse.data ? errorResponse.data.message : 'An unexpected error occurred';
        if (errorResponse?.data && 'errors' in errorResponse.data && errorResponse.data.errors) {
          Object.assign(
            errorMessages,
            Object.fromEntries(
              Object.entries(errorResponse.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ])
            )
          );
          Object.keys(errorMessages).forEach((key) => {
            if (errorMessages[key as keyof ErrorMessages]) {
              errors[key as keyof Errors] = true;
            }
          });
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        isSubmitting.value = false;
      }
    };

    const resetForm = () => {
      Object.assign(form, {
        id: props.mode === 'edit' ? form.id : undefined,
        user_id: null,
        property_category_id: null,
        min_price: null,
        max_price: null,
        min_bedrooms: null,
        max_bedrooms: null,
        location_id: null,
        notification_frequency: '',
      });
      Object.keys(errors).forEach((key) => (errors[key as keyof Errors] = false));
      Object.keys(errorMessages).forEach((key) => (errorMessages[key as keyof ErrorMessages] = ''));
      console.log('Form reset:', { ...form });
      emit('close');
    };

    watch(
      () => [props.alert, props.mode, users.value, propertyCategories.value, locations.value] as [Alert | null, 'add' | 'edit', UserOption[], PropertyCategoryOption[], LocationOption[]],
      ([newAlert, newMode, newUsers, newPropertyCategories, newLocations]) => {
        if (newMode === 'edit' && newAlert && newUsers.length && newPropertyCategories.length && newLocations.length) {
          Object.assign(form, {
            id: newAlert.id ?? undefined,
            user_id: newAlert.user_id ?? null,
            property_category_id: newAlert.property_category_id ?? null,
            min_price: newAlert.min_price === 'N/A' ? null : newAlert.min_price ?? null,
            max_price: newAlert.max_price === 'N/A' ? null : newAlert.max_price ?? null,
            min_bedrooms: newAlert.min_bedrooms === 'N/A' ? null : newAlert.min_bedrooms ?? null,
            max_bedrooms: newAlert.max_bedrooms === 'N/A' ? null : newAlert.max_bedrooms ?? null,
            location_id: newAlert.location_id ?? null,
            notification_frequency: newAlert.notification_frequency ?? '',
          });
          console.log('Form updated via watch:', { ...form });
        } else {
          Object.assign(form, {
            id: undefined,
            user_id: null,
            property_category_id: null,
            min_price: null,
            max_price: null,
            min_bedrooms: null,
            max_bedrooms: null,
            location_id: null,
            notification_frequency: '',
          });
          console.log('Form reset via watch for add mode:', { ...form });
        }
      },
      { immediate: true, deep: true }
    );

    onMounted(async () => {
      isLoadingOptions.value = true;
      try {
        await Promise.all([fetchUsers(), fetchPropertyCategories(), fetchLocations()]);
        console.log('Options loaded:', {
          users: users.value,
          propertyCategories: propertyCategories.value,
          locations: locations.value,
        });
        initializeForm();
      } catch (error: any) {
        console.error('Error loading options:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to load form options',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        isLoadingOptions.value = false;
      }
    });

    return {
      form,
      errors,
      errorMessages,
      users,
      locations,
      propertyCategories,
      notificationFrequencies,
      isSubmitting,
      isLoadingOptions,
      submitForm,
      resetForm,
    };
  },
});
</script>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.md\:grid-cols-2 {
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.gap-4 {
  gap: 1rem;
}
.p-4 {
  padding: 1rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.text-xl {
  font-size: 1.25rem;
}
.font-bold {
  font-weight: 700;
}
.text-gray-500 {
  color: #6b7280;
}
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