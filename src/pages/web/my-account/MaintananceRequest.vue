<template>
  <div class="account-home">
    <div class="activity-section">
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
              <th>Room</th>
              <th>Description</th>
              <th>Contractor</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="request in maintenanceRequests" :key="request.id">
              <td>{{ request.property_title || 'N/A' }}</td>
              <td>{{ request.room_number || 'N/A' }}</td>
              <td>{{ request.description || 'N/A' }}</td>
              <td>
                <span v-if="request.contractor_name">{{ request.contractor_name }}</span>
                <span v-else class="badge bg-waiting">Please wait for contractor assignment</span>
              </td>
              <td>
                <span class="badge" :class="statusBadgeClass(request.status)">
                  {{ formatStatus(request.status) }}
                </span>
              </td>
              <td>{{ formatDate(request.created_at) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
                :disabled="isSubmitting || isLoadingProperties"
                @change="fetchRooms"
              >
                <option value="" disabled>Select a property</option>
                <option v-for="property in properties" :key="property.id" :value="property.id">
                  {{ property.title }}
                </option>
              </select>
              <p v-if="isLoadingProperties" class="text-gray-600 text-sm mt-2">Loading properties...</p>
              <p v-else-if="properties.length === 0" class="text-red-600 text-sm mt-2">
                No properties available. Please contact support.
              </p>
            </div>
            <div class="form-group">
              <label for="room_id">Room</label>
              <select
                v-model="form.room_id"
                id="room_id"
                class="form-control"
                required
                :disabled="isSubmitting || isLoadingRooms || !form.property_id || rooms.length === 0"
              >
                <option value="" disabled>Select a room</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">
                  {{ room.room_number }} {{ room.description ? `(${room.description})` : '' }}
                </option>
              </select>
              <p v-if="isLoadingRooms" class="text-gray-600 text-sm mt-2">Loading rooms...</p>
              <p v-else-if="form.property_id && rooms.length === 0" class="text-red-600 text-sm mt-2">
                No rooms available for this property.
              </p>
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
                :disabled="isSubmitting || isLoadingRooms || isLoadingProperties || !form.property_id || !form.room_id"
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
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import makeRequest from '../../../services/makeRequest';
import { debounce } from 'lodash'; // Optional: Import lodash for debouncing

interface MaintenanceRequest {
  id: string;
  property_id: string;
  property_title: string | null;
  room_id: string | null;
  room_number: string | null;
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

interface Room {
  id: string;
  room_number: string;
  description: string | null;
}

interface UserData {
  id: number;
  token: string;
  expiresAt: number;
}

// Define the type for the error message mapping object
type ErrorMap = {
  [key: string]: string;
};

const router = useRouter();
const isLoading = ref(true);
const showError = ref(false);
const errorMessage = ref('');
const maintenanceRequests = ref<MaintenanceRequest[]>([]);
const showModal = ref(false);
const isSubmitting = ref(false);
const isLoadingRooms = ref(false);
const isLoadingProperties = ref(false);
const formError = ref('');
const properties = ref<Property[]>([]);
const rooms = ref<Room[]>([]);

const form = ref({
  property_id: '',
  room_id: '',
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

const formatStatus = (status: string) => {
  if (!status) return 'N/A';
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
};

const statusBadgeClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'bg-success';
    case 'pending':
      return 'bg-warning';
    case 'in_progress':
      return 'bg-info';
    case 'rejected':
      return 'bg-danger';
    default:
      return 'bg-gray';
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
        room_id: request.room_id,
        room_number: request.room_number || 'N/A',
        user_id: request.user_id,
        user_name: request.user_name || 'N/A',
        contractor_id: request.contractor_id,
        contractor_name: request.contractor_name || null,
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
  } catch (error: any) {
    console.error('Error fetching maintenance requests:', error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || 'Failed to fetch maintenance requests.';
  } finally {
    isLoading.value = false;
  }
};

const fetchProperties = async () => {
  isLoadingProperties.value = true;
  formError.value = '';

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

    const leaseData = response.data?.data || [];
    // Deduplicate properties by property_id
    const uniqueProperties = new Map();
    leaseData
      .filter((lease: any) => !lease.deleted_at && lease.property_id && lease.property_title)
      .forEach((lease: any) => {
        uniqueProperties.set(lease.property_id, {
          id: lease.property_id,
          title: lease.property_title || 'N/A',
        });
      });

    properties.value = Array.from(uniqueProperties.values());
    if (properties.value.length === 0) {
      formError.value = 'No properties found for your active leases.';
    }
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    formError.value = error.response?.data?.message || 'Failed to load properties.';
    properties.value = [];
  } finally {
    isLoadingProperties.value = false;
  }
};

// Debounced fetchRooms to prevent rapid API calls (optional)
const fetchRooms = debounce(async () => {
  if (!form.value.property_id) {
    rooms.value = [];
    form.value.room_id = '';
    return;
  }

  isLoadingRooms.value = true;
  formError.value = '';

  const userData = getUserData();
  if (!userData) {
    closeModal();
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/maintenance-requests/rooms/${form.value.property_id}`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    console.log('Rooms API Response:', response);

    rooms.value = response.data?.data || [];
    if (rooms.value.length === 0) {
      formError.value = 'No rooms available for this property.';
    }
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    const errorMsg: string = error.response?.data?.message || 'Failed to load rooms.';
    
    // ✨ FIX: Use the ErrorMap type definition to allow indexing with a string type
    const errorMap: ErrorMap = {
      'You do not have an active lease for this property': 'No active lease found for this property.',
      'Property not found': 'The selected property does not exist.',
      'Unauthenticated': 'Please log in to continue.',
    };

    // Cast errorMsg to keyof ErrorMap or simply use the index signature
    formError.value = errorMap[errorMsg] || errorMsg; 
    
    rooms.value = [];
  } finally {
    isLoadingRooms.value = false;
    form.value.room_id = ''; // Reset room selection
  }
}, 300);

const openModal = async () => {
  form.value = { property_id: '', room_id: '', description: '' };
  rooms.value = [];
  formError.value = '';
  await fetchProperties(); // Fetch properties when opening modal
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  form.value = { property_id: '', room_id: '', description: '' };
  rooms.value = [];
  formError.value = '';
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
      room_id: response.data.data.room_id,
      room_number: response.data.data.room_number || 'N/A',
      user_id: response.data.data.user_id,
      user_name: response.data.data.user_name || 'N/A',
      contractor_id: response.data.data.contractor_id,
      contractor_name: response.data.data.contractor_name || null,
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
  // Fetch properties only when opening modal to avoid unnecessary API calls
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
          display: inline-block;
          text-transform: capitalize;

          &.bg-success {
            background-color: #22c55e;
          }

          &.bg-warning {
            background-color: #eab308;
          }

          &.bg-info {
            background-color: #3b82f6;
          }

          &.bg-danger {
            background-color: #ef4444;
          }

          &.bg-gray {
            background-color: #6b7280;
          }

          &.bg-waiting {
            background-color: #f59e0b;
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