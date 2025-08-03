<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Schedule', 'Add New Schedule') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaSelect
            v-model="form.agent_id"
            label="Agent"
            placeholder="Select agent"
            :options="agents"
            :error-messages="errors.agent_id ? [errors.agent_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingAgents"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.property_id"
            label="Property (Optional)"
            placeholder="Select property"
            :options="properties"
            :error-messages="errors.property_id ? [errors.property_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingProperties"
            :disabled="isSubmitting"
            clearable
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.start_time"
            type="datetime-local"
            label="Start Time"
            :error-messages="errors.start_time ? [errors.start_time] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.end_time"
            type="datetime-local"
            label="End Time"
            :error-messages="errors.end_time ? [errors.end_time] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.status"
            label="Status"
            placeholder="Select status"
            :options="statusOptions"
            :error-messages="errors.status ? [errors.status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaTextarea
            v-model="form.notes"
            label="Notes (Optional)"
            placeholder="Enter notes"
            :error-messages="errors.notes ? [errors.notes] : []"
            :disabled="isSubmitting"
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
import { defineComponent } from 'vue';
import { FormData, Errors, Payload, Option } from '../../../../types/schedule';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default defineComponent({
  name: 'ScheduleForm',
  emits: {
    close: null,
  },
  data() {
    return {
      form: {
        agent_id: null,
        property_id: null,
        start_time: '',
        end_time: '',
        status: 'available',
        notes: '',
      } as FormData,
      errors: {
        agent_id: '',
        property_id: '',
        start_time: '',
        end_time: '',
        status: '',
        notes: '',
      } as Errors,
      agents: [] as Option[],
      properties: [] as Option[],
      statusOptions: [
        { value: 'available', text: 'Available' },
        { value: 'booked', text: 'Booked' },
        { value: 'unavailable', text: 'Unavailable' },
      ],
      loadingAgents: false,
      loadingProperties: false,
      isSubmitting: false,
    };
  },
  mounted() {
    this.fetchAgents();
    this.fetchProperties();
  },
  methods: {
    async fetchAgents() {
      this.loadingAgents = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          requiresAuth: false,
          params: { role_id: 2 },
        });
        console.log('fetchAgents response:', response);
        if (response.status === 200) {
          this.agents = response.data.data.map((agent: any) => ({
            value: Number(agent.id),
            text: `${agent.first_name} ${agent.last_name}` || `Agent ${agent.id}`,
          }));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch agents.');
        }
      } catch (error: any) {
        console.error('Failed to fetch agents:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to fetch agents.';
        this.errors.agent_id = errorMessage;
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
        this.loadingAgents = false;
      }
    },
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          requiresAuth: false,
        });
        console.log('fetchProperties response:', response);
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: Number(property.id),
            text: property.title || `Property ${property.id}`,
          }));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch properties.');
        }
      } catch (error: any) {
        console.error('Failed to fetch properties:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to fetch properties.';
        this.errors.property_id = errorMessage;
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
        this.loadingProperties = false;
      }
    },
    async submitForm() {
      this.errors = {
        agent_id: '',
        property_id: '',
        start_time: '',
        end_time: '',
        status: '',
        notes: '',
      };

      if (!this.form.agent_id) this.errors.agent_id = 'Agent is required';
      if (!this.form.start_time) this.errors.start_time = 'Start time is required';
      else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(this.form.start_time))
        this.errors.start_time = 'Invalid start time format';
      if (!this.form.end_time) this.errors.end_time = 'End time is required';
      else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(this.form.end_time))
        this.errors.end_time = 'Invalid end time format';
      if (
        this.form.start_time &&
        this.form.end_time &&
        new Date(this.form.start_time) >= new Date(this.form.end_time)
      ) {
        this.errors.end_time = 'End time must be after start time';
      }
      if (!this.form.status) this.errors.status = 'Status is required';
      if (this.form.notes && this.form.notes.length > 1000)
        this.errors.notes = 'Notes must not exceed 1000 characters';

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          agent_id: this.form.agent_id!,
          property_id: this.form.property_id,
          start_time: this.form.start_time + ':00',
          end_time: this.form.end_time + ':00',
          status: this.form.status,
          notes: this.form.notes || null,
        };
        console.log('Submitting payload:', payload);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/schedules`,
          method: 'post',
          requiresAuth: false,
          data: payload,
        });
        console.log('submitForm response:', response);
        Swal.fire({
          title: 'Success!',
          text: 'Schedule added successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.$emit('close');
        this.resetForm();
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to add schedule.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(
            this.errors,
            Object.fromEntries(
              Object.entries(error.response.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            ),
          );
          errorMessage = Object.values(this.errors).filter(Boolean).join('; ');
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
        this.isSubmitting = false;
      }
    },
    resetForm() {
      this.form = {
        agent_id: null,
        property_id: null,
        start_time: '',
        end_time: '',
        status: 'available',
        notes: '',
      };
      this.errors = {
        agent_id: '',
        property_id: '',
        start_time: '',
        end_time: '',
        status: '',
        notes: '',
      };
      this.$emit('close');
    },
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