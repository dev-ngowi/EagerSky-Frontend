<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">Submit Maintenance Request</h2>
    <template v-if="isLoadingProperties || isLoadingRooms">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading form data...'" />
      </div>
    </template>
    <template v-else-if="formError">
      <div class="text-center py-4 text-red-600">
        {{ formError }}
        <button class="ml-4 text-blue-600 underline" @click="retryFetch">Retry</button>
      </div>
    </template>
    <template v-else>
      <form @submit.prevent="submitMaintenanceRequest">
        <div class="form-group mb-4">
          <label for="property_id" class="block mb-2 font-semibold text-gray-900">Property</label>
          <VaSelect
            v-model="form.property_id"
            :options="properties"
            value-by="id"
            text-by="title"
            placeholder="Select a property"
            class="w-full"
            :disabled="isSubmitting || isLoadingProperties"
            @update:modelValue="fetchRooms"
            :rules="[(v) => !!v || 'Property is required']"
          />
          <p v-if="properties.length === 0" class="text-red-600 text-sm mt-2">
            No properties available. Please contact support.
          </p>
        </div>
        <div class="form-group mb-4">
          <label for="room_id" class="block mb-2 font-semibold text-gray-900">Room</label>
          <VaSelect
            v-model="form.room_id"
            :options="rooms"
            value-by="id"
            :text-by="formatRoomText"
            placeholder="Select a room"
            class="w-full"
            :disabled="isSubmitting || isLoadingRooms || !form.property_id || rooms.length === 0"
            :rules="[(v) => !!v || 'Room is required']"
          />
          <p v-if="form.property_id && rooms.length === 0" class="text-red-600 text-sm mt-2">
            No rooms available for this property.
          </p>
        </div>
        <div class="form-group mb-4">
          <label for="description" class="block mb-2 font-semibold text-gray-900">Description</label>
          <VaInput
            v-model="form.description"
            type="textarea"
            placeholder="Describe the maintenance issue in detail (minimum 10 characters)"
            class="w-full"
            :disabled="isSubmitting"
            :min-rows="5"
            :rules="[(v) => (v && v.length >= 10) || 'Description must be at least 10 characters']"
          />
        </div>
        <div class="form-group">
          <VaButton
            type="submit"
            color="primary"
            size="large"
            :disabled="isSubmitting || isLoadingRooms || isLoadingProperties || !form.property_id || !form.room_id"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
          </VaButton>
        </div>
        <div v-if="formError" class="text-red-600 mt-2">{{ formError }}</div>
      </form>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../services/makeRequest';
import Loader from '../../../components/Loader.vue';

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

interface ErrorMessages {
  [key: string]: string;
}

const router = useRouter();
const isSubmitting = ref(false);
const isLoadingRooms = ref(false);
const isLoadingProperties = ref(false);
const formError = ref<string>('');
const properties = ref<Property[]>([]);
const rooms = ref<Room[]>([]);
const form = ref({
  property_id: '',
  room_id: '',
  description: '',
});

// Error message mapping with explicit type
const ERROR_MESSAGES: ErrorMessages = {
  'You do not have an active lease for this property': 'No active lease found for this property.',
  'Property not found': 'The selected property does not exist.',
  'Unauthenticated': 'Please log in to continue.',
};

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
    return userData;
  } catch (error) {
    console.error('Error parsing userData:', error);
    return null;
  }
};

// **FIX 1: Separate function for room text formatting with proper typing**
const formatRoomText = (room: Room | null | undefined): string => {
  if (!room) return '';
  return `${room.room_number}${room.description ? ` (${room.description})` : ''}`;
};

const fetchProperties = async () => {
  isLoadingProperties.value = true;
  formError.value = '';

  const userData = getUserData();
  if (!userData) {
    Swal.fire({
      title: 'Authentication Error!',
      text: 'Your session has expired. Please log in again.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: true,
      confirmButtonText: 'Go to Login',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('userData');
        router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      }
    });
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

    // **Type assertion to ensure rooms array contains Room objects**
    rooms.value = (response.data?.data || []) as Room[];
    if (rooms.value.length === 0) {
      formError.value = 'No rooms available for this property.';
    }
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    // **FIX 2: Proper type-safe error message lookup**
    const errorMsg = error.response?.data?.message || 'Failed to load rooms.';
    formError.value = ERROR_MESSAGES[errorMsg as keyof ErrorMessages] || errorMsg;
    rooms.value = [];
  } finally {
    isLoadingRooms.value = false;
    form.value.room_id = '';
  }
}, 300);

const submitMaintenanceRequest = async () => {
  isSubmitting.value = true;
  formError.value = '';

  const userData = getUserData();
  if (!userData) {
    Swal.fire({
      title: 'Authentication Error!',
      text: 'Your session has expired. Please log in again.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: true,
      confirmButtonText: 'Go to Login',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('userData');
        router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      }
    });
    isSubmitting.value = false;
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

    Swal.fire({
      title: 'Success!',
      text: 'Maintenance request submitted successfully.',
      icon: 'success',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });

    form.value = { property_id: '', room_id: '', description: '' };
    rooms.value = [];
  } catch (error: any) {
    console.error('Error creating maintenance request:', error);
    formError.value = error.response?.data?.message || 'Failed to create maintenance request.';
    Swal.fire({
      title: 'Error!',
      text: formError.value,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 5000,
    });
  } finally {
    isSubmitting.value = false;
  }
};

const retryFetch = async () => {
  formError.value = '';
  await fetchProperties();
  if (form.value.property_id) {
    await fetchRooms();
  }
};

fetchProperties();
</script>

<style lang="scss" scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-4 {
  padding: 1rem;
}
.loadingSpiner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
.mb-4 {
  margin-bottom: 1rem;
}
.text-gray-500 {
  color: #6b7280;
}
.text-gray-900 {
  color: #111827;
}
.text-blue-600 {
  color: #2563eb;
}
.text-red-600 {
  color: #dc2626;
}
.font-semibold {
  font-weight: 600;
}
.text-sm {
  font-size: 0.875rem;
}
.text-2xl {
  font-size: 1.5rem;
}
.font-bold {
  font-weight: 700;
}
.w-full {
  width: 100%;
}
.text-center {
  text-align: center;
}
</style>