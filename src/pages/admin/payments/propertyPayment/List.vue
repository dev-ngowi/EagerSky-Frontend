<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Property Payments</h2>
    <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
      <div class="flex items-center space-x-4 flex-wrap gap-2">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by room number or payment type..."
          class="w-64"
          :disabled="loadingPayments"
          @update:modelValue="handleSearchInput"
        />
        <VaSelect
          v-model="propertyFilter"
          :options="properties"
          label="Filter by Property"
          placeholder="Select property"
          value-by="id"
          text-by="title"
          class="w-64"
          clearable
          :disabled="loadingPayments || loadingProperties"
          @update:modelValue="handlePropertyFilter"
        />
        <VaDateInput
          v-model="dateRange"
          label="Date Range"
          mode="range"
          class="w-64"
          :disabled="loadingPayments"
          @update:modelValue="handleDateRangeChange"
        />
        <VaButton v-if="searchQuery || propertyFilter || dateRange" color="warning" size="small" @click="clearFilters">
          Clear Filters
        </VaButton>
      </div>
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
        <VaButton
          icon="download"
          color="info"
          size="small"
          class="px-4"
          @click="downloadReport"
        >
          Download Report
        </VaButton>
      </div>
    </div>
    <VaDataTable
      v-if="payments && payments.length > 0"
      :key="componentKey"
      :items="payments"
      striped
      :columns="columns"
      :loading="loadingPayments"
      @update:sort-by="handleSort"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(amount)="{ rowData }">
        {{ formatCurrency(rowData.amount) }}
      </template>
      <template #cell(paid_at)="{ rowData }">
        {{ parseDate(rowData.paid_at, 'Paid At') }}
      </template>
      <template #cell(actions)="{ rowData }">
        <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
      </template>
    </VaDataTable>
    <div v-if="payments && payments.length > 0" class="flex justify-between items-center mt-4">
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
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Payment Details</div>
      <div v-if="selectedPayment" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedPayment.property?.title || 'N/A' }}</p>
        <p><strong>Room:</strong> {{ selectedPayment.lease?.room?.room_number || 'N/A' }}</p>
        <p><strong>Tenant:</strong> {{ selectedPayment.lease?.tenant?.name || 'N/A' }}</p>
        <p><strong>Amount:</strong> {{ formatCurrency(selectedPayment.amount) }}</p>
        <p><strong>Paid At:</strong> {{ parseDate(selectedPayment.paid_at, 'Paid At') }}</p>
        <p><strong>Payment Type:</strong> {{ selectedPayment.payment?.paymentType?.name || 'N/A' }}</p>
        <p><strong>Payment Method:</strong> {{ selectedPayment.payment?.paymentMethod?.method_name || 'N/A' }}</p>
        <p><strong>Status:</strong> {{ selectedPayment.payment?.status || 'N/A' }}</p>
        <p><strong>Created At:</strong> {{ parseDate(selectedPayment.created_at, 'Created At') }}</p>
        <p><strong>Updated At:</strong> {{ parseDate(selectedPayment.updated_at, 'Updated At') }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface PropertyPayment {
  id: number;
  property: { id: number; title: string } | null;
  lease: { room: { id: number; room_number: string } | null; tenant: { id: number; name: string } | null } | null;
  payment: { paymentType: { id: number; name: string } | null; paymentMethod: { id: number; method_name: string } | null; status: string } | null;
  amount: number;
  paid_at: string | null;
  room_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Property {
  id: number;
  title: string;
}

interface Room {
  id: number;
  room_number: string;
  property_id: number;
}

interface PaymentType {
  id: number;
  name: string;
}

interface PaymentMethod {
  id: number;
  method_name: string;
}

export default defineComponent({
  name: 'PropertyPaymentList',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property.title', sortable: true, label: 'Property' },
        { key: 'lease.room.room_number', sortable: true, label: 'Room' },
        { key: 'lease.tenant.name', sortable: true, label: 'Tenant' },
        { key: 'amount', sortable: true, label: 'Amount (TZS)' },
        { key: 'paid_at', sortable: true, label: 'Paid At' },
        { key: 'payment.paymentType.name', sortable: true, label: 'Payment Type' },
        { key: 'payment.paymentMethod.method_name', sortable: true, label: 'Payment Method' },
        { key: 'payment.status', sortable: true, label: 'Status' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      payments: [] as PropertyPayment[],
      properties: [] as Property[],
      rooms: [] as Room[],
      paymentTypes: [] as PaymentType[],
      paymentMethods: [] as PaymentMethod[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingPayments: false,
      loadingProperties: false,
      loadingRooms: false,
      loadingPaymentTypes: false,
      loadingPaymentMethods: false,
      showView: false,
      selectedPayment: null as PropertyPayment | null,
      componentKey: 0,
      searchQuery: '' as string,
      propertyFilter: null as number | null,
      dateRange: null as { start: Date; end: Date } | null,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      debouncedSearch: debounce(
        function (this: any, value: string) {
          this.handleSearch(value);
        },
        500
      ) as (value: string) => void,
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
  },
  async mounted() {
    console.log('PropertyPaymentList mounted, fetching data');
    await Promise.all([
      this.getPayments(),
      this.getProperties(),
      this.getRooms(),
      this.getPaymentTypes(),
      this.getPaymentMethods(),
    ]);
  },
  methods: {
    async getProperties() {
      this.loadingProperties = true;
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
            id: property.id,
            title: property.title,
          }));
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No properties available.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
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
        console.error('getProperties error:', error.response?.data || error.message);
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
        this.loadingProperties = false;
      }
    },
    async getRooms() {
      this.loadingRooms = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.rooms = response.data.data.map((room: any) => ({
            id: room.id,
            room_number: room.room_number,
            property_id: room.property_id,
          }));
          if (this.rooms.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No rooms available.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
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
        console.error('getRooms error:', error.response?.data || error.message);
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
        this.loadingRooms = false;
      }
    },
    async getPaymentTypes() {
      this.loadingPaymentTypes = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.paymentTypes = response.data.data.map((type: any) => ({
            id: type.id,
            name: type.name,
          }));
          if (this.paymentTypes.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No payment types available.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch payment types.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getPaymentTypes error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch payment types.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingPaymentTypes = false;
      }
    },
    async getPaymentMethods() {
      this.loadingPaymentMethods = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.paymentMethods = response.data.data.map((method: any) => ({
            id: method.id,
            method_name: method.method_name,
          }));
          if (this.paymentMethods.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No payment methods available.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
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
        console.error('getPaymentMethods error:', error.response?.data || error.message);
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
        this.loadingPaymentMethods = false;
      }
    },
    async getPayments(params: { page?: number; per_page?: number; property_id?: number | null; search?: string; date_from?: string; date_to?: string; sort_by?: string; sort_order?: string } = {}) {
      this.loadingPayments = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (params.property_id !== null && params.property_id !== undefined) {
          requestParams.property_id = params.property_id;
        }
        if (params.search || this.searchQuery) {
          requestParams.search = params.search || this.searchQuery;
        }
        if (this.dateRange) {
          requestParams.date_from = format(this.dateRange.start, 'yyyy-MM-dd');
          requestParams.date_to = format(this.dateRange.end, 'yyyy-MM-dd');
        }
        if (params.sort_by) {
          requestParams.sort_by = params.sort_by;
          requestParams.sort_order = params.sort_order || 'asc';
        }

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-payments`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        if (response.status === 200) {
          this.payments = response.data.data.map((payment: any) => ({
            id: payment.id,
            property: payment.property,
            lease: payment.lease,
            payment: payment.payment,
            amount: payment.amount,
            paid_at: payment.paid_at,
            room_id: payment.room_id,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
          }));
          this.pagination = {
            total: response.data.total || response.data.data.length,
            per_page: response.data.per_page || params.per_page || 10,
            current_page: response.data.current_page || params.page || 1,
            last_page: response.data.last_page || 1,
            from: response.data.from || (response.data.data.length > 0 ? (response.data.current_page - 1) * response.data.per_page + 1 : 0),
            to: response.data.to || Math.min(response.data.current_page * response.data.per_page, response.data.total),
          };
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
        console.error('getPayments error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch payments.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingPayments = false;
      }
    },
    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) {
        console.warn(`${context}: Date string is null or undefined`);
        return 'N/A';
      }
      try {
        let parsed = parse(dateStr, "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'", new Date());
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
    formatCurrency(amount: number): string {
      return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
    },
    async handleSearchInput(value: string) {
      this.searchQuery = value;
      console.log('Search input changed:', value);
      this.debouncedSearch(value);
    },
    async handleSearch(value: string) {
      console.log('Searching with query:', value);
      await this.getPayments({ page: 1, per_page: this.pagination.per_page, search: value });
      this.componentKey += 1;
    },
    async handlePropertyFilter() {
      console.log('Property filter changed:', this.propertyFilter);
      await this.getPayments({ page: 1, per_page: this.pagination.per_page, property_id: this.propertyFilter });
      this.componentKey += 1;
    },
    async handleDateRangeChange() {
      console.log('Date range changed:', this.dateRange);
      await this.getPayments({ page: 1, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async handleSort(sort: any) {
      console.log('Sorting:', sort);
      const columnMap: { [key: string]: string } = {
        'property.title': 'property.title',
        'lease.room.room_number': 'lease.room.room_number',
        'lease.tenant.name': 'lease.tenant.name',
        'amount': 'amount',
        'paid_at': 'paid_at',
        'payment.paymentType.name': 'payment.paymentType.name',
        'payment.paymentMethod.method_name': 'payment.paymentMethod.method_name',
        'payment.status': 'payment.status',
      };
      const sortBy = columnMap[sort.column] || sort.column;
      await this.getPayments({ sort_by: sortBy, sort_order: sort.order });
      this.componentKey += 1;
    },
    async clearFilters() {
      this.searchQuery = '';
      this.propertyFilter = null;
      this.dateRange = null;
      console.log('Clearing filters');
      await this.getPayments({ page: 1, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      console.log('Changing page to:', page);
      await this.getPayments({ page, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      console.log('Changing per page to:', perPage);
      this.pagination.per_page = perPage;
      await this.getPayments({ page: 1, per_page: perPage });
      this.componentKey += 1;
    },
    openView(payment: PropertyPayment) {
      this.selectedPayment = payment;
      this.showView = true;
    },
    closeView() {
      this.selectedPayment = null;
      this.showView = false;
    },
    async downloadReport() {
      try {
        const requestParams: any = {};
        if (this.propertyFilter) {
          requestParams.property_id = this.propertyFilter;
        }
        if (this.dateRange) {
          requestParams.date_from = format(this.dateRange.start, 'yyyy-MM-dd');
          requestParams.date_to = format(this.dateRange.end, 'yyyy-MM-dd');
        }
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-payments/download`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        if (response.status === 200 && response.data.data?.url) {
          window.open(response.data.data.url, '_blank');
          Swal.fire({
            title: 'Success!',
            text: 'Report opened in a new tab.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to download report');
        }
      } catch (error: any) {
        console.error('Download error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to download report.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
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

@media screen and (max-width: 768px) {
  .card {
    padding: 1rem;
  }
}

@media screen and (max-width: 480px) {
  .card {
    padding: 0.5rem;
  }
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

.flex-wrap {
  flex-wrap: wrap;
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

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.w-32 {
  width: 8rem;
}

.w-64 {
  width: 16rem;
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
</style>