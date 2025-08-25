<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Assign Contractor', 'Assign Contractor') }}</h2>
    <div v-if="maintenanceRequest" class="mb-4 space-y-2">
      <p><strong>Maintenance Request ID:</strong> {{ maintenanceRequest.id }}</p>
      <p><strong>Property:</strong> {{ maintenanceRequest.property_title || 'N/A' }}</p>
      <p><strong>User:</strong> {{ maintenanceRequest.user_name || 'N/A' }}</p>
      <p><strong>Description:</strong> {{ maintenanceRequest.description || 'N/A' }}</p>
      <p><strong>Status:</strong> {{ maintenanceRequest.status || 'N/A' }}</p>
    </div>
    <div v-else class="mb-4 text-red-500">
      Error: Maintenance request data is not available.
    </div>
    <form v-if="maintenanceRequest" @submit.prevent="submitForm">
      <div class="grid grid-cols-1 gap-4">
        <div>
          <VaSelect
            v-model="form.contractor_id"
            :label="$t('Contractors', 'Contractors')"
            placeholder="Select contractor"
            :options="contractors"
            :error="!!errors.contractor_id"
            :error-messages="errors.contractor_id ? [errors.contractor_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingOptions"
            :loading="loadingOptions"
            required
          />
        </div>
        <div>
          <VaTextarea
            v-model="form.notes"
            :label="$t('Notes', 'Notes')"
            placeholder="Enter any additional notes"
            :error="!!errors.notes"
            :error-messages="errors.notes ? [errors.notes] : []"
            :disabled="isSubmitting"
            :maxlength="1000"
          />
        </div>
        <div>
          <VaTextarea
            v-model="form.progress_notes"
            :label="$t('Initial Progress Notes', 'Initial Progress Notes')"
            placeholder="Enter initial progress notes (optional)"
            :error="!!errors.progress_notes"
            :error-messages="errors.progress_notes ? [errors.progress_notes] : []"
            :disabled="isSubmitting"
            :maxlength="1000"
          />
        </div>
        <div>
          <VaSelect
            v-model="form.status"
            :label="$t('Status', 'Status')"
            placeholder="Select status"
            :options="statusOptions"
            :error="!!errors.status"
            :error-messages="errors.status ? [errors.status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Assign</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, PropType, onMounted } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import type { MaintenanceRequest, ContractorAssignment } from '../../../../types/maintenanceRequest';

export default defineComponent({
  name: 'AssignContractor',
  props: {
    maintenanceRequest: {
      type: Object as PropType<MaintenanceRequest>,
      required: true,
    },
  },
  emits: ['submit', 'close'],
  setup(props, { emit }) {
    const form = reactive<ContractorAssignment>({
      maintenance_request_id: props.maintenanceRequest?.id ?? 0,
      contractor_id: null,
      notes: undefined,
      status: 'assigned',
      progress_notes: undefined,
      id: 0, // Added to satisfy ContractorAssignment interface
      maintenance_request: {
        id: props.maintenanceRequest?.id ?? 0,
        property_title: props.maintenanceRequest?.property_title ?? null,
        description: props.maintenanceRequest?.description ?? '',
        status: props.maintenanceRequest?.status ?? '',
      },
      contractor_name: null,
      assign_date: null,
      assigned_by: null,
    });

    const errors = reactive<{ contractor_id: string; notes: string; status: string; progress_notes: string }>({
      contractor_id: '',
      notes: '',
      status: '',
      progress_notes: '',
    });

    const contractors = ref<{ value: number; text: string }[]>([]);
    const statusOptions = ref<{ value: string; text: string }[]>([
      { value: 'assigned', text: 'Assigned' },
      { value: 'in_progress', text: 'In Progress' },
      { value: 'completed', text: 'Completed' },
    ]);
    const loadingOptions = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    const fetchContractors = async () => {
      loadingOptions.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          contractors.value = response.data.data.map((contractor: any) => ({
            value: Number(contractor.id),
            text: contractor.name || `Contractor ${contractor.id}`,
          }));
          if (contractors.value.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No contractors found. Please add contractors first.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch contractors.');
        }
      } catch (error: any) {
        console.error('Fetch contractors error:', error.response?.data || error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch contractors.',
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
      errors.contractor_id = form.contractor_id && form.contractor_id > 0 ? '' : 'Contractor is required';
      errors.notes = form.notes && form.notes.length > 1000 ? 'Notes cannot exceed 1000 characters' : '';
      errors.progress_notes = form.progress_notes && form.progress_notes.length > 1000 ? 'Progress notes cannot exceed 1000 characters' : '';
      errors.status = form.status ? '' : 'Status is required';
      return !errors.contractor_id && !errors.notes && !errors.progress_notes && !errors.status;
    };

    const submitForm = async () => {
      if (!props.maintenanceRequest || !Number.isInteger(props.maintenanceRequest.id) || props.maintenanceRequest.id <= 0) {
        console.error('Invalid maintenance request:', props.maintenanceRequest);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid maintenance request data.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      if (!validate()) {
        console.error('Validation failed:', errors);
        isSubmitting.value = false;
        return;
      }

      isSubmitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractor-assignments`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: {
            maintenance_request_id: props.maintenanceRequest.id,
            contractor_id: form.contractor_id,
            notes: form.notes,
            progress_notes: form.progress_notes,
            status: form.status,
          },
        });
        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: 'Contractor assigned successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          console.log('Assignment response:', response.data.data);
          emit('submit', response.data.data); // Emit the API response data including the assignment ID
        } else {
          throw new Error(response.data?.message || 'Failed to assign contractor.');
        }
      } catch (error: any) {
        console.error('Assign contractor error:', error.response?.data || error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to assign contractor.',
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

    onMounted(async () => {
      if (props.maintenanceRequest && Number.isInteger(props.maintenanceRequest.id) && props.maintenanceRequest.id > 0) {
        form.maintenance_request_id = props.maintenanceRequest.id;
        await fetchContractors();
      } else {
        console.error('Invalid maintenance request on mount:', props.maintenanceRequest);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid maintenance request data.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    });

    return {
      form,
      errors,
      contractors,
      statusOptions,
      loadingOptions,
      isSubmitting,
      maintenanceRequest: props.maintenanceRequest,
      submitForm,
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
.gap-4 {
  gap: 1rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-y-2 {
  > :not(:last-child) {
    margin-bottom: 0.5rem;
  }
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