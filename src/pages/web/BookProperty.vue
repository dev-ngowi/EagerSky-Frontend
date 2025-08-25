<template>
  <section id="booking" class="booking-section section">
    <div class="container" data-aos="fade-up">
      <div class="section-title text-center">
        <div class="title-wrapper">
          <span class="subtitle-badge">📅 BOOKING</span>
          <h2 class="main-title">Book a Property</h2>
          <div class="title-underline"></div>
          <p class="section-description">Schedule a booking for your selected property.</p>
        </div>
      </div>

      <div v-if="isLoading && !showError" class="loading text-center p-6">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-2xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
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

      <div v-else-if="isSoldOut" class="sold-out-message text-center p-6">
        <div class="sold-out-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-house-slash text-2xl text-red-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Property Sold Out</h3>
          <p class="text-gray-600 mb-6">This property is currently sold out as no rooms are available.</p>
          <button 
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="router.push({ name: 'properties' })"
            aria-label="View other properties"
          >
            View Other Properties
          </button>
        </div>
      </div>

      <div v-else class="form-container">
        <div class="form-header">
          <div class="form-icon">
            <i class="bi bi-calendar-check"></i>
          </div>
          <h2>Schedule Your Visit</h2>
          <p class="form-subtitle">Fill in the details below to book your property viewing</p>
        </div>

        <div v-if="errors['general']" class="error-message text-center p-4">
          <i class="bi bi-exclamation-circle text-xl text-red-500 mr-2"></i>
          <span>{{ errors['general'] }}</span>
        </div>

        <form @submit.prevent="handleBooking" class="booking-form">
          <div class="form-grid">
            <div class="form-group" v-if="bookingForm.booking_property_type_id === '2'">
              <label for="room-number" class="form-label">
                <i class="bi bi-door-open"></i>
                Room Number
              </label>
              <input 
                type="text" 
                id="room-number"
                class="form-control" 
                v-model="bookingForm.room_number" 
                required
                :class="{ 'error': errors['room_number'] }"
                aria-describedby="room-number-error"
              >
              <div class="error-message" v-if="errors['room_number']" id="room-number-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['room_number'] }}
              </div>
            </div>

            <div class="form-group">
              <label for="appointment-type" class="form-label">
                <i class="bi bi-person-check"></i>
                Appointment Type
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
                  <option value="" disabled>Choose appointment type</option>
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
              <label for="date" class="form-label">
                <i class="bi bi-calendar3"></i>
                Preferred Date
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
                Time Slot
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
                <i class="bi bi-stopwatch"></i>
                Duration
              </label>
              <div class="duration-wrapper">
                <input 
                  type="number" 
                  id="duration"
                  class="form-control" 
                  v-model="bookingForm.duration" 
                  :min="bookingForm.booking_property_type_id === '2' ? 1 : 15" 
                  :max="bookingForm.booking_property_type_id === '2' ? undefined : 180"
                  :step="bookingForm.booking_property_type_id === '2' ? 1 : 15"
                  required
                  :class="{ 'error': errors['duration'] }"
                  aria-describedby="duration-error"
                >
                <span class="duration-unit">{{ bookingForm.booking_property_type_id === '2' ? 'days' : 'minutes' }}</span>
              </div>
              <div class="error-message" v-if="errors['duration']" id="duration-error">
                <i class="bi bi-exclamation-circle"></i>
                {{ errors['duration'] }}
              </div>
            </div>
          </div>

          <div class="form-group full-width">
            <label for="notes" class="form-label">
              <i class="bi bi-chat-dots"></i>
              Additional Notes (Optional)
            </label>
            <textarea 
              id="notes"
              class="form-control" 
              v-model="bookingForm.notes"
              placeholder="Any special requirements or questions..."
              rows="4"
              aria-describedby="notes-description"
            ></textarea>
            <span id="notes-description" class="sr-only">Optional field for additional notes or special requirements</span>
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              class="submit-btn"
              :disabled="isLoading"
              aria-label="Submit booking"
            >
              <div class="btn-content">
                <i class="bi bi-bookmark-check"></i>
                <span>{{ isLoading ? 'Submitting...' : 'Schedule Booking' }}</span>
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
import { toast } from 'vue3-toastify';
import makeRequest from '../../services/makeRequest';
import AOS from 'aos';
import Swal from 'sweetalert2';

// Define interfaces for type safety
interface AppointmentType {
  id: string;
  name: string;
}

interface BookingForm {
  property_id: string;
  booking_property_type_id: string;
  room_number?: string;
  appointment_type_id: string;
  date: string;
  time_slot: string;
  duration: number;
  notes: string;
  status: string;
}

interface Property {
  id: string;
  status: string;
  room_count: number;
}

const router = useRouter();
const route = useRoute();
const propertyId = ref(route.params.id as string);
const isLoading = ref(false);
const showError = ref(false);
const errorMessage = ref('Unable to load booking data. Please try again later.');
const errors = ref<{ [key: string]: string }>({});
const property = ref<Property | null>(null);
const isSoldOut = ref(false);

// Initialize form with default values
const getInitialFormData = (): BookingForm => ({
  property_id: propertyId.value,
  booking_property_type_id: '1',
  room_number: '',
  appointment_type_id: '',
  date: '',
  time_slot: '',
  duration: 30,
  notes: '',
  status: 'pending'
});

const bookingForm = ref<BookingForm>(getInitialFormData());
const appointmentTypes = ref<AppointmentType[]>([]);
const lastSubmitted = ref<{ date: string; time_slot: string } | null>(null);

// Fallback data
const fallbackAppointmentTypes: AppointmentType[] = [
  { id: '1', name: 'Property Viewing' },
  { id: '2', name: 'General Inquiry' },
  { id: '3', name: 'Virtual Tour' }
];

// Clear form function
const clearForm = () => {
  bookingForm.value = getInitialFormData();
  errors.value = {};
  lastSubmitted.value = null;
};

// Configure toast options
const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  console.log(`Showing toast: ${message} (${type})`);
  toast[type](message, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    progress: undefined,
    theme: 'light',
    icon: false,
  });
};

// Fetch property details
const fetchPropertyDetails = async () => {
  isLoading.value = true;
  showError.value = false;

  const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${propertyId.value}`;
  try {
    const response = await makeRequest({
      method: 'GET',
      url,
      requiresAuth: false,
    });

    console.log('Property details response:', response.data);
    property.value = response.data.data;

    // Add null check for property.value
    if (property.value) {
      if (property.value.status === 'for rent' && property.value.room_count === 0) {
        await updatePropertyStatus();
      } else if (property.value.status === 'sold out') {
        isSoldOut.value = true;
      }
    } else {
      throw new Error('Property data is missing.');
    }
  } catch (error: any) {
    console.error('Failed to fetch property details:', error);
    showError.value = true;
    errorMessage.value = 'Failed to load property details. Please try again later.';
    showToast(errorMessage.value, 'error');
  } finally {
    isLoading.value = false;
  }
};

// Update property status to sold out
const updatePropertyStatus = async () => {
  try {
    const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${propertyId.value}/status`;
    const response = await makeRequest({
      method: 'PATCH',
      url,
      data: { status: 'sold out' },
      requiresAuth: true,
    });

    console.log('Property status update response:', response.data);
    if (response.status === 200 && property.value) {
      property.value.status = 'sold out';
      isSoldOut.value = true;
      showToast('Property is sold out as no rooms are available.', 'info');
    }
  } catch (error: any) {
    console.error('Failed to update property status:', error);
    showToast('Failed to update property status.', 'error');
  }
};

// Fetch appointment types
const fetchAppointmentTypes = async (retries = 3, delay = 1000) => {
  isLoading.value = true;
  showError.value = false;

  if (!import.meta.env.VITE_APP_API_BASE_URL || !import.meta.env.VITE_APP_APPOINTMENT_TYPES_URL) {
    console.error('Missing environment variables');
    appointmentTypes.value = fallbackAppointmentTypes;
    showError.value = true;
    errorMessage.value = 'Configuration error. Please try again later.';
    showToast(errorMessage.value, 'error');
    isLoading.value = false;
    return;
  }

  const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_APPOINTMENT_TYPES_URL}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching appointment types, attempt ${attempt}`);
      const response = await makeRequest({
        method: 'GET',
        url,
        requiresAuth: false,
      });

      console.log('Appointment types response:', response.data);
      if (response.data && Array.isArray(response.data.data)) {
        appointmentTypes.value = response.data.data.map((type: any) => ({
          id: String(type.id),
          name: type.name || 'Unnamed Type',
        }));
        if (appointmentTypes.value.length === 0) {
          console.warn('API returned empty data array. Using fallback appointment types.');
          appointmentTypes.value = fallbackAppointmentTypes;
        }
      } else {
        console.warn('Invalid API response structure. Using fallback appointment types.');
        appointmentTypes.value = fallbackAppointmentTypes;
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
        showToast(errorMessage.value, 'error');
      } else {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  isLoading.value = false;
};

// Parse and display errors
const parseAndDisplayErrors = (errorData: any, fallbackMessage: string) => {
  errors.value = {};
  const messagesToToast: string[] = [];

  if (errorData?.errors) {
    Object.entries(errorData.errors).forEach(([key, errArray]: [string, any]) => {
      const message = Array.isArray(errArray) ? errArray.join('; ') : String(errArray);
      errors.value[key] = message;
      messagesToToast.push(message);
    });
  } else if (errorData?.message) {
    const generalMessage = errorData.message;
    if (generalMessage.includes('not available at the requested time slot')) {
      errors.value['time_slot'] = generalMessage;
    } else {
      errors.value['general'] = generalMessage;
    }
    messagesToToast.push(generalMessage);
  }

  if (messagesToToast.length === 0) {
    errors.value['general'] = fallbackMessage;
    messagesToToast.push(fallbackMessage);
  }
  
  messagesToToast.forEach(message => showToast(message, 'error'));
};

// Handle booking submission
const handleBooking = async () => {
  if (isSoldOut.value) {
    showToast('This property is sold out and cannot be booked.', 'error');
    return;
  }

  errors.value = {};
  
  const clientErrors: { [key: string]: string } = {};
  if (bookingForm.value.booking_property_type_id === '2' && !bookingForm.value.room_number)
    clientErrors['room_number'] = 'Room number is required for room bookings';
  if (!bookingForm.value.appointment_type_id)
    clientErrors['appointment_type_id'] = 'Please select an appointment type';
  if (!bookingForm.value.date)
    clientErrors['date'] = 'Please select a date';
  if (!bookingForm.value.time_slot)
    clientErrors['time_slot'] = 'Please select a time slot';
  if (bookingForm.value.booking_property_type_id === '1' && (bookingForm.value.duration < 15 || bookingForm.value.duration > 180)) {
    clientErrors['duration'] = 'Duration must be between 15 and 180 minutes';
  } else if (bookingForm.value.booking_property_type_id === '2' && bookingForm.value.duration < 1) {
    clientErrors['duration'] = 'Duration must be at least 1 day for room bookings';
  }
  if (!bookingForm.value.status)
    clientErrors['status'] = 'Status is required';

  if (Object.keys(clientErrors).length > 0) {
    errors.value = clientErrors;
    Object.values(clientErrors).forEach(err => showToast(err, 'error'));
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
      iconHtml: '<i class="bi bi-exclamation-triangle text-lg"></i>',
    });
    if (!confirm.isConfirmed) {
      isLoading.value = false;
      return;
    }
  }

  try {
    console.log('Submitting booking with data:', bookingForm.value);
    const response = await makeRequest({
      method: 'POST',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
      data: bookingForm.value,
      requiresAuth: true,
    });

    console.log('Booking API Response:', response);

    if (response?.status === 200 || response?.data?.success) {
      lastSubmitted.value = {
        date: bookingForm.value.date,
        time_slot: bookingForm.value.time_slot,
      };
      
      const successMessage = response.data?.message || 'Your booking has been submitted successfully. We\'ll contact you soon.';
      showToast(successMessage, 'success');
      clearForm();
      setTimeout(() => {
        console.log('Attempting redirect to my-account');
        router.push({ name: 'my-account' }).catch(err => {
          console.error('Navigation error:', err);
          showToast('Failed to redirect to My Account. Please navigate manually.', 'error');
        });
      }, 1500);
    } else {
      console.warn('API response did not indicate success:', response.data);
      const errorMessage = response.data?.message || 'Booking failed due to an unknown reason.';
      parseAndDisplayErrors(response.data, errorMessage);
    }
  } catch (error: any) {
    console.error('Booking submission error:', error);
    const fallback = error.message.includes('Network')
      ? 'Network issue. Please check your connection.'
      : 'An unexpected error occurred during booking.';
    parseAndDisplayErrors(error.response?.data, fallback);
  } finally {
    isLoading.value = false;
  }
};

// Confirm form reset
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
    iconHtml: '<i class="bi bi-question-circle text-lg"></i>',
  });

  if (confirm.isConfirmed) {
    clearForm();
    showToast('Form has been reset.', 'info');
  }
};

// Retry loading data
const retryLoad = () => {
  fetchPropertyDetails();
  fetchAppointmentTypes();
};

onMounted(() => {
  console.log('Component mounted, initializing AOS and fetching data');
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100,
    });
  }
  fetchPropertyDetails();
  fetchAppointmentTypes();
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
    .subtitle-badge {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(135deg, $accent-color, #ea580c);
      color: $white;
      padding: 8px 20px;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 20px;
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

.sold-out-message {
  text-align: center;
  padding: 60px 20px;
  
  .sold-out-content {
    background: $white;
    border-radius: 24px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.1);
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, $error-color, darken($error-color, 10%));
    }
    
    i {
      font-size: 2rem;
    }
    
    h3 {
      font-size: clamp(1.5rem, 3vw, 1.8rem);
    }
    
    p {
      font-size: 1rem;
      line-height: 1.6;
    }
    
    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
      }
    }
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

:deep(.Vue-Toastification__toast) {
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  margin-bottom: 8px;
  backdrop-filter: blur(10px);
  min-height: auto;
  z-index: 9999;
}

:deep(.Vue-Toastification__toast--success) {
  background: rgba(16, 185, 129, 0.95);
  border-left: 4px solid $success-color;
  color: white;
}

:deep(.Vue-Toastification__toast--error) {
  background: rgba(239, 68, 68, 0.95);
  border-left: 4px solid $error-color;
  color: white;
}

:deep(.Vue-Toastification__toast--warning) {
  background: rgba(245, 158, 11, 0.95);
  border-left: 4px solid $warning-color;
  color: white;
}

:deep(.Vue-Toastification__toast--info) {
  background: rgba(59, 130, 246, 0.95);
  border-left: 4px solid $primary-color;
  color: white;
}

:deep(.Vue-Toastification__progress-bar) {
  height: 3px;
}

:deep(.swal2-toast) {
  width: 350px;
  padding: 12px;
  font-size: 0.9rem;
  z-index: 9999;
}

:deep(.swal2-icon) {
  font-size: 1rem !important;
  margin: 0.5em auto !important;
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
  
  :deep(.Vue-Toastification__toast) {
    margin-bottom: 8px;
    font-size: 0.85rem;
  }
  
  :deep(.swal2-toast) {
    width: auto;
    max-width: 90%;
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
  
  :deep(.Vue-Toastification__toast) {
    padding: 10px 14px;
    font-size: 0.8rem;
  }
}
</style>