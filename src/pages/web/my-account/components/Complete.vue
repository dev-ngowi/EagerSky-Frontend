<template>
  <div class="step-content">
    <div class="success-animation">
      <div class="checkmark">
        <svg viewBox="0 0 52 52">
          <path d="M14,27 L22,35 L38,19"></path>
        </svg>
      </div>
      <h2 class="step-title">🎉 Application Complete!</h2>
      <p class="step-description">Your rental application has been successfully submitted and your payment is being processed.</p>

      <div class="completion-summary">
        <h3>📊 Process Summary</h3>
        <div class="completion-list">
          <div 
            v-for="step in totalSteps" 
            :key="step"
            class="completion-item"
            :class="{ 'completed': completedSteps.includes(step) }"
          >
            <span class="completion-icon">
              {{ completedSteps.includes(step) ? '✅' : '⏳' }}
            </span>
            <span class="completion-label">{{ stepLabels[step - 1] }}</span>
            <span class="completion-time" v-if="completedSteps.includes(step)">
              {{ getCompletionDate(step) }}
            </span>
          </div>
        </div>
      </div>

      <div class="info-card">
        <h3>📄 Download Your Lease Agreement</h3>
        <p>Your lease agreement is ready for download. Please save it for your records.</p>
        <button class="btn btn-primary" @click="$emit('download-lease')" :disabled="loading">
          <span v-if="loading && loadingText === 'Generating PDF...'">
            <span class="spinner"></span> Generating PDF...
          </span>
          <span v-else>Download Lease PDF</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Complete',
  props: {
    completedSteps: {
      type: Array,
      required: true
    },
    totalSteps: {
      type: Number,
      required: true
    },
    stepLabels: {
      type: Array,
      required: true
    },
    stepCompletionTimestamps: {
      type: Object,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingText: {
      type: String,
      default: ''
    }
  },
  methods: {
    getCompletionDate(step) {
      const timestamp = this.stepCompletionTimestamps[step];
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
};
</script>