<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingBookings">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading pending bookings...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading pending bookings"
        >
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-container">
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search pending bookings by property, room, or client name"
            class="search-input"
            :disabled="loadingBookings"
            @input="debouncedSearch"
            aria-label="Search pending bookings by property, room, or client name"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search query">
            Clear Search
          </VaButton>
        </div>
        <div class="per-page-container">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
        </div>
      </div>
      <div
        v-if="!bookings || (bookings.length === 0 && !loadingBookings)"
        class="no-data-message"
      >
        No pending bookings available
      </div>
      <div v-else-if="bookings && bookings.length > 0" class="table-responsive">
        <VaDataTable
          :key="componentKey"
          :items="bookings"
          striped
          :columns="columns"
          :loading="loadingBookings"
          :hoverable="true"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
          </template>
          <template #cell(properties_rooms)="{ rowData }">
            <span v-if="rowData.booking_property_type_id === 1">
              {{ rowData.properties?.map(p => p.title).join(', ') || 'None' }}
            </span>
            <span v-else-if="rowData.booking_property_type_id === 2">
              {{ rowData.rooms?.map(r => r.room_number).join(', ') || 'None' }}
            </span>
            <span v-else>None</span>
          </template>
          <template #cell(status)="{ rowData }">
            <span class="status-badge">
              {{ rowData.status }}
            </span>
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="action-buttons">
              <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" aria-label="View booking details" />
              <VaButton
                size="small"
                color="success"
                icon="check"
                :disabled="loadingAction"
                @click="confirmApprove(rowData)"
                v-if="rowData.status === 'pending'"
                aria-label="Approve booking"
              />
              <VaButton
                size="small"
                color="danger"
                icon="close"
                :disabled="loadingAction"
                @click="confirmReject(rowData)"
                v-if="rowData.status === 'pending'"
                aria-label="Reject booking"
              />
            </div>
          </template>
        </VaDataTable>
      </div>
      <div v-if="bookings && bookings.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} pending bookings
        </div>
        <div class="pagination-buttons">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingBookings"
            @click="handlePageChange(pagination.current_page - 1)"
            aria-label="Go to previous page"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
            :aria-label="`Go to page ${page}`"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingBookings"
            @click="handlePageChange(pagination.current_page + 1)"
            aria-label="Go to next page"
          >
            Next
          </VaButton>
        </div>
      </div>
      <VaModal v-model="showView" :size="isMobile ? 'full' : 'medium'" layout="centered" close-button hide-default-actions class="modal-container">
        <div class="modal-title">{{ $t('Pending Booking Details', 'Pending Booking Details') }}</div>
        <div v-if="selectedBooking" class="modal-content">
          <p><strong>Booking Type:</strong> {{ selectedBooking.booking_property_type_name || (selectedBooking.booking_property_type_id === 1 ? 'Property' : 'Room') }}</p>
          <p v-if="selectedBooking.booking_property_type_id === 1">
            <strong>Properties:</strong> {{ selectedBooking.properties?.map(p => p.title).join(', ') || 'None' }}
          </p>
          <p v-if="selectedBooking.booking_property_type_id === 2">
            <strong>Rooms:</strong> {{ selectedBooking.rooms?.map(r => r.room_number).join(', ') || 'None' }}
          </p>
          <p><strong>Client:</strong> {{ selectedBooking.client_fullname || 'None' }}</p>
          <p><strong>Appointment Type:</strong> {{ selectedBooking.appointment_type_name || 'None' }}</p>
          <p><strong>Date:</strong> {{ formatDate(selectedBooking.date, 'd MMMM yyyy') || 'None' }}</p>
          <p>
            <strong>Duration:</strong>
            {{ selectedBooking.duration || 'None' }}
            {{ selectedBooking.booking_property_type_id === 2 ? 'day(s)' : 'minute(s)' }}
          </p>
          <p><strong>Time Slot:</strong> {{ selectedBooking.time_slot || 'None' }}</p>
          <p><strong>Recurrence:</strong> {{ selectedBooking.recurrence || 'None' }}</p>
          <p><strong>Status:</strong> {{ selectedBooking.status || 'None' }}</p>
          <p><strong>Notes:</strong> {{ selectedBooking.notes || 'None' }}</p>
          <p><strong>Created At:</strong> {{ formatDate(selectedBooking.created_at, 'd MMMM yyyy HH:mm') || 'None' }}</p>
          <p><strong>Updated At:</strong> {{ formatDate(selectedBooking.updated_at, 'd MMMM yyyy HH:mm') || 'None' }}</p>
        </div>
        <div class="modal-footer">
          <VaButton
            color="success"
            :disabled="loadingAction"
            @click="confirmApprove(selectedBooking)"
            v-if="selectedBooking?.status === 'pending'"
            aria-label="Confirm booking"
          >
            Confirm
          </VaButton>
          <VaButton
            color="danger"
            :disabled="loadingAction"
            @click="confirmReject(selectedBooking)"
            v-if="selectedBooking?.status === 'pending'"
            aria-label="Cancel booking"
          >
            Cancel
          </VaButton>
          <VaButton color="secondary" @click="closeView" aria-label="Close booking details modal">Close</VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useBreakpoint } from 'vuestic-ui';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';
import Loader from '../../../../components/Loader.vue';

// --- Local Type Definitions ---
interface Room {
  room_id: number;
  room_number: string;
  property_id?: number;
}

interface Property {
  id: number;
  title: string;
}

interface Booking {
  id: number;
  booking_property_type_id: number;
  booking_property_type_name: string;
  properties: Property[];
  rooms: Room[];
  client_id: number;
  client_fullname: string;
  appointment_type_id: number;
  appointment_type_name: string;
  date: string;
  duration: number;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

interface GetBookingsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

// Interface for Error Response
interface ErrorResponseData {
  message?: string;
  errors?: Record<string, string[]>;
}

const isErrorResponseData = (data: unknown): data is ErrorResponseData => {
  return typeof data === 'object' && data !== null && ('message' in data || 'errors' in data);
};

// Fixed: Use useBreakpoint composable instead of globalConfig
const breakpoints = useBreakpoint();
const isMobile = computed(() => breakpoints.xs || breakpoints.sm);

// Reactive state
const columns = ref([
  { key: 'sn', sortable: false, label: 'SN' },
  { key: 'properties_rooms', sortable: false, label: 'Properties/Rooms' },
  { key: 'client_fullname', sortable: true, label: 'Client' },
  { key: 'appointment_type_name', sortable: true, label: 'Appointment Type' },
  { key: 'date', sortable: true, label: 'Date' },
  { key: 'time_slot', sortable: true, label: 'Time Slot' },
  { key: 'status', sortable: true, label: 'Status' },
  { key: 'actions', label: 'Actions', sortable: false },
]);

const bookings = ref<Booking[]>([]);
const loadingBookings = ref<boolean>(false);
const loadingAction = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const showView = ref<boolean>(false);
const selectedBooking = ref<Booking | null>(null);
const componentKey = ref<number>(0);
const searchQuery = ref<string>('');

const pagination = ref<Pagination>({
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
  from: 0,
  to: 0,
});

const perPageOptions = ref([
  { value: 10, text: '10' },
  { value: 25, text: '25' },
  { value: 50, text: '50' },
]);

const paginationPages = computed<number[]>(() => {
  const pages: number[] = [];
  const lastPage = pagination.value.last_page || 1;
  const current = pagination.value.current_page || 1;
  const range = 2;

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

// Format date function
const formatDate = (date: string | Date | null, formatString: string): string => {
  if (!date) return 'None';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsedDate) ? format(parsedDate, formatString) : 'None';
};

// Get authenticated user ID
const getAuthUserId = (): number | null => {
  const userProfile = localStorage.getItem('userProfile');
  if (userProfile) {
    try {
      const parsed = JSON.parse(userProfile);
      return parsed.id ? Number(parsed.id) : null;
    } catch (error) {
      console.error('Error parsing userProfile:', error);
      return null;
    }
  }
  return null;
};

// Fetch bookings
const getBookings = async (params: GetBookingsParams = {}) => {
  loadingBookings.value = true;
  try {
    console.log('Fetching bookings with params:', {
      page: params.page || pagination.value.current_page,
      perPage: params.per_page || pagination.value.per_page,
      search: params.search || searchQuery.value,
      status: 'pending',
    });

    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
      method: 'get',
      requiresAuth: true,
      params: {
        page: params.page || 1,
        per_page: params.per_page || pagination.value.per_page || 10,
        search: params.search || '',
        status: 'pending',
      },
    });

    if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
      bookings.value = response.data.data
        .filter((booking: any) => booking && booking.booking_id)
        .map((booking: any): Booking => ({
          id: Number(booking.booking_id),
          booking_property_type_id: Number(booking.booking_property_type_id),
          booking_property_type_name: booking.booking_property_type?.name || (booking.booking_property_type_id === 1 ? 'Property' : 'Room'),
          properties: booking.properties?.map((p: any) => ({
            id: Number(p.id),
            title: p.title || `Property ${p.id}`,
          })) || [],
          rooms: booking.rooms?.map((r: any) => ({
            room_id: Number(r.room_id),
            room_number: r.room_number || `Room ${r.room_id}`,
            property_id: r.property_id ? Number(r.property_id) : undefined,
          })) || [],
          client_id: Number(booking.client_id),
          client_fullname: booking.client ? `${booking.client.first_name || ''} ${booking.client.last_name || ''}`.trim() || 'Unknown Client' : 'Unknown Client',
          appointment_type_id: Number(booking.appointment_type_id),
          appointment_type_name: booking.appointment_type?.name || 'Unknown Type',
          date: booking.date,
          duration: Number(booking.duration),
          time_slot: booking.time_slot,
          recurrence: booking.recurrence || 'None',
          status: booking.status || 'pending',
          notes: booking.notes ?? '',
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          deleted_at: booking.deleted_at || null,
        }));

      pagination.value = {
        total: response.data.pagination?.total_items || response.data.data.length || 0,
        per_page: Number(response.data.pagination?.items_per_page) || params.per_page || 10,
        current_page: Number(response.data.pagination?.current_page) || params.page || 1,
        last_page: Math.ceil((response.data.pagination?.total_items || response.data.data.length || 0) / (response.data.pagination?.items_per_page || params.per_page || 10)) || 1,
        from: (response.data.pagination?.total_items || response.data.data.length || 0) > 0 ? ((response.data.pagination?.current_page || params.page || 1) - 1) * (response.data.pagination?.items_per_page || params.per_page || 10) + 1 : 0,
        to: Math.min((response.data.pagination?.current_page || params.page || 1) * (response.data.pagination?.items_per_page || params.per_page || 10), response.data.pagination?.total_items || response.data.data.length || 0),
      };

      console.log('Transformed bookings:', bookings.value);
      console.log('Updated pagination:', pagination.value);

      if (bookings.value.length === 0) {
        Swal.fire({
          title: 'Info',
          text: 'No pending bookings found.',
          icon: 'info',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } else {
      throw new Error(isErrorResponseData(response?.data) ? response.data.message || 'Failed to fetch pending bookings.' : 'Failed to fetch pending bookings.');
    }
  } catch (error: any) {
    console.error('getBookings error:', error.message, error.response?.data);
    let errorMessageText = error.response?.data?.message || 'Failed to fetch pending bookings.';

    if (error.message.includes('Network Error')) {
      errorMessageText = 'Network error: Unable to connect to the server. Please check your internet connection.';
    } else if (error.response?.status === 401) {
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
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('jwt');
          localStorage.removeItem('userProfile');
          import('vue-router').then(({ useRouter }) => {
            const router = useRouter();
            router.push('/login');
          });
        }
      });
      return;
    } else if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessageText = Object.values(error.response.data.errors).flat().join('; ');
    }

    errorMessage.value = errorMessageText;
    Swal.fire({
      title: 'Error!',
      text: errorMessageText,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
  } finally {
    loadingBookings.value = false;
  }
};

// Approve booking
const approveBooking = async (bookingId: number) => {
  loadingAction.value = true;
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${bookingId}/approve`,
      method: 'post',
      requiresAuth: true,
    });

    if (response.status === 200) {
      Swal.fire({
        title: 'Confirmed!',
        text: 'Booking has been confirmed successfully. A confirmation email has been sent to the user.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
      });
      return response;
    } else {
      throw new Error(isErrorResponseData(response.data) ? response.data.message || 'Failed to confirm booking.' : 'Failed to confirm booking.');
    }
  } catch (error: any) {
    console.error('approveBooking error:', error.response?.data || error);
    let errorMessageText = error.response?.data?.message || 'Failed to confirm booking.';

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
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('jwt');
          localStorage.removeItem('userProfile');
          import('vue-router').then(({ useRouter }) => {
            const router = useRouter();
            router.push('/login');
          });
        }
      });
      return;
    } else if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessageText = Object.values(error.response.data.errors).flat().join('; ');
    }

    Swal.fire({
      title: 'Error!',
      text: errorMessageText,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    throw error;
  } finally {
    loadingAction.value = false;
  }
};

// Reject booking
const rejectBooking = async (bookingId: number, comments: string) => {
  loadingAction.value = true;
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${bookingId}/reject`,
      method: 'post',
      requiresAuth: true,
      data: { comments },
    });

    if (response.status === 200) {
      Swal.fire({
        title: 'Canceled!',
        text: 'Booking has been canceled successfully. A cancellation email has been sent to the user.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
      });
      return response;
    } else {
      throw new Error(isErrorResponseData(response.data) ? response.data.message || 'Failed to cancel booking.' : 'Failed to cancel booking.');
    }
  } catch (error: any) {
    console.error('rejectBooking error:', error.response?.data || error);
    let errorMessageText = error.response?.data?.message || 'Failed to cancel booking.';

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
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('jwt');
          localStorage.removeItem('userProfile');
          import('vue-router').then(({ useRouter }) => {
            const router = useRouter();
            router.push('/login');
          });
        }
      });
      return;
    } else if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessageText = Object.values(error.response.data.errors).flat().join('; ');
    }

    Swal.fire({
      title: 'Error!',
      text: errorMessageText,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    throw error;
  } finally {
    loadingAction.value = false;
  }
};

// Confirm approve
const confirmApprove = (booking: Booking | null) => {
  if (!booking) return;
  
  selectedBooking.value = booking;
  const title = booking.booking_property_type_id === 1
    ? booking.properties?.map(p => p.title).join(', ') || 'None'
    : booking.rooms?.map(r => r.room_number).join(', ') || 'None';

  Swal.fire({
    title: 'Confirm Booking?',
    text: `Are you sure you want to confirm the booking for "${title}" on ${formatDate(booking.date, 'd MMMM yyyy')}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, confirm it!',
    position: 'center',
    toast: false,
    showConfirmButton: true,
  }).then((result) => {
    if (result.isConfirmed) {
      handleApprove();
    }
  });
};

// Confirm reject
const confirmReject = (booking: Booking | null) => {
  if (!booking) return;
  
  selectedBooking.value = booking;
  const title = booking.booking_property_type_id === 1
    ? booking.properties?.map(p => p.title).join(', ') || 'None'
    : booking.rooms?.map(r => r.room_number).join(', ') || 'None';

  Swal.fire({
    title: 'Cancel Booking?',
    text: `Please provide a reason for canceling the booking for "${title}" on ${formatDate(booking.date, 'd MMMM yyyy')}.`,
    icon: 'warning',
    input: 'textarea',
    inputPlaceholder: 'Enter cancellation reason...',
    inputAttributes: {
      'aria-label': 'Cancellation reason',
    },
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, cancel it!',
    position: 'center',
    toast: false,
    showConfirmButton: true,
    preConfirm: (comments) => {
      if (!comments) {
        Swal.showValidationMessage('Please provide a reason for cancellation.');
      }
      return comments;
    },
  }).then((result) => {
    if (result.isConfirmed) {
      handleReject(result.value);
    }
  });
};

// Handle approve
const handleApprove = async () => {
  if (!selectedBooking.value?.id) {
    Swal.fire({
      title: 'Error!',
      text: 'No booking ID found.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    return;
  }

  await approveBooking(selectedBooking.value.id);
  closeView();
  componentKey.value += 1;
  await getBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
};

// Handle reject
const handleReject = async (comments: string) => {
  if (!selectedBooking.value?.id) {
    Swal.fire({
      title: 'Error!',
      text: 'No booking ID found.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    return;
  }

  await rejectBooking(selectedBooking.value.id, comments);
  closeView();
  componentKey.value += 1;
  await getBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
};

// Open view
const openView = async (booking: Booking) => {
  selectedBooking.value = booking;
  showView.value = true;
};

// Close view
const closeView = () => {
  selectedBooking.value = null;
  showView.value = false;
};

// Retry logic
const retryFetch = async () => {
  errorMessage.value = null;
  await getBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
};

// Handle page change
const handlePageChange = async (page: number) => {
  if (loadingBookings.value) return;
  if (page < 1 || page > pagination.value.last_page) {
    console.warn(`Invalid page number: ${page}, last_page: ${pagination.value.last_page}`);
    return;
  }
  pagination.value.current_page = page;
  await getBookings({
    page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
  componentKey.value += 1;
};

// Handle per page change
const handlePerPageChange = async (perPage: number) => {
  if (loadingBookings.value) return;
  pagination.value.per_page = perPage || 10;
  pagination.value.current_page = 1;
  await getBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
  componentKey.value += 1;
};

// Clear search
const clearSearch = () => {
  searchQuery.value = '';
  pagination.value.current_page = 1;
  getBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
};

// Debounced search
const debouncedSearch = debounce(() => {
  if (loadingBookings.value) return;
  pagination.value.current_page = 1;
  getBookings({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
}, 300);

// Mount component
onMounted(() => {
  retryFetch();
});
</script>

<style lang="scss" scoped>
.bg-white {
  background-color: #ffffff;
}

.shadow-md {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.rounded-lg {
  border-radius: 0.5rem;
}

.p-4 {
  padding: 0.75rem;
  
  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  
  @media screen and (min-width: 768px) {
    min-height: 400px;
  }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
  
  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }
  
  .retry-button {
    margin-top: 0.5rem;
    color: #2563eb;
    text-decoration: underline;
    font-size: 0.875rem;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    min-height: 40px;
    
    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
  
  .search-input {
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;
    
    @media screen and (min-width: 640px) {
      max-width: 16rem;
    }
    
    @media screen and (min-width: 768px) {
      max-width: 20rem;
    }
  }
  
  .va-button {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}

.per-page-container {
  .per-page-select {
    width: 100%;
    max-width: 8rem;
    font-size: 0.875rem;
    
    @media screen and (min-width: 768px) {
      max-width: 10rem;
      font-size: 1rem;
    }
  }
}

.no-data-message {
  text-align: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  
  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  
  :deep(.va-data-table) {
    min-width: 600px;
  }
  
  :deep(.va-data-table__table) {
    min-width: 100%;
    table-layout: auto;
  }
  
  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.5rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #374151;
    
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.875rem 0.75rem;
    }
  }
  
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.875rem 0.75rem;
    }
  }
  
  :deep(.va-data-table__table-tr:hover) {
    background-color: #f8fafc;
  }
  
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: #fef9c3;
    color: #854d0e;
    
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
  
  .action-buttons {
    display: flex;
    gap: 0.25rem;
    
    @media screen and (min-width: 768px) {
      gap: 0.5rem;
    }
    
    .va-button {
      min-width: 30px;
      padding: 0.25rem;
    }
  }
}

.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  
  .pagination-info {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
    
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
  
  .pagination-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    
    .va-button {
      min-width: 30px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      
      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
      }
    }
  }
}

.modal-container {
  :deep(.va-modal__inner) {
    max-width: 90%;
    
    @media screen and (min-width: 768px) {
      max-width: 600px;
    }
  }
  
  .modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .modal-content {
    padding: 1rem 0;
    font-size: 0.875rem;
    
    p {
      margin-bottom: 0.5rem;
    }
    
    strong {
      font-weight: 600;
    }
    
    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
    
    .va-button {
      min-height: 36px;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}
</style>