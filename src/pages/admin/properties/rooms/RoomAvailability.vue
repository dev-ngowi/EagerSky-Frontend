<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <VaInput
        v-model="searchQuery"
        placeholder="Search by room number or property..."
        class="w-64"
        :disabled="loadingRooms"
        @input="debouncedSearch"
      />
      <VaSelect
        v-model="pagination.per_page"
        :options="perPageOptions"
        label="Items per page"
        value-by="value"
        text-by="text"
        class="w-32"
        @update:modelValue="handlePerPageChange"
      />
    </div>
    <div v-if="!rooms || (rooms.length === 0 && !loadingRooms)" class="text-center py-4">
      No rooms found.
    </div>
    <VaDataTable
      v-else-if="rooms && rooms.length > 0"
      :key="componentKey"
      :items="rooms"
      :columns="columns"
      :loading="loadingRooms"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(is_available)="{ rowData }">
        <VaSelect
          v-model="rowData.is_available"
          :options="availabilityOptions"
          value-by="value"
          text-by="text"
          :disabled="updatingId === rowData.id"
          @update:modelValue="updateAvailability(rowData, $event)"
          class="w-24"
        />
      </template>
      <template #cell(is_booked)="{ rowData }">
        <VaSelect
          v-model="rowData.is_booked"
          :options="bookingOptions"
          value-by="value"
          text-by="text"
          :disabled="updatingId === rowData.id"
          @update:modelValue="updateBookingStatus(rowData, $event)"
          class="w-24"
        />
      </template>
      <template #cell(actions)="{ rowData }">
        <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
      </template>
    </VaDataTable>
    <div v-if="rooms && rooms.length > 0" class="flex justify-between items-center mt-4">
      <div>
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} rooms
      </div>
      <div class="flex space-x-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1"
          @click="handlePagination(pagination.current_page - 1)"
        >
          Previous
        </VaButton>
        <VaButton
          v-for="page in paginationPages"
          :key="page"
          size="small"
          :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
          @click="handlePagination(page)"
        >
          {{ page }}
        </VaButton>
        <VaButton
          size="small"
          :disabled="pagination.current_page === pagination.last_page"
          @click="handlePagination(pagination.current_page + 1)"
        >
          Next
        </VaButton>
      </div>
    </div>
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Room Details</div>
      <div v-if="selectedRoom" class="space-y-2">
        <p><strong>Property ID:</strong> {{ selectedRoom.property_id }}</p>
        <p><strong>Property Title:</strong> {{ selectedRoom.property_title || 'None' }}</p>
        <p><strong>Room Number:</strong> {{ selectedRoom.room_number }}</p>
        <p><strong>Size (sq m):</strong> {{ selectedRoom.size }}</p>
        <p><strong>Rent (TZS):</strong> {{ selectedRoom.rent }}</p>
        <p><strong>Available:</strong> {{ selectedRoom.is_available ? 'Yes' : 'No' }}</p>
        <p><strong>Booked:</strong> {{ selectedRoom.is_booked ? 'Yes' : 'No' }}</p>
        <p><strong>Features:</strong> {{ selectedRoom.features?.length ? selectedRoom.features.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ') : 'None' }}</p>
        <p><strong>Description:</strong> {{ selectedRoom.description || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedRoom.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedRoom.updated_at }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { mapActions, mapState } from 'pinia';
import { useRoomStore } from '../../../../stores/roomStore';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { AxiosResponse } from 'axios';
import makeRequest from '../../../../services/makeRequest';

interface Room {
  id: number;
  property_id: string;
  property_title: string;
  room_number: string;
  size: string;
  rent: string;
  is_available: boolean;
  is_booked: boolean;
  description: string | null;
  features: string[];
  created_at: string;
  updated_at: string;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

interface RoomsResponse {
  data: Room[];
  pagination: Pagination;
}

interface ErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export default defineComponent({
  name: 'RoomAvailability',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'room_number', sortable: true, label: 'Room Number' },
        { key: 'size', sortable: true, label: 'Size (sq m)' },
        { key: 'rent', sortable: true, label: 'Rent (TZS)' },
        { key: 'is_available', sortable: true, label: 'Available' },
        { key: 'is_booked', sortable: true, label: 'Booked' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      showView: false,
      selectedRoom: null as Room | null,
      componentKey: 0,
      updatingId: null as number | null,
      searchQuery: '' as string,
      rooms: [] as Room[],
      loadingRooms: false,
      availabilityOptions: [
        { value: true, text: 'Yes' },
        { value: false, text: 'No' },
      ],
      bookingOptions: [
        { value: true, text: 'Yes' },
        { value: false, text: 'No' },
      ],
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      } as Pagination,
      debouncedSearch: debounce(
        function (this: any) {
          return this.handleSearch();
        },
        500
      ) as () => void,
    };
  },
  computed: {
    paginationPages() {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page;
      const range = 2;
      let start = Math.max(1, current - range);
      let end = Math.min(lastPage, current + range);
      if (end - start < 2 * range) {
        if (start === 1) end = Math.min(lastPage, start + 2 * range);
        else if (end === lastPage) start = Math.max(1, end - 2 * range);
      }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    },
  },
  mounted() {
    this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page });
  },
  methods: {
    // Helper method to convert string/boolean to boolean
    convertToBoolean(value: any): boolean {
      if (typeof value === 'string') {
        return value === '1' || value.toLowerCase() === 'true';
      }
      return !!value;
    },

    async getRooms(params: { page?: number; per_page?: number; search?: string; is_available?: boolean } = {}) {
      this.loadingRooms = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
          search: params.search || this.searchQuery,
        };
        
        // Only add is_available filter if explicitly passed
        if (params.is_available !== undefined) {
          requestParams.is_available = params.is_available;
        }
        
        console.log('Fetching rooms with params:', requestParams);
        const response: AxiosResponse<RoomsResponse | ErrorResponse> = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        console.log('Rooms API response:', response);
        
        if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          // Transform the data to ensure proper boolean conversion
          const transformedData = response.data.data.map((room: any) => ({
            ...room,
            is_available: this.convertToBoolean(room.is_available),
            is_booked: this.convertToBoolean(room.is_booked),
          }));

          // Update component data instead of calling store method
          this.rooms = transformedData;
          
          this.pagination = {
            total: response.data.pagination.total || transformedData.length,
            per_page: response.data.pagination.per_page || params.per_page || 10,
            current_page: response.data.pagination.current_page || params.page || 1,
            last_page: response.data.pagination.last_page || 1,
            from: response.data.pagination.from || (transformedData.length > 0 ? ((response.data.pagination.current_page || 1) - 1) * (response.data.pagination.per_page || 10) + 1 : 0),
            to: response.data.pagination.to || Math.min((response.data.pagination.current_page || 1) * (response.data.pagination.per_page || 10), response.data.pagination.total || 0),
          };
          
          this.searchQuery = params.search || this.searchQuery;
          
          if (transformedData.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No rooms found.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error: any) {
        console.error('getRooms error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch rooms.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingRooms = false;
      }
    },

    async handleSearch() {
      console.log('Searching with query:', this.searchQuery);
      await this.getRooms({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },

    clearSearch() {
      this.searchQuery = '';
      this.getRooms({ page: 1, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },

    async handlePagination(page: number) {
      console.log('Navigating to page:', page);
      this.pagination.current_page = page;
      await this.getRooms({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },

    async handlePerPageChange(perPage: number) {
      console.log('Changing per page to:', perPage);
      this.pagination.per_page = perPage;
      await this.getRooms({ page: 1, per_page: perPage, search: this.searchQuery });
      this.componentKey += 1;
    },

    async updateAvailability(room: Room, isAvailable: boolean) {
      this.updatingId = room.id;
      const originalAvailability = room.is_available;
      room.is_available = !!isAvailable;
      try {
        const payload = { is_available: !!isAvailable };
        console.log('Updating availability for room:', room.id, 'with payload:', payload);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('Update availability response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room availability updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 2000,
          });
          await this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page, search: this.searchQuery });
        } else {
          throw new Error(response.data?.message || 'Failed to update availability');
        }
      } catch (error: any) {
        console.error('Update availability error:', error.response?.data || error.message);
        room.is_available = originalAvailability;
        const errorMessage = error.response?.data?.errors?.is_available?.[0] || error.response?.data?.message || 'Failed to update room availability.';
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
        this.updatingId = null;
        this.componentKey += 1;
      }
    },

    async updateBookingStatus(room: Room, isBooked: boolean) {
      this.updatingId = room.id;
      const originalBookingStatus = room.is_booked;
      room.is_booked = !!isBooked;
      try {
        const payload = { is_booked: !!isBooked };
        console.log('Updating booking status for room:', room.id, 'with payload:', payload);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('Update booking status response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room booking status updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 2000,
          });
          await this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page, search: this.searchQuery });
        } else {
          throw new Error(response.data?.message || 'Failed to update booking status');
        }
      } catch (error: any) {
        console.error('Update booking status error:', error.response?.data || error.message);
        room.is_booked = originalBookingStatus;
        const errorMessage = error.response?.data?.errors?.is_booked?.[0] || error.response?.data?.message || 'Failed to update room booking status.';
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
        this.updatingId = null;
        this.componentKey += 1;
      }
    },

    async openView(room: Room) {
      try {
        console.log('Fetching room details for ID:', room.id);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('Room details response:', response);
        if (response.status === 200) {
          this.selectedRoom = {
            ...response.data.data,
            is_available: this.convertToBoolean(response.data.data.is_available),
            is_booked: this.convertToBoolean(response.data.data.is_booked),
          };
          this.showView = true;
        } else {
          throw new Error('Failed to fetch room details');
        }
      } catch (error) {
        console.error('Error fetching room details:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to load room details.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    closeView() {
      this.selectedRoom = null;
      this.showView = false;
    },
  },
});
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
.w-24 {
  width: 6rem;
}
.w-32 {
  width: 8rem;
}
.w-64 {
  width: 16rem;
}
.va-data-table__table-td,
.va-data-table__table-th {
  padding: 0.75rem 1rem !important;
}
.va-data-table__table-tr {
  border-bottom: 1px solid #e5e7eb;
}
.va-data-table__table {
  border-collapse: separate;
  border-spacing: 0;
}
</style>