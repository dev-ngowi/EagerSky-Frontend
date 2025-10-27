<template>
  <div class="account-home">
    <div class="activity-section">
      <!-- Breadcrumb Navigation -->
      <nav class="breadcrumb" aria-label="breadcrumb">
        <ol>
          <li>
            <router-link to="/" class="breadcrumb-link">Home</router-link>
          </li>
          <li>
            <router-link to="/account" class="breadcrumb-link">Account</router-link>
          </li>
          <li class="active" aria-current="page">Payment History</li>
        </ol>
      </nav>

      <h2>Payment History</h2>
      <div v-if="isLoading" class="loading text-center p-6">
        <div class="spinner"></div>
        <p>Loading payment history...</p>
      </div>
      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <button
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="fetchPayments"
            aria-label="Retry loading payments"
          >
            Try Again
          </button>
        </div>
      </div>
      <div v-else-if="payments.length === 0" class="no-data text-center p-6">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <h3 class="text-2xl font-bold text-gray-900 mb-2">No Payments Found</h3>
          <p class="text-gray-600 mb-6">You haven't made any payments yet.</p>
          <router-link
            to="/all-properties"
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            aria-label="Browse properties"
          >
            Browse Properties
            <i class="bi bi-arrow-right ml-2" aria-hidden="true"></i>
          </router-link>
        </div>
      </div>
      <div v-else class="activity-table">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Payment Type</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment.payment_id">
              <td>{{ payment.property_title }}</td>
              <td>{{ payment.amount ? `${payment.currency} ${Number(payment.amount).toLocaleString()}` : 'N/A' }}</td>
              <td>{{ formatDate(payment.date) }}</td>
              <td>
                <span
                  :class="{
                    'badge': true,
                    'bg-completed': payment.status === 'completed',
                    'bg-refunded': payment.status === 'refunded',
                    'bg-received': payment.status === 'received',
                    'bg-pending': payment.status === 'pending'
                  }"
                >
                  {{ payment.status }}
                </span>
              </td>
              <td>{{ payment.payment_method_name }}</td>
              <td>{{ payment.payment_type_name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import makeRequest from '../../../services/makeRequest';

interface Payment {
  payment_id: string;
  property_title: string;
  amount: number | null;
  currency: string;
  date: string;
  status: string;
  payment_method_name: string;
  payment_type_name: string;
}

interface UserData {
  id: number;
  token: string;
  expiresAt: number;
}

const router = useRouter();
const isLoading = ref(true);
const showError = ref(false);
const errorMessage = ref('');
const payments = ref<Payment[]>([]);

const getUserData = (): UserData | null => {
  const userDataString = localStorage.getItem('userData');
  if (!userDataString) return null;
  try {
    const userData = JSON.parse(userDataString);
    if (!userData.id || !userData.token || !userData.expiresAt) return null;
    if (userData.expiresAt < Date.now()) {
      localStorage.removeItem('userData');
      return null;
    }
    return {
      id: userData.id,
      token: userData.token,
      expiresAt: userData.expiresAt,
    };
  } catch (error) {
    console.error('Error parsing userData:', error);
    return null;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'N/A';
  }
};

const fetchPayments = async () => {
  isLoading.value = true;
  showError.value = false;
  errorMessage.value = '';

  const userData = getUserData();
  if (!userData) {
    console.log('No valid user data, redirecting to login');
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/payments`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    console.log('Payments API Response:', response);
    const paymentData = response.data?.data || [];

    if (Array.isArray(paymentData)) {
      payments.value = paymentData.map((payment: any): Payment => {
        const propertyTitle = payment.property_payments?.[0]?.property?.title || 'General Payment';
        const paymentMethod = payment.payment_method?.method_name || 'N/A';
        const paymentType = payment.payment_type?.name || 'N/A';

        return {
          payment_id: payment.payment_id || `payment-${Math.random().toString(36).substr(2, 9)}`,
          property_title: propertyTitle,
          amount: payment.amount || null,
          currency: payment.currency || 'TZS',
          date: payment.date || '',
          status: payment.status || 'unknown',
          payment_method_name: paymentMethod,
          payment_type_name: paymentType,
        };
      });
    } else {
      console.warn('Unexpected payments response format:', response.data);
      payments.value = [];
      showError.value = true;
      errorMessage.value = 'Unexpected response format from server.';
    }

    console.log('Processed payments:', payments.value);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || 'Failed to fetch payments.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  const userData = getUserData();
  console.log('PaymentHistory mounted, user data:', userData);
  if (!userData) {
    console.log('No valid user data on mount, redirecting to login');
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  fetchPayments();
});
</script>

<style lang="scss" scoped>
.account-home {
  padding: clamp(20px, 5vw, 40px);
  background: #f4f7fa;

  .activity-section {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);

    .breadcrumb {
      margin-bottom: 20px;
      
      ol {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: clamp(0.9rem, 2vw, 1rem);
        color: #7f8c8d;

        li {
          display: flex;
          align-items: center;

          &:not(:last-child)::after {
            content: '>';
            margin: 0 8px;
            color: #7f8c8d;
          }

          .breadcrumb-link {
            color: #2563eb;
            text-decoration: none;
            transition: color 0.2s;

            &:hover {
              color: #1e40af;
              text-decoration: underline;
            }
          }

          &.active {
            color: #2c3e50;
            font-weight: 600;
          }
        }
      }
    }

    h2 {
      font-size: 1.5rem;
      color: #2c3e50;
      margin-bottom: 20px;
    }

    .activity-table {
      table {
        width: 100%;
        border-collapse: collapse;

        th,
        td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ecf0f1;
        }

        th {
          background: #ecf0f1;
          color: #2c3e50;
          font-weight: 600;
        }

        td {
          color: #7f8c8d;
        }

        .badge {
          padding: 5px 10px;
          border-radius: 12px;
          font-size: 0.9rem;
          color: white;

          &.bg-completed {
            background-color: #16a34a;
          }

          &.bg-refunded {
            background-color: #6b7280;
          }

          &.bg-received {
            background-color: #059669;
          }

          &.bg-pending {
            background-color: #d97706;
          }
        }
      }
    }

    .loading {
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #2563eb;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }

      p {
        color: #4b5563;
        font-size: clamp(0.9rem, 2vw, 1rem);
      }
    }

    .error-message {
      .error-content {
        i {
          display: block;
        }
      }
    }

    .no-data {
      .cta-button {
        display: inline-flex;
        align-items: center;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>