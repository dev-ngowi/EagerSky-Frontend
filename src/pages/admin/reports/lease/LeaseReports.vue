<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Lease Report</h2>
    <div class="filter-container mb-4">
      <div class="filter-list">
        <div class="filter-row">
          <div class="filter-item">
            <VaInput
              v-model="filters.start_date"
              type="date"
              label="Start Date"
              class="w-full"
              :disabled="loadingLeases || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaInput
              v-model="filters.end_date"
              type="date"
              label="End Date"
              class="w-full"
              :disabled="loadingLeases || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <VaSelect
              v-model="filters.is_signed"
              :options="signedOptions"
              label="Signed Status"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingLeases || loadingOptions"
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
              :disabled="loadingLeases || loadingOptions"
              @update:modelValue="handlePropertyChange"
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
              :disabled="loadingLeases || loadingOptions || !filters.property_id"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaSelect
              v-model="filters.payment_frequency"
              :options="paymentFrequencyOptions"
              label="Payment Frequency"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingLeases || loadingOptions"
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
          :disabled="loadingLeases || !leases.length || loadingPdf"
          :loading="loadingPdf"
          @click="generateReport"
        >
          Generate PDF
        </VaButton>
      </div>
    </div>
    <div v-if="loadingLeases || loadingOptions" class="text-center py-4">
      Loading data...
    </div>
    <div v-else-if="!leases.length" class="text-center py-4">
      No leases found for the selected filters.
    </div>
    <VaDataTable
      v-else
      :key="componentKey"
      :items="leases"
      striped
      :columns="columns"
      :loading="loadingLeases"
      class="table-responsive"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(start_date)="{ rowData }">
        {{ parseDate(rowData.start_date, 'Start Date') }}
      </template>
      <template #cell(end_date)="{ rowData }">
        {{ parseDate(rowData.end_date, 'End Date') }}
      </template>
      <template #cell(is_signed)="{ rowData }">
        {{ rowData.is_signed ? 'Signed' : 'Unsigned' }}
      </template>
      <template #cell(user_fullname)="{ rowData }">
        <span class="truncate">{{ rowData.user_fullname || 'N/A' }}</span>
      </template>
      <template #cell(property_title)="{ rowData }">
        <span class="truncate">{{ rowData.property_title || 'N/A' }}</span>
      </template>
      <template #cell(room_number)="{ rowData }">
        <span class="truncate">{{ rowData.room_number || 'N/A' }}</span>
      </template>
      <template #cell(rent_amount)="{ rowData }">
        {{ rowData.formatted_rent_amount || rowData.rent_amount || 'N/A' }}
      </template>
    </VaDataTable>
    <div v-if="leases.length" class="flex justify-between items-center mt-4">
      <div>
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} leases
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
      <p><strong>Total Leases:</strong> {{ reportSummary.total_leases }}</p>
      <p><strong>Date Range:</strong> {{ reportSummary.date_range }}</p>
      <p><strong>Signed Status:</strong> {{ reportSummary.signed_status }}</p>
      <p><strong>Tenant:</strong> {{ reportSummary.user_name }}</p>
      <p><strong>Property:</strong> {{ reportSummary.property_title }}</p>
      <p><strong>Room:</strong> {{ reportSummary.room_number }}</p>
      <p><strong>Payment Frequency:</strong> {{ reportSummary.payment_frequency }}</p>
      <p><strong>Total Rent Amount:</strong> {{ reportSummary.formatted_total_rent_amount }} TZS</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface Lease {
  id: number;
  start_date: string;
  end_date: string;
  is_signed: boolean;
  user_fullname: string;
  property_title: string;
  room_number: string;
  payment_frequency: string;
  rent_amount: number;
  formatted_rent_amount: string;
}

interface ReportSummary {
  total_leases: number;
  date_range: string;
  signed_status: string;
  user_name: string;
  property_title: string;
  room_number: string;
  payment_frequency: string;
  total_rent_amount: number;
  formatted_total_rent_amount: string;
}

interface Filters {
  start_date: string;
  end_date: string;
  is_signed: string;
  property_id: string;
  room_id: string;
  payment_frequency: string;
}

interface Option {
  value: string;
  text: string;
}

export default defineComponent({
  name: 'LeaseReport',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN', width: '80px' },
        { key: 'start_date', sortable: true, label: 'Start Date', width: '140px' },
        { key: 'end_date', sortable: true, label: 'End Date', width: '140px' },
        { key: 'is_signed', sortable: true, label: 'Signed Status', width: '120px'},
        { key: 'user_fullname', sortable: true, label: 'Tenant', width: '200px' },
        { key: 'property_title', sortable: true, label: 'Property', width: '200px' },
        { key: 'room_number', sortable: true, label: 'Room', width: '120px' },
        { key: 'payment_frequency', sortable: true, label: 'Payment Frequency', width: '160px' },
        { key: 'rent_amount', sortable: true, label: 'Rent Amount (TZS)', width: '140px' },
      ],
      leases: [] as Lease[],
      reportSummary: null as ReportSummary | null,
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingLeases: false,
      loadingPdf: false,
      loadingOptions: false,
      componentKey: 0,
      filters: reactive<Filters>({
        start_date: '',
        end_date: '',
        is_signed: '',
        property_id: '',
        room_id: '',
        payment_frequency: '',
      }),
      signedOptions: [
        { value: '', text: 'All Statuses' },
        { value: 'true', text: 'Signed' },
        { value: 'false', text: 'Unsigned' },
      ],
      propertyOptions: [{ value: '', text: 'All Properties' }] as Option[],
      roomOptions: [{ value: '', text: 'All Rooms' }] as Option[],
      paymentFrequencyOptions: [
        { value: '', text: 'All Frequencies' },
        { value: 'monthly', text: 'Monthly' },
        { value: 'quarterly', text: 'Quarterly' },
        { value: 'semi-annually', text: 'Semi-Annually' },
        { value: 'annually', text: 'Annually' },
      ],
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      debouncedFetch: debounce(
        function (this: any) {
          this.fetchLeases();
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
        !!this.filters.is_signed ||
        !!this.filters.property_id ||
        !!this.filters.room_id ||
        !!this.filters.payment_frequency
      );
    },
  },
  async mounted() {
    await Promise.all([
      this.fetchPropertyOptions(),
      this.fetchRoomOptions(),
    ]);
    await this.fetchLeasesWithRetry();
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
        const params: any = {};
        if (this.filters.property_id) {
          params.property_id = this.filters.property_id;
        }
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: { Accept: 'application/json' },
          params,
        });

        if (response.status === 200) {
          this.roomOptions = [
            { value: '', text: 'All Rooms' },
            ...response.data.data.map((r: any) => ({
              value: r.id.toString(),
              text: r.room_number || 'N/A',
            })),
          ];
          // Reset room_id if it’s no longer valid
          if (this.filters.room_id && !this.roomOptions.some(opt => opt.value === this.filters.room_id)) {
            this.filters.room_id = '';
          }
        } else {
          this.roomOptions = [{ value: '', text: 'All Rooms' }];
          this.filters.room_id = '';
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
        this.roomOptions = [{ value: '', text: 'All Rooms' }];
        this.filters.room_id = '';
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
    async fetchLeases(params: { page?: number; per_page?: number } = {}) {
      this.loadingLeases = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.is_signed !== '') requestParams.is_signed = this.filters.is_signed;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.room_id) requestParams.room_id = this.filters.room_id;
        if (this.filters.payment_frequency) requestParams.payment_frequency = this.filters.payment_frequency;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/leases/preview`,
          method: 'get',
          headers: { Accept: 'application/json' },
          params: requestParams,
        });

        if (response.status === 200) {
          this.leases = (response.data.data?.leases || []).map((lease: any) => ({
            id: lease.id || 0,
            start_date: lease.start_date || null,
            end_date: lease.end_date || null,
            is_signed: lease.is_signed || false,
            user_fullname: lease.user_fullname || 'N/A',
            property_title: lease.property_title || 'N/A',
            room_number: lease.room_number || 'N/A',
            payment_frequency: lease.payment_frequency || 'N/A',
            rent_amount: lease.rent_amount ? parseFloat(lease.rent_amount) : 0,
            formatted_rent_amount: lease.formatted_rent_amount || 'N/A',
          }));
          this.reportSummary = response.data.data?.report_summary || {
            total_leases: 0,
            date_range: 'N/A',
            signed_status: 'N/A',
            user_name: 'N/A',
            property_title: 'N/A',
            room_number: 'N/A',
            payment_frequency: 'N/A',
            total_rent_amount: 0,
            formatted_total_rent_amount: 'N/A',
          };
          this.pagination = {
            total: response.data.data?.pagination?.total || response.data.data?.leases?.length || 0,
            per_page: response.data.data?.pagination?.per_page || params.per_page || this.pagination.per_page,
            current_page: response.data.data?.pagination?.current_page || params.page || this.pagination.current_page,
            last_page: response.data.data?.pagination?.last_page || Math.ceil((response.data.data?.pagination?.total || response.data.data?.leases?.length || 0) / this.pagination.per_page),
            from: response.data.data?.pagination?.from || (response.data.data?.leases?.length > 0 ? (this.pagination.current_page - 1) * this.pagination.per_page + 1 : 0),
            to: response.data.data?.pagination?.to || Math.min(this.pagination.current_page * this.pagination.per_page, response.data.data?.pagination?.total || response.data.data?.leases?.length || 0),
          };
          if (!this.leases.length) {
            Swal.fire({
              title: 'Info',
              text: 'No leases found for the selected filters.',
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
            text: response.data?.message || 'Failed to fetch leases.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchLeases error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch leases.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.leases = [];
        this.reportSummary = null;
      } finally {
        this.loadingLeases = false;
      }
    },
    async fetchLeasesWithRetry(retries = 3, delay = 1000) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await this.fetchLeases();
          return;
        } catch (error) {
          if (attempt === retries) {
            console.error(`fetchLeases failed after ${retries} attempts`);
            return;
          }
          console.warn(`fetchLeases attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    },
    async handlePropertyChange() {
      this.filters.room_id = '';
      await this.fetchRoomOptions();
      await this.fetchLeases({ page: 1 });
      this.componentKey += 1;
    },
    async handleFilterChange() {
      this.pagination.current_page = 1;
      await this.fetchLeases();
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage;
      await this.fetchLeases({ page: 1, per_page: perPage });
      this.componentKey += 1;
    },
    async clearFilters() {
      this.filters.start_date = '';
      this.filters.end_date = '';
      this.filters.is_signed = '';
      this.filters.property_id = '';
      this.filters.room_id = '';
      this.filters.payment_frequency = '';
      this.roomOptions = [{ value: '', text: 'All Rooms' }];
      await this.fetchLeases({ page: 1 });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      await this.fetchLeases({ page, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async generateReport() {
      this.loadingPdf = true;
      try {
        const requestParams: any = {};
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.is_signed !== '') requestParams.is_signed = this.filters.is_signed;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.room_id) requestParams.room_id = this.filters.room_id;
        if (this.filters.payment_frequency) requestParams.payment_frequency = this.filters.payment_frequency;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/leases/generate`,
          method: 'get',
          headers: { Accept: 'application/pdf' },
          params: requestParams,
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lease-report-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Success!',
          text: 'Lease report PDF generated successfully.',
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
          text: error.response?.data?.message || 'Failed to generate lease report PDF.',
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