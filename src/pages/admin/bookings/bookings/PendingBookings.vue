<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search pending bookings by property or client name"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
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
        <p><strong>Property:</strong> {{ selectedBooking.property_title || 'None' }}</p>
        <p><strong>Client:</strong> {{ selectedBooking.client_fullname || 'None' }}</p>
        <p><strong>Appointment Type:</strong> {{ selectedBooking.appointment_type_name || 'None' }}</p>
        <p><strong>Date:</strong> {{ selectedBooking.date || 'None' }}</p>
        <p><strong>Duration (minutes):</strong> {{ selectedBooking.duration || 'None' }}</p>
        <p><strong>Time Slot:</strong> {{ selectedBooking.time_slot || 'None' }}</p>
        <p><strong>Recurrence:</strong> {{ selectedBooking.recurrence || 'None' }}</p>
        <p><strong>Status:</strong> {{ selectedBooking.status || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedBooking.created_at || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ selectedBooking.updated_at || 'None' }}</p>
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

<script lang="ts">
import { defineComponent } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

interface Booking {
  id: number;
  property_id: number;
  property_title: string;
  client_id: number;
  client_fullname: string | null;
  appointment_type_id: number;
  appointment_type_name: string;
  date: string;
  duration: number;
  time_slot: string;
  recurrence: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

interface GetBookingsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

export default defineComponent({
  name: 'PendingBookingList',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'client_fullname', sortable: true, label: 'Client' },
        { key: 'appointment_type_name', sortable: true, label: 'Appointment Type' },
        { key: 'date', sortable: true, label: 'Date' },
        { key: 'time_slot', sortable: true, label: 'Time Slot' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      bookings: [] as Booking[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as Pagination,
      loadingBookings: false,
      showView: false,
      selectedBooking: null as Booking | null,
      componentKey: 0,
      searchQuery: '' as string,
      debouncedSearch: Function as () => void,
    };
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.getBookings({ page: 1, per_page: 10, status: 'pending' });
  },
  methods: {
    async getBookings(params: GetBookingsParams = {}) {
      this.loadingBookings = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
          method: 'get',
          requiresAuth: true, // Controller requires authentication
          params: {
            page: params.page || 1,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || '',
            status: params.status || 'pending', // Filter for pending bookings
          },
        });
        if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          this.bookings = response.data.data
            .filter((booking: any) => booking && booking.id)
            .map((booking: any) => ({
              id: booking.id,
              property_id: booking.property_id,
              property_title: booking.property_title || 'None',
              client_id: booking.client_id,
              client_fullname: booking.client_fullname || 'None',
              appointment_type_id: booking.appointment_type_id,
              appointment_type_name: booking.appointment_type_name || 'None',
              date: format(new Date(booking.date), 'd MMMM yyyy HH:mm'),
              duration: booking.duration,
              time_slot: booking.time_slot,
              recurrence: booking.recurrence,
              status: booking.status,
              created_at: format(new Date(booking.created_at), 'd MMMM yyyy'),
              updated_at: format(new Date(booking.updated_at), 'd MMMM yyyy'),
            }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          if (response.data.data.length === 0) {
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
          const errorMessage = response.data?.message || 'Failed to fetch pending bookings.';
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
        this.loadingBookings = false;
      }
    },

    async approveBooking(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${id}/approve`,
          method: 'post',
          requiresAuth: true,
        });
        if (response.status === 200) {
          await this.getBookings({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
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
          throw new Error(response.data?.message || 'Failed to approve booking');
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
    },

    async rejectBooking(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${id}/reject`,
          method: 'post',
          requiresAuth: true,
        });
        if (response.status === 200) {
          await this.getBookings({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
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
          throw new Error(response.data?.message || 'Failed to reject booking');
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
    },

    confirmApprove(booking: Booking) {
      this.selectedBooking = booking;
      Swal.fire({
        title: 'Approve Booking?',
        text: `Are you sure you want to approve the booking for "${booking.property_title}" on ${booking.date}?`,
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
          this.handleApprove();
        }
      });
    },

    confirmReject(booking: Booking) {
      this.selectedBooking = booking;
      Swal.fire({
        title: 'Reject Booking?',
        text: `Are you sure you want to reject the booking for "${booking.property_title}" on ${booking.date}?`,
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
          this.handleReject();
        }
      });
    },

    async handleApprove() {
      if (!this.selectedBooking?.id) {
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
      await this.approveBooking(this.selectedBooking.id);
      this.closeView();
      this.componentKey += 1;
    },

    async handleReject() {
      if (!this.selectedBooking?.id) {
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
      await this.rejectBooking(this.selectedBooking.id);
      this.closeView();
      this.componentKey += 1;
    },

    openView(booking: Booking) {
      this.selectedBooking = booking;
      this.showView = true;
    },

    closeView() {
      this.selectedBooking = null;
      this.showView = false;
    },

    async handlePageChange(page: number) {
      await this.getBookings({
        page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: 'pending',
      });
      this.componentKey += 1;
    },

    async handleSearch() {
      await this.getBookings({
        page: 1,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: 'pending',
      });
      this.componentKey += 1;
    },
  },
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
</style>