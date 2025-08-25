<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search pending bookings by property, room, or client name"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
    </div>
    <div v-if="bookings.length === 0 && !loadingBookings" class="text-center text-gray-500">
      No pending bookings available
    </div>
    <VaDataTable
      :key="componentKey"
      :items="bookings"
      striped
      :columns="columns"
      :loading="loadingBookings"
      :per-page="pagination.per_page"
      :current-page="pagination.current_page"
      @update:currentPage="handlePageChange"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
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
        <span class="px-2 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-800">
          {{ rowData.status }}
        </span>
      </template>
      <template #cell(actions)="{ rowData }">
        <div class="flex space-x-2">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton
            size="small"
            color="success"
            icon="check"
            @click="confirmApprove(rowData)"
            v-if="rowData.status === 'pending'"
          />
          <VaButton
            size="small"
            color="danger"
            icon="close"
            @click="confirmReject(rowData)"
            v-if="rowData.status === 'pending'"
          />
        </div>
      </template>
    </VaDataTable>
    <div class="flex justify-between items-center mt-4">
      <div>
        Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
        {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
        {{ pagination.total }} pending bookings
      </div>
      <div class="flex space-x-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1"
          @click="handlePageChange(pagination.current_page - 1)"
        >
          Previous
        </VaButton>
        <VaButton
          size="small"
          :disabled="pagination.current_page === pagination.last_page"
          @click="handlePageChange(pagination.current_page + 1)"
        >
          Next
        </VaButton>
      </div>
    </div>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Pending Booking Details') }}</div>
      <div v-if="selectedBooking" class="space-y-2">
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
      <div class="flex justify-end mt-4 space-x-2">
        <VaButton
          color="success"
          @click="confirmApprove(selectedBooking)"
          v-if="selectedBooking?.status === 'pending'"
        >
          Approve
        </VaButton>
        <VaButton
          color="danger"
          @click="confirmReject(selectedBooking)"
          v-if="selectedBooking?.status === 'pending'"
        >
          Reject
        </VaButton>
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';
import type { Booking, Pagination, GetBookingsParams } from '../../../../types/booking';

// Type guard for error response
interface ErrorResponseData {
  message?: string;
}

const isErrorResponseData = (data: unknown): data is ErrorResponseData => {
  return typeof data === 'object' && data !== null && 'message' in data;
};

// Reactive state
const columns = ref([
  { key: 'sn', sortable: false, label: 'SN' },
  { key: 'properties_rooms', sortable: false, label: 'Properties/Rooms' },
  { key: 'client_fullname', sortable: true, label: 'Client' },
  { key: 'appointment_type_name', sortable: true, label: 'Appointment Type' },
  { key: 'date', sortable: true, label: 'Date' },
  { key: 'time_slot', sortable: true, label: 'Time Slot' },
  { key: 'status', sortable: true, label: 'Status' },
  { key: 'created_at', sortable: true, label: 'Created At' },
  { key: 'actions', label: 'Actions', sortable: false },
]);

const bookings = ref<Booking[]>([]);
const pagination = ref<Pagination>({
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
});
const loadingBookings = ref(false);
const showView = ref(false);
const selectedBooking = ref<Booking | null>(null);
const componentKey = ref(0);
const searchQuery = ref<string>('');

// Format date function
const formatDate = (date: string | Date, formatString: string): string => {
  try {
    return format(new Date(date), formatString);
  } catch (error) {
    console.error('formatDate error:', error);
    return 'Invalid Date';
  }
};

// Debounced search
const debouncedSearch = debounce(async () => {
  pagination.value.current_page = 1;
  await getBookings({
    page: 1,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
    status: 'pending',
  });
  componentKey.value += 1;
}, 500);

// Fetch bookings
const getBookings = async (params: GetBookingsParams = {}) => {
  loadingBookings.value = true;
  try {
    console.log('Fetching bookings with params:', params);
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
      method: 'get',
      requiresAuth: true,
      params: {
        page: params.page || 1,
        per_page: params.per_page || pagination.value.per_page,
        search: params.search || '',
        status: params.status || 'pending',
      },
    });
    console.log('API response:', response.data);
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
        total: response.data.pagination?.total_items ?? response.data.data.length,
        per_page: Number(response.data.pagination?.items_per_page) || params.per_page || 10,
        current_page: Number(response.data.pagination?.current_page) || params.page || 1,
        last_page: Number(response.data.pagination?.total_pages) || 1,
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
      const errorMessage = isErrorResponseData(response.data) ? response.data.message || 'Failed to fetch pending bookings.' : 'Failed to fetch pending bookings.';
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  } catch (error: any) {
    console.error('getBookings error:', error.message, error.response?.data);
    const errorMessage = error.response?.data?.message || 'Failed to fetch pending bookings.';
    Swal.fire({
      title: 'Error!',
      text: errorMessage,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
  } finally {
    loadingBookings.value = false;
    componentKey.value += 1;
  }
};

// Approve booking
const approveBooking = async (id: number) => {
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${id}/approve`,
      method: 'post',
      requiresAuth: true,
    });
    if (response.status === 200) {
      await getBookings({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
        status: 'pending',
      });
      Swal.fire({
        title: 'Approved!',
        text: 'Booking has been approved successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
      });
    } else {
      throw new Error(isErrorResponseData(response.data) ? response.data.message || 'Failed to approve booking' : 'Failed to approve booking');
    }
  } catch (error: any) {
    console.error('approveBooking error:', error.message, error.response?.data);
    const errorMessage = error.response?.data?.message || 'Failed to approve booking.';
    Swal.fire({
      title: 'Error!',
      text: errorMessage,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    throw error;
  }
};

// Reject booking
const rejectBooking = async (id: number) => {
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${id}/reject`,
      method: 'post',
      requiresAuth: true,
    });
    if (response.status === 200) {
      await getBookings({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
        status: 'pending',
      });
      Swal.fire({
        title: 'Rejected!',
        text: 'Booking has been rejected successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
      });
    } else {
      throw new Error(isErrorResponseData(response.data) ? response.data.message || 'Failed to reject booking' : 'Failed to reject booking');
    }
  } catch (error: any) {
    console.error('rejectBooking error:', error.message, error.response?.data);
    const errorMessage = error.response?.data?.message || 'Failed to reject booking.';
    Swal.fire({
      title: 'Error!',
      text: errorMessage,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    throw error;
  }
};

// Confirm approve
const confirmApprove = (booking: Booking) => {
  selectedBooking.value = booking;
  const title = booking.booking_property_type_id === 1
    ? booking.properties?.map(p => p.title).join(', ') || 'None'
    : booking.rooms?.map(r => r.room_number).join(', ') || 'None';
  Swal.fire({
    title: 'Approve Booking?',
    text: `Are you sure you want to approve the booking for "${title}" on ${formatDate(booking.date, 'd MMMM yyyy')}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, approve it!',
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
const confirmReject = (booking: Booking) => {
  selectedBooking.value = booking;
  const title = booking.booking_property_type_id === 1
    ? booking.properties?.map(p => p.title).join(', ') || 'None'
    : booking.rooms?.map(r => r.room_number).join(', ') || 'None';
  Swal.fire({
    title: 'Reject Booking?',
    text: `Are you sure you want to reject the booking for "${title}" on ${formatDate(booking.date, 'd MMMM yyyy')}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, reject it!',
    position: 'center',
    toast: false,
    showConfirmButton: true,
  }).then((result) => {
    if (result.isConfirmed) {
      handleReject();
    }
  });
};

// Handle approve
const handleApprove = async () => {
  if (!selectedBooking.value?.id) {
    Swal.fire({
      title: 'Error!',
      text: 'No booking selected for approval.',
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
};

// Handle reject
const handleReject = async () => {
  if (!selectedBooking.value?.id) {
    Swal.fire({
      title: 'Error!',
      text: 'No booking selected for rejection.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    return;
  }
  await rejectBooking(selectedBooking.value.id);
  closeView();
  componentKey.value += 1;
};

// Open view
const openView = (booking: Booking) => {
  selectedBooking.value = booking;
  showView.value = true;
};

// Close view
const closeView = () => {
  selectedBooking.value = null;
  showView.value = false;
};

// Handle page change
const handlePageChange = async (page: number) => {
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

// Mount component
onMounted(() => {
  getBookings({ page: 1, per_page: 10, status: 'pending' });
});
</script>

<style scoped>
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
.p-6 {
  padding: 1.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
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
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
.w-64 {
  width: 16rem;
}
.text-gray-500 {
  color: #6b7280;
}
.text-center {
  text-align: center;
}
</style>