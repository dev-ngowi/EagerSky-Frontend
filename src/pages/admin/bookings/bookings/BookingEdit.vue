<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Booking') }}</h2>
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
            label="Duration (minutes)"
            placeholder="Enter duration"
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
        <VaButton color="secondary" :disabled="isSubmitting" @click="emit('close')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vuestic-ui'
import makeRequest from '../../../../services/makeRequest'

const props = defineProps<{
  booking: Booking
}>()

const emit = defineEmits<{
  close: []
  submit: [FormData & { id: number }]
}>()

const { init: toast } = useToast()

const form = ref<FormData>({
  property_id: props.booking.property_id ? Number(props.booking.property_id) : null,
  client_id: props.booking.client_id ? Number(props.booking.client_id) : null,
  appointment_type_id: props.booking.appointment_type_id ? Number(props.booking.appointment_type_id) : null,
  date: (() => {
    try {
      const dateStr = props.booking.date
      if (!dateStr) return ''
      const parsedDate = new Date(dateStr)
      return isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString().split('T')[0]
    } catch (error) {
      console.error('Error parsing date:', error)
      return ''
    }
  })(),
  duration: props.booking.duration ? Number(props.booking.duration) : null,
  time_slot: (() => {
    try {
      const timeStr = props.booking.time_slot
      if (!timeStr) return ''
      return timeStr.match(/^\d{2}:\d{2}$/) ? timeStr : new Date(timeStr).toISOString().slice(11, 16)
    } catch (error) {
      console.error('Error parsing time_slot:', error)
      return ''
    }
  })(),
  recurrence: props.booking.recurrence || 'none',
  status: props.booking.status || 'pending',
})

const errors = ref<Errors>({
  property_id: false,
  client_id: false,
  appointment_type_id: false,
  date: false,
  duration: false,
  time_slot: false,
  recurrence: false,
  status: false,
})

const errorMessages = ref<ErrorMessages>({
  property_id: '',
  client_id: '',
  appointment_type_id: '',
  date: '',
  duration: '',
  time_slot: '',
  recurrence: '',
  status: '',
})

const properties = ref<Option[]>([])
const users = ref<Option[]>([])
const appointmentTypes = ref<Option[]>([])
const recurrenceOptions = [
  { value: 'none', text: 'None' },
  { value: 'daily', text: 'Daily' },
  { value: 'weekly', text: 'Weekly' },
]
const statusOptions = [
  { value: 'pending', text: 'Pending' },
  { value: 'confirmed', text: 'Confirmed' },
  { value: 'cancelled', text: 'Cancelled' },
]
const loadingProperties = ref(false)
const loadingUsers = ref(false)
const loadingAppointmentTypes = ref(false)
const isSubmitting = ref(false)

async function fetchProperties() {
  loadingProperties.value = true
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
      method: 'get',
      requiresAuth: true,
    })
    if (response.status === 200) {
      properties.value = response.data.data.map((property: any) => ({
        value: Number(property.id),
        text: property.title || `Property ${property.id}`,
      }))
    } else {
      errorMessages.value.property_id = response.data?.message || 'Failed to fetch properties.'
      errors.value.property_id = true
      toast({ message: errorMessages.value.property_id, color: 'danger' })
    }
  } catch (error: any) {
    console.error('Failed to fetch properties:', error.message, error.response?.data)
    errorMessages.value.property_id = error.response?.data?.message || 'Failed to load properties'
    errors.value.property_id = true
    toast({ message: errorMessages.value.property_id, color: 'danger' })
  } finally {
    loadingProperties.value = false
  }
}

async function fetchUsers() {
  loadingUsers.value = true
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
      method: 'get',
      requiresAuth: true,
    })
    if (response.status === 200) {
      users.value = response.data.data.map((user: any) => ({
        value: Number(user.id),
        text: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'None',
      }))
    } else {
      errorMessages.value.client_id = response.data?.message || 'Failed to fetch clients.'
      errors.value.client_id = true
      toast({ message: errorMessages.value.client_id, color: 'danger' })
    }
  } catch (error: any) {
    console.error('Failed to fetch users:', error.message, error.response?.data)
    errorMessages.value.client_id = error.response?.data?.message || 'Failed to load clients'
    errors.value.client_id = true
    toast({ message: errorMessages.value.client_id, color: 'danger' })
  } finally {
    loadingUsers.value = false
  }
}

async function fetchAppointmentTypes() {
  loadingAppointmentTypes.value = true
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types`,
      method: 'get',
      requiresAuth: true,
    })
    if (response.status === 200) {
      appointmentTypes.value = response.data.data.map((type: any) => ({
        value: Number(type.id),
        text: type.name || `Type ${type.id}`,
      }))
    } else {
      errorMessages.value.appointment_type_id = response.data?.message || 'Failed to fetch appointment types.'
      errors.value.appointment_type_id = true
      toast({ message: errorMessages.value.appointment_type_id, color: 'danger' })
    }
  } catch (error: any) {
    console.error('Failed to fetch appointment types:', error.message, error.response?.data)
    errorMessages.value.appointment_type_id = error.response?.data?.message || 'Failed to load appointment types'
    errors.value.appointment_type_id = true
    toast({ message: errorMessages.value.appointment_type_id, color: 'danger' })
  } finally {
    loadingAppointmentTypes.value = false
  }
}

async function submitForm() {
  errors.value = {
    property_id: false,
    client_id: false,
    appointment_type_id: false,
    date: false,
    duration: false,
    time_slot: false,
    recurrence: false,
    status: false,
  }
  errorMessages.value = {
    property_id: '',
    client_id: '',
    appointment_type_id: '',
    date: '',
    duration: '',
    time_slot: '',
    recurrence: '',
    status: '',
  }

  if (!form.value.property_id) {
    errors.value.property_id = true
    errorMessages.value.property_id = 'Property is required'
  }
  if (!form.value.client_id) {
    errors.value.client_id = true
    errorMessages.value.client_id = 'Client is required'
  }
  if (!form.value.appointment_type_id) {
    errors.value.appointment_type_id = true
    errorMessages.value.appointment_type_id = 'Appointment type is required'
  }
  if (!form.value.date) {
    errors.value.date = true
    errorMessages.value.date = 'Date is required'
  }
  if (form.value.duration === null || form.value.duration < 15) {
    errors.value.duration = true
    errorMessages.value.duration = 'Duration must be at least 15 minutes'
  }
  if (!form.value.time_slot) {
    errors.value.time_slot = true
    errorMessages.value.time_slot = 'Time slot is required'
  }
  if (!form.value.recurrence) {
    errors.value.recurrence = true
    errorMessages.value.recurrence = 'Recurrence is required'
  }
  if (!form.value.status) {
    errors.value.status = true
    errorMessages.value.status = 'Status is required'
  }

  if (Object.values(errors.value).some((error) => error)) {
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      id: props.booking.id,
      property_id: form.value.property_id,
      client_id: form.value.client_id,
      appointment_type_id: form.value.appointment_type_id,
      date: form.value.date,
      duration: form.value.duration,
      time_slot: form.value.time_slot,
      recurrence: form.value.recurrence,
      status: form.value.status,
    }
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${props.booking.id}`,
      method: 'put',
      requiresAuth: true,
      data: payload,
    })
    if (response.status === 200) {
      emit('submit', payload)
      toast({ message: 'Booking updated successfully.', color: 'success' })
    } else {
      throw new Error(response.data?.message || 'Failed to update booking')
    }
  } catch (error: any) {
    console.error('Submission error:', error.message, error.response?.data)
    const errorMessage = error.response?.data?.message || 'An unexpected error occurred'
    if (error.response?.data?.errors) {
      Object.entries(error.response.data.errors).forEach(([key, value]) => {
        if (key in errors.value) {
          errors.value[key as keyof Errors] = true
          errorMessages.value[key as keyof ErrorMessages] = Array.isArray(value) ? value[0] : value
        }
      })
    } else {
      errors.value.property_id = true
      errorMessages.value.property_id = errorMessage
    }
    toast({ message: errorMessage, color: 'danger' })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchProperties()
  fetchUsers()
  fetchAppointmentTypes()
})

interface Booking {
  id: number
  property_id: number
  property_title: string
  client_id: number
  client_fullname: string
  appointment_type_id: number
  appointment_type_name: string
  date: string
  duration: number
  time_slot: string
  recurrence: string
  status: string
  created_at: string
  updated_at: string
}

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