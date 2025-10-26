<template>
  <div class="step-content">
    <div class="info-card caution">
      <h3>⚠️ Important Notice</h3>
      <p>Once you start the application process, you cannot return to previous steps. Please ensure all information is ready before proceeding.</p>
      <div class="completion-status" v-if="completedSteps.includes(1)">
        <span class="completed-badge">✓ Step Completed</span>
        <small>Completed on {{ getCompletionDate(1) }}</small>
      </div>
    </div>
    
    <div class="form-group">
      <label for="booking">Property Booking</label>
      <select
        v-model="formData.bookingId"
        :disabled="loading || completedSteps.includes(1)"
        :class="{ 'error': errors.bookingId }"
        @change="emitBookingSelection"
        required
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
export default {
  name: 'SelectBooking',
  props: {
    formData: {
      type: Object,
      required: true
    },
    confirmedBookings: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingText: {
      type: String,
      default: ''
    },
    errors: {
      type: Object,
      default: () => ({})
    },
    completedSteps: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    emitBookingSelection() {
      this.$emit('update:bookingId', this.formData.bookingId);
      const selectedBooking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
      if (selectedBooking) {
        this.$emit('select-booking', selectedBooking);
      }
    },
    getCompletionDate(step) {
      // This would ideally come from parent, but included for template compatibility
      return 'N/A';
    }
  }
};
</script>