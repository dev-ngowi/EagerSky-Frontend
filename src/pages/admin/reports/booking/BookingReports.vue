<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Booking Report</h2>
    <div class="filter-container mb-4">
      <div class="filter-list">
        <div class="filter-row">
          <div class="filter-item">
            <VaInput
              v-model="filters.start_date"
              type="date"
              label="Start Date"
              class="w-full"
              :disabled="loadingBookings || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaInput
              v-model="filters.end_date"
              type="date"
              label="End Date"
              class="w-full"
              :disabled="loadingBookings || loadingOptions"
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
              :disabled="loadingBookings || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaSelect
              v-model="filters.client_id"
              :options="clientOptions"
              label="Client"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingBookings || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <VaSelect
              v-model="filters.booking_property_type_id"
              :options="propertyTypeOptions"
              label="Property Type"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingBookings || loadingOptions"
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
              :disabled="loadingBookings || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <VaSelect
              v-model="filters.branch_id"
              :options="branchOptions"
              label="Branch"
              value-by="value"
              text-by="text"
              class="w-full"
              :disabled="loadingBookings || loadingOptions"
              @update:modelValue="handleFilterChange"
            />
          </div>
          <div class="filter-item">
            <VaButton v-if="hasFilters" color="warning" size="small" @click="clearFilters">Clear</VaButton>
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
          :disabled="loadingBookings || !bookings.length || loadingPdf"
          :loading="loadingPdf"
          @click="generateReport"
        >
          Generate PDF
        </VaButton>
      </div>
    </div>
    <div v-if="loadingBookings || loadingOptions" class="text-center py-4">
      Loading bookings...
    </div>
    <div v-else-if="!bookings.length" class="text-center py-4">
      No bookings found for the selected filters.
    </div>
    <VaDataTable
      v-else
      :key="componentKey"
      :items="bookings"
      striped
      :columns="columns"
      :loading="loadingBookings"
      class="table-responsive"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(date)="{ rowData }">
        {{ parseDate(rowData.date, 'Booking Date') }}
      </template>
      <template #cell(client_fullname)="{ rowData }">
        <span class="truncate">{{ rowData.client_fullname || 'N/A' }}</span>
      </template>
      <template #cell(booking_property_type_name)="{ rowData }">
        <span class="truncate">{{ rowData.booking_property_type_name || 'N/A' }}</span>
      </template>
      <template #cell(property_title)="{ rowData }">
        <span class="truncate">{{ rowData.property_title || 'N/A' }}</span>
      </template>
      <template #cell(appointment_type_name)="{ rowData }">
        <span class="truncate">{{ rowData.appointment_type_name || 'N/A' }}</span>
      </template>
      <template #cell(time_slot)="{ rowData }">
        <span class="truncate">{{ rowData.time_slot || 'N/A' }}</span>
      </template>
    </VaDataTable>
    <div v-if="bookings.length" class="flex justify-between items-center mt-4">
      <div>
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} bookings
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
      <p><strong>Total Bookings:</strong> {{ reportSummary.total_bookings }}</p>
      <p><strong>Date Range:</strong> {{ reportSummary.date_range }}</p>
      <p><strong>Status:</strong> {{ reportSummary.status }}</p>
      <p><strong>Client:</strong> {{ reportSummary.client_name }}</p>
      <p><strong>Property Type:</strong> {{ reportSummary.booking_property_type }}</p>
      <p><strong>Property:</strong> {{ reportSummary.property_title }}</p>
      <p><strong>Branch:</strong> {{ reportSummary.branch_name }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface Booking {
  id: number;
  date: string;
  status: string;
  client_fullname: string;
  client_id: string;
  booking_property_type_id: string;
  booking_property_type_name: string;
  property_title: string;
  appointment_type_name: string;
  time_slot: string;
}

interface ReportSummary {
  total_bookings: number;
  date_range: string;
  status: string;
  client_name: string;
  booking_property_type: string;
  property_title: string;
  branch_name: string;
}

interface Filters {
  start_date: string;
  end_date: string;
  status: string;
  client_id: string;
  booking_property_type_id: string;
  property_id: string;
  branch_id: string;
}

interface Option {
  value: string;
  text: string;
}

export default defineComponent({
  name: 'BookingReport',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN', width: '60px' },
        { key: 'date', sortable: true, label: 'Booking Date', width: '150px' },
        { key: 'status', sortable: true, label: 'Status', width: '120px' },
        { key: 'client_fullname', sortable: true, label: 'Client', width: '180px' },
        { key: 'booking_property_type_name', sortable: true, label: 'Property Type', width: '150px' },
        { key: 'property_title', sortable: true, label: 'Property', width: '180px' },
        { key: 'appointment_type_name', sortable: true, label: 'Appointment Type', width: '150px' },
        { key: 'time_slot', sortable: true, label: 'Time Slot', width: '120px' },
      ],
      bookings: [] as Booking[],
      reportSummary: null as ReportSummary | null,
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingBookings: false,
      loadingPdf: false,
      loadingOptions: false,
      componentKey: 0,
      filters: reactive<Filters>({
        start_date: '',
        end_date: '',
        status: '',
        client_id: '',
        booking_property_type_id: '',
        property_id: '',
        branch_id: '',
      }),
      statusOptions: [
        { value: '', text: 'All Statuses' },
        { value: 'pending', text: 'Pending' },
        { value: 'confirmed', text: 'Confirmed' },
        { value: 'completed', text: 'Completed' },
        { value: 'cancelled', text: 'Cancelled' },
      ],
      clientOptions: [{ value: '', text: 'All Clients' }] as Option[],
      propertyTypeOptions: [{ value: '', text: 'All Property Types' }] as Option[],
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
          this.fetchBookings();
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
        !!this.filters.client_id ||
        !!this.filters.booking_property_type_id ||
        !!this.filters.property_id ||
        !!this.filters.branch_id
      );
    },
  },
  async mounted() {
    await Promise.all([
      this.fetchClientOptions(),
      this.fetchPropertyTypeOptions(),
      this.fetchPropertyOptions(),
      this.fetchBranchOptions(),
    ]);
    await this.fetchBookingsWithRetry();
  },
  methods: {
    async fetchClientOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.clientOptions = [
            { value: '', text: 'All Clients' },
            ...response.data.data.map((u: any) => ({
              value: u.id.toString(),
              text: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}`.trim() : 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch clients.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchClientOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch clients.',
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
    async fetchPropertyTypeOptions() {
      this.loadingOptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/booking-property-types`,
          method: 'get',
          headers: { Accept: 'application/json' },
        });

        if (response.status === 200) {
          this.propertyTypeOptions = [
            { value: '', text: 'All Property Types' },
            ...response.data.data.map((pt: any) => ({
              value: pt.id.toString(),
              text: pt.name || 'N/A',
            })),
          ];
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch property types.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchPropertyTypeOptions error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch property types.',
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
    async fetchBookings(params: { page?: number; per_page?: number } = {}) {
      this.loadingBookings = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.status) requestParams.status = this.filters.status;
        if (this.filters.client_id) requestParams.client_id = this.filters.client_id;
        if (this.filters.booking_property_type_id) requestParams.booking_property_type_id = this.filters.booking_property_type_id;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.branch_id) requestParams.branch_id = this.filters.branch_id;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/bookings/preview`,
          method: 'get',
          headers: { Accept: 'application/json' },
          params: requestParams,
        });

        if (response.status === 200) {
          this.bookings = (response.data.data?.bookings || []).map((booking: any) => ({
            id: booking.id || 0,
            date: booking.date || null,
            status: booking.status || 'N/A',
            client_fullname: booking.client_fullname || 'N/A',
            client_id: booking.client_id || 'N/A',
            booking_property_type_id: booking.booking_property_type_id || 'N/A',
            booking_property_type_name: booking.booking_property_type_name || 'N/A',
            property_title: booking.property_title || 'N/A',
            appointment_type_name: booking.appointment_type_name || 'N/A',
            time_slot: booking.time_slot || 'N/A',
          }));
          this.reportSummary = response.data.data?.report_summary || {
            total_bookings: 0,
            date_range: 'N/A',
            status: 'N/A',
            client_name: 'N/A',
            booking_property_type: 'N/A',
            property_title: 'N/A',
            branch_name: 'N/A',
          };
          this.pagination = {
            total: response.data.data?.pagination?.total || response.data.data?.bookings?.length || 0,
            per_page: response.data.data?.pagination?.per_page || params.per_page || this.pagination.per_page,
            current_page: response.data.data?.pagination?.current_page || params.page || this.pagination.current_page,
            last_page: response.data.data?.pagination?.last_page || Math.ceil((response.data.data?.pagination?.total || response.data.data?.bookings?.length || 0) / this.pagination.per_page),
            from: response.data.data?.pagination?.from || (response.data.data?.bookings?.length > 0 ? (this.pagination.current_page - 1) * this.pagination.per_page + 1 : 0),
            to: response.data.data?.pagination?.to || Math.min(this.pagination.current_page * this.pagination.per_page, response.data.data?.pagination?.total || response.data.data?.bookings?.length || 0),
          };
          if (!this.bookings.length) {
            Swal.fire({
              title: 'Info',
              text: 'No bookings found for the selected filters.',
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
            text: response.data?.message || 'Failed to fetch bookings.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchBookings error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack,
        });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch bookings.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.bookings = [];
        this.reportSummary = null;
      } finally {
        this.loadingBookings = false;
      }
    },
    async fetchBookingsWithRetry(retries = 3, delay = 1000) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await this.fetchBookings();
          return;
        } catch (error) {
          if (attempt === retries) {
            console.error(`fetchBookings failed after ${retries} attempts`);
            return;
          }
          console.warn(`fetchBookings attempt ${attempt} failed, retrying in ${delay}ms...`);
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
      await this.fetchBookings({ page: 1, per_page: perPage });
      this.componentKey += 1;
    },
    async clearFilters() {
      this.filters.start_date = '';
      this.filters.end_date = '';
      this.filters.status = '';
      this.filters.client_id = '';
      this.filters.booking_property_type_id = '';
      this.filters.property_id = '';
      this.filters.branch_id = '';
      await this.fetchBookings({ page: 1 });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      await this.fetchBookings({ page, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async generateReport() {
      this.loadingPdf = true;
      try {
        const requestParams: any = {};
        if (this.filters.start_date) requestParams.start_date = this.filters.start_date;
        if (this.filters.end_date) requestParams.end_date = this.filters.end_date;
        if (this.filters.status) requestParams.status = this.filters.status;
        if (this.filters.client_id) requestParams.client_id = this.filters.client_id;
        if (this.filters.booking_property_type_id) requestParams.booking_property_type_id = this.filters.booking_property_type_id;
        if (this.filters.property_id) requestParams.property_id = this.filters.property_id;
        if (this.filters.branch_id) requestParams.branch_id = this.filters.branch_id;

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reports/bookings/generate`,
          method: 'get',
          headers: { Accept: 'application/pdf' },
          params: requestParams,
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `booking-report-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Success!',
          text: 'Booking report PDF generated successfully.',
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
          text: error.response?.data?.message || 'Failed to generate booking report PDF.',
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