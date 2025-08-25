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
          <li class="active" aria-current="page">Maintenance Requests</li>
        </ol>
      </nav>

      <div class="flex justify-between items-center mb-4">
        <h2>Maintenance Requests</h2>
        <button
          class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          @click="openModal"
          aria-label="Create new maintenance request"
        >
          New Request
        </button>
      </div>

      <div v-if="isLoading" class="loading text-center p-6">
        <div class="spinner"></div>
        <p>Loading maintenance requests...</p>
      </div>
      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <button
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="fetchMaintenanceRequests"
            aria-label="Retry loading maintenance requests"
          >
            Try Again
          </button>
        </div>
      </div>
      <div v-else-if="maintenanceRequests.length === 0" class="no-data text-center p-6">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <h3 class="text-2xl font-bold text-gray-900 mb-2">No Maintenance Requests Found</h3>
          <p class="text-gray-600 mb-6">You haven't submitted any maintenance requests yet.</p>
          <button
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="openModal"
            aria-label="Create new maintenance request"
          >
            Create Request
          </button>
        </div>
      </div>
      <div v-else class="activity-table">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Description</th>
              <th>Contractor</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="request in maintenanceRequests" :key="request.id">
              <td>{{ request.property_title || 'N/A' }}</td>
              <td>{{ request.description || 'N/A' }}</td>
              <td>
                {{ request.contractor_name || 'Not Assigned' }}
                <span v-if="!request.contractor_name" class="text-sm text-gray-500">
                  (Waiting for contractor to be assigned to resolve the case)
                </span>
              </td>
              <td>
                <span
                  :class="{
                    'badge': true,
                    'bg-success': request.status === 'completed',
                    'bg-warning': request.status === 'pending',
                    'bg-danger': request.status === 'rejected'
                  }"
                >
                  {{ request.status || 'N/A' }}
                </span>
              </td>
              <td>{{ formatDate(request.created_at) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal for creating maintenance request -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create Maintenance Request</h3>
            <button class="close-button" @click="closeModal" aria-label="Close modal">×</button>
          </div>
          <form @submit.prevent="submitMaintenanceRequest">
            <div class="form-group">
              <label for="property_id">Property</label>
              <select
                v-model="form.property_id"
                id="property_id"
                class="form-control"
                required
                :disabled="isSubmitting"
              >
                <option value="" disabled>Select a property</option>
                <option v-for="property in properties" :key="property.id" :value="property.id">
                  {{ property.title }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                v-model="form.description"
                id="description"
                class="form-control"
                rows="5"
                minlength="10"
                required
                :disabled="isSubmitting"
                placeholder="Describe the maintenance issue in detail (minimum 10 characters)"
              ></textarea>
            </div>
            <div class="form-group">
              <button
                type="submit"
                class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                :disabled="isSubmitting"
              >
                {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
              </button>
            </div>
            <div v-if="formError" class="error-message text-red-600 mt-2">{{ formError }}</div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import makeRequest from '../../../services/makeRequest';

interface MaintenanceRequest {
  id: string;
  property_id: string;
  property_title: string | null;
  user_id: string;
  user_name: string | null;
  contractor_id: string | null;
  contractor_name: string | null;
  description: string;
  status: string;
  created_at: string;
}

interface Property {
  id: string;
  title: string;
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
const maintenanceRequests = ref<MaintenanceRequest[]>([]);
const showModal = ref(false);
const isSubmitting = ref(false);
const formError = ref('');
const properties = ref<Property[]>([]);

const form = ref({
  property_id: '',
  description: '',
});

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

const fetchMaintenanceRequests = async () => {
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
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/maintenance-requests`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    console.log('Maintenance Requests API Response:', response);

    const requestData = response.data?.data || [];

    if (Array.isArray(requestData)) {
      maintenanceRequests.value = requestData.map((request: any): MaintenanceRequest => ({
        id: request.id,
        property_id: request.property_id,
        property_title: request.property_title || 'N/A',
        user_id: request.user_id,
        user_name: request.user_name || 'N/A',
        contractor_id: request.contractor_id,
        contractor_name: request.contractor_name || 'Not Assigned',
        description: request.description || 'N/A',
        status: request.status || 'N/A',
        created_at: request.created_at || '',
      }));
    } else {
      console.warn('Unexpected response format:', response.data);
      maintenanceRequests.value = [];
      showError.value = true;
      errorMessage.value = 'Unexpected response format from server.';
    }

    console.log('Processed maintenance requests:', maintenanceRequests.value);
  } catch (error: any) {
    console.error('Error fetching maintenance requests:', error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || 'Failed to fetch maintenance requests.';
  } finally {
    isLoading.value = false;
  }
};

const fetchProperties = async () => {
  const userData = getUserData();
  if (!userData) return;

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/leases`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    const leaseData = response.data?.data || [];
    properties.value = leaseData
      .filter((lease: any) => !lease.deleted_at)
      .map((lease: any) => ({
        id: lease.property_id,
        title: lease.property_title || 'N/A',
      }));
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    formError.value = 'Failed to load properties.';
  }
};

const openModal = () => {
  form.value = { property_id: '', description: '' };
  formError.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const submitMaintenanceRequest = async () => {
  isSubmitting.value = true;
  formError.value = '';

  const userData = getUserData();
  if (!userData) {
    closeModal();
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'POST',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/maintenance-requests`,
      headers: { Authorization: `Bearer ${userData.token}` },
      data: form.value,
      requiresAuth: true,
    });

    console.log('Maintenance Request Creation Response:', response);

    maintenanceRequests.value.unshift({
      id: response.data.data.id,
      property_id: response.data.data.property_id,
      property_title: response.data.data.property_title || 'N/A',
      user_id: response.data.data.user_id,
      user_name: response.data.data.user_name || 'N/A',
      contractor_id: response.data.data.contractor_id,
      contractor_name: response.data.data.contractor_name || 'Not Assigned',
      description: response.data.data.description,
      status: response.data.data.status,
      created_at: response.data.data.created_at,
    });

    closeModal();
  } catch (error: any) {
    console.error('Error creating maintenance request:', error);
    formError.value = error.response?.data?.message || 'Failed to create maintenance request.';
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  const userData = getUserData();
  console.log('MaintenanceRequests mounted, user data:', userData);
  if (!userData) {
    console.log('No valid user data on mount, redirecting to login');
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  fetchMaintenanceRequests();
  fetchProperties();
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

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      padding: 20px;
      border-radius: 10px;
      width: 100%;
      max-width: 500px;
      position: relative;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h3 {
        font-size: 1.25rem;
        color: #2c3e50;
      }

      .close-button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #7f8c8d;
      }
    }

    .form-group {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #2c3e50;
      }

      .form-control {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        font-size: 1rem;
        color: #2c3e50;

        &:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      }

      textarea.form-control {
        resize: vertical;
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