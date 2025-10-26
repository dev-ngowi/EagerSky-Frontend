```vue
<script>
import { useRentalState } from '../../../../composables/useRentalState';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default {
  name: 'ApplicationManager',
  props: {
    formData: {
      type: Object,
      required: true,
    },
    branches: {
      type: Array,
      required: true,
    },
    statusOptions: {
      type: Array,
      required: true,
    },
  },
  setup(props, { emit }) {
    const { state } = useRentalState();

    async function handleApplicationSubmit() {
      state.loading = true;
      state.loadingText = 'Submitting application...';
      try {
        if (!props.formData.application.branch_id || !props.formData.application.employment_status) {
          throw new Error('Please fill in all required fields.');
        }
        const payload = {
          property_id: props.formData.application.property_id,
          branch_id: props.formData.application.branch_id,
          employment_status: props.formData.application.employment_status,
          nida_number: props.formData.application.nida_number,
          registration_number: props.formData.application.registration_number,
          annual_income: props.formData.application.annual_income,
        };
        const response = await makeRequest({
          method: 'POST',
          url: `${state.API_BASE_URL}/v1/applications`,
          data: payload,
          headers: { Authorization: `Bearer ${state.authStore.token}`, 'Content-Type': 'application/json' },
          requiresAuth: true,
        });
        props.formData.application.id = response.data.data.id;
        state.isApplicationPending = true;
        emit('update-application', props.formData.application);
        emit('poll-application-status');
        emit('next');
      } catch (error) {
        state.errorMessage = error.response?.data?.message || 'Failed to submit application.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: state.errorMessage,
          timer: 5000,
          timerProgressBar: true,
        });
      } finally {
        state.loading = false;
        state.loadingText = '';
      }
    }

    return {
      state,
      handleNext() {
        handleApplicationSubmit();
      },
      handlePrev() {
        emit('prev');
      },
    };
  },
};
</script>

<template>
  <div class="step-content">
    <h2 class="step-title">Rental Application</h2>
    <p class="step-description">Provide your application details to proceed with the lease.</p>

    <div class="form-row">
      <div class="form-group">
        <label for="branch">Branch</label>
        <select
          v-model="formData.application.branch_id"
          :disabled="state.loading || branches.length === 0"
          :class="{ 'error': state.errors.branch_id }"
          required
        >
          <option value="">Select branch...</option>
          <option v-for="branch in branches" :key="branch.id" :value="branch.id">
            {{ branch.name }}
          </option>
        </select>
        <div v-if="state.errors.branch_id" class="error-message">{{ state.errors.branch_id }}</div>
      </div>
      <div class="form-group">
        <label for="employmentStatus">Employment Status</label>
        <select
          v-model="formData.application.employment_status"
          :disabled="state.loading"
          :class="{ 'error': state.errors.employment_status }"
          required
        >
          <option value="">Select status...</option>
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
        <div v-if="state.errors.employment_status" class="error-message">{{ state.errors.employment_status }}</div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="nidaNumber">NIDA Number</label>
        <input
          type="text"
          v-model="formData.application.nida_number"
          placeholder="Enter NIDA number"
          :disabled="state.loading"
          :class="{ 'error': state.errors.nida_number }"
          @input="$emit('update-application', { nida_number: formData.application.nida_number })"
        />
        <div v-if="state.errors.nida_number" class="error-message">{{ state.errors.nida_number }}</div>
      </div>
      <div class="form-group">
        <label for="registrationNumber">Registration Number (Optional)</label>
        <input
          type="text"
          v-model="formData.application.registration_number"
          placeholder="Enter registration number"
          :disabled="state.loading"
          @input="$emit('update-application', { registration_number: formData.application.registration_number })"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="annualIncome">Annual Income</label>
        <input
          type="number"
          v-model.number="formData.application.annual_income"
          placeholder="Enter annual income"
          :disabled="state.loading"
          :class="{ 'error': state.errors.annual_income }"
          @input="$emit('update-application', { annual_income: formData.application.annual_income })"
        />
        <div v-if="state.errors.annual_income" class="error-message">{{ state.errors.annual_income }}</div>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" @click="handlePrev" :disabled="state.loading">Previous</button>
      <button
        class="btn btn-primary"
        @click="handleNext"
        :disabled="state.loading || !formData.application.branch_id || !formData.application.employment_status"
      >
        <span v-if="state.loading" class="loading">
          <span class="spinner"></span>
          {{ state.loadingText }}
        </span>
        <span v-else>Next</span>
      </button>
    </div>

    <div v-if="state.loading" class="loading-indicator">
      <div class="spinner"></div>
      <span>{{ state.loadingText }}</span>
    </div>
  </div>
</template>

<style scoped>
.step-content {
  animation: fadeInSlide 0.4s ease-out;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
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

input, select {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  font-family: inherit;
}

input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

input:hover, select:hover {
  border-color: #cbd5e1;
}

input.error, select.error {
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

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

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

.btn-secondary {
  background-color: #6c757d;
  color: white;
  min-width: 140px;
}

.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
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

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .step-title {
    font-size: 1.5rem;
  }

  .step-description {
    font-size: 1rem;
  }

  .form-actions {
    flex-direction: column;
    gap: 12px;
  }

  .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .step-title {
    font-size: 1.4rem;
  }
}

@media print {
  .btn, .form-actions {
    display: none;
  }
}
</style>
