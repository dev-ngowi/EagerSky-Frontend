<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Room') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaSelect
            v-model="form.property_id"
            label="Property"
            placeholder="Select property"
            :options="properties"
            :error-messages="errors.property_id ? [errors.property_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingProperties"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.room_number"
            label="Room Number"
            placeholder="Enter room number"
            :error-messages="errors.room_number ? [errors.room_number] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.size"
            type="number"
            label="Size (sq ft)"
            placeholder="Enter size"
            :error-messages="errors.size ? [errors.size] : []"
            :disabled="isSubmitting"
            min="0"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.rent"
            type="number"
            label="Rent (TZS)"
            placeholder="Enter rent"
            :error-messages="errors.rent ? [errors.rent] : []"
            :disabled="isSubmitting"
            min="0"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.is_available"
            label="Availability"
            placeholder="Select availability"
            :options="availabilityOptions"
            :error-messages="errors.is_available ? [errors.is_available] : []"
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
import { defineComponent } from 'vue';
import { FormData, Errors, Payload } from '../../../../types/room';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default defineComponent({
  name: 'RoomForm',
  emits: {
    close: null,
    submit: (payload: Payload, mode: 'add') => true,
  },
  data() {
    return {
      form: {
        property_id: null as number | null,
        room_number: '' as string,
        size: null as number | null,
        rent: null as number | null,
        is_available: null as boolean | null,
      } as FormData,
      errors: {
        property_id: '' as string,
        room_number: '' as string,
        size: '' as string,
        rent: '' as string,
        is_available: '' as string,
      } as Errors,
      properties: [] as { value: number; text: string }[],
      availabilityOptions: [
        { value: true, text: 'Available' },
        { value: false, text: 'Not Available' },
      ],
      loadingProperties: false as boolean,
      isSubmitting: false as boolean,
    };
  },
  mounted() {
    this.fetchProperties();
  },
  methods: {
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch properties.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchProperties error:', error.message);
        this.errors.property_id = 'Failed to load properties';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch properties.',
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
        property_id: '',
        room_number: '',
        size: '',
        rent: '',
        is_available: '',
      };

      if (!this.form.property_id) this.errors.property_id = 'Property is required';
      if (!this.form.room_number) this.errors.room_number = 'Room number is required';
      if (this.form.size === null || this.form.size < 0) this.errors.size = 'Valid size is required';
      if (this.form.rent === null || this.form.rent < 0) this.errors.rent = 'Valid rent is required';
      if (this.form.is_available === null) this.errors.is_available = 'Availability is required';
      if (this.form.room_number && this.form.room_number.length > 255)
        this.errors.room_number = 'Room number must not exceed 255 characters';

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          property_id: this.form.property_id!,
          room_number: this.form.room_number,
          size: this.form.size!,
          rent: this.form.rent!,
          is_available: this.form.is_available!,
        };

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });

        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: 'Room added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          // Reset form data after successful submission
          this.resetForm();
          this.$emit('submit', payload, 'add');
          this.$emit('close');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to add room.';
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
        property_id: null,
        room_number: '',
        size: null,
        rent: null,
        is_available: null,
      };
      this.errors = {
        property_id: '',
        room_number: '',
        size: '',
        rent: '',
        is_available: '',
      };
      // Emit close to ensure parent component knows to hide the form
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