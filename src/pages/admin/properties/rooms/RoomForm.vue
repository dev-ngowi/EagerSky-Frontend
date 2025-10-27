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
            @update:modelValue="updateRoomDetails"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.room_category_id"
            label="Room Category"
            placeholder="Select room category"
            :options="roomCategories"
            :error-messages="errors.room_category_id ? [errors.room_category_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingCategories"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.room_number"
            label="Room Number"
            placeholder="Auto-generated"
            :error-messages="errors.room_number ? [errors.room_number] : []"
            :disabled="true"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.size"
            type="number"
            label="Size (sq m)"
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
            placeholder="Auto-generated"
            :error-messages="errors.rent ? [errors.rent] : []"
            :disabled="true"
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
        <div class="mb-4">
          <VaInput
            v-model.number="form.total_rooms"
            type="number"
            label="Total Rooms"
            placeholder="Enter number of rooms"
            :error-messages="errors.total_rooms ? [errors.total_rooms] : []"
            :disabled="isSubmitting"
            min="1"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.features"
            label="Features"
            placeholder="Select one or more features"
            :options="featureOptions"
            :error-messages="errors.features ? [errors.features] : []"
            value-by="value"
            text-by="text"
            :loading="loadingFeatures"
            :disabled="isSubmitting"
            multiple
            clearable
            chips
          />
        </div>
        <div class="mb-4 md:col-span-2">
          <VaTextarea
            v-model="form.description"
            label="Description"
            placeholder="Enter room description"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting"
            autosize
            min-rows="3"
            max-rows="10"
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
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

interface FormData {
  property_id: number | null;
  room_category_id: number | null;
  room_number: string;
  size: number | null;
  rent: number | null;
  is_available: boolean | null;
  total_rooms: number;
  features: string[];
  description: string;
}

interface Errors {
  property_id: string;
  room_category_id: string;
  room_number: string;
  size: string;
  rent: string;
  is_available: string;
  total_rooms: string;
  features: string;
  description: string;
}

interface Payload {
  property_id: number;
  room_category_id: number;
  room_number: string;
  size: number;
  rent: number;
  is_available: boolean;
  features: string[];
  description: string;
}

export default defineComponent({
  name: 'RoomForm',
  emits: {
    close: null,
    submit: (payload: Payload | Payload[], mode: 'add') => true,
  },
  data() {
    return {
      form: {
        property_id: null,
        room_category_id: null,
        room_number: '',
        size: null,
        rent: null,
        is_available: null,
        total_rooms: 1,
        features: [],
        description: '',
      } as FormData,
      errors: {
        property_id: '',
        room_category_id: '',
        room_number: '',
        size: '',
        rent: '',
        is_available: '',
        total_rooms: '',
        features: '',
        description: '',
      } as Errors,
      properties: [] as { value: number; text: string; title: string; combined_amount: number }[],
      roomCategories: [] as { value: number; text: string }[],
      availabilityOptions: [
        { value: true, text: 'Available' },
        { value: false, text: 'Not Available' },
      ],
      featureOptions: [] as { value: string; text: string }[],
      loadingProperties: false,
      loadingCategories: false,
      loadingFeatures: false,
      isSubmitting: false,
      lastRoomNumber: 0,
    };
  },
  mounted() {
    this.fetchProperties();
    this.fetchRoomCategories();
    this.fetchFeatureTypes();
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
            title: property.title,
            combined_amount: property.combined_amount,
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
    async fetchRoomCategories() {
      this.loadingCategories = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/category`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.roomCategories = response.data.data.map((category: any) => ({
            value: category.id,
            text: category.name,
          }));
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch room categories.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchRoomCategories error:', error.message);
        this.errors.room_category_id = 'Failed to load room categories';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch room categories.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingCategories = false;
      }
    },
    async fetchFeatureTypes() {
      this.loadingFeatures = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-features/types`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.featureOptions = response.data.data.map((feature: string) => ({
            value: feature,
            text: feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          }));
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch feature types.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchFeatureTypes error:', error.message);
        this.errors.features = 'Failed to load feature types';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch feature types.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingFeatures = false;
      }
    },
    async fetchLastRoomNumber(propertyId: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/property/${propertyId}`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          const rooms = response.data.data;
          if (rooms.length > 0) {
            const lastRoom = rooms[rooms.length - 1];
            const match = lastRoom.room_number.match(/\d+$/);
            this.lastRoomNumber = match ? parseInt(match[0], 10) : 0;
          } else {
            this.lastRoomNumber = 0;
          }
        }
      } catch (error: any) {
        console.error('fetchLastRoomNumber error:', error.message);
      }
    },
    async updateRoomDetails(propertyId: number | null) {
      if (!propertyId) {
        this.form.room_number = '';
        this.form.rent = null;
        return;
      }
      const property = this.properties.find(p => p.value === propertyId);
      if (property) {
        await this.fetchLastRoomNumber(propertyId);
        const prefix = property.title.toLowerCase().replace(/\s+/g, '');
        this.form.room_number = `${prefix}${String(this.lastRoomNumber + 1).padStart(3, '0')}`;
        this.form.rent = property.combined_amount;
      }
    },
    async submitForm() {
      this.errors = {
        property_id: '',
        room_category_id: '',
        room_number: '',
        size: '',
        rent: '',
        is_available: '',
        total_rooms: '',
        features: '',
        description: '',
      };

      if (!this.form.property_id) this.errors.property_id = 'Property is required';
      if (!this.form.room_category_id) this.errors.room_category_id = 'Room category is required';
      if (!this.form.room_number) this.errors.room_number = 'Room number is required';
      if (this.form.size === null || this.form.size < 0) this.errors.size = 'Valid size is required';
      if (this.form.rent === null || this.form.rent < 0) this.errors.rent = 'Valid rent is required';
      if (this.form.is_available === null) this.errors.is_available = 'Availability is required';
      if (this.form.total_rooms < 1) this.errors.total_rooms = 'At least one room is required';
      if (this.form.room_number && this.form.room_number.length > 50)
        this.errors.room_number = 'Room number must not exceed 50 characters';
      if (this.form.description && this.form.description.length > 5000)
        this.errors.description = 'Description must not exceed 5000 characters';
      if (this.form.features.length === 0) this.errors.features = 'At least one feature is recommended';

      if (Object.values(this.errors).some((error) => error && error !== this.errors.features)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const property = this.properties.find(p => p.value === this.form.property_id);
        const prefix = property ? property.title.toLowerCase().replace(/\s+/g, '') : '';
        const payloads: Payload[] = [];

        for (let i = 0; i < this.form.total_rooms; i++) {
          payloads.push({
            property_id: this.form.property_id!,
            room_category_id: this.form.room_category_id!,
            room_number: `${prefix}${String(this.lastRoomNumber + 1 + i).padStart(3, '0')}`,
            size: this.form.size!,
            rent: this.form.rent!,
            is_available: this.form.is_available!,
            features: this.form.features,
            description: this.form.description,
          });
        }

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/bulk`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: { rooms: payloads },
        });

        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: `${this.form.total_rooms} room${this.form.total_rooms > 1 ? 's' : ''} added successfully.`,
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.resetForm();
          this.$emit('submit', payloads, 'add');
          this.$emit('close');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to add rooms.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(
            this.errors,
            Object.fromEntries(
              Object.entries(error.response.data.errors).map(([key, value]) => [
                key.includes('.') ? key.split('.')[1] : key,
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
        room_category_id: null,
        room_number: '',
        size: null,
        rent: null,
        is_available: null,
        total_rooms: 1,
        features: [],
        description: '',
      };
      this.errors = {
        property_id: '',
        room_category_id: '',
        room_number: '',
        size: '',
        rent: '',
        is_available: '',
        total_rooms: '',
        features: '',
        description: '',
      };
      this.lastRoomNumber = 0;
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