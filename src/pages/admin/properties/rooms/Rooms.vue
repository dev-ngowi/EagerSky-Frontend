<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-if="!addEditForm"
          v-model="searchQuery"
          placeholder="Search by room number, property or category..."
          class="w-64"
          :disabled="loadingRooms"
          @input="debouncedSearch"
        />
        <VaButton 
          v-if="searchQuery && !addEditForm" 
          color="warning" 
          size="small" 
          @click="clearSearch"
        >
          Clear Search
        </VaButton>
      </div>
      <div class="flex items-center space-x-4">
        <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          :color="'#00A3E0'"
          size="small"
          class="px-4"
          @click="openForm(null, 'add')"
        >
          Add
        </VaButton>
      </div>
    </div>
    <div v-if="!loadingRooms && (!rooms || rooms.length === 0)" class="text-center py-4">
      {{ searchQuery ? 'No rooms found matching your search criteria.' : 'No rooms found.' }}
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="rooms"
        :columns="columns"
        :loading="loadingRooms"
        striped
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(is_available)="{ rowData }">
          {{ rowData.is_available ? 'Yes' : 'No' }}
        </template>
        <template #cell(room_category_name)="{ rowData }">
          {{ rowData.room_category_name || 'N/A' }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      
      <!-- Updated Pagination Section -->
      <div v-if="rooms && rooms.length > 0" class="flex justify-between items-center mt-4">
        <div class="flex items-center space-x-4">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-32"
            @update:modelValue="handlePerPageChange"
          />
          <div class="text-sm text-gray-600">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} rooms
          </div>
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
            :disabled="pagination.current_page === pagination.last_page"
            @click="handlePageChange(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <RoomForm v-if="formMode === 'add'" @close="closeForm" @submit="handleRoomFormSubmit" />
      <RoomEdit v-if="formMode === 'edit' && selectedRoom" :room="selectedRoom" @close="closeForm" @submit="debouncedHandleSubmit" />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Room Details') }}</div>
      <div v-if="selectedRoom" class="space-y-2">
        <p><strong>Property ID:</strong> {{ selectedRoom.property_id }}</p>
        <p><strong>Property Title:</strong> {{ selectedRoom.property_title || 'N/A' }}</p>
        <p><strong>Room Category:</strong> {{ selectedRoom.room_category_name || 'N/A' }}</p>
        <p><strong>Room Number:</strong> {{ selectedRoom.room_number }}</p>
        <p><strong>Size (sq m):</strong> {{ selectedRoom.size }}</p>
        <p><strong>Rent (TZS):</strong> {{ selectedRoom.rent }}</p>
        <p><strong>Available:</strong> {{ selectedRoom.is_available ? 'Yes' : 'No' }}</p>
        <p><strong>Features:</strong> {{ selectedRoom.features?.length ? selectedRoom.features.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ') : 'N/A' }}</p>
        <p><strong>Description:</strong> {{ selectedRoom.description || 'N/A' }}</p>
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
import { defineComponent } from 'vue';
import { mapActions, mapState } from 'pinia';
import { useRoomStore } from '../../../../stores/roomStore';
import RoomForm from './RoomForm.vue';
import RoomEdit from './RoomEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { Room, Payload } from '../../../../types/room';
import { AxiosResponse } from 'axios';
import makeRequest from '../../../../services/makeRequest';

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
  name: 'Rooms',
  components: {
    RoomForm,
    RoomEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'room_category_name', sortable: true, label: 'Room Category' },
        { key: 'room_number', sortable: true, label: 'Room Number' },
        { key: 'size', sortable: true, label: 'Size (sq m)' },
        { key: 'rent', sortable: true, label: 'Rent (TZS)' },
        { key: 'is_available', sortable: true, label: 'Available' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedRoom: null as Room | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      properties: [] as { value: number; text: string }[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      } as Pagination,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
    };
  },
  computed: {
    ...mapState(useRoomStore, ['rooms', 'loadingRooms']),
    
    paginationPages() {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page;
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
    },
  },
  async created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false }) as (payload: Payload, mode: 'edit') => void;
    this.debouncedSearch = debounce(this.handleSearch, 500) as () => void;
    await this.fetchProperties();
  },
  mounted() {
    this.fetchRooms();
  },
  methods: {
    ...mapActions(useRoomStore, ['getRooms', 'deleteRoom', 'addRoom', 'updateRoom']),

    async fetchProperties() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: Number(property.id),
            text: property.title || `Unnamed Property (ID: ${property.id})`,
          }));
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async fetchRooms() {
      try {
        const requestParams: any = {
          page: this.pagination.current_page,
          per_page: this.pagination.per_page,
        };

        if (this.searchQuery && this.searchQuery.trim()) {
          requestParams.search = this.searchQuery.trim();
        }

        const response: AxiosResponse<RoomsResponse | ErrorResponse> = await this.getRooms(requestParams);

        if ('data' in response.data && 'pagination' in response.data) {
          this.pagination = {
            total: response.data.pagination.total || 0,
            per_page: response.data.pagination.per_page || this.pagination.per_page,
            current_page: response.data.pagination.current_page || this.pagination.current_page,
            last_page: response.data.pagination.last_page || 1,
            from: response.data.pagination.from || 0,
            to: response.data.pagination.to || 0,
          };

          if (this.pagination.current_page > this.pagination.last_page && this.pagination.last_page > 0) {
            this.pagination.current_page = this.pagination.last_page;
            const retryParams = { ...requestParams, page: this.pagination.current_page };
            await this.getRooms(retryParams);
          }

          if (response.data.data.length === 0 && this.searchQuery) {
            Swal.fire({
              title: 'Info',
              text: 'No rooms found matching your search criteria.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: (response.data as ErrorResponse).message || 'Failed to fetch rooms.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to fetch rooms.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    clearSearch() {
      this.searchQuery = '';
      this.pagination.current_page = 1;
      this.fetchRooms();
    },

    handleSearch() {
      this.pagination.current_page = 1;
      this.fetchRooms();
    },

    async handlePageChange(page: number) {
      this.pagination.current_page = page;
      await this.fetchRooms();
      this.componentKey += 1;
    },

    async handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      await this.fetchRooms();
      this.componentKey += 1;
    },

    async openForm(room: Room | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && room) {
        try {
          const response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          });
          
          if (response.status === 200) {
           this.selectedRoom = {
              id: response.data.data.id,
              property_id: Number(response.data.data.property_id),
              property_title: response.data.data.property_title || null,
              room_category_id: Number(response.data.data.room_category_id) || 0,
              room_category_name: response.data.data.room_category_name || null,
              room_number: response.data.data.room_number,
              size: Number(response.data.data.size),
              rent: Number(response.data.data.rent),
              is_available: response.data.data.is_available,
              features: Array.isArray(response.data.data.features) ? response.data.data.features : [],
              description: response.data.data.description ?? '', // Use nullish coalescing
              created_at: response.data.data.created_at ? new Date(response.data.data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'None',
              updated_at: response.data.data.updated_at ? new Date(response.data.data.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'None',
            };
            console.log('Complete room data for editing:', this.selectedRoom);
          } else {
            throw new Error('Failed to fetch room details');
          }
        } catch (error) {
          console.error('Error fetching room details:', error);
          Swal.fire({
            title: 'Error!',
            text: 'Failed to load room details for editing.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return;
        }
      } else {
        this.selectedRoom = room;
      }
      
      this.formMode = mode;
      this.addEditForm = true;
    },

    async openView(room: Room) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${room.id}`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        
        if (response.status === 200) {
          this.selectedRoom = {
            id: response.data.data.id,
            property_id: Number(response.data.data.property_id),
            property_title: response.data.data.property_title || null,
            room_category_id: Number(response.data.data.room_category_id) || 0,
            room_category_name: response.data.data.room_category_name || null,
            room_number: response.data.data.room_number,
            size: Number(response.data.data.size),
            rent: Number(response.data.data.rent),
            is_available: response.data.data.is_available,
            features: Array.isArray(response.data.data.features) ? response.data.data.features : [],
            description: response.data.data.description || '', // Default to empty string
            created_at: response.data.data.created_at ? new Date(response.data.data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'None',
            updated_at: response.data.data.updated_at ? new Date(response.data.data.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'None',
          };
          console.log('Selected room:', this.selectedRoom);
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

    async closeForm() {
      this.selectedRoom = null;
      this.addEditForm = false;
      this.formMode = 'add';
      await this.fetchRooms();
      this.componentKey += 1;
    },

    closeView() {
      this.selectedRoom = null;
      this.showView = false;
    },

    confirmDelete(room: Room) {
      this.selectedRoom = room;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete room "${room.room_number}" for property "${room.property_title || 'N/A'}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete();
        }
      });
    },

    cancelAdding() {
      this.closeForm();
    },

    async handleDelete() {
      if (!this.selectedRoom?.id) return;
      this.deleting = true;
      try {
        const response = await this.deleteRoom(this.selectedRoom.id);
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Room has been deleted successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedRoom = null;
          this.componentKey += 1;
          await this.fetchRooms();
        } else {
          Swal.fire({
            title: 'Error!',
            text: (response.data as ErrorResponse).message || 'Failed to delete room.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to delete room.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.deleting = false;
      }
    },

    async handleSubmit(payload: Payload, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response;
        if (mode === 'add') {
          response = await this.addRoom(payload);
        } else {
          response = await this.updateRoom({ id: this.selectedRoom!.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Room has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.closeForm();
        } else {
          let errorMessage =
            (response.data as ErrorResponse).message || (mode === 'add' ? 'Failed to add room.' : 'Failed to update room.');
          if (response.status === 422 && (response.data as ErrorResponse).errors) {
            errorMessage += '\n' + Object.values((response.data as ErrorResponse).errors!).flat().join('\n');
          }
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
      } catch (err: any) {
        let errorMessage =
          err.response?.data?.message || (mode === 'add' ? 'Failed to add room.' : 'Failed to update room.');
        if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage += '\n' + Object.values(err.response.data.errors).flat().join('\n');
        }
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
        this.submitting = false;
      }
    },

    handleRoomFormSubmit(payload: Payload | Payload[], mode: 'add') {
      if (Array.isArray(payload)) {
        payload.forEach((item) => this.handleSubmit(item, mode));
      } else {
        this.handleSubmit(payload, mode);
      }
    },

    debouncedHandleSubmit: debounce(function (this: any, payload: Payload, mode: 'edit') {
      this.handleSubmit(payload, mode);
    }, 1000, { leading: true, trailing: false }) as (payload: Payload, mode: 'edit') => void,

    debouncedSearch: debounce(function (this: any) {
      this.handleSearch();
    }, 500) as () => void,
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
  flex-wrap: wrap;
}
.justify-between {
  justify-content: space-between;
}
.justify-end {
  justify-content: flex-end;
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
.w-32 {
  width: 8rem;
}
.text-sm {
  font-size: 0.875rem;
}
.text-gray-600 {
  color: #6b7280;
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

/* Media Queries for Responsive Design */
@media (max-width: 768px) {
  .flex {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .justify-between {
    justify-content: flex-start;
  }
  
  .w-64 {
    width: 100%;
    max-width: 100%;
  }
  
  .space-x-4 > :not(:last-child) {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  .space-x-2 > :not(:last-child) {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
}
</style>