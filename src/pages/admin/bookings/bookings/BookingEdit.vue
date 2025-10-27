<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Booking') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaSelect
            v-model="form.booking_property_type_id"
            label="Booking Type"
            placeholder="Select booking type"
            :options="bookingPropertyTypes"
            :error="!!errorMessages.booking_property_type_id"
            :error-messages="errorMessages.booking_property_type_id ? [errorMessages.booking_property_type_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingBookingPropertyTypes"
            :disabled="isSubmitting"
            required
            @update:modelValue="onBookingTypeChange"
          />
        </div>

        <div class="mb-4" v-if="form.booking_property_type_id === 1">
          <VaSelect
            v-model="form.property_ids"
            label="Properties"
            placeholder="Select properties"
            :options="properties"
            :error="!!errorMessages.property_ids"
            :error-messages="errorMessages.property_ids ? [errorMessages.property_ids] : []"
            value-by="value"
            text-by="text"
            :loading="loadingProperties"
            :disabled="isSubmitting"
            multiple
            required
          />
        </div>

        <div class="mb-4" v-if="form.booking_property_type_id === 2">
          <VaSelect
            v-model="selectedProperty"
            label="Property (for room selection)"
            placeholder="Select property to view rooms"
            :options="properties"
            :error="!!errorMessages.selected_property"
            :error-messages="errorMessages.selected_property ? [errorMessages.selected_property] : []"
            value-by="value"
            text-by="text"
            :loading="loadingProperties"
            :disabled="isSubmitting"
            @update:modelValue="fetchRooms"
          />
        </div>

        <div class="mb-4" v-if="form.booking_property_type_id === 2">
          <VaSelect
            v-model="form.room_ids"
            label="Rooms"
            placeholder="Select rooms"
            :options="rooms"
            :error="!!errorMessages.room_ids"
            :error-messages="errorMessages.room_ids ? [errorMessages.room_ids] : []"
            value-by="value"
            text-by="text"
            :loading="loadingRooms"
            :disabled="isSubmitting || !selectedProperty"
            multiple
            required
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.client_id"
            label="Client"
            placeholder="Select client"
            :options="users"
            :error="!!errorMessages.client_id"
            :error-messages="errorMessages.client_id ? [errorMessages.client_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingUsers"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.appointment_type_id"
            label="Appointment Type"
            placeholder="Select appointment type"
            :options="appointmentTypes"
            :error="!!errorMessages.appointment_type_id"
            :error-messages="errorMessages.appointment_type_id ? [errorMessages.appointment_type_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingAppointmentTypes"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.date"
            type="date"
            label="Date"
            :error="!!errorMessages.date"
            :error-messages="errorMessages.date ? [errorMessages.date] : []"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.duration"
            type="number"
            :label="form.booking_property_type_id === 2 ? 'Duration (days)' : 'Duration (minutes)'"
            :placeholder="form.booking_property_type_id === 2 ? 'Enter duration (days)' : 'Enter duration (minutes)'"
            :error="!!errorMessages.duration"
            :error-messages="errorMessages.duration ? [errorMessages.duration] : []"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.time_slot"
            type="time"
            label="Time Slot"
            :error="!!errorMessages.time_slot"
            :error-messages="errorMessages.time_slot ? [errorMessages.time_slot] : []"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.recurrence"
            label="Recurrence"
            placeholder="Select recurrence"
            :options="recurrenceOptions"
            :error="!!errorMessages.recurrence"
            :error-messages="errorMessages.recurrence ? [errorMessages.recurrence] : []"
            value-by="value"
            text-by="text"
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
            :error="!!errorMessages.status"
            :error-messages="errorMessages.status ? [errorMessages.status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.notes"
            type="textarea"
            label="Notes"
            placeholder="Enter any additional notes"
            :error="!!errorMessages.notes"
            :error-messages="errorMessages.notes ? [errorMessages.notes] : []"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Cancel</VaButton>
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
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import type { FormData, Errors, ErrorMessages, Option } from '../../../../types/booking';

// FIX: Define a local type for a Room in the Booking object that MUST have an `id`.
// This resolves the TS2339 error.
type BookingRoomWithId = {
  id: number;
  room_id: number;
  room_number: string;
  property_id?: number;
  property?: { id: number; title: string };
};

// Define a local Booking type that uses the corrected Room type.
interface FixedBooking {
  id: number;
  booking_property_type_id: number | string;
  client_id: number | string;
  appointment_type_id: number | string;
  date: string;
  duration: number | string;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string | null;
  properties?: { id: number }[];
  rooms?: BookingRoomWithId[]; // <-- Use the corrected type here
}

export default defineComponent({
  name: 'BookingEdit',
  props: {
    // Use the locally defined FixedBooking type for the prop
    booking: {
      type: Object as () => FixedBooking,
      required: true,
    },
  },
  emits: {
    close: null,
    submit: null,
  },
  data() {
    return {
      form: {
        id: this.booking.id,
        booking_property_type_id: Number(this.booking.booking_property_type_id) || null,
        property_ids: this.booking.properties?.map(p => Number(p.id)).filter(id => id) || [],
        // The error occurred here. Since `rooms` now uses `BookingRoomWithId`,
        // `r.id` is correctly typed as `number`.
        room_ids: this.booking.rooms?.map(r => Number(r.id)).filter(id => id) || [],
        client_id: Number(this.booking.client_id) || null,
        appointment_type_id: Number(this.booking.appointment_type_id) || null,
        date: (() => {
          try {
            const dateStr = this.booking.date;
            if (!dateStr) return '';
            const parsedDate = new Date(dateStr);
            return isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString().split('T')[0];
          } catch (error) {
            console.error('Error parsing date:', error);
            return '';
          }
        })(),
        duration: Number(this.booking.duration) || null,
        time_slot: (() => {
          try {
            const timeStr = this.booking.time_slot;
            if (!timeStr) return '';
            return timeStr.match(/^\d{2}:\d{2}$/) ? timeStr : new Date(timeStr).toISOString().slice(11, 16);
          } catch (error) {
            console.error('Error parsing time_slot:', error);
            return '';
          }
        })(),
        recurrence: this.booking.recurrence || 'none',
        status: this.booking.status || 'pending',
        notes: this.booking.notes ?? '',
      } as FormData,
      selectedProperty: null as number | null,
      errors: {
        booking_property_type_id: false,
        property_ids: false,
        room_ids: false,
        selected_property: false,
        client_id: false,
        appointment_type_id: false,
        date: false,
        duration: false,
        time_slot: false,
        recurrence: false,
        status: false,
        notes: false,
      } as Errors,
      errorMessages: {
        booking_property_type_id: '',
        property_ids: '',
        room_ids: '',
        selected_property: '',
        client_id: '',
        appointment_type_id: '',
        date: '',
        duration: '',
        time_slot: '',
        recurrence: '',
        status: '',
        notes: '',
      } as ErrorMessages,
      bookingPropertyTypes: [] as Option[],
      properties: [] as Option[],
      rooms: [] as Option[],
      users: [] as Option[],
      appointmentTypes: [] as Option[],
      recurrenceOptions: [
        { value: 'none', text: 'None' },
        { value: 'daily', text: 'Daily' },
        { value: 'weekly', text: 'Weekly' },
      ],
      statusOptions: [
        { value: 'pending', text: 'Pending' },
        { value: 'confirmed', text: 'Confirmed' },
        { value: 'cancelled', text: 'Cancelled' },
        { value: 'completed', text: 'Completed' },
      ],
      loadingBookingPropertyTypes: false,
      loadingProperties: false,
      loadingRooms: false,
      loadingUsers: false,
      loadingAppointmentTypes: false,
      isSubmitting: false,
    };
  },
  async mounted() {
    console.log('Booking data:', JSON.stringify(this.booking, null, 2)); // Debug log
    console.log('Initial form room_ids:', this.form.room_ids); // Debug log

    await Promise.all([
      this.fetchBookingPropertyTypes(),
      this.fetchProperties(),
      this.fetchUsers(),
      this.fetchAppointmentTypes(),
    ]);

    // Initialize selectedProperty for room bookings
    if (this.form.booking_property_type_id === 2 && this.booking.rooms?.length) {
      const firstRoom = this.booking.rooms[0];
      const propertyId = Number(firstRoom?.property?.id || firstRoom?.property_id);
      console.log('Detected property ID:', propertyId); // Debug log

      if (propertyId && this.properties.some(p => p.value === propertyId)) {
        this.selectedProperty = propertyId;
        await this.fetchRooms(this.selectedProperty);
        // Ensure room_ids are valid after fetching rooms
        const savedRoomIds = [...this.form.room_ids];
        this.form.room_ids = savedRoomIds.filter(id => this.rooms.some(room => room.value === id));
        console.log('Filtered room_ids:', this.form.room_ids); // Debug log

        if (this.form.room_ids.length === 0 && savedRoomIds.length > 0) {
          this.errors.room_ids = true;
          this.errorMessages.room_ids = 'No valid rooms found for this booking';
          Swal.fire({
            title: 'Warning!',
            text: this.errorMessages.room_ids,
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } else {
        this.errors.selected_property = true;
        this.errorMessages.selected_property = 'No valid property found for the selected rooms';
        Swal.fire({
          title: 'Warning!',
          text: this.errorMessages.selected_property,
          icon: 'warning',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    }
  },
  methods: {
    async fetchBookingPropertyTypes() {
      this.loadingBookingPropertyTypes = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/booking-types`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.bookingPropertyTypes = response.data.data.map((type: any) => ({
            value: Number(type.id),
            text: type.name,
          }));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch booking property types');
        }
      } catch (error: any) {
        console.error('Failed to fetch booking property types:', error.message);
        this.errors.booking_property_type_id = true;
        this.errorMessages.booking_property_type_id = 'Failed to load booking property types';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.booking_property_type_id,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingBookingPropertyTypes = false;
      }
    },
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: Number(property.id),
            text: property.title,
          }));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch properties');
        }
      } catch (error: any) {
        console.error('Failed to fetch properties:', error.message);
        this.errors.property_ids = true;
        this.errorMessages.property_ids = 'Failed to load properties';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.property_ids,
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
    async fetchRooms(propertyId: number | null) {
      if (!propertyId) {
        this.rooms = [];
        this.form.room_ids = [];
        return;
      }
      this.loadingRooms = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${propertyId}/rooms`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.rooms = response.data.data.map((room: any) => ({
            value: Number(room.id),
            text: room.room_number || `Room ${room.id}`,
          }));
          console.log('Available rooms:', this.rooms); // Debug log
          console.log('Current room_ids to match:', this.form.room_ids); // Debug log

          // Restore valid room_ids after fetching rooms
          if (this.form.booking_property_type_id === 2) {
            const savedRoomIds = [...this.form.room_ids];
            this.form.room_ids = savedRoomIds.filter(id => this.rooms.some(room => room.value === id));
            console.log('Filtered room_ids:', this.form.room_ids); // Debug log

            if (this.form.room_ids.length === 0 && savedRoomIds.length > 0) {
              this.errors.room_ids = true;
              this.errorMessages.room_ids = 'No valid rooms found for this booking';
              Swal.fire({
                title: 'Warning!',
                text: this.errorMessages.room_ids,
                icon: 'warning',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
              });
            }
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch rooms');
        }
      } catch (error: any) {
        console.error('Failed to fetch rooms:', error.message);
        this.errors.room_ids = true;
        this.errorMessages.room_ids = 'Failed to load rooms';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.room_ids,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingRooms = false;
      }
    },
    async fetchUsers() {
      this.loadingUsers = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: Number(user.id),
            text: `${user.first_name} ${user.last_name}`.trim() || user.email,
          }));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch users');
        }
      } catch (error: any) {
        console.error('Failed to fetch users:', error.message);
        this.errors.client_id = true;
        this.errorMessages.client_id = 'Failed to load users';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.client_id,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingUsers = false;
      }
    },
    async fetchAppointmentTypes() {
      this.loadingAppointmentTypes = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.appointmentTypes = response.data.data.map((type: any) => ({
            value: Number(type.id),
            text: type.name,
          }));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch appointment types');
        }
      } catch (error: any) {
        console.error('Failed to fetch appointment types:', error.message);
        this.errors.appointment_type_id = true;
        this.errorMessages.appointment_type_id = 'Failed to load appointment types';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.appointment_type_id,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingAppointmentTypes = false;
      }
    },
    async onBookingTypeChange() {
      this.form.property_ids = [];
      this.form.room_ids = [];
      this.selectedProperty = null;
      this.rooms = [];
      this.errors.property_ids = false;
      this.errorMessages.property_ids = '';
      this.errors.room_ids = false;
      this.errorMessages.room_ids = '';
      this.errors.selected_property = false;
      this.errorMessages.selected_property = '';
    },
    validateForm(): boolean {
      this.resetErrors();

      let isValid = true;

      if (!this.form.booking_property_type_id) {
        this.errors.booking_property_type_id = true;
        this.errorMessages.booking_property_type_id = 'Booking type is required';
        isValid = false;
      }

      if (this.form.booking_property_type_id === 1 && (!this.form.property_ids || this.form.property_ids.length === 0)) {
        this.errors.property_ids = true;
        this.errorMessages.property_ids = 'At least one property is required';
        isValid = false;
      }

      if (this.form.booking_property_type_id === 2 && (!this.form.room_ids || this.form.room_ids.length === 0)) {
        this.errors.room_ids = true;
        this.errorMessages.room_ids = 'At least one room is required';
        isValid = false;
      }

      if (this.form.booking_property_type_id === 2 && !this.selectedProperty) {
        this.errors.selected_property = true;
        this.errorMessages.selected_property = 'A property must be selected to choose rooms';
        isValid = false;
      }

      if (!this.form.client_id) {
        this.errors.client_id = true;
        this.errorMessages.client_id = 'Client is required';
        isValid = false;
      }

      if (!this.form.appointment_type_id) {
        this.errors.appointment_type_id = true;
        this.errorMessages.appointment_type_id = 'Appointment type is required';
        isValid = false;
      }

      if (!this.form.date) {
        this.errors.date = true;
        this.errorMessages.date = 'Date is required';
        isValid = false;
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (this.form.date < today) {
          this.errors.date = true;
          this.errorMessages.date = 'Date cannot be in the past';
          isValid = false;
        }
      }

      if (!this.form.duration || this.form.duration <= 0) {
        this.errors.duration = true;
        this.errorMessages.duration = 'Duration must be greater than 0';
        isValid = false;
      } else if (
        this.form.booking_property_type_id === 1 &&
        (this.form.duration < 15 || this.form.duration > 180)
      ) {
        this.errors.duration = true;
        this.errorMessages.duration = 'Duration must be between 15 and 180 minutes for property bookings';
        isValid = false;
      } else if (this.form.booking_property_type_id === 2 && this.form.duration < 1) {
        this.errors.duration = true;
        this.errorMessages.duration = 'Duration must be at least 1 day for room bookings';
        isValid = false;
      }

      if (!this.form.time_slot) {
        this.errors.time_slot = true;
        this.errorMessages.time_slot = 'Time slot is required';
        isValid = false;
      } else if (!/^\d{2}:\d{2}$/.test(this.form.time_slot)) {
        this.errors.time_slot = true;
        this.errorMessages.time_slot = 'Time slot must be in HH:mm format';
        isValid = false;
      }

      if (!this.form.recurrence) {
        this.errors.recurrence = true;
        this.errorMessages.recurrence = 'Recurrence is required';
        isValid = false;
      }

      if (!this.form.status) {
        this.errors.status = true;
        this.errorMessages.status = 'Status is required';
        isValid = false;
      }

      if (this.form.notes && this.form.notes.length > 500) {
        this.errors.notes = true;
        this.errorMessages.notes = 'Notes cannot exceed 500 characters';
        isValid = false;
      }

      if (!isValid) {
        Swal.fire({
          title: 'Validation Error',
          text: 'Please correct the errors in the form',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }

      return isValid;
    },
    resetErrors() {
      Object.keys(this.errors).forEach(key => {
        this.errors[key as keyof Errors] = false;
        this.errorMessages[key as keyof ErrorMessages] = '';
      });
    },
    async submitForm() {
      if (!this.validateForm()) return;

      this.isSubmitting = true;
      try {
        const payload = {
          booking_property_type_id: this.form.booking_property_type_id,
          property_ids: this.form.booking_property_type_id === 1 ? this.form.property_ids : [],
          room_ids: this.form.booking_property_type_id === 2 ? this.form.room_ids : [],
          client_id: this.form.client_id,
          appointment_type_id: this.form.appointment_type_id,
          date: this.form.date,
          duration: this.form.duration,
          time_slot: this.form.time_slot,
          recurrence: this.form.recurrence,
          status: this.form.status,
          notes: this.form.notes,
        };

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${this.form.id}`,
          method: 'put',
          data: payload,
          requiresAuth: true,
        });

        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Booking updated successfully',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.$emit('submit', response.data.data);
          this.$emit('close');
        } else {
          throw new Error(response.data?.message || 'Failed to update booking');
        }
      } catch (error: any) {
        console.error('Failed to update booking:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to update booking',
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
  },
});
</script>

<style scoped>
.spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #00A3E0;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>