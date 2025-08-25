<!-- components/FormActions.vue -->
<template>
  <div class="form-actions" v-if="currentStep < totalSteps">
    <div class="action-info">
      <small v-if="!completedSteps.includes(currentStep)" class="step-info">
        Complete this step to continue to {{ stepLabels[currentStep] || 'next step' }}
      </small>
      <small v-else class="step-completed">
        ✓ This step has been completed
      </small>
    </div>
    
    <button
      class="btn btn-primary"
      @click="$emit('next-step')"
      :disabled="isNextButtonDisabled()"
      :class="{
        'btn-loading': loading,
        'btn-completed': completedSteps.includes(currentStep) && currentStep < totalSteps
      }"
    >
      <span v-if="loading" class="loading">
        <span class="spinner"></span>
        {{ loadingText }}
      </span>
      <span v-else>{{ nextButtonText }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'FormActions',
  props: {
    currentStep: {
      type: Number,
      required: true
    },
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
    loading: {
      type: Boolean,
      required: true
    },
    loadingText: {
      type: String,
      required: true
    },
    isStepLocked: {
      type: Boolean,
      required: true
    },
    isApplicationPending: {
      type: Boolean,
      required: true
    },
    isLeaseCreated: {
      type: Boolean,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    paymentForm: {
      type: Object,
      default: null
    }
  },
  computed: {
    nextButtonText() {
      switch (this.currentStep) {
        case 1: return 'Start Application →';
        case 2: return 'Submit Application →';
        case 3: return this.isLeaseCreated ? 'Sign Lease →' : 'Create Lease →';
        case 4: return this.formData.lease.is_signed ? 'Proceed to Billing →' : 'Sign Lease →';
        case 5: return 'Save Billing Address →';
        case 6: {
          if (this.paymentForm) {
            const formState = this.paymentForm.getFormState();
            if (formState.paymentCompleted) return 'Continue →';
            if (formState.paymentSubmitted && !formState.paymentCompleted) return 'Processing Payment...';
            if (formState.loading) return 'Processing...';
          }
          return 'Submit Payment →';
        }
        case 7: return 'Download Lease';
        default: return 'Next Step →';
      }
    }
  },
  methods: {
    isNextButtonDisabled() {
      if (this.loading || this.isStepLocked) return true;
      if (this.currentStep === 2 && this.isApplicationPending) return true;
      
      if (this.currentStep === 6 && this.paymentForm) {
        try {
          if (typeof this.paymentForm.getFormState === 'function') {
            const formState = this.paymentForm.getFormState();
            return formState.loading || (formState.paymentSubmitted && !formState.paymentCompleted);
          }
        } catch (error) {
          console.error('Error getting payment form state:', error);
        }
      }
      
      return false;
    }
  }
}
</script>

<!-- components/FormActions.vue -->
<style scoped>
/* Form Actions Styles */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.action-info {
  flex: 1;
  min-width: 200px;
}
.step-info {
  font-size: 13px;
  color: #64748b;
  font-style: italic;
}
.step-completed {
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
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
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  min-width: 160px;
}
.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}
.btn-primary:disabled {
  background-color: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.btn-loading {
  background-color: #6b7280 !important;
  cursor: wait !important;
}
.btn-completed {
  background-color: #10b981;
  border-color: #10b981;
}
.btn-completed:hover:not(:disabled) {
  background-color: #059669;
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
  border: 2px solid #e5e7eb;
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
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .action-info {
    text-align: center;
  }
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>