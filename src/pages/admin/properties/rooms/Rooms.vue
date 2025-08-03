<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-end items-center mb-4">
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
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="rooms"
        :columns="columns"
        :loading="loadingRooms"
        :pagination="pagination"
        @update:pagination="handlePagination"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(is_available)="{ rowData }">
          {{ rowData.is_available ? 'Yes' : 'No' }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="mt-4 flex justify-center">
        <VaPagination
          v-model="pagination.current_page"
          :pages="pagination.last_page"
          :visible-pages="5"
          :boundary-links="true"
          :direction-links="true"
          @update:modelValue="handlePagination"
        />
      </div>
    </template>
    <template v-else>
      <RoomForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <RoomEdit v-if="formMode === 'edit'" :room="selectedRoom!" @close="closeForm" @submit="debouncedHandleSubmit" />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Room Details') }}</div>
      <div v-if="selectedRoom" class="space-y-2">
        <p><strong>Property ID:</strong> {{ selectedRoom.property_id }}</p>
        <p><strong>Property Title:</strong> {{ selectedRoom.property_title || 'None' }}</p>
        <p><strong>Room Number:</strong> {{ selectedRoom.room_number }}</p>
        <p><strong>Size (sq ft):</strong> {{ selectedRoom.size }}</p>
        <p><strong>Rent (TZS):</strong> {{ selectedRoom.rent }}</p>
        <p><strong>Available:</strong> {{ selectedRoom.is_available ? 'Yes' : 'No' }}</p>
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
import { Room } from '../../../../types/room';
import { AxiosResponse } from 'axios';

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
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
        { key: 'room_number', sortable: true, label: 'Room Number' },
        { key: 'size', sortable: true, label: 'Size (sq ft)' },
        { key: 'rent', sortable: true, label: 'Rent (TZS)' },
        { key: 'is_available', sortable: true, label: 'Available' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedRoom: null as Room | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as Pagination,
    };
  },
  computed: {
    ...mapState(useRoomStore, ['rooms', 'loadingRooms']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
  },
  mounted() {
    this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page });
  },
  methods: {
    ...mapActions(useRoomStore, ['getRooms', 'deleteRoom', 'addRoom', 'updateRoom']),

    async handlePagination(page: number) {
      this.pagination.current_page = page;
      const response: AxiosResponse<RoomsResponse | ErrorResponse> = await this.getRooms({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
      });
      if ('data' in response && 'pagination' in response.data && response.data.pagination?.last_page && response.data.pagination.last_page < this.pagination.current_page) {
        this.pagination.current_page = response.data.pagination.last_page || 1;
        await this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page });
      }
      this.componentKey += 1; // Force re-render
    },

    openForm(room: Room | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedRoom = room;
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedRoom = null;
      this.addEditForm = false;
      this.formMode = 'add';
      // Ensure table is refreshed only after form is closed
      this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page });
      this.componentKey += 1; // Force table re-render
    },

    openView(room: Room) {
      this.selectedRoom = room;
      this.showView = true;
    },

    closeView() {
      this.selectedRoom = null;
      this.showView = false;
    },

    confirmDelete(room: Room) {
      this.selectedRoom = room;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete room "${room.room_number}" for property "${room.property_title}". This action cannot be undone.`,
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
          await this.getRooms({ page: this.pagination.current_page, per_page: this.pagination.per_page });
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

    async handleSubmit(payload: any, mode: 'add' | 'edit') {
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
          // Close the form and reset state
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

    debouncedHandleSubmit: Function as (payload: any, mode: 'add' | 'edit') => void,
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

/* Improve table padding */
.va-data-table__table-td,
.va-data-table__table-th {
  padding: 0.75rem 1rem !important; /* Increase padding for table cells and headers */
}
.va-data-table__table-tr {
  border-bottom: 1px solid #e5e7eb; /* Add a subtle border for better separation */
}
.va-data-table__table {
  border-collapse: separate;
  border-spacing: 0;
}
</style>