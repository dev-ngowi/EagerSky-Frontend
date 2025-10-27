<!-- components/Step7Complete.vue -->
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
  name: 'Step7Complete',
  props: {
    totalSteps: {
      type: Number,
      required: true
    },
    completedSteps: {
      type: Array,
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
    loading: {
      type: Boolean,
      required: true
    },
    loadingText: {
      type: String,
      required: true
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
}
</script>

<!-- components/Step7Complete.vue -->
<style scoped>
/* Success Animation */
.success-animation {
  text-align: center;
  padding: 40px 20px;
}
.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
  animation: scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.checkmark svg {
  width: 40px;
  height: 40px;
  stroke: white;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  animation: checkmarkDraw 0.8s ease-in-out 0.3s both;
}
@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes checkmarkDraw {
  0% {
    stroke-dasharray: 0 50;
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dasharray: 50 50;
    stroke-dashoffset: -50;
  }
}

/* Step Title */
.step-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}
.step-description {
  color: #64748b;
  margin-bottom: 32px;
  font-size: 1.1rem;
}

/* Completion Summary */
.completion-summary {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
}
.completion-summary h3 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
}
.completion-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.completion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.completion-item.completed {
  border-color: #10b981;
  background-color: #f0fdf4;
}
.completion-icon {
  font-size: 18px;
  min-width: 20px;
}
.completion-label {
  flex: 1;
  font-weight: 500;
  color: #374151;
}
.completion-time {
  font-size: 12px;
  color: #64748b;
}

/* Info Card Styles */
.info-card {
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  position: relative;
  overflow: hidden;
}
.info-card h3 {
  color: #1e40af;
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 1.2rem;
}
.info-card p {
  color: #1e40af;
  margin: 6px 0;
  font-size: 1rem;
  line-height: 1.5;
}

/* Button Styles */
.btn {
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: none;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn:before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}
.btn:hover:before {
  left: 100%;
}
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  min-width: 140px;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Loading Styles */
.loading {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* Responsive Design */
@media (max-width: 768px) {
  .completion-item {
    flex-wrap: wrap;
  }
  .completion-time {
    width: 100%;
    text-align: right;
    margin-top: 0.25rem;
  }
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
@media (max-width: 480px) {
  .step-title {
    font-size: 1.5rem;
  }
  .step-description {
    font-size: 1rem;
  }
  .checkmark {
    width: 60px;
    height: 60px;
  }
  .checkmark svg {
    width: 30px;
    height: 30px;
  }
}
</style>