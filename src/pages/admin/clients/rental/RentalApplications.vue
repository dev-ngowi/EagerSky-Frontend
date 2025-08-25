<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search applications by property or user name"
          class="w-64"
          :disabled="loadingApplications"
          @input="debouncedSearch"
        />
        <VaSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="Filter by status"
          class="w-48"
          clearable
          @update:modelValue="handleFilterChange"
        />
      </div>
      <div class="flex items-center space-x-4">
        <VaButton color="#00A3E0" @click="showAddForm = true">Add Application</VaButton>
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
    </div>
    <div v-if="!filteredApplications.length && !loadingApplications" class="text-center py-4">
      No applications found.
    </div>
    <VaDataTable
      v-else
      :key="componentKey"
      :items="displayedApplications"
      striped
      :columns="columns"
      :loading="loadingApplications"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(status)="{ rowData }">
        <span
          class="px-2 py-1 rounded text-sm font-medium"
          :class="{
            'bg-yellow-100 text-yellow-800': rowData.status === 'pending',
            'bg-green-100 text-green-800': rowData.status === 'approved',
            'bg-red-100 text-red-800': rowData.status === 'rejected',
          }"
        >
          {{ rowData.status }}
        </span>
      </template>
      <template #cell(user_name)="{ rowData }">
        {{ rowData.first_name && rowData.last_name ? `${rowData.first_name} ${rowData.last_name}` : rowData.user_name || 'Unknown User' }}
      </template>
      <template #cell(actions)="{ rowData }">
        <div class="flex space-x-2">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" @click="openEdit(rowData)" />
          <VaButton size="small" color="danger" icon="delete" @click="confirmDelete(rowData)" />
        </div>
      </template>
    </VaDataTable>
    <div v-if="filteredApplications.length > 0" class="flex justify-between items-center mt-4">
      <div class="text-sm">
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} applications
      </div>
      <div class="flex space-x-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1 || loadingApplications"
          @click="handlePageChange(pagination.current_page - 1)"
          aria-label="Go to previous page"
        >
          Previous
        </VaButton>
        <VaButton
          v-for="page in paginationPages"
          :key="page"
          size="small"
          :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
          :disabled="typeof page === 'string' || loadingApplications"
          :aria-label="`Go to page ${page}`"
          :aria-current="pagination.current_page === page ? 'page' : undefined"
          @click="typeof page === 'number' && handlePageChange(page)"
        >
          {{ page }}
        </VaButton>
        <VaButton
          size="small"
          :disabled="pagination.current_page === pagination.last_page || loadingApplications"
          @click="handlePageChange(pagination.current_page + 1)"
          aria-label="Go to next page"
        >
          Next
        </VaButton>
      </div>
    </div>
    <!-- Add Modal -->
    <VaModal v-model="showAddForm" size="large" close-button>
      <RentalApplicationForm @submit="handleAddSubmit" @close="showAddForm = false" />
    </VaModal>
    <!-- Edit Modal -->
    <VaModal v-model="showEditForm" size="large" close-button>
      <RentalApplicationEdit
        v-if="selectedApplication"
        :application="selectedApplication"
        @submit="handleEditSubmit"
        @close="showEditForm = false"
      />
    </VaModal>
    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Rental Application Details') }}</div>
      <div v-if="selectedApplication" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedApplication.property_title || 'None' }}</p>
        <p><strong>User:</strong> {{ selectedApplication.first_name && selectedApplication.last_name ? `${selectedApplication.first_name} ${selectedApplication.last_name}` : selectedApplication.user_name || 'Unknown User' }}</p>
        <p><strong>Branch:</strong> {{ selectedApplication.branch_name || 'None' }}</p>
        <p><strong>NIDA Number:</strong> {{ selectedApplication.nida_number || 'None' }}</p>
        <p><strong>Employment Status:</strong> {{ selectedApplication.employment_status || 'None' }}</p>
        <p><strong>Annual Income:</strong> {{ selectedApplication.annual_income || 'None' }}</p>
        <p><strong>Background Check Status:</strong> {{ selectedApplication.background_check_status || 'None' }}</p>
        <p><strong>Credit Report Status:</strong> {{ selectedApplication.credit_report_status || 'None' }}</p>
        <p><strong>Status:</strong> {{ selectedApplication.status || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedApplication.created_at || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ selectedApplication.updated_at || 'None' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="showView = false">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import type { RentalApplication, Payload } from '../../../../types/rentalApplication';
import RentalApplicationForm from './RentalApplicationForm.vue';
import RentalApplicationEdit from './RentalApplicationEdit.vue';

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

interface PerPageOption {
  value: number;
  text: string;
}

interface StatusOption {
  value: string;
  text: string;
}

interface GetApplicationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

export default defineComponent({
  name: 'RentalApplicationList',
  components: {
    RentalApplicationForm,
    RentalApplicationEdit,
  },
  setup() {
    const applications = ref<RentalApplication[]>([]);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });
    const loadingApplications = ref<boolean>(false);
    const showAddForm = ref<boolean>(false);
    const showEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const selectedApplication = ref<RentalApplication | null>(null);
    const componentKey = ref<number>(0);
    const searchQuery = ref<string>('');
    const statusFilter = ref<string>('');
    const perPageOptions = ref<PerPageOption[]>([
      { value: 10, text: '10' },
      { value: 20, text: '20' },
      { value: 50, text: '50' },
    ]);

    // Filter applications by search query and status
    const filteredApplications = computed(() => {
      let filtered = [...applications.value];

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(app =>
          app.property_title?.toLowerCase().includes(query) ||
          app.first_name?.toLowerCase().includes(query) ||
          app.last_name?.toLowerCase().includes(query) ||
          app.user_name?.toLowerCase().includes(query) ||
          app.nida_number?.toLowerCase().includes(query)
        );
      }

      if (statusFilter.value) {
        filtered = filtered.filter(app => app.status === statusFilter.value);
      }

      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Get applications for current page
    const displayedApplications = computed(() => {
      const start = (pagination.value.current_page - 1) * pagination.value.per_page;
      const end = start + pagination.value.per_page;
      return filteredApplications.value.slice(start, end);
    });

    // Pagination computed properties
    const paginationPages = computed<(number | string)[]>(() => {
      const pages: (number | string)[] = [];
      const lastPage = pagination.value.last_page;
      const current = pagination.value.current_page;
      const range = 2;

      // Always show first page
      pages.push(1);

      // Add ellipsis if needed
      if (current - range > 2) {
        pages.push('...');
      }

      // Add pages around current page
      const start = Math.max(2, current - range);
      const end = Math.min(lastPage - 1, current + range);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page
      if (current + range < lastPage - 1) {
        pages.push('...');
      }

      // Always show last page if more than one page
      if (lastPage > 1) {
        pages.push(lastPage);
      }

      return pages;
    });

    return {
      applications,
      filteredApplications,
      displayedApplications,
      pagination,
      loadingApplications,
      showAddForm,
      showEditForm,
      showView,
      selectedApplication,
      componentKey,
      searchQuery,
      statusFilter,
      perPageOptions,
      paginationPages,
    };
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'user_name', sortable: true, label: 'User' },
        { key: 'nida_number', sortable: true, label: 'NIDA Number' },
        { key: 'employment_status', sortable: true, label: 'Employment Status' },
        { key: 'annual_income', sortable: true, label: 'Annual Income' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      statusOptions: [
        { value: 'pending', text: 'Pending' },
        { value: 'approved', text: 'Approved' },
        { value: 'rejected', text: 'Rejected' },
      ] as StatusOption[],
      debouncedSearch: null as unknown as () => void,
    };
  },
  computed: {
    pagination(): Pagination {
      const total = this.filteredApplications.length;
      const per_page = this.pagination.per_page;
      const current_page = this.pagination.current_page;
      return {
        total,
        per_page,
        current_page,
        last_page: Math.ceil(total / per_page),
        from: total > 0 ? (current_page - 1) * per_page + 1 : 0,
        to: Math.min(current_page * per_page, total),
      };
    },
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.getApplications();
  },
  methods: {
    async getApplications(params: GetApplicationsParams = {}) {
      this.loadingApplications = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            // For client-side pagination, fetch all records
            per_page: 1000,
            search: params.search || '',
            status: params.status || '',
          },
        });

        if (response.status === 200 && Array.isArray(response.data?.data)) {
          this.applications = response.data.data
            .filter((application: any) => application && application.id)
            .map((application: any) => {
              const validStatuses = ['pending', 'approved', 'rejected'] as const;
              const status: 'pending' | 'approved' | 'rejected' = validStatuses.includes(application.status)
                ? application.status
                : 'pending';

              return {
                id: Number(application.id),
                property_id: Number(application.property_id),
                property_title: application.property_title || 'None',
                user_id: Number(application.user_id),
                user_name: application.user_name || null,
                first_name: application.first_name || '',
                last_name: application.last_name || '',
                branch_id: application.branch_id ? Number(application.branch_id) : null,
                branch_name: application.branch_name || 'None',
                nida_number: application.nida_number !== undefined && application.nida_number !== null ? String(application.nida_number) : 'None',
                employment_status: application.employment_status || 'None',
                annual_income: application.annual_income ? Number(application.annual_income) : 'None',
                background_check_status: application.background_check_status || 'None',
                credit_report_status: application.credit_report_status || 'None',
                status,
                created_at: application.created_at ? format(new Date(application.created_at), 'd MMMM yyyy') : 'None',
                updated_at: application.updated_at ? format(new Date(application.updated_at), 'd MMMM yyyy') : 'None',
              };
            });

          this.pagination.current_page = 1;

          if (this.applications.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No rental applications found.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch rental applications.');
        }
      } catch (error: any) {
        console.error('getApplications error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to fetch rental applications.';
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
        this.loadingApplications = false;
        this.componentKey += 1;
      }
    },
    async handleAddSubmit(payload: Payload, mode: 'add') {
      this.showAddForm = false;
      await this.getApplications({
        search: this.searchQuery,
        status: this.statusFilter,
      });
      this.componentKey += 1;
    },
    async handleEditSubmit(payload: Payload, mode: 'edit') {
      this.showEditForm = false;
      await this.getApplications({
        search: this.searchQuery,
        status: this.statusFilter,
      });
      this.componentKey += 1;
    },
    confirmDelete(application: RentalApplication) {
      Swal.fire({
        title: 'Delete Application?',
        text: `Are you sure you want to delete the application for "${application.property_title}" by ${application.first_name && application.last_name ? `${application.first_name} ${application.last_name}` : application.user_name || 'Unknown User'}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      }).then((result) => {
        if (result.isConfirmed) {
          this.deleteApplication(application.id);
        }
      });
    },
    async deleteApplication(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          await this.getApplications({
            search: this.searchQuery,
            status: this.statusFilter,
          });
          Swal.fire({
            title: 'Deleted!',
            text: 'Rental application has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.componentKey += 1;
        } else {
          throw new Error(response.data?.message || 'Failed to delete rental application.');
        }
      } catch (error: any) {
        console.error('deleteApplication error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to delete rental application.';
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
    },
    openView(application: RentalApplication) {
      this.selectedApplication = application;
      this.showView = true;
    },
    openEdit(application: RentalApplication) {
      this.selectedApplication = application;
      this.showEditForm = true;
    },
    handlePageChange(page: number) {
      if (page < 1 || page > this.pagination.last_page || this.loadingApplications) return;
      this.pagination.current_page = page;
      this.componentKey += 1;
    },
    handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      this.componentKey += 1;
    },
    handleSearch() {
      this.pagination.current_page = 1;
      this.getApplications({
        search: this.searchQuery,
        status: this.statusFilter,
      });
    },
    handleFilterChange() {
      this.pagination.current_page = 1;
      this.getApplications({
        search: this.searchQuery,
        status: this.statusFilter,
      });
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
.w-48 {
  width: 12rem;
}
.w-32 {
  width: 8rem;
}
</style>