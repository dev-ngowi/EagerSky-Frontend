<template>
  <div class="bg-white shadow-md rounded-lg p-2 sm:p-4">
    <!-- Loading State -->
    <template v-if="loadingBookings">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading bookings...'" />
      </div>
    </template>

    <!-- Error State -->
    <template v-else-if="errorMessage">
      <div class="text-center py-4 text-red-600 space-y-2">
        <p class="text-sm sm:text-base">{{ errorMessage }}</p>
        <button 
          class="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          @click="retryFetch"
        >
          <i class="va-icon mr-1">refresh</i>
          Retry
        </button>
      </div>
    </template>

    <!-- Main Content -->
    <template v-else>
      <!-- Header: Search & Controls -->
      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
        <!-- Search Section -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by property, room, or client name"
            class="w-full sm:w-64"
            :disabled="loadingBookings"
            @input="debouncedSearch"
          />
          <VaButton 
            v-if="searchQuery" 
            color="warning" 
            size="small" 
            class="w-full sm:w-auto justify-center"
            @click="clearSearch"
          >
            Clear
          </VaButton>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-full sm:w-32"
            @update:modelValue="handlePerPageChange"
          />
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
            @click="openForm(null, 'add')"
          >
            Add Booking
          </VaButton>
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
            @click="cancelAdding"
          >
            Done Adding
          </VaButton>
        </div>
      </div>

      <!-- Data Table (Always Visible) -->
      <div class="relative">
        <!-- Overlay when form is open -->
        <div 
          v-if="addEditForm" 
          class="fixed inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center p-4"
          @click="cancelAdding"
        >
          <!-- Form Overlay - Click outside to close -->
          <div 
            class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
            @click.stop
          >
            <!-- Close button in form overlay -->
            <div class="sticky top-0 z-20 bg-white border-b px-4 py-3 rounded-t-lg flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ formMode === 'add' ? 'Add New Booking' : 'Edit Booking' }}
              </h2>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                @click="cancelAdding"
                aria-label="Close form"
              >
                <i class="va-icon text-xl">close</i>
              </button>
            </div>

            <!-- Form Content -->
            <div class="p-6">
              <BookingForm 
                v-if="formMode === 'add'" 
                @close="closeForm" 
                @submit="debouncedHandleAddSubmit" 
              />
              <BookingEdit
                v-if="formMode === 'edit' && selectedBooking"
                :booking="selectedBooking"
                @close="closeForm"
                @submit="debouncedHandleEditSubmit"
              />
            </div>
          </div>
        </div>

        <!-- Table Content with reduced opacity when form is open -->
        <div :class="[
          'transition-opacity duration-300',
          addEditForm ? 'opacity-30 pointer-events-none' : 'opacity-100'
        ]">
          <!-- Empty State -->
          <div
            v-if="!bookings || (bookings.length === 0 && !loadingBookings)"
            class="text-center py-8 sm:py-12"
          >
            <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="va-icon text-3xl sm:text-4xl text-gray-400">calendar</i>
            </div>
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p v-if="searchQuery" class="text-sm text-gray-500 mb-4">
              Try adjusting your search terms
            </p>
            <p v-else class="text-sm text-gray-500 mb-6">
              Get started by adding your first booking
            </p>
            <VaButton
              v-if="!searchQuery && !addEditForm"
              color="#00A3E0"
              @click="openForm(null, 'add')"
            >
              <i class="va-icon mr-2">add</i>
              Add First Booking
            </VaButton>
          </div>

          <!-- Data Table -->
          <div v-else-if="bookings && bookings.length > 0" class="overflow-hidden">
            <div class="overflow-x-auto border rounded-lg">
              <VaDataTable
                :key="componentKey"
                :items="bookings"
                striped
                :columns="responsiveColumns"
                :loading="loadingBookings"
                :hoverable="!addEditForm"
                class="min-w-full"
              >
                <!-- Serial Number -->
                <template #cell(sn)="{ rowIndex }">
                  <div class="text-center sm:text-left px-2 py-1">
                    {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
                  </div>
                </template>

                <!-- Properties/Rooms -->
                <template #cell(properties_rooms)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[120px] sm:max-w-none">
                    <span 
                      v-if="rowData.booking_property_type_id === 1" 
                      class="font-medium block sm:inline"
                      :title="rowData.properties?.map(p => p.title).join(', ') || 'None'"
                    >
                      {{ rowData.properties?.map(p => p.title).join(', ') || 'None' }}
                    </span>
                    <span 
                      v-else-if="rowData.booking_property_type_id === 2"
                      class="font-medium block sm:inline"
                      :title="rowData.rooms?.map(r => r.room_number).join(', ') || 'None'"
                    >
                      {{ rowData.rooms?.map(r => r.room_number).join(', ') || 'None' }}
                    </span>
                    <span v-else class="text-gray-500 block sm:inline">None</span>
                  </div>
                </template>

                <!-- Client -->
                <template #cell(client_fullname)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[100px] sm:max-w-none" :title="rowData.client_fullname">
                    <span class="font-medium">{{ rowData.client_fullname || 'Unknown Client' }}</span>
                  </div>
                </template>

                <!-- Appointment Type -->
                <template #cell(appointment_type_name)="{ rowData }">
                  <div class="px-2 py-1 truncate" :title="rowData.appointment_type_name">
                    {{ rowData.appointment_type_name || 'Unknown' }}
                  </div>
                </template>

                <!-- Date -->
                <template #cell(date)="{ rowData }">
                  <div class="text-center sm:text-left px-2 py-1">
                    <div class="font-medium">{{ formatDate(rowData.date, 'MMM d') }}</div>
                    <div class="text-xs text-gray-500 sm:hidden">{{ formatDate(rowData.date, 'yyyy') }}</div>
                  </div>
                </template>

                <!-- Time Slot -->
                <template #cell(time_slot)="{ rowData }">
                  <div class="px-2 py-1 truncate" :title="rowData.time_slot">
                    {{ rowData.time_slot || 'N/A' }}
                  </div>
                </template>

                <!-- Status -->
                <template #cell(status)="{ rowData }">
                  <div class="px-2 py-1">
                    <span 
                      :class="{
                        'px-2 py-1 rounded-full text-xs font-medium inline-block min-w-[70px] text-center': true,
                        'bg-yellow-100 text-yellow-800': rowData.status === 'pending',
                        'bg-green-100 text-green-800': rowData.status === 'confirmed',
                        'bg-red-100 text-red-800': rowData.status === 'cancelled'
                      }"
                    >
                      {{ rowData.status }}
                    </span>
                  </div>
                </template>

                <!-- Created At (Hidden on mobile) -->
                <template #cell(created_at)="{ rowData }">
                  <div class="hidden sm:table-cell px-2 py-1">
                    <div class="text-sm">{{ formatDate(rowData.created_at, 'MMM d') }}</div>
                    <div class="text-xs text-gray-500">{{ formatDate(rowData.created_at, 'HH:mm') }}</div>
                  </div>
                </template>

                <!-- Actions -->
                <template #cell(actions)="{ rowData }">
                  <div class="px-1 py-1 flex justify-center sm:justify-start space-x-1 sm:space-x-2">
                    <VaButton 
                      size="small" 
                      color="primary" 
                      icon="visibility" 
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm"
                      @click="openView(rowData)" 
                    />
                    <VaButton
                      size="small"
                      color="warning"
                      icon="edit"
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm"
                      @click="openForm(rowData, 'edit')"
                    />
                    <VaButton 
                      size="small" 
                      color="danger" 
                      icon="delete" 
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm"
                      @click="confirmDelete(rowData)" 
                    />
                  </div>
                </template>
              </VaDataTable>
            </div>

            <!-- Pagination -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-4">
              <!-- Results Info -->
              <div class="text-sm text-gray-700 text-center sm:text-left">
                Showing <span class="font-medium">{{ pagination.from }}</span> to 
                <span class="font-medium">{{ pagination.to }}</span> of 
                <span class="font-medium">{{ pagination.total }}</span> bookings
              </div>
              
              <!-- Pagination Controls -->
              <div class="flex flex-wrap justify-center sm:justify-end items-center gap-1 sm:gap-2">
                <VaButton
                  size="small"
                  :disabled="pagination.current_page === 1 || loadingBookings || addEditForm"
                  class="px-3 py-1.5 min-w-[72px] h-9"
                  :color="pagination.current_page === 1 || addEditForm ? 'gray' : 'default'"
                  @click="handlePageChange(pagination.current_page - 1)"
                >
                  <i class="va-icon mr-1">chevron_left</i>
                  Previous
                </VaButton>
                
                <template v-if="paginationPages.length > 0">
                  <VaButton
                    v-for="page in paginationPages"
                    :key="page"
                    size="small"
                    :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
                    :disabled="addEditForm"
                    class="px-2.5 py-1.5 min-w-[36px] h-9 text-sm"
                    @click="handlePageChange(page)"
                  >
                    {{ page }}
                  </VaButton>
                </template>
                
                <VaButton
                  size="small"
                  :disabled="pagination.current_page === pagination.last_page || loadingBookings || addEditForm"
                  class="px-3 py-1.5 min-w-[72px] h-9"
                  :color="pagination.current_page === pagination.last_page || addEditForm ? 'gray' : 'default'"
                  @click="handlePageChange(pagination.current_page + 1)"
                >
                  Next
                  <i class="va-icon ml-1">chevron_right</i>
                </VaButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- View Modal (Independent of forms) -->
      <VaModal 
        v-model="showView" 
        size="medium"
        layout="centered" 
        close-button 
        hide-default-actions
        class="p-2 sm:p-4"
      >
        <div class="text-base sm:text-lg font-bold mb-4 text-gray-900">
          <i class="va-icon mr-2">visibility</i>
          Booking Details
        </div>
        
        <div v-if="selectedBooking" class="space-y-3 text-sm">
          <!-- Header Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <span class="font-medium text-gray-700">Type:</span>
              <span class="ml-2 font-semibold">
                {{ selectedBooking.booking_property_type_name || (selectedBooking.booking_property_type_id === 1 ? 'Property' : 'Room') }}
              </span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Status:</span>
              <span class="ml-2 px-2 py-1 rounded-full text-xs font-medium" 
                    :class="{
                      'bg-yellow-100 text-yellow-800': selectedBooking.status === 'pending',
                      'bg-green-100 text-green-800': selectedBooking.status === 'confirmed',
                      'bg-red-100 text-red-800': selectedBooking.status === 'cancelled'
                    }">
                {{ selectedBooking.status }}
              </span>
            </div>
          </div>

          <!-- Properties/Rooms -->
          <div v-if="selectedBooking.booking_property_type_id === 1" class="space-y-1">
            <label class="font-medium text-gray-700 block">Properties</label>
            <div class="text-sm bg-blue-50 p-2 rounded">
              {{ selectedBooking.properties?.map(p => p.title).join(', ') || 'None' }}
            </div>
          </div>
          <div v-else-if="selectedBooking.booking_property_type_id === 2" class="space-y-1">
            <label class="font-medium text-gray-700 block">Rooms</label>
            <div class="text-sm bg-blue-50 p-2 rounded">
              {{ selectedBooking.rooms?.map(r => r.room_number).join(', ') || 'None' }}
            </div>
          </div>

          <!-- Main Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div>
                <label class="font-medium text-gray-700 block mb-1">Client</label>
                <div class="text-sm font-medium bg-gray-50 p-2 rounded">
                  {{ selectedBooking.client_fullname || 'None' }}
                </div>
              </div>
              <div>
                <label class="font-medium text-gray-700 block mb-1">Date</label>
                <div class="text-sm bg-gray-50 p-2 rounded">
                  {{ formatDate(selectedBooking.date, 'EEEE, d MMMM yyyy') || 'None' }}
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <div>
                <label class="font-medium text-gray-700 block mb-1">Appointment Type</label>
                <div class="text-sm bg-gray-50 p-2 rounded">
                  {{ selectedBooking.appointment_type_name || 'None' }}
                </div>
              </div>
              <div>
                <label class="font-medium text-gray-700 block mb-1">Time Slot</label>
                <div class="text-sm bg-gray-50 p-2 rounded">
                  {{ selectedBooking.time_slot || 'None' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label class="font-medium text-gray-700 block mb-1">Duration</label>
              <div class="text-sm bg-green-50 p-2 rounded">
                {{ selectedBooking.duration || 'None' }} minutes
              </div>
            </div>
            <div>
              <label class="font-medium text-gray-700 block mb-1">Recurrence</label>
              <div class="text-sm bg-gray-50 p-2 rounded">
                {{ selectedBooking.recurrence || 'None' }}
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="selectedBooking.notes" class="pt-4 border-t">
            <label class="font-medium text-gray-700 block mb-2">Notes</label>
            <div class="text-sm bg-indigo-50 p-3 rounded-lg whitespace-pre-wrap">
              {{ selectedBooking.notes }}
            </div>
          </div>

          <!-- Timestamps -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t text-xs text-gray-500">
            <div>
              <label class="font-medium block mb-1">Created</label>
              <div>{{ formatDate(selectedBooking.created_at, 'd MMM yyyy HH:mm') || 'None' }}</div>
            </div>
            <div>
              <label class="font-medium block mb-1">Updated</label>
              <div>{{ formatDate(selectedBooking.updated_at, 'd MMM yyyy HH:mm') || 'None' }}</div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <template #footer>
          <div class="flex justify-end pt-4">
            <VaButton color="secondary" @click="closeView" class="px-6">
              Close
            </VaButton>
          </div>
        </template>
      </VaModal>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import BookingForm from './BookingForm.vue';
import BookingEdit from './BookingEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format, parseISO, isValid } from 'date-fns';

// Fixed: Define Pagination interface with from and to properties
interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

interface Room {
  id: number; // Fixed: Added id property to match BookingEdit expectations
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

interface FormData {
  booking_property_type_id: number;
  property_ids?: number[];
  room_ids?: number[];
  client_id: number;
  appointment_type_id: number;
  date: string;
  duration: number;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
}

interface GetBookingsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export default defineComponent({
  name: 'BookingList',
  components: {
    BookingForm,
    BookingEdit,
    Loader,
  },
  setup() {
    const bookings = ref<Booking[]>([]);
    const loadingBookings = ref<boolean>(false);
    const errorMessage = ref<string | null>(null);
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const selectedBooking = ref<Booking | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const componentKey = ref<number>(0);
    const deleting = ref<boolean>(false);
    const submitting = ref<boolean>(false);
    const searchQuery = ref<string>('');
    
    // Fixed: Added from and to properties
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });

    // Fixed: Changed width to string type (not object) and align to const
    const responsiveColumns = computed(() => [
      { 
        key: 'sn', 
        sortable: false, 
        label: 'SN', 
        width: '60px'
      },
      { 
        key: 'properties_rooms', 
        sortable: false, 
        label: 'Properties/Rooms', 
        width: '200px'
      },
      { 
        key: 'client_fullname', 
        sortable: true, 
        label: 'Client', 
        width: '120px'
      },
      { 
        key: 'appointment_type_name', 
        sortable: true, 
        label: 'Appointment', 
        width: '120px'
      },
      { 
        key: 'date', 
        sortable: true, 
        label: 'Date', 
        width: '80px'
      },
      { 
        key: 'time_slot', 
        sortable: true, 
        label: 'Time', 
        width: '80px'
      },
      { 
        key: 'status', 
        sortable: true, 
        label: 'Status', 
        width: '100px'
      },
      { 
        key: 'created_at', 
        sortable: true, 
        label: 'Created', 
        width: '100px'
      },
      { 
        key: 'actions', 
        sortable: false, 
        label: 'Actions', 
        width: '140px',
        align: 'center' as const
      },
    ]);

    const perPageOptions = [
      { value: 10, text: '10' },
      { value: 25, text: '25' },
      { value: 50, text: '50' },
    ];

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

    const formatDate = (date: Date | string | null, formatString: string): string => {
      if (!date) return 'None';
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      return isValid(parsedDate) ? format(parsedDate, formatString) : 'None';
    };

    const fetchWithRetry = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            errorMessage.value = 'Failed to load bookings. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    };

    const retryFetch = async () => {
      errorMessage.value = null;
      await getBookings({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    };

    const getBookings = async (params: GetBookingsParams = {}) => {
      loadingBookings.value = true;
      errorMessage.value = null;
      
      try {
        const response = await fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings`,
            method: 'get',
            requiresAuth: true,
            params: {
              page: params.page || 1,
              per_page: params.per_page || pagination.value.per_page || 10,
              search: params.search || '',
            },
          })
        );

        if (response && response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
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
                id: Number(r.id || r.room_id), // Fixed: Added id property
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

          // Fixed: Include from and to in pagination assignment
          pagination.value = {
            total: response.data.pagination?.total_items || response.data.data.length || 0,
            per_page: Number(response.data.pagination?.items_per_page) || params.per_page || 10,
            current_page: Number(response.data.pagination?.current_page) || params.page || 1,
            last_page: Math.ceil((response.data.pagination?.total_items || response.data.data.length || 0) / (response.data.pagination?.items_per_page || params.per_page || 10)) || 1,
            from: (response.data.pagination?.total_items || response.data.data.length || 0) > 0 ? ((response.data.pagination?.current_page || params.page || 1) - 1) * (response.data.pagination?.items_per_page || params.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination?.current_page || params.page || 1) * (response.data.pagination?.items_per_page || params.per_page || 10), response.data.pagination?.total_items || response.data.data.length || 0),
          };

          if (bookings.value.length === 0 && !searchQuery.value) {
            Swal.fire({
              title: 'No Bookings',
              text: 'No bookings found. Add some bookings to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch bookings.');
        }
      } catch (error: any) {
        console.error('getBookings error:', error);
        let errorMsg = error.response?.data?.message || 'Failed to fetch bookings.';
        
        if (error.message.includes('Network Error')) {
          errorMsg = 'Network error: Unable to connect to the server.';
        } else if (error.response?.status === 401) {
          errorMsg = 'Session expired. Please log in again.';
          Swal.fire({
            title: 'Session Expired',
            text: errorMsg,
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Login',
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
        }
        
        errorMessage.value = errorMsg;
        Swal.fire({
          title: 'Error',
          text: errorMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 4000,
        });
      } finally {
        loadingBookings.value = false;
      }
    };

    const addBooking = async (payload: FormData) => {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid booking data provided.');
      }
      submitting.value = true;
      try {
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
        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: 'Booking created successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          return response;
        } else {
          throw new Error(response.data?.message || 'Failed to add booking.');
        }
      } catch (error: any) {
        console.error('addBooking error:', error);
        let errorMsg = error.response?.data?.message || 'Failed to add booking.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMsg = Object.values(error.response.data.errors).flat().join('; ');
        }
        Swal.fire({
          title: 'Error!',
          text: errorMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 4000,
        });
        throw error;
      } finally {
        submitting.value = false;
      }
    };

    const updateBooking = async (payload: FormData & { id: number }) => {
      if (!payload || typeof payload !== 'object' || !payload.id) {
        throw new Error('Invalid booking data provided for update.');
      }
      submitting.value = true;
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
          Swal.fire({
            title: 'Success!',
            text: 'Booking updated successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          return response;
        } else {
          throw new Error(response.data?.message || 'Failed to update booking.');
        }
      } catch (error: any) {
        console.error('updateBooking error:', error);
        let errorMsg = error.response?.data?.message || 'Failed to update booking.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMsg = Object.values(error.response.data.errors).flat().join('; ');
        }
        Swal.fire({
          title: 'Error!',
          text: errorMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 4000,
        });
        throw error;
      } finally {
        submitting.value = false;
      }
    };

    const deleteBooking = async (id: number) => {
      deleting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/bookings/${id}`,
          method: 'delete',
          requiresAuth: true,
        });
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Booking deleted successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          return response;
        } else {
          throw new Error(response.data?.message || 'Failed to delete booking.');
        }
      } catch (error: any) {
        console.error('deleteBooking error:', error);
        let errorMsg = error.response?.data?.message || 'Failed to delete booking.';
        if (error.response?.status === 401) {
          errorMsg = 'Session expired. Please log in again.';
          Swal.fire({
            title: 'Session Expired',
            text: errorMsg,
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Login',
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
        }
        Swal.fire({
          title: 'Error!',
          text: errorMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 4000,
        });
        throw error;
      } finally {
        deleting.value = false;
      }
    };

    const openForm = (booking: Booking | null = null, mode: 'add' | 'edit' = 'add') => {
      if (mode === 'edit' && !booking) {
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
      selectedBooking.value = booking;
      formMode.value = mode;
      addEditForm.value = true;
    };

    const closeForm = () => {
      selectedBooking.value = null;
      addEditForm.value = false;
      formMode.value = 'add';
      getBookings({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    };

    const openView = (booking: Booking) => {
      selectedBooking.value = booking;
      showView.value = true;
    };

    const closeView = () => {
      selectedBooking.value = null;
      showView.value = false;
    };

    const confirmDelete = (booking: Booking) => {
      selectedBooking.value = booking;
      const resourceName = booking.booking_property_type_id === 1
        ? booking.properties?.map(p => p.title).join(', ') || 'Property'
        : booking.rooms?.map(r => r.room_number).join(', ') || 'Room';
      
      Swal.fire({
        title: 'Confirm Delete',
        html: `
          <div class="text-sm">
            <p>Are you sure you want to delete the booking for</p>
            <p class="font-medium text-blue-600 mt-1">${resourceName}</p>
            <p class="mt-2">on ${formatDate(booking.date, 'MMMM d, yyyy')}?</p>
            <p class="text-red-600 font-medium mt-2">This action cannot be undone.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '<i class="va-icon mr-1">delete</i>Yes, delete it',
        cancelButtonText: '<i class="va-icon mr-1">close</i>Cancel',
        buttonsStyling: false,
        customClass: {
          confirmButton: 'px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
          cancelButton: 'px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-3'
        },
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          handleDelete();
        }
      });
    };

    const handleDelete = async () => {
      if (!selectedBooking.value?.id || deleting.value) return;
      await deleteBooking(selectedBooking.value.id);
      selectedBooking.value = null;
      componentKey.value += 1;
      await getBookings({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    };

    const handleAddSubmit = async (payload: FormData | undefined) => {
      if (submitting.value) return;
      if (!payload || typeof payload !== 'object') {
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
        await addBooking(payload);
        closeForm();
        componentKey.value += 1;
      } catch (error) {
        console.error('handleAddSubmit error:', error);
      }
    };

    const handleEditSubmit = async (payload: FormData & { id: number }) => {
      if (submitting.value) return;
      if (!selectedBooking.value?.id) {
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
        await updateBooking(payload);
        closeForm();
        componentKey.value += 1;
      } catch (error) {
        console.error('handleEditSubmit error:', error);
      }
    };

    const handlePageChange = async (page: number) => {
      if (loadingBookings.value) return;
      if (page < 1 || page > pagination.value.last_page) return;
      
      pagination.value.current_page = page;
      await getBookings({
        page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };

    const handlePerPageChange = async (perPage: number) => {
      if (loadingBookings.value) return;
      pagination.value.per_page = perPage || 10;
      pagination.value.current_page = 1;
      await getBookings({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };

    const clearSearch = () => {
      searchQuery.value = '';
      pagination.value.current_page = 1;
      getBookings({
        page: 1,
        per_page: pagination.value.per_page,
        search: '',
      });
    };

    const debouncedSearch = debounce(() => {
      if (loadingBookings.value) return;
      pagination.value.current_page = 1;
      getBookings({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    }, 300);

    const debouncedHandleAddSubmit = debounce((payload: FormData | undefined) => {
      handleAddSubmit(payload);
    }, 1000, { leading: true, trailing: false });

    const debouncedHandleEditSubmit = debounce((payload: FormData & { id: number }) => {
      handleEditSubmit(payload);
    }, 1000, { leading: true, trailing: false });

    const cancelAdding = () => closeForm();

    // Initial load
    getBookings();

    return {
      responsiveColumns,
      bookings,
      loadingBookings,
      errorMessage,
      pagination: computedPagination,
      addEditForm,
      showView,
      selectedBooking,
      formMode,
      componentKey,
      deleting,
      submitting,
      searchQuery,
      perPageOptions,
      paginationPages,
      formatDate,
      debouncedSearch,
      debouncedHandleAddSubmit,
      debouncedHandleEditSubmit,
      openForm,
      closeForm,
      openView,
      closeView,
      confirmDelete,
      handleDelete,
      handlePageChange,
      handlePerPageChange,
      clearSearch,
      retryFetch,
      cancelAdding,
    };
  },
});
</script>

<style lang="scss" scoped>
.loadingSpiner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  
  @media (min-width: 640px) {
    min-height: 400px;
  }
}

/* Ensure smooth scrolling on mobile */
:deep(.va-data-table__table-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 639px) {
    border-radius: 0.5rem;
    margin: 0 -0.5rem;
  }
}

/* Improve mobile button touch targets */
:deep(.va-button--small) {
  min-height: 36px !important;
  
  @media (min-width: 640px) {
    min-height: 32px !important;
  }
}

/* Modal responsive improvements */
:deep(.va-modal__content) {
  @media (max-width: 639px) {
    margin: 0.25rem;
    max-width: calc(100vw - 0.5rem);
  }
}

/* Table header improvements */
:deep(.va-data-table__thead th) {
  @media (max-width: 639px) {
    white-space: nowrap;
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
  }
}

/* Table body improvements */
:deep(.va-data-table__tbody td) {
  @media (max-width: 639px) {
    padding: 0.75rem 0.25rem;
    vertical-align: middle;
  }
}
</style>