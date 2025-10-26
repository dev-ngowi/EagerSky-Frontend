<template>
  <div class="bg-white shadow-md rounded-lg p-2 sm:p-4 lg:p-6">
    <!-- Loading State -->
    <template v-if="loadingApplications">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading applications...'" />
      </div>
    </template>
    <!-- Error State -->
    <template v-else-if="errorMessage">
      <div class="text-center py-4 sm:py-6 text-red-600 space-y-2">
        <p class="text-sm sm:text-base">{{ errorMessage }}</p>
        <button
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          @click="retryFetch"
        >
          <i class="va-icon mr-1">refresh</i>
          Retry
        </button>
      </div>
    </template>
    <!-- Main Content -->
    <template v-else>
      <!-- Header: Filters & Controls -->
      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
        <!-- Filters Section -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto flex-wrap">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by property or user name"
            class="w-full sm:w-64"
            :disabled="loadingApplications"
            @input="debouncedSearch"
          />
          <VaSelect
            v-model="statusFilter"
            :options="statusOptions"
            placeholder="Filter by status"
            class="w-full sm:w-48"
            clearable
            :disabled="loadingApplications"
            @update:modelValue="handleFilterChange"
          />
          <VaButton
            v-if="searchQuery || statusFilter"
            color="warning"
            size="small"
            class="w-full sm:w-auto justify-center"
            :disabled="loadingApplications"
            @click="clearFilters"
          >
            Clear Filters
          </VaButton>
        </div>
       
        <!-- Controls Section -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-full sm:w-32"
            :disabled="loadingApplications"
            @update:modelValue="handlePerPageChange"
          />
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
            :disabled="loadingApplications"
            @click="openForm(null, 'add')"
          >
            Add Application
          </VaButton>
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
            @click="cancelAdding"
          >
            Done Editing
          </VaButton>
        </div>
      </div>
      <!-- Data Table with Overlay Form -->
      <div class="relative">
        <!-- Overlay when form is open -->
        <div
          v-if="addEditForm"
          class="fixed inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center p-2 sm:p-4"
          @click="cancelAdding"
        >
          <!-- Form Overlay -->
          <div
            class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
            @click.stop
          >
            <!-- Close button in form overlay -->
            <div class="sticky top-0 z-20 bg-white border-b px-4 py-3 rounded-t-lg flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ formMode === 'add' ? 'Add Rental Application' : 'Edit Rental Application' }}
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
            <div class="p-4 sm:p-6">
              <RentalApplicationForm
                v-if="formMode === 'add'"
                @close="closeForm"
                @submit="handleAddSubmit"
              />
              <RentalApplicationEdit
                v-if="formMode === 'edit' && selectedApplication"
                :application="selectedApplication"
                @close="closeForm"
                @submit="handleEditSubmit"
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
            v-if="!applications || (applications.length === 0 && !loadingApplications)"
            class="text-center py-8 sm:py-12"
          >
            <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="va-icon text-3xl sm:text-4xl text-gray-400">assignment</i>
            </div>
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No applications found</h3>
            <p v-if="searchQuery || statusFilter" class="text-sm text-gray-500 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <p v-else class="text-sm text-gray-500 mb-6">
              Get started by adding your first rental application
            </p>
            <VaButton
              v-if="!searchQuery && !statusFilter && !addEditForm"
              color="#00A3E0"
              @click="openForm(null, 'add')"
            >
              <i class="va-icon mr-2">add</i>
              Add First Application
            </VaButton>
          </div>
          <!-- Data Table -->
          <div v-else-if="applications && applications.length > 0" class="overflow-hidden">
            <div class="overflow-x-auto border rounded-lg">
              <VaDataTable
                :key="componentKey"
                :items="applications"
                striped
                :columns="responsiveColumns"
                :loading="loadingApplications"
                :hoverable="!addEditForm"
                class="min-w-full"
              >
                <!-- Serial Number -->
                <template #cell(sn)="{ rowIndex }">
                  <div class="text-center sm:text-left px-2 py-1">
                    {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
                  </div>
                </template>
                <!-- Property -->
                <template #cell(property_title)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[120px] sm:max-w-[200px] md:max-w-none" :title="rowData.property_title">
                    <span class="font-medium">{{ rowData.property_title || 'No Property' }}</span>
                  </div>
                </template>
                <!-- User -->
                <template #cell(user_name)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[100px] sm:max-w-none" :title="getFullName(rowData)">
                    <span class="font-medium">{{ getFullName(rowData) }}</span>
                  </div>
                </template>
                <!-- NIDA Number -->
                <template #cell(nida_number)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[80px] sm:max-w-none">
                    {{ rowData.nida_number || 'N/A' }}
                  </div>
                </template>
                <!-- Employment Status -->
                <template #cell(employment_status)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[100px] sm:max-w-none" :title="rowData.employment_status">
                    {{ rowData.employment_status || 'N/A' }}
                  </div>
                </template>
                <!-- Annual Income -->
                <template #cell(annual_income)="{ rowData }">
                  <div class="px-2 py-1 text-right sm:text-left">
                    {{ formatCurrency(rowData.annual_income) }}
                  </div>
                </template>
                <!-- Status -->
                <template #cell(status)="{ rowData }">
                  <div class="px-2 py-1">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium inline-block min-w-[70px] text-center"
                      :class="{
                        'bg-yellow-100 text-yellow-800': rowData.status === 'pending',
                        'bg-green-100 text-green-800': rowData.status === 'approved',
                        'bg-red-100 text-red-800': rowData.status === 'rejected'
                      }"
                    >
                      {{ rowData.status }}
                    </span>
                  </div>
                </template>
                <!-- Created At -->
                <template #cell(created_at)="{ rowData }">
                  <div class="hidden sm:table-cell px-2 py-1">
                    <div class="font-medium">{{ formatDate(rowData.created_at, 'MMM d') }}</div>
                    <div class="text-xs text-gray-500">{{ formatDate(rowData.created_at, 'yyyy') }}</div>
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
                      :disabled="addEditForm || loadingApplications"
                      @click="openView(rowData)"
                    />
                    <VaButton
                      size="small"
                      color="warning"
                      icon="edit"
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm || loadingApplications"
                      @click="openForm(rowData, 'edit')"
                    />
                    <VaButton
                      size="small"
                      color="danger"
                      icon="delete"
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm || loadingApplications"
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
                <span class="font-medium">{{ pagination.total }}</span> applications
              </div>
             
              <!-- Pagination Controls -->
              <div class="flex flex-wrap justify-center sm:justify-end items-center gap-1 sm:gap-2">
                <VaButton
                  size="small"
                  :disabled="pagination.current_page === 1 || loadingApplications || addEditForm"
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
                    :color="typeof page === 'number' && pagination.current_page === page ? '#00A3E0' : 'secondary'"
                    :disabled="addEditForm || loadingApplications || typeof page !== 'number'"
                    class="px-2.5 py-1.5 min-w-[36px] h-9 text-sm"
                    @click="typeof page === 'number' && handlePageChange(page)"
                  >
                    {{ typeof page === 'number' ? page : '...' }}
                  </VaButton>
                </template>
               
                <VaButton
                  size="small"
                  :disabled="pagination.current_page >= pagination.last_page || loadingApplications || addEditForm"
                  class="px-3 py-1.5 min-w-[72px] h-9"
                  :color="pagination.current_page >= pagination.last_page || addEditForm ? 'gray' : 'default'"
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
      <!-- View Modal -->
      <VaModal
        v-model="showView"
        size="large"
        layout="centered"
        close-button
        hide-default-actions
        class="p-2 sm:p-4"
      >
        <div class="text-base sm:text-lg font-bold mb-4 text-gray-900">
          <i class="va-icon mr-2">visibility</i>
          Rental Application Details
        </div>
       
        <div v-if="selectedApplication" class="space-y-4 text-sm">
          <!-- Header Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <span class="font-medium text-gray-700">Property:</span>
              <span class="ml-2 font-semibold block sm:inline">{{ selectedApplication.property_title || 'None' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Status:</span>
              <span class="ml-2 px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-yellow-100 text-yellow-800': selectedApplication.status === 'pending',
                      'bg-green-100 text-green-800': selectedApplication.status === 'approved',
                      'bg-red-100 text-red-800': selectedApplication.status === 'rejected'
                    }">
                {{ selectedApplication.status }}
              </span>
            </div>
          </div>
          <!-- Main Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div>
                <label class="font-medium text-gray-700 block mb-1">Applicant</label>
                <div class="text-sm font-medium bg-gray-50 p-2 rounded">
                  {{ getFullName(selectedApplication) }}
                </div>
              </div>
              <div>
                <label class="font-medium text-gray-700 block mb-1">NIDA Number</label>
                <div class="text-sm bg-blue-50 p-2 rounded">
                  {{ selectedApplication.nida_number || 'None' }}
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <div>
                <label class="font-medium text-gray-700 block mb-1">Branch</label>
                <div class="text-sm bg-gray-50 p-2 rounded">
                  {{ selectedApplication.branch_name || 'None' }}
                </div>
              </div>
              <div>
                <label class="font-medium text-gray-700 block mb-1">Employment Status</label>
                <div class="text-sm bg-gray-50 p-2 rounded">
                  {{ selectedApplication.employment_status || 'None' }}
                </div>
              </div>
            </div>
          </div>
          <!-- Financial & Background -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label class="font-medium text-gray-700 block mb-1">Annual Income</label>
              <div class="text-sm bg-green-50 p-2 rounded">
                {{ formatCurrency(selectedApplication.annual_income) }}
              </div>
            </div>
            <div>
              <label class="font-medium text-gray-700 block mb-1">Background Check</label>
              <div class="text-sm bg-yellow-50 p-2 rounded">
                {{ selectedApplication.background_check_status || 'Pending' }}
              </div>
            </div>
            <div>
              <label class="font-medium text-gray-700 block mb-1">Credit Report</label>
              <div class="text-sm bg-yellow-50 p-2 rounded">
                {{ selectedApplication.credit_report_status || 'Pending' }}
              </div>
            </div>
          </div>
          <!-- Timestamps -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t text-xs text-gray-500">
            <div>
              <label class="font-medium block mb-1">Created</label>
              <div>{{ formatDate(selectedApplication.created_at, 'd MMM yyyy HH:mm') || 'None' }}</div>
            </div>
            <div>
              <label class="font-medium block mb-1">Updated</label>
              <div>{{ formatDate(selectedApplication.updated_at, 'd MMM yyyy HH:mm') || 'None' }}</div>
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
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format, parseISO, isValid } from 'date-fns';
import type { RentalApplication, Payload } from '../../../../types/rentalApplication';
import RentalApplicationForm from './RentalApplicationForm.vue';
import RentalApplicationEdit from './RentalApplicationEdit.vue';
import Loader from '../../../../components/Loader.vue';

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
    Loader,
  },
  setup() {
    const applications = ref<RentalApplication[]>([]);
    const loadingApplications = ref<boolean>(false);
    const errorMessage = ref<string | null>(null);
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const selectedApplication = ref<RentalApplication | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const componentKey = ref<number>(0);
    const searchQuery = ref<string>('');
    const statusFilter = ref<string>('');
    
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });

    const perPageOptions = ref<PerPageOption[]>([
      { value: 10, text: '10' },
      { value: 25, text: '25' },
      { value: 50, text: '50' },
    ]);

    const statusOptions = ref<StatusOption[]>([
      { value: 'pending', text: 'Pending' },
      { value: 'approved', text: 'Approved' },
      { value: 'rejected', text: 'Rejected' },
    ]);

    // Responsive Columns Configuration - Fixed align type
    const responsiveColumns = computed(() => [
      {
        key: 'sn',
        sortable: false,
        label: 'SN',
        width: '60px'
      },
      {
        key: 'property_title',
        sortable: true,
        label: 'Property',
        width: '200px'
      },
      {
        key: 'user_name',
        sortable: true,
        label: 'User',
        width: '150px'
      },
      {
        key: 'nida_number',
        sortable: true,
        label: 'NIDA',
        width: '100px'
      },
      {
        key: 'employment_status',
        sortable: true,
        label: 'Employment',
        width: '120px'
      },
      {
        key: 'annual_income',
        sortable: true,
        label: 'Income',
        width: '100px',
        align: 'right' as const // Fixed: explicitly typed as const
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
        width: '120px'
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        width: '140px',
        align: 'center' as const // Fixed: explicitly typed as const
      },
    ]);

    const paginationPages = computed<(number | string)[]>(() => {
      const pages: (number | string)[] = [];
      const lastPage = pagination.value.last_page;
      const current = pagination.value.current_page;
      const range = 2;

      pages.push(1);

      if (current - range > 2) {
        pages.push('...');
      }

      const start = Math.max(2, current - range);
      const end = Math.min(lastPage - 1, current + range);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current + range < lastPage - 1) {
        pages.push('...');
      }

      if (lastPage > 1) {
        pages.push(lastPage);
      }

      return pages;
    });

    const computedPagination = computed<Pagination>(() => {
      const total = pagination.value.total;
      const perPage = pagination.value.per_page;
      const currentPage = pagination.value.current_page;

      return {
        total,
        per_page: perPage,
        current_page: currentPage,
        last_page: Math.ceil(total / perPage) || 1,
        from: total > 0 ? (currentPage - 1) * perPage + 1 : 0,
        to: Math.min(currentPage * perPage, total),
      };
    });

    const formatDate = (date: Date | string | null, formatString: string): string => {
      if (!date) return 'None';
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      return isValid(parsedDate) ? format(parsedDate, formatString) : 'None';
    };

    const formatCurrency = (value: any): string => {
      if (value === null || !value) return 'N/A';
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? 'N/A' : `$${num.toLocaleString()}`;
    };

    const getFullName = (app: RentalApplication): string => {
      return app.first_name && app.last_name
        ? `${app.first_name} ${app.last_name}`
        : app.user_name || 'Unknown User';
    };

    return {
      applications,
      loadingApplications,
      errorMessage,
      addEditForm,
      showView,
      selectedApplication,
      formMode,
      componentKey,
      searchQuery,
      statusFilter,
      perPageOptions,
      statusOptions,
      responsiveColumns,
      pagination: computedPagination,
      paginationPages,
      formatDate,
      formatCurrency,
      getFullName,
    };
  },
  data() {
    return {
      debouncedSearch: null as unknown as () => void,
    };
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.retryFetch();
  },
  methods: {
    openForm(application: RentalApplication | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !application) {
        Swal.fire({
          title: 'Error!',
          text: 'No application selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      this.selectedApplication = application;
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedApplication = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.getApplications({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: this.statusFilter,
      });
    },

    cancelAdding() {
      this.closeForm();
    },

    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            this.errorMessage = 'Failed to load applications. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },

    async retryFetch() {
      this.errorMessage = null;
      await this.getApplications({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: this.statusFilter,
      });
    },

    async getApplications(params: GetApplicationsParams = {}) {
      if (this.addEditForm) return;
     
      this.loadingApplications = true;
      try {
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
            method: 'get',
            requiresAuth: true,
            params: {
              page: params.page || this.pagination.current_page || 1,
              per_page: params.per_page || this.pagination.per_page || 10,
              search: params.search || '',
              status: params.status || '',
            },
          })
        );
       
        if (response && response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          this.applications = response.data.data
            .filter((application: any) => application && application.id)
            .map((application: any): RentalApplication => {
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
                student_registration_number: application.student_registration_number || null, // Fixed: Added missing property
                employment_status: application.employment_status || 'None',
                annual_income: application.annual_income ? Number(application.annual_income) : null,
                background_check_status: application.background_check_status || 'None',
                credit_report_status: application.credit_report_status || 'None',
                status,
                created_at: application.created_at,
                updated_at: application.updated_at,
              };
            });

          this.pagination = {
            total: response.data.pagination?.total_items || response.data.data.length || 0,
            per_page: Number(response.data.pagination?.items_per_page) || params.per_page || 10,
            current_page: Number(response.data.pagination?.current_page) || params.page || 1,
            last_page: Math.ceil((response.data.pagination?.total_items || response.data.data.length || 0) / (response.data.pagination?.items_per_page || params.per_page || 10)) || 1,
            from: (response.data.pagination?.total_items || response.data.data.length || 0) > 0 ? ((response.data.pagination?.current_page || params.page || 1) - 1) * (response.data.pagination?.items_per_page || params.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination?.current_page || params.page || 1) * (response.data.pagination?.items_per_page || params.per_page || 10), response.data.pagination?.total_items || response.data.data.length || 0),
          };

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
          throw new Error(response?.data?.message || 'Failed to fetch rental applications.');
        }
      } catch (error: any) {
        console.error('getApplications error:', error.message, error.response?.data);
        let errorMsg = error.response?.data?.message || 'Failed to fetch rental applications.';
       
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
       
        this.errorMessage = errorMsg;
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
        this.loadingApplications = false;
        this.componentKey += 1;
      }
    },

    async handleAddSubmit(payload: Payload) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
          method: 'post',
          requiresAuth: true,
          data: payload,
        });

        if (response.status === 201) {
          Swal.fire({
            title: 'Created!',
            text: 'Rental application has been created successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.closeForm();
        } else {
          throw new Error(response.data?.message || 'Failed to add rental application.');
        }
      } catch (error: any) {
        console.error('addApplication error:', error.response?.data || error);
        let errorMessage = error.response?.data?.message || 'Failed to add rental application.';
        
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).flat().join('; ');
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
    },

    async handleEditSubmit(payload: Payload & { id: number }) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${payload.id}`,
          method: 'put',
          requiresAuth: true,
          data: payload,
        });

        if (response.status === 200) {
          Swal.fire({
            title: 'Updated!',
            text: 'Rental application has been updated successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.closeForm();
        } else {
          throw new Error(response.data?.message || 'Failed to update rental application.');
        }
      } catch (error: any) {
        console.error('updateApplication error:', error.response?.data || error);
        let errorMessage = error.response?.data?.message || 'Failed to update rental application.';
        
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).flat().join('; ');
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
    },

    async deleteApplication(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${id}`,
          method: 'delete',
          requiresAuth: true,
        });

        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Rental application has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });

          await this.getApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
            status: this.statusFilter,
          });
          this.componentKey += 1;
        } else {
          throw new Error(response.data?.message || 'Failed to delete rental application.');
        }
      } catch (error: any) {
        console.error('deleteApplication error:', error.response?.data || error);
        let errorMessage = error.response?.data?.message || 'Failed to delete rental application.';
        
        if (error.response?.status === 401) {
          errorMessage = 'Your session has expired or the token is invalid. Please log in again.';
          Swal.fire({
            title: 'Authentication Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Go to Login',
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

    closeView() {
      this.selectedApplication = null;
      this.showView = false;
    },

    confirmDelete(application: RentalApplication) {
      Swal.fire({
        title: 'Delete Application?',
        html: `
          <div class="text-sm">
            <p>Are you sure you want to delete the application for</p>
            <p class="font-medium text-blue-600 mt-1">"${application.property_title}"</p>
            <p class="text-gray-600 mt-2">by <span class="font-medium">${this.getFullName(application)}</span>?</p>
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
          confirmButton: 'px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700',
          cancelButton: 'px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ml-3'
        },
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.deleteApplication(application.id);
        }
      });
    },

    handlePageChange(page: number) {
      if (page < 1 || page > this.pagination.last_page || this.loadingApplications || this.addEditForm) {
        return;
      }
      this.pagination.current_page = page;
      this.getApplications({
        page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: this.statusFilter,
      });
      this.componentKey += 1;
    },

    handlePerPageChange(perPage: number) {
      if (this.loadingApplications || this.addEditForm) return;
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      this.getApplications({
        page: 1,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: this.statusFilter,
      });
      this.componentKey += 1;
    },

    handleSearch() {
      if (this.addEditForm) return;
      this.pagination.current_page = 1;
      this.getApplications({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: this.statusFilter,
      });
    },

    handleFilterChange() {
      if (this.addEditForm) return;
      this.pagination.current_page = 1;
      this.getApplications({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: this.statusFilter,
      });
    },

    clearFilters() {
      this.searchQuery = '';
      this.statusFilter = '';
      this.pagination.current_page = 1;
      this.getApplications({
        page: 1,
        per_page: this.pagination.per_page,
        search: '',
        status: '',
      });
    },
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

:deep(.va-data-table__table-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
 
  @media (max-width: 639px) {
    border-radius: 0.5rem;
    margin: 0 -0.5rem;
  }
}

:deep(.va-button--small) {
  min-height: 36px !important;
 
  @media (min-width: 640px) {
    min-height: 32px !important;
  }
}

:deep(.va-data-table) {
  @media (max-width: 639px) {
    .va-data-table__thead th {
      white-space: nowrap;
      font-size: 0.75rem;
      padding: 0.5rem 0.25rem;
    }
   
    .va-data-table__tbody td {
      padding: 0.75rem 0.25rem;
      vertical-align: middle;
    }
  }
}

.form-overlay-enter-active,
.form-overlay-leave-active {
  transition: all 0.3s ease;
}

.form-overlay-enter-from,
.form-overlay-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-20px);
}

.form-overlay-enter-to,
.form-overlay-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>