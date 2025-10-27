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
          <li class="active" aria-current="page">Booking History</li>
        </ol>
      </nav>

      <h2>Booking History</h2>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading text-center p-6">
        <div class="spinner"></div>
        <p>Loading bookings...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <button
            class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="fetchBookings"
            aria-label="Retry loading bookings"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- No Bookings State -->
      <div v-else-if="bookings.length === 0" class="no-data text-center p-6">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <h3 class="text-2xl font-bold text-gray-900 mb-2">No Bookings Found</h3>
          <p class="text-gray-600 mb-6">You haven't made any bookings yet.</p>
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

      <!-- Bookings Table -->
      <div v-else class="activity-table">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Appointment Type</th>
              <th>Date</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in bookings" :key="booking.id">
              <td>{{ booking.display_title }}</td>
              <td>{{ booking.appointment_type_name }}</td>
              <td>{{ formatDate(booking.date) }}</td>
              <td>{{ formatTime(booking.time_slot) }}</td>
              <td>{{ booking.duration ? `${booking.duration} min` : 'N/A' }}</td>
              <td>
                <span :class="getStatusClass(booking.status)">
                  {{ formatStatus(booking.status) }}
                </span>
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

interface Booking {
  id: string;
  display_title: string;
  appointment_type_name: string;
  date: string;
  time_slot: string;
  duration: number | null;
  status: string;
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
const bookings = ref<Booking[]>([]);

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

const getPropertyNameFromRoom = (roomNumber: string): string => {
  if (!roomNumber || roomNumber === 'N/A') return 'Unknown Property';

  const roomLower = roomNumber.toLowerCase().replace(/[^a-z]/g, '');
  const propertyMap: { [key: string]: string } = {
    mzumbe: 'Mzumbe Hostel',
    mzumbehostel: 'Mzumbe Hostel',
    udsm: 'UDSM Hostel',
    udsmhostel: 'UDSM Hostel',
    hotel: 'Hotel',
    apartment: 'Apartment',
    guest: 'Guest House',
  };

  for (const [key, value] of Object.entries(propertyMap)) {
    if (roomLower.includes(key)) return value;
  }

  const match = roomNumber.match(/^([a-zA-Z]+)/);
  if (match) {
    const propertyPart = match[1];
    return propertyPart.charAt(0).toUpperCase() + propertyPart.slice(1).toLowerCase() + ' Property';
  }

  return 'Unknown Property';
};

const formatDate = (dateString: string): string => {
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

const formatTime = (timeString: string): string => {
  if (!timeString) return 'N/A';
  try {
    // Check if timeString is in valid format (HH:MM:SS or HH:MM)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;
    if (!timePattern.test(timeString)) {
      return 'Invalid Time';
    }
    // Pad timeString to ensure HH:MM:SS format
    const paddedTime = timeString.length === 5 ? `${timeString}:00` : timeString;
    return new Date(`1970-01-01T${paddedTime}Z`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Nairobi'
    });
  } catch (error) {
    console.error('Error formatting time:', timeString, error);
    return 'Invalid Time';
  }
};

const formatStatus = (status: string): string => {
  if (!status) return 'Pending';
  const normalizedStatus = status.toLowerCase().trim();
  const statusMap: { [key: string]: string } = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
  };
  return statusMap[normalizedStatus] || 'Pending';
};

const getStatusClass = (status: string): object => {
  const normalizedStatus = status ? status.toLowerCase().trim() : 'pending';
  return {
    badge: true,
    'bg-success': normalizedStatus === 'confirmed',
    'bg-complete': normalizedStatus === 'completed',
    'bg-warning': normalizedStatus === 'pending',
    'bg-danger': normalizedStatus === 'cancelled' || normalizedStatus === 'canceled',
  };
};

const fetchBookings = async () => {
  isLoading.value = true;
  showError.value = false;
  errorMessage.value = '';

  const userData = getUserData();
  if (!userData) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/user-bookings?user_id=${userData.id}`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    const bookingData = response.data?.data || [];
    if (!Array.isArray(bookingData)) {
      throw new Error('Invalid response format');
    }

    bookings.value = bookingData.map((booking: any): Booking => {
      let displayTitle = booking.property_title && booking.property_title !== 'N/A'
        ? booking.property_title
        : 'Unknown Property';

      if (displayTitle === 'Unknown Property' && booking.rooms?.length > 0 && booking.rooms[0].room_number && booking.rooms[0].room_number !== 'N/A') {
        displayTitle = getPropertyNameFromRoom(booking.rooms[0].room_number);
      }

      if (booking.booking_property_type_name === 'room' && booking.rooms?.length > 0 && booking.rooms[0].room_number && booking.rooms[0].room_number !== 'N/A') {
        displayTitle += ` (Room ${booking.rooms[0].room_number})`;
      }

      return {
        id: booking.id || `booking-${Math.random().toString(36).slice(2, 11)}`,
        display_title: displayTitle,
        appointment_type_name: booking.appointment_type_name || 'N/A',
        date: booking.date || '',
        time_slot: booking.time_slot || '',
        duration: booking.duration || null,
        status: booking.status || 'pending',
      };
    });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || 'Failed to fetch bookings.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  const userData = getUserData();
  if (!userData) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  fetchBookings();
});
</script>

<style lang="scss" scoped>
.account-home {
  padding: clamp(20px, 5vw, 40px);
  background: #f4f7fa;
}

.activity-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.breadcrumb {
  margin-bottom: 20px;
}

.breadcrumb ol {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: clamp(0.9rem, 2vw, 1rem);
  color: #7f8c8d;
}

.breadcrumb li:not(:last-child)::after {
  content: '>';
  margin: 0 8px;
  color: #7f8c8d;
}

.breadcrumb-link {
  color: #2563eb;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #1e40af;
  text-decoration: underline;
}

.breadcrumb .active {
  color: #2c3e50;
  font-weight: 600;
}

.activity-section h2 {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 20px;
}

.activity-table {
  overflow-x: auto;
}

.activity-table table {
  width: 100%;
  border-collapse: collapse;
}

.activity-table th,
.activity-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

.activity-table th {
  background: #ecf0f1;
  color: #2c3e50;
  font-weight: 600;
}

.activity-table td {
  color: #7f8c8d;
  vertical-align: middle;
}

.activity-table td:last-child {
  text-align: center;
}

.badge {
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: white;
  text-align: center;
  text-transform: capitalize;
  min-width: 80px;
}

.badge.bg-success {
  background-color: #22c55e;
}

.badge.bg-complete {
  background-color: #34d399;
}

.badge.bg-warning {
  background-color: #eab308;
}

.badge.bg-danger {
  background-color: #ef4444;
}

.loading .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #2563eb;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.loading p {
  color: #4b5563;
  font-size: clamp(0.9rem, 2vw, 1rem);
}

.error-message .error-content i {
  display: block;
}

.no-data .cta-button {
  display: inline-flex;
  align-items: center;
}

@media (max-width: 768px) {
  .activity-table table {
    min-width: 0;
  }
  .activity-table th,
  .activity-table td {
    font-size: 0.85rem;
    padding: 8px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>