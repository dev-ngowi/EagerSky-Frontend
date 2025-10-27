<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Track Contractor Progress', 'Track Contractor Progress') }}</h2>
    <div v-if="assignment" class="mb-4 space-y-2">
      <p><strong>Maintenance Request ID:</strong> {{ assignment.maintenance_request_id }}</p>
      <p><strong>Property:</strong> {{ assignment.maintenance_request?.property_title || 'N/A' }}</p>
      <p><strong>Description:</strong> {{ assignment.maintenance_request?.description || 'N/A' }}</p>
      <p><strong>Contractor:</strong> {{ assignment.contractor_name || 'N/A' }}</p>
      <p><strong>Assign Date:</strong> {{ assignment.assign_date || 'N/A' }}</p>
      <p><strong>Assigned By:</strong> {{ assignment.assigned_by || 'N/A' }}</p>
      <p><strong>Initial Notes:</strong> {{ assignment.notes || 'N/A' }}</p>
      <p><strong>Current Status:</strong> {{ assignment.status || 'N/A' }}</p>
      <p><strong>Latest Progress Notes:</strong> {{ assignment.progress_notes || 'No progress notes yet' }}</p>
    </div>
    <div v-else-if="loading" class="mb-4 text-gray-500">
      Loading assignment details...
    </div>
    <div v-else class="mb-4 text-red-500">
      Error: Assignment data is not available.
    </div>
    <form v-if="assignment" @submit.prevent="submitProgress">
      <div class="grid grid-cols-1 gap-4">
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
            required
          />
        </div>
        <div>
          <VaTextarea
            v-model="form.progress_notes"
            :label="$t('Progress Notes', 'Progress Notes')"
            placeholder="Enter progress updates"
            :error="!!errors.progress_notes"
            :error-messages="errors.progress_notes ? [errors.progress_notes] : []"
            :disabled="isSubmitting"
            :maxlength="1000"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Close</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Update Progress</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, PropType, onMounted } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import type { ContractorAssignment } from '../../../../types/maintenanceRequest';

export default defineComponent({
  name: 'TrackContractorProgress',
  props: {
    assignmentId: {
      type: Number,
      required: true,
    },
  },
  emits: ['close', 'update'],
  setup(props, { emit }) {
    const assignment = ref<ContractorAssignment | null>(null);
    const form = reactive<{
      status: string;
      progress_notes: string;
    }>({
      status: '',
      progress_notes: '',
    });

    const errors = reactive<{
      status: string;
      progress_notes: string;
    }>({
      status: '',
      progress_notes: '',
    });

    const statusOptions = ref<{ value: string; text: string }[]>([
      { value: 'assigned', text: 'Assigned' },
      { value: 'in_progress', text: 'In Progress' },
      { value: 'completed', text: 'Completed' },
    ]);
    const loading = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    const fetchAssignment = async () => {
      if (!props.assignmentId || isNaN(props.assignmentId)) {
        console.error('Invalid assignmentId:', props.assignmentId);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid assignment ID provided.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        loading.value = false;
        return;
      }

      loading.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractor-assignments/${props.assignmentId}`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          assignment.value = response.data.data;
          if (assignment.value) {
            form.status = assignment.value.status;
            form.progress_notes = assignment.value.progress_notes ?? '';
          } else {
            throw new Error('Assignment data is null');
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch assignment.');
        }
      } catch (error: any) {
        console.error('Fetch assignment error:', error.response?.data || error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch assignment.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loading.value = false;
      }
    };

    const validate = () => {
      errors.status = form.status ? '' : 'Status is required';
      errors.progress_notes = form.progress_notes && form.progress_notes.length > 1000 ? 'Progress notes cannot exceed 1000 characters' : '';
      return !errors.status && !errors.progress_notes;
    };

    const submitProgress = async () => {
      if (!assignment.value) {
        Swal.fire({
          title: 'Error!',
          text: 'Assignment data is missing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      if (!validate()) {
        isSubmitting.value = false;
        return;
      }
      isSubmitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractor-assignments/${props.assignmentId}/progress`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: form,
        });
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Progress updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          assignment.value = response.data.data;
          emit('update', response.data.data);
        } else {
          throw new Error(response.data?.message || 'Failed to update progress.');
        }
      } catch (error: any) {
        console.error('Update progress error:', error.response?.data || error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update progress.',
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
      await fetchAssignment();
    });

    return {
      assignment,
      form,
      errors,
      statusOptions,
      loading,
      isSubmitting,
      submitProgress,
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