<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, room, or client name"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
      <div class="flex space-x-2">
        <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          @click="openForm(null, 'add')"
        >
          Add Booking
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="bookings"
        striped
        :columns="columns"
        :loading="loadingBookings"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        :total-pages="pagination.last_page"
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
          <span :class="{
            'px-2 py-1 rounded text-sm font-medium': true,
            'bg-yellow-100 text-yellow-800': rowData.status === 'pending',
            'bg-green-100 text-green-800': rowData.status === 'confirmed',
            'bg-red-100 text-red-800': rowData.status === 'cancelled'
          }">
            {{ rowData.status }}
          </span>
        </template>
        <template #cell(actions)="{ rowData }">
          <div class="flex space-x-2">
            <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
            <VaButton
              size="small"
              color="warning"
              icon="edit"
              @click="openForm(rowData, 'edit')"
            />
            <VaButton size="small" color="danger" icon="delete" @click="confirmDelete(rowData)" />
          </div>
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} bookings
        </div>
        <div class="flex space-x-2">
          <VaButton
            size="small"
            :disabled="pagination.current_page <= 1"
            @click="handlePageChange(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page >= pagination.last_page"
            @click="handlePageChange(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <BookingForm v-if="formMode === 'add'" @close="closeForm" @submit="handleAddSubmit" />
      <BookingEdit v-if="formMode === 'edit' && selectedBooking" :booking="selectedBooking" @close="closeForm" @submit="handleEditSubmit" />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Booking Details') }}</div>
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
        <p><strong>Date:</strong> {{ formatDate(new Date(selectedBooking.date), 'd MMMM yyyy') || 'None' }}</p>
        <p>
          <strong>Duration:</strong> 
          {{ selectedBooking.duration || 'None' }} minutes
        </p>
        <p><strong>Time Slot:</strong> {{ selectedBooking.time_slot || 'None' }}</p>
        <p><strong>Recurrence:</strong> {{ selectedBooking.recurrence || 'None' }}</p>
        <p><strong>Status:</strong> {{ selectedBooking.status || 'None' }}</p>
        <p><strong>Notes:</strong> {{ selectedBooking.notes || 'None' }}</p>
        <p><strong>Created At:</strong> {{ formatDate(selectedBooking.created_at, 'd MMMM yyyy HH:mm') || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ formatDate(selectedBooking.updated_at, 'd MMMM yyyy HH:mm') || 'None' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BookingForm from './BookingForm.vue';
import BookingEdit from './BookingEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

import type { 
  Booking, 
  FormData, 
  Pagination, 
  GetBookingsParams, 
  ErrorResponseData 
} from '../../../../types/booking';

export default defineComponent({
  name: 'BookingList',
  components: {
    BookingForm,
    BookingEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'properties_rooms', sortable: false, label: 'Properties/Rooms' },
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
      addEditForm: false,
      showView: false,
      selectedBooking: null as Booking | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedSearch: Function as () => void,
    };
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.getBookings({ page: 1, per_page: 10 });
  },
  methods: {
    formatDate(date: Date | string, formatString: string) {
      return format(new Date(date), formatString);
    },
    async getBookings(params: GetBookingsParams = {}) {
      this.loadingBookings = true;
      try {
        console.log('Fetching bookings with params:', params);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
          method: 'get',
          requiresAuth: true,
          params: {
            page: params.page || 1,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || '',
          },
        });
        console.log('API response:', response.data);
        if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          this.bookings = response.data.data
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
          this.pagination = {
            total: response.data.pagination?.total_items ?? 0,
            per_page: Number(response.data.pagination?.items_per_page) || params.per_page || 10,
            current_page: Number(response.data.pagination?.current_page) || params.page || 1,
            last_page: Number(response.data.pagination?.total_pages) || 1,
          };
          console.log('Transformed bookings:', this.bookings);
          console.log('Updated pagination:', this.pagination);
          if (this.bookings.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No bookings found. Add some bookings to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          const errorMessage = response.data?.message || 'Failed to fetch bookings.';
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
        const errorMessage = error.response?.data?.message || 'Failed to fetch bookings.';
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
        this.componentKey += 1;
      }
    },

    async addBooking(payload: FormData) {
      if (!payload || typeof payload !== 'object') {
        console.error('addBooking error: Payload is undefined or invalid', payload);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid booking data provided.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw new Error('Payload is undefined or invalid');
      }
      this.submitting = true;
      try {
        console.log('Sending booking payload:', payload);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
          method: 'post',
          requiresAuth: true,
          data: {
            ...payload,
            room_ids: payload.booking_property_type_id === 2 ? payload.room_ids || [] : [],
            property_ids: payload.booking_property_type_id === 1 ? payload.property_ids || [] : [],
          },
        });
        console.log('addBooking response:', response.data);
        if (response.status === 201) {
          await this.getBookings({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Created!',
            text: 'Booking has been created successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to add booking');
        }
      } catch (error: any) {
        console.error('addBooking error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to add booking.';
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
      } finally {
        this.submitting = false;
      }
    },

    async updateBooking(payload: FormData & { id: number }) {
      if (!payload || typeof payload !== 'object' || !payload.id) {
        console.error('updateBooking error: Payload is undefined or invalid', payload);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid booking data provided for update.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw new Error('Payload is undefined or invalid');
      }
      this.submitting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${payload.id}`,
          method: 'put',
          requiresAuth: true,
          data: {
            ...payload,
            room_ids: payload.booking_property_type_id === 2 ? payload.room_ids || [] : [],
            property_ids: payload.booking_property_type_id === 1 ? payload.property_ids || [] : [],
          },
        });
        if (response.status === 200) {
          await this.getBookings({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Updated!',
            text: 'Booking has been updated successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to update booking');
        }
      } catch (error: any) {
        console.error('updateBooking error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to update booking.';
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
      } finally {
        this.submitting = false;
      }
    },

    async deleteBooking(id: number) {
      this.deleting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${id}`,
          method: 'delete',
          requiresAuth: true,
        });
        if (response.status === 200) {
          await this.getBookings({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Deleted!',
            text: 'Booking has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to delete booking');
        }
      } catch (error: any) {
        console.error('deleteBooking error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to delete booking.';
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
      } finally {
        this.deleting = false;
      }
    },

    openForm(booking: Booking | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !booking) {
        console.error('Cannot open edit form without a valid booking');
        Swal.fire({
          title: 'Error!',
          text: 'No booking selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      this.selectedBooking = booking;
      this.formMode = mode;
      this.addEditForm = true;
      if (mode === 'edit' && booking) {
        console.log('Booking data to be edited:', JSON.stringify(booking, null, 2));
      }
    },

    closeForm() {
      this.selectedBooking = null;
      this.addEditForm = false;
      this.formMode = 'add';
    },

    openView(booking: Booking) {
      this.selectedBooking = booking;
      this.showView = true;
    },

    closeView() {
      this.selectedBooking = null;
      this.showView = false;
    },

    confirmDelete(booking: Booking) {
      this.selectedBooking = booking;
      const title = booking.booking_property_type_id === 1 
        ? booking.properties?.map(p => p.title).join(', ') || 'None'
        : booking.rooms?.map(r => r.room_number).join(', ') || 'None';
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the booking for "${title}" on ${format(new Date(booking.date), 'd MMMM yyyy')}. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
        timer: undefined,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete();
        }
      });
    },

    cancelAdding() {
      this.closeForm();
      this.getBookings({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },

    async handleDelete() {
      if (!this.selectedBooking?.id) {
        console.error('Cannot delete: selectedBooking is null or invalid');
        return;
      }
      await this.deleteBooking(this.selectedBooking.id);
      this.selectedBooking = null;
      this.componentKey += 1;
    },

    async handleAddSubmit(payload: FormData | undefined) {
      if (this.submitting) return;
      if (!payload || typeof payload !== 'object') {
        console.error('handleAddSubmit error: Payload is undefined or invalid', payload);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid booking data provided.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      try {
        await this.addBooking(payload);
        this.closeForm();
        this.componentKey += 1;
      } catch (error) {
        console.error('handleAddSubmit error:', error);
      }
    },

    async handleEditSubmit(payload: FormData & { id: number }) {
      if (this.submitting) return;
      if (!this.selectedBooking?.id) {
        Swal.fire({
          title: 'Error!',
          text: 'No booking selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      try {
        await this.updateBooking(payload);
        this.componentKey += 1;
        this.closeForm();
      } catch (error) {
        console.error('handleEditSubmit error:', error);
      }
    },

    async handlePageChange(page: number) {
      if (page < 1 || page > this.pagination.last_page) {
        console.warn(`Invalid page number: ${page}, last_page: ${this.pagination.last_page}`);
        return;
      }
      this.pagination.current_page = page;
      await this.getBookings({
        page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    async handleSearch() {
      this.pagination.current_page = 1;
      await this.getBookings({
        page: 1,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
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