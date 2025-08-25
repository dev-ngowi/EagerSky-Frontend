<template>
  <section id="booking" class="booking-section section">
    <div class="container" data-aos="fade-up">
      <div class="section-title text-center">
        <div class="title-wrapper">
          <span class="subtitle-badge" >🏨 ROOM BOOKING</span><br>
          <span class="main-title">{{ preSelectedRoomNumber || 'N/A' }}</span>
          <div class="title-underline"></div>
          <p class="section-description">Complete the details to book your selected room.</p>
        </div>
      </div>

      <div v-if="isLoading && !showError" class="loading text-center p-6">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <button 
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="retryLoad"
            aria-label="Retry loading booking data"
          >
            Try Again
          </button>
        </div>
      </div>

      <div v-else class="form-container">
        <div class="form-header">
          <div class="form-icon">
            <i class="bi bi-calendar-check"></i>
          </div>
          <h2>Book Your Room</h2>
          <p class="form-subtitle">Fill in the details below to secure your room booking</p>
        </div>

        <div v-if="errors['general']" class="error-message text-center p-4">
          <i class="bi bi-exclamation-circle text-2xl text-red-500 mr-2"></i>
          <span>{{ errors['general'] }}</span>
        </div>

        <form @submit.prevent="handleBooking" class="booking-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="appointment-type" class="form-label">
                <i class="bi bi-calendar2-event"></i>
                Booking Type
              </label>
              <div class="select-wrapper">
                <select 
                  id="appointment-type"
                  class="form-select" 
                  v-model="bookingForm.appointment_type_id" 
                  required
                  :class="{ 'error': errors['appointment_type_id'] }"
                  tabindex="0"
                  aria-describedby="appointment-type-error"
                >
                  <option value="" disabled>Choose booking type</option>
                  <option v-for="type in appointmentTypes" :key="type.id" :value="type.id">
                    {{ type.name }}
                  </option>
                </select>
                <i class="bi bi-chevron-down select-arrow"></i>
              </div>
              <div class="error-message" v-if="errors['appointment_type_id']" id="appointment-type-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['appointment_type_id'] }}
              </div>
            </div>

            <div class="form-group">
              <label for="room-number" class="form-label">
                <i class="bi bi-door-open"></i>
                Room Number
              </label>
              <input 
                id="room-number"
                class="form-control" 
                :value="preSelectedRoomNumber || 'N/A'"
                readonly
                :class="{ 'error': errors['room_id'] }"
                aria-describedby="room-id-error"
              >
              <div class="error-message" v-if="errors['room_id']" id="room-id-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['room_id'] }}
              </div>
            </div>

            <div class="form-group">
              <label for="date" class="form-label">
                <i class="bi bi-calendar3"></i>
                Check-in Date
              </label>
              <input 
                type="date" 
                id="date"
                class="form-control" 
                v-model="bookingForm.date" 
                required
                :class="{ 'error': errors['date'] }"
                :min="new Date().toISOString().split('T')[0]"
                aria-describedby="date-error"
              >
              <div class="error-message" v-if="errors['date']" id="date-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['date'] }}
              </div>
            </div>

            <div class="form-group">
              <label for="time-slot" class="form-label">
                <i class="bi bi-clock"></i>
                Check-in Time
              </label>
              <input 
                type="time" 
                id="time-slot"
                class="form-control" 
                v-model="bookingForm.time_slot" 
                required
                :class="{ 'error': errors['time_slot'] }"
                aria-describedby="time-slot-error"
              >
              <div class="error-message" v-if="errors['time_slot']" id="time-slot-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['time_slot'] }}
              </div>
            </div>

            <div class="form-group">
              <label for="duration" class="form-label">
                <i class="bi bi-calendar2-range"></i>
                Stay Duration
              </label>
              <div class="duration-wrapper">
                <input 
                  type="number" 
                  id="duration"
                  class="form-control" 
                  v-model="bookingForm.duration" 
                  min="15" 
                  max="30"
                  required
                  :class="{ 'error': errors['duration'] }"
                  aria-describedby="duration-error"
                >
                <span class="duration-unit">Min</span>
              </div>
              <div class="error-message" v-if="errors['duration']" id="duration-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['duration'] }}
              </div>
            </div>

            <div class="form-group">
              <label for="property-id" class="form-label">
                <i class="bi bi-building"></i>
                Property ID
              </label>
              <input 
                type="text" 
                id="property-id"
                class="form-control" 
                v-model="bookingForm.property_id" 
                required
                readonly
                :class="{ 'error': errors['property_id'] }"
                aria-describedby="property-id-error"
              >
              <div class="error-message" v-if="errors['property_id']" id="property-id-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['property_id'] }}
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              class="submit-btn"
              :disabled="isLoading"
              aria-label="Submit room booking"
            >
              <div class="btn-content">
                <i class="bi bi-bookmark-check"></i>
                <span>{{ isLoading ? 'Processing...' : 'Book Room Now' }}</span>
              </div>
              <div class="btn-bg"></div>
            </button>
            <button 
              type="button" 
              class="reset-btn"
              :disabled="isLoading"
              @click="confirmReset"
              aria-label="Reset booking form"
            >
              <div class="btn-content">
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Reset Form</span>
              </div>
              <div class="btn-bg"></div>
            </button>
          </div>
        </form>

        <div class="form-footer">
          <div class="security-info">
            <i class="bi bi-shield-check"></i>
            <span>Your information is secure and protected</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import makeRequest from '../../services/makeRequest';
import AOS from 'aos';
import Swal from 'sweetalert2';

interface AppointmentType {
  id: string;
  name: string;
}

interface Room {
  id: string;
  room_number: string;
}

interface BookingForm {
  booking_property_type_id: string;
  property_id: string;
  room_id: string | null;
  appointment_type_id: string;
  date: string;
  time_slot: string;
  duration: number;
  status: string;
}

const router = useRouter();
const route = useRoute();
const propertyId = ref(route.params.propertyId as string);
const preSelectedRoomNumber = ref(route.params.roomNumber as string | undefined);
const isLoading = ref(false);
const showError = ref(false);
const errorMessage = ref('Unable to load booking data. Please try again later.');
const errors = ref<{ [key: string]: string }>({});
const availableRooms = ref<Room[]>([]);

const getInitialFormData = (): BookingForm => ({
  booking_property_type_id: '2', // Fixed to room bookings
  property_id: propertyId.value,
  room_id: null,
  appointment_type_id: '',
  date: '',
  time_slot: '',
  duration: 15,
  status: 'pending',
});

const bookingForm = ref<BookingForm>(getInitialFormData());
const appointmentTypes = ref<AppointmentType[]>([]);
const lastSubmitted = ref<{ date: string; time_slot: string } | null>(null);

const fallbackAppointmentTypes: AppointmentType[] = [
  { id: '1', name: 'Standard Stay' },
  { id: '2', name: 'Extended Stay' },
  { id: '3', name: 'Business Travel' },
];

const clearForm = () => {
  bookingForm.value = {
    ...getInitialFormData(),
    room_id: bookingForm.value.room_id, // Preserve room_id
    property_id: bookingForm.value.property_id, // Preserve property_id
  };
  errors.value = {};
  lastSubmitted.value = null;
};

const showSwal = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info') => {
  Swal.fire({
    title,
    text,
    icon,
    position: 'top-end',
    toast: true,
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    background: icon === 'success' ? 'rgba(16, 185, 129, 0.95)' :
                icon === 'error' ? 'rgba(239, 68, 68, 0.95)' :
                icon === 'warning' ? 'rgba(245, 158, 11, 0.95)' :
                'rgba(59, 130, 246, 0.95)',
    color: '#fff',
    didOpen: () => {
      const toast = Swal.getPopup();
      if (toast) {
        toast.style.borderLeft = `4px solid ${icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6'}`;
        toast.style.borderRadius = '12px';
        toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
        toast.style.backdropFilter = 'blur(10px)';
      }
    },
  });
};

const fetchAvailableRooms = async () => {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms?property_id=${propertyId.value}&is_available=true`,
      requiresAuth: true,
    });
    if (response.data && Array.isArray(response.data.data)) {
      availableRooms.value = response.data.data.map((room: any) => ({
        id: String(room.id),
        room_number: room.room_number,
      }));
      if (preSelectedRoomNumber.value) {
        const selectedRoom = availableRooms.value.find(room => room.room_number === preSelectedRoomNumber.value);
        if (selectedRoom) {
          bookingForm.value.room_id = selectedRoom.id;
        } else {
          showSwal('Room Unavailable', `Room ${preSelectedRoomNumber.value} is not available or does not exist.`, 'error');
          errors.value['room_id'] = `Room ${preSelectedRoomNumber.value} is not available.`;
          showError.value = true;
          errorMessage.value = `Room ${preSelectedRoomNumber.value} is not available. Please select another room.`;
        }
      }
      if (availableRooms.value.length === 0) {
        showSwal('No Rooms Available', 'No available rooms found for this property.', 'warning');
      }
    } else {
      showSwal('Invalid Data', 'Invalid room data received.', 'error');
    }
  } catch (error: any) {
    console.error('Failed to fetch rooms:', error);
    showSwal('Error', 'Failed to load available rooms.', 'error');
    errors.value['room_id'] = 'Failed to load room data.';
    showError.value = true;
    errorMessage.value = 'Failed to load room data. Please try again.';
  }
};

const fetchAppointmentTypes = async (retries = 3, delay = 1000) => {
  isLoading.value = true;
  showError.value = false;

  if (!import.meta.env.VITE_APP_API_BASE_URL || !import.meta.env.VITE_APP_APPOINTMENT_TYPES_URL) {
    console.error('Missing environment variables');
    appointmentTypes.value = fallbackAppointmentTypes;
    showError.value = true;
    errorMessage.value = 'Configuration error. Please try again later.';
    isLoading.value = false;
    showSwal('Configuration Error', 'Configuration error. Please try again later.', 'error');
    return;
  }

  const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_APPOINTMENT_TYPES_URL}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await makeRequest({
        method: 'GET',
        url,
        requiresAuth: false,
      });
      if (response.data && Array.isArray(response.data.data)) {
        appointmentTypes.value = response.data.data.map((type: any) => ({
          id: String(type.id),
          name: type.name || 'Unnamed Type',
        }));
        if (appointmentTypes.value.length === 0) {
          console.warn('API returned empty data array. Using fallback appointment types.');
          appointmentTypes.value = fallbackAppointmentTypes;
          showSwal('No Appointment Types', 'No appointment types found. Using default options.', 'warning');
        }
      } else {
        console.warn('Invalid API response structure. Using fallback appointment types.');
        appointmentTypes.value = fallbackAppointmentTypes;
        showSwal('Invalid Response', 'Invalid response structure. Using default options.', 'warning');
      }
      isLoading.value = false;
      return;
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed to fetch appointment types:`, error);
      if (attempt === retries) {
        appointmentTypes.value = fallbackAppointmentTypes;
        showError.value = true;
        errorMessage.value = error.message.includes('Network')
          ? 'Network issue. Please check your connection and try again.'
          : 'Failed to load appointment types. Using default options.';
        showSwal('Error', errorMessage.value, 'error');
      } else {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  isLoading.value = false;
};

const parseAndDisplayErrors = (errorData: any, fallbackMessage: string) => {
  errors.value = {};
  if (errorData?.errors) {
    Object.entries(errorData.errors).forEach(([key, errArray]: [string, any]) => {
      const message = Array.isArray(errArray) ? errArray.join('; ') : String(errArray);
      errors.value[key] = message;
      showSwal('Validation Error', message, 'error');
    });
  } else if (errorData?.message) {
    const generalMessage = errorData.message;
    if (generalMessage.includes('not available at the requested time slot')) {
      errors.value['time_slot'] = generalMessage;
      showSwal('Time Slot Unavailable', generalMessage, 'error');
    } else {
      errors.value['general'] = generalMessage;
      showSwal('Error', generalMessage, 'error');
    }
  } else {
    errors.value['general'] = fallbackMessage;
    showSwal('Error', fallbackMessage, 'error');
  }
};

const handleBooking = async () => {
  errors.value = {};

  const clientErrors: { [key: string]: string } = {};
  if (!bookingForm.value.booking_property_type_id) clientErrors['booking_property_type_id'] = 'Booking type ID is required';
  if (!bookingForm.value.appointment_type_id) clientErrors['appointment_type_id'] = 'Please select a booking type';
  if (!bookingForm.value.date) clientErrors['date'] = 'Please select a check-in date';
  if (!bookingForm.value.time_slot) clientErrors['time_slot'] = 'Please select a check-in time';
  if (bookingForm.value.duration < 15 || bookingForm.value.duration > 30) clientErrors['duration'] = 'Duration must be between 15 and 30 days';
  if (!bookingForm.value.property_id) clientErrors['property_id'] = 'Property ID is required';
  if (bookingForm.value.booking_property_type_id === '2' && !bookingForm.value.room_id) clientErrors['room_id'] = 'Room selection is required';
  if (!bookingForm.value.status) clientErrors['status'] = 'Status is required';

  if (Object.keys(clientErrors).length > 0) {
    errors.value = clientErrors;
    Object.values(clientErrors).forEach(err => showSwal('Validation Error', err, 'error'));
    return;
  }

  isLoading.value = true;

  if (
    lastSubmitted.value &&
    lastSubmitted.value.date === bookingForm.value.date &&
    lastSubmitted.value.time_slot === bookingForm.value.time_slot
  ) {
    const confirm = await Swal.fire({
      title: 'Duplicate Time Slot',
      text: 'You are trying to book the same time slot again. Continue?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, continue',
      cancelButtonText: 'Change time slot',
      position: 'top-end',
      toast: true,
      timer: 10000,
      timerProgressBar: true,
      background: 'rgba(245, 158, 11, 0.95)',
      color: '#fff',
      didOpen: () => {
        const toast = Swal.getPopup();
        if (toast) {
          toast.style.borderLeft = '4px solid #f59e0b';
          toast.style.borderRadius = '12px';
          toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
          toast.style.backdropFilter = 'blur(10px)';
        }
      },
    });
    if (!confirm.isConfirmed) {
      isLoading.value = false;
      return;
    }
  }

  try {
    const response = await makeRequest({
      method: 'POST',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/bookings`,
      data: bookingForm.value,
      requiresAuth: true,
    });

    if (response.data.success) {
      lastSubmitted.value = {
        date: bookingForm.value.date,
        time_slot: bookingForm.value.time_slot,
      };
      showSwal('Success', response.data.message || 'Your room booking has been submitted successfully. We\'ll contact you soon.', 'success');
      clearForm();
      setTimeout(() => {
        router.push('/my-account');
      }, 1500);
    } else {
      parseAndDisplayErrors(response.data, 'Validation error occurred during room booking.');
    }
  } catch (error: any) {
    console.error('Room booking submission error:', error);
    const fallback = error.message.includes('Network')
      ? 'Network issue. Please check your connection.'
      : 'An unexpected error occurred during room booking.';
    parseAndDisplayErrors(error.response?.data, fallback);
  } finally {
    isLoading.value = false;
  }
};

const confirmReset = async () => {
  const confirm = await Swal.fire({
    title: 'Reset Form',
    text: 'Are you sure you want to reset all fields? This action cannot be undone.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#ef4444',
    confirmButtonText: 'Yes, reset',
    cancelButtonText: 'Cancel',
    position: 'top-end',
    toast: true,
    timer: 10000,
    timerProgressBar: true,
    background: 'rgba(59, 130, 246, 0.95)',
    color: '#fff',
    didOpen: () => {
      const toast = Swal.getPopup();
      if (toast) {
        toast.style.borderLeft = '4px solid #3b82f6';
        toast.style.borderRadius = '12px';
        toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
        toast.style.backdropFilter = 'blur(10px)';
      }
    },
  });

  if (confirm.isConfirmed) {
    clearForm();
    showSwal('Form Reset', 'Form has been reset.', 'info');
  }
};

const retryLoad = () => {
  fetchAppointmentTypes();
  fetchAvailableRooms();
};

onMounted(() => {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100,
    });
  }
  fetchAppointmentTypes();
  fetchAvailableRooms();
});
</script>

<style lang="scss" scoped>
$primary-color: #3b82f6;
$primary-dark: #2563eb;
$accent-color: #f59e0b;
$dark-color: #1f2937;
$white: #ffffff;
$gray-50: #f9fafb;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-300: #d1d5db;
$gray-400: #9ca3af;
$gray-500: #6b7280;
$gray-600: #4b5563;
$gray-700: #374151;
$gray-800: #1f2937;
$gray-900: #111827;
$success-color: #10b981;
$error-color: #ef4444;
$warning-color: #f59e0b;
$blue-50: #eff6ff;
$indigo-100: #e0e7ff;

.booking-section {
  padding: clamp(80px, 12vw, 120px) 0;
  background: linear-gradient(135deg, $blue-50 0%, $indigo-100 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
  width: 100%;
}

.section-title {
  margin-bottom: clamp(60px, 10vw, 80px);
  
  .title-wrapper {
    margin: 10px;
  .subtitle-badge {
    display: inline-flex;
    align-items: center;
    background: linear-gradient(135deg, $accent-color, #ea580c);
    color: $white;
    padding: 8px 20px 4px;
    border-radius: 50px;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 20px; /* Adjust this value for desired spacing */
    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
    animation: float 3s ease-in-out infinite;
  }
  
    
    .main-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      font-weight: 800;
      color: $dark-color;
      margin-bottom: 15px;
      background: linear-gradient(135deg, $dark-color, $gray-600);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .title-underline {
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, $primary-color, $accent-color);
      margin: 0 auto 20px;
      border-radius: 2px;
    }
    
    .section-description {
      font-size: clamp(1.1rem, 2.5vw, 1.3rem);
      color: $gray-600;
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.6;
    }
    /* Add spacing around the title wrapper */
    margin-top: 40px; /* Adjust this value for top spacing */
    margin-bottom: 40px; /* Adjust this value for bottom spacing */
  }
}

.form-container {
  background: $white;
  border-radius: 24px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, $primary-color, $accent-color);
  }
}

.form-header {
  text-align: center;
  padding: 40px 40px 20px;
  background: linear-gradient(135deg, $gray-50, $white);
  
  .form-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    
    i {
      font-size: 2rem;
      color: $white;
    }
  }
  
  h2 {
    font-size: clamp(1.8rem, 4vw, 2.2rem);
    font-weight: 700;
    color: $gray-900;
    margin-bottom: 8px;
  }
  
  .form-subtitle {
    color: $gray-600;
    font-size: 1rem;
    margin: 0;
  }
}

.booking-form {
  padding: 20px 40px 40px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.form-group {
  position: relative;
  
  &.full-width {
    grid-column: 1 / -1;
  }
  
  .form-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: $gray-700;
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 8px;
    
    i {
      color: $primary-color;
      font-size: 1rem;
    }
  }
  
  .form-control,
  .form-select {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid $gray-200;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: $white;
    
    &:focus {
      outline: none;
      border-color: $primary-color;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }
    
    &.error {
      border-color: $error-color;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    &[readonly] {
      background: $gray-100;
      cursor: not-allowed;
    }
    
    &::placeholder {
      color: $gray-400;
    }
  }
  
  textarea.form-control {
    resize: vertical;
    min-height: 100px;
  }
}

.select-wrapper {
  position: relative;
  
  .form-select {
    appearance: none;
    cursor: pointer;
    padding-right: 45px;
  }
  
  .select-arrow {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: $gray-400;
    pointer-events: none;
    transition: transform 0.3s ease;
  }
  
  &:hover .select-arrow {
    transform: translateY(-50%) rotate(180deg);
  }
}

.duration-wrapper {
  position: relative;
  
  .form-control {
    padding-right: 80px;
  }
  
  .duration-unit {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: $gray-500;
    font-size: 0.9rem;
    font-weight: 500;
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  color: $error-color;
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: 6px;
  
  i {
    font-size: 0.8rem;
  }
}

.form-actions {
  margin-top: 32px;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.submit-btn,
.reset-btn {
  position: relative;
  background: linear-gradient(135deg, $primary-color, $primary-dark);
  color: $white;
  border: none;
  padding: 16px 40px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(59, 130, 246, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .btn-content {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 2;
    
    i {
      font-size: 1.2rem;
    }
  }
  
  .btn-bg {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, $primary-dark, #1e40af);
    transition: left 0.3s ease;
  }
  
  &:hover .btn-bg {
    left: 0;
  }
}

.reset-btn {
  background: linear-gradient(135deg, $gray-500, $gray-600);
  box-shadow: 0 8px 25px rgba(107, 114, 128, 0.3);
  
  .btn-bg {
    background: linear-gradient(135deg, $gray-600, $gray-700);
  }
}

.form-footer {
  padding: 20px 40px;
  background: $gray-50;
  border-top: 1px solid $gray-100;
  
  .security-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: $gray-600;
    font-size: 0.9rem;
    
    i {
      color: $success-color;
      font-size: 1rem;
    }
  }
}

.loading {
  text-align: center;
  padding: 60px 20px;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid $gray-200;
    border-top-color: $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  p {
    color: $gray-600;
    font-size: 1.1rem;
    font-weight: 500;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@media (max-width: 768px) {
  .booking-section {
    padding: clamp(40px, 8vw, 60px) 0;
  }
  
  .container {
    padding: 0 1rem;
  }
  
  .form-header,
  .booking-form {
    padding-left: 24px;
    padding-right: 24px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .submit-btn,
  .reset-btn {
    width: 100%;
    padding: 16px 20px;
  }
  
  .form-footer {
    padding: 20px 24px;
  }
}

@media (max-width: 480px) {
  .form-header,
  .booking-form,
  .form-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  
  .form-header .form-icon {
    width: 60px;
    height: 60px;
    
    i {
      font-size: 1.5rem;
    }
  }
}
</style>