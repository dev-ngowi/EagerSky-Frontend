<template>
  <div class="lease-signer">
    <div class="container">
      <div class="step-content">
        <h2 class="step-title">Sign Your Lease Agreement</h2>
        <p class="step-description">
          Please review the lease details below. By pressing 'Sign Lease' in the main application, you agree to the terms and legally bind yourself to the agreement.
        </p>
        <div class="info-card">
          <h3>📝 Digital Signature</h3>
          <p>
            A digital signature serves as your legal consent to this agreement. This is a legally binding action.
            Ensure all details, including rent amount, dates, and terms, are correct before proceeding.
          </p>
        </div>
        <div class="info-card">
          <h3>📄 Lease Details</h3>
          <p><strong>Property Number:</strong> {{ lease.property_id }}</p>
          <p><strong>Lease Number:</strong> {{ lease.id || 'N/A' }}</p>
          <p><strong>Room Number:</strong> {{ lease.room_number || 'Not assigned' }}</p>
          <p><strong>Start Date:</strong> {{ lease.start_date || 'N/A' }}</p>
          <p><strong>End Date:</strong> {{ lease.end_date || 'N/A' }}</p>
          <p><strong>Rent Amount:</strong> TZS {{ lease.rent_amount ? parseFloat(lease.rent_amount).toLocaleString() : 'N/A' }}</p>
          <p><strong>Payment Frequency:</strong> {{ lease.payment_frequency ? lease.payment_frequency.charAt(0).toUpperCase() + lease.payment_frequency.slice(1) : 'N/A' }}</p>
          <p><strong>Terms:</strong> {{ lease.terms || 'N/A' }}</p>
          <p><strong>Status:</strong> {{ lease.is_signed ? 'Signed' : 'Not Signed' }}</p>
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { SweetAlertResult } from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import { AuthMiddleware } from '../../../../utils/authMiddleware';

export default defineComponent({
  name: 'LeaseSigner',
  props: {
    lease: {
      type: Object,
      required: true,
    },
    API_BASE_URL: {
      type: String,
      default: 'https://e1.japango.co.tz/api',
    },
    authStore: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      loading: false,
      loadingText: '',
      errorMessage: '',
    };
  },
  methods: {
    showSwal(title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info'): Promise<SweetAlertResult> {
      console.log('[DEBUG] Showing Swal:', { title, text, icon, timestamp: new Date().toISOString() });
      return this.$swal.fire({
        title,
        text,
        icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        background: 'rgba(255, 255, 255, 0.98)',
        customClass: {
          popup: 'custom-swal-toast',
          title: 'swal2-title',
          htmlContainer: 'swal2-content',
        },
        didOpen: () => {
          const toast = this.$swal.getPopup();
          if (toast) {
            toast.style.borderLeft = `4px solid ${
              icon === 'success' ? '#10b981' :
              icon === 'error' ? '#dc2626' :
              icon === 'warning' ? '#f59e0b' : '#3b82f6'
            }`;
            toast.style.borderRadius = '12px';
            toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
            toast.style.backdropFilter = 'blur(10px)';
          }
        },
      });
    },
    validateSession() {
      const isValid = AuthMiddleware.isSessionValid();
      console.log('validateSession:', { isValid, timestamp: new Date().toISOString() });
      return isValid;
    },
    getUserInfo() {
      if (this.authStore.userProfile) {
        const userInfo = {
          id: this.authStore.userProfile.id,
          roles: this.authStore.userProfile.roles || [],
          ...this.authStore.userProfile,
        };
        console.log('getUserInfo: Retrieved from authStore', { userInfo });
        return userInfo;
      }
      try {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('userProfile');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const userInfo = {
            id: userData.id,
            roles: userData.roles || [],
            ...userData,
          };
          console.log('getUserInfo: Retrieved from localStorage', { userInfo });
          return userInfo;
        }
      } catch (error: any) {
        console.warn('getUserInfo: Error parsing user data from localStorage:', {
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
      try {
        const token = this.getAuthToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userInfo = {
            id: payload.sub || payload.user_id || payload.id,
            roles: payload.roles || [],
            ...payload,
          };
          console.log('getUserInfo: Retrieved from token payload', { userInfo });
          return userInfo;
        }
      } catch (error: any) {
        console.warn('getUserInfo: Error parsing token payload:', {
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
      console.log('getUserInfo: No user info found', { timestamp: new Date().toISOString() });
      return null;
    },
    getAuthToken() {
      const token =
        this.authStore.token ||
        localStorage.getItem('access_token') ||
        null;
      console.log('getAuthToken:', { token: token ? 'Token found' : 'No token found', timestamp: new Date().toISOString() });
      return token;
    },
    async initiateSign() {
      console.log('initiateSign: Starting lease signing process', { leaseId: this.lease.id, timestamp: new Date().toISOString() });
      await this.openSignConfirmation();
    },
    async openSignConfirmation() {
      if (!this.lease.id) {
        this.errorMessage = 'Lease ID is missing. Please create a lease first.';
        console.error('openSignConfirmation: Lease ID missing', { lease: this.lease, timestamp: new Date().toISOString() });
        this.showSwal('Error', this.errorMessage, 'error');
        return;
      }
      if (!this.API_BASE_URL) {
        this.errorMessage = 'API base URL is not configured. Please contact support.';
        console.error('openSignConfirmation: API base URL missing', { timestamp: new Date().toISOString() });
        this.showSwal('Error', this.errorMessage, 'error');
        return;
      }
      console.log('openSignConfirmation: Showing SweetAlert2 confirmation', { leaseId: this.lease.id, timestamp: new Date().toISOString() });
      const result = await this.$swal.fire({
        title: 'Confirm Lease Signing',
        text: `Are you sure you want to sign the lease for Property ${this.lease.property_id}? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Confirm & Sign',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'swal2-popup',
          title: 'swal2-title',
          htmlContainer: 'swal2-content',
          confirmButton: 'btn btn-primary lease-signer-confirm-btn',
          cancelButton: 'btn btn-secondary lease-signer-cancel-btn',
          loader: 'swal2-loader',
        },
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            await this.confirmSignLease();
            return true;
          } catch (error: any) {
            this.$swal.showValidationMessage(`Failed to sign lease: ${error.message || 'Unknown error'}`);
            return false;
          }
        },
        allowOutsideClick: () => !this.$swal.isLoading(),
        ariaLabel: 'Lease signing confirmation dialog',
      });
      if (!result.isConfirmed) {
        this.cancelSignLease();
      }
    },
    cancelSignLease() {
      console.log('cancelSignLease: User cancelled lease signing', { leaseId: this.lease.id, timestamp: new Date().toISOString() });
      this.showSwal('Cancelled', 'Lease signing cancelled.', 'info');
    },
    async confirmSignLease() {
      console.log('confirmSignLease: Starting lease signing process', { leaseId: this.lease.id, timestamp: new Date().toISOString() });

      if (!this.validateSession()) {
        throw new Error('Please log in again.');
      }

      if (!this.lease.id) {
        throw new Error('Lease ID is missing. Please create a lease first.');
      }

      if (!this.API_BASE_URL) {
        throw new Error('API base URL is not configured. Please contact support.');
      }

      this.loading = true;
      this.loadingText = 'Signing lease...';

      const userInfo = this.getUserInfo();
      if (!userInfo || !userInfo.id) {
        throw new Error('User information not found. Please log in again.');
      }

      const payload = {
        is_signed: true,
        user_id: userInfo.id,
      };

      console.log('confirmSignLease: Preparing to send sign lease request', {
        leaseId: this.lease.id,
        userId: userInfo.id,
        userRoles: userInfo.roles,
        leaseUserId: this.lease.user_id,
        payload,
        apiUrl: `${this.API_BASE_URL}/v1/leases/${this.lease.id}/sign`,
        timestamp: new Date().toISOString(),
      });

      try {
        const response = await makeRequest({
          method: 'POST',
          url: `${this.API_BASE_URL}/v1/leases/${this.lease.id}/sign`,
          data: payload,
          headers: {
            Authorization: `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          requiresAuth: true,
        });

        console.log('confirmSignLease: API response received', {
          status: response.status,
          data: response.data,
          timestamp: new Date().toISOString(),
        });

        if (response.status === 200 || response.status === 201) {
          const updatedLease = {
            ...this.lease,
            is_signed: true,
            user_id: userInfo.id,
          };

          console.log('confirmSignLease: Lease signed successfully', {
            updatedLease,
            timestamp: new Date().toISOString(),
          });

          this.$emit('lease-signed', updatedLease);
          this.showSwal('Lease Signed', 'Lease signed successfully!', 'success');
          return true;
        } else {
          throw new Error(response.data?.message || 'Failed to sign the lease. Please try again.');
        }
      } catch (error: any) {
        let errorMessage = error.response?.data?.message || error.message || 'An error occurred while signing the lease.';
        let status = error.response?.status;

        console.error('confirmSignLease: Error occurred', {
          errorMessage,
          status,
          responseData: error.response?.data,
          leaseId: this.lease.id,
          userInfo,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });

        if (status === 403) {
          errorMessage = error.response?.data?.message || 'Unauthorized access';
          this.showSwal('Authorization Error', `Authorization Error: ${errorMessage}. Please ensure you're authorized to sign this lease.`, 'error');
        } else if (status === 401) {
          errorMessage = 'Session Expired. Redirecting to login...';
          this.showSwal('Session Expired', errorMessage, 'error');
          this.$emit('session-expired');
        } else if (status === 422) {
          errorMessage = error.response?.data?.message || 'Validation Error: Please sign the lease agreement';
          this.showSwal('Validation Error', errorMessage, 'error');
        } else {
          this.showSwal('Error', errorMessage, 'error');
        }

        throw new Error(errorMessage);
      } finally {
        this.loading = false;
        this.loadingText = '';
        console.log('confirmSignLease: Completed execution', {
          loading: this.loading,
          errorMessage: this.errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    },
  },
});
</script>

<style scoped lang="scss">
/* SweetAlert2 Button Styles */
::v-deep(.btn.btn-primary.lease-signer-confirm-btn),
::v-deep(.btn.btn-secondary.lease-signer-cancel-btn) {
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 10px;
  min-width: 140px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

/* Confirm Button - Primary action with blue theme */
::v-deep(.btn.btn-primary.lease-signer-confirm-btn) {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: 2px solid transparent;
  animation: confirmPulse 2s infinite;

  &:hover {
    background: linear-gradient(135deg, #2563eb, #1e40af);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: linear-gradient(135deg, #6b7280, #4b5563);
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: none;
  }

  /* Add checkmark icon before text */
  &:before {
    content: '✓';
    font-size: 18px;
    margin-right: 6px;
    font-weight: bold;
  }

  /* Shimmer effect */
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover:after {
    left: 100%;
  }
}

/* Cancel Button - Secondary action with gray theme */
::v-deep(.btn.btn-secondary.lease-signer-cancel-btn) {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #334155;
  border: 2px solid transparent;

  &:hover {
    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(203, 213, 225, 0.4);
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(203, 213, 225, 0.3);
  }

  /* Add X icon before text */
  &:before {
    content: '✕';
    font-size: 16px;
    margin-right: 6px;
    font-weight: bold;
  }
}

/* Pulse animation for confirm button */
@keyframes confirmPulse {
  0% { box-shadow: 0 4px 14px rgba(59, 130, 246, 0.15); }
  50% { box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35), 0 0 0 4px rgba(59, 130, 246, 0.1); }
  100% { box-shadow: 0 4px 14px rgba(59, 130, 246, 0.15); }
}

/* SweetAlert2 Popup Styles */
::v-deep(.swal2-popup) {
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
  padding: 32px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

::v-deep(.swal2-title) {
  color: #1e293b;
  font-weight: 700;
  font-size: 1.2rem;
  margin-bottom: 12px;
}

::v-deep(.swal2-content) {
  color: #64748b;
  font-size: 1rem;
}

::v-deep(.swal2-actions) {
  margin-top: 32px;
  justify-content: center;
  gap: 20px;
}

::v-deep(.swal2-loader) {
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  width: 20px;
  height: 20px;
}

/* Custom Toast Styles */
::v-deep(.custom-swal-toast) {
  background: rgba(255, 255, 255, 0.98);
  color: #334155;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

/* Component Styles */
.lease-signer {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  padding: 20px;
  color: #334155;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.step-content {
  padding: 40px;
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

.info-card p {
  color: #1e40af;
  margin: 6px 0;
  font-size: 1rem;
  line-height: 1.5;
}

.info-card strong {
  font-weight: 600;
  color: #1e3a8a;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  margin-top: 16px;
  font-size: 1rem;
  text-align: center;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .lease-signer {
    padding: 10px;
  }

  .container {
    border-radius: 16px;
    margin: 0;
  }

  .step-content {
    padding: 24px 20px;
  }

  .step-title {
    font-size: 1.5rem;
  }

  .step-description {
    font-size: 1rem;
  }

  .info-card {
    padding: 16px;
  }

  ::v-deep(.btn.btn-primary.lease-signer-confirm-btn),
  ::v-deep(.btn.btn-secondary.lease-signer-cancel-btn) {
    padding: 12px 20px;
    font-size: 14px;
    min-width: 120px;
    margin: 0 8px;
  }

  ::v-deep(.swal2-popup) {
    padding: 24px 20px;
  }
}

@media (max-width: 480px) {
  .step-title {
    font-size: 1.3rem;
  }

  .step-description {
    font-size: 0.9rem;
  }

  .info-card {
    padding: 16px;
  }

  ::v-deep(.btn.btn-primary.lease-signer-confirm-btn),
  ::v-deep(.btn.btn-secondary.lease-signer-cancel-btn) {
    padding: 10px 16px;
    font-size: 13px;
    min-width: 100px;
    margin: 0 6px;
  }

  ::v-deep(.swal2-popup) {
    width: 95%;
    padding: 20px 16px;
  }

  ::v-deep(.swal2-actions) {
    margin-top: 24px;
    gap: 12px;
    flex-direction: column;

    button {
      width: 100%;
      margin: 4px 0;
    }
  }
}

@media print {
  .lease-signer {
    background: white;
    padding: 0;
  }

  .container {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
}
</style>