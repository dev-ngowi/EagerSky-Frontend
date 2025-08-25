<!-- components/ProgressBar.vue -->
<template>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-line">
        <div class="progress-line-active" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div
        v-for="step in totalSteps"
        :key="step"
        class="step-indicator"
        :class="{ 
          'active': step === currentStep, 
          'completed': completedSteps.includes(step),
          'locked': !canAccessStep(step),
          'accessible': canAccessStep(step) && step !== currentStep && !completedSteps.includes(step)
        }"
        :data-tooltip="getStepTooltip(step)"
        @click="$emit('step-clicked', step)"
      >
        <span v-if="completedSteps.includes(step)" class="step-icon">✓</span>
        <span v-else-if="!canAccessStep(step)" class="step-icon">🔒</span>
        <span v-else class="step-number">{{ step }}</span>
      </div>
    </div>
    <div class="step-labels">
      <div
        v-for="(label, index) in stepLabels"
        :key="index"
        class="step-label"
        :class="{ 
          'active': index + 1 === currentStep,
          'completed': completedSteps.includes(index + 1),
          'locked': !canAccessStep(index + 1)
        }"
      >
        {{ label }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProgressBar',
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
    stepTooltips: {
      type: Array,
      required: true
    },
    canAccessStep: {
      type: Function,
      required: true
    }
  },
  computed: {
    progressPercent() {
      return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    }
  },
  methods: {
    getStepTooltip(step) {
      const baseTooltip = this.stepTooltips[step - 1];
      const status = this.getStepStatus(step);
      
      switch (status) {
        case 'completed': return `${baseTooltip} - Completed ✓`;
        case 'active': return `${baseTooltip} - Current Step`;
        case 'accessible': return `${baseTooltip} - Available`;
        case 'locked': return `${baseTooltip} - Locked 🔒`;
        default: return baseTooltip;
      }
    },
    getStepStatus(step) {
      if (this.completedSteps.includes(step)) return 'completed';
      if (step === this.currentStep) return 'active';
      if (step <= this.maxReachedStep) return 'accessible';
      return 'locked';
    }
  }
}
</script>

<!-- components/ProgressBar.vue -->
<style scoped>
/* Progress Bar Styles */
.progress-container {
  padding: 24px 32px;
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}
.progress-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  margin-bottom: 16px;
}
.progress-line {
  position: absolute;
  top: 20px;
  left: 32px;
  right: 32px;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  z-index: 1;
}
.progress-line-active {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}
.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
  background: white;
  border: 3px solid #e2e8f0;
  color: #94a3b8;
  cursor: pointer;
}
.step-indicator.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transform: scale(1.1);
  animation: pulse 1.5s infinite;
}
.step-indicator.completed {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}
.step-indicator.accessible {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #4b5563;
}
.step-indicator.accessible:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
  transform: scale(1.05);
}
.step-indicator.locked {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}
.step-indicator.locked:hover {
  transform: none;
  background-color: #f3f4f6;
}
.step-icon {
  font-size: 16px;
  line-height: 1;
}
.step-number {
  font-size: 16px;
  font-weight: 700;
}
.step-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.step-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  text-align: center;
  width: 100px;
  transition: color 0.3s ease;
}
.step-label.active {
  color: #3b82f6;
  font-weight: 600;
}
.step-label.completed {
  color: #10b981;
  font-weight: 600;
}
.step-label.locked {
  color: #9ca3af;
  opacity: 0.7;
}

/* Tooltip Styles */
.step-indicator[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
  opacity: 0;
  animation: tooltipFadeIn 0.2s ease-out forwards;
}
.step-indicator[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid #1e293b;
  z-index: 10;
  opacity: 0;
  animation: tooltipFadeIn 0.2s ease-out forwards;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.1);
  }
}
@keyframes tooltipFadeIn {
  0% { opacity: 0; transform: translateX(-50%) translateY(5px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .step-labels {
    display: none;
  }
  .step-indicator {
    width: 36px;
    height: 36px;
    font-size: 13px;
  }
  .progress-line {
    left: 18px;
    right: 18px;
  }
}
</style>