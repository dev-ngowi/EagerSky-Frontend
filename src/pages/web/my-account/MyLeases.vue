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
          <li class="active" aria-current="page">Leases</li>
        </ol>
      </nav>

      <h2>Leases</h2>
      <div v-if="isLoading" class="loading text-center p-6">
        <div class="spinner"></div>
        <p>Loading leases...</p>
      </div>
      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <button
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="fetchLeases"
            aria-label="Retry loading leases"
          >
            Try Again
          </button>
        </div>
      </div>
      <div v-else-if="leases.length === 0" class="no-data text-center p-6">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <h3 class="text-2xl font-bold text-gray-900 mb-2">No Leases Found</h3>
          <p class="text-gray-600 mb-6">You haven't signed any leases yet.</p>
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
              <th>Start Date</th>
              <th>End Date</th>
              <th>Terms</th>
              <th>Rent Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lease in leases" :key="lease.id">
              <td>{{ lease.property_title || 'N/A' }}</td>
              <td>{{ formatDate(lease.start_date) }}</td>
              <td>{{ formatDate(lease.end_date) }}</td>
              <td>{{ lease.terms || 'N/A' }}</td>
              <td>{{ lease.rent_amount ? `TZS ${Number(lease.rent_amount).toLocaleString()}` : 'N/A' }}</td>
              <td>
                <span
                  :class="{
                    'badge': true,
                    'bg-success': lease.is_signed,
                    'bg-warning': !lease.is_signed
                  }"
                >
                  {{ lease.is_signed ? 'Signed' : 'Unsigned' }}
                </span>
              </td>
              <td>
                <button
                  v-if="lease.is_signed"
                  class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  @click="downloadLease(lease.id)"
                  :disabled="downloadingLease === lease.id"
                >
                  <span v-if="downloadingLease === lease.id" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  {{ downloadingLease === lease.id ? 'Downloading...' : 'Download Lease' }}
                </button>
                <span v-else>-</span>
              </td>
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
import Swal from 'sweetalert2';

interface Lease {
  id: string;
  property_title: string | null;
  start_date: string | null;
  end_date: string | null;
  terms: string | null;
  rent_amount: number | null;
  is_signed: boolean;
  room_id?: number | null;
  room_number?: string | null;
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
const leases = ref<Lease[]>([]);
const downloadingLease = ref<string | null>(null);

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

const formatDate = (dateString: string | null) => {
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

const fetchLeases = async () => {
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
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/leases`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    console.log('Leases API Response:', JSON.stringify(response.data, null, 2));

    const leaseData = response.data?.data || [];
    if (Array.isArray(leaseData)) {
      leases.value = leaseData.map((lease: any): Lease => ({
        id: lease.id.toString(),
        property_title: lease.property_title || 'N/A',
        start_date: lease.start_date || null,
        end_date: lease.end_date || null,
        terms: lease.terms || 'N/A',
        rent_amount: lease.rent_amount || null,
        is_signed: lease.is_signed || false,
        room_id: lease.room_id || null,
        room_number: lease.room_number || null,
      }));
    } else {
      console.warn('Unexpected leases response format:', response.data);
      showError.value = true;
      errorMessage.value = 'Unexpected response format from server.';
    }
  } catch (error: any) {
    console.error('Error fetching leases:', error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || 'Failed to fetch leases.';
  } finally {
    isLoading.value = false;
  }
};

const downloadLease = async (leaseId: string) => {
  console.log('Attempting to download lease:', leaseId);
  downloadingLease.value = leaseId;
  const userData = getUserData();
  if (!userData) {
    console.log('No valid user data, redirecting to login');
    downloadingLease.value = null;
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/leases/${leaseId}/pdf`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    console.log('Download Lease Response:', JSON.stringify(response.data, null, 2));

    const pdfUrl = response.data?.data?.url;
    if (response.data?.status === 'success' && pdfUrl) {
      try {
        new URL(pdfUrl);
        const pdfWindow = window.open(pdfUrl, '_blank');
        if (!pdfWindow) {
          Swal.fire({
            icon: 'warning',
            title: 'Pop-up Blocked',
            text: 'Your browser blocked the new tab. Please allow pop-ups for this site and try again.',
            confirmButtonColor: '#007bff',
          });
          return;
        }
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Your lease is opening in a new tab.',
          confirmButtonColor: '#007bff',
          timer: 3000,
          timerProgressBar: true,
        });
      } catch (urlError) {
        console.error('Invalid PDF URL received from server:', pdfUrl, urlError);
        Swal.fire({
          icon: 'error',
          title: 'Invalid URL',
          text: 'The server provided an invalid URL for the PDF.',
          confirmButtonColor: '#007bff',
        });
      }
    } else {
      console.warn('Failed to get PDF URL from response:', response.data);
      Swal.fire({
        icon: 'error',
        title: 'Could Not Get PDF',
        text: response.data?.message || 'The server did not provide a valid PDF link. Please try again.',
        confirmButtonColor: '#007bff',
      });
    }
  } catch (error: any) {
    console.error('PDF download error:', error.response || error);
    let errorMessage = error.response?.data?.message || 'An unexpected error occurred while downloading the lease.';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('userData');
      router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      errorMessage = 'Session expired. Please log in again.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Unauthorized: You can only download your own lease.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Lease not found or not signed.';
    } else if (error.response?.status === 422) {
      errorMessage = error.response?.data?.message || 'Payment not completed for this lease.';
    } else if (error.status === 0 || error.message.includes('Network Error')) {
      errorMessage = 'Network error: Failed to connect to the server.';
    }

    Swal.fire({
      icon: 'error',
      title: 'Download Failed',
      text: errorMessage,
      confirmButtonColor: '#007bff',
      timer: 5000,
    });
  } finally {
    downloadingLease.value = null;
  }
};

onMounted(() => {
  const userData = getUserData();
  console.log('Leases mounted, user data:', userData);
  if (!userData) {
    console.log('No valid user data on mount, redirecting to login');
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  fetchLeases();
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

          &.bg-success {
            background-color: #22c55e;
          }

          &.bg-warning {
            background-color: #eab308;
          }

          &.bg-danger {
            background-color: #ef4444;
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