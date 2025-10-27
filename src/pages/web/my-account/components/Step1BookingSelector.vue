<template>
  <div class="step-content">
    <div class="info-card caution">
      <h3>⚠️ Important Notice</h3>
      <p>Once you start the application process, you cannot return to previous steps. Please ensure all information is ready before proceeding.</p>
    </div>

    <div class="form-group">
      <label for="booking">Property Booking</label>
      <select
        v-model="bookingId"
        :disabled="loading || isStepCompleted"
        :class="{ 'error': errors.bookingId }"
        required
        @change="emitBookingSelection"
      >
        <option value="">Select a property booking...</option>
        <option
          v-for="booking in confirmedBookings"
          :key="booking.id"
          :value="booking.id"
        >
          {{ booking.display_text }}
        </option>
      </select>
      <div v-if="errors.bookingId" class="error-message">{{ errors.bookingId }}</div>
    </div>

    <div class="info-card">
      <h3>📋 What happens next?</h3>
      <p>After selecting your booking, you'll complete a rental application form with your personal and employment details.</p>
    </div>

    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <span>{{ loadingText }}</span>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../../../../stores/auth-store';
import { AuthMiddleware } from '../../../../utils/authMiddleware';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default {
  name: 'Step1BookingSelector',
  props: {
    isStepCompleted: {
      type: Boolean,
      default: false,
    },
    initialBookingId: {
      type: [Number, String, null],
      default: null,
    },
  },
  data() {
    return {
      API_BASE_URL: import.meta.env.VITE_APP_API_BASE_URL || 'https://app.eagersky.co.tz/api/v1',
      authStore: useAuthStore(),
      bookingId: this.initialBookingId,
      confirmedBookings: [],
      loading: false,
      loadingText: '',
      errors: {},
      errorMessage: '',
    };
  },
  mounted() {
    this.fetchConfirmedBookings();
  },
  methods: {
    showSwal(title, text, icon) {
      return Swal.fire({
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
        didOpen: (toast) => {
          toast.style.borderLeft = `4px solid ${icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6'}`;
          toast.style.borderRadius = '12px';
          toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
          toast.style.backdropFilter = 'blur(10px)';
        },
      });
    },
    validateSession() {
      if (!this.authStore.token || !AuthMiddleware.isSessionValid()) {
        this.errorMessage = 'Session expired. Please log in again.';
        localStorage.setItem('rentalApplicationReturnStep', JSON.stringify({
          step: 1,
          route: this.$route.fullPath,
        }));
        this.showSwal('Session Expired', this.errorMessage, 'error').then(() => {
          this.clearSession();
          this.$router.push({ path: '/login', query: { returnTo: this.$route.fullPath } });
        });
        return false;
      }
      return true;
    },
    clearSession() {
      this.authStore.clearAuth();
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('userProfile');
    },
    async fetchConfirmedBookings() {
      if (!this.validateSession()) return;
      this.loading = true;
      this.loadingText = 'Loading bookings...';
      try {
        const statusFilter = 'confirmed';
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/bookings?client_id=${this.authStore.userProfile?.id}&status=${statusFilter}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });

        this.confirmedBookings = (response.data?.data || []).map(booking => ({
          id: Number(booking.booking_id),
          property_id: Number(booking.rooms?.[0]?.property_id),
          property_title: booking.rooms?.[0]?.property?.title || 'Unknown Property',
          room_id: Number(booking.rooms?.[0]?.id),
          room_number: booking.rooms?.[0]?.room_number || `Room ${booking.rooms?.[0]?.id}`,
          display_text: booking.rooms?.[0]?.room_number || `Room ${booking.rooms?.[0]?.id}`,
          is_available: booking.rooms?.[0]?.is_available,
          client_id: Number(booking.client_id),
          status: booking.status,
        })).filter(booking => booking.id && booking.property_id);

        if (!this.confirmedBookings.length) {
          this.errorMessage = 'No confirmed bookings available.';
          this.showSwal('No Bookings', this.errorMessage, 'info');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch bookings.');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    handleError(error, defaultMessage) {
      const message = error.response?.data?.message || error.message || defaultMessage;
      console.error('Error:', error);
      this.showSwal('Error', message, 'error');
      return message;
    },
    emitBookingSelection() {
      this.errors.bookingId = '';
      if (!this.bookingId) {
        this.errors.bookingId = 'Please select a booking';
        this.showSwal('Validation Error', this.errors.bookingId, 'error');
        return;
      }
      this.$emit('update:bookingId', this.bookingId);
      this.$emit('booking-selected', this.confirmedBookings.find(b => b.id === this.bookingId));
    },
  },
};
</script>

<style scoped>
.step-content {
  animation: fadeInSlide 0.4s ease-out;
}
@keyframes fadeInSlide {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.info-card {
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  position: relative;
  overflow: hidden;
}
.info-card.caution {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1px solid #fecaca;
}
.info-card.caution::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #dc2626, #b91c1c);
}
.info-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}
.info-card h3 {
  color: #1e40af;
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 1.2rem;
}
.info-card.caution h3 {
  color: #b91c1c;
}
.info-card p {
  color: #1e40af;
  margin: 6px 0;
  font-size: 1rem;
  line-height: 1.5;
}
.info-card.caution p {
  color: #b91c1c;
}
.form-group {
  margin-bottom: 24px;
}
label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 0.95rem;
}
select {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  font-family: inherit;
}
select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}
select:hover {
  border-color: #cbd5e1;
}
select.error {
  border-color: #dc2626;
}
.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  margin-top: 8px;
  font-size: 14px;
}
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #64748b;
  font-weight: 500;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>