<template>
  <div class="payment-form">
    <div class="container">
      <div class="header-logo">
        <EagerLogo :width="isMobile ? '32px' : '40px'" :height="isMobile ? '28px' : '40px'" class="admin_logo" />
      </div>
      
      <div class="step-content">
        <!-- Payment Form (Initial State) -->
        <div v-if="currentStep === 'form'">
          <h2 class="step-title">Payment Information</h2>
          <p class="step-description">Complete your payment to finalize the rental agreement. Ensure all details are correct before submitting.</p>
          
          <!-- Loading Indicator -->
          <div v-if="loading && loadingText" class="loading-indicator">
            <div class="spinner"></div>
            <span>{{ loadingText }}</span>
          </div>
          
          <!-- Error Message -->
          <div class="info-card caution" v-if="errorMessage || Object.keys(errors).length">
            <h3>⚠️ Error</h3>
            <p v-if="errorMessage">{{ errorMessage }}</p>
            <ul v-if="Object.keys(errors).length">
              <li v-for="(error, field) in errors" :key="field">{{ error }}</li>
            </ul>
          </div>
          
          <!-- Payment Summary -->
          <div class="info-card">
            <h3>💰 Payment Summary</h3>
            <p><strong>Property:</strong> {{ displayTitle }}</p>
            <p v-if="localPayment?.room_number && isRoomBased"><strong>Room Number:</strong> {{ localPayment.room_number }}</p>
            <p v-if="selectedTermPeriod?.base_amount">
              <strong>Base Rent ({{ selectedTermPeriod.period_of_payment }}):</strong> TZS {{ (selectedTermPeriod.base_amount * computedPaymentMultiplier).toLocaleString() }}
            </p>
            <p v-if="selectedTermPeriod?.service_charge || selectedTermPeriod?.amount">
              <strong>Service Charge ({{ selectedTermPeriod.period_of_payment }}):</strong> 
              TZS {{ ((selectedTermPeriod.service_charge || ((selectedTermPeriod.amount ?? 0) - (selectedTermPeriod.base_amount ?? 0)) || 0) * computedPaymentMultiplier).toLocaleString() }}
            </p>
            <p v-if="selectedTermPeriod?.period_of_payment">
              <strong>Term Period:</strong> {{ selectedTermPeriod.period_of_payment.charAt(0).toUpperCase() + selectedTermPeriod.period_of_payment.slice(1) }}
            </p>
            <p v-if="getTotalAmount() > 0">
              <strong>Total Amount:</strong> TZS {{ getTotalAmount().toLocaleString() }}
            </p>
            <p v-else class="error-message">Invalid payment amount. Please select a valid lease term.</p>
          </div>
          
          <!-- Payment Form -->
          <form @submit.prevent="openPaymentConfirmation">
            <div class="form-row">
              <div class="form-group">
                <label for="payment-currency">Currency <span class="text-danger">*</span></label>
                <select
                  id="payment-currency"
                  v-model="localPayment.currency"
                  :disabled="loading"
                  :class="{ 'error': errors.currency }"
                  required
                  @focus="clearError('currency')"
                  @change="emitPaymentUpdate"
                >
                  <option value="TZS">TZS</option>
                </select>
                <div v-if="errors.currency" class="error-message">{{ errors.currency }}</div>
              </div>
              <div class="form-group">
                <label for="payment-method">Payment Method <span class="text-danger">*</span></label>
                <select
                  id="payment-method"
                  v-model="localPayment.payment_method_id"
                  @change="fetchPaymentTypes"
                  :disabled="loading || !localPayment.currency"
                  :class="{ 'error': errors.payment_method_id }"
                  required
                  @focus="clearError('payment_method_id')"
                >
                  <option value="">Select payment method...</option>
                  <option
                    v-for="method in paymentMethods"
                    :key="method.id"
                    :value="method.id"
                  >
                    {{ method.method_name }}
                  </option>
                </select>
                <div v-if="errors.payment_method_id" class="error-message">{{ errors.payment_method_id }}</div>
              </div>
            </div>
            
            <div class="form-row" v-if="paymentTypes.length > 0">
              <div class="form-group">
                <label for="payment-type">Payment Type <span class="text-danger">*</span></label>
                <select
                  id="payment-type"
                  v-model="localPayment.payment_type_id"
                  @change="onPaymentTypeChange"
                  :disabled="loading || !localPayment.payment_method_id"
                  :class="{ 'error': errors.payment_type_id }"
                  required
                  @focus="clearError('payment_type_id')"
                >
                  <option value="">Select payment type...</option>
                  <option
                    v-for="type in paymentTypes"
                    :key="type.id"
                    :value="type.id"
                  >
                    {{ type.name }}
                  </option>
                </select>
                <div v-if="errors.payment_type_id" class="error-message">{{ errors.payment_type_id }}</div>
              </div>
              <div></div>
            </div>
            
            <!-- Payment Instructions -->
            <div v-if="showPaymentInstructions && selectedPaymentType === 'NMB Bank'" class="info-card">
              <h3>📋 Payment Instructions for NMB Bank</h3>
              <p>To pay using NMB Bank, follow these steps:</p>
              <ol>
                <li>Log in to your NMB Bank online account or visit an NMB Bank branch.</li>
                <li>Select the option to transfer money or pay a bill.</li>
                <li>Enter account number: <strong>22510124993</strong></li>
                <li>Enter payment amount: <strong>TZS {{ getTotalAmount().toLocaleString() }}</strong></li>
                <li>Verify details and confirm transaction.</li>
                <li>Save transaction receipt for your records.</li>
              </ol>
            </div>
            
            <div v-if="showPaymentInstructions && selectedPaymentType === 'Vodacom M-Pesa'" class="info-card">
              <h3>📋 Payment Instructions for Vodacom M-Pesa</h3>
              <p>To pay using Vodacom M-Pesa, follow these steps:</p>
              <ol>
                <li>Open your M-Pesa app on your phone.</li>
                <li>Select "Lipa kwa M-Pesa" or "Send Money" option.</li>
                <li>Enter phone number: <strong>+255749679833</strong></li>
                <li>Enter payment amount: <strong>TZS {{ getTotalAmount().toLocaleString() }}</strong></li>
                <li>Enter your PIN to confirm transaction.</li>
                <li>Wait for transaction confirmation and save for records.</li>
              </ol>
            </div>
            
            <!-- Bank Details -->
            <div v-if="selectedPaymentType === 'NMB Bank'" class="form-row">
              <div class="form-group">
                <label for="bank-account-token">Bank Account Number <span class="text-danger">*</span></label>
                <input
                  type="text"
                  id="bank-account-token"
                  v-model="localPayment.payment_details.token"
                  readonly
                  class="readonly-field"
                  :class="{ 'error': errors.payment_details }"
                />
                <div v-if="errors.payment_details" class="error-message">{{ errors.payment_details }}</div>
              </div>
              <div class="form-group">
                <label for="bank-name">Bank Name <span class="text-danger">*</span></label>
                <input
                  type="text"
                  id="bank-name"
                  v-model="localPayment.payment_details.bank_name"
                  readonly
                  class="readonly-field"
                  :class="{ 'error': errors.payment_details }"
                />
                <div v-if="errors.payment_details" class="error-message">{{ errors.payment_details }}</div>
              </div>
            </div>
            
            <!-- Mobile Payment Details -->
            <div v-if="selectedPaymentType === 'Vodacom M-Pesa'" class="form-row">
              <div class="form-group">
                <label for="mobile-phone">Phone Number <span class="text-danger">*</span></label>
                <input
                  type="tel"
                  id="mobile-phone"
                  v-model="localPayment.payment_details.phone_number"
                  readonly
                  class="readonly-field"
                  :class="{ 'error': errors.payment_details }"
                />
                <div v-if="errors.payment_details" class="error-message">{{ errors.payment_details }}</div>
              </div>
              <div></div>
            </div>
          </form>
        </div>
        
        <!-- Completed Payment View -->
        <div v-else-if="currentStep === 'completed'">
          <div class="status-card success">
            <div class="status-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Payment Completed Successfully!</h2>
            <p class="status-message">Your payment has been verified and your rental agreement is now active. The receipt has been downloaded automatically.</p>
            
            <div class="payment-summary">
              <h3>Payment Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Transaction ID:</span>
                  <span class="summary-value">{{ localPayment.transaction_id }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Payment Date:</span>
                  <span class="summary-value">{{ localPayment.date || new Date().toLocaleDateString() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Payment Method:</span>
                  <span class="summary-value">{{ selectedPaymentType }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Total Amount:</span>
                  <span class="summary-value">TZS {{ getTotalAmount().toLocaleString() }}</span>
                </div>
                <div class="summary-item" v-if="receiptNumber">
                  <span class="summary-label">Receipt Number:</span>
                  <span class="summary-value">{{ receiptNumber }}</span>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button 
                class="btn btn-primary" 
                @click="downloadReceipt"
                :disabled="loading || !receiptUrl"
              >
                <span v-if="loading && loadingText === 'Generating receipt...'">Generating...</span>
                <span v-else>Download Receipt Again</span>
              </button>
              <button class="btn btn-secondary" @click="viewAgreement">
                View Rental Agreement
              </button>
            </div>
            
            <div class="next-steps">
              <h3>What's Next?</h3>
              <ol class="steps-list">
                <li>You will receive a confirmation email with your rental details</li>
                <li>Our property manager will contact you within 24 hours</li>
                <li>Schedule a property handover at your convenience</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted, defineExpose, nextTick, onUnmounted } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import { AuthMiddleware } from '../../../../utils/authMiddleware';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import EagerLogo from '../../../../components/EagerLogo.vue';
import Swal from 'sweetalert2';
import logoImage from '../../../../../public/img/logo.png';

interface PaymentDetails {
  type: string | null;
  token?: string;
  bank_name?: string;
  phone_number?: string;
}
interface Payment {
  amount?: number;
  currency?: string;
  payment_method_id?: number | null;
  payment_type_id?: number | null;
  transaction_id?: string | null;
  property_title?: string;
  payment_details: PaymentDetails;
  date?: string;
  room_number?: string;
  status?: string;
  receipt_url?: string | null;
  receipt_number?: string;
}
interface TermPeriod {
  base_amount?: number;
  service_charge?: number;
  amount?: number;
  period_of_payment?: string;
}
interface PaymentMethod {
  id: number;
  method_name: string;
  method_type: string;
}
interface PaymentType {
  id: number;
  name: string;
  payment_method_id: string;
}
interface AuthStore {
  token: string;
  userProfile?: { id: string | number; roles?: string[] };
}

export default defineComponent({
  name: 'PaymentForm',
  components: { EagerLogo },
  props: {
    payment: {
      type: Object as () => Payment,
      required: true,
      default: () => ({
        amount: 0,
        currency: 'TZS',
        payment_method_id: null,
        payment_type_id: null,
        transaction_id: null,
        property_title: 'Unknown Property',
        payment_details: { type: null },
        date: new Date().toISOString().split('T')[0],
        room_number: '',
        status: undefined,
        receipt_url: null,
        receipt_number: null,
      }),
    },
    selectedTermPeriod: {
      type: Object as () => TermPeriod,
      default: () => ({
        base_amount: 0,
        service_charge: 0,
        amount: 0,
        period_of_payment: 'monthly',
      }),
    },
    paymentMultiplier: {
      type: Number,
      default: 1,
    },
    apiBaseUrl: {
      type: String,
      default: 'https://e1.japango.co.tz/api',
      required: true,
    },
    authStore: {
      type: Object as () => AuthStore,
      required: true,
    },
    bookingId: {
      type: [String, Number],
      required: true,
    },
    propertyId: {
      type: [String, Number],
      required: true,
    },
    leaseId: {
      type: [String, Number],
      required: true,
    },
    billingAddressId: {
      type: [String, Number],
      required: true,
    },
    userId: {
      type: [String, Number],
      required: true,
    },
    propertyTitle: {
      type: String,
      required: true,
      default: 'Unknown Property',
    },
    propertyLocation: {
      type: String,
      default: 'Not specified',
    },
    propertyType: {
      type: String,
      default: 'Not specified',
    },
    roomNumber: {
      type: String,
      default: '',
    },
    isRoomBased: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const loading = ref(false);
    const loadingText = ref('');
    const errorMessage = ref('');
    const errors = ref<Record<string, string | null>>({});
    const paymentMethods = ref<PaymentMethod[]>([]);
    const paymentTypes = ref<PaymentType[]>([]);
    const showPaymentInstructions = ref(false);
    const selectedPaymentType = ref<string | null>(null);
    const currentStep = ref<'form' | 'completed'>('form');
    const paymentId = ref<number | null>(null);
    const receiptUrl = ref<string | null>(null);
    const receiptNumber = ref<string | null>(null);
    const isSubmitting = ref(false);
    const pollingInterval = ref<ReturnType<typeof setInterval> | null>(null);

    // Validate props on setup
    console.log('[DEBUG] PaymentForm setup - Props:', {
      payment: props.payment,
      selectedTermPeriod: props.selectedTermPeriod,
      propertyTitle: props.propertyTitle,
      bookingId: props.bookingId,
      propertyId: props.propertyId,
      leaseId: props.leaseId,
      billingAddressId: props.billingAddressId,
      userId: props.userId,
      timestamp: new Date().toISOString(),
    });

    const computedPaymentMultiplier = computed(() => {
      const period = props.selectedTermPeriod?.period_of_payment?.toLowerCase() || 'monthly';
      if (period === 'semi-annually') return 6;
      if (period === 'annually') return 12;
      if (period === 'quarterly') return 3;
      return 1;
    });

    const getTotalAmount = () => {
      if (props.selectedTermPeriod && typeof props.selectedTermPeriod.base_amount === 'number') {
        return (props.selectedTermPeriod.base_amount + (props.selectedTermPeriod.service_charge || 0)) * computedPaymentMultiplier.value;
      }
      return 0;
    };

    const localPayment = ref<Payment>({
      amount: props.payment.amount || getTotalAmount() || 0,
      currency: props.payment.currency || 'TZS',
      payment_method_id: props.payment.payment_method_id || null,
      payment_type_id: props.payment.payment_type_id || null,
      transaction_id: props.payment.transaction_id || null,
      property_title: props.propertyTitle || props.payment.property_title || 'Unknown Property',
      room_number: props.roomNumber || props.payment.room_number || '',
      payment_details: props.payment.payment_details || { type: null },
      date: props.payment.date || new Date().toISOString().split('T')[0],
      status: props.payment.status || undefined,
      receipt_url: props.payment.receipt_url || null,
      receipt_number: props.payment.receipt_number || null,
    });

    const isMobile = computed(() => window.innerWidth <= 768);

    const getFormState = () => {
      const isValid = validateForm();
      const state = {
        isValid,
        loading: loading.value,
        currentStep: currentStep.value,
        errors: { ...errors.value },
        errorMessage: errorMessage.value,
        receiptUrl: receiptUrl.value,
        receiptNumber: receiptNumber.value,
        paymentSubmitted: !!localPayment.value.transaction_id,
        paymentCompleted: localPayment.value.status === 'completed' || localPayment.value.status === 'received',
        paymentId: paymentId.value,
      };
      console.log('[DEBUG] PaymentForm getFormState:', {
        ...state,
        transactionId: localPayment.value.transaction_id,
        timestamp: new Date().toISOString(),
      });
      return state;
    };

    const getPaymentId = () => paymentId.value;

    const displayTitle = computed(() => {
      let title = localPayment.value?.property_title || props.propertyTitle || 'Unknown Property';
      if (props.isRoomBased && localPayment.value?.room_number && !title.includes(localPayment.value.room_number)) {
        title = `${title} - ${localPayment.value.room_number}`;
      }
      return title;
    });

    const displayLocation = computed(() => {
      let location = props.propertyLocation || 'Not specified';
      if (props.isRoomBased && localPayment.value?.room_number && !location.includes(localPayment.value.room_number)) {
        location = `${location} (${localPayment.value.room_number})`;
      }
      return location;
    });

    const displayType = computed(() => {
      let type = props.propertyType || 'Not specified';
      if (props.isRoomBased) {
        type = type.toLowerCase().includes('hostel') ? `${type} Room` : `${type} (Room Rental)`;
      }
      return type;
    });

    onMounted(async () => {
      console.log('[DEBUG] PaymentForm mounted, checking initial payment status', {
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        status: props.payment.status,
        receiptUrl: props.payment.receipt_url,
        currentStep: currentStep.value,
        timestamp: new Date().toISOString(),
      });
      try {
        await fetchPaymentMethods();
        if (localPayment.value.payment_method_id) {
          await fetchPaymentTypes();
          if (localPayment.value.payment_type_id) {
            onPaymentTypeChange();
          }
        }
        if (props.payment.status === 'completed' || props.payment.status === 'received') {
          console.log('[DEBUG] Setting initial step to completed', {
            status: props.payment.status,
            receiptUrl: props.payment.receipt_url,
            timestamp: new Date().toISOString(),
          });
          paymentId.value = props.payment.payment_id || paymentId.value;
          currentStep.value = 'completed';
          receiptUrl.value = props.payment.receipt_url ?? null;
          receiptNumber.value = props.payment.receipt_number || `RCP-${Date.now()}`;
          localPayment.value.status = props.payment.status;
          localPayment.value.receipt_url = receiptUrl.value;
          await nextTick();
          if (!receiptUrl.value) {
            console.log('[DEBUG] No receipt URL, generating receipt', {
              timestamp: new Date().toISOString(),
            });
            await generateReceipt();
            await downloadReceipt();
          } else {
            await downloadReceipt();
          }
          emitPaymentUpdate();
        } else if (props.payment.status === 'pending') {
          paymentId.value = props.payment.payment_id || paymentId.value;
          pollPaymentStatus();
        }
      } catch (error) {
        console.error('[DEBUG] Error in onMounted:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        showSwal('Error', 'Failed to initialize payment form.', 'error');
      }
      console.log('[DEBUG] Template should render with:', {
        currentStep: currentStep.value,
        localPayment: localPayment.value,
        paymentMethods: paymentMethods.value,
        paymentTypes: paymentTypes.value,
        timestamp: new Date().toISOString(),
      });
    });

    onUnmounted(() => {
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
      }
    });

    watch(
      () => props.selectedTermPeriod,
      (newTermPeriod) => {
        if (newTermPeriod && typeof newTermPeriod.base_amount === 'number') {
          const totalAmount = getTotalAmount();
          if (localPayment.value.amount !== totalAmount) {
            localPayment.value.amount = totalAmount;
            emitPaymentUpdate();
          }
        }
      },
      { deep: true, flush: 'post' }
    );

    watch(currentStep, (newStep, oldStep) => {
      console.log('[DEBUG] PaymentForm currentStep changed:', {
        oldStep,
        newStep,
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        status: localPayment.value.status,
        receiptUrl: receiptUrl.value,
        timestamp: new Date().toISOString(),
      });
      emit('step-changed', { newStep, paymentId: paymentId.value, transactionId: localPayment.value.transaction_id });
    });

    watch(
      () => localPayment.value.status,
      (newStatus, oldStatus) => {
        console.log('[DEBUG] PaymentForm status changed:', {
          oldStatus,
          newStatus,
          currentStep: currentStep.value,
          receiptUrl: receiptUrl.value,
          timestamp: new Date().toISOString(),
        });
        emitPaymentUpdate();
      }
    );

    const fetchPaymentMethods = async () => {
      loading.value = true;
      loadingText.value = 'Loading payment methods...';
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${props.apiBaseUrl}/v1/payment-methods`,
          headers: { Authorization: `Bearer ${props.authStore.token}` },
          requiresAuth: true,
        });
        paymentMethods.value = response.data?.data?.filter((method: PaymentMethod) =>
          ['bank', 'mobile'].includes(method.method_type)
        ) || [];
        if (paymentMethods.value.length === 0) {
          paymentMethods.value = [
            { id: 1, method_name: 'Bank Transfer', method_type: 'bank' },
            { id: 2, method_name: 'Mobile Payment', method_type: 'mobile' },
          ];
          console.log('[DEBUG] Using fallback payment methods', {
            timestamp: new Date().toISOString(),
          });
        }
        console.log('[DEBUG] Payment methods fetched:', {
          methods: paymentMethods.value,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        paymentMethods.value = [
          { id: 1, method_name: 'Bank Transfer', method_type: 'bank' },
          { id: 2, method_name: 'Mobile Payment', method_type: 'mobile' },
        ];
        showSwal('Error', 'Failed to fetch payment methods. Using default options.', 'error');
        console.error('[DEBUG] Error fetching payment methods:', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        loading.value = false;
        loadingText.value = '';
      }
    };

    const fetchPaymentTypes = async () => {
      if (!localPayment.value.payment_method_id) {
        paymentTypes.value = [];
        return;
      }
      loading.value = true;
      loadingText.value = 'Loading payment types...';
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${props.apiBaseUrl}/v1/payment-types`,
          headers: { Authorization: `Bearer ${props.authStore.token}` },
          requiresAuth: true,
        });
        paymentTypes.value = response.data?.data?.filter((type: PaymentType) =>
          type.payment_method_id === String(localPayment.value.payment_method_id)
        ) || [];
        if (paymentTypes.value.length === 0) {
          const selectedMethod = paymentMethods.value.find(method => method.id === localPayment.value.payment_method_id);
          const methodType = selectedMethod?.method_type;
          paymentTypes.value = methodType === 'bank'
            ? [{ id: 2, name: 'NMB Bank', payment_method_id: '1' }]
            : methodType === 'mobile'
            ? [{ id: 10, name: 'Vodacom M-Pesa', payment_method_id: '2' }]
            : [];
          console.log('[DEBUG] Using fallback payment types', {
            timestamp: new Date().toISOString(),
          });
        }
        console.log('[DEBUG] Payment types fetched:', {
          types: paymentTypes.value,
          paymentMethodId: localPayment.value.payment_method_id,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        const selectedMethod = paymentMethods.value.find(method => method.id === localPayment.value.payment_method_id);
        const methodType = selectedMethod?.method_type;
        paymentTypes.value = methodType === 'bank'
          ? [{ id: 2, name: 'NMB Bank', payment_method_id: '1' }]
          : methodType === 'mobile'
          ? [{ id: 10, name: 'Vodacom M-Pesa', payment_method_id: '2' }]
          : [];
        showSwal('Error', 'Failed to fetch payment types. Using default options.', 'error');
        console.error('[DEBUG] Error fetching payment types:', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        loading.value = false;
        loadingText.value = '';
      }
    };

    const onPaymentTypeChange = () => {
      const selectedType = paymentTypes.value.find(
        (type) => type.id === localPayment.value.payment_type_id
      );
      if (selectedType) {
        selectedPaymentType.value = selectedType.name;
        showPaymentInstructions.value = true;
        if (selectedType.name === 'NMB Bank') {
          localPayment.value.payment_details = {
            type: 'bank_transfer',
            token: '22510124993',
            bank_name: 'NMB Bank',
          };
        } else if (selectedType.name === 'Vodacom M-Pesa') {
          localPayment.value.payment_details = {
            type: 'mobile',
            phone_number: '+255749679833',
          };
        }
      } else {
        selectedPaymentType.value = null;
        showPaymentInstructions.value = false;
        localPayment.value.payment_details = { type: null };
      }
      console.log('[DEBUG] Payment type changed:', {
        selectedPaymentType: selectedPaymentType.value,
        paymentDetails: localPayment.value.payment_details,
        timestamp: new Date().toISOString(),
      });
      emitPaymentUpdate();
    };

    const clearError = (field: string) => {
      if (errors.value[field]) {
        errors.value[field] = null;
      }
    };

    const validateForm = (): boolean => {
      const errorsLocal: Record<string, string> = {};
      if (!localPayment.value.currency) {
        errorsLocal.currency = 'Please select a currency.';
      }
      if (!localPayment.value.payment_method_id) {
        errorsLocal.payment_method_id = 'Please select a payment method.';
      }
      if (!localPayment.value.payment_type_id) {
        errorsLocal.payment_type_id = 'Please select a payment type.';
      }
      if (!getTotalAmount() || getTotalAmount() <= 0) {
        errorsLocal.payment_amount = 'Payment amount is invalid.';
      }
      if (!localPayment.value.payment_details?.type) {
        errorsLocal.payment_details = 'Payment details are incomplete.';
      }
      if (localPayment.value.payment_details?.type === 'bank_transfer') {
        if (!localPayment.value.payment_details.token) {
          errorsLocal.payment_details = 'Bank account number is required.';
        }
        if (!localPayment.value.payment_details.bank_name) {
          errorsLocal.payment_details = 'Bank name is required.';
        }
      } else if (localPayment.value.payment_details?.type === 'mobile') {
        if (!localPayment.value.payment_details.phone_number) {
          errorsLocal.payment_details = 'Phone number is required.';
        }
      }
      if (props.isRoomBased && !localPayment.value.room_number) {
        errorsLocal.room_number = 'Room number is required for room-based properties.';
      }
      errors.value = errorsLocal;
      const isValid = Object.keys(errorsLocal).length === 0;
      console.log('[DEBUG] Form validation:', {
        isValid,
        errors: errorsLocal,
        paymentDetails: localPayment.value.payment_details,
        amount: localPayment.value.amount,
        timestamp: new Date().toISOString(),
      });
      return isValid;
    };

    const openPaymentConfirmation = async () => {
      if (!validateForm()) {
        showSwal('Validation Error', 'Please correct the payment form errors.', 'error');
        return false;
      }
      const result = await Swal.fire({
        title: 'Confirm Payment Submission',
        text: `Are you sure you want to submit a payment of TZS ${getTotalAmount().toLocaleString()}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Confirm & Submit',
        cancelButtonText: 'Cancel',
      });
      if (result.isConfirmed) {
        return await handleSubmit();
      }
      return false;
    };

    const submitFromParent = async () => {
      return await openPaymentConfirmation();
    };

    const handleSubmit = async () => {
  if (isSubmitting.value) {
    console.log('[DEBUG] handleSubmit skipped: Already submitting', {
      timestamp: new Date().toISOString(),
    });
    return false;
  }
  isSubmitting.value = true;
  loading.value = true;
  loadingText.value = 'Submitting payment...';
  try {
    const paymentDetails = { ...localPayment.value.payment_details };
    const paymentData = {
      user_id: props.userId,
      booking_id: props.bookingId,
      property_id: props.propertyId,
      lease_id: props.leaseId,
      billing_address_id: props.billingAddressId,
      amount: getTotalAmount(),
      currency: localPayment.value.currency,
      payment_method_id: localPayment.value.payment_method_id,
      payment_type_id: localPayment.value.payment_type_id,
      payment_details: paymentDetails,
      transaction_id: `txn_${uuidv4()}_${Date.now()}`,
      status: 'pending',
      date: localPayment.value.date || new Date().toISOString().split('T')[0],
      room_number: props.isRoomBased ? localPayment.value.room_number : undefined,
    };
    console.log('[DEBUG] Submitting payment with data:', {
      paymentData,
      timestamp: new Date().toISOString(),
    });
    const response = await makeRequest({
      method: 'POST',
      url: `${props.apiBaseUrl}/v1/payments`,
      data: paymentData,
      headers: {
        Authorization: `Bearer ${props.authStore.token}`,
        'Content-Type': 'application/json',
      },
      requiresAuth: true,
    });
    const paymentResponse = response.data.data || response.data;
    console.log('[DEBUG] Payment submission response:', {
      paymentResponse,
      status: paymentResponse.status,
      responseRaw: JSON.stringify(response.data),
      timestamp: new Date().toISOString(),
    });
    // Check for payment ID
    paymentId.value = paymentResponse.id || paymentResponse.payment_id;
    if (!paymentId.value) {
      console.error('[DEBUG] No payment ID in response, generating temporary ID', {
        timestamp: new Date().toISOString(),
      });
      paymentId.value = `temp_${uuidv4()}`; // Temporary ID as fallback
      showSwal('Warning', 'No payment ID returned from server. Using temporary ID and retrying.', 'warning');
      // Optionally retry the request
      setTimeout(async () => {
        try {
          const retryResponse = await makeRequest({
            method: 'POST',
            url: `${props.apiBaseUrl}/v1/payments`,
            data: paymentData,
            headers: {
              Authorization: `Bearer ${props.authStore.token}`,
              'Content-Type': 'application/json',
            },
            requiresAuth: true,
          });
          const retryPaymentResponse = retryResponse.data.data || retryResponse.data;
          paymentId.value = retryPaymentResponse.id || retryPaymentResponse.payment_id || paymentId.value;
          console.log('[DEBUG] Retry payment submission response:', {
            retryPaymentResponse,
            paymentId: paymentId.value,
            timestamp: new Date().toISOString(),
          });
        } catch (retryError: any) {
          console.error('[DEBUG] Retry failed in handleSubmit:', {
            error: retryError.message,
            timestamp: new Date().toISOString(),
          });
        }
      }, 2000);
    }
    localPayment.value.transaction_id = paymentResponse.transaction_id || paymentData.transaction_id;
    localPayment.value.status = paymentResponse.status || 'pending';
    localPayment.value.receipt_url = paymentResponse.receipt_url || null;
    localPayment.value.receipt_number = paymentResponse.receipt_number || null;
    emit('payment-submitted', {
      paymentId: paymentId.value,
      transactionId: localPayment.value.transaction_id,
      status: localPayment.value.status,
      receiptUrl: localPayment.value.receipt_url,
      receiptNumber: localPayment.value.receipt_number,
    });
    emitPaymentUpdate();
    showSwal('Success', 'Payment submitted. Awaiting admin approval.', 'success');
    pollPaymentStatus();
    return true;
  } catch (error: any) {
    console.error('[DEBUG] Error in handleSubmit:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
    });
    const serverErrors = error.response?.data?.errors;
    if (serverErrors) {
      Object.keys(serverErrors).forEach((key) => {
        errors.value[key] = Array.isArray(serverErrors[key])
          ? serverErrors[key].join(', ')
          : serverErrors[key];
      });
      errorMessage.value = 'Please correct the following errors:';
      showSwal('Error', errorMessage.value, 'error');
    } else {
      errorMessage.value = error.response?.data?.message || 'Payment processing failed. Please try again.';
      showSwal('Error', errorMessage.value, 'error');
    }
    emit('payment-failed', {
      error,
      paymentId: paymentId.value,
      transactionId: localPayment.value.transaction_id,
    });
    return false;
  } finally {
    loading.value = false;
    loadingText.value = '';
    isSubmitting.value = false;
  }
};

    const pollPaymentStatus = () => {
      if (!paymentId.value) {
        console.error('[DEBUG] pollPaymentStatus: No payment ID, aborting polling', {
          timestamp: new Date().toISOString(),
        });
        showSwal('Error', 'No payment ID found. Please resubmit the payment.', 'error');
        emit('payment-failed', { error: new Error('No payment ID'), paymentId: null });
        return;
      }
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
      }
      let pollCount = 0;
      const maxPolls = 180;
      pollingInterval.value = setInterval(async () => {
        if (pollCount >= maxPolls) {
          clearInterval(pollingInterval.value!);
          showSwal('Timeout', 'Payment approval timeout. Please check later.', 'warning');
          emit('payment-timeout', { paymentId: paymentId.value });
          return;
        }
        pollCount++;
        try {
          const response = await makeRequest({
            method: 'GET',
            url: `${props.apiBaseUrl}/v1/payments/${paymentId.value}`,
            headers: { Authorization: `Bearer ${props.authStore.token}` },
            requiresAuth: true,
          });
          const status = response.data.data?.status || response.data.status;
          console.log('[DEBUG] Polling status:', {
            status,
            pollCount,
            paymentId: paymentId.value,
            transactionId: localPayment.value.transaction_id,
            timestamp: new Date().toISOString(),
          });
          if (status === 'received' || status === 'completed') {
            clearInterval(pollingInterval.value!);
            await handleStatusTransition(status, response.data.data || response.data);
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(pollingInterval.value!);
            await handleStatusTransition(status, response.data.data || response.data);
          }
        } catch (error) {
          console.error('[DEBUG] Polling error:', {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
          if (error.response?.status === 404) {
            clearInterval(pollingInterval.value!);
            showSwal('Error', 'Payment not found. Please resubmit the payment.', 'error');
            emit('payment-failed', { error, paymentId: paymentId.value });
          }
        }
      }, 10000);
    };

    const handleStatusTransition = async (newStatus: string, paymentData: any) => {
      console.log('[DEBUG] handleStatusTransition called:', {
        newStatus,
        paymentData,
        currentStep: currentStep.value,
        receiptUrl: receiptUrl.value,
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        timestamp: new Date().toISOString(),
      });
      localPayment.value.status = newStatus;
      paymentId.value = paymentData.id || paymentId.value;
      receiptUrl.value = paymentData.receipt_url || receiptUrl.value;
      receiptNumber.value = paymentData.receipt_number || receiptNumber.value || `RCP-${Date.now()}`;
      localPayment.value.receipt_url = receiptUrl.value;
      localPayment.value.receipt_number = receiptNumber.value;
      if (newStatus === 'received' || newStatus === 'completed') {
        console.log('[DEBUG] Setting currentStep to completed', {
          timestamp: new Date().toISOString(),
        });
        currentStep.value = 'completed';
        if (!receiptUrl.value) {
          console.log('[DEBUG] No receipt URL, generating receipt', {
            timestamp: new Date().toISOString(),
          });
          await generateReceipt();
          await downloadReceipt();
        } else {
          await downloadReceipt();
        }
        await nextTick();
        emit('payment-completed', {
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
          status: newStatus,
          receiptUrl: receiptUrl.value,
          receiptNumber: receiptNumber.value,
        });
        emitPaymentUpdate();
        showSwal('Payment Completed', 'Your payment has been successfully processed.', 'success');
      } else if (newStatus === 'failed' || newStatus === 'cancelled') {
        console.log('[DEBUG] Setting currentStep to form due to', {
          newStatus,
          timestamp: new Date().toISOString(),
        });
        currentStep.value = 'form';
        paymentId.value = null;
        localPayment.value.transaction_id = null;
        emit(newStatus === 'failed' ? 'payment-failed' : 'payment-cancelled', {
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
        });
        emitPaymentUpdate();
        showSwal('Error', `Payment ${newStatus}. Please try again.`, 'error');
      }
    };

    const generateReceipt = async () => {
      console.log('[DEBUG] generateReceipt called', {
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        timestamp: new Date().toISOString(),
      });
      if (!paymentId.value) {
        console.error('[DEBUG] generateReceipt: No payment ID, aborting', {
          timestamp: new Date().toISOString(),
        });
        showSwal('Error', 'Cannot generate receipt without a payment ID.', 'error');
        return null;
      }
      loading.value = true;
      loadingText.value = 'Generating receipt...';
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const receiptNum = receiptNumber.value || `RCP-${Date.now()}`;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPosition = 20;
        doc.setGState(doc.GState({ opacity: 0.1 }));
        const watermarkWidth = 100;
        const watermarkHeight = 100;
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.src = logoImage;
            img.onload = () => {
              doc.addImage(
                img,
                'PNG',
                (pageWidth - watermarkWidth) / 2,
                (pageHeight - watermarkHeight) / 2,
                watermarkWidth,
                watermarkHeight,
              );
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load watermark image'));
          });
        } catch (error) {
          console.error('[DEBUG] Error in generateReceipt:', {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(50);
          doc.setTextColor(200, 200, 200);
          doc.text('EAGER SKY', pageWidth / 2, pageHeight / 2, { align: 'center' });
        }
        doc.setGState(doc.GState({ opacity: 1 }));
        const logoWidth = 30;
        const logoHeight = 30;
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.src = logoImage;
            img.onload = () => {
              doc.addImage(img, 'PNG', margin, yPosition, logoWidth, logoHeight);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load logo image'));
          });
        } catch (error) {
          console.error('[DEBUG] Error in generateReceipt:', {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(20);
          doc.text('EAGER SKY', margin, yPosition + 10);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('EAGER SKY REAL ESTATE', pageWidth / 2, yPosition + 10, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text('PAYMENT RECEIPT', pageWidth / 2, yPosition + 20, { align: 'center' });
        yPosition += 35;
        doc.setLineDash([2, 2], 0);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Receipt No: ${receiptNum}`, margin, yPosition);
        doc.text(`Date: ${new Date(localPayment.value?.date || Date.now()).toLocaleDateString()}`, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 10;
        doc.text(`Transaction ID: ${localPayment.value.transaction_id || 'N/A'}`, margin, yPosition);
        yPosition += 10;
        doc.text(`Payment ID: ${paymentId.value || 'N/A'}`, margin, yPosition);
        yPosition += 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Payment Details', margin, yPosition);
        yPosition += 5;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total Amount: TZS ${getTotalAmount().toLocaleString()}`, margin, yPosition);
        yPosition += 7;
        doc.text(`Payment Method: ${selectedPaymentType.value || 'N/A'}`, margin, yPosition);
        yPosition += 7;
        doc.text(
          `Rent Period: ${props.selectedTermPeriod?.period_of_payment ? props.selectedTermPeriod.period_of_payment.charAt(0).toUpperCase() + props.selectedTermPeriod.period_of_payment.slice(1) : 'Not specified'}`,
          margin,
          yPosition,
        );
        yPosition += 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Property Information', margin, yPosition);
        yPosition += 5;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Property: ${displayTitle.value}`, margin, yPosition);
        yPosition += 7;
        if (localPayment.value?.room_number && props.isRoomBased) {
          doc.text(`Room Number: ${localPayment.value.room_number}`, margin, yPosition);
          yPosition += 7;
        }
        doc.text(`Location: ${displayLocation.value}`, margin, yPosition);
        yPosition += 7;
        doc.text(`Type: ${displayType.value}`, margin, yPosition);
        yPosition += 15;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Thank you for your payment!', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
        doc.text('Eager Sky Real Estate - Contact: support@eagersky.co.tz', pageWidth / 2, yPosition, { align: 'center' });
        doc.setLineDash();
        const pdfBlob = doc.output('blob');
        receiptUrl.value = URL.createObjectURL(pdfBlob);
        receiptNumber.value = receiptNum;
        localPayment.value.receipt_url = receiptUrl.value;
        console.log('[DEBUG] Receipt generated successfully:', {
          receiptNumber: receiptNumber.value,
          receiptUrl: receiptUrl.value,
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
          timestamp: new Date().toISOString(),
        });
        return doc;
      } catch (error) {
        console.error('[DEBUG] Error in generateReceipt:', {
          error: error instanceof Error ? error.message : String(error),
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
          timestamp: new Date().toISOString(),
        });
        receiptUrl.value = 'https://example.com/fallback-receipt.pdf';
        localPayment.value.receipt_url = receiptUrl.value;
        showSwal('Error', 'Failed to generate receipt. Using fallback URL.', 'warning');
        return null;
      } finally {
        loading.value = false;
        loadingText.value = '';
      }
    };

    const downloadReceipt = async () => {
      if (currentStep.value !== 'completed') {
        showSwal('Error', 'Receipt can only be downloaded in completed step.', 'error');
        console.log('[DEBUG] downloadReceipt blocked: Invalid step', {
          currentStep: currentStep.value,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      try {
        if (!receiptUrl.value) {
          console.log('[DEBUG] No receipt URL, generating receipt', {
            timestamp: new Date().toISOString(),
          });
          await generateReceipt();
          await nextTick();
        }
        const link = document.createElement('a');
        link.href = receiptUrl.value!;
        link.download = `Receipt_${receiptNumber.value || 'payment'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(receptUrl.value!), 1000);
        console.log('[DEBUG] Receipt downloaded:', {
          receiptNumber: receiptNumber.value,
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
          timestamp: new Date().toISOString(),
        });
        emit('receipt-printed', {
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
          receiptNumber: receiptNumber.value,
        });
        showSwal('Success', 'Receipt downloaded successfully.', 'success');
      } catch (error) {
        console.error('[DEBUG] Error in downloadReceipt:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        showSwal('Error', 'Failed to download receipt. Please try manually.', 'error');
      }
    };

    const cancelPayment = async () => {
      console.log('[DEBUG] cancelPayment called', {
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        timestamp: new Date().toISOString(),
      });
      const result = await Swal.fire({
        title: 'Cancel Payment',
        text: 'Are you sure you want to cancel this payment?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Cancel Payment',
        cancelButtonText: 'No, Keep Payment',
      });
      if (!result.isConfirmed) {
        console.log('[DEBUG] Payment cancellation aborted by user', {
          timestamp: new Date().toISOString(),
        });
        return;
      }
      loading.value = true;
      loadingText.value = 'Cancelling payment...';
      try {
        const endpoint = paymentId.value
          ? `${props.apiBaseUrl}/v1/payments/${paymentId.value}`
          : `${props.apiBaseUrl}/v1/payments?transaction_id=${localPayment.value.transaction_id}`;
        console.log('[DEBUG] Cancelling payment with endpoint:', {
          endpoint,
          timestamp: new Date().toISOString(),
        });
        await makeRequest({
          method: 'DELETE',
          url: endpoint,
          headers: { Authorization: `Bearer ${props.authStore.token}` },
          requiresAuth: true,
        });
        currentStep.value = 'form';
        paymentId.value = null;
        localPayment.value.transaction_id = null;
        localPayment.value.status = undefined;
        localPayment.value.receipt_url = null;
        localPayment.value.receipt_number = null;
        console.log('[DEBUG] Payment cancelled, resetting to form step', {
          timestamp: new Date().toISOString(),
        });
        emit('payment-cancelled', {
          paymentId: paymentId.value,
          transactionId: localPayment.value.transaction_id,
        });
        emitPaymentUpdate();
        showSwal('Payment Cancelled', 'Your payment has been cancelled.', 'success');
      } catch (error: any) {
        console.error('[DEBUG] Error in cancelPayment:', {
          error: error.message,
          response: error.response?.data,
          timestamp: new Date().toISOString(),
        });
        showSwal('Error', 'Failed to cancel payment.', 'error');
      } finally {
        loading.value = false;
        loadingText.value = '';
      }
    };

    const emitPaymentUpdate = () => {
      if (!paymentId.value && localPayment.value.status === 'completed') {
        console.error('[DEBUG] emitPaymentUpdate: No payment ID for completed payment', {
          transactionId: localPayment.value.transaction_id,
          status: localPayment.value.status,
          timestamp: new Date().toISOString(),
        });
        showSwal('Error', 'No payment ID available. Please resubmit the payment.', 'error');
        emit('payment-failed', { error: new Error('No payment ID'), paymentId: null });
        return;
      }
      const isValid = validateForm();
      console.log('[DEBUG] Emitting payment-update', {
        payment: { ...localPayment.value },
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        status: localPayment.value.status,
        receiptUrl: receiptUrl.value ? 'data:application/pdf;base64,...(truncated)' : null,
        receiptNumber: receiptNumber.value,
        isValid,
        timestamp: new Date().toISOString(),
      });
      const paymentCopy = {
        ...localPayment.value,
        receipt_url: receiptUrl.value,
        receipt_number: receiptNumber.value,
      };
      emit('update:payment', {
        payment: paymentCopy,
        paymentId: paymentId.value,
        transactionId: localPayment.value.transaction_id,
        status: localPayment.value.status,
        receiptUrl: receiptUrl.value,
        receiptNumber: receiptNumber.value,
        isValid,
      });
    };

    const viewAgreement = () => {
      console.log('[DEBUG] viewAgreement called', {
        leaseId: props.leaseId,
        timestamp: new Date().toISOString(),
      });
      emit('view-agreement', { leaseId: props.leaseId });
    };

    const showSwal = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info') => {
      console.log('[DEBUG] Showing Swal:', {
        title,
        text,
        icon,
        timestamp: new Date().toISOString(),
      });
      Swal.fire({
        title,
        text,
        icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      });
    };

    defineExpose({
      submitFromParent,
      getFormState,
      getPaymentId,
    });

    return {
      localPayment,
      loading,
      loadingText,
      errorMessage,
      errors,
      paymentMethods,
      paymentTypes,
      showPaymentInstructions,
      selectedPaymentType,
      currentStep,
      paymentId,
      receiptUrl,
      receiptNumber,
      isMobile,
      displayTitle,
      displayLocation,
      displayType,
      getTotalAmount,
      computedPaymentMultiplier,
      fetchPaymentMethods,
      fetchPaymentTypes,
      onPaymentTypeChange,
      clearError,
      validateForm,
      openPaymentConfirmation,
      handleSubmit,
      downloadReceipt,
      cancelPayment,
      emitPaymentUpdate,
      viewAgreement,
      getFormState,
      getPaymentId,
      submitFromParent,
    };
  },
});
</script>

<style scoped>
.payment-form {
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

.header-logo {
  padding: 20px;
  text-align: center;
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

.text-danger {
  color: #dc2626;
}

input,
select,
.readonly-field {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  font-family: inherit;
}

input:focus,
select:focus,
.readonly-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

input:hover,
select:hover,
.readonly-field:hover {
  border-color: #cbd5e1;
}

input.error,
select.error,
.readonly-field.error {
  border-color: #dc2626;
  background-color: #fff5f5;
}

.readonly-field {
  background-color: #e9ecef;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn:hover:before {
  left: 100%;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #334155;
}

.btn-secondary:hover {
  background-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(203, 213, 225, 0.4);
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

.info-card.caution {
  background: linear-gradient(135deg, #fef3c7, #fef9c3);
  border: 1px solid #facc15;
}

.info-card.caution::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #facc15, #f59e0b);
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

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin: 24px 0;
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

.status-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.status-card.success {
  border-top: 4px solid #10b981;
}

.status-icon {
  margin-bottom: 20px;
}

.status-icon svg {
  width: 64px;
  height: 64px;
}

.status-message {
  color: #64748b;
  font-size: 1.1rem;
  margin-bottom: 30px;
  line-height: 1.6;
}

.payment-summary {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin: 25px 0;
  text-align: left;
}

.payment-summary h3 {
  color: #1e293b;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2rem;
  text-align: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.summary-label {
  font-weight: 600;
  color: #475569;
}

.summary-value {
  color: #334155;
}

.next-steps {
  margin-top: 30px;
  text-align: left;
}

.next-steps h3 {
  color: #1e293b;
  margin-bottom: 15px;
  font-size: 1.2rem;
  text-align: center;
}

.steps-list {
  padding-left: 20px;
  margin: 0;
}

.steps-list li {
  margin-bottom: 10px;
  color: #475569;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
}

@media (max-width: 768px) {
  .payment-form {
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
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .action-buttons {
    flex-direction: column;
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
  .status-card {
    padding: 20px 15px;
  }
}

@media print {
  .payment-form {
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