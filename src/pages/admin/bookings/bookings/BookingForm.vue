<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Booking') }}</h2>
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
            :options="filteredRooms"
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
            ref="dateInput"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.duration"
            type="number"
            label="Duration (minutes)"
            placeholder="Enter duration (minutes)"
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
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting || !isFormReady">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

interface FormData {
  booking_property_type_id: number | null;
  property_ids: number[];
  room_ids: number[];
  client_id: number | null;
  appointment_type_id: number | null;
  date: string;
  duration: number | null;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
}

interface Errors {
  booking_property_type_id: boolean;
  property_ids: boolean;
  room_ids: boolean;
  selected_property: boolean;
  client_id: boolean;
  appointment_type_id: boolean;
  date: boolean;
  duration: boolean;
  time_slot: boolean;
  recurrence: boolean;
  status: boolean;
  notes: boolean;
}

interface ErrorMessages {
  booking_property_type_id: string;
  property_ids: string;
  room_ids: string;
  selected_property: string;
  client_id: string;
  appointment_type_id: string;
  date: string;
  duration: string;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
}

interface Option {
  value: number | string;
  text: string;
  is_available?: number;
}

export default defineComponent({
  name: 'BookingForm',
  emits: {
    close: null,
    submit: (payload: FormData) => true,
  },
  setup() {
    const dateInput = ref(null);
    return { dateInput };
  },
  data() {
    const today = new Date().toISOString().split('T')[0]; // Default to today's date
    return {
      form: {
        booking_property_type_id: null as number | null,
        property_ids: [] as number[],
        room_ids: [] as number[],
        client_id: null as number | null,
        appointment_type_id: null as number | null,
        date: today as string, // Set default date
        duration: 30 as number,
        time_slot: '' as string,
        recurrence: 'none' as string,
        status: 'pending' as string,
        notes: '' as string,
      },
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
      ],
      loadingBookingPropertyTypes: false,
      loadingProperties: false,
      loadingRooms: false,
      loadingUsers: false,
      loadingAppointmentTypes: false,
      isSubmitting: false,
    };
  },
  computed: {
    isFormReady(): boolean {
      return (
        !this.loadingBookingPropertyTypes &&
        !this.loadingProperties &&
        !this.loadingUsers &&
        !this.loadingAppointmentTypes &&
        !this.loadingRooms
      );
    },
    filteredRooms(): Option[] {
      return this.rooms.filter(room => room.is_available === 1);
    },
  },
  mounted() {
    this.fetchBookingPropertyTypes();
    this.fetchProperties();
    this.fetchUsers();
    this.fetchAppointmentTypes();
  },
  methods: {
    async fetchBookingPropertyTypes() {
      this.loadingBookingPropertyTypes = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/booking-property-types`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.bookingPropertyTypes = response.data.data.map((type: any) => ({
            value: type.id,
            text: type.name || `Type ${type.id}`,
          }));
        } else {
          this.errors.booking_property_type_id = true;
          this.errorMessages.booking_property_type_id = response.data?.message || 'Failed to fetch booking property types.';
          Swal.fire({
            title: 'Error!',
            text: this.errorMessages.booking_property_type_id,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
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
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
        } else {
          this.errors.property_ids = true;
          this.errorMessages.property_ids = response.data?.message || 'Failed to fetch properties.';
          Swal.fire({
            title: 'Error!',
            text: this.errorMessages.property_ids,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
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
    async fetchRooms(propertyId: number) {
      this.loadingRooms = true;
      this.form.room_ids = [];
      this.rooms = [];
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${propertyId}/rooms`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.rooms = response.data.data.map((room: any) => ({
            value: room.id,
            text: room.room_number || `Room ${room.id}`,
            is_available: Number(room.is_available) || 0,
          }));
        } else {
          this.errors.room_ids = true;
          this.errorMessages.room_ids = response.data?.message || 'Failed to fetch rooms.';
          Swal.fire({
            title: 'Error!',
            text: this.errorMessages.room_ids,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
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
          method: 'GET',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: user.id,
            text: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'None',
          }));
        } else {
          this.errors.client_id = true;
          this.errorMessages.client_id = response.data?.message || 'Failed to fetch clients.';
          Swal.fire({
            title: 'Error',
            text: this.errorMessages.client_id,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Failed to fetch users:', error.message);
        this.errors.client_id = true;
        this.errorMessages.client_id = 'Failed to load clients';
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
            value: type.id,
            text: type.name || `Type ${type.id}`,
          }));
        } else {
          this.errors.appointment_type_id = true;
          this.errorMessages.appointment_type_id = response.data?.message || 'Failed to fetch appointment types.';
          Swal.fire({
            title: 'Error!',
            text: this.errorMessages.appointment_type_id,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
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
    onBookingTypeChange() {
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
    async submitForm() {
      if (!this.form) {
        console.error('Form data is undefined');
        Swal.fire({
          title: 'Error!',
          text: 'Form data is not initialized.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.isSubmitting = false;
        return;
      }

      console.log('Form data before submission:', this.form);

      this.errors = {
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
      };
      this.errorMessages = {
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
      };

      if (!this.form.booking_property_type_id) {
        this.errors.booking_property_type_id = true;
        this.errorMessages.booking_property_type_id = 'Booking type is required';
      }
      if (this.form.booking_property_type_id === 1 && !this.form.property_ids.length) {
        this.errors.property_ids = true;
        this.errorMessages.property_ids = 'At least one property is required';
      }
      if (this.form.booking_property_type_id === 2 && !this.selectedProperty) {
        this.errors.selected_property = true;
        this.errorMessages.selected_property = 'A property must be selected to choose rooms';
      }
      if (this.form.booking_property_type_id === 2 && !this.form.room_ids.length) {
        this.errors.room_ids = true;
        this.errorMessages.room_ids = 'At least one room is required';
      }
      if (!this.form.client_id) {
        this.errors.client_id = true;
        this.errorMessages.client_id = 'Client is required';
      }
      if (!this.form.appointment_type_id) {
        this.errors.appointment_type_id = true;
        this.errorMessages.appointment_type_id = 'Appointment type is required';
      }
      if (!this.form.date) {
        this.errors.date = true;
        this.errorMessages.date = 'Date is required';
        // Scroll to date input
        if (this.dateInput) {
          (this.dateInput as any).$el.scrollIntoView({ behavior: 'smooth' });
        }
      }
      if (this.form.duration === null || this.form.duration < 1) {
        this.errors.duration = true;
        this.errorMessages.duration = 'Duration must be at least 1 minute';
      }
      if (!this.form.time_slot) {
        this.errors.time_slot = true;
        this.errorMessages.time_slot = 'Time slot is required';
      }
      if (!this.form.recurrence) {
        this.errors.recurrence = true;
        this.errorMessages.recurrence = 'Recurrence is required';
      }
      if (!this.form.status) {
        this.errors.status = true;
        this.errorMessages.status = 'Status is required';
      }

      if (Object.values(this.errors).some((error) => error)) {
        Swal.fire({
          title: 'Validation Error',
          text: 'Please correct the errors in the form.',
          icon: 'warning',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.isSubmitting = false;
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: FormData = {
          booking_property_type_id: this.form.booking_property_type_id ?? 1,
          property_ids: this.form.property_ids,
          room_ids: this.form.room_ids,
          client_id: this.form.client_id ?? 0,
          appointment_type_id: this.form.appointment_type_id ?? 0,
          date: this.form.date,
          duration: this.form.duration,
          time_slot: this.form.time_slot,
          recurrence: this.form.recurrence,
          status: this.form.status,
          notes: this.form.notes,
        };

        console.log('Emitting submit with payload:', payload);
        this.$emit('submit', payload);
        this.$emit('close');
        this.resetForm();
      } catch (error: any) {
        console.error('Submission error:', error.message);
        this.errorMessages.booking_property_type_id = 'An unexpected error occurred';
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
        this.isSubmitting = false;
      }
    },
    resetForm() {
      const today = new Date().toISOString().split('T')[0];
      this.form = {
        booking_property_type_id: null,
        property_ids: [],
        room_ids: [],
        client_id: null,
        appointment_type_id: null,
        date: today,
        duration: 30,
        time_slot: '',
        recurrence: 'none',
        status: 'pending',
        notes: '',
      };
      this.selectedProperty = null;
      this.rooms = [];
      this.errors = {
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
      };
      this.errorMessages = {
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