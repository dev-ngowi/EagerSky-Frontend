<script>
import { useRentalState } from '../../../../composables/useRentalState';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default {
  name: 'CompletionStep',
  props: {
    formData: Object,
  },
  setup(props, { emit }) {
    const { state, clearPersistedState } = useRentalState();

    async function downloadLease() {
      state.loading = true;
      state.loadingText = 'Downloading lease...';
      try {
        if (!props.formData.lease.id) {
          throw new Error('Lease ID is missing.');
        }
        const response = await makeRequest({
          method: 'GET',
          url: `${state.API_BASE_URL}/v1/leases/${props.formData.lease.id}/download`,
          headers: { Authorization: `Bearer ${state.authStore.token}` },
          responseType: 'blob',
          requiresAuth: true,
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lease_${props.formData.lease.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Swal.fire({
          icon: 'success',
          title: 'Lease Downloaded',
          text: 'Your lease has been downloaded successfully.',
          timer: 5000,
          timerProgressBar: true,
        });
        clearPersistedState();
        emit('next');
      } catch (error) {
        state.errorMessage = error.response?.data?.message || 'Failed to download lease.';
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
      downloadLease,
      handleNext() {
        downloadLease();
      },
    };
  },
};
</script>

<template>
  <div class="step-content">
    <h2 class="step-title">Application Complete</h2>
    <p class="step-description">Congratulations! Your rental application process is complete. Review the details below and download your lease.</p>

    <div class="info-card success">
      <h3>🎉 Success!</h3>
      <p>Your lease has been signed and payment has been processed. Download your lease document to keep for your records.</p>
    </div>

    <div class="info-card">
      <h3>📄 Application Summary</h3>
      <p><strong>Booking ID:</strong> {{ formData.bookingId }}</p>
      <p><strong>Property ID:</strong> {{ formData.lease.property_id }}</p>
      <p><strong>Lease ID:</strong> {{ formData.lease.id }}</p>
      <p><strong>Start Date:</strong> {{ formData.lease.start_date }}</p>
      <p><strong>End Date:</strong> {{ formData.lease.end_date }}</p>
      <p><strong>Rent Amount:</strong> TZS {{ formData.lease.rent_amount ? formData.lease.rent_amount.toLocaleString() : 'N/A' }}</p>
      <p><strong>Payment Transaction ID:</strong> {{ formData.payment.transaction_id || 'N/A' }}</p>
    </div>

    <div class="form-actions">
      <button
        class="btn btn-primary"
        @click="downloadLease"
        :disabled="state.loading"
      >
        <span v-if="state.loading" class="loading">
          <span class="spinner"></span>
          Downloading...
        </span>
        <span v-else>Download Lease</span>
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

.info-card {
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  position: relative;
  overflow: hidden;
}

.info-card.success {
  background: linear-gradient(135deg, #d1fae5, #ecfdf5);
  border: 1px solid #6ee7b7;
}

.info-card.success::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #10b981, #059669);
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

.info-card.success h3 {
  color: #047857;
}

.info-card p {
  color: #1e40af;
  margin: 6px 0;
  font-size: 1rem;
  line-height: 1.5;
}

.info-card.success p {
  color: #047857;
}

.info-card strong {
  font-weight: 600;
  color: #1e3a8a;
}

.info-card.success strong {
  color: #065f46;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
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
  .step-title {
    font-size: 1.5rem;
  }
  
  .step-description {
    font-size: 1rem;
  }
  
  .info-card {
    padding: 16px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-actions .btn {
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