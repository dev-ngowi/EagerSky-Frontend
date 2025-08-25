<template>
  <div class="rental-application">
    <div class="container">
      <div class="header">
        <h1>🏡 Rental Application</h1>
        <p>Complete your rental journey in 7 simple steps</p>
      </div>

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
            @click="handleStepClick(step)"
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

      <!-- Progress Statistics -->
      <div class="progress-stats" v-if="completedSteps.length > 0">
        <div class="stats-item">
          <span class="stats-label">Completed Steps:</span>
          <span class="stats-value">{{ completedSteps.length }}/{{ totalSteps }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">Current Progress:</span>
          <span class="stats-value">{{ Math.round((completedSteps.length / totalSteps) * 100) }}%</span>
        </div>
      </div>

      <div class="form-container">
        <!-- Step 1: Select Booking -->
        <div v-if="currentStep === 1" class="step-content">
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

        <!-- Step 2: Rental Application Details -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <h2 class="step-title">Rental Application Details</h2>
            <div class="completion-status" v-if="completedSteps.includes(2)">
              <span class="completed-badge">✓ Step Completed</span>
              <small>Completed on {{ getCompletionDate(2) }}</small>
            </div>
          </div>
          
          <div v-if="!isApplicationPending">
            <p class="step-description">Please provide your personal and employment information for the rental application.</p>

            <div class="form-row">
              <div class="form-group">
                <label for="branch">Branch</label>
                <select
                  v-model="formData.application.branch_id"
                  :disabled="loading || completedSteps.includes(2)"
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
                  v-model="formData.application.employment_status"
                  @change="onEmploymentStatusChange"
                  :disabled="loading || completedSteps.includes(2)"
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
                  v-model="formData.application.nida_number"
                  placeholder="Enter your 20-digit NIDA number (YYYY...)"
                  :disabled="loading || completedSteps.includes(2)"
                  :class="{ 'error': errors.nida_number }"
                  maxlength="20"
                  required
                  @blur="validateNidaNumber"
                />
                <div v-if="errors.nida_number" class="error-message">{{ errors.nida_number }}</div>
              </div>
              <div class="form-group">
                <label for="income">Annual Income (TZS)</label>
                <select
                  v-model="formData.application.annual_income"
                  :disabled="loading || completedSteps.includes(2)"
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

            <div class="form-row" v-if="formData.application.employment_status === 'student'">
              <div class="form-group">
                <label for="registration">Registration Number</label>
                <input
                  type="text"
                  v-model="formData.application.registration_number"
                  placeholder="Enter registration number"
                  :disabled="loading || completedSteps.includes(2)"
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
                  v-model="formData.application.background_check_status"
                  :disabled="loading || completedSteps.includes(2)"
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
                  v-model="formData.application.credit_report_status"
                  :disabled="loading || completedSteps.includes(2)"
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
            <div class="completion-status" v-if="completedSteps.includes(2)">
              <span class="pending-badge">⏳ Application Submitted</span>
              <small>Submitted on {{ getCompletionDate(2) }}</small>
            </div>
          </div>
        </div>

        <!-- Step 3: Create Lease -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <h2 class="step-title">Create Lease</h2>
            <div class="completion-status" v-if="completedSteps.includes(3)">
              <span class="completed-badge">✓ Step Completed</span>
              <small>Completed on {{ getCompletionDate(3) }}</small>
            </div>
          </div>
          <LeaseCreator
            ref="leaseCreator"
            :lease="formData.lease"
            :property-id="propertyId"
            :booking-id="formData.bookingId"
            :api-base-url="API_BASE_URL"
            :auth-store="authStore"
            :is-room-selection-required="isRoomSelectionRequired"
            :available-rooms="availableRooms"
            :term-periods="termPeriods"
            :parent-errors="leaseErrors"
            @update:lease="updateLease"
            @fetch-available-rooms="fetchAvailableRooms"
            @select-different-booking="selectDifferentBooking"
            @session-expired="handleSessionExpired"
            @lease-created="handleLeaseCreated"
            @validation-errors="handleLeaseValidationErrors"
            @clear-parent-errors="clearLeaseErrors"
          />
        </div>

       <!-- Step 4: Sign Lease -->
      <div v-if="currentStep === 4" class="step-content" role="region" aria-labelledby="sign-lease-title">
        <div class="step-header">
          <h2 id="sign-lease-title" class="step-title">Sign Lease</h2>
          <div class="completion-status" v-if="completedSteps.includes(4)">
            <span class="completed-badge">✓ Step Completed</span>
            <small>Completed on {{ getCompletionDate(4) }}</small>
          </div>
        </div>
        <LeaseSigner
          ref="leaseSigner"
          :lease="formData.lease"
          :api-base-url="API_BASE_URL"
          :auth-store="authStore"
          @lease-signed="handleLeaseSigned"
          @session-expired="handleSessionExpired"
        />
        <div v-if="errors.lease_signature" class="error-message" role="alert">
          {{ errors.lease_signature }}
        </div>
      </div>

        <!-- Step 5: Billing -->
      <div v-if="currentStep === 5" class="step-content">
        <div class="step-header">
          <h2 class="step-title">Billing Information</h2>
          <div class="completion-status" v-if="completedSteps.includes(5)">
            <span class="completed-badge">✓ Step Completed</span>
            <small>Completed on {{ getCompletionDate(5) }}</small>
          </div>
        </div>
        <BillingForm
          ref="billingForm"
          :billing="formData.billing"
          :api-base-url="API_BASE_URL"
          :auth-store="authStore"
          @update:billing="updateBilling"
          @session-expired="handleSessionExpired"
          @billing-saved="handleBillingContinue"
        />
      </div>

<!-- Step 6: Payment -->
<div v-if="currentStep === 6" class="step-content">
  <div class="step-header">
    <h2 class="step-title">Payment</h2>
    <div class="completion-status" v-if="completedSteps.includes(6)">
      <span class="completed-badge">✓ Step Completed</span>
      <small>Completed on {{ getCompletionDate(6) }}</small>
    </div>
  </div>
  
  <!-- Payment pending state -->
  <div v-if="isPaymentPending && formData.payment.status !== 'received'">
    <div class="info-card">
      <h3>⏳ Waiting for Approval</h3>
      <p>Your payment has been submitted and is pending approval. You'll be notified once it's reviewed.</p>
      <div class="completion-status">
        <span class="pending-badge">⏳ Payment Submitted - Awaiting Verification</span>
        <small>Submitted on {{ getCompletionDate(6) }}</small>
      </div>
    </div>
  </div>
  
  <!-- Always show PaymentForm component except when payment is pending -->
  <div v-else>
    <PaymentForm
      ref="paymentForm"
      :payment="formData.payment"
      :selected-term-period="selectedTermPeriod"
      :payment-multiplier="paymentMultiplier"
      :api-base-url="API_BASE_URL"
      :auth-store="authStore"
      :booking-id="formData.bookingId"
      :property-id="propertyId"
      :lease-id="formData.lease.id"
      :lease="formData.lease"
      :billing-address-id="formData.billing.address_id"
      :user-id="getUserInfo()?.id"
      :property-title="propertyTitle"
      :property-image="propertyImage"
      :property-location="propertyLocation"
      :property-type="propertyType"
      :room-number="formData.lease.room_number"
      :room-id="formData.lease.room_id"
      :is-room-based="isRoomSelectionRequired"
      :property-info="paymentPropertyInfo"
      @update:payment="updatePayment"
      @payment-submitted="handlePaymentSubmission"
      @payment-received="handlePaymentReceived"
      @payment-completed="handlePaymentCompleted"
      @payment-failed="handlePaymentFailure"
      @payment-cancelled="handlePaymentCancelled"
      @payment-timeout="handlePaymentTimeout"
      @session-expired="handleSessionExpired"
      @view-agreement="handleViewAgreement"
    />
    <div v-if="errors.billing_address_id" class="error-message">{{ errors.billing_address_id }}</div>
    <div v-if="errors.lease_term_period" class="error-message">{{ errors.lease_term_period }}</div>
  </div>
</div>

        <!-- Step 7: Complete -->
        <div v-if="currentStep === 7" class="step-content">
        <div class="success-animation">
          <div class="checkmark">
            <svg viewBox="0 0 52 52">
              <path d="M14,27 L22,35 L38,19"></path>
            </svg>
          </div>
          <h2 class="step-title">🎉 Application Complete!</h2>
          <p class="step-description">Your rental application has been successfully submitted. Finalize by completing the submission.</p>

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
            <h3>✅ Complete Submission</h3>
            <p>Finalize your application by completing the submission.</p>
            <button class="btn btn-primary" @click="completePayment" :disabled="loading">
              <span v-if="loading">
                <span class="spinner"></span> {{ loadingText }}
              </span>
              <span v-else>Complete Submission</span>
            </button>
          </div>
        </div>
      </div>

        <!-- Form Actions -->
  <div class="form-actions" v-if="currentStep < 7">
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
      @click="handleNextStep"
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
      </div>
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';
import makeRequest from '../../../services/makeRequest';
import { useAuthStore } from '../../../stores/auth-store';
import { AuthMiddleware } from '../../../utils/authMiddleware';
import LeaseSigner from './components/LeaseSigner.vue';
import LeaseCreator from './components/LeaseCreator.vue';
import BillingForm from './components/BillingForm.vue';
import PaymentForm from './components/PaymentProcessor.vue';
import Swal from 'sweetalert2';

export default {
  name: 'RentalApplication',
  components: {
    LeaseSigner,
    LeaseCreator,
    BillingForm,
    PaymentForm,
  },
  data() {
    return {
      API_BASE_URL: import.meta.env.VITE_APP_API_BASE_URL || 'https://e1.japango.co.tz/api/v1',
      TOKEN_EXPIRY_DURATION: 24 * 60 * 60 * 1000,
      authStore: useAuthStore(),
      
      // Property Data
      propertyId: null,
      propertyTitle: '',
      propertyImage: '',
      propertyLocation: '',
      propertyType: '',
      propertyCategory: '',
      availableRooms: null,
      isRoomSelectionRequired: true,
      pollingInterval: null,
      pollingTimeout: null,
      isCheckingPayment: false,
      pollingAttempts: 0,
      maxPollingAttempts: 30, // Max 30 attempts (5 minutes at 10-second intervals)
      requestTimeout: 10000, // 10 seconds timeout for individual API calls
      abortController: null,
      
      // Application State
      currentStep: 1,
      totalSteps: 7,
      completedSteps: [],
      maxReachedStep: 1,
      isStepLocked: false,
      stepCompletionTimestamps: {},
      isUpdatingPayment: false,
      
      // UI State
      loading: false,
      loadingText: '',
      errorMessage: '',
      errors: {},
      leaseErrors: {},
      isApplicationPending: false,
      showSignConfirmation: false,
      showPaymentInstructions: false,
      selectedPaymentType: null,
      hasShownApprovalAlert: false,
      isLeaseCreated: false,
      isPaymentPending: false,
      hasShownPaymentCompletionAlert: false,
      
      // Payment Data
      paymentId: null,
      paymentPollingInterval: null,
      
      // Static Data
      statusOptions: ['good', 'bad', 'very good', 'very bad', 'average'],
      stepLabels: [
        'Select Booking',
        'Application',
        'Create Lease',
        'Sign Lease',
        'Billing',
        'Payment',
        'Complete',
      ],
      stepTooltips: [
        'Select your confirmed booking',
        'Complete rental application',
        'Configure lease terms',
        'Sign the lease agreement',
        'Enter billing address',
        'Complete payment',
        'Download lease agreement',
      ],
      
      // Form Data
      formData: {
        bookingId: null,
        application: {
          id: null,
          property_id: null,
          branch_id: null,
          employment_status: '',
          nida_number: '',
          registration_number: '',
          annual_income: null,
          background_check_status: '',
          credit_report_status: '',
          status: 'pending',
          isApproved: false,
        },
        lease: {
          property_id: null,
          properties_term_period_id: null,
          room_id: null,
          room_number: null,
          rent_amount: null,
          payment_frequency: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          terms: '',
          is_signed: false,
          id: null,
          user_id: null,
        },
        billing: {
          country_id: null,
          city_id: null,
          street_id: null,
          state: '',
          zip_code: '',
          address_id: null,
        },
        payment: {
          property_title: '',
          room_number: '',
          room_id: null,
          amount: null,
          amount_display: 'N/A',
          payment_method_id: null,
          payment_type_id: null,
          currency: 'TZS',
          payment_details: { type: null },
          base_amount: null,
          service_charge: null,
          transaction_id: null,
        },
        availableRooms: [],
      },
      
      // Dropdown Data
      confirmedBookings: [],
      branches: [],
      approvedApplications: [],
      termPeriods: [],
      countries: [],
      cities: [],
      streets: [],
      paymentMethods: [],
      paymentTypes: [],
      pollingInterval: null,
    };
  },
  computed: {
    progressPercent() {
      return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    },
    computedPropertyTitle() {
      try {
        const baseTitle = this.propertyTitle || this.formData.payment.property_title || 'Unknown Property';
        const roomNumber = this.formData.lease.room_number;
        const isRoomBased = this.propertyType?.toLowerCase().includes('hostel') || 
                           this.propertyCategory?.toLowerCase().includes('hostel') ||
                           this.isRoomSelectionRequired;
        
        return isRoomBased && roomNumber ? `${baseTitle} - ${roomNumber}` : baseTitle;
      } catch (error) {
        console.error('Error in computedPropertyTitle:', error);
        return 'Property Title';
      }
    },
    
    isCurrentStepCompleted() {
      return this.completedSteps.includes(this.currentStep);
    },

canAccessStep() {
  return (step) => {
    const stepNumber = Number(step);
    if (stepNumber <= this.maxReachedStep) return true;
    if (stepNumber === 3) {
      return (
        this.completedSteps.includes(2) &&
        this.formData.application.isApproved &&
        !this.isApplicationPending
      );
    }
    if (stepNumber === 7) {
      const canAccess =
        this.completedSteps.includes(6) &&
        (this.formData.payment.status === 'completed' || 
         this.formData.payment.status === 'received');
      console.log('canAccessStep: Step 7 access check', {
        isAccessible: canAccess,
        paymentStatus: this.formData.payment.status,
        completedSteps: this.completedSteps,
        timestamp: new Date().toISOString(),
      });
      return canAccess;
    }
    if (stepNumber === this.maxReachedStep + 1 && this.isCurrentStepCompleted) {
      return true;
    }
    return false;
  };
},
    

    computedPropertyLocation() {
      let location = this.propertyLocation || 'Not specified';
      const roomNumber = this.formData.lease.room_number;
      const isRoomBased = this.propertyType?.toLowerCase().includes('hostel') || 
                         this.propertyCategory?.toLowerCase().includes('hostel') ||
                         this.isRoomSelectionRequired;
      
      return isRoomBased && roomNumber && !location.includes(roomNumber) ? 
        `${location} (${roomNumber})` : location;
    },
    computedPropertyType() {
      const baseType = this.propertyType || this.propertyCategory || 'Not specified';
      const roomNumber = this.formData.lease.room_number;
      
      return baseType?.toLowerCase().includes('hostel') && roomNumber ? 
        `${baseType} Room` : baseType;
    },
    paymentPropertyInfo() {
      return {
        title: this.computedPropertyTitle || this.formData.payment.property_title || 'Unknown Property',
        location: this.computedPropertyLocation || 'Not specified',
        type: this.computedPropertyType || 'Not specified',
        room_number: this.formData.lease.room_number || '',
        room_id: this.formData.lease.room_id || null,
        is_room_based: this.isRoomSelectionRequired,
        category: this.propertyCategory || this.propertyType || 'Not specified',
        lease_term: this.selectedTermPeriod ? {
          id: this.selectedTermPeriod.id,
          period: this.selectedTermPeriod.period_of_payment || 'Unknown',
          amount: parseFloat(this.selectedTermPeriod.amount) || 0,
          displayText: this.selectedTermPeriod.displayText || 
            `${this.selectedTermPeriod.period_of_payment.charAt(0).toUpperCase() + this.selectedTermPeriod.period_of_payment.slice(1)} - TZS ${(parseFloat(this.selectedTermPeriod.amount) || 0).toLocaleString()}`,
          monthly_rent: parseFloat(this.selectedTermPeriod.monthly_rent) || 0,
          base_amount: parseFloat(this.selectedTermPeriod.base_amount) || parseFloat(this.selectedTermPeriod.amount) || 0,
          service_charge: parseFloat(this.selectedTermPeriod.service_charge) || 0
        } : null
      };
    },
    getStepStatus() {
      return (step) => {
        if (this.completedSteps.includes(step)) return 'completed';
        if (step === this.currentStep) return 'active';
        if (step <= this.maxReachedStep) return 'accessible';
        return 'locked';
      };
    },
  nextButtonText() {
      switch (this.currentStep) {
        case 1: return 'Start Application →';
        case 2: return 'Submit Application →';
        case 3: return this.isLeaseCreated ? 'Sign Lease →' : 'Create Lease →';
        case 4: return this.formData.lease.is_signed ? 'Proceed to Billing →' : 'Sign Lease →';
        case 5: return 'Save Billing Address →';
        case 6: {
          if (this.$refs.paymentForm) {
            const formState = this.$refs.paymentForm.getFormState();
            if (formState.paymentCompleted && this.formData.payment.status === 'completed')
              return 'Continue to Complete →';
            if (formState.paymentReceived && formState.receiptUrl && this.formData.payment.status === 'received')
              return 'Review Receipt →';
            if (formState.paymentSubmitted && !formState.paymentCompleted)
              return 'Processing Payment...';
            if (formState.loading) return 'Processing...';
          }
          return 'Submit Payment →';
        }
        case 7: return 'Download Lease';
        default: return 'Next Step →';
      }
    },
    isPaymentValid() {
      const { payment_method_id, payment_type_id, payment_details } = this.formData.payment;
      if (!payment_method_id || !payment_type_id) return false;
      if (payment_details.type === 'bank_transfer') {
        return !!payment_details.token && !!payment_details.bank_name;
      } else if (payment_details.type === 'mobile') {
        return !!payment_details.phone_number;
      }
      return false;
    },
    selectedTermPeriod() {
  return (
    this.termPeriods.find(
      (p) => p.id === this.formData.lease.properties_term_period_id
    ) || (this.termPeriods.length > 0 ? this.termPeriods[0] : null)
  );
},
    paymentMultiplier() {
      const paymentFrequency = this.formData.lease.payment_frequency || 'monthly';
      const multipliers = {
        monthly: 1,
        quarterly: 3,
        yearly: 12,
      };
      return multipliers[paymentFrequency] || 1;
    },
    getPropertyTitle() {
      if (this.propertyTitle) return this.propertyTitle;
      const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
      return booking?.property_title || 'Unknown Property';
    },
  },
  mounted() {
    (async () => {
      try {
        await this.fetchConfirmedBookings();
        await this.loadPersistedState();
        this.validateSession();
        await this.fetchCountries();
        console.log('Property details:', {
          propertyTitle: this.propertyTitle,
          propertyId: this.propertyId,
          paymentPropertyTitle: this.formData.payment.property_title,
          bookingId: this.formData.bookingId,
        });
      } catch (error) {
        console.error('Error in mounted hook:', error);
        this.showSwal('Initialization Error', 'An error occurred while loading the application. Please try again.', 'error');
      }
    })();
  },
  beforeUnmount() {
    this.removeKeyboardListeners();
    this.stopPeriodicValidation();
    this.stopPollingApplicationStatus();
    this.stopPaymentPolling();
    this.removeBrowserEventListeners();
  },
  methods: {
    // Helper Methods
    showSwal(title, text, icon) {
      return Swal.fire({
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
        didOpen: (toast) => {
          toast.style.borderLeft = `4px solid ${icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6'}`;
          toast.style.borderRadius = '12px';
          toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
          toast.style.backdropFilter = 'blur(10px)';
        },
      });
    },

 async initiateLeaseSigning() {
  if (!this.validateSession()) return;

  // Check if lease ID exists
  if (!this.formData.lease.id) {
    this.errors.lease_signature = 'No lease found. Please create a lease in Step 3.';
    this.showSwal('Error', this.errors.lease_signature, 'error');
    this.currentStep = 3; // Redirect to lease creation step
    return;
  }

  // Check if lease is already signed
  if (this.formData.lease.is_signed) {
    this.showSwal('Lease Already Signed', 'The lease has already been signed. Proceeding to billing.', 'info');
    this.handleLeaseSigned(this.formData.lease); // Proceed to next step
    return;
  }

  // Verify LeaseSigner component
  if (!this.$refs.leaseSigner) {
    this.errors.lease_signature = 'Lease signing component is not available. Please try again or contact support.';
    this.showSwal('Error', this.errors.lease_signature, 'error');
    return;
  }

  this.loading = true;
  this.loadingText = 'Initiating lease signing...';
  try {
    await this.$refs.leaseSigner.initiateSign();
    // The LeaseSigner component should emit 'lease-signed' event on success
  } catch (error) {
    this.errors.lease_signature = this.handleError(error, 'Failed to initiate lease signing. Please try again.');
  } finally {
    this.loading = false;
    this.loadingText = '';
  }
},

  handleLeaseValidationErrors(errors) {
    this.leaseErrors = errors;
    if (Object.values(errors).some(error => error)) {
      console.log('Lease validation errors:', errors);
    }
  },

  clearLeaseErrors() {
    this.leaseErrors = {};
  },
    isNextButtonDisabled() {
  if (this.loading || this.isStepLocked) return true;
  if (this.currentStep === 2 && this.isApplicationPending) return true;

  if (this.currentStep === 6 && this.$refs.paymentForm) {
    try {
      if (typeof this.$refs.paymentForm.getFormState === 'function') {
        const formState = this.$refs.paymentForm.getFormState();
        // Disable if payment is loading, submitted but not completed, or not yet completed
        return (
          formState.loading ||
          (formState.paymentSubmitted && !formState.paymentCompleted) ||
          !this.formData.payment.status === 'completed'
        );
      }
      return true; // Disable if form state cannot be determined
    } catch (error) {
      console.error('Error getting payment form state:', error);
      return true; // Disable button on error to prevent progression
    }
  }

  return false;
},
    validateStepProgression() {
      if (this.currentStep > this.maxReachedStep + 1) {
        console.warn('Invalid step progression detected');
        this.currentStep = this.maxReachedStep;
        this.persistState();
        this.showSwal('Invalid Navigation', 'You cannot skip steps. Please complete them in order.', 'error');
        return false;
      }
      
      for (let i = 1; i < this.currentStep; i++) {
        if (!this.completedSteps.includes(i) && i < this.maxReachedStep) {
          console.warn(`Step ${i} should be completed before accessing step ${this.currentStep}`);
          return false;
        }
      }
      return true;
    },
    resetApplicationState() {
      if (confirm('Are you sure you want to reset the entire application? This cannot be undone.')) {
        this.clearPersistedState();
        this.currentStep = 1;
        this.maxReachedStep = 1;
        this.completedSteps = [];
        this.stepCompletionTimestamps = {};
        this.isApplicationPending = false;
        this.isLeaseCreated = false;
        this.hasShownApprovalAlert = false;
        
        this.formData = {
          bookingId: null,
          application: {
            id: null,
            property_id: null,
            branch_id: null,
            employment_status: '',
            nida_number: '',
            registration_number: '',
            annual_income: null,
            background_check_status: '',
            credit_report_status: '',
            status: 'pending',
            isApproved: false,
          },
          lease: {
            property_id: null,
            properties_term_period_id: null,
            room_id: null,
            room_number: null,
            rent_amount: null,
            payment_frequency: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            terms: '',
            is_signed: false,
            id: null,
            user_id: null,
          },
          billing: {
            country_id: null,
            city_id: null,
            street_id: null,
            state: '',
            zip_code: '',
            address_id: null,
          },
          payment: {
            property_title: '',
            room_number: '',
            room_id: null,
            amount: null,
            amount_display: 'N/A',
            payment_method_id: null,
            payment_type_id: null,
            currency: 'TZS',
            payment_details: { type: null },
            base_amount: null,
            service_charge: null,
            transaction_id: null,
          },
        };
        
        this.propertyId = null;
        this.propertyTitle = '';
        this.propertyImage = '';
        this.propertyLocation = '';
        this.propertyType = '';
        this.propertyCategory = '';
        
        this.errors = {};
        this.errorMessage = '';
        
        this.showSwal('Application Reset', 'Application has been reset to the beginning.', 'info');
        this.fetchConfirmedBookings();
      }
    },
    validateStepCompletion(step) {
  switch (step) {
    case 1:
      return !!this.formData.bookingId;
    case 2:
      if (this.isApplicationPending) return true;
      return !!(
        this.formData.application.branch_id &&
        this.formData.application.employment_status &&
        this.formData.application.nida_number &&
        this.formData.application.annual_income &&
        this.formData.application.background_check_status &&
        this.formData.application.credit_report_status
      );
    case 3:
      return !!(this.formData.lease.id && this.isLeaseCreated);
    case 4:
      return !!this.formData.lease.is_signed;
    case 5:
      return !!this.formData.billing.address_id;
    case 6:
      return !!(
        this.formData.payment.id &&
        this.formData.payment.transaction_id &&
        (this.formData.payment.status === 'completed' ||
         (this.formData.payment.status === 'received' && this.formData.payment.receipt_url)) &&
        this.$refs.paymentForm?.getFormState?.()?.receiptUrl
      );
    case 7:
      return true;
    default:
      return false;
  }
},
    checkAndMarkCompletedSteps() {
      for (let step = 1; step <= this.totalSteps; step++) {
        if (!this.completedSteps.includes(step) && this.validateStepCompletion(step)) {
          this.markStepCompleted(step);
        }
      }
    },
    validateSessionAndProgression() {
      if (!this.validateSession()) {
        return false;
      }
      if (!this.validateStepProgression()) {
        return false;
      }
      return true;
    },
    handleBeforeUnload(event) {
      if (this.loading && this.currentStep < this.totalSteps) {
        event.preventDefault();
        event.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        return event.returnValue;
      }
    },
    addBrowserEventListeners() {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      window.addEventListener('popstate', (event) => {
        if (this.currentStep > 1 && this.currentStep < this.totalSteps) {
          event.preventDefault();
          history.pushState(null, null, location.href);
          this.showSwal(
            'Navigation Blocked', 
            'Please complete the application process. You cannot use browser navigation during the rental application.', 
            'warning'
          );
        }
      });
      
      if (this.currentStep > 1) {
        history.pushState(null, null, location.href);
      }
    },
    removeBrowserEventListeners() {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    },
    handleStepError(error, step, defaultMessage) {
      const stepName = this.stepLabels[step - 1] || `Step ${step}`;
      const message = error.response?.data?.message || error.message || defaultMessage;
      
      console.error(`Error in ${stepName}:`, error);
      this.showSwal(`${stepName} Error`, message, 'error');
      this.loading = false;
      this.loadingText = '';
      this.isStepLocked = false;
      
      if (error.response?.status === 422 || message.includes('booking') || message.includes('property')) {
        const targetStep = this.determineErrorFallbackStep(error);
        if (targetStep < this.currentStep) {
          this.currentStep = targetStep;
          this.persistState();
        }
      }
      return message;
    },
    determineErrorFallbackStep(error) {
      const message = error.response?.data?.message || error.message || '';
      if (message.includes('booking') || message.includes('property')) return 1;
      if (message.includes('application') || message.includes('approval')) return 2;
      if (message.includes('lease')) return 3;
      if (message.includes('billing') || message.includes('address')) return 5;
      return this.currentStep;
    },
    startPeriodicValidation() {
      this.validationInterval = setInterval(() => {
        this.checkAndMarkCompletedSteps();
        this.validateStepProgression();
      }, 30000);
    },
    stopPeriodicValidation() {
      if (this.validationInterval) {
        clearInterval(this.validationInterval);
        this.validationInterval = null;
      }
    },
    async initializeComponent() {
      try {
        this.addBrowserEventListeners();
        await this.loadPersistedState();
        
        if (!this.validateSessionAndProgression()) {
          return;
        }
        
        await this.fetchConfirmedBookings();
        await this.fetchCountries();
        this.checkAndMarkCompletedSteps();
        this.startPeriodicValidation();
        
        console.log('Component initialized with state:', {
          currentStep: this.currentStep,
          maxReachedStep: this.maxReachedStep,
          completedSteps: this.completedSteps,
          propertyTitle: this.propertyTitle,
          bookingId: this.formData.bookingId
        });
      } catch (error) {
        console.error('Error initializing component:', error);
        this.showSwal('Initialization Error', 'Failed to initialize application. Please refresh the page.', 'error');
      }
    },
async handlePaymentSubmission({ paymentId, transactionId, status, receiptUrl, receiptNumber }) {
  if (!paymentId) {
    console.error('handlePaymentSubmission: No payment ID provided', {
      timestamp: new Date().toISOString(),
    });
    this.showSwal('Error', 'Payment ID not provided by the server.', 'error');
    this.isPaymentPending = false;
    return;
  }

  this.formData.payment.id = paymentId;
  this.formData.payment.transaction_id = transactionId;
  this.formData.payment.status = status || 'pending';
  this.formData.payment.receipt_url = receiptUrl || null;
  this.formData.payment.receipt_number = receiptNumber || null;
  this.isPaymentPending = true;
  this.persistState();
  this.showSwal('Payment Submitted', 'Your payment is being processed. Please wait for confirmation.', 'info');
  this.startPaymentPolling();
},

    handlePaymentCancelled() {
      this.isPaymentPending = false;
      this.formData.payment.status = 'cancelled';
      this.stopPaymentPolling();
      this.persistState();
      this.showSwal('Payment Cancelled', 'The payment process was cancelled. Please try again.', 'warning');
    },


startPaymentPolling() {
      if (this.pollingInterval) {
        console.log('startPaymentPolling: Polling already active', { timestamp: new Date().toISOString() });
        return;
      }

      this.pollingAttempts = 0;
      this.stopPaymentPolling();

      this.pollingInterval = setInterval(() => {
        this.pollingAttempts++;
        if (this.pollingAttempts > this.maxPollingAttempts) {
          this.stopPaymentPolling();
          this.showSwal('Timeout', 'Payment verification timed out. Please try again or contact support.', 'error');
          this.isPaymentPending = false;
          this.persistState();
          return;
        }
        this.checkPaymentStatus();
      }, 10000);

      this.pollingTimeout = setTimeout(() => {
        this.stopPaymentPolling();
        this.showSwal('Timeout', 'Payment verification timed out. Please try again or contact support.', 'error');
        this.isPaymentPending = false;
        this.persistState();
      }, 300000);

      console.log('startPaymentPolling: Started', {
        interval: 10000,
        maxAttempts: this.maxPollingAttempts,
        timestamp: new Date().toISOString(),
      });
    },

async checkPaymentStatus() {
  if (!this.formData.payment.id || !this.isPaymentPending || this.isUpdatingPayment) {
    console.warn('checkPaymentStatus: Skipping', {
      paymentId: this.formData.payment.id,
      isPaymentPending: this.isPaymentPending,
      isUpdatingPayment: this.isUpdatingPayment,
      timestamp: new Date().toISOString(),
    });
    this.stopPaymentPolling();
    if (!this.formData.payment.id) {
      this.showSwal('Error', 'No payment ID found. Please try submitting the payment again.', 'error');
      this.isPaymentPending = false;
      this.persistState();
    }
    return;
  }

  this.isUpdatingPayment = true;
  this.loading = true;
  this.loadingText = `Checking payment status... Attempt ${this.pollingAttempts}/${this.maxPollingAttempts}`;

  try {
    this.abortController = new AbortController();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), this.requestTimeout);
    });

    const requestPromise = makeRequest({
      method: 'GET',
      url: `${this.API_BASE_URL}/v1/payments/${this.formData.payment.id}/status`,
      headers: { Authorization: `Bearer ${this.authStore.token}` },
      requiresAuth: true,
      signal: this.abortController.signal,
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);
    const paymentData = response.data?.data;

    if (!paymentData) throw new Error('No payment data returned');

    console.log('checkPaymentStatus: Response', {
      status: paymentData?.status,
      paymentId: this.formData.payment.id,
      receiptUrl: paymentData?.receipt_url,
      attempt: this.pollingAttempts,
      timestamp: new Date().toISOString(),
    });

    this.formData.payment.status = paymentData.status;
    this.formData.payment.receipt_url = paymentData.receipt_url || this.formData.payment.receipt_url;
    this.formData.payment.receipt_number = paymentData.receipt_number || this.formData.payment.receipt_number;
    this.persistState();

    if (paymentData.status === 'completed') {
      this.stopPaymentPolling();
      this.handlePaymentCompleted({
        paymentId: paymentData.id,
        transactionId: paymentData.transaction_id,
        status: paymentData.status,
        receiptUrl: paymentData.receipt_url,
        receiptNumber: paymentData.receipt_number,
      });
    } else if (paymentData.status === 'received' && paymentData.receipt_url) {
      this.handlePaymentReceived({
        paymentId: paymentData.id,
        transactionId: paymentData.transaction_id,
        status: paymentData.status,
        receiptUrl: paymentData.receipt_url,
        receiptNumber: paymentData.receipt_number,
      });
    } else if (paymentData.status === 'failed') {
      this.stopPaymentPolling();
      this.handlePaymentFailure(new Error(paymentData.message || 'Payment failed'));
    } else if (paymentData.status === 'cancelled') {
      this.stopPaymentPolling();
      this.handlePaymentCancelled();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('checkPaymentStatus: Aborted', {
        paymentId: this.formData.payment.id,
        attempt: this.pollingAttempts,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.error('checkPaymentStatus: Failed', {
      error: error.message,
      paymentId: this.formData.payment.id,
      attempt: this.pollingAttempts,
      timestamp: new Date().toISOString(),
    });

    if (error.response?.status === 404) {
      this.stopPaymentPolling();
      this.showSwal('Error', 'Payment not found. Please try submitting the payment again.', 'error');
      this.isPaymentPending = false;
      this.formData.payment.id = null;
      this.persistState();
      return;
    }

    if (this.pollingAttempts < this.maxPollingAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.pollingAttempts), 30000);
      console.log('checkPaymentStatus: Retrying', {
        delay,
        attempt: this.pollingAttempts,
        timestamp: new Date().toISOString(),
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    } else {
      this.stopPaymentPolling();
      this.showSwal('Error', 'Failed to check payment status. Please try again or contact support.', 'error');
      this.isPaymentPending = false;
      this.formData.payment.id = null;
      this.persistState();
    }
  } finally {
    this.isUpdatingPayment = false;
    this.loading = false;
    this.loadingText = '';
  }
},

    stopPaymentPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.pollingAttempts = 0;
    console.log('stopPaymentPolling: Polling stopped', { timestamp: new Date().toISOString() });
  },

    handlePaymentSuccess(paymentData) {
      this.isPaymentPending = false;
      this.loading = false;
      this.loadingText = '';
      this.formData.payment.status = 'completed'; // Update payment status
      this.formData.payment.id = paymentData.id || this.formData.payment.id;
      this.formData.payment.transaction_id =
        paymentData.transaction_id || this.formData.payment.transaction_id;
      this.markStepCompleted(6);
      this.currentStep = 7;
      this.maxReachedStep = Math.max(this.maxReachedStep, 7);
      this.persistState();
      this.showSwal(
        'Payment Completed',
        'Your payment was successful! You can now download your lease agreement.',
        'success'
      );
    },
handlePaymentCompleted({ paymentId, transactionId, status, receiptUrl, receiptNumber }) {
  console.log('handlePaymentCompleted:', {
    paymentId,
    transactionId,
    status,
    receiptUrl,
    receiptNumber,
    timestamp: new Date().toISOString(),
  });
  this.formData.payment.id = paymentId;
  this.formData.payment.transaction_id = transactionId;
  this.formData.payment.status = 'completed'; // Normalize to 'completed' for consistency
  this.formData.payment.receipt_url = receiptUrl;
  this.formData.payment.receipt_number = receiptNumber || `RCP-${Date.now()}`;
  this.isPaymentPending = false;

  if (!this.completedSteps.includes(6)) {
    this.markStepCompleted(6);
  }

  this.currentStep = 7;
  this.maxReachedStep = Math.max(this.maxReachedStep, 7);
  this.persistState();
  this.stopPaymentPolling(); // Stop polling since child already handles it on status change
  this.showSwal('Payment Completed', 'Your payment has been successfully processed and receipt downloaded.', 'success');
},


    handlePaymentFailure(error) {
      this.isPaymentPending = false;
      this.loading = false;
      this.loadingText = '';
      this.showSwal('Payment Failed', error.message || 'Payment processing failed. Please try again.', 'error');
      this.persistState();
    },

async handlePaymentReceived({ paymentId, transactionId, status, receiptUrl, receiptNumber }) {
  console.log('handlePaymentReceived:', { paymentId, transactionId, status, receiptUrl, receiptNumber });
  this.formData.payment.id = paymentId;
  this.formData.payment.transaction_id = transactionId;
  this.formData.payment.status = status;
  this.formData.payment.receipt_url = receiptUrl;
  this.formData.payment.receipt_number = receiptNumber || `RCP-${Date.now()}`;
  this.isPaymentPending = false;

  // Ensure Step 6 is marked as completed
  if (!this.completedSteps.includes(6)) {
    this.markStepCompleted(6);
  }

  this.currentStep = 7;
  this.maxReachedStep = Math.max(this.maxReachedStep, 7);
  this.persistState();
  this.stopPaymentPolling();

  // Automatically trigger receipt download
  try {
    if (!this.formData.payment.receipt_url) {
      console.log('[DEBUG] No receipt URL, generating receipt');
      await this.generateReceipt();
    }
    await this.downloadReceipt();
    this.showSwal('Payment Received', 'Payment receipt has been generated and downloaded.', 'success');
  } catch (error) {
    console.error('[DEBUG] downloadReceipt error:', error);
    this.showSwal('Download Error', 'Payment received, but failed to download receipt. Please try downloading manually.', 'warning');
  }
},

async generateReceipt() {
  this.loading = true;
  this.loadingText = 'Generating receipt...';
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const receiptNum = this.formData.payment.receipt_number || `RCP-${Date.now()}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = 20;

    // Simplified receipt content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PAYMENT RECEIPT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Receipt No: ${receiptNum}`, margin, yPosition);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;
    doc.text(`Transaction ID: ${this.formData.payment.transaction_id || 'N/A'}`, margin, yPosition);
    yPosition += 10;
    doc.text(`Amount: TZS ${this.getTotalAmount().toLocaleString()}`, margin, yPosition);

    this.formData.payment.receipt_url = doc.output('datauristring');
    this.formData.payment.receipt_number = receiptNum;
    console.log('[DEBUG] Receipt generated:', {
      receiptNumber: receiptNum,
      receiptUrl: this.formData.payment.receipt_url ? 'data:application/pdf;base64,...(truncated)' : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DEBUG] generateReceipt error:', error);
    this.formData.payment.receipt_url = 'https://example.com/fallback-receipt.pdf';
    this.showSwal('Error', 'Failed to generate receipt. Using fallback URL.', 'warning');
  } finally {
    this.loading = false;
    this.loadingText = '';
  }
},

async downloadReceipt() {
  if (!this.validateSession()) {
    this.showSwal('Session Expired', 'Please log in again.', 'error');
    return;
  }
  if (!this.formData.payment.receipt_url) {
    this.showSwal('Error', 'No receipt URL found.', 'error');
    return;
  }
  this.loading = true;
  this.loadingText = 'Generating receipt...';
  try {
    const receiptWindow = window.open(this.formData.payment.receipt_url, '_blank');
    if (!receiptWindow) {
      throw new Error('Failed to open receipt. Please allow pop-ups.');
    }
    this.showSwal('Receipt Downloaded', 'Receipt opened in a new tab.', 'success');
  } catch (error) {
    console.error('downloadReceipt error:', error);
    this.showSwal('Error', 'Failed to download receipt.', 'error');
    throw error;
  } finally {
    this.loading = false;
    this.loadingText = '';
  }
},
    

    handleViewAgreement() {
      if (this.formData.lease.id && this.formData.payment.receipt_url) {
        window.open(this.formData.payment.receipt_url, '_blank');
      } else {
        this.showSwal('Error', 'No lease agreement or receipt available to view.', 'error');
      }
    },
    // Added: Handle viewing the lease agreement
    handleViewAgreement() {
      if (this.formData.lease.id && this.formData.payment.receipt_url) {
        window.open(this.formData.payment.receipt_url, '_blank');
      } else {
        this.showSwal('Error', 'No lease agreement or receipt available to view.', 'error');
      }
    },

handleBillingContinue() {
    if (!this.formData.billing.address_id) {
      this.errors.billing_address_id = 'Billing address ID is missing. Please save your billing address.';
      this.showSwal('Error', this.errors.billing_address_id, 'error');
      return;
    }
    this.errors.billing_address_id = null;
    this.markStepCompleted(5);
    this.currentStep = 6;
    this.maxReachedStep = Math.max(this.maxReachedStep, 6);
    this.persistState();
    this.fetchPaymentMethods();
    this.showSwal('Billing Address Saved', 'Proceeding to payment step.', 'success');
  },

  updateBilling(updatedBilling) {
    this.formData.billing = { ...this.formData.billing, ...updatedBilling };
    if (updatedBilling.address_id) {
      this.formData.billing.address_id = updatedBilling.address_id;
    }
    this.persistState();
  },
    // State Management
    validateSession() {
      if (!this.authStore.token || !AuthMiddleware.isSessionValid()) {
        this.errorMessage = 'Session expired. Please log in again.';
        localStorage.setItem('rentalApplicationReturnStep', JSON.stringify({
          step: this.currentStep,
          route: this.$route.fullPath
        }));
        this.showSwal('Session Expired', this.errorMessage, 'error').then(() => {
          this.clearSession();
          this.$router.push({ path: '/login', query: { returnTo: this.$route.fullPath } });
        });
        return false;
      }
      return true;
    },
    isSessionValid() {
      return AuthMiddleware.isSessionValid();
    },
    getUserInfo() {
      if (this.authStore.userProfile) {
        return { id: this.authStore.userProfile.id, roles: this.authStore.userProfile.roles || [], ...this.authStore.userProfile };
      }
      try {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('userProfile');
        if (storedUser) return JSON.parse(storedUser);
      } catch (error) {
        console.warn('Error parsing user data from localStorage:', error);
      }
      try {
        const token = this.getAuthToken();
        if (token) return JSON.parse(atob(token.split('.')[1]));
      } catch (error) {
        console.warn('Error parsing token payload:', error);
      }
      return null;
    },
    getAuthToken() {
      return this.authStore.token || localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || null;
    },
    handleError(error, defaultMessage) {
      const message = error.response?.data?.message || error.message || defaultMessage;
      console.error('Error:', error);
      this.showSwal('Error', message, 'error');
      this.loading = false;
      this.loadingText = '';
      return message;
    },
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
 
    handlePaymentSuccess(paymentData) {
    this.isPaymentPending = false;
    this.loading = false;
    this.loadingText = '';
    this.markStepCompleted(6);
    this.currentStep = 7;
    this.maxReachedStep = Math.max(this.maxReachedStep, 7);
    this.persistState();
    this.showSwal('Payment Completed', 'Your payment was successful! You can now download your lease agreement.', 'success');
  },
    
  //  handlePaymentFailure(error) {
  //   this.isPaymentPending = false;
  //   this.loading = false;
  //   this.loadingText = '';
  //   this.showSwal('Payment Failed', error.message || 'Payment processing failed. Please try again.', 'error');
  // },
    persistState() {
      const userInfo = this.getUserInfo();
      const state = {
        userId: userInfo?.id,
        timestamp: Date.now(),
        currentStep: this.currentStep,
        maxReachedStep: this.maxReachedStep,
        completedSteps: [...this.completedSteps],
        stepCompletionTimestamps: { ...this.stepCompletionTimestamps },
        isApplicationPending: this.isApplicationPending,
        isLeaseCreated: this.isLeaseCreated,
        hasShownApprovalAlert: this.hasShownApprovalAlert,
        bookingId: this.formData.bookingId,
        propertyId: this.propertyId,
        propertyTitle: this.propertyTitle,
        propertyImage: this.propertyImage,
        propertyLocation: this.propertyLocation,
        propertyType: this.propertyType,
        propertyCategory: this.propertyCategory,
        isRoomSelectionRequired: this.isRoomSelectionRequired,
        applicationId: this.formData.application.id,
        leaseId: this.formData.lease.id,
        leaseUserId: this.formData.lease.user_id,
        roomId: this.formData.lease.room_id,
        roomNumber: this.formData.lease.room_number,
        payment: {
          amount: this.formData.payment.amount,
          amount_display: this.formData.payment.amount_display,
          base_amount: this.formData.payment.base_amount,
          service_charge: this.formData.payment.service_charge,
          property_title: this.formData.payment.property_title,
          room_number: this.formData.payment.room_number,
          room_id: this.formData.payment.room_id,
          id: this.formData.payment.id,
          transaction_id: this.formData.payment.transaction_id,
        },
        formDataSnapshot: {
          application: { ...this.formData.application },
          lease: { ...this.formData.lease },
          billing: { ...this.formData.billing },
          payment: { ...this.formData.payment }
        }
      };
      localStorage.setItem('rentalApplicationState_v2', JSON.stringify(state));
    },
    async loadPersistedState() {
      let savedState = localStorage.getItem('rentalApplicationState_v2');
      if (!savedState) return;
      try {
        const state = JSON.parse(savedState);
        const currentUser = this.getUserInfo();
        if (state.userId && currentUser?.id && state.userId !== currentUser.id) {
          this.clearPersistedState();
          return;
        }
        const maxAge = 24 * 60 * 60 * 1000;
        if (state.timestamp && (Date.now() - state.timestamp > maxAge)) {
          this.clearPersistedState();
          return;
        }
        // Restore state
        this.completedSteps = state.completedSteps || [];
        this.maxReachedStep = state.maxReachedStep || 1;
        this.stepCompletionTimestamps = state.stepCompletionTimestamps || {};
        this.currentStep = this.canAccessStep(state.currentStep) ? state.currentStep : this.maxReachedStep;
        this.isApplicationPending = !!state.isApplicationPending && !!state.formDataSnapshot?.application?.id;
        this.isLeaseCreated = !!state.isLeaseCreated;
        this.propertyId = state.propertyId || null;
        this.propertyTitle = state.propertyTitle || '';
        this.propertyImage = state.propertyImage || '';
        this.propertyLocation = state.propertyLocation || '';
        this.propertyType = state.propertyType || '';
        this.formData.bookingId = state.bookingId || null;
        this.hasShownApprovalAlert = state.hasShownApprovalAlert || false;
        this.propertyCategory = state.propertyCategory || '';
        this.isRoomSelectionRequired = state.isRoomSelectionRequired !== undefined ? state.isRoomSelectionRequired : true;
        if (state.formDataSnapshot) {
          this.formData.application = { ...this.formData.application, ...state.formDataSnapshot.application };
          this.formData.lease = { ...this.formData.lease, ...state.formDataSnapshot.lease };
          this.formData.billing = { ...this.formData.billing, ...state.formDataSnapshot.billing };
          this.formData.payment = { ...this.formData.payment, ...state.formDataSnapshot.payment };
        }
        // Fetch additional data based on step
        if (this.propertyId && !this.propertyTitle) {
          await this.fetchPropertyDetails(this.propertyId);
        }
        if (this.formData.application.id && this.currentStep >= 2) {
          await this.checkApplicationStatus();
        }
        if (this.currentStep === 2) await this.fetchBranches();
        if (this.currentStep === 3) {
          await Promise.all([this.fetchTermPeriods(this.propertyId), this.fetchAvailableRooms()]);
        }
        if (this.currentStep === 6) {
          await Promise.all([this.fetchTermPeriods(this.propertyId), this.fetchPropertyDetails(this.propertyId), this.fetchPaymentMethods()]);
        }
      } catch (error) {
        console.warn('Failed to load persisted state:', error);
        this.clearPersistedState();
      }
    },
    markStepCompleted(step) {
      if (!this.completedSteps.includes(step)) {
        this.completedSteps = [...this.completedSteps, step];
        this.stepCompletionTimestamps[step] = Date.now();
      }
      this.maxReachedStep = Math.max(this.maxReachedStep, step);
    },
    advanceToNextStep() {
      this.markStepCompleted(this.currentStep);
      const nextStep = this.currentStep + 1;
      if (nextStep <= this.totalSteps) {
        this.currentStep = nextStep;
        this.maxReachedStep = Math.max(this.maxReachedStep, nextStep);
        this.persistState();
      }
    },
    handleStepClick(step) {
      if (this.loading || this.isStepLocked) return;
      
      if (!this.canAccessStep(step)) {
        this.showSwal(
          'Step Locked', 
          `You must complete steps in order. Please complete step ${this.currentStep} first.`, 
          'warning'
        );
        return;
      }
      this.goToStep(step);
    },
    clearPersistedState() {
      localStorage.removeItem('rentalApplicationState');
      localStorage.removeItem('rentalApplicationState_v2');
      this.hasShownApprovalAlert = false;
      this.completedSteps = [];
      this.maxReachedStep = 1;
      this.stepCompletionTimestamps = {};
      this.currentStep = 1;
    },
    handleBrowserRefresh() {
      if (this.currentStep > this.maxReachedStep) {
        this.currentStep = this.maxReachedStep;
        this.persistState();
      }
    },
    // Data Fetching Methods
     mapBookingData(booking) {
        if (!booking || !booking.booking_id || !booking.rooms || !booking.rooms.length) {
          console.error('Invalid booking data:', booking);
          return null;
        }
        const room = booking.rooms[0];
        return {
          id: Number(booking.booking_id),
          property_id: Number(room.property_id),
          property_title: room.property?.title || 'Unknown Property',
          room_id: Number(room.id),
          room_number: room.room_number || `Room ${room.id}`,
          rent: parseFloat(room.rent) || 0,
          size: parseFloat(room.size) || 0,
          description: room.description || 'No description available',
          display_text: `${room.property?.title || 'Unknown Property'} - ${room.room_number || `Room ${room.id}`} (TZS ${parseFloat(room.rent || 0).toLocaleString()})`,
          is_available: room.is_available,
          client_id: Number(booking.client_id),
          status: booking.status,
          display_status: booking.status === 'completed' ? 'Lease Created' : 'Confirmed',
        };
      },
    async fetchConfirmedBookings() {
      if (!this.isSessionValid()) return;
      this.loading = true;
      this.loadingText = 'Loading bookings...';
      try {
        const statusFilter = this.currentStep >= 4 ? 'confirmed,completed' : 'confirmed';
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/bookings?client_id=${this.authStore.userProfile?.id}&status=${statusFilter}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.confirmedBookings = (await Promise.all(
          (response.data?.data || []).map(booking => this.mapBookingData(booking))
        )).filter(booking => booking !== null);
        console.log('Mapped confirmed bookings:', this.confirmedBookings);
        if (!this.confirmedBookings.length) {
          this.errorMessage = 'No confirmed bookings available.';
          this.showSwal('No Bookings', this.errorMessage, 'info');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch bookings.');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
     // Enhanced lease period fetch
async fetchTermPeriods(propertyId) {
  try {
    this.loading = true;
    this.loadingText = 'Loading lease options...';
    
    console.log('Fetching term periods for propertyId:', propertyId);
    const response = await makeRequest({
      method: 'GET',
      url: `${this.API_BASE_URL}/v1/tenant/leases/term-periods/${propertyId}`,
      headers: { 
        Authorization: `Bearer ${this.authStore.token}`,
        'Accept': 'application/json'
      },
      requiresAuth: true,
    });
    
    console.log('Raw term periods response:', response.data);
    
    const termPeriods = Array.isArray(response.data) ? response.data : response.data?.data || [];
    this.termPeriods = termPeriods
      .filter(period => period && period.id)
      .map(period => ({
        id: parseInt(period.id),
        period_of_payment: period.period_of_payment || 'quarterly',
        amount: parseFloat(period.amount) || 0,
        base_amount: parseFloat(period.base_amount) || parseFloat(period.amount) || 0,
        service_charge: parseFloat(period.service_charge) || 0,
        displayText: `${(period.period_of_payment || 'quarterly').charAt(0).toUpperCase() + (period.period_of_payment || 'quarterly').slice(1)} - TZS ${(parseFloat(period.amount) || 0).toLocaleString()}`,
        property_id: parseInt(period.property_id) || propertyId,
        user_id: parseInt(period.user_id) || this.authStore.userProfile?.id || 0,
        is_active: period.is_active !== undefined ? period.is_active : true,
        effective_from: period.effective_from || new Date().toISOString(),
        notes: period.notes || null,
        monthly_amount: parseFloat(period.monthly_amount) || parseFloat(period.amount) || 0,
      }));
    
    if (!this.termPeriods.length) {
      throw new Error('No lease term periods available');
    }
    
    console.log('fetchTermPeriods: Term periods loaded', {
      termPeriodsCount: this.termPeriods.length,
      amounts: this.termPeriods.map(p => p.amount),
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Failed to fetch term periods:', error);
    this.termPeriods = [];
    let errorMessage = 'Failed to load lease options. Please try again or contact support.';
    if (error.response?.status === 404) {
      errorMessage = 'No lease term periods found for this property.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Session expired. Please log in again.';
    }
    this.showSwal('Error', errorMessage, 'error');
    throw error;
  } finally {
    this.loading = false;
    this.loadingText = '';
  }
},

    async fetchLease(leaseId) {
      this.loading = true;
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/leases/${leaseId}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        const lease = response.data.data;
        this.formData.lease = { ...this.formData.lease, ...lease };
        this.formData.payment.amount = lease.rent_amount;
        this.formData.payment.amount_display = `TZS ${lease.rent_amount.toLocaleString()}`;
        this.formData.payment.base_amount = lease.base_amount || lease.rent_amount;
        this.formData.payment.service_charge = lease.service_charge || 0;
        this.propertyId = lease.property_id;
        this.propertyTitle = lease.property_title || this.propertyTitle;
        this.formData.payment.property_title = this.propertyTitle;
        await this.fetchTermPeriods(this.propertyId);
        this.onTermPeriodChange();
      } catch (error) {
        this.handleError(error, 'Failed to fetch lease data.');
      } finally {
        this.loading = false;
      }
    },
    updatePayment(updatedPayment) {
  if (JSON.stringify(this.formData.payment) === JSON.stringify(updatedPayment)) return;
  
  // Create a new object to avoid reference issues
  this.formData.payment = { ...this.formData.payment, ...updatedPayment };
  
  // Ensure receipt URL and number are properly set
  if (updatedPayment.receipt_url) {
    this.formData.payment.receipt_url = updatedPayment.receipt_url;
  }
  if (updatedPayment.receipt_number) {
    this.formData.payment.receipt_number = updatedPayment.receipt_number;
  }
  
  this.persistState();
  
  // If payment status is received and receipt URL is available, ensure the PaymentForm shows the receipt step
  if (this.formData.payment.status === 'received' && this.formData.payment.receipt_url && this.$refs.paymentForm) {
    this.$nextTick(() => {
      this.$refs.paymentForm.currentStep = 'receipt';
    });
  }
},
    
     async fetchAvailableRooms() {
        if (!this.propertyId) {
          this.showSwal('Error', 'Property ID is missing. Please select a booking first.', 'error');
          return;
        }
        
        try {
          this.loading = true;
          this.loadingText = 'Searching available rooms...';
          
          // Get booking's room if available
          let bookingRoom = null;
          if (this.formData.bookingId) {
            const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
            if (booking && booking.room_id && booking.property_id === this.propertyId) {
              bookingRoom = {
                id: booking.room_id,
                room_number: booking.room_number || `Room ${booking.room_id}`,
                size: booking.size || 0,
                rent: booking.rent || 0,
                description: booking.description || 'From your confirmed booking',
                is_available: true,
              };
            }
          }
          
          // Fetch available rooms from API
          const query = {
            property_id: this.propertyId,
            start_date: this.formData.lease.start_date,
            end_date: this.formData.lease.end_date,
          };
          
          const response = await makeRequest({
            method: 'GET',
            url: `${this.API_BASE_URL}/v1/leases/available-rooms/${this.propertyId}`,
            params: query,
            headers: { Authorization: `Bearer ${this.authStore.token}` },
            requiresAuth: true,
          });
          
          // Process API response
          this.availableRooms = (response.data?.data || []).map(room => ({
            id: parseInt(room.id),
            room_number: room.room_number || `Room ${room.id}`,
            size: parseFloat(room.size) || 0,
            rent: parseFloat(room.rent) || 0,
            description: room.description || 'No description available',
            is_available: room.is_available === '1' || room.is_available === true,
          }));
          
          // Add booking room to the list if not included
          if (bookingRoom && !this.availableRooms.find(room => room.id === bookingRoom.id)) {
            this.availableRooms.unshift(bookingRoom);
          }
          
          // Auto-select booking room if available
          if (bookingRoom && !this.formData.lease.room_id) {
            this.formData.lease.room_id = bookingRoom.id;
            this.formData.lease.room_number = bookingRoom.room_number;
            this.formData.lease.rent_amount = bookingRoom.rent;
            this.formData.lease.description = bookingRoom.description;
            this.formData.payment.amount = bookingRoom.rent;
            this.formData.payment.amount_display = `TZS ${bookingRoom.rent.toLocaleString()}`;
            this.formData.payment.room_id = bookingRoom.id;
            this.formData.payment.room_number = bookingRoom.room_number;
          } else if (this.availableRooms.length === 1 && !this.formData.lease.room_id) {
            // Only one room available, select it
            this.formData.lease.room_id = this.availableRooms[0].id;
            this.formData.lease.room_number = this.availableRooms[0].room_number;
            this.formData.lease.rent_amount = this.availableRooms[0].rent;
            this.formData.lease.description = this.availableRooms[0].description;
            this.formData.payment.amount = this.availableRooms[0].rent;
            this.formData.payment.amount_display = `TZS ${this.availableRooms[0].rent.toLocaleString()}`;
            this.formData.payment.room_id = this.availableRooms[0].id;
            this.formData.payment.room_number = this.availableRooms[0].room_number;
          } else if (this.availableRooms.length > 0 && this.formData.lease.room_id) {
            // Verify selected room is still available
            const selectedRoom = this.availableRooms.find(room => room.id === this.formData.lease.room_id);
            if (!selectedRoom || !selectedRoom.is_available) {
              this.formData.lease.room_id = bookingRoom?.id || null;
              this.formData.lease.room_number = bookingRoom?.room_number || null;
              this.formData.lease.rent_amount = bookingRoom?.rent || null;
              this.formData.lease.description = bookingRoom?.description || null;
              this.formData.payment.amount = bookingRoom?.rent || null;
              this.formData.payment.amount_display = bookingRoom?.rent ? `TZS ${bookingRoom.rent.toLocaleString()}` : 'N/A';
              this.formData.payment.room_id = bookingRoom?.id || null;
              this.formData.payment.room_number = bookingRoom?.room_number || null;
              this.showSwal('Room Unavailable', 'The selected room is no longer available. Please choose another.', 'warning');
            }
          }
          
          if (this.availableRooms.length === 0 && !bookingRoom) {
            this.showSwal('No Rooms Available', 'No rooms are currently available for this property.', 'warning');
          }
          
          this.persistState();
        } catch (error) {
          console.error('Failed to fetch available rooms:', error);
          
          // Fallback to booking room if API fails
          let bookingRoom = null;
          if (this.formData.bookingId) {
            const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
            if (booking && booking.room_id && booking.property_id === this.propertyId) {
              bookingRoom = {
                id: booking.room_id,
                room_number: booking.room_number || `Room ${booking.room_id}`,
                size: booking.size || 0,
                rent: booking.rent || 0,
                description: booking.description || 'From confirmed booking (API error fallback)',
                is_available: true,
              };
            }
          }
          
          if (bookingRoom) {
            this.availableRooms = [bookingRoom];
            this.formData.lease.room_id = bookingRoom.id;
            this.formData.lease.room_number = bookingRoom.room_number;
            this.formData.lease.rent_amount = bookingRoom.rent;
            this.formData.lease.description = bookingRoom.description;
            this.formData.payment.amount = bookingRoom.rent;
            this.formData.payment.amount_display = `TZS ${bookingRoom.rent.toLocaleString()}`;
            this.formData.payment.room_id = bookingRoom.id;
            this.formData.payment.room_number = bookingRoom.room_number;
            this.showSwal('Room Service Issue', 'Unable to fetch available rooms. Using your confirmed booking room.', 'warning');
          } else {
            this.availableRooms = [];
            this.showSwal('Error', 'Failed to load available rooms and no booking room found.', 'error');
          }
        } finally {
          this.loading = false;
          this.loadingText = '';
        }
      },


    async fetchBranches() {
      try {
        this.loadingText = 'Loading branches...';
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/branches`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        
        this.branches = response.data?.data || [];
        
        if (!this.branches.length) {
          this.showSwal('No Branches', 'No branches available', 'warning');
        }
      } catch (error) {
        this.handleError(error, 'Failed to fetch branches');
        throw error; // Re-throw to allow step transition to handle it
      }
    },
    async fetchPropertyDetails(propertyId) {
      if (!this.isSessionValid()) return;
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/properties/${propertyId}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        
        const property = response.data?.data?.[0] || response.data?.data;
        
        if (!property) {
          throw new Error('Property not found');
        }
        
        this.propertyId = property.id;
        this.propertyTitle = property.title || 'Unknown Property';
        this.propertyDescription = property.description || '';
        this.propertyFeatures = property.features || [];
        this.propertyCategory = property.category?.name || '';
        this.propertyPrice = property.price || 0;
        this.propertyBedrooms = property.bedrooms || 0;
        this.propertyBathrooms = property.bathrooms || 0;
        this.propertyArea = property.area_sqft || 0;
        
        if (property.location) {
          const location = property.location;
          this.propertyLocation = [
            location.street,
            location.name,
            location.city,
            location.country
          ].filter(Boolean).join(', ');
        } else {
          this.propertyLocation = 'Not specified';
        }
        
        this.propertyImage = property.main_image || property.image || '';
        this.propertyType = property.category?.name || property.property_type || '';
        
        this.isRoomSelectionRequired = property.category?.name?.toLowerCase().includes('hostel') || 
                                      property.property_type?.toLowerCase().includes('hostel') ||
                                      !property.is_single_unit ||
                                      parseInt(property.bedrooms) > 1;
        
        this.formData.payment.property_title = this.propertyTitle;
        this.formData.payment.room_number = this.formData.lease.room_number || '';
        this.formData.payment.room_id = this.formData.lease.room_id || null;
        
        if (this.formData.lease) {
          this.formData.lease.property_id = property.id;
        }
        
        this.persistState();
        
        console.log('Property details updated:', {
          propertyId: this.propertyId,
          propertyTitle: this.propertyTitle,
          propertyCategory: this.propertyCategory,
          isRoomBased: this.isRoomSelectionRequired,
          roomNumber: this.formData.lease.room_number,
          paymentPropertyTitle: this.formData.payment.property_title
        });
      } catch (error) {
        console.error('Error fetching property details:', error);
        const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
        if (booking && booking.property_title) {
          this.propertyTitle = booking.property_title;
          this.formData.payment.property_title = booking.property_title;
          this.formData.payment.room_number = booking.room_number || '';
          this.formData.payment.room_id = booking.room_id || null;
        }
        this.showSwal('Error', 'Failed to fetch property details.', 'error');
      }
    },
    async fetchCountries() {
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/country`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.countries = response.data?.data || [];
        if (!this.countries.length) {
          this.errorMessage = 'No countries available. Please contact support.';
          this.showSwal('No Countries', this.errorMessage, 'warning');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch countries.');
      }
    },
    async fetchCities() {
      if (!this.formData.billing.country_id) {
        this.cities = [];
        this.streets = [];
        this.formData.billing.city_id = null;
        this.formData.billing.street_id = null;
        return;
      }
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/city?country_id=${this.formData.billing.country_id}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.cities = response.data?.data || [];
        this.streets = [];
        this.formData.billing.city_id = null;
        this.formData.billing.street_id = null;
        if (!this.cities.length) {
          this.errorMessage = 'No cities available for the selected country.';
          this.showSwal('No Cities', this.errorMessage, 'warning');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch cities.');
      }
    },
    async fetchStreets() {
      if (!this.formData.billing.city_id) {
        this.streets = [];
        this.formData.billing.street_id = null;
        return;
      }
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/street?city_id=${this.formData.billing.city_id}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.streets = response.data?.data || [];
        this.formData.billing.street_id = null;
        if (!this.streets.length) {
          this.errorMessage = 'No streets available for the selected city.';
          this.showSwal('No Streets', this.errorMessage, 'warning');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch streets.');
      }
    },
    async fetchPaymentMethods() {
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/payment-methods`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.paymentMethods = response.data?.data?.filter(method => ['bank', 'mobile'].includes(method.method_type)) || [];
        if (!this.paymentMethods.length) {
          this.errorMessage = 'No valid payment methods available.';
          this.showSwal('No Payment Methods', this.errorMessage, 'error');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch payment methods.');
      }
    },
    async fetchPaymentTypes() {
      if (!this.formData.payment.payment_method_id) {
        this.paymentTypes = [];
        this.formData.payment.payment_type_id = null;
        this.selectedPaymentType = null;
        this.showPaymentInstructions = false;
        this.formData.payment.payment_details = { type: null };
        return;
      }
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/payment-types?payment_method_id=${this.formData.payment.payment_method_id}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.paymentTypes = response.data?.data?.filter(type => ['NMB Bank', 'Vodacom M-Pesa'].includes(type.name)) || [];
        this.formData.payment.payment_type_id = null;
        this.selectedPaymentType = null;
        this.showPaymentInstructions = false;
        this.formData.payment.payment_details = { type: null };
        if (!this.paymentTypes.length) {
          this.errorMessage = 'No payment types available.';
          this.showSwal('No Payment Types', this.errorMessage, 'info');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch payment types.');
      }
    },
   
  async handleNextStep() {
  if (this.loading || this.isStepLocked) return;

  if (this.currentStep === 4) {
    if (!this.formData.lease.is_signed) {
      await this.initiateLeaseSigning();
      return;
    }
  }
  if (this.currentStep === 2) {
    if (!this.formData.application.id) {
      const success = await this.submitRentalApplication();
      if (!success) {
        this.showSwal('Submission Failed', 'Failed to submit application. Please correct errors and try again.', 'error');
        return;
      }
      if (this.isApplicationPending || !this.formData.application.isApproved) {
        this.showSwal('Pending Approval', 'Your application is still pending approval. Please wait.', 'warning');
        return;
      }
    } else if (this.isApplicationPending || !this.formData.application.isApproved) {
      await this.checkApplicationStatus();
      if (this.isApplicationPending || !this.formData.application.isApproved) {
        this.showSwal('Pending Approval', 'Your application is still pending approval. Please wait.', 'warning');
        return;
      }
    }
  }
  if (this.currentStep === 3) {
    if (!this.isLeaseCreated) {
      if (!this.$refs.leaseCreator || !this.$refs.leaseCreator.validateLeaseForm()) {
        this.showSwal('Validation Error', 'Please correct all errors in the lease form', 'error');
        return;
      }
      if (this.isRoomSelectionRequired && !this.formData.lease.room_id) {
        this.errors.lease_room_id = 'Please select a room for the lease';
        this.showSwal('Validation Error', this.errors.lease_room_id, 'error');
        return;
      }
      this.loading = true;
      this.loadingText = 'Creating lease...';
      try {
        const success = await this.$refs.leaseCreator.submitLease();
        if (success) {
          this.isLeaseCreated = true;
          this.showSwal('Lease Created', 'Your lease has been successfully created.', 'success');
        } else {
          this.showSwal('Lease Creation Failed', 'Please check the lease form and try again.', 'error');
          return;
        }
      } catch (error) {
        this.showSwal('Lease Creation Error', 'Failed to create lease. Please try again.', 'error');
        return;
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    }
  }
  if (this.currentStep === 6 && this.$refs.paymentForm) {
    const formState = this.$refs.paymentForm.getFormState();
    if ((formState.paymentCompleted || this.formData.payment.status === 'completed' || this.formData.payment.status === 'received') && formState.receiptUrl) {
      this.markStepCompleted(6);
      this.currentStep = 7;
      this.maxReachedStep = Math.max(this.maxReachedStep, 7);
      this.persistState();
      this.showSwal('Payment Completed', 'Proceeding to final step.', 'success');
      return;
    }
    if (formState.paymentSubmitted && !formState.paymentCompleted) {
      this.showSwal('Payment Pending', 'Payment is pending verification.', 'info');
      return;
    }
    if (!formState.paymentSubmitted) {
      if (!this.$refs.paymentForm.validateForm()) {
        this.showSwal('Validation Error', 'Please correct payment form errors.', 'error');
        return;
      }
      try {
        const success = await this.$refs.paymentForm.submitFromParent();
        if (!success) {
          this.showSwal('Payment Error', 'Failed to process payment. Please check errors and try again.', 'error');
          return;
        }
        this.showSwal('Payment Submitted', 'Payment is being processed. Awaiting verification.', 'info');
      } catch (error) {
        console.error('[DEBUG] Payment submission error:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        this.showSwal('Payment Error', 'An unexpected error occurred during payment submission.', 'error');
      }
      return;
    }
  }

  if (!this.validateCurrentStep()) {
    this.shakeCurrentStep();
    return;
  }
  const nextStep = this.currentStep + 1;
  await this.prepareStepData(nextStep);
  this.markStepCompleted(this.currentStep);
  this.currentStep = nextStep;
  this.maxReachedStep = Math.max(this.maxReachedStep, nextStep);
  this.persistState();
},
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
    },

// Updated: Confirm payment
    async confirmPayment() {
      if (!this.validateSession()) return;
      if (this.formData.payment.status !== 'received' || !this.formData.payment.receipt_url) {
        this.showSwal('Error', 'Cannot confirm payment. Receipt not available.', 'error');
        return;
      }

      this.loading = true;
      this.loadingText = 'Confirming payment...';

      try {
        const response = await makeRequest({
          method: 'POST',
          url: `${this.API_BASE_URL}/v1/payments/${this.formData.payment.id}/confirm`,
          headers: { Authorization: `Bearer ${this.authStore.token}`, 'Content-Type': 'application/json' },
          requiresAuth: true,
        });

        if (response.status === 200 || response.status === 201) {
          this.formData.payment.status = 'completed';
          if (!this.completedSteps.includes(6)) {
            this.markStepCompleted(6);
          }
          this.currentStep = 7;
          this.maxReachedStep = Math.max(this.maxReachedStep, 7);
          this.persistState();
          this.showSwal('Payment Confirmed', 'Proceeding to final step.', 'success');
        } else {
          throw new Error('Failed to confirm payment.');
        }
      } catch (error) {
        console.error('confirmPayment:', { error: error.message, timestamp: new Date().toISOString() });
        this.showSwal('Error', this.handleError(error, 'Failed to confirm payment.'), 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
    // Enhanced step preparation
async prepareStepData(step) {
  this.loading = true;
  this.loadingText = "Preparing next step...";
  try {
    switch (step) {
      case 2:
        await this.fetchBranches();
        break;
      case 3:
        if (!this.propertyId) {
          const booking = this.confirmedBookings.find(
            (b) => b.id === this.formData.bookingId
          );
          this.propertyId = booking?.property_id;
          if (!this.propertyId) throw new Error("Property ID is required");
        }
        await Promise.all([
          this.fetchTermPeriods(this.propertyId),
          this.fetchAvailableRooms(),
        ]);
        if (!this.termPeriods || !this.termPeriods.length) {
          throw new Error("No lease term periods available");
        }
        break;
      case 6:
        if (!this.propertyId) {
          const booking = this.confirmedBookings.find(
            (b) => b.id === this.formData.bookingId
          );
          this.propertyId = booking?.property_id;
          if (!this.propertyId) throw new Error("Property ID is required");
        }
        await Promise.all([
          this.fetchTermPeriods(this.propertyId),
          this.fetchPropertyDetails(this.propertyId),
          this.fetchPaymentMethods(),
        ]);
        if (!this.termPeriods || !this.termPeriods.length) {
          throw new Error("No lease term periods available");
        }
        if (!this.formData.lease.properties_term_period_id) {
          throw new Error("Please select a term period");
        }
        if (!this.formData.lease.rent_amount) {
          const selectedPeriod = this.termPeriods.find(
            p => p.id === this.formData.lease.properties_term_period_id
          );
          if (selectedPeriod) {
            this.formData.lease.rent_amount = selectedPeriod.amount;
            this.formData.payment.amount = selectedPeriod.amount;
            console.log("prepareStepData: Set rent amount from selected term period", {
              termPeriodId: selectedPeriod.id,
              rentAmount: selectedPeriod.amount,
              timestamp: new Date().toISOString(),
            });
          } else {
            throw new Error("Selected term period not found");
          }
        }
        console.log("prepareStepData: Payment amount synced", {
          rentAmount: this.formData.lease.rent_amount,
          paymentAmount: this.formData.payment.amount,
          timestamp: new Date().toISOString(),
        });
        break;
    }
  } catch (error) {
    console.error("prepareStepData error:", error);
    this.handleError(error, `Failed to prepare step ${step}`);
    if (step === 6) {
      this.currentStep = 3;
      this.showSwal("Error", `Failed to load lease terms or payment data: ${error.message}. Please review lease details.`, "error");
    }
  } finally {
    this.loading = false;
    this.loadingText = "";
  }
},
    
    async handlePaymentSubmit() {
      if (this.$refs.paymentForm) {
        const isValid = this.$refs.paymentForm.validateForm();
        if (!isValid) {
          this.showError('Please correct payment form errors');
          return;
        }
        
        const success = await this.$refs.paymentForm.submitFromParent();
        if (success) {
          // Payment submitted successfully, polling will handle the rest
        }
      } else {
        this.showError('Payment form not available');
      }
    },
    
    goToStep(step) {
      if (this.loading || this.isStepLocked || step === this.currentStep) return;
      
      if (!this.canAccessStep(step)) {
        this.showSwal(
          'Step Locked', 
          'You must complete the current step before accessing future steps.', 
          'warning'
        );
        return;
      }
      
      if (step <= this.maxReachedStep) {
        this.currentStep = step;
        this.errors = {};
        this.errorMessage = '';
        this.persistState();
        
        if (step === 6) this.fetchPaymentMethods();
      }
    },
    
    validateCurrentStep() {
  this.errors = {};
  this.errorMessage = '';
  let isValid = true;
  
  switch (this.currentStep) {
    case 1:
      if (!this.formData.bookingId) {
        this.errors.bookingId = 'Please select a booking';
        isValid = false;
      }
      break;
      
    case 2:
      if (!this.isApplicationPending) {
        const requiredFields = {
          branch_id: 'Branch is required',
          employment_status: 'Employment status is required',
          nida_number: 'NIDA number is required',
          annual_income: 'Annual income is required',
          background_check_status: 'Background check status is required',
          credit_report_status: 'Credit report status is required',
        };
        
        Object.entries(requiredFields).forEach(([field, message]) => {
          if (!this.formData.application[field]) {
            this.errors[field] = message;
            isValid = false;
          }
        });
        
        // Validate NIDA number format
        const nida = this.formData.application.nida_number;
        if (nida) {
          if (!/^\d{20}$/.test(nida)) {
            this.errors.nida_number = 'NIDA number must be exactly 20 digits.';
            isValid = false;
          } else {
            const year = parseInt(nida.substring(0, 4), 10);
            const nowYear = new Date().getFullYear();
            if (year < 1935 || year > nowYear) {
              this.errors.nida_number = `NIDA year must be between 1935 and ${nowYear}.`;
              isValid = false;
            }
          }
        }
        
        // Validate income range
        const allowedIncome = [100000, 500001, 1000001];
        if (this.formData.application.annual_income && !allowedIncome.includes(Number(this.formData.application.annual_income))) {
          this.errors.annual_income = 'Select a valid income range.';
          isValid = false;
        }
        
        // Validate status fields
        const allowedStatus = ['good', 'bad', 'very good', 'very bad', 'average'];
        if (this.formData.application.background_check_status && !allowedStatus.includes(this.formData.application.background_check_status)) {
          this.errors.background_check_status = 'Invalid background check status';
          isValid = false;
        }
        if (this.formData.application.credit_report_status && !allowedStatus.includes(this.formData.application.credit_report_status)) {
          this.errors.credit_report_status = 'Invalid credit report status';
          isValid = false;
        }
        
        // Validate registration number for students
        if (this.formData.application.employment_status === 'student' &&
            !this.formData.application.registration_number) {
          this.errors.registration_number = 'Registration number is required for students';
          isValid = false;
        }
      }
      break;
      
    case 3:
      // Check if lease is already created
      if (this.isLeaseCreated) {
        break; // Skip validation if lease is already created
      }
      
      // Check if lease creator component is available
      if (!this.$refs.leaseCreator) {
        this.errors.lease = 'Lease creator component not available';
        isValid = false;
        break;
      }
      
      // Check for validation errors from the LeaseCreator component
      if (Object.keys(this.leaseErrors).length > 0) {
        // Map specific lease errors to our errors object
        Object.keys(this.leaseErrors).forEach(field => {
          if (this.leaseErrors[field]) {
            this.errors[`lease_${field}`] = this.leaseErrors[field];
            isValid = false;
          }
        });
        
        // If there are errors but none were mapped, show a general error
        if (isValid) {
          this.errors.lease = 'Please complete all lease fields';
          isValid = false;
        }
        break;
      }
      
      // Validate the lease form
      if (!this.$refs.leaseCreator.validateLeaseForm()) {
        // Get the specific errors from the lease creator
        const leaseCreatorErrors = this.$refs.leaseCreator.errors;
        
        // Map the errors to our errors object
        Object.keys(leaseCreatorErrors).forEach(field => {
          if (leaseCreatorErrors[field]) {
            this.errors[`lease_${field}`] = leaseCreatorErrors[field];
            isValid = false;
          }
        });
        
        // If there are errors but none were mapped, show a general error
        if (isValid) {
          this.errors.lease = 'Please complete all lease fields';
          isValid = false;
        }
        break;
      }
      
      // Additional validation for required lease data
      if (!this.formData.lease.properties_term_period_id) {
        this.errors.lease_properties_term_period_id = 'Please select a term period';
        isValid = false;
      }
      
      if (this.isRoomSelectionRequired && !this.formData.lease.room_id) {
        this.errors.lease_room_id = 'Please select a room';
        isValid = false;
      }
      
      if (!this.formData.lease.payment_frequency) {
        this.errors.lease_payment_frequency = 'Please select a payment frequency';
        isValid = false;
      }
      
      if (!this.formData.lease.start_date) {
        this.errors.lease_start_date = 'Please select a start date';
        isValid = false;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(this.formData.lease.start_date);
        if (startDate < today) {
          this.errors.lease_start_date = 'Start date cannot be in the past';
          isValid = false;
        }
      }
      
      if (!this.formData.lease.end_date) {
        this.errors.lease_end_date = 'Please select an end date';
        isValid = false;
      } else {
        const start = new Date(this.formData.lease.start_date);
        const end = new Date(this.formData.lease.end_date);
        if (end <= start) {
          this.errors.lease_end_date = 'End date must be after start date';
          isValid = false;
        }
      }
      
      if (!this.formData.lease.rent_amount) {
        this.errors.lease_rent_amount = 'Rent amount is required';
        isValid = false;
      }
      
      if (!this.formData.lease.terms) {
        this.errors.lease_terms = 'Lease terms are required';
        isValid = false;
      }
      break;
      
    case 4:
      if (!this.formData.lease.id) {
        this.errors.lease_signature = 'No lease found. Please create a lease in Step 3.';
        isValid = false;
      } else if (!this.formData.lease.is_signed) {
        this.errors.lease_signature = 'Please sign the lease agreement.';
        isValid = false;
      }
      break;
      
    case 5:
      const requiredBillingFields = {
        country_id: 'Country is required',
        city_id: 'City is required',
        street_id: 'Street is required',
        address_id: 'Billing address ID is required', // Add address_id validation
      };
      Object.entries(requiredBillingFields).forEach(([field, message]) => {
        if (!this.formData.billing[field]) {
          this.errors[field] = message;
          isValid = false;
        }
      });
      break;
          
    case 6:
      if (!this.formData.bookingId) {
        this.errors.bookingId = 'Booking ID is required';
        isValid = false;
      }
      
      if (!this.formData.lease.id) {
        this.errors.lease_id = 'Lease ID is required';
        isValid = false;
      }
      
      if (!this.formData.billing.address_id) {
        this.errors.billing_address_id = 'Billing address is required';
        isValid = false;
      }
      break;
  }
  
  // Show error message if validation failed
  if (!isValid && this.currentStep !== 6) {
    // Get the first error message to display
    const firstError = Object.values(this.errors).find(error => error);
    this.errorMessage = firstError || 'Please correct the highlighted errors before proceeding.';
    this.showSwal('Validation Error', this.errorMessage, 'error');
  }
  
  return isValid;
},
    
    validateNidaNumber() {
      const nida = this.formData.application.nida_number;
      this.errors.nida_number = '';
      if (!nida) return;
      if (!/^\d{20}$/.test(nida)) {
        this.errors.nida_number = 'NIDA number must be exactly 20 digits.';
        return;
      }
      const year = parseInt(nida.substring(0, 4), 10);
      const nowYear = new Date().getFullYear();
      if (year < 1935 || year > nowYear) {
        this.errors.nida_number = `NIDA year must be between 1935 and ${nowYear}.`;
      }
    },
    
    shakeCurrentStep() {
      const stepElement = this.$el.querySelector('.step-content:not([style*="display: none"])');
      if (stepElement) {
        stepElement.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
          stepElement.style.animation = '';
        }, 500);
      }
    },
    
    // Update the selectBooking method to ensure room data is properly set
     async selectBooking(booking) {
        const mappedBooking = this.mapBookingData(booking);
        if (!mappedBooking) {
          this.errorMessage = 'Please select a valid booking with a room and property.';
          this.showSwal('Invalid Booking', this.errorMessage, 'error');
          return;
        }
        
        this.loading = true;
        this.loadingText = 'Validating booking...';
        
        try {
          const bookingResponse = await makeRequest({
            method: 'GET',
            url: `${this.API_BASE_URL}/v1/bookings/${mappedBooking.id}`,
            headers: { Authorization: `Bearer ${this.authStore.token}` },
            requiresAuth: true,
          });
          
          const bookingData = bookingResponse.data?.data;
          if (!bookingData || !bookingData.rooms || !bookingData.rooms.length) {
            throw new Error('Booking data is invalid.');
          }
          
          const serverRoom = bookingData.rooms[0];
          if (serverRoom.id !== mappedBooking.room_id) {
            throw new Error('Room mismatch between client and server booking data.');
          }
          
          // Set booking and room data
          this.formData.bookingId = mappedBooking.id;
          this.propertyId = Number(serverRoom.property_id);
          this.propertyTitle = bookingData.property_title || mappedBooking.property_title || 'Unknown Property';
          this.formData.application.property_id = this.propertyId;
          this.formData.lease.property_id = this.propertyId;
          this.formData.payment.property_title = this.propertyTitle;
          
          // Set room data for lease
          this.formData.lease.room_id = mappedBooking.room_id;
          this.formData.lease.room_number = mappedBooking.room_number;
          this.formData.lease.rent_amount = mappedBooking.rent;
          this.formData.lease.description = mappedBooking.description;
          this.formData.lease.user_id = this.getUserInfo()?.id;
          
          // Set room data for payment
          this.formData.payment.room_id = mappedBooking.room_id;
          this.formData.payment.room_number = mappedBooking.room_number;
          this.formData.payment.amount = mappedBooking.rent;
          this.formData.payment.amount_display = `TZS ${mappedBooking.rent.toLocaleString()}`;
          
          await Promise.all([
            this.fetchAvailableRooms(),
            this.fetchBranches(),
            this.fetchPropertyDetails(this.propertyId)
          ]);
          
          this.currentStep = 2;
          this.persistState();
          this.showSwal('Booking Selected', `Proceed to application details for room ${this.formData.lease.room_number}.`, 'success');
        } catch (error) {
          this.errorMessage = this.handleError(error, 'Invalid booking or property data.');
          this.propertyId = null;
          this.propertyTitle = 'Unknown Property';
          this.formData.application.property_id = null;
          this.formData.lease.property_id = null;
          this.formData.payment.property_title = this.propertyTitle;
          
          // Clear room data on error
          this.formData.lease.room_id = null;
          this.formData.lease.room_number = null;
          this.formData.lease.rent_amount = null;
          this.formData.lease.description = null;
          this.formData.payment.room_id = null;
          this.formData.payment.room_number = null;
          this.formData.payment.amount = null;
          this.formData.payment.amount_display = 'N/A';
          
          this.currentStep = 1;
          await this.fetchConfirmedBookings();
        } finally {
          this.loading = false;
          this.loadingText = '';
        }
      },
    
    async proceedToStep2() {
      if (!this.formData.bookingId) {
        this.errors.bookingId = 'Please select a booking';
        this.errorMessage = 'Please select a booking before proceeding.';
        this.showSwal('Missing Booking', this.errorMessage, 'error');
        return;
      }
      const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
      if (!booking || !booking.room_id || !booking.property_id) {
        this.errorMessage = 'Selected booking not found or missing room information. Please select a valid booking.';
        this.showSwal('Invalid Booking', this.errorMessage, 'error');
        return;
      }
      this.loading = true;
      this.loadingText = 'Preparing application...';
      try {
        this.propertyId = booking.property_id;
        this.propertyTitle = booking.property_title || 'Unknown Property';
        this.formData.application.property_id = booking.property_id;
        this.formData.lease.property_id = booking.property_id;
        this.formData.payment.property_title = this.propertyTitle;
        this.formData.lease.room_id = booking.room_id;
        this.formData.lease.room_number = booking.room_number;
        await Promise.all([
          this.fetchBranches(),
          this.fetchAvailableRooms(),
          this.fetchPropertyDetails(booking.property_id)
        ]);
        this.isApplicationPending = false;
        this.currentStep = 2;
        this.persistState();
        this.advanceToNextStep();
        this.showSwal('Booking Selected', 'Proceed to application details.', 'success');
        return true;
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to prepare application. Please try again.');
        return false;
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
    async submitRentalApplication() {
      if (!this.validateSession()) return;
      this.loading = true;
      this.loadingText = 'Submitting application...';
      try {
        if (!this.propertyId || !this.formData.bookingId) {
          const selectedBooking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
          if (selectedBooking && selectedBooking.property_id) {
            this.propertyId = selectedBooking.property_id;
            this.propertyTitle = selectedBooking.property_title;
            this.formData.application.property_id = selectedBooking.property_id;
            this.formData.lease.property_id = selectedBooking.property_id;
            this.formData.payment.property_title = selectedBooking.property_title;
          } else {
            throw new Error('Property ID is missing. Please select a booking with a valid room.');
          }
        }
        if (!this.propertyId) {
          this.propertyId = this.formData.lease.property_id || this.formData.application.property_id;
        }
        const data = {
          ...this.formData.application,
          user_id: this.authStore.userProfile?.id,
          property_id: this.propertyId,
        };
        if (data.employment_status !== 'student') {
          delete data.registration_number;
        }
        const response = await makeRequest({
          method: 'POST',
          url: `${this.API_BASE_URL}/v1/rental-applications`,
          data,
          headers: { Authorization: `Bearer ${this.authStore.token}`, 'Content-Type': 'application/json' },
          requiresAuth: true,
        });
        this.formData.application.id = response.data?.data?.id;
        this.formData.application.isApproved = response.data?.data?.status === 'approved';
        this.isApplicationPending = !this.formData.application.isApproved;
        this.hasShownApprovalAlert = false;
        if (this.formData.application.isApproved) {
          await this.handleApplicationApproval();
        } else {
          this.isApplicationPending = true;
          this.clearApplicationForm();
          this.startPollingApplicationStatus();
          this.hasShownApprovalAlert = true;
          this.markStepCompleted(this.currentStep);
          this.persistState();
          this.showSwal('Application Submitted', 'Your application is pending approval. We will check the status periodically.', 'info');
        }
        return true;
      } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
          this.errors = { ...this.errors, ...error.response.data.errors };
          if (error.response.data.errors.property_id) {
            this.errorMessage = 'Property ID is required. Please select a booking with a valid room.';
            this.showSwal('Missing Property', this.errorMessage, 'error');
            this.currentStep = 1;
          } else {
            this.errorMessage = `Validation failed: ${Object.values(error.response.data.errors).flat().join(', ')}`;
            this.showSwal('Validation Error', this.errorMessage, 'error');
          }
        } else {
          this.errorMessage = this.handleError(error, 'Failed to submit application.');
          // If no application exists, ensure isApplicationPending is false
          if (!this.formData.application.id) {
            this.isApplicationPending = false;
            this.stopPollingApplicationStatus();
          }
        }
        return false;
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
    // Update the handleApplicationApproval method to ensure room data is properly set
    async handleApplicationApproval() {
      this.loading = true;
      this.loadingText = 'Application approved. Preparing for lease creation...';
      this.hasShownApprovalAlert = true;
      try {
        if (!this.formData.bookingId || !this.propertyId) {
          const selectedBooking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
          if (selectedBooking && selectedBooking.property_id) {
            this.propertyId = selectedBooking.property_id;
            this.propertyTitle = selectedBooking.property_title;
            this.formData.application.property_id = selectedBooking.property_id;
            this.formData.lease.property_id = selectedBooking.property_id;
            this.formData.payment.property_title = selectedBooking.property_title;
            this.formData.lease.room_id = selectedBooking.room_id;
            this.formData.lease.room_number = selectedBooking.room_number;
          } else {
            throw new Error('Property ID or booking ID is missing. Please select a valid booking.');
          }
        }
        
        // Mark step 2 as completed since the application is approved
        if (!this.completedSteps.includes(2)) {
          this.markStepCompleted(2);
        }
        
        // Fetch term periods and available rooms in parallel
        await Promise.all([
          this.fetchTermPeriods(this.propertyId),
          this.fetchAvailableRooms()
        ]);
        
        // Ensure room data is set from booking if not already set
        if (!this.formData.lease.room_id || !this.formData.lease.room_number) {
          const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
          if (booking) {
            this.formData.lease.room_id = booking.room_id;
            this.formData.lease.room_number = booking.room_number;
          }
        }
        
        // Move to step 3
        this.currentStep = 3;
        this.maxReachedStep = Math.max(this.maxReachedStep, 3);
        this.persistState();
        
        this.showSwal('Application Approved', 'You can now create your lease.', 'success');
        return true;
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to prepare for lease creation.');
        this.currentStep = 1;
        await this.fetchConfirmedBookings();
        return false;
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
    // Enhanced submitLease method with proper error handling
    async submitLease() {
      this.loading = true;
      this.loadingText = 'Creating lease...';
      this.errors = {};
      try {
        if (!this.formData.bookingId) throw new Error('Please select a booking.');
        if (!this.formData.lease.room_id) throw new Error('Please select a valid room.');
        if (!this.formData.lease.property_id) throw new Error('Property ID is required.');
        if (!this.formData.lease.rent_amount || this.formData.lease.rent_amount <= 0) throw new Error('Valid rent amount is required.');
        if (!this.formData.lease.start_date || !this.formData.lease.end_date) throw new Error('Start and end dates are required.');
        
        const booking = this.confirmedBookings.find(b => b.id === this.formData.bookingId);
        if (!booking) throw new Error('Booking not found in confirmed bookings.');
        if (booking.room_id !== this.formData.lease.room_id) throw new Error('Booking room mismatch.');
        
        this.formData.lease.property_id = booking.property_id;
        this.formData.application.property_id = booking.property_id;
        this.formData.payment.property_title = booking.property_title;
        this.propertyId = booking.property_id;
        this.propertyTitle = booking.property_title;
        
        const leaseData = {
          booking_id: this.formData.bookingId,
          property_id: this.formData.lease.property_id,
          room_id: this.formData.lease.room_id,
          properties_term_period_id: this.formData.lease.properties_term_period_id,
          payment_frequency: this.formData.lease.payment_frequency,
          rent_amount: this.formData.lease.rent_amount,
          start_date: this.formData.lease.start_date,
          end_date: this.formData.lease.end_date,
          terms: this.formData.lease.terms,
          user_id: this.getUserInfo()?.id,
        };
        
        const leaseResponse = await makeRequest({
          method: 'POST',
          url: `${this.API_BASE_URL}/v1/leases`,
          data: leaseData,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        
        this.formData.lease.id = leaseResponse.data.data.id;
        this.formData.lease.user_id = leaseResponse.data.data.user_id;
        this.formData.payment.amount = leaseResponse.data.data.rent_amount;
        this.formData.payment.amount_display = `TZS ${leaseResponse.data.data.rent_amount.toLocaleString()}`;
        
        const selectedPeriod = this.termPeriods.find(p => p.id === this.formData.lease.properties_term_period_id);
        if (selectedPeriod) {
          this.formData.payment.base_amount = selectedPeriod.base_amount;
          this.formData.payment.service_charge = selectedPeriod.service_charge;
        }
        
        this.isLeaseCreated = true;
        this.currentStep = 4;
        this.persistState();
        this.showSwal('Lease Created', 'Your lease has been successfully created. Please proceed to sign the lease.', 'success');
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to create lease.');
        this.errors = error.response?.data?.errors || { general: this.errorMessage };
        if (this.errors.booking_id || this.errors.property_id || !this.formData.bookingId) {
          this.currentStep = 1;
          await this.fetchConfirmedBookings();
        }
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
async submitBillingAddress() {
  if (!this.validateSession()) return;
  if (!this.validateCurrentStep()) {
    this.shakeCurrentStep();
    this.errorMessage = "Please correct the highlighted errors before proceeding.";
    this.showSwal("Validation Error", this.errorMessage, "error");
    return;
  }
  this.loading = true;
  this.loadingText = "Saving billing address...";
  try {
    const userInfo = this.getUserInfo();
    if (!userInfo || !userInfo.id) {
      throw new Error("User information not found. Please log in again.");
    }
    const data = {
      country_id: this.formData.billing.country_id,
      city_id: this.formData.billing.city_id,
      street_id: this.formData.billing.street_id,
      state: this.formData.billing.state || null,
      zip_code: this.formData.billing.zip_code || null,
      user_id: userInfo.id,
      booking_id: this.formData.bookingId,
      property_id: this.formData.lease.property_id,
    };
    const response = await makeRequest({
      method: "POST",
      url: `${this.API_BASE_URL}/v1/billing-addresses`,
      data,
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        "Content-Type": "application/json",
      },
      requiresAuth: true,
    });
    
    // Ensure address_id is extracted correctly
    const addressId = response.data?.data?.id || response.data?.data?.address_id;
    if (!addressId) {
      throw new Error("Billing address ID not found in response");
    }
    
    // Update formData with the new address_id
    this.formData.billing.address_id = addressId;
    this.errors.billing_address_id = null; // Clear any existing error
    this.persistState();
    
    this.showSwal("Billing Address Saved", "Billing address saved successfully.", "success");
    // Proceed to payment step
    this.handleBillingContinue();
  } catch (error) {
    if (error.response?.status === 422) {
      this.errors = { ...this.errors, ...error.response?.data?.errors };
      this.errorMessage = `Validation failed: ${Object.values(error.response.data.errors).flat().join(", ")}`;
      this.showSwal("Validation Error", this.errorMessage, "error");
    } else if (error.response?.status === 403) {
      this.errorMessage = "You do not have permission to save this billing address.";
      this.showSwal("Unauthorized", this.errorMessage, "error");
    } else if (error.response?.status === 401) {
      this.errorMessage = "Session Expired. Redirecting to login...";
      this.showSwal("Session Expired", this.errorMessage, "error").then(() => {
        this.clearSession();
        this.$router.push("/login");
      });
    } else {
      this.errorMessage = this.handleError(error, "Failed to save billing address.");
    }
  } finally {
    this.loading = false;
    this.loadingText = "";
  }
},
    
async submitPayment() {
  if (!this.validateSession()) return;
  if (!this.formData.bookingId) {
    this.errors.bookingId = 'Booking ID is missing. Please select a booking in Step 1.';
    this.showSwal('Missing Booking', this.errors.bookingId, 'error');
    this.currentStep = 1;
    return;
  }

  if (!this.$refs.paymentForm.validateForm()) {
    this.showSwal('Validation Error', 'Please correct payment form errors.', 'error');
    return;
  }

  this.loading = true;
  this.loadingText = 'Processing payment...';

  try {
    const userInfo = this.getUserInfo();
    if (!userInfo || !userInfo.id) throw new Error('User information not found.');

    const data = {
      user_id: userInfo.id,
      booking_id: Number(this.formData.bookingId),
      property_id: this.propertyId,
      lease_id: this.formData.lease.id || null,
      billing_address_id: this.formData.billing.address_id,
      amount: this.formData.payment.amount,
      currency: this.formData.payment.currency,
      payment_method_id: this.formData.payment.payment_method_id,
      payment_type_id: this.formData.payment.payment_type_id,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      property_title: this.formData.payment.property_title,
      transaction_id: `txn_${uuidv4()}_${Date.now()}`,
      payment_details: this.formData.payment.payment_details,
    };

    const success = await this.$refs.paymentForm.submitFromParent(data);
    if (!success) throw new Error('Payment submission failed.');

    // Ensure payment ID is set after successful submission
    const paymentId = this.$refs.paymentForm.getPaymentId?.(); // Assuming PaymentForm has a method to return payment ID
    if (!paymentId) {
      throw new Error('Payment ID not returned from PaymentForm.');
    }

    this.formData.payment.id = paymentId;
    this.isPaymentPending = true;
    this.persistState();
    this.showSwal('Payment Submitted', 'Awaiting verification.', 'info');
    this.startPaymentPolling(); // Start polling to check payment status
  } catch (error) {
    console.error('submitPayment:', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    this.showSwal('Error', this.handleError(error, 'Failed to process payment.'), 'error');
    this.isPaymentPending = false;
    this.formData.payment.id = null; // Clear invalid payment ID
    this.persistState();
  } finally {
    this.loading = false;
    this.loadingText = '';
  }
},

async completePayment() {
  if (!this.validateSession()) {
    this.showSwal('Error', 'Session expired. Please log in again.', 'error').then(() => {
      this.$router.push('/login');
    });
    return;
  }

  // Attempt to recover payment ID if missing
  if (!this.formData.payment.id) {
    try {
      // Check if PaymentForm has a stored payment ID
      const paymentId = this.$refs.paymentForm.getPaymentId?.();
      if (paymentId) {
        this.formData.payment.id = paymentId;
        this.persistState();
      } else {
        // Fetch recent payments for the user
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/payments?booking_id=${this.formData.bookingId}&status=pending,received`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        const recentPayment = response.data?.data?.[0];
        if (recentPayment && recentPayment.id) {
          this.formData.payment.id = recentPayment.id;
          this.formData.payment.status = recentPayment.status;
          this.formData.payment.transaction_id = recentPayment.transaction_id;
          this.formData.payment.receipt_url = recentPayment.receipt_url || null;
          this.formData.payment.receipt_number = recentPayment.receipt_number || null;
          this.persistState();
        } else {
          this.showSwal('Error', 'No payment ID found. Please resubmit the payment in Step 6.', 'error');
          this.currentStep = 6;
          this.isPaymentPending = false;
          this.persistState();
          return;
        }
      }
    } catch (error) {
      console.error('completePayment: Failed to recover payment ID', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      this.showSwal('Error', 'No payment ID found. Please resubmit the payment in Step 6.', 'error');
      this.currentStep = 6;
      this.isPaymentPending = false;
      this.persistState();
      return;
    }
  }

  this.loading = true;
  this.loadingText = 'Completing payment...';

  try {
    const response = await makeRequest({
      method: 'POST',
      url: `${this.API_BASE_URL}/v1/payments/${this.formData.payment.id}/complete`,
      headers: {
        Authorization: `Bearer ${this.authStore.token}`,
        'Content-Type': 'application/json',
      },
      requiresAuth: true,
    });

    if (response.status === 200 || response.status === 201) {
      this.formData.payment.status = response.data.data.status;
      this.formData.payment.completed_at = response.data.data.completed_at;
      this.clearPersistedState(); // Clear storage for tracking steps
      this.showSwal('Success', 'Payment completed successfully!', 'success').then(() => {
        this.$router.push({ name: 'my-leases' });
      });
    } else {
      throw new Error(response.data?.message || 'Failed to complete payment.');
    }
  } catch (error) {
    let errorMessage = 'Failed to complete payment.';
    if (error.response?.status === 401) {
      errorMessage = 'Session expired. Redirecting to login...';
      this.showSwal('Error', errorMessage, 'error').then(() => {
        this.$router.push('/login');
      });
    } else if (error.response?.status === 403) {
      errorMessage = 'You are not authorized to complete this payment.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Payment not found. Please resubmit the payment in Step 6.';
      this.formData.payment.id = null;
      this.isPaymentPending = false;
      this.currentStep = 6;
      this.persistState();
    } else if (error.response?.status === 422) {
      errorMessage = error.response.data.message || 'Invalid payment status.';
    }
    this.showSwal('Error', errorMessage, 'error');
  } finally {
    this.loading = false;
    this.loadingText = '';
  }
},
    
    async downloadLease() {
      if (!this.validateSession()) return;
      this.loading = true;
      this.loadingText = 'Generating PDF...';
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/tenant/leases/${this.formData.lease.id}/pdf`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        let pdfUrl = response.data?.data?.url;
        pdfUrl = pdfUrl
          .replace('c3.amali.japango.co.tz', 'e1.japango.co.tz')
          .replace('http://', 'https://')
          .replace('/storage/leases/pdfs/', '/pdfs/');
        const pdfWindow = window.open(pdfUrl, '_blank');
        if (!pdfWindow) throw new Error('Failed to open PDF. Please allow pop-ups.');
        this.clearPersistedState();
        this.showSwal('Lease PDF Opened', 'Lease PDF opened in new tab.', 'success');
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to generate lease PDF.');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
    // Update the checkApplicationStatus method
    async checkApplicationStatus() {
      if (!this.validateSession() || !this.formData.application.id) {
        this.isApplicationPending = false;
        this.formData.application.isApproved = false;
        this.stopPollingApplicationStatus();
        return;
      }
      try {
        this.loading = true;
        this.loadingText = 'Checking application status...';
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/rental-applications/${this.formData.application.id}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        const application = response.data?.data;
        console.log('Application status check:', application?.status, 'Is approved:', application?.status === 'approved');
        
        if (application?.status === 'approved') {
          this.formData.application.isApproved = true;
          this.isApplicationPending = false;
          this.stopPollingApplicationStatus();
          if (this.currentStep === 2) {
            await this.handleApplicationApproval();
          }
        } else if (application?.status === 'rejected') {
          this.isApplicationPending = false;
          this.stopPollingApplicationStatus();
          this.showSwal('Application Rejected', 'Your application was not approved. Please start a new application.', 'error');
          this.currentStep = 1;
          this.clearApplicationForm();
          this.persistState();
          await this.fetchConfirmedBookings();
        } else {
          this.isApplicationPending = true;
          this.formData.application.isApproved = false;
          if (!this.pollingInterval) {
            this.showSwal('Still Pending', 'Your application is still awaiting approval.', 'info');
          }
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to check application status.');
        if (error.response?.status === 404) {
          this.isApplicationPending = false;
          this.formData.application.id = null;
          this.formData.application.isApproved = false;
          this.stopPollingApplicationStatus();
          this.showSwal('No Application', 'No application found. Please submit a new application.', 'info');
        }
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    
    startPollingApplicationStatus() {
      this.stopPollingApplicationStatus(); // Clear any existing polling
      this.pollingInterval = setInterval(() => {
        this.checkApplicationStatus();
      }, 5000); // Poll every 5 seconds
      // Optional: Set a timeout to stop polling after a reasonable period (e.g., 5 minutes)
      this.pollingTimeout = setTimeout(() => {
        this.stopPollingApplicationStatus();
        this.showSwal('Polling Timeout', 'Application status check timed out. Please try again later.', 'warning');
      }, 300000); // Stop after 5 minutes
    },
    
    stopPollingApplicationStatus() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      if (this.pollingTimeout) {
        clearTimeout(this.pollingTimeout);
        this.pollingTimeout = null;
      }
    },
    
    clearApplicationForm() {
      this.formData.application = {
        id: this.formData.application.id,
        property_id: this.formData.application.property_id,
        branch_id: null,
        employment_status: '',
        nida_number: '',
        registration_number: '',
        annual_income: null,
        background_check_status: '',
        credit_report_status: '',
        status: 'pending',
        isApproved: false,
      };
      this.errors = {};
      this.errorMessage = '';
    },
    
    async fetchApprovedApplications() {
      if (!this.validateSession()) return;
      try {
        const [appResponse, leaseResponse] = await Promise.all([
          makeRequest({
            method: 'GET',
            url: `${this.API_BASE_URL}/v1/rental-applications?user_id=${this.authStore.userProfile?.id}&status=approved`,
            headers: { Authorization: `Bearer ${this.authStore.token}` },
            requiresAuth: true,
          }),
          makeRequest({
            method: 'GET',
            url: `${this.API_BASE_URL}/v1/leases?user_id=${this.authStore.userProfile?.id}`,
            headers: { Authorization: `Bearer ${this.authStore.token}` },
            requiresAuth: true,
          }),
        ]);
        const applications = appResponse.data?.data || [];
        const leases = leaseResponse.data?.data || [];
        const currentDate = new Date();
        this.approvedApplications = applications.filter(app => {
          const lease = leases.find(l => l.property_id === app.property_id);
          return !lease || (!lease.is_signed && new Date(lease.end_date) >= currentDate);
        }).map(app => ({
          id: app.id,
          property_id: app.property_id,
          property_title: app.property_title,
        }));
        if (!this.approvedApplications.length) {
          this.showSwal('No Approved Applications', 'No approved applications found.', 'info');
        }
      } catch (error) {
        this.errorMessage = this.handleError(error, 'Failed to fetch approved applications.');
      }
    },
    
    updateLease(updatedLease) {
    this.formData.lease = { ...this.formData.lease, ...updatedLease };
    if (updatedLease.room_id) this.formData.payment.room_id = updatedLease.room_id;
    if (updatedLease.room_number) this.formData.payment.room_number = updatedLease.room_number;
    if (updatedLease.rent_amount) {
      this.formData.payment.amount = updatedLease.rent_amount;
      this.formData.payment.amount_display = `TZS ${updatedLease.rent_amount.toLocaleString()}`;
    }
    const selectedPeriod = this.termPeriods.find(p => p.id === this.formData.lease.properties_term_period_id);
    if (selectedPeriod) {
      this.formData.payment.base_amount = selectedPeriod.base_amount;
      this.formData.payment.service_charge = selectedPeriod.service_charge;
    }
    this.persistState();
  },
    
   handleLeaseCreated(leaseData) {
    this.formData.lease = { ...this.formData.lease, ...leaseData };
    this.formData.payment.amount = leaseData.rent_amount;
    this.formData.payment.amount_display = `TZS ${leaseData.rent_amount.toLocaleString()}`;
    const selectedPeriod = this.termPeriods.find(p => p.id === this.formData.lease.properties_term_period_id);
    if (selectedPeriod) {
      this.formData.payment.base_amount = selectedPeriod.base_amount;
      this.formData.payment.service_charge = selectedPeriod.service_charge;
    }
    this.isLeaseCreated = true;
    this.markStepCompleted(3);
    this.persistState();
  },

  handleLeaseSigned(signedLease) {
  this.formData.lease = { ...this.formData.lease, ...signedLease, is_signed: true };
  this.markStepCompleted(4);
  this.currentStep = 5;
  this.maxReachedStep = Math.max(this.maxReachedStep, 5);
  this.persistState();
  this.showSwal('Lease Signed', 'Your lease has been successfully signed. Proceeding to billing.', 'success');
},

  handleSessionExpired() {
    this.errorMessage = 'Session expired. Please log in again.';
    this.showSwal('Session Expired', this.errorMessage, 'error').then(() => {
      this.clearSession();
      this.$router.push('/login');
    });
  },
    
    clearSession() {
      // Attempt to call Pinia store's logout method if available
      if (this.authStore && typeof this.authStore.logout === 'function') {
        this.authStore.logout();
      }
      // Clear local storage items
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('userProfile');
      this.clearPersistedState();
    },
    
    // Trigger term period change
    onTermPeriodChange() {
  const selected = this.termPeriods.find(p => p.id === this.formData.lease.properties_term_period_id);
  if (selected) {
    this.formData.lease.rent_amount = selected.amount;
    this.formData.lease.payment_frequency = selected.period_of_payment;
    this.formData.payment.amount = selected.amount;
    this.formData.payment.amount_display = `TZS ${selected.amount.toLocaleString()}`;
    this.formData.payment.base_amount = selected.base_amount || selected.amount;
    this.formData.payment.service_charge = selected.service_charge || 0;
    this.errors.lease_term_period = null; // Clear any term period error
    this.persistState();
  } else {
    this.errors.lease_term_period = "Invalid lease term period selected.";
    this.showSwal("Error", this.errors.lease_term_period, "error");
  }
},
    
    removeKeyboardListeners() {
      // Placeholder for removing keyboard listeners if any
    }
  }
};
</script>


<style scoped>
/* Core Styles */
.rental-application {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
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
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Header Styles */
.header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  padding: 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: shimmer 3s ease-in-out infinite;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
}

.header p {
  opacity: 0.9;
  font-size: 1.1rem;
  position: relative;
  z-index: 2;
}

@keyframes shimmer {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

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
}

.step-indicator.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transform: scale(1.1);
}

.step-indicator.completed {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
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

/* Form Styles */
.form-container {
  padding: 40px;
}

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

.form-group {
  margin-bottom: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

input, select, textarea {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

input:hover, select:hover, textarea:hover {
  border-color: #cbd5e1;
}

input.error, select.error {
  border-color: #dc2626;
}

input[readonly] {
  background-color: #f8fafc;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
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

.info-card.caution {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1px solid #fecaca;
}

.info-card.caution::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #dc2626, #b91c1c);
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

/* Loading Styles */
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

@keyframes tooltipFadeIn {
  0% { opacity: 0; transform: translateX(-50%) translateY(5px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .rental-application {
    padding: 10px;
  }
  
  .container {
    border-radius: 16px;
    margin: 0;
  }
  
  .header {
    padding: 24px 20px;
  }
  
  .header h1 {
    font-size: 2rem;
  }
  
  .progress-container {
    padding: 20px;
  }
  
  .form-container {
    padding: 24px 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
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
  
  .btn {
    padding: 12px 20px;
    font-size: 15px;
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
  .header h1 {
    font-size: 1.8rem;
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
  
  .checkmark {
    width: 60px;
    height: 60px;
  }
  
  .checkmark svg {
    width: 30px;
    height: 30px;
  }
}

/* Print Styles */
@media print {
  .rental-application {
    background: white;
    padding: 0;
  }
  
  .container {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
  
  .btn, .form-actions {
    display: none;
  }
}

/* Add these styles to your existing CSS */

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin: 1rem 0;
}

.loading-indicator .spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.info-card.caution {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.info-card.caution h3 {
  color: #856404;
  margin-bottom: 0.5rem;
}

.readonly-field {
  background-color: #f8f9fa !important;
  cursor: not-allowed;
}

.debug-info {
  color: #6c757d;
  font-style: italic;
  margin-top: 0.25rem;
  display: block;
}

.btn.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
}

.btn.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn.btn-secondary:disabled {
  background-color: #6c757d;
  border-color: #6c757d;
  opacity: 0.65;
  cursor: not-allowed;
}

/* Error styling */
.form-group select.error,
.form-group input.error {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Enhanced styles for forward-only step progression */

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
  cursor: pointer;
  position: relative;
  border: 2px solid #e5e7eb;
  background-color: #f9fafb;
  color: #6b7280;
}

/* Active step */
.step-indicator.active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  animation: pulse 1.5s infinite;
}

/* Completed steps */
.step-indicator.completed {
  background-color: #10b981;
  border-color: #10b981;
  color: white;
  cursor: pointer;
}

.step-indicator.completed:hover {
  background-color: #059669;
  border-color: #059669;
  transform: scale(1.05);
}

/* Accessible (next available) steps */
.step-indicator.accessible {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #4b5563;
  cursor: pointer;
}

.step-indicator.accessible:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
  transform: scale(1.05);
}

/* Locked steps */
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

/* Step icons and numbers */
.step-icon {
  font-size: 16px;
  line-height: 1;
}

.step-number {
  font-size: 16px;
  font-weight: 700;
}

/* Step labels */
.step-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  margin-top: 8px;
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

/* Progress line */
.progress-line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #e5e7eb;
  transform: translateY(-50%);
  z-index: 1;
}

.progress-line-active {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  transition: width 0.6s ease;
  border-radius: 1px;
}

/* Progress statistics */
.progress-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 1rem 0 2rem 0;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stats-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

/* Step completion status */
.completion-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background-color: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.completed-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 600;
  color: #f59e0b;
}

.completion-status small {
  font-size: 12px;
  color: #64748b;
}

/* Step header */
.step-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.step-title {
  margin: 0;
  color: #1e293b;
  font-size: 24px;
  font-weight: 700;
}

/* Form actions enhanced */
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

/* Enhanced button states */
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

/* Completion summary */
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

/* Animations */
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.1);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.shake {
  animation: shake 0.5s ease-in-out;
}

/* Loading states */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: #6b7280;
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

/* Responsive design */
@media (max-width: 768px) {
  .progress-stats {
    flex-direction: column;
    gap: 1rem;
  }
  
  .step-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
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
  
  .completion-item {
    flex-wrap: wrap;
  }
  
  .completion-time {
    width: 100%;
    text-align: right;
    margin-top: 0.25rem;
  }
}
</style>

