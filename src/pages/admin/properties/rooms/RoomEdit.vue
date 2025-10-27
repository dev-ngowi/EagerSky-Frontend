<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Room') }}</h2>
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
          <span v-else>Update Room</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

interface Room {
  id: number;
  property_id: number;
  room_category_id: number;
  room_number: string;
  size: number;
  rent: number;
  is_available: boolean;
  features: string[];
  description: string;
}

interface FormData {
  property_id: number | null;
  room_category_id: number | null;
  room_number: string;
  size: number | null;
  rent: number | null;
  is_available: boolean | null;
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
  name: 'RoomEdit',
  props: {
    room: {
      type: Object as () => Room,
      required: true,
    },
  },
  emits: {
    close: null,
    submit: (payload: Payload, mode: 'edit') => true,
  },
  data() {
    return {
      form: {
        property_id: Number(this.room.property_id) as number | null,
        room_category_id: Number(this.room.room_category_id) as number | null,
        room_number: this.room.room_number as string,
        size: Number(this.room.size) as number | null,
        rent: Number(this.room.rent) as number | null,
        is_available: this.room.is_available as boolean | null,
        features: Array.isArray(this.room.features) ? [...this.room.features] : [] as string[],
        description: this.room.description || '' as string,
      } as FormData,
      errors: {
        property_id: '' as string,
        room_category_id: '' as string,
        room_number: '' as string,
        size: '' as string,
        rent: '' as string,
        is_available: '' as string,
        features: '' as string,
        description: '' as string,
      } as Errors,
      properties: [] as { value: number; text: string }[],
      roomCategories: [] as { value: number; text: string }[],
      availabilityOptions: [
        { value: true, text: 'Available' },
        { value: false, text: 'Not Available' },
      ],
      featureOptions: [] as { value: string; text: string }[],
      loadingProperties: false as boolean,
      loadingCategories: false as boolean,
      loadingFeatures: false as boolean,
      isSubmitting: false as boolean,
      loadingRooms: false as boolean,
      rooms: [] as Room[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    };
  },
  async mounted() {
    try {
      await Promise.all([
        this.fetchProperties(),
        this.fetchRoomCategories(),
        this.fetchFeatureTypes(),
        this.fetchRoomDetails(),
      ]);
      this.validatePropertyId();
      this.validateRoomCategoryId();
    } catch (error) {
      console.error('Mounted error:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to load room details.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
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
          this.properties = response.data.data.map((property: any) => {
            const title = property.title && typeof property.title === 'string' && property.title.trim()
              ? property.title
              : `Unnamed Property (ID: ${property.id})`;
            return {
              value: Number(property.id),
              text: title,
            };
          });
          this.validatePropertyId();
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
        console.error('fetchProperties error:', error.message, error.response?.data);
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
            value: Number(category.id),
            text: category.name,
          }));
          this.validateRoomCategoryId();
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
    async fetchRoomDetails() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${this.room.id}`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          const roomData = response.data.data;
          console.log('Fetched room details:', roomData);

          this.form = {
            property_id: Number(roomData.property_id),
            room_category_id: Number(roomData.room_category_id),
            room_number: roomData.room_number,
            size: Number(roomData.size),
            rent: Number(roomData.rent),
            is_available: roomData.is_available,
            features: Array.isArray(roomData.features) ? [...roomData.features] : [],
            description: roomData.description || '',
          };
        } else {
          throw new Error(response.data?.message || 'Failed to fetch room details');
        }
      } catch (error: any) {
        console.error('fetchRoomDetails error:', error);
        throw error;
      }
    },
    async getRooms(params: { page?: number; per_page?: number; search?: string; property_id?: number } = {}) {
      this.loadingRooms = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        if (response.status === 200) {
          this.rooms = response.data.data.map((room: any) => {
            const property = this.properties.find(p => p.value === Number(room.property_id));
            return {
              id: room.id,
              property_id: Number(room.property_id),
              room_category_id: Number(room.room_category_id),
              property_title: room.property_title || property?.text || 'Unknown Property',
              room_number: room.room_number,
              size: Number(room.size),
              rent: Number(room.rent),
              is_available: room.is_available,
              features: room.features || [],
              description: room.description || '',
              created_at: room.created_at ? new Date(room.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'None',
              updated_at: room.updated_at ? new Date(room.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'None',
            };
          });
          this.pagination = response.data.pagination;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No rooms found. Add some rooms to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch rooms.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getRooms error:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch rooms.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
      } finally {
        this.loadingRooms = false;
      }
    },
    validatePropertyId() {
      if (this.form.property_id && !this.properties.some(p => p.value === this.form.property_id)) {
        this.form.property_id = null;
        this.errors.property_id = 'Selected property is invalid';
      }
    },
    validateRoomCategoryId() {
      if (this.form.room_category_id && !this.roomCategories.some(c => c.value === this.form.room_category_id)) {
        this.form.room_category_id = null;
        this.errors.room_category_id = 'Selected room category is invalid';
      }
    },
    async submitForm() {
      // Clear previous errors
      this.errors = {
        property_id: '',
        room_category_id: '',
        room_number: '',
        size: '',
        rent: '',
        is_available: '',
        features: '',
        description: '',
      };

      // Validate form
      if (!this.form.property_id) this.errors.property_id = 'Property is required';
      if (!this.form.room_category_id) this.errors.room_category_id = 'Room category is required';
      if (!this.form.room_number) this.errors.room_number = 'Room number is required';
      if (this.form.size === null || this.form.size < 0) this.errors.size = 'Valid size is required';
      if (this.form.rent === null || this.form.rent < 0) this.errors.rent = 'Valid rent is required';
      if (this.form.is_available === null) this.errors.is_available = 'Availability is required';
      if (this.form.room_number && this.form.room_number.length > 50)
        this.errors.room_number = 'Room number must not exceed 50 characters';
      if (this.form.description && this.form.description.length > 5000)
        this.errors.description = 'Description must not exceed 5000 characters';
      if (this.form.features.length === 0) this.errors.features = 'At least one feature is recommended';

      // Check if there are validation errors (excluding features warning)
      if (Object.values(this.errors).some((error) => error && error !== this.errors.features)) {
        return;
      }

      this.isSubmitting = true;
      try {
        // Ensure features is always an array
        const featuresArray = Array.isArray(this.form.features) ? this.form.features : [];

        const payload: Payload = {
          property_id: this.form.property_id!,
          room_category_id: this.form.room_category_id!,
          room_number: this.form.room_number,
          size: this.form.size!,
          rent: this.form.rent!,
          is_available: this.form.is_available!,
          features: featuresArray,
          description: this.form.description || '',
        };

        console.log('Updating room with payload:', payload);

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${this.room.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });

        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.$emit('submit', payload, 'edit');
          this.$emit('close');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to update room.';
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
