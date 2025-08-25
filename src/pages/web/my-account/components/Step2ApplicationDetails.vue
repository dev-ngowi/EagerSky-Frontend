<template>
  <div class="step-content">
    <div class="step-header">
      <h2 class="step-title">Rental Application Details</h2>
      <div class="completion-status" v-if="completed">
        <span class="completed-badge">✓ Step Completed</span>
        <small>Completed on {{ completionDate }}</small>
      </div>
    </div>

    <div v-if="!isApplicationPending">
      <p class="step-description">Please provide your personal and employment information for the rental application.</p>

      <div class="form-row">
        <div class="form-group">
          <label for="branch">Branch</label>
          <select
            v-model="applicationData.branch_id"
            :disabled="loading || completed"
            :class="{ 'error': errors.branch_id }"
            required
          >
            <option value="">Select branch...</option>
            <option
              v-for="branch in branches"
              :key="branch.id"
              :value="branch.id"
            >
              {{ branch.name }}
            </option>
          </select>
          <div v-if="errors.branch_id" class="error-message">{{ errors.branch_id }}</div>
        </div>

        <div class="form-group">
          <label for="employment">Employment Status</label>
          <select
            v-model="applicationData.employment_status"
            @change="$emit('employment-status-change')"
            :disabled="loading || completed"
            :class="{ 'error': errors.employment_status }"
            required
          >
            <option value="">Select status...</option>
            <option value="employed">Employed</option>
            <option value="self-employed">Self-Employed</option>
            <option value="student">Student</option>
            <option value="unemployed">Unemployed</option>
          </select>
          <div v-if="errors.employment_status" class="error-message">{{ errors.employment_status }}</div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="nida">NIDA Number</label>
          <input
            type="text"
            v-model="applicationData.nida_number"
            placeholder="Enter your 20-digit NIDA number (YYYY...)"
            :disabled="loading || completed"
            :class="{ 'error': errors.nida_number }"
            maxlength="20"
            required
            @blur="$emit('validate-nida')"
          />
          <div v-if="errors.nida_number" class="error-message">{{ errors.nida_number }}</div>
        </div>
        <div class="form-group">
          <label for="income">Annual Income (TZS)</label>
          <select
            v-model="applicationData.annual_income"
            :disabled="loading || completed"
            :class="{ 'error': errors.annual_income }"
            required
          >
            <option value="">Select income range...</option>
            <option :value="100000">100,000 - 500,000</option>
            <option :value="500001">500,001 - 1,000,000</option>
            <option :value="1000001">1,000,001 and above</option>
          </select>
          <div v-if="errors.annual_income" class="error-message">{{ errors.annual_income }}</div>
        </div>
      </div>

      <div class="form-row" v-if="applicationData.employment_status === 'student'">
        <div class="form-group">
          <label for="registration">Registration Number</label>
          <input
            type="text"
            v-model="applicationData.registration_number"
            placeholder="Enter registration number"
            :disabled="loading || completed"
            :class="{ 'error': errors.registration_number }"
            required
          />
          <div v-if="errors.registration_number" class="error-message">{{ errors.registration_number }}</div>
        </div>
        <div></div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="background">Background Check Status</label>
          <select
            v-model="applicationData.background_check_status"
            :disabled="loading || completed"
            :class="{ 'error': errors.background_check_status }"
            required
          >
            <option value="">Select status...</option>
            <option value="good">Good</option>
            <option value="bad">Bad</option>
            <option value="very good">Very Good</option>
            <option value="very bad">Very Bad</option>
            <option value="average">Average</option>
          </select>
          <div v-if="errors.background_check_status" class="error-message">{{ errors.background_check_status }}</div>
        </div>
        <div class="form-group">
          <label for="credit">Credit Report Status</label>
          <select
            v-model="applicationData.credit_report_status"
            :disabled="loading || completed"
            :class="{ 'error': errors.credit_report_status }"
            required
          >
            <option value="">Select status...</option>
            <option value="good">Good</option>
            <option value="bad">Bad</option>
            <option value="very good">Very Good</option>
            <option value="very bad">Very Bad</option>
            <option value="average">Average</option>
          </select>
          <div v-if="errors.credit_report_status" class="error-message">{{ errors.credit_report_status }}</div>
        </div>
      </div>
    </div>
    <div v-else class="info-card">
      <h3>⏳ Waiting for Approval</h3>
      <p>Your rental application has been submitted and is pending approval. You'll be notified once it's reviewed.</p>
      <div class="completion-status" v-if="completed">
        <span class="pending-badge">⏳ Application Submitted</span>
        <small>Submitted on {{ completionDate }}</small>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RentalApplicationDetails',
  props: {
    applicationData: {
      type: Object,
      required: true,
    },
    branches: {
      type: Array,
      required: true,
    },
    errors: {
      type: Object,
      default: () => ({}),
    },
    loading: {
      type: Boolean,
      default: false,
    },
    isApplicationPending: {
      type: Boolean,
      default: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completionDate: {
      type: String,
      default: 'N/A',
    },
  },
  emits: ['validate-nida', 'employment-status-change', 'update:applicationData'],
  watch: {
    applicationData: {
      handler(newData) {
        this.$emit('update:applicationData', newData);
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
.step-content {
  padding: 24px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.completion-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.completed-badge,
.pending-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.completed-badge {
  background-color: #10b981;
  color: white;
}

.pending-badge {
  background-color: #f59e0b;
  color: white;
}

.step-description {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 8px;
}

.form-group select,
.form-group input {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background-color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group select:focus,
.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group select:disabled,
.form-group input:disabled {
  background-color: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-group select.error,
.form-group input.error {
  border-color: #ef4444;
}

.error-message {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

.info-card {
  text-align: center;
  padding: 32px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.info-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.info-card p {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .step-content {
    padding: 16px;
  }

  .step-title {
    font-size: 1.25rem;
  }

  .info-card {
    padding: 24px;
  }
}
</style>