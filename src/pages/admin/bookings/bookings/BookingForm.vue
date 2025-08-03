<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Booking') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaSelect
            v-model="form.property_id"
            label="Property"
            placeholder="Select property"
            :options="properties"
            :error="!!errorMessages.property_id"
            :error-messages="errorMessages.property_id ? [errorMessages.property_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingProperties"
            :disabled="isSubmitting"
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
            label="Duration"
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
import { defineComponent } from 'vue'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'BookingForm',
  emits: {
    close: null,
    submit: null,
  },
  data() {
    return {
      form: {
        property_id: null,
        client_id: null,
        appointment_type_id: null,
        date: '',
        duration: null,
        time_slot: '',
        recurrence: 'none',
        status: 'pending',
      } as FormData,
      errors: {
        property_id: false,
        client_id: false,
        appointment_type_id: false,
        date: false,
        duration: false,
        time_slot: false,
        recurrence: false,
        status: false,
      } as Errors,
      errorMessages: {
        property_id: '',
        client_id: '',
        appointment_type_id: '',
        date: '',
        duration: '',
        time_slot: '',
        recurrence: '',
        status: '',
      } as ErrorMessages,
      properties: [] as Option[],
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
      loadingProperties: false,
      loadingUsers: false,
      loadingAppointmentTypes: false,
      isSubmitting: false,
    }
  },
  mounted() {
    this.fetchProperties()
    this.fetchUsers()
    this.fetchAppointmentTypes()
  },
  methods: {
    async fetchProperties() {
      this.loadingProperties = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          requiresAuth: true,
        })
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }))
        } else {
          this.errors.property_id = true
          this.errorMessages.property_id = response.data?.message || 'Failed to fetch properties.'
          Swal.fire({
            title: 'Error!',
            text: this.errorMessages.property_id,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Failed to fetch properties:', error.message)
        this.errors.property_id = true
        this.errorMessages.property_id = 'Failed to load properties'
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.property_id,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingProperties = false
      }
    },
    async fetchUsers() {
      this.loadingUsers = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'GET',
          requiresAuth: true,
        })
        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: user.id,
            text: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'None',
          }))
        } else {
          this.errors.client_id = true
          this.errorMessages.client_id = response.data?.message || 'Failed to fetch clients.'
          Swal.fire({
            title: 'Error',
            text: this.errorMessages.client_id,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Failed to fetch users:', error.message)
        this.errors.client_id = true
        this.errorMessages.client_id = 'Failed to load clients'
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.client_id,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingUsers = false
      }
    },
    async fetchAppointmentTypes() {
      this.loadingAppointmentTypes = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types`,
          method: 'get',
          requiresAuth: true,
        })
        if (response.status === 200) {
          this.appointmentTypes = response.data.data.map((type: any) => ({
            value: type.id,
            text: type.name || `Type ${type.id}`,
          }))
        } else {
          this.errors.appointment_type_id = true
          this.errorMessages.appointment_type_id = response.data?.message || 'Failed to fetch appointment types.'
          Swal.fire({
            title: 'Error!',
            text: this.errorMessages.appointment_type_id,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Failed to fetch appointment types:', error.message)
        this.errors.appointment_type_id = true
        this.errorMessages.appointment_type_id = 'Failed to load appointment types'
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.appointment_type_id,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingAppointmentTypes = false
      }
    },
    async submitForm() {
      this.errors = {
        property_id: false,
        client_id: false,
        appointment_type_id: false,
        date: false,
        duration: false,
        time_slot: false,
        recurrence: false,
        status: false,
      }
      this.errorMessages = {
        property_id: '',
        client_id: '',
        appointment_type_id: '',
        date: '',
        duration: '',
        time_slot: '',
        recurrence: '',
        status: '',
      }

      if (!this.form.property_id) {
        this.errors.property_id = true
        this.errorMessages.property_id = 'Property is required'
      }
      if (!this.form.client_id) {
        this.errors.client_id = true
        this.errorMessages.client_id = 'Client is required'
      }
      if (!this.form.appointment_type_id) {
        this.errors.appointment_type_id = true
        this.errorMessages.appointment_type_id = 'Appointment type is required'
      }
      if (!this.form.date) {
        this.errors.date = true
        this.errorMessages.date = 'Date is required'
      }
      if (this.form.duration === null || this.form.duration < 15) {
        this.errors.duration = true
        this.errorMessages.duration = 'Duration must be at least 15 minutes'
      }
      if (!this.form.time_slot) {
        this.errors.time_slot = true
        this.errorMessages.time_slot = 'Time slot is required'
      }
      if (!this.form.recurrence) {
        this.errors.recurrence = true
        this.errorMessages.recurrence = 'Recurrence is required'
      }
      if (!this.form.status) {
        this.errors.status = true
        this.errorMessages.status = 'Status is required'
      }

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const payload = {
          property_id: this.form.property_id,
          client_id: this.form.client_id,
          appointment_type_id: this.form.appointment_type_id,
          date: this.form.date,
          duration: this.form.duration,
          time_slot: this.form.time_slot,
          recurrence: this.form.recurrence,
          status: this.form.status,
        }

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
          method: 'post',
          requiresAuth: true,
          data: payload,
        })

        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: 'Booking added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
          this.$emit('submit')
          this.$emit('close')
        } else {
          throw new Error(response.data?.message || 'Failed to add booking')
        }
      } catch (error: any) {
        console.error('Submission error:', error.message)
        if (error.response?.data?.errors) {
          Object.entries(error.response.data.errors).forEach(([key, value]) => {
            if (key in this.errors) {
              this.errors[key as keyof Errors] = true
              this.errorMessages[key as keyof ErrorMessages] = Array.isArray(value) ? value[0] : value
            }
          })
        } else {
          this.errors.property_id = true
          this.errorMessages.property_id = error.response?.data?.message || 'An unexpected error occurred'
        }
        Swal.fire({
          title: 'Error!',
          text: this.errorMessages.property_id || 'An unexpected error occurred',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.isSubmitting = false
      }
    },
    resetForm() {
      this.form = {
        property_id: null,
        client_id: null,
        appointment_type_id: null,
        date: '',
        duration: null,
        time_slot: '',
        recurrence: 'none',
        status: 'pending',
      }
      this.errors = {
        property_id: false,
        client_id: false,
        appointment_type_id: false,
        date: false,
        duration: false,
        time_slot: false,
        recurrence: false,
        status: false,
      }
      this.errorMessages = {
        property_id: '',
        client_id: '',
        appointment_type_id: '',
        date: '',
        duration: '',
        time_slot: '',
        recurrence: '',
        status: '',
      }
      this.$emit('close')
    },
  },
})

interface FormData {
  property_id: number | null
  client_id: number | null
  appointment_type_id: number | null
  date: string
  duration: number | null
  time_slot: string
  recurrence: string
  status: string
}

interface Errors {
  property_id: boolean
  client_id: boolean
  appointment_type_id: boolean
  date: boolean
  duration: boolean
  time_slot: boolean
  recurrence: boolean
  status: boolean
}

interface ErrorMessages {
  property_id: string
  client_id: string
  appointment_type_id: string
  date: string
  duration: string
  time_slot: string
  recurrence: string
  status: string
}

interface Option {
  value: number | string
  text: string
}
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