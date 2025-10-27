<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <!-- Loading/Error States -->
    <template v-if="loadingRooms">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading rooms...'" />
      </div>
    </template>
   
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button class="retry-button" @click="retryFetch" aria-label="Retry loading rooms">
          Retry
        </button>
      </div>
    </template>
   
    <!-- Main Content -->
    <template v-else>
      <!-- Controls Container -->
      <div class="controls-container">
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by room number or property..."
            class="search-input"
            :disabled="loadingRooms"
            @input="debouncedSearch"
            aria-label="Search rooms by room number or property"
          />
          <VaButton
            v-if="searchQuery"
            color="warning"
            size="small"
            @click="clearSearch"
            aria-label="Clear search"
          >
            Clear
          </VaButton>
        </div>
       
        <div class="per-page-container" v-if="rooms && rooms.length > 0">
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
      <!-- No Data Message -->
      <div v-if="!rooms || (rooms.length === 0 && !loadingRooms)" class="no-data-message">
        No rooms found.
      </div>
      <!-- Data Table -->
      <div v-else-if="rooms && rooms.length > 0" class="table-responsive">
        <VaDataTable
          :key="componentKey"
          :items="rooms"
          :columns="columns"
          :loading="loadingRooms"
          striped
          :hoverable="true"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </template>
         
          <template #cell(property_title)="{ rowData }">
            <span class="property-title">{{ rowData.property_title || 'N/A' }}</span>
          </template>
         
          <template #cell(is_available)="{ rowData }">
            <VaSelect
              v-model="rowData.is_available"
              :options="availabilityOptions"
              value-by="value"
              text-by="text"
              :disabled="updatingId === rowData.id || loadingRooms"
              @update:modelValue="updateAvailability(rowData, $event)"
              class="availability-select"
              aria-label="Toggle room availability"
            />
          </template>
         
          <template #cell(is_booked)="{ rowData }">
            <VaSelect
              v-model="rowData.is_booked"
              :options="bookingOptions"
              value-by="value"
              text-by="text"
              :disabled="updatingId === rowData.id || loadingRooms"
              @update:modelValue="updateBookingStatus(rowData, $event)"
              class="booking-select"
              aria-label="Toggle room booking status"
            />
          </template>
         
          <template #cell(actions)="{ rowData }">
            <div class="action-buttons">
              <VaButton
                size="small"
                color="primary"
                icon="visibility"
                @click="openView(rowData)"
                aria-label="View room details"
                :disabled="loadingRooms"
              />
            </div>
          </template>
        </VaDataTable>
      </div>
      <!-- Pagination -->
      <div v-if="rooms && rooms.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} rooms
        </div>
        <div class="pagination-controls">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingRooms"
            @click="handlePagination(pagination.current_page - 1)"
            aria-label="Previous page"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePagination(page)"
            :aria-label="`Go to page ${page}`"
            :disabled="loadingRooms"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingRooms"
            @click="handlePagination(pagination.current_page + 1)"
            aria-label="Next page"
          >
            Next
          </VaButton>
        </div>
      </div>
      <!-- Room Details Modal -->
      <VaModal
        v-model="showView"
        :size="isMobile ? 'full' : 'medium'"
        layout="centered"
        close-button
        hide-default-actions
        class="modal-container"
      >
        <div class="modal-title">Room Details</div>
        <div v-if="selectedRoom" class="modal-content">
          <div class="detail-row">
            <span class="detail-label">Property ID:</span>
            <span class="detail-value">{{ selectedRoom.property_id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Property:</span>
            <span class="detail-value">{{ selectedRoom.property_title || 'None' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Room Number:</span>
            <span class="detail-value">{{ selectedRoom.room_number }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Size:</span>
            <span class="detail-value">{{ selectedRoom.size }} sq m</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Rent:</span>
            <span class="detail-value">{{ selectedRoom.rent }} TZS</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Available:</span>
            <span class="detail-value status-badge" :class="selectedRoom.is_available ? 'status-success' : 'status-danger'">
              {{ selectedRoom.is_available ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Booked:</span>
            <span class="detail-value status-badge" :class="selectedRoom.is_booked ? 'status-success' : 'status-danger'">
              {{ selectedRoom.is_booked ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Features:</span>
            <span class="detail-value">
              {{ selectedRoom.features?.length
                ? selectedRoom.features.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')
                : 'None' }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Description:</span>
            <span class="detail-value">{{ selectedRoom.description || 'None' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created:</span>
            <span class="detail-value">{{ selectedRoom.created_at }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Updated:</span>
            <span class="detail-value">{{ selectedRoom.updated_at }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <VaButton color="secondary" @click="closeView" aria-label="Close modal">
            Close
          </VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted, ref } from 'vue';
import type { DataTableColumnSource } from 'vuestic-ui';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import { AxiosResponse } from 'axios';
import makeRequest from '../../../../services/makeRequest';
import Loader from '../../../../components/Loader.vue'; // Assuming this component exists
// Interfaces
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
 
  setup() {
    // Mobile responsiveness
    const windowWidth = ref(window.innerWidth);
    const onResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener('resize', onResize);
      // Initial load
      getRooms();
    });
    onUnmounted(() => {
      window.removeEventListener('resize', onResize);
    });
    const isMobile = computed(() => windowWidth.value < 768);
    // Reactive data
    const columns = ref<DataTableColumnSource<string>[]>([
      { key: 'sn', sortable: false, label: 'SN', width: '60px' },
      { key: 'property_title', sortable: true, label: 'Property' },
      { key: 'room_number', sortable: true, label: 'Room #' },
      { key: 'size', sortable: true, label: 'Size' },
      { key: 'rent', sortable: true, label: 'Rent' },
      { key: 'is_available', sortable: true, label: 'Available' },
      { key: 'is_booked', sortable: true, label: 'Booked' },
      { key: 'actions', label: 'Actions', sortable: false, width: '80px' },
    ]);
    const rooms = ref<Room[]>([]);
    const loadingRooms = ref(false);
    const errorMessage = ref<string | null>(null);
    const showView = ref(false);
    const selectedRoom = ref<Room | null>(null);
    const componentKey = ref(0);
    const updatingId = ref<number | null>(null);
    const searchQuery = ref('');
   
    const availabilityOptions = ref([
      { value: true, text: 'Yes' },
      { value: false, text: 'No' },
    ]);
    const bookingOptions = ref([
      { value: true, text: 'Yes' },
      { value: false, text: 'No' },
    ]);
    const perPageOptions = ref([
      { value: 10, text: '10' },
      { value: 15, text: '15' },
      { value: 25, text: '25' },
      { value: 50, text: '50' },
    ]);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });
    // Computed pagination pages
    const paginationPages = computed(() => {
      const pages: number[] = [];
      const lastPage = pagination.value.last_page;
      const current = pagination.value.current_page;
      const range = 2;
      let start = Math.max(1, current - range);
      let end = Math.min(lastPage, current + range);
     
      if (end - start < 2 * range) {
        if (start === 1) end = Math.min(lastPage, start + 2 * range);
        else if (end === lastPage) start = Math.max(1, end - 2 * range);
      }
     
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    });
    // Helper method to convert string/boolean to boolean
    const convertToBoolean = (value: any): boolean => {
      if (typeof value === 'string') {
        return value === '1' || value.toLowerCase() === 'true';
      }
      return !!value;
    };
    // Fetch rooms
    const getRooms = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
      loadingRooms.value = true;
      errorMessage.value = null;
     
      try {
        const requestParams: any = {
          page: params.page || pagination.value.current_page,
          per_page: params.per_page || pagination.value.per_page,
          search: params.search || searchQuery.value,
        };
        console.log('Fetching rooms with params:', requestParams);
       
        const response: AxiosResponse<RoomsResponse | ErrorResponse> = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          requiresAuth: true,
          params: requestParams,
        });
        if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          const transformedData = response.data.data.map((room: any) => ({
            ...room,
            is_available: convertToBoolean(room.is_available),
            is_booked: convertToBoolean(room.is_booked),
          }));
          rooms.value = transformedData;
         
          pagination.value = {
            total: response.data.pagination.total || transformedData.length,
            per_page: response.data.pagination.per_page || params.per_page || 10,
            current_page: response.data.pagination.current_page || params.page || 1,
            last_page: response.data.pagination.last_page || 1,
            from: response.data.pagination.from || (transformedData.length > 0 ? ((response.data.pagination.current_page || 1) - 1) * (response.data.pagination.per_page || 10) + 1 : 0),
            to: response.data.pagination.to || Math.min((response.data.pagination.current_page || 1) * (response.data.pagination.per_page || 10), response.data.pagination.total || 0),
          };
          searchQuery.value = params.search || searchQuery.value;
         
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
        const errorMsg = error.response?.data?.message || 'Failed to fetch rooms.';
        errorMessage.value = errorMsg;
       
        Swal.fire({
          title: 'Error!',
          text: errorMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingRooms.value = false;
      }
    };
    // Search handling
    const debouncedSearch = debounce(() => {
      getRooms({ page: 1, per_page: pagination.value.per_page, search: searchQuery.value });
      componentKey.value += 1;
    }, 500);
    const clearSearch = () => {
      searchQuery.value = '';
      getRooms({ page: 1, per_page: pagination.value.per_page });
      componentKey.value += 1;
    };
    const retryFetch = () => {
      errorMessage.value = null;
      getRooms();
    };
    // Pagination
    const handlePagination = async (page: number) => {
      if (loadingRooms.value) return;
      pagination.value.current_page = page;
      await getRooms({ page, per_page: pagination.value.per_page, search: searchQuery.value });
      componentKey.value += 1;
    };
    const handlePerPageChange = async (perPage: number) => {
      if (loadingRooms.value) return;
      pagination.value.per_page = perPage;
      pagination.value.current_page = 1;
      await getRooms({ page: 1, per_page: perPage, search: searchQuery.value });
      componentKey.value += 1;
    };
    // Update methods
    const updateAvailability = async (room: Room, isAvailable: boolean) => {
      updatingId.value = room.id;
      const originalAvailability = room.is_available;
      room.is_available = !!isAvailable;
      try {
        const payload = { is_available: !!isAvailable };
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'put',
          requiresAuth: true,
          data: payload,
        });
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
          await getRooms({ page: pagination.value.current_page, per_page: pagination.value.per_page, search: searchQuery.value });
        } else {
          throw new Error(response.data?.message || 'Failed to update availability');
        }
      } catch (error: any) {
        room.is_available = originalAvailability;
        const errorMessage = error.response?.data?.errors?.is_available?.[0] ||
                           error.response?.data?.message ||
                           'Failed to update room availability.';
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
        updatingId.value = null;
        componentKey.value += 1;
      }
    };
    const updateBookingStatus = async (room: Room, isBooked: boolean) => {
      updatingId.value = room.id;
      const originalBookingStatus = room.is_booked;
      room.is_booked = !!isBooked;
      try {
        const payload = { is_booked: !!isBooked };
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'put',
          requiresAuth: true,
          data: payload,
        });
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
          await getRooms({ page: pagination.value.current_page, per_page: pagination.value.per_page, search: searchQuery.value });
        } else {
          throw new Error(response.data?.message || 'Failed to update booking status');
        }
      } catch (error: any) {
        room.is_booked = originalBookingStatus;
        const errorMessage = error.response?.data?.errors?.is_booked?.[0] ||
                           error.response?.data?.message ||
                           'Failed to update room booking status.';
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
        updatingId.value = null;
        componentKey.value += 1;
      }
    };
    // Modal methods
    const openView = async (room: Room) => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          selectedRoom.value = {
            ...response.data.data,
            is_available: convertToBoolean(response.data.data.is_available),
            is_booked: convertToBoolean(response.data.data.is_booked),
          };
          showView.value = true;
        } else {
          throw new Error('Failed to fetch room details');
        }
      } catch (error) {
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
    };
    const closeView = () => {
      selectedRoom.value = null;
      showView.value = false;
    };
    return {
      // Reactive refs
      columns,
      rooms,
      loadingRooms,
      errorMessage,
      showView,
      selectedRoom,
      componentKey,
      updatingId,
      searchQuery,
      availabilityOptions,
      bookingOptions,
      perPageOptions,
      pagination,
     
      // Computed
      paginationPages,
      isMobile,
     
      // Methods
      convertToBoolean,
      getRooms,
      debouncedSearch,
      clearSearch,
      retryFetch,
      handlePagination,
      handlePerPageChange,
      updateAvailability,
      updateBookingStatus,
      openView,
      closeView,
    };
  },
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
  padding: 0.75rem;
  @media screen and (min-width: 768px) {
    padding: 1.5rem;
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
  gap: 0.5rem;
  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }
  .retry-button {
    color: #2563eb;
    text-decoration: underline;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    min-height: 40px;
    font-size: 0.875rem;
    cursor: pointer;
    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
}
.controls-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
}
.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
  }
  .search-input {
    width: 100%;
    @media screen and (min-width: 640px) {
      max-width: 20rem;
    }
  }
  .va-button {
    min-height: 40px;
    flex-shrink: 0;
  }
}
.per-page-container {
  .per-page-select {
    width: 100%;
    max-width: 8rem;
  }
}
.no-data-message {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 4rem 2rem;
  }
}
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  :deep(.va-data-table) {
    min-width: 700px;
  }
  :deep(.va-data-table__table) {
    table-layout: auto;
  }
  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.5rem 0.25rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #374151;
    &[data-key="sn"] {
      width: 60px;
      min-width: 60px;
    }
    &[data-key="property_title"] {
      min-width: 120px;
    }
    &[data-key="room_number"] {
      min-width: 80px;
    }
    &[data-key="size"],
    &[data-key="rent"] {
      min-width: 80px;
    }
    &[data-key="is_available"],
    &[data-key="is_booked"] {
      min-width: 90px;
    }
    &[data-key="actions"] {
      width: 80px;
      min-width: 80px;
    }
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
    vertical-align: middle;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }
  :deep(.va-data-table__table-tr:hover) {
    background-color: #f8fafc;
  }
  .property-title {
    font-weight: 500;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .availability-select,
  .booking-select {
    width: 70px !important;
    min-width: 70px !important;
    @media screen and (min-width: 768px) {
      width: 80px !important;
      min-width: 80px !important;
    }
    :deep(.va-select__content) {
      min-width: 70px !important;
    }
  }
  .action-buttons {
    display: flex;
    gap: 0.25rem;
    justify-content: center;
    .va-button {
      min-height: 36px;
      padding: 0.25rem;
    }
  }
}
.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
.pagination-info {
  font-size: 0.75rem;
  color: #6b7280;
  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}
.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
  @media screen and (min-width: 768px) {
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .va-button {
    min-height: 40px;
    font-size: 0.75rem;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
}
.modal-container {
  .modal-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 1rem;
    text-align: center;
    @media screen and (min-width: 768px) {
      font-size: 1.25rem;
      text-align: left;
    }
  }
  .modal-content {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
    @media screen and (min-width: 768px) {
      max-height: 70vh;
      padding-right: 1rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
      &:last-child {
        border-bottom: none;
      }
      @media screen and (min-width: 768px) {
        justify-content: flex-start;
        gap: 1rem;
      }
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
      min-width: 80px;
      flex-shrink: 0;
      @media screen and (min-width: 768px) {
        min-width: 100px;
      }
    }
    .detail-value {
      flex: 1;
      color: #4b5563;
      text-align: right;
      @media screen and (min-width: 768px) {
        text-align: left;
      }
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      &.status-success {
        background-color: #dcfce7;
        color: #166534;
      }
      &.status-danger {
        background-color: #fee2e2;
        color: #dc2626;
      }
      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.375rem 0.75rem;
      }
    }
  }
  .modal-footer {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    @media screen and (min-width: 768px) {
      justify-content: flex-end;
    }
    .va-button {
      min-height: 44px;
      width: 100%;
      max-width: 120px;
      @media screen and (min-width: 768px) {
        width: auto;
      }
    }
  }
}
// Mobile-specific adjustments
@media (max-width: 640px) {
  .p-4 {
    padding: 0.5rem;
  }
  .controls-container {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .search-container {
    .search-input {
      font-size: 0.75rem;
    }
    .va-button {
      font-size: 0.75rem;
      padding: 0.5rem;
    }
  }
  .table-responsive {
    :deep(.va-data-table) {
      min-width: 500px;
    }
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.25rem 0.125rem;
    }
    .property-title {
      max-width: 100px;
    }
    .availability-select,
    .booking-select {
      width: 60px !important;
      min-width: 60px !important;
      :deep(.va-select__content) {
        min-width: 60px !important;
        font-size: 0.625rem;
      }
    }
    .action-buttons .va-button {
      min-height: 32px;
      padding: 0.125rem;
    }
  }
  .pagination-container {
    gap: 0.5rem;
    padding-top: 0.75rem;
    .pagination-info {
      font-size: 0.625rem;
      text-align: center;
    }
    .pagination-controls {
      .va-button {
        font-size: 0.625rem;
        min-height: 36px;
        padding: 0.25rem 0.5rem;
      }
    }
  }
  .modal-container {
    .modal-title {
      font-size: 1rem;
    }
    .modal-content {
      max-height: 50vh;
      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        padding: 0.5rem 0;
        .detail-label {
          min-width: auto;
          font-size: 0.75rem;
        }
        .detail-value {
          text-align: left;
          font-size: 0.75rem;
        }
      }
      .status-badge {
        font-size: 0.625rem;
        padding: 0.2rem 0.4rem;
      }
    }
    .modal-footer {
      .va-button {
        min-height: 40px;
      }
    }
  }
}
@media (max-width: 480px) {
  .table-responsive {
    :deep(.va-data-table) {
      min-width: 400px;
    }
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.2rem 0.1rem;
    }
    .property-title {
      max-width: 80px;
      font-size: 0.625rem;
    }
    .availability-select,
    .booking-select {
      width: 50px !important;
      min-width: 50px !important;
      :deep(.va-select__content) {
        min-width: 50px !important;
        font-size: 0.5rem;
      }
    }
  }
  .pagination-controls .va-button {
    font-size: 0.5rem;
    min-height: 32px;
    padding: 0.2rem 0.4rem;
  }
  .modal-container {
    .modal-content {
      max-height: 40vh;
      .detail-row {
        padding: 0.375rem 0;
        gap: 0.125rem;
        .detail-label,
        .detail-value {
          font-size: 0.625rem;
        }
      }
      .status-badge {
        font-size: 0.5rem;
        padding: 0.15rem 0.3rem;
      }
    }
  }
}
</style>