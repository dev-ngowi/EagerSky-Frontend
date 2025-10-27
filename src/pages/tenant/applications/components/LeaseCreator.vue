<template>
  <div class="lease-creator">
    <div class="container">
      <div class="step-content">
        <!-- <h2 class="step-title">Create Your Lease Agreement</h2>
        <p class="step-description">
          Configure the terms and duration of your rental agreement.
        </p> -->
        <div v-if="loading && loadingText.includes('term')" class="loading-indicator">
          <div class="spinner"></div>
          <span>{{ loadingText }}</span>
        </div>
        <div v-else-if="computedTermPeriods.length === 0 && !loading" class="info-card caution">
          <h3>⚠️ No Term Periods Available</h3>
          <p>No lease term periods are available for this property. Please select a different booking or contact support.</p>
          <button
            @click="fetchTermPeriods"
            class="btn btn-secondary"
            :disabled="!propertyId || loading"
          >
            🔄 Retry Loading
          </button>
        </div>
        <div v-else>
          <div class="form-row">
            <div class="form-group">
              <label for="roomNumber">Room Number</label>
              <input
                type="text"
                :value="roomNumber || lease.room_number || 'Room not available'"
                readonly
                class="readonly-field"
                disabled
              />
            </div>
            <div class="form-group">
              <label for="termPeriod">Term Period</label>
              <select
                v-model="localLease.properties_term_period_id"
                @change="onTermPeriodChange"
                :disabled="loading || computedTermPeriods.length <= 1 || isCompleted"
                :class="{ 'error': errors.properties_term_period_id }"
                required
              >
                <option value="">Select term period...</option>
                <option
                  v-for="period in computedTermPeriods"
                  :key="period.id"
                  :value="period.id"
                >
                  {{ period.displayText }}
                </option>
              </select>
              <div v-if="errors.properties_term_period_id" class="error-message">
                {{ errors.properties_term_period_id }}
              </div>
              <small class="debug-info">
                {{ computedTermPeriods.length }} term period(s) available
              </small>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="paymentFreq">Payment Frequency</label>
              <select
                v-model="localLease.payment_frequency"
                :disabled="true"
                :class="{ 'error': errors.payment_frequency }"
                required
              >
                <option :value="localLease.payment_frequency">
                  {{ localLease.payment_frequency ? (localLease.payment_frequency.charAt(0).toUpperCase() + localLease.payment_frequency.slice(1)) : 'Select term period first' }}
                </option>
              </select>
              <div v-if="errors.payment_frequency" class="error-message">
                {{ errors.payment_frequency }}
              </div>
            </div>
            <div class="form-group">
              <label for="startDate">Start Date</label>
              <input
                type="date"
                :value="localLease.start_date"
                readonly
                class="readonly-field"
                disabled
              />
              <div v-if="errors.start_date" class="error-message">
                {{ errors.start_date }}
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="endDate">End Date</label>
              <input
                type="date"
                :value="localLease.end_date"
                readonly
                class="readonly-field"
                disabled
              />
              <div v-if="errors.end_date" class="error-message">
                {{ errors.end_date }}
              </div>
            </div>
            <div class="form-group">
              <label for="rentAmount">Rent Amount (TZS)</label>
              <input
                type="text"
                :value="formattedRentAmount"
                readonly
                placeholder="Amount will be calculated automatically"
                class="readonly-field"
                disabled
              />
            </div>
          </div>
          <div class="form-group">
            <label for="terms">Terms</label>
            <input
              type="text"
              :value="localLease.terms"
              readonly
              placeholder="Terms will be calculated automatically"
              class="readonly-field"
              disabled
            />
          </div>
          <div v-if="localLease.properties_term_period_id" class="info-card">
            <h3>📋 Selected Term Details</h3>
            <div v-if="selectedTermPeriod">
              <p><strong>Room Number:</strong> {{ roomNumber || lease.room_number || 'Not assigned' }}</p>
              <p><strong>Period:</strong> {{ selectedTermPeriod.period_of_payment }}</p>
              <p v-if="selectedTermPeriod.monthly_amount"><strong>Monthly Base Rent:</strong> TZS {{ selectedTermPeriod.monthly_amount.toLocaleString() }}</p>
              <p v-if="selectedTermPeriod.service_charge"><strong>Monthly Service Charge:</strong> TZS {{ selectedTermPeriod.service_charge.toLocaleString() }}</p>
              <p><strong>Total Amount:</strong> TZS {{ (localLease.rent_amount || 0).toLocaleString() }}</p>
              <p><strong>Status:</strong> {{ selectedTermPeriod.is_active ? 'Active' : 'Inactive' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { SweetAlertResult } from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import { AuthMiddleware } from '../../../../utils/authMiddleware';

interface TermPeriod {
  id: number;
  period_of_payment: string;
  amount: number;
  base_amount: number;
  service_charge: number;
  displayText: string;
  property_id: number;
  user_id: number;
  is_active: boolean;
  effective_from: string;
  notes: string | null;
  monthly_amount: number;
}

interface RawTermPeriod {
  id: string | number;
  period_of_payment: string;
  amount: string | number;
  base_amount: string | number;
  service_charge: string | number;
  property_id: string | number;
  user_id: string | number;
  is_active: boolean;
  effective_from: string;
  notes: string | null;
  monthly_amount: string | number;
}

interface Lease {
  properties_term_period_id: number | null;
  payment_frequency: string;
  start_date: string;
  end_date: string;
  rent_amount: number | null;
  terms: string;
  property_id: number | string;
  id?: number;
  is_signed?: boolean;
  room_number?: string;
  room_id?: number;
}

export default defineComponent({
  name: 'LeaseCreator',
  props: {
    lease: {
      type: Object as PropType<Lease>,
      required: true,
    },
    propertyId: {
      type: [Number, String],
      required: true,
    },
    bookingId: {
      type: [Number, String],
      required: true,
    },
    roomNumber: {
      type: String,
      default: '',
    },
    API_BASE_URL: {
      type: String,
      default: `${import.meta.env.VITE_APP_API_BASE_URL}`,
    },
    authStore: {
      type: Object,
      required: true,
    },
    shouldFetchTermPeriods: {
      type: Boolean,
      default: true,
    },
    termPeriods: {
      type: Array as PropType<TermPeriod[]>,
      default: () => [],
    },
  },
  data() {
    return {
      localLease: { ...this.lease } as Lease,
      loading: false,
      loadingText: '',
      errorMessage: '',
      errors: {} as Record<string, string | null>,
      localTermPeriods: [] as TermPeriod[],
      selectedTermPeriod: null as TermPeriod | null | undefined,
      availablePaymentFrequencies: [] as Array<{
        value: string;
        label: string;
        amount: number;
        months: number;
      }>,
      isUpdating: false,
    };
  },
  computed: {
    isSessionValid(): boolean {
      return AuthMiddleware.isSessionValid();
    },
    isCompleted(): boolean {
      return !!this.lease.id && !!this.lease.is_signed;
    },
    computedTermPeriods(): TermPeriod[] {
      return this.termPeriods.length > 0 ? this.termPeriods : this.localTermPeriods;
    },
    formattedRentAmount(): string {
      if (!this.localLease.rent_amount) return '';
      return `TZS ${this.localLease.rent_amount.toLocaleString()}`;
    },
  },
  watch: {
    propertyId: {
      immediate: true,
      handler(newPropertyId: number | string) {
        if (newPropertyId && this.isSessionValid && this.shouldFetchTermPeriods && this.API_BASE_URL) {
          this.fetchTermPeriods();
        }
      },
    },
    lease: {
      deep: true,
      handler(newLease: Lease) {
        if (!this.isUpdating) {
          this.localLease = { ...newLease };
          if (!this.roomNumber && newLease.room_number) {
            this.$emit('update:roomNumber', newLease.room_number);
          }
        }
      },
    },
    computedTermPeriods: {
      immediate: true,
      handler(newTermPeriods: TermPeriod[]) {
        if (newTermPeriods?.length === 1 && !this.localLease.properties_term_period_id) {
          this.localLease.properties_term_period_id = newTermPeriods[0].id;
          this.onTermPeriodChange();
        }
      },
    },
  },
  mounted() {
    if (this.shouldFetchTermPeriods && this.propertyId && this.isSessionValid && this.API_BASE_URL) {
      this.fetchTermPeriods();
    } else if (this.termPeriods?.length > 0) {
      this.localTermPeriods = this.termPeriods;
      this.showSwal('Success', `${this.localTermPeriods.length} lease term period(s) loaded from parent.`, 'success');
    } else if (!this.API_BASE_URL) {
      this.errorMessage = 'API base URL is not configured. Please contact support.';
      this.showSwal('Error', this.errorMessage, 'error');
    }
    if (this.lease.room_number && !this.roomNumber) {
      this.$emit('update:roomNumber', this.lease.room_number);
    }
  },
  methods: {
    showSwal(title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info'): Promise<SweetAlertResult> {
      return this.$swal.fire({
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
        didOpen: () => {
          const toast = this.$swal.getPopup();
          if (toast) {
            toast.style.borderLeft = `4px solid ${icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6'}`;
            toast.style.borderRadius = '12px';
            toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
            toast.style.backdropFilter = 'blur(10px)';
          }
        },
      });
    },
    getTodayDate(): string {
      return new Date().toISOString().split('T')[0];
    },
    validateForm(): boolean {
      this.errors = {};
      let isValid = true;
      if (!this.localLease.properties_term_period_id) {
        this.errors.properties_term_period_id = 'Please select a term period';
        isValid = false;
      }
      if (!this.localLease.payment_frequency) {
        this.errors.payment_frequency = 'Please select payment frequency';
        isValid = false;
      }
      if (!this.localLease.start_date) {
        this.errors.start_date = 'Start date is required';
        isValid = false;
      }
      if (!this.localLease.end_date) {
        this.errors.end_date = 'End date is required';
        isValid = false;
      }
      if (!this.localLease.rent_amount) {
        this.errors.rent_amount = 'Rent amount is required';
        isValid = false;
      }
      return isValid;
    },
    async fetchTermPeriods() {
      if (!this.isSessionValid) {
        this.errorMessage = 'Session expired. Please log in again.';
        this.showSwal('Error', this.errorMessage, 'error');
        this.$emit('session-expired');
        return;
      }

      if (!this.propertyId) {
        this.errorMessage = 'No property selected. Please select a booking first.';
        this.showSwal('Error', this.errorMessage, 'error');
        this.$emit('select-different-booking');
        return;
      }

      if (!this.API_BASE_URL) {
        this.errorMessage = 'API base URL is not configured. Please contact support.';
        this.showSwal('Error', this.errorMessage, 'error');
        return;
      }

      if (this.termPeriods?.length > 0) {
        this.localTermPeriods = this.termPeriods;
        this.showSwal('Success', `${this.localTermPeriods.length} lease term period(s) loaded from parent.`, 'success');
        return;
      }

      this.loading = true;
      this.loadingText = 'Loading lease term periods...';
      try {
        console.log('Fetching term periods for propertyId:', this.propertyId);
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/tenant/leases/term-periods/${this.propertyId}`,
          headers: { 
            Authorization: `Bearer ${this.authStore.token}`,
            'Accept': 'application/json'
          },
          requiresAuth: true,
        });

        console.log('Raw term periods response:', response.data);
        const termPeriods: RawTermPeriod[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
        this.localTermPeriods = termPeriods
          .filter((period: RawTermPeriod) => period && period.id)
          .map((period: RawTermPeriod) => {
            const amount = parseFloat(String(period.amount)) || 0;
            const monthlyAmount = parseFloat(String(period.monthly_amount)) || 0;
            const serviceCharge = parseFloat(String(period.service_charge)) || 0;
            const periodName = period.period_of_payment || 'Unknown';
            return {
              id: parseInt(String(period.id)),
              period_of_payment: periodName,
              amount: amount,
              base_amount: parseFloat(String(period.base_amount)) || amount,
              service_charge: serviceCharge,
              displayText: `${periodName.charAt(0).toUpperCase() + periodName.slice(1)} - TZS ${monthlyAmount.toLocaleString()} / per month`,
              property_id: parseInt(String(period.property_id)) || parseInt(String(this.propertyId)),
              user_id: parseInt(String(period.user_id)) || this.authStore.userProfile?.id || 0,
              is_active: period.is_active !== undefined ? period.is_active : true,
              effective_from: period.effective_from || new Date().toISOString(),
              notes: period.notes || null,
              monthly_amount: monthlyAmount,
            };
          });

        if (!this.localTermPeriods.length) {
          this.errorMessage = 'No lease term periods available for this property.';
          this.showSwal('No Term Periods', this.errorMessage, 'warning');
          this.$emit('select-different-booking');
        } else {
          this.showSwal('Success', `${this.localTermPeriods.length} lease term period(s) loaded successfully.`, 'success');
        }
      } catch (error: any) {
        console.error('Error fetching term periods:', error);
        this.localTermPeriods = [];
        let errorMessage = 'Failed to fetch lease term periods. Please try again or contact support.';
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = 'No lease term periods found for this property. Please select a different booking.';
            this.$emit('select-different-booking');
          } else if (error.response.status === 401) {
            errorMessage = 'Session expired. Please log in again.';
            this.$emit('session-expired');
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        } else if (error.message.includes('non-JSON')) {
          errorMessage = 'Server returned an invalid response. Please contact support.';
        } else if (error.message.includes('Request failed with status code 404')) {
          errorMessage = 'Invalid API endpoint or property ID. Please select a different booking.';
          this.$emit('select-different-booking');
        }
        this.errorMessage = errorMessage;
        this.showSwal('Error', errorMessage, 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    calculateRentAmount(termPeriod: TermPeriod, paymentFrequency: string): number {
      if (!termPeriod || !paymentFrequency) {
        return 0;
      }
      const monthlyBaseAmount = termPeriod.monthly_amount || 0;
      const monthlyServiceCharge = termPeriod.service_charge || 0;
      const multiplier = this.getPaymentMultiplier(paymentFrequency);
      return (monthlyBaseAmount * multiplier) + (monthlyServiceCharge * multiplier);
    },
    getPaymentMultiplier(frequency: string): number {
      if (!frequency) return 1;
      switch (frequency.toLowerCase()) {
        case 'monthly':
          return 1;
        case 'quarterly':
          return 3;
        case 'semi-annually':
          return 6;
        case 'annually':
          return 12;
        default:
          return 1;
      }
    },
    calculateEndDate(startDate: string, paymentFrequency: string): string {
      if (!startDate || !paymentFrequency) {
        return '';
      }
      try {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return '';
        }
        const monthsToAdd = {
          'monthly': 1,
          'quarterly': 3,
          'semi-annually': 6,
          'annually': 12,
        }[paymentFrequency.toLowerCase()] || 1;
        const end = new Date(start);
        end.setMonth(start.getMonth() + monthsToAdd);
        if (start.getDate() !== end.getDate()) {
          end.setDate(start.getDate());
          if (end.getDate() !== start.getDate()) {
            end.setDate(0);
          }
        }
        return end.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error calculating end date:', error);
        return '';
      }
    },
    calculateTerms(startDate: string, endDate: string): string {
      if (!startDate || !endDate) {
        return '';
      }
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return '';
        }
        if (end < start) {
          return '';
        }
        let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (end.getDate() < start.getDate()) {
          months--;
        }
        months = Math.max(0, months);
        return `${months} month${months !== 1 ? 's' : ''} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
      } catch (error) {
        console.error('Error calculating terms:', error);
        return '';
      }
    },
    setupPaymentFrequencyOptions(termPeriod: TermPeriod) {
      this.availablePaymentFrequencies = [];
      if (!termPeriod) return;

      const monthlyBaseAmount = termPeriod.monthly_amount || 0;
      const monthlyServiceCharge = termPeriod.service_charge || 0;
      const predefinedFrequency = termPeriod.period_of_payment || 'monthly';
      this.availablePaymentFrequencies = [{
        value: predefinedFrequency,
        label: predefinedFrequency.charAt(0).toUpperCase() + predefinedFrequency.slice(1),
        amount: (monthlyBaseAmount + monthlyServiceCharge) * this.getPaymentMultiplier(predefinedFrequency),
        months: this.getPaymentMultiplier(predefinedFrequency),
      }];

      this.localLease.payment_frequency = this.availablePaymentFrequencies[0]?.value || 'monthly';
      this.localLease.rent_amount = this.calculateRentAmount(termPeriod, this.localLease.payment_frequency);
    },
    onTermPeriodChange() {
      if (this.isUpdating) return;
      this.isUpdating = true;
      const selectedPeriod = this.computedTermPeriods.find(p => p.id === this.localLease.properties_term_period_id);
      this.selectedTermPeriod = selectedPeriod;
      if (selectedPeriod) {
        this.setupPaymentFrequencyOptions(selectedPeriod);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.localLease.start_date = tomorrow.toISOString().split('T')[0];
        this.localLease.end_date = this.calculateEndDate(this.localLease.start_date, this.localLease.payment_frequency);
        this.localLease.terms = this.calculateTerms(this.localLease.start_date, this.localLease.end_date);
        this.errors.properties_term_period_id = null;
        this.errors.payment_frequency = null;
        this.errors.start_date = null;
        this.errors.end_date = null;
        this.$emit('update:lease', { ...this.localLease });
        this.showSwal('Term Period Selected', `${selectedPeriod.period_of_payment} lease term selected. Dates and terms automatically set.`, 'success');
      } else {
        this.availablePaymentFrequencies = [];
        this.localLease.rent_amount = null;
        this.localLease.payment_frequency = '';
        this.localLease.start_date = '';
        this.localLease.end_date = '';
        this.localLease.terms = '';
        this.errors.properties_term_period_id = 'Please select a term period.';
        this.showSwal('Validation Error', this.errors.properties_term_period_id, 'error');
        this.$emit('update:lease', { ...this.localLease });
      }
      this.$nextTick(() => {
        this.isUpdating = false;
      });
    },
    validateLeaseForm(): boolean {
      this.errors = {};
      let isValid = true;
      if (!this.localLease.properties_term_period_id) {
        this.errors.properties_term_period_id = 'Please select a term period.';
        isValid = false;
      }
      if (!this.localLease.payment_frequency) {
        this.errors.payment_frequency = 'Please select a payment frequency.';
        isValid = false;
      }
      if (!this.localLease.start_date) {
        this.errors.start_date = 'Start date is required.';
        isValid = false;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(this.localLease.start_date);
        if (startDate < today) {
          this.errors.start_date = 'Start date cannot be in the past.';
          isValid = false;
        }
      }
      if (!this.localLease.end_date) {
        this.errors.end_date = 'End date is required.';
        isValid = false;
      } else {
        const start = new Date(this.localLease.start_date);
        const end = new Date(this.localLease.end_date);
        if (end <= start) {
          this.errors.end_date = 'End date must be after start date.';
          isValid = false;
        }
      }
      if (!this.localLease.rent_amount) {
        this.errors.rent_amount = 'Rent amount is required.';
        isValid = false;
      }
      if (!this.localLease.terms) {
        this.errors.terms = 'Lease terms are required.';
        isValid = false;
      }
      if (!isValid) {
        const firstError = Object.values(this.errors).find(error => !!error);
        this.showSwal('Validation Error', firstError || 'Please complete all required fields.', 'error');
      }
      return isValid;
    },
    async submitLease() {
      if (this.loading || this.isCompleted) return false;
      if (!this.validateLeaseForm()) {
        return false;
      }
      this.loading = true;
      this.loadingText = 'Creating lease...';
      try {
        const leaseData = {
          booking_id: this.bookingId,
          property_id: this.propertyId,
          properties_term_period_id: this.localLease.properties_term_period_id,
          payment_frequency: this.localLease.payment_frequency,
          rent_amount: this.localLease.rent_amount,
          start_date: this.localLease.start_date,
          end_date: this.localLease.end_date,
          terms: this.localLease.terms,
          user_id: this.authStore.userProfile?.id,
          room_id: this.lease.room_id || null,
          room_number: this.roomNumber || this.lease.room_number || null,
        };
        const response = await makeRequest({
          method: 'POST',
          url: `${this.API_BASE_URL}/v1/leases`,
          data: leaseData,
          headers: { 
            Authorization: `Bearer ${this.authStore.token}`,
            'Content-Type': 'application/json'
          },
          requiresAuth: true,
        });
        const newLease = response.data.data;
        this.$emit('update:lease', { ...this.localLease, ...newLease });
        this.$emit('lease-created', newLease);
        this.showSwal('Success', 'Lease created successfully!', 'success');
        return true;
      } catch (error: any) {
        console.error('Error creating lease:', error);
        if (error.response?.data?.errors) {
          this.errors = error.response.data.errors;
          const firstError = Object.values(this.errors).find(err => err);
          this.showSwal('Validation Error', firstError || 'Please correct the errors in the form.', 'error');
        } else {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to create lease';
          this.errors = { general: errorMessage };
          this.showSwal('Error', errorMessage, 'error');
        }
        this.$emit('error', error);
        return false;
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
  },
});
</script>

<style scoped>
.lease-creator {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  padding: 1px;
  color: #334155;
}

.step-content {
  padding: 10px;
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
  background-color: #fff5f5;
}
.readonly-field, select:disabled {
  background-color: #f8fafc !important;
  color: #64748b;
  cursor: not-allowed;
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
.btn-secondary {
  background-color: #6c757d;
  color: white;
}
.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(90, 98, 104, 0.4);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
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
.info-card.caution {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1px solid #fecaca;
}
.info-card.caution::before {
  background: linear-gradient(180deg, #dc2626, #b91c1c);
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
.info-card strong {
  font-weight: 600;
  color: #1e3a8a;
}
.info-card.caution strong {
  color: #991b1b;
}
.debug-info {
  color: #6c757d;
  font-style: italic;
  margin-top: 8px;
  font-size: 14px;
  display: block;
}
.debug-info.caution {
  color: #dc2626;
}
.info-text {
  color: #64748b;
  font-style: italic;
  margin: 6px 0;
  font-size: 1rem;
}
@media (max-width: 768px) {
  .lease-creator {
    padding: 10px;
  }
  .container {
    border-radius: 16px;
    margin: 0;
  }
  .step-content {
    padding: 24px 20px;
  }
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
  .btn {
    padding: 12px 20px;
    font-size: 15px;
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
}
@media print {
  .lease-creator {
    background: white;
    padding: 0;
  }
  .container {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
  .btn {
    display: none;
  }
}
</style>