<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Rental Application Report</h2>
    <div class="filter-container mb-4">
      <div class="filter-list">
        <div class="filter-row">
          <div class="filter-item">
            <VaInput
              v-model="filters.start_date"
              type="date"
              label="Start Date"
              class="w-full"
              :disabled="loadingRentals || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaInput
              v-model="filters.end_date"
              type="date"
              label="End Date"
              class="w-full"
              :disabled="loadingRentals || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <VaSelect
              v-model="filters.status"
              :options="statusOptions"
              label="Status"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingRentals || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaSelect
              v-model="filters.user_id"
              :options="userOptions"
              label="Applicant"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingRentals || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <VaSelect
              v-model="filters.property_id"
              :options="propertyOptions"
              label="Property"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingRentals || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaSelect
              v-model="filters.branch_id"
              :options="branchOptions"
              label="Branch"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingRentals || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row" v-if="hasFilters">
          <div class="filter-item">
            <VaButton color="warning" size="small" @click="clearFilters">Clear</VaButton>
          </div>
        </div>
      </div>
      <div class="action-container">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-full max-w-[150px]"
          @update:modelValue="handlePerPageChange"
        />
        <VaButton
          color="#00A3E0"
          size="small"
          :disabled="loadingRentals || !rentals.length || loadingPdf"
          :loading="loadingPdf"
          @click="generateReport"
        >
          Generate PDF
        </VaButton>
      </div>
    </div>
    <div v-if="loadingRentals || loadingOptions" class="text-center py-4">
      Loading data...
    </div>
    <div v-else-if="!rentals.length" class="text-center py-4">
      No rental applications found for the selected filters.
    </div>
    <VaDataTable
      v-else
      :key="componentKey"
      :items="rentals"
      striped
      :columns="columns"
      :loading="loadingRentals"
      class="table-responsive"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(created_at)="{ rowData }">
        {{ parseDate(rowData.created_at, 'Created Date') }}
      </template>
      <template #cell(annual_income)="{ rowData }">
        {{ rowData.formatted_annual_income || rowData.annual_income || 'N/A' }}
      </template>
      <template #cell(user_fullname)="{ rowData }">
        <span class="truncate">{{ rowData.user_fullname || 'N/A' }}</span>
      </template>
      <template #cell(property_title)="{ rowData }">
        <span class="truncate">{{ rowData.property_title || 'N/A' }}</span>
      </template>
      <template #cell(branch_name)="{ rowData }">
        <span class="truncate">{{ rowData.branch_name || 'N/A' }}</span>
      </template>
    </VaDataTable>
    <div v-if="rentals.length" class="flex justify-between items-center mt-4">
      <div>
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} applications
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
    <div v-if="reportSummary" class="mt-4 p-4 border rounded bg-gray-50">
      <h3 class="text-lg font-bold mb-2">Report Summary</h3>
      <p><strong>Total Applications:</strong> {{ reportSummary.total_applications }}</p>
      <p><strong>Date Range:</strong> {{ reportSummary.date_range }}</p>
      <p><strong>Status:</strong> {{ reportSummary.status }}</p>
      <p><strong>Applicant:</strong> {{ reportSummary.user_name }}</p>
      <p><strong>Property:</strong> {{ reportSummary.property_title }}</p>
      <p><strong>Branch:</strong> {{ reportSummary.branch_name }}</p>
      <p><strong>Total Annual Income:</strong> {{ reportSummary.formatted_total_annual_income }} TZS</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface RentalApplication {
  id: number;
  created_at: string;
  status: string;
  user_fullname: string;
  property_title: string;
  branch_name: string;
  annual_income: number;
  formatted_annual_income: string;
}

interface ReportSummary {
  total_applications: number;
  date_range: string;
  status: string;
  user_name: string;
  property_title: string;
  branch_name: string;
  total_annual_income: number;
  formatted_total_annual_income: string;
}

interface Filters {
  start_date: string;
  end_date: string;
  status: string;
  user_id: string;
  property_id: string;
  branch_id: string;
}

interface Option {
  value: string;
  text: string;
}

export default defineComponent({
  name: 'RentalApplicationReport',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN', width: '60px' },
        { key: 'created_at', sortable: true, label: 'Created Date', width: '150px' },
        { key: 'status', sortable: true, label: 'Status', width: '120px' },
        { key: 'user_fullname', sortable: true, label: 'Applicant', width: '180px' },
        { key: 'property_title', sortable: true, label: 'Property', width: '180px' },
        { key: 'branch_name', sortable: true, label: 'Branch', width: '150px' },
        { key: 'annual_income', sortable: true, label: 'Annual Income (TZS)', width: '150px' },
      ],
      rentals: [] as RentalApplication[],
      reportSummary: null as ReportSummary | null,
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingRentals: false,
      loadingPdf: false,
      loadingOptions: false,
      componentKey: 0,
      filters: reactive<Filters>({
        start_date: '',
        end_date: '',
        status: '',
        user_id: '',
        property_id: '',
        branch_id: '',
      }),
      statusOptions: [
        { value: '', text: 'All Statuses' },
        { value: 'pending', text: 'Pending' },
        { value: 'approved', text: 'Approved' },
        { value: 'rejected', text: 'Rejected' },
      ],
      userOptions: [{ value: '', text: 'All Applicants' }] as Option[],
      propertyOptions: [{ value: '', text: 'All Properties' }] as Option[],
      branchOptions: [{ value: '', text: 'All Branches' }] as Option[],
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      debouncedFetch: debounce(
        function (this: any) {
          this.fetchRentals();
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
    hasFilters() {
      return (
        !!this.filters.start_date ||
        !!this.filters.end_date ||
        !!this.filters.status ||
        !!this.filters.user_id ||
        !!this.filters.property_id ||
        !!this.filters.branch_id
      );
    },
  },
  async mounted() {
    await Promise.all([
      this.fetchUserOptions(),
      this.fetchPropertyOptions(),
      this.fetchBranchOptions(),
    ]);
    await this.fetchRentalsWithRetry();
  },
  methods: {
    async fetchUserOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.userOptions = [
            { value: '', text: 'All Applicants' },
            ...response.data.data.map((u: any) => ({
              value: u.id.toString(),
              text: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}`.trim() : 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch users.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchUserOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch users.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingOptions = false;
      }
    },
    async fetchPropertyOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.propertyOptions = [
            { value: '', text: 'All Properties' },
            ...response.data.data.map((p: any) => ({
              value: p.id.toString(),
              text: p.title || 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch properties.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchPropertyOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingOptions = false;
      }
    },
    async fetchBranchOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.branchOptions = [
            { value: '', text: 'All Branches' },
            ...response.data.data.map((b: any) => ({
              value: b.id.toString(),
              text: b.name || 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch branches.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchBranchOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch branches.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingOptions = false;
      }
    },
    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) {
        console.warn(`${context}: Date string is null or undefined`);
        return 'N/A';
      }
      try {
        let parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        parsed = new Date(dateStr);
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        console.warn(`${context}: Invalid date format for "${dateStr}"`);
        return 'N/A';
      } catch (error) {
        console.error(`${context}: Error parsing date "${dateStr}"`, error);
        return 'N/A';
      }
    },
    async fetchRentals(params: { page?: number; per_page?: number } = {}) {
      this.loadingRentals = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.status) requestParams.status = this.filters.status;
        if (this.filters.user_id) requestParams.user_id = this.filters.user_id;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.branch_id) requestParams.branch_id = this.filters.branch_id;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/rentals/preview`,
          method: 'get',
          headers: { Accept: 'application/json' },
          params: requestParams,
        });

        if (response.status === 200) {
          this.rentals = (response.data.data?.applications || []).map((app: any) => ({
            id: app.id || 0,
            created_at: app.created_at || null,
            status: app.status || 'N/A',
            user_fullname: app.user_fullname || 'N/A',
            property_title: app.property_title || 'N/A',
            branch_name: app.branch_name || 'N/A',
            annual_income: app.annual_income ? parseFloat(app.annual_income) : 0,
            formatted_annual_income: app.formatted_annual_income || 'N/A',
          }));
          this.reportSummary = response.data.data?.report_summary || {
            total_applications: 0,
            date_range: 'N/A',
            status: 'N/A',
            user_name: 'N/A',
            property_title: 'N/A',
            branch_name: 'N/A',
            total_annual_income: 0,
            formatted_total_annual_income: 'N/A',
          };
          this.pagination = {
            total: response.data.data?.pagination?.total || response.data.data?.applications?.length || 0,
            per_page: response.data.data?.pagination?.per_page || params.per_page || this.pagination.per_page,
            current_page: response.data.data?.pagination?.current_page || params.page || this.pagination.current_page,
            last_page: response.data.data?.pagination?.last_page || Math.ceil((response.data.data?.pagination?.total || response.data.data?.applications?.length || 0) / this.pagination.per_page),
            from: response.data.data?.pagination?.from || (response.data.data?.applications?.length > 0 ? (this.pagination.current_page - 1) * this.pagination.per_page + 1 : 0),
            to: response.data.data?.pagination?.to || Math.min(this.pagination.current_page * this.pagination.per_page, response.data.data?.pagination?.total || response.data.data?.applications?.length || 0),
          };
          if (!this.rentals.length) {
            Swal.fire({
              title: 'Info',
              text: 'No rental applications found for the selected filters.',
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
        console.error('fetchRentals error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch rental applications.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.rentals = [];
        this.reportSummary = null;
      } finally {
        this.loadingRentals = false;
      }
    },
    async fetchRentalsWithRetry(retries = 3, delay = 1000) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await this.fetchRentals();
          return;
        } catch (error) {
          if (attempt === retries) {
            console.error(`fetchRentals failed after ${retries} attempts`);
            return;
          }
          console.warn(`fetchRentals attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    },
    async handleFilterChange() {
      this.pagination.current_page = 1;
      this.debouncedFetch();
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage;
      await this.fetchRentals({ page: 1, per_page: perPage });
      this.componentKey += 1;
    },
    async clearFilters() {
      this.filters.start_date = '';
      this.filters.end_date = '';
      this.filters.status = '';
      this.filters.user_id = '';
      this.filters.property_id = '';
      this.filters.branch_id = '';
      await this.fetchRentals({ page: 1 });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      await this.fetchRentals({ page, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async generateReport() {
      this.loadingPdf = true;
      try {
        const requestParams: any = {};
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.status) requestParams.status = this.filters.status;
        if (this.filters.user_id) requestParams.user_id = this.filters.user_id;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.branch_id) requestParams.branch_id = this.filters.branch_id;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/rentals/generate`,
          method: 'get',
          headers: { Accept: 'application/pdf' },
          params: requestParams,
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `rental-report-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Success!',
          text: 'Rental application report PDF generated successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } catch (error: any) {
        console.error('generateReport error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to generate rental application report PDF.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingPdf = false;
      }
    },
  },
});
</script>

<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.filter-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-item {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.action-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

.table-responsive {
  overflow-x: auto;
}

.table-responsive :deep(.va-data-table__table) {
  width: 100%;
  table-layout: auto;
}

.table-responsive :deep(.va-data-table__table-td) {
  padding: 12px 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-responsive :deep(.va-data-table__table-th) {
  padding: 12px 16px;
  white-space: nowrap;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
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

.border {
  border: 1px solid #e5e7eb;
}

.rounded {
  border-radius: 0.5rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

@media screen and (max-width: 768px) {
  .card {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-item {
    max-width: 100%;
  }
}

@media screen and (max-width: 480px) {
  .card {
    padding: 0.75rem;
  }

  .filter-item {
    min-width: 100%;
  }

  .action-container {
    justify-content: flex-start;
  }
}
</style>