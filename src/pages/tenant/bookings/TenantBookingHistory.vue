<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="isLoading">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading bookings...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="text-center py-4 text-red-600">
        {{ errorMessage }}
        <button class="ml-4 text-blue-600 underline" @click="retryFetch">
          Retry
        </button>
      </div> 
    </template>
    <template v-else>
      <div class="flex justify-between items-center mb-6 flex-wrap space-y-4 md:space-y-0">
        <div class="flex items-center space-x-4 w-full md:w-auto">
          <VaInput
            v-model="searchQuery"
            placeholder="Search bookings by property, room, or client name"
            class="w-full md:w-64"
            :disabled="isLoading"
            @input="debouncedSearch"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" class="flex-shrink-0">
            Clear Search
          </VaButton>
        </div>
        
        <div class="flex items-center space-x-4 w-full md:w-auto justify-end">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-32 flex-shrink-0"
            @update:modelValue="handlePerPageChange"
          />
        </div>
      </div>
      
      <div v-if="bookings.length === 0" class="text-center py-6 text-gray-500">
        No bookings found
      </div>
      <div v-else class="overflow-x-auto min-w-full">
        <VaDataTable
          :key="componentKey"
          :items="bookings"
          striped
          :columns="columns"
          :loading="isLoading"
          :hoverable="true"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ ((pagination.current_page - 1) * pagination.per_page) + rowIndex + 1 }}
          </template>
          <template #cell(properties_rooms)="{ rowData }">
            <span v-if="rowData.booking_property_type_name === 'property'">
              {{ rowData.properties?.map(p => p.title).join(', ') || 'None' }}
            </span>
            <span v-else-if="rowData.booking_property_type_name === 'room'">
              {{ 
                rowData.rooms?.map(r => 
                  r.property?.title && r.property.title !== 'None' 
                    ? `${r.property.title} (Room ${r.room_number})` 
                    : r.room_number
                ).join(', ') || 'None' 
              }}
            </span>
            <span v-else>None</span>
          </template>
          <template #cell(client_fullname)="{ rowData }">
            <div class="cursor-pointer font-medium text-blue-600 hover:underline" @click="openView(rowData)">
              {{ rowData.client_fullname || 'None' }}
            </div>
          </template>
          <template #cell(date)="{ rowData }">
            {{ formatDate(rowData.date, 'd MMMM yyyy') }}
          </template>
          <template #cell(time_slot)="{ rowData }">
            {{ formatTime(rowData.time_slot) }}
          </template>
          <template #cell(duration)="{ rowData }">
            {{ rowData.duration ? `${rowData.duration} ${rowData.booking_property_type_name === 'room' ? 'day(s)' : 'minute(s)'}` : 'N/A' }}
          </template>
          <template #cell(status)="{ rowData }">
            <span :class="getStatusClass(rowData.status)">
              {{ formatStatus(rowData.status) }}
            </span>
          </template>
        </VaDataTable>
      </div>
      
      <div v-if="bookings.length > 0" class="flex justify-between items-center mt-6 flex-wrap space-y-4 md:space-y-0">
        <div class="text-sm w-full md:w-auto text-center md:text-left">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} bookings
        </div>
        <div class="flex space-x-2 w-full md:w-auto justify-center md:justify-end">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || isLoading"
            @click="handlePageChange(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || isLoading"
            @click="handlePageChange(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
      
      <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-6">
        <div class="text-lg font-bold mb-6">Booking Details</div>
        <div v-if="selectedBooking" class="space-y-2 text-sm">
          <p><strong>Booking Type:</strong> {{ selectedBooking.booking_property_type_name || 'None' }}</p>
          <p v-if="selectedBooking.booking_property_type_name === 'property'">
            <strong>Properties:</strong> {{ selectedBooking.properties?.map(p => p.title).join(', ') || 'None' }}
          </p>
          <p v-if="selectedBooking.booking_property_type_name === 'room'">
            <strong>Rooms:</strong> {{ selectedBooking.rooms?.map(r => r.room_number).join(', ') || 'None' }}
          </p>
          <p><strong>Client:</strong> {{ selectedBooking.client_fullname || 'None' }}</p>
          <p><strong>Appointment Type:</strong> {{ selectedBooking.appointment_type_name || 'None' }}</p>
          <p><strong>Date:</strong> {{ formatDate(selectedBooking.date, 'd MMMM yyyy') || 'None' }}</p>
          <p><strong>Time Slot:</strong> {{ formatTime(selectedBooking.time_slot) || 'None' }}</p>
          <p>
            <strong>Duration:</strong>
            {{ selectedBooking.duration ? `${selectedBooking.duration} ${selectedBooking.booking_property_type_name === 'room' ? 'day(s)' : 'minute(s)'}` : 'None' }}
          </p>
          <p><strong>Recurrence:</strong> {{ selectedBooking.recurrence || 'None' }}</p>
          <p><strong>Status:</strong> {{ formatStatus(selectedBooking.status) || 'None' }}</p>
          <p><strong>Notes:</strong> {{ selectedBooking.notes || 'None' }}</p>
          <p><strong>Created At:</strong> {{ formatDate(selectedBooking.created_at, 'd MMMM yyyy HH:mm') || 'None' }}</p>
          <p><strong>Updated At:</strong> {{ formatDate(selectedBooking.updated_at, 'd MMMM yyyy HH:mm') || 'None' }}</p>
        </div>
        <div class="flex justify-end mt-6 space-x-2">
          <VaButton color="secondary" @click="closeView">Close</VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import makeRequest from '../../../services/makeRequest';
import Loader from '../../../components/Loader.vue';

interface Booking {
  id: string;
  booking_property_type_id: number;
  booking_property_type_name: string;
  properties: { id: number; title: string }[];
  rooms: { id: number; room_number: string; property?: { id: number; title: string } }[];
  client_id: number;
  client_fullname: string;
  appointment_type_id: number;
  appointment_type_name: string;
  date: string;
  duration: number | null;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface UserData {
  id: number;
  token: string;
  expiresAt: number;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

interface ErrorResponseData {
  message?: string;
  errors?: Record<string, string[]>;
}

const isErrorResponseData = (data: unknown): data is ErrorResponseData => {
  return typeof data === 'object' && data !== null && ('message' in data || 'errors' in data);
};

// RESPONSIVE LOGIC: State and listener for screen size
const screenWidth = ref(window.innerWidth);
const isMobile = computed(() => screenWidth.value < 768);

const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth;
};

// RESPONSIVE LOGIC: Computed columns to hide less important data on mobile
const columns = computed(() => {
  const baseColumns = [
    { key: 'sn', sortable: false, label: 'SN', width: '50px' },
    { key: 'properties_rooms', sortable: false, label: 'Property/Room' },
    { key: 'client_fullname', sortable: true, label: 'Client' },
    { key: 'appointment_type_name', sortable: true, label: 'Appt Type' },
    { key: 'date', sortable: true, label: 'Date' },
    { key: 'time_slot', sortable: true, label: 'Time' },
    { key: 'duration', sortable: true, label: 'Duration' },
    { key: 'status', sortable: true, label: 'Status' },
  ];

  if (isMobile.value) {
    // Keep only the most crucial columns on small screens
    return baseColumns.filter(column => 
      !['appointment_type_name', 'time_slot', 'duration'].includes(column.key)
    );
  }
  return baseColumns;
});

const bookings = ref<Booking[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const showView = ref<boolean>(false);
const selectedBooking = ref<Booking | null>(null);
const componentKey = ref<number>(0);
const searchQuery = ref<string>('');
const pagination = ref<Pagination>({
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: 0,
  to: 0,
});

const perPageOptions = ref([
  { value: 10, text: '10' },
  { value: 25, text: '25' },
  { value: 50, text: '50' },
]);

const router = useRouter();
let cachedUserData: UserData | null = null;

const paginationPages = computed<number[]>(() => {
  const pages: number[] = [];
  const lastPage = pagination.value.last_page || 1;
  const current = pagination.value.current_page || 1;
  const range = isMobile.value ? 1 : 2; // Smaller range on mobile
  let start = Math.max(1, current - range);
  let end = Math.min(lastPage, current + range);

  if (end - start < 2 * range) {
    if (start === 1) {
      end = Math.min(lastPage, start + 2 * range);
    } else if (end === lastPage) {
      start = Math.max(1, end - 2 * range);
    }
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const computedPagination = computed<Pagination>(() => {
  const current = pagination.value.current_page || 1;
  const perPage = pagination.value.per_page || 10;
  const total = pagination.value.total || 0;
  return {
    current_page: current,
    per_page: perPage,
    total,
    last_page: Math.ceil(total / perPage) || 1,
    from: total > 0 ? (current - 1) * perPage + 1 : 0,
    to: Math.min(current * perPage, total),
  };
});

const getUserData = (): UserData | null => {
  if (cachedUserData) return cachedUserData;
  const userDataString = localStorage.getItem('userData');
  if (!userDataString) return null;

  try {
    const userData = JSON.parse(userDataString);
    if (!userData.id || !userData.token || !userData.expiresAt) return null;
    if (userData.expiresAt < Date.now()) {
      localStorage.removeItem('userData');
      return null;
    }
    cachedUserData = userData;
    return userData;
  } catch (error) {
    console.error('Error parsing userData:', error);
    return null;
  }
};

const formatDate = (date: string | null, formatString: string): string => {
  if (!date) return 'N/A';
  try {
    const parsedDate = parseISO(date);
    return isValid(parsedDate) ? format(parsedDate, formatString) : 'N/A';
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return 'N/A';
  }
};

const formatTime = (timeString: string): string => {
  if (!timeString) return 'N/A';
  try {
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;
    if (!timePattern.test(timeString)) {
      return timeString.substring(0, 5); // Return HH:mm if format is unexpected
    }
    const paddedTime = timeString.length === 5 ? `${timeString}:00` : timeString;
    
    const [h, m] = paddedTime.split(':');
    const date = new Date();
    date.setHours(parseInt(h));
    date.setMinutes(parseInt(m));
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting time:', timeString, error);
    return 'Invalid Time';
  }
};

// **FIXED: Type-safe status formatting**
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

// **FIXED: Type-safe status class mapping**
const getStatusClass = (status: string): string => {
  const normalizedStatus = status ? status.toLowerCase().trim() : 'pending';
  const statusClasses: { [key: string]: string } = {
    pending: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
    confirmed: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
    completed: 'bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
    cancelled: 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
    canceled: 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
  };
  
  return statusClasses[normalizedStatus] || 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap';
};

const fetchBookings = async (params: { page?: number; per_page?: number; search?: string; status?: string; with_trashed?: boolean } = {}) => {
  isLoading.value = true;
  errorMessage.value = null;

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
    isLoading.value = false;
    return;
  }

  try {
    const baseUrl = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/user-bookings`;
    const searchParams = new URLSearchParams({
      user_id: userData.id.toString(),
      page: (params.page || pagination.value.current_page).toString(),
      per_page: (params.per_page || pagination.value.per_page).toString(),
    });
    
    if (params.search || searchQuery.value) {
      searchParams.append('search', params.search || searchQuery.value);
    }
    if (params.status) {
      searchParams.append('status', params.status);
    }
    if (params.with_trashed) {
      searchParams.append('with_trashed', '1');
    }

    const url = `${baseUrl}?${searchParams.toString()}`;

    const response = await makeRequest({
      method: 'GET',
      url,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    if (!response.data || !response.data.data) {
      throw new Error('No data received from server');
    }

    const bookingData = response.data.data;
    if (!Array.isArray(bookingData)) {
      throw new Error('Invalid response format - expected array of bookings');
    }

    bookings.value = bookingData.map((booking: any, index: number): Booking => {
      return {
        id: booking.id?.toString() || `booking-${Date.now()}-${index}`,
        booking_property_type_id: booking.booking_property_type_id || 0,
        booking_property_type_name: booking.booking_property_type_name || 'property',
        properties: Array.isArray(booking.properties) ? booking.properties.map((p: any) => ({
          id: p.id || 0,
          title: p.title || 'None',
        })) : [],
        rooms: Array.isArray(booking.rooms) ? booking.rooms.map((r: any) => ({
          id: r.id || 0,
          room_number: r.room_number || 'None',
          property: r.property ? { 
            id: r.property.id || 0, 
            title: r.property.title || 'None' 
          } : undefined,
        })) : [],
        client_id: booking.client_id || 0,
        client_fullname: booking.client_fullname || 'None',
        appointment_type_id: booking.appointment_type_id || 0,
        appointment_type_name: booking.appointment_type_name || 'None',
        date: booking.date || '',
        duration: booking.duration || null,
        time_slot: booking.time_slot || '',
        recurrence: booking.recurrence || 'None',
        status: booking.status || 'pending',
        notes: booking.notes || 'None',
        created_at: booking.created_at || '',
        updated_at: booking.updated_at || '',
        deleted_at: booking.deleted_at || null,
      };
    });

    const paginationData = response.data.pagination || {};
    pagination.value = {
      total: paginationData.total || bookingData.length || 0,
      per_page: paginationData.per_page || params.per_page || 10,
      current_page: paginationData.current_page || params.page || 1,
      last_page: paginationData.last_page || Math.ceil((paginationData.total || bookingData.length) / (paginationData.per_page || 10)) || 1,
      from: paginationData.from || 0,
      to: paginationData.to || bookingData.length || 0,
    };
    
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    
    let errorMessageText = 'Failed to fetch bookings.';
    
    if (error.response?.status === 401) {
      errorMessageText = 'Your session has expired or the token is invalid. Please log in again.';
      Swal.fire({
        title: 'Authentication Error!',
        text: errorMessageText,
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
    } else if (error.response?.data?.message) {
      errorMessageText = error.response.data.message;
    } else if (error.message) {
      errorMessageText = error.message;
    }

    errorMessage.value = errorMessageText;
    Swal.fire({
      title: 'Error!',
      text: errorMessageText,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 5000,
    });
  } finally {
    isLoading.value = false;
  }
};

const openView = (booking: Booking) => {
  selectedBooking.value = booking;
  showView.value = true;
};

const closeView = () => {
  selectedBooking.value = null;
  showView.value = false;
};

const retryFetch = async () => {
  errorMessage.value = null;
  await fetchBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const handlePageChange = async (page: number) => {
  if (isLoading.value) return;
  if (page < 1 || page > pagination.value.last_page) {
    return;
  }
  pagination.value.current_page = page;
  await fetchBookings({
    page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const handlePerPageChange = async (perPage: number) => {
  if (isLoading.value) return;
  pagination.value.per_page = perPage || 10;
  pagination.value.current_page = 1;
  await fetchBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const clearSearch = () => {
  searchQuery.value = '';
  pagination.value.current_page = 1;
  fetchBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const debouncedSearch = debounce(() => {
  if (isLoading.value) return;
  pagination.value.current_page = 1;
  fetchBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
}, 300);

onMounted(() => {
  const userData = getUserData();
  if (!userData) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  
  // Initialize responsive listener
  updateScreenWidth();
  window.addEventListener('resize', updateScreenWidth);
  
  retryFetch();
});

onUnmounted(() => {
  // Clean up the listener when the component is destroyed
  window.removeEventListener('resize', updateScreenWidth);
});
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
.mb-6 {
  margin-bottom: 1.5rem;
}
.mt-6 {
  margin-top: 1.5rem;
}
.flex {
  display: flex;
}
.justify-between {
  justify-content: space-between;
}
.items-center {
  align-items: center;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
.text-gray-500 {
  color: #6b7280;
}
.text-red-600 {
  color: #dc2626;
}
.text-blue-600 {
  color: #2563eb;
}
.font-medium {
  font-weight: 500;
}
.text-sm {
  font-size: 0.875rem;
}
.text-xs {
  font-size: 0.75rem;
}
.w-64 {
  width: 16rem;
}
.w-32 {
  width: 8rem;
}
.text-center {
  text-align: center;
}
.underline {
  text-decoration: underline;
}
.flex-shrink-0 {
  flex-shrink: 0;
}
.justify-end {
  justify-content: flex-end;
}

/* Status Badges */
.bg-yellow-100 { 
  background-color: #fefcbf; 
}
.text-yellow-800 { 
  color: #975a16; 
}
.bg-green-100 { 
  background-color: #d1fae5; 
}
.text-green-800 { 
  color: #065f46; 
}
.bg-teal-100 { 
  background-color: #ccfbf1; 
}
.text-teal-800 { 
  color: #0e7490; 
}
.bg-red-100 { 
  background-color: #fee2e2; 
}
.text-red-800 { 
  color: #9b2c2c; 
}
.whitespace-nowrap { 
  white-space: nowrap; 
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .flex-wrap {
    flex-wrap: wrap;
  }
  .space-y-4 > :not(:last-child) {
    margin-bottom: 1rem;
  }
  .w-full {
    width: 100%;
  }
  .md\:w-auto {
    width: auto;
  }
  .md\:w-64 {
    width: 100%;
  }
  .md\:space-y-0 > :not(:last-child) {
    margin-top: 0;
    margin-bottom: 0;
  }
  
  .overflow-x-auto {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }
}

/* Modal styles */
.p-6 {
  padding: 1.5rem;
}
</style>