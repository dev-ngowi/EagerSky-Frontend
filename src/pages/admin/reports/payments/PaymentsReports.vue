<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Payment Report</h2>
    <div class="filter-container mb-4">
      <div class="filter-list">
        <div class="filter-row">
          <div class="filter-item">
            <VaInput
              v-model="filters.start_date"
              type="date"
              label="Start Date"
              class="w-full"
              :disabled="loadingPayments || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaInput
              v-model="filters.end_date"
              type="date"
              label="End Date"
              class="w-full"
              :disabled="loadingPayments || loadingOptions"
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
              :disabled="loadingPayments || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaSelect
              v-model="filters.property_id"
              :options="propertyOptions"
              label="Property"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingPayments || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <VaSelect
              v-model="filters.room_id"
              :options="roomOptions"
              label="Room"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingPayments || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
         <div class="filter-item">
            <VaSelect
              v-model="filters.payment_method_id"
              :options="paymentMethodOptions"
              label="Payment Method"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingPayments || loadingOptions"
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
    </div>
    <div class="header-row mb-4">
      <div class="search-container flex-1 max-w-[400px]">
        <VaInput
          v-model="filters.search"
          type="text"
          label="Search"
          placeholder="Search payments..."
          class="w-full"
          :disabled="loadingPayments || loadingOptions"
          @update:modelValue="handleFilterChange"
        />
      </div>
      <div class="action-container">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-full max-w-[150px] mr-2"
          @update:modelValue="handlePerPageChange"
        />
        <VaButton
          color="#00A3E0"
          size="small"
          :disabled="loadingPayments || !payments.length || loadingPdf"
          :loading="loadingPdf"
          @click="generateReport"
        >
          Generate PDF
        </VaButton>
      </div>
    </div>
    <div v-if="loadingPayments || loadingOptions" class="text-center py-4">
      Loading data...
    </div>
    <div v-else-if="!payments.length" class="text-center py-4">
      No payments found for the selected filters or search.
    </div>
    <VaDataTable
      v-else
      :key="componentKey"
      :items="payments"
      striped
      :columns="columns"
      :loading="loadingPayments"
      class="table-responsive"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(date)="{ rowData }">
        {{ parseDate(rowData.date, 'Date') }}
      </template>
      <template #cell(user_name)="{ rowData }">
        <span class="truncate">{{ rowData.user_name || 'N/A' }}</span>
      </template>
      <template #cell(property_title)="{ rowData }">
        <span class="truncate">{{ rowData.property_title || 'N/A' }}</span>
      </template>
      <template #cell(room_number)="{ rowData }">
        <span class="truncate">{{ rowData.room_number || 'N/A' }}</span>
      </template>
      <template #cell(amount)="{ rowData }">
        <span class="truncate">{{ rowData.formatted_amount || rowData.amount || 'N/A' }}</span>
      </template>
    </VaDataTable>
    <div v-if="payments.length" class="flex justify-between items-center mt-4">
      <div>
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} payments
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
      <p><strong>Total Payments:</strong> {{ reportSummary.total_payments }}</p>
      <p><strong>Date Range:</strong> {{ reportSummary.date_range }}</p>
      <p><strong>Status:</strong> {{ reportSummary.status }}</p>
      <p><strong>Property:</strong> {{ reportSummary.property_title }}</p>
      <p><strong>Room:</strong> {{ reportSummary.room_number }}</p>
      <p><strong>Payment Method:</strong> {{ reportSummary.payment_method }}</p>
      <p><strong>Total Amount:</strong> {{ reportSummary.formatted_total_amount }} TZS</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface Payment {
  payment_id: number;
  date: string;
  status: string;
  user_name: string;
  property_title: string;
  room_number: string;
  payment_method: string;
  amount: number;
  currency: string;
  formatted_amount: string;
}

interface ReportSummary {
  total_payments: number;
  date_range: string;
  status: string;
  property_title: string;
  room_number: string;
  payment_method: string;
  total_amount: number;
  formatted_total_amount: string;
}

interface Filters {
  start_date: string;
  end_date: string;
  status: string;
  search: string;
  property_id: string;
  room_id: string;
  payment_method_id: string;
}

interface Option {
  value: string;
  text: string;
}

export default defineComponent({
  name: 'PaymentReport',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN', width: '80px' },
        { key: 'date', sortable: true, label: 'Date', width: '140px' },
        { key: 'status', sortable: true, label: 'Status', width: '120px' },
        { key: 'user_name', sortable: true, label: 'Tenant', width: '200px' },
        { key: 'property_title', sortable: true, label: 'Property', width: '200px' },
        { key: 'room_number', sortable: true, label: 'Room', width: '120px' },
        { key: 'payment_method', sortable: true, label: 'Payment Method', width: '140px' },
        { key: 'amount', sortable: true, label: 'Amount', width: '140px' },
      ],
      payments: [] as Payment[],
      reportSummary: null as ReportSummary | null,
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingPayments: false,
      loadingPdf: false,
      loadingOptions: false,
      componentKey: 0,
      filters: reactive<Filters>({
        start_date: '',
        end_date: '',
        status: '',
        search: '',
        property_id: '',
        room_id: '',
        payment_method_id: '',
      }),
      statusOptions: [
        { value: '', text: 'All Statuses' },
        { value: 'pending', text: 'Pending' },
        { value: 'received', text: 'Received' },
        { value: 'completed', text: 'Completed' },
        { value: 'failed', text: 'Failed' },
      ],
      propertyOptions: [{ value: '', text: 'All Properties' }] as Option[],
      roomOptions: [{ value: '', text: 'All Rooms' }] as Option[],
      paymentMethodOptions: [{ value: '', text: 'All Methods' }] as Option[],
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      debouncedFetch: debounce(
        function (this: any) {
          this.fetchPayments();
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
        !!this.filters.search ||
        !!this.filters.property_id ||
        !!this.filters.room_id ||
        !!this.filters.payment_method_id
      );
    },
  },
  async mounted() {
    await Promise.all([
      this.fetchPropertyOptions(),
      this.fetchRoomOptions(),
      this.fetchPaymentMethodOptions(),
    ]);
    await this.fetchPaymentsWithRetry();
  },
  methods: {
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
    async fetchRoomOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.roomOptions = [
            { value: '', text: 'All Rooms' },
            ...response.data.data.map((r: any) => ({
              value: r.id.toString(),
              text: r.room_number || 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch rooms.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchRoomOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
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
        this.loadingOptions = false;
      }
    },
    async fetchPaymentMethodOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.paymentMethodOptions = [
            { value: '', text: 'All Methods' },
            ...response.data.data.map((m: any) => ({
              value: m.id.toString(),
              text: m.method_name || 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch payment methods.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchPaymentMethodOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch payment methods.',
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
    async fetchPayments(params: { page?: number; per_page?: number } = {}) {
      this.loadingPayments = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.status) requestParams.status = this.filters.status;
        if (this.filters.search) requestParams.search = this.filters.search;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.room_id) requestParams.room_id = this.filters.room_id;
        if (this.filters.payment_method_id) requestParams.payment_method_id = this.filters.payment_method_id;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/payments/preview`,
          method: 'get',
          headers: { Accept: 'application/json' },
          params: requestParams,
        });

        if (response.status === 200) {
          this.payments = response.data.data.payments || [];
          this.pagination = response.data.data.pagination || this.pagination;
          this.reportSummary = response.data.data.report_summary || null;
          if (!this.payments.length) {
            Swal.fire({
              title: 'Info',
              text: 'No payments found for the selected filters or search.',
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
            text: response.data?.message || 'Failed to fetch payments.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchPayments error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch payments.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.payments = [];
        this.reportSummary = null;
      } finally {
        this.loadingPayments = false;
      }
    },
    async fetchPaymentsWithRetry(retries = 3, delay = 1000) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await this.fetchPayments();
          return;
        } catch (error) {
          if (attempt === retries) {
            console.error(`fetchPayments failed after ${retries} attempts`);
            return;
          }
          console.warn(`fetchPayments attempt ${attempt} failed, retrying in ${delay}ms...`);
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
      this.pagination.current_page = 1;
      await this.fetchPayments();
      this.componentKey += 1;
    },
    async clearFilters() {
      this.filters.start_date = '';
      this.filters.end_date = '';
      this.filters.status = '';
      this.filters.search = '';
      this.filters.property_id = '';
      this.filters.room_id = '';
      this.filters.payment_method_id = '';
      this.pagination.current_page = 1;
      await this.fetchPayments();
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      this.pagination.current_page = page;
      await this.fetchPayments();
      this.componentKey += 1;
    },
    async generateReport() {
      this.loadingPdf = true;
      try {
        const requestParams: any = {};
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.status) requestParams.status = this.filters.status;
        if (this.filters.search) requestParams.search = this.filters.search;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.room_id) requestParams.room_id = this.filters.room_id;
        if (this.filters.payment_method_id) requestParams.payment_method_id = this.filters.payment_method_id;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/payments/generate`,
          method: 'get',
          headers: { Accept: 'application/pdf' },
          params: requestParams,
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payment-report-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Success!',
          text: 'Payment report PDF generated successfully.',
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
          text: error.response?.data?.message || 'Failed to generate payment report PDF.',
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

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.search-container {
  flex: 1;
  max-width: 400px;
}

.action-container {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
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

  .header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: 100%;
    margin-bottom: 0.5rem;
  }

  .action-container {
    justify-content: flex-start;
  }
}

@media screen and (max-width: 480px) {
  .card {
    padding: 0.75rem;
  }

  .filter-item {
    min-width: 100%;
  }
}
</style>