<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Maintenance Request', 'Edit Maintenance Request') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaSelect
            v-model="form.property_id"
            label="Property"
            placeholder="Select property"
            :options="properties"
            :error="!!errors.property_id"
            :error-messages="errors.property_id ? [errors.property_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingOptions"
            :loading="loadingOptions"
            required
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.user_id"
            label="User"
            placeholder="Select user"
            :options="users"
            :error="!!errors.user_id"
            :error-messages="errors.user_id ? [errors.user_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingOptions"
            :loading="loadingOptions"
            required
          />
        </div>

        <div class="mb-4 md:col-span-2">
          <VaTextarea
            v-model="form.description"
            label="Description"
            placeholder="Enter maintenance request description"
            :error="!!errors.description"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting"
            required
            min-rows="4"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.status"
            label="Status"
            placeholder="Select status"
            :options="statusOptions"
            :error="!!errors.status"
            :error-messages="errors.status ? [errors.status] : []"
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
import { defineComponent, reactive, ref, PropType, onMounted } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import type { MaintenanceRequest, FormData, Errors, Payload } from '../../../../types/maintenanceRequest';

export default defineComponent({
  name: 'MaintenanceRequestEdit',
  props: {
    maintenanceRequest: {
      type: Object as PropType<MaintenanceRequest>,
      required: true,
    },
  },
  emits: ['submit', 'close'],
  setup(props, { emit }) {
    const form = reactive<FormData>({
      property_id: null,
      user_id: null,
      description: '',
      status: '',
    });

    const errors = reactive<Errors>({
      property_id: '',
      user_id: '',
      description: '',
      status: '',
    });

    const properties = ref<{ value: number; text: string }[]>([]);
    const users = ref<{ value: number; text: string }[]>([]);
    const loadingOptions = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    const statusOptions = [
      { value: 'pending', text: 'Pending' },
      { value: 'in_progress', text: 'In Progress' },
      { value: 'completed', text: 'Completed' },
    ];

    const initializeForm = () => {
      form.property_id = props.maintenanceRequest.property_id !== null ? Number(props.maintenanceRequest.property_id) : null;
      form.user_id = props.maintenanceRequest.user_id !== null ? Number(props.maintenanceRequest.user_id) : null;
      form.description = props.maintenanceRequest.description || '';
      form.status = props.maintenanceRequest.status || '';
    };

    const fetchProperties = async () => {
      loadingOptions.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          properties.value = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
          if (properties.value.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No properties found. Please add properties first.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch properties.');
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingOptions.value = false;
      }
    };

    const fetchUsers = async () => {
      loadingOptions.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          users.value = response.data.data.map((user: any) => ({
            value: user.id,
            text: user.first_name || user.last_name
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
              : `User ${user.id}`,
          }));
          if (users.value.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No users found. Please add users first.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch users.');
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch users.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingOptions.value = false;
      }
    };

    const validate = () => {
      errors.property_id = form.property_id ? '' : 'Property is required';
      errors.user_id = form.user_id ? '' : 'User is required';
      errors.description = form.description && form.description.length >= 10 ? '' : 'Description must be at least 10 characters';
      errors.status = form.status ? '' : 'Status is required';

      return !Object.values(errors).some((e) => e);
    };

    const submitForm = async () => {
      if (!validate()) {
        isSubmitting.value = false;
        return;
      }
      isSubmitting.value = true;
      try {
        const payload: Payload = {
          id: props.maintenanceRequest.id,
          property_id: form.property_id,
          user_id: form.user_id,
          description: form.description,
          status: form.status,
        };
        emit('submit', payload, 'edit');
      } catch (error: any) {
        console.error('Submit error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update maintenance request.',
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
      initializeForm();
      Object.keys(errors).forEach((key) => (errors[key as keyof Errors] = ''));
      emit('close');
    };

    onMounted(async () => {
      initializeForm();
      await Promise.all([fetchProperties(), fetchUsers()]);
    });

    return {
      form,
      errors,
      properties,
      users,
      loadingOptions,
      isSubmitting,
      statusOptions,
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
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
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