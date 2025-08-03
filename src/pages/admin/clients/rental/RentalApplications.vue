<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, user, or status"
          class="w-64"
          @input="triggerSearch"
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
          Add Rental Application
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="applications"
        striped
        :columns="columns"
        :loading="loadingApplications"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <div class="flex space-x-2">
            <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
            <VaButton size="small" color="warning" icon="edit" @click="openForm(rowData, 'edit')" />
            <VaButton
              v-if="rowData.status === 'pending'"
              size="small"
              color="success"
              icon="check"
              @click="approveApplication(rowData)"
            />
            <VaButton
              v-if="rowData.status === 'pending'"
              size="small"
              color="danger"
              icon="close"
              @click="rejectApplication(rowData)"
            />
            <VaButton size="small" color="danger" icon="delete" @click="confirmDelete(rowData)" />
          </div>
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} rental applications
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
      <RentalApplicationForm v-if="formMode === 'add'" @close="closeForm" @submit="triggerSubmit" />
      <RentalApplicationEdit
        v-if="formMode === 'edit' && selectedApplication"
        :application="selectedApplication"
        @close="closeForm"
        @submit="triggerSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Rental Application Details') }}</div>
      <div v-if="selectedApplication" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedApplication.property_title || 'N/A' }}</p>
        <p><strong>User:</strong> {{ selectedApplication.user_name || selectedApplication.first_name + ' ' + selectedApplication.last_name || 'N/A' }}</p>
        <p><strong>Branch:</strong> {{ selectedApplication.branch_name || 'N/A' }}</p>
        <p><strong>Status:</strong> {{ selectedApplication.status || 'N/A' }}</p>
        <p><strong>Employment Status:</strong> {{ selectedApplication.employment_status || 'N/A' }}</p>
        <p><strong>Annual Income:</strong> {{ selectedApplication.annual_income ?? 'N/A' }}</p>
        <p><strong>Background Check Status:</strong> {{ selectedApplication.background_check_status || 'N/A' }}</p>
        <p><strong>Credit Report Status:</strong> {{ selectedApplication.credit_report_status || 'N/A' }}</p>
        <p><strong>Created At:</strong> {{ selectedApplication.created_at || 'N/A' }}</p>
        <p><strong>Updated At:</strong> {{ selectedApplication.updated_at || 'N/A' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import RentalApplicationForm from './RentalApplicationForm.vue';
import RentalApplicationEdit from './RentalApplicationEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import type { DebouncedFunc } from 'lodash';
import type { RentalApplication, Payload } from '../../../../types/rentalApplication';

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export default defineComponent({
  name: 'RentalApplicationList',
  components: {
    RentalApplicationForm,
    RentalApplicationEdit,
  },
  setup() {
    const applications = ref<RentalApplication[]>([]);
    const loadingApplications = ref<boolean>(false);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const searchQuery = ref<string>('');
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const selectedApplication = ref<RentalApplication | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const componentKey = ref<number>(0);
    const deleting = ref<boolean>(false);
    const submitting = ref<boolean>(false);
    const debouncedHandleSubmit = ref<DebouncedFunc<(payload: Payload, mode: 'add' | 'edit') => Promise<void>>>();
    const debouncedSearch = ref<DebouncedFunc<() => Promise<void>>>();

    return {
      applications,
      loadingApplications,
      pagination,
      searchQuery,
      addEditForm,
      showView,
      selectedApplication,
      formMode,
      componentKey,
      deleting,
      submitting,
      debouncedHandleSubmit,
      debouncedSearch,
    };
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
    this.debouncedSearch = debounce(this.handleSearch, 500);
    this.fetchApplications();
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'user_name', sortable: true, label: 'User' },
        { key: 'branch_name', sortable: true, label: 'Branch' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'employment_status', sortable: true, label: 'Employment Status' },
        { key: 'annual_income', sortable: true, label: 'Annual Income' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
    };
  },
  methods: {
    async fetchApplications(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingApplications = true;
      console.log('Fetching applications with params:', params);
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          params: {
            page: params.page || this.pagination.current_page,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || this.searchQuery,
          },
        });
        console.log('API response:', response);
        if (response.status === 200) {
          this.applications = response.data.data.map((app: any) => {
            // Validate status to ensure it matches the expected union type
            const validStatuses = ['pending', 'approved', 'rejected'] as const;
            const status: 'pending' | 'approved' | 'rejected' = validStatuses.includes(app.status)
              ? app.status
              : 'pending'; // Default to 'pending' if API returns invalid status

            return {
              id: Number(app.id),
              property_id: Number(app.property_id),
              property_title: app.property_title || null,
              user_id: Number(app.user_id),
              user_name: app.user_name || null,
              first_name: app.first_name || null,
              last_name: app.last_name || null,
              branch_id: app.branch_id ? Number(app.branch_id) : null,
              branch_name: app.branch_name || null,
              status,
              employment_status: app.employment_status || '',
              annual_income: app.annual_income ?? null,
              background_check_status: app.background_check_status || null,
              credit_report_status: app.credit_report_status || null,
              created_at: app.created_at || '',
              updated_at: app.updated_at || '',
            };
          });
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          console.log('Updated pagination:', this.pagination);
          if (response.data.data.length === 0 && params.page && params.page > 1) {
            console.log('Empty page detected, resetting to page 1');
            this.pagination.current_page = 1;
            await this.fetchApplications({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
          } else if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No rental applications found. Add some applications to get started.',
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
            text: response.data?.message || 'Failed to fetch rental applications.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchApplications error:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch rental applications.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
      } finally {
        this.loadingApplications = false;
      }
    },
    async approveApplication(application: RentalApplication) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${application.id}/approve`,
          method: 'post',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
        });
        console.log('Approve response:', response);
        if (response.status === 200) {
          await this.fetchApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Approved!',
            text: 'Rental application approved successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 1500,
          });
        }
      } catch (error: any) {
        console.error('approveApplication error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to approve rental application.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    async rejectApplication(application: RentalApplication) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${application.id}/reject`,
          method: 'post',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
        });
        console.log('Reject response:', response);
        if (response.status === 200) {
          await this.fetchApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Rejected!',
            text: 'Rental application rejected successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 1500,
          });
        }
      } catch (error: any) {
        console.error('rejectApplication error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to reject rental application.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    triggerSearch() {
      if (this.debouncedSearch) {
        this.debouncedSearch();
      }
    },
    triggerSubmit(payload: Payload, mode: 'add' | 'edit') {
      if (this.debouncedHandleSubmit) {
        this.debouncedHandleSubmit(payload, mode);
      }
    },
    openForm(application: RentalApplication | null = null, mode: 'add' | 'edit' = 'add') {
      console.log('Opening form with application:', JSON.stringify(application, null, 2));
      this.selectedApplication = application;
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      console.log('Closing form, resetting selectedApplication');
      this.selectedApplication = null;
      this.addEditForm = false;
      this.formMode = 'add';
    },
    openView(application: RentalApplication) {
      console.log('Opening view modal for application:', JSON.stringify(application, null, 2));
      this.selectedApplication = application;
      this.showView = true;
    },
    closeView() {
      console.log('Closing view modal');
      this.selectedApplication = null;
      this.showView = false;
    },
    confirmDelete(application: RentalApplication) {
      console.log('Confirming delete for application:', JSON.stringify(application, null, 2));
      this.selectedApplication = application;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the rental application for "${application.property_title}" by "${application.user_name || (application.first_name + ' ' + application.last_name)}". This action cannot be undone.`,
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
      this.fetchApplications({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },
    async handleDelete() {
      if (!this.selectedApplication?.id) return;
      this.deleting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${this.selectedApplication.id}`,
          method: 'delete',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
        });
        console.log('Delete response:', response);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Rental application has been deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.selectedApplication = null;
          this.componentKey += 1;
          await this.fetchApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete rental application.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Delete error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete rental application.',
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
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
            method: 'post',
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
            data: payload,
          });
        } else {
          if (!this.selectedApplication?.id) throw new Error('No application ID provided for update');
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${this.selectedApplication.id}`,
            method: 'put',
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
            data: payload,
          });
        }
        console.log(`${mode} response:`, response);
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Rental application has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          await this.fetchApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
          this.closeForm();
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || (mode === 'add' ? 'Failed to add rental application.' : 'Failed to update rental application.'),
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error(`${mode} error:`, error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || (mode === 'add' ? 'Failed to add rental application.' : 'Failed to update rental application.');
        if (error.response?.status === 422) {
          if (errorMessage === 'A pending application already exists for this user and property') {
            Swal.fire({
              title: 'Error!',
              text: 'A pending application already exists for this user and property.',
              icon: 'error',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          } else if (error.response?.data?.errors) {
            errorMessage = Object.values(error.response.data.errors).flat().join('; ');
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
        } else {
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
      } finally {
        this.submitting = false;
      }
    },
    async handlePageChange(page: number) {
      console.log('Changing page to:', page);
      await this.fetchApplications({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    async handleSearch() {
      console.log('Searching with query:', this.searchQuery);
      await this.fetchApplications({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
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