// composables/useRentalState.js
import { reactive, computed, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth-store';
import { API_CONFIG, isDevelopment } from '../config/apiConfig';

export function useRentalState() {
  const authStore = useAuthStore();

  const state = reactive({
    // Step management
    currentStep: 1,
    totalSteps: 7,
    
    // Loading states
    loading: false,
    loadingText: '',
    
    // Error handling
    errorMessage: '',
    errors: {},
    
    // Form data structure
    formData: {
      bookingId: null,
      propertyId: null,
      roomId: null,
      roomNumber: null,
      
      application: {
        id: null,
        property_id: null,
        branch_id: null,
        employment_status: '',
        nida_number: '',
        registration_number: '',
        annual_income: null,
        background_check_status: 'pending',
        credit_report_status: 'pending',
        status: 'pending',
        isApproved: false,
        submitted_at: null,
        approved_at: null,
      },
      
      lease: {
        id: null,
        user_id: null,
        property_id: null,
        room_id: null,
        room_number: null,
        properties_term_period_id: null,
        payment_frequency: 'monthly',
        rent_amount: null,
        security_deposit: null,
        start_date: '',
        end_date: '',
        terms: '',
        is_signed: false,
        signed_at: null,
        lease_document_url: null,
      },
      
      billing: {
        country: '',
        city: '',
        street: '',
        address_line_1: '',
        address_line_2: '',
        postal_code: '',
        phone: '',
        email: '',
        same_as_profile: true,
      },
      
      payment: {
        payment_method_id: null,
        payment_type_id: null,
        amount: null,
        amount_display: '',
        transaction_id: null,
        reference_number: null,
        payment_status: 'pending',
        processed_at: null,
      },
    },

    // Data collections
    confirmedBookings: [],
    branches: [],
    countries: [],
    cities: [],
    streets: [],
    paymentMethods: [],
    paymentTypes: [],
    termPeriods: [],
    availableRooms: [],

    // UI state
    selectedPaymentType: '',
    isApplicationPending: false,
    isLeaseCreated: false,
    showSignConfirmation: false,
    showPaymentInstructions: false,
    isRoomSelectionRequired: true,
    hasShownApprovalAlert: false,

    // Application flow state
    canProceedToNextStep: false,
    stepValidationErrors: {},
    
    // Polling and real-time updates
    pollingInterval: null,
    lastUpdateTime: null,

    // Configuration
    authStore,
    API_BASE_URL: API_CONFIG.BASE_URL,
    
    // Status options
    statusOptions: ['clear', 'pending', 'issues'],
    employmentStatusOptions: [
      'employed',
      'self_employed',
      'unemployed',
      'student',
      'retired',
      'other'
    ],
    paymentFrequencyOptions: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'biannually', label: 'Bi-annually' },
      { value: 'annually', label: 'Annually' }
    ],
  });

  // Computed properties
  const stepLabels = computed(() => [
    'Select Booking',
    'Application',
    'Create Lease',
    'Sign Lease',
    'Billing Address',
    'Payment',
    'Complete',
  ]);

  const stepTooltips = computed(() => [
    'Choose your confirmed property booking',
    'Submit your rental application with required documents',
    'Configure lease terms and conditions',
    'Review and digitally sign your lease agreement',
    'Provide billing and contact information',
    'Complete payment for security deposit and first month',
    'Download signed lease and complete setup',
  ]);

  const currentStepLabel = computed(() => stepLabels.value[state.currentStep - 1]);
  
  const progressPercentage = computed(() => 
    Math.round((state.currentStep / state.totalSteps) * 100)
  );

  const isFirstStep = computed(() => state.currentStep === 1);
  const isLastStep = computed(() => state.currentStep === state.totalSteps);
  
  const selectedBooking = computed(() => {
    if (!state.formData.bookingId || !state.confirmedBookings.length) return null;
    return state.confirmedBookings.find(booking => 
      booking.booking_id === state.formData.bookingId
    );
  });

  const selectedPaymentMethod = computed(() => {
    if (!state.formData.payment.payment_method_id || !state.paymentMethods.length) return null;
    return state.paymentMethods.find(method => 
      method.id === state.formData.payment.payment_method_id
    );
  });

  const totalPaymentAmount = computed(() => {
    const rentAmount = state.formData.lease.rent_amount || 0;
    const securityDeposit = state.formData.lease.security_deposit || rentAmount;
    return rentAmount + securityDeposit;
  });

  const isFormValid = computed(() => {
    const step = state.currentStep;
    switch (step) {
      case 1:
        return !!state.formData.bookingId;
      case 2:
        return validateApplicationStep();
      case 3:
        return validateLeaseStep();
      case 4:
        return state.formData.lease.is_signed;
      case 5:
        return validateBillingStep();
      case 6:
        return validatePaymentStep();
      default:
        return true;
    }
  });

  // Validation functions
  function validateApplicationStep() {
    const app = state.formData.application;
    return !!(
      app.employment_status &&
      app.nida_number &&
      app.annual_income &&
      app.branch_id
    );
  }

  function validateLeaseStep() {
    const lease = state.formData.lease;
    return !!(
      lease.properties_term_period_id &&
      lease.payment_frequency &&
      lease.start_date &&
      lease.end_date &&
      lease.rent_amount
    );
  }

  function validateBillingStep() {
    const billing = state.formData.billing;
    return !!(
      billing.country &&
      billing.city &&
      billing.address_line_1 &&
      billing.phone &&
      billing.email
    );
  }

  function validatePaymentStep() {
    const payment = state.formData.payment;
    return !!(
      payment.payment_method_id &&
      payment.payment_type_id &&
      payment.amount
    );
  }

  // State persistence functions
  function persistState() {
    try {
      const stateToSave = {
        currentStep: state.currentStep,
        formData: state.formData,
        isApplicationPending: state.isApplicationPending,
        isLeaseCreated: state.isLeaseCreated,
        showSignConfirmation: state.showSignConfirmation,
        showPaymentInstructions: state.showPaymentInstructions,
        hasShownApprovalAlert: state.hasShownApprovalAlert,
        lastUpdateTime: Date.now(),
      };

      localStorage.setItem('rentalApplicationState', JSON.stringify(stateToSave));
      
      if (isDevelopment) {
        console.log('State persisted successfully');
      }
    } catch (error) {
      console.error('Failed to persist state:', error);
      // Don't throw - this is not critical
    }
  }

  function loadPersistedState() {
    try {
      const savedState = localStorage.getItem('rentalApplicationState');
      if (!savedState) return false;

      const parsed = JSON.parse(savedState);
      
      // Check if saved state is too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (parsed.lastUpdateTime && (Date.now() - parsed.lastUpdateTime) > maxAge) {
        if (isDevelopment) {
          console.log('Saved state is too old, clearing...');
        }
        clearPersistedState();
        return false;
      }

      // Restore state
      state.currentStep = parsed.currentStep || 1;
      state.formData = { ...state.formData, ...parsed.formData };
      state.isApplicationPending = parsed.isApplicationPending || false;
      state.isLeaseCreated = parsed.isLeaseCreated || false;
      state.showSignConfirmation = parsed.showSignConfirmation || false;
      state.showPaymentInstructions = parsed.showPaymentInstructions || false;
      state.hasShownApprovalAlert = parsed.hasShownApprovalAlert || false;

      if (isDevelopment) {
        console.log('State loaded successfully from localStorage');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      clearPersistedState();
      return false;
    }
  }

  function clearPersistedState() {
    try {
      localStorage.removeItem('rentalApplicationState');
      resetFormData();
      
      if (isDevelopment) {
        console.log('Persisted state cleared');
      }
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
    }
  }

  function resetFormData() {
    // Reset form data to initial state
    state.currentStep = 1;
    state.formData = {
      bookingId: null,
      propertyId: null,
      roomId: null,
      roomNumber: null,
      application: {
        id: null,
        property_id: null,
        branch_id: null,
        employment_status: '',
        nida_number: '',
        registration_number: '',
        annual_income: null,
        background_check_status: 'pending',
        credit_report_status: 'pending',
        status: 'pending',
        isApproved: false,
        submitted_at: null,
        approved_at: null,
      },
      lease: {
        id: null,
        user_id: null,
        property_id: null,
        room_id: null,
        room_number: null,
        properties_term_period_id: null,
        payment_frequency: 'monthly',
        rent_amount: null,
        security_deposit: null,
        start_date: '',
        end_date: '',
        terms: '',
        is_signed: false,
        signed_at: null,
        lease_document_url: null,
      },
      billing: {
        country: '',
        city: '',
        street: '',
        address_line_1: '',
        address_line_2: '',
        postal_code: '',
        phone: '',
        email: '',
        same_as_profile: true,
      },
      payment: {
        payment_method_id: null,
        payment_type_id: null,
        amount: null,
        amount_display: '',
        transaction_id: null,
        reference_number: null,
        payment_status: 'pending',
        processed_at: null,
      },
    };

    // Reset UI state
    state.isApplicationPending = false;
    state.isLeaseCreated = false;
    state.showSignConfirmation = false;
    state.showPaymentInstructions = false;
    state.hasShownApprovalAlert = false;
    state.errors = {};
    state.errorMessage = '';
    state.canProceedToNextStep = false;
    state.stepValidationErrors = {};
  }

  // Session validation
  function validateSession() {
    if (!authStore.token || !authStore.userProfile) {
      state.errorMessage = 'Session expired. Please log in to continue.';
      return false;
    }
    return true;
  }

  // Step navigation functions
  function canGoToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > state.totalSteps) return false;
    if (stepNumber <= state.currentStep) return true;
    
    // Check if previous steps are completed
    for (let i = 1; i < stepNumber; i++) {
      if (!isStepCompleted(i)) return false;
    }
    
    return true;
  }

  function isStepCompleted(stepNumber) {
    switch (stepNumber) {
      case 1:
        return !!state.formData.bookingId;
      case 2:
        return state.formData.application.id && state.formData.application.isApproved;
      case 3:
        return !!state.formData.lease.id;
      case 4:
        return state.formData.lease.is_signed;
      case 5:
        return validateBillingStep();
      case 6:
        return state.formData.payment.payment_status === 'completed';
      case 7:
        return true;
      default:
        return false;
    }
  }

  function goToStep(stepNumber) {
    if (!canGoToStep(stepNumber)) {
      console.warn(`Cannot navigate to step ${stepNumber}`);
      return false;
    }
    
    state.currentStep = stepNumber;
    state.errors = {};
    state.errorMessage = '';
    persistState();
    return true;
  }

  function nextStep() {
    if (state.currentStep < state.totalSteps) {
      return goToStep(state.currentStep + 1);
    }
    return false;
  }

  function previousStep() {
    if (state.currentStep > 1) {
      return goToStep(state.currentStep - 1);
    }
    return false;
  }

  // Error handling functions
  function setError(field, message) {
    state.errors = { ...state.errors, [field]: message };
  }

  function clearError(field) {
    if (field) {
      const { [field]: removed, ...rest } = state.errors;
      state.errors = rest;
    } else {
      state.errors = {};
    }
  }

  function clearAllErrors() {
    state.errors = {};
    state.errorMessage = '';
    state.stepValidationErrors = {};
  }

  // Utility functions
  function formatCurrency(amount) {
    if (!amount) return 'TZS 0';
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  }

  // Watch for changes and auto-persist
  watch(
    () => state.formData,
    () => {
      nextTick(() => {
        persistState();
      });
    },
    { deep: true }
  );

  // Watch for step changes
  watch(
    () => state.currentStep,
    (newStep) => {
      state.canProceedToNextStep = isFormValid.value;
      clearAllErrors();
    }
  );

  return {
    // State
    state,
    
    // Computed
    stepLabels,
    stepTooltips,
    currentStepLabel,
    progressPercentage,
    isFirstStep,
    isLastStep,
    selectedBooking,
    selectedPaymentMethod,
    totalPaymentAmount,
    isFormValid,
    
    // Validation functions
    validateApplicationStep,
    validateLeaseStep,
    validateBillingStep,
    validatePaymentStep,
    
    // Persistence functions
    persistState,
    loadPersistedState,
    clearPersistedState,
    resetFormData,
    
    // Session validation
    validateSession,
    
    // Navigation functions
    canGoToStep,
    isStepCompleted,
    goToStep,
    nextStep,
    previousStep,
    
    // Error handling
    setError,
    clearError,
    clearAllErrors,
    
    // Utility functions
    formatCurrency,
    formatDate,
  };
}