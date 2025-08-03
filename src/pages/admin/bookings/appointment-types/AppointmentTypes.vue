<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by appointment type name"
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
          Add Appointment Type
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="appointmentTypes"
        striped
        :columns="columns"
        :loading="loadingAppointmentTypes"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} appointment types
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
    </template>
    <template v-else>
      <AppointmentTypeForm v-if="formMode === 'add'" @close="closeForm" @submit="handleSubmit" />
      <AppointmentTypeEdit
        v-if="formMode === 'edit' && selectedAppointmentType"
        :appointment-type="selectedAppointmentType"
        @close="closeForm"
        @submit="handleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Appointment Type Details') }}</div>
      <div v-if="selectedAppointmentType" class="space-y-2">
        <p><strong>Name:</strong> {{ selectedAppointmentType.name }}</p>
        <p><strong>Created At:</strong> {{ selectedAppointmentType.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedAppointmentType.updated_at }}</p>
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
import { useAppointmentTypeStore } from '../../../../stores/appointmentTypeStore';
import AppointmentTypeForm from './AppointmentTypeForm.vue';
import AppointmentTypeEdit from './AppointmentTypeEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import type { AppointmentType, FormData, ApiResponse } from '../../../../types/appointment-type';

export default defineComponent({
  name: 'AppointmentTypeList',
  components: {
    AppointmentTypeForm,
    AppointmentTypeEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedAppointmentType: null as AppointmentType | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedSearch: Function as () => void,
    };
  },
  computed: {
    ...mapState(useAppointmentTypeStore, ['appointmentTypes', 'loadingAppointmentTypes', 'pagination']),
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.getAppointmentTypes({ page: 1, per_page: 10 });
  },
  methods: {
    ...mapActions(useAppointmentTypeStore, [
      'getAppointmentTypes',
      'deleteAppointmentType',
      'addAppointmentType',
      'updateAppointmentType',
    ]),

    openForm(appointmentType: AppointmentType | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !appointmentType) {
        Swal.fire({
          title: 'Error!',
          text: 'No appointment type selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      this.selectedAppointmentType = appointmentType;
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedAppointmentType = null;
      this.addEditForm = false;
      this.formMode = 'add';
    },

    openView(appointmentType: AppointmentType) {
      this.selectedAppointmentType = appointmentType;
      this.showView = true;
    },

    closeView() {
      this.selectedAppointmentType = null;
      this.showView = false;
    },

    confirmDelete(appointmentType: AppointmentType) {
      this.selectedAppointmentType = appointmentType;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the appointment type "${appointmentType.name}". This action cannot be undone.`,
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
      this.getAppointmentTypes({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },

    async handleDelete() {
      if (!this.selectedAppointmentType?.id) return;
      this.deleting = true;
      try {
        const response = await this.deleteAppointmentType(this.selectedAppointmentType.id);
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Appointment type has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedAppointmentType = null;
          this.componentKey += 1;
          await this.getAppointmentTypes({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          const errorMessage = response.data.message || 'Failed to delete appointment type.';
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
        const errorMessage = err.response?.data?.message || 'Failed to delete appointment type.';
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
        this.deleting = false;
      }
    },

    async handleSubmit(payload: FormData & { id?: number }, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response: ApiResponse<AppointmentType | null>;
        if (mode === 'add') {
          response = await this.addAppointmentType(payload);
        } else {
          response = await this.updateAppointmentType({ id: this.selectedAppointmentType!.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Appointment type has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          await this.getAppointmentTypes({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
          this.closeForm();
        } else {
          let errorMessage = response.data.message || (mode === 'add' ? 'Failed to add appointment type.' : 'Failed to update appointment type.');
          if (response.status === 422 && response.data.errors) {
            errorMessage += '\n' + Object.values(response.data.errors).flat().join('\n');
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
        let errorMessage = err.response?.data?.message || (mode === 'add' ? 'Failed to add appointment type.' : 'Failed to update appointment type.');
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

    async handlePageChange(page: number) {
      await this.getAppointmentTypes({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },

    async handleSearch() {
      await this.getAppointmentTypes({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
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
