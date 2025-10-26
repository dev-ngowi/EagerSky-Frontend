<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="isLoading">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading payment history...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="text-center py-4 text-red-600">
        {{ errorMessage }}
        <button class="ml-4 text-blue-600 underline" @click="retryFetch" aria-label="Retry fetching payments">
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="filters-container flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <VaInput
            v-model="searchQuery"
            placeholder="Search payments by property or status"
            class="w-full sm:w-64"
            :disabled="isLoading"
            @input="debouncedSearch"
            aria-label="Search payments"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search query">
            Clear Search
          </VaButton>
        </div>
        <div class="w-full sm:w-auto">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-full sm:w-24"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
        </div>
      </div>

      <div v-if="payments.length === 0" class="text-center py-4 text-gray-500">
        No payments found
      </div>
      <VaDataTable
        v-else
        :key="componentKey"
        :items="payments"
        striped
        :columns="columns"
        :loading="isLoading"
        :hoverable="true"
        class="table-responsive"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ ((pagination.current_page - 1) * pagination.per_page) + rowIndex + 1 }}
        </template>
        <template #cell(property_title)="{ rowData }">
          {{ rowData.property_title || 'N/A' }}
        </template>
        <template #cell(amount)="{ rowData }">
          {{ rowData.amount ? `${rowData.currency} ${Number(rowData.amount).toLocaleString()}` : 'N/A' }}
        </template>
        <template #cell(date)="{ rowData }">
          {{ formatDate(rowData.date, 'd MMMM yyyy') }}
        </template>
        <template #cell(status)="{ rowData }">
          <span :class="getStatusClass(rowData.status)">
            {{ formatStatus(rowData.status) }}
          </span>
        </template>
        <template #cell(payment_method_name)="{ rowData }">
          {{ rowData.payment_method_name || 'N/A' }}
        </template>
        <template #cell(payment_type_name)="{ rowData }">
          {{ rowData.payment_type_name || 'N/A' }}
        </template>
      </VaDataTable>
      <div v-if="payments.length > 0" class="pagination-section flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
        <div class="text-sm">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} payments
        </div>
        <div class="pagination-container flex flex-wrap gap-2">
          <VaButton
            class="pagination-button"
            size="small"
            :disabled="pagination.current_page === 1 || isLoading"
            @click="handlePageChange(pagination.current_page - 1)"
            aria-label="Previous page"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            class="pagination-button"
            size="small"
            :class="pagination.current_page === page ? 'pagination-button-active' : 'pagination-button-inactive'"
            @click="handlePageChange(page)"
            :aria-label="`Go to page ${page}`"
          >
            {{ page }}
          </VaButton>
          <VaButton
            class="pagination-button"
            size="small"
            :disabled="pagination.current_page === pagination.last_page || isLoading"
            @click="handlePageChange(pagination.current_page + 1)"
            aria-label="Next page"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import makeRequest from '../../../services/makeRequest';
import Loader from '../../../components/Loader.vue';

interface Payment {
  payment_id: string;
  property_title: string | null;
  amount: number | null;
  currency: string;
  date: string | null;
  status: string;
  payment_method_name: string | null;
  payment_type_name: string | null;
}

interface UserData {
  id: number;
  token: string;
  expiresAt: number;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

const columns = ref([
  { key: 'sn', sortable: false, label: 'SN' },
  { key: 'property_title', sortable: true, label: 'Property' },
  { key: 'amount', sortable: true, label: 'Amount' },
  { key: 'date', sortable: true, label: 'Date' },
  { key: 'status', sortable: true, label: 'Status' },
  { key: 'payment_method_name', sortable: true, label: 'Payment Method' },
  { key: 'payment_type_name', sortable: true, label: 'Payment Type' },
]);

const payments = ref<Payment[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const componentKey = ref<number>(0);
const searchQuery = ref<string>('');
const pagination = ref<Pagination>({
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: 0,
  to: 0,
});

const perPageOptions = ref([
  { value: 10, text: '10' },
  { value: 25, text: '25' },
  { value: 50, text: '50' },
]);

const router = useRouter();
let cachedUserData: UserData | null = null;

const paginationPages = computed<number[]>(() => {
  const pages: number[] = [];
  const lastPage = pagination.value.last_page || 1;
  const current = pagination.value.current_page || 1;
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
});

const getUserData = (): UserData | null => {
  if (cachedUserData) return cachedUserData;
  const userDataString = localStorage.getItem('userData');
  if (!userDataString) return null;

  try {
    const userData = JSON.parse(userDataString);
    if (!userData.id || !userData.token || !userData.expiresAt) return null;
    if (userData.expiresAt < Date.now()) {
      localStorage.removeItem('userData');
      return null;
    }
    cachedUserData = userData;
    return userData;
  } catch (error) {
    console.error('Error parsing userData:', error);
    return null;
  }
};

const formatDate = (date: string | null, formatString: string): string => {
  if (!date) return 'N/A';
  try {
    const parsedDate = parseISO(date);
    return isValid(parsedDate) ? format(parsedDate, formatString) : 'N/A';
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return 'N/A';
  }
};

const formatStatus = (status: string): string => {
  if (!status) return 'Pending';
  const normalizedStatus = status.toLowerCase().trim();
  const statusMap: { [key: string]: string } = {
    pending: 'Pending',
    completed: 'Completed',
    refunded: 'Refunded',
    received: 'Received',
  };
  return statusMap[normalizedStatus] || 'Pending';
};

const getStatusClass = (status: string): string => {
  const normalizedStatus = status ? status.toLowerCase().trim() : 'pending';
  const statusClasses: { [key: string]: string } = {
    pending: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium',
    completed: 'bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium',
    refunded: 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium',
    received: 'bg-teal-100 text-teal-800 px-2 py-1 rounded text-sm font-medium',
  };
  
  return statusClasses[normalizedStatus] || 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium';
};

const fetchPayments = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
  isLoading.value = true;
  errorMessage.value = null;

  const userData = getUserData();
  if (!userData) {
    Swal.fire({
      title: 'Authentication Error!',
      text: 'Your session has expired. Please log in again.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: true,
      confirmButtonText: 'Go to Login',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('userData');
        router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      }
    });
    return;
  }

  try {
    const baseUrl = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/payments`;
    const searchParams = new URLSearchParams({
      page: (params.page || pagination.value.current_page).toString(),
      per_page: (params.per_page || pagination.value.per_page).toString(),
    });

    if (params.search || searchQuery.value) {
      searchParams.append('search', params.search || searchQuery.value);
    }

    const url = `${baseUrl}?${searchParams.toString()}`;
    const response = await makeRequest({
      method: 'GET',
      url,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    if (!response.data) {
      throw new Error('No data received from server');
    }

    const paymentData = response.data.data;
    if (!Array.isArray(paymentData)) {
      throw new Error('Invalid response format - expected array of payments');
    }

    payments.value = paymentData.map((payment: any): Payment => ({
      payment_id: payment.payment_id || `payment-${Math.random().toString(36).substr(2, 9)}`,
      property_title: payment.property_payments?.[0]?.property?.title || 'General Payment',
      amount: payment.amount || null,
      currency: payment.currency || 'TZS',
      date: payment.date || null,
      status: payment.status || 'pending',
      payment_method_name: payment.payment_method?.method_name || 'N/A',
      payment_type_name: payment.payment_type?.name || 'N/A',
    }));

    pagination.value = response.data.pagination || {
      total: paymentData.length,
      per_page: params.per_page || 10,
      current_page: params.page || 1,
      last_page: Math.ceil(paymentData.length / (params.per_page || 10)) || 1,
      from: paymentData.length > 0 ? (params.page || 1 - 1) * (params.per_page || 10) + 1 : 0,
      to: Math.min((params.page || 1) * (params.per_page || 10), paymentData.length),
    };

    if (payments.value.length === 0 && !searchQuery.value && !params.search) {
      Swal.fire({
        title: 'Info',
        text: 'No payments found.',
        icon: 'info',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    let errorMessageText = 'Failed to fetch payments.';
    if (error.response?.status === 401) {
      errorMessageText = 'Your session has expired or the token is invalid. Please log in again.';
      Swal.fire({
        title: 'Authentication Error!',
        text: errorMessageText,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: true,
        confirmButtonText: 'Go to Login',
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem('userData');
          router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
        }
      });
      return;
    } else if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessageText = Object.values(error.response.data.errors).flat().join('; ');
    } else if (error.response?.data?.message) {
      errorMessageText = error.response.data.message;
    }
    errorMessage.value = errorMessageText;
    Swal.fire({
      title: 'Error!',
      text: errorMessageText,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 5000,
    });
  } finally {
    isLoading.value = false;
  }
};

const retryFetch = async () => {
  errorMessage.value = null;
  await fetchPayments({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const handlePageChange = async (page: number) => {
  if (isLoading.value) return;
  if (page < 1 || page > pagination.value.last_page) return;
  pagination.value.current_page = page;
  await fetchPayments({
    page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const handlePerPageChange = async (perPage: number) => {
  if (isLoading.value) return;
  pagination.value.per_page = perPage || 10;
  pagination.value.current_page = 1;
  await fetchPayments({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const clearSearch = () => {
  searchQuery.value = '';
  pagination.value.current_page = 1;
  fetchPayments({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const debouncedSearch = debounce(() => {
  if (isLoading.value) return;
  pagination.value.current_page = 1;
  fetchPayments({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
}, 300);

onMounted(() => {
  const userData = getUserData();
  if (!userData) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  retryFetch();
});
</script>

<style lang="scss" scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-4 {
  padding: 1rem;
}
.loadingSpiner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px; /* Reduced height for mobile */
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
.items-start {
  align-items: flex-start;
}
.items-center {
  align-items: center;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
.space-y-2 > :not(:last-child) {
  margin-bottom: 0.5rem;
}
.text-gray-500 {
  color: #6b7280;
}
.text-gray-600 {
  color: #4b5563;
}
.text-gray-900 {
  color: #111827;
}
.text-blue-600 {
  color: #2563eb;
}
.text-blue-800 {
  color: #1e40af;
}
.text-yellow-100 {
  background-color: #fefcbf;
}
.text-yellow-800 {
  color: #975a16;
}
.text-green-100 {
  background-color: #d1fae5;
}
.text-green-800 {
  color: #065f46;
}
.text-gray-100 {
  background-color: #f3f4f6;
}
.text-gray-800 {
  color: #1f2937;
}
.text-teal-100 {
  background-color: #ccfbf1;
}
.text-teal-800 {
  color: #0f766e;
}
.text-red-100 {
  background-color: #fee2e2;
}
.text-red-800 {
  color: #9b2c2c;
}
.text-red-600 {
  color: #dc2626;
}
.font-semibold {
  font-weight: 600;
}
.text-sm {
  font-size: 0.875rem;
}
.text-2xl {
  font-size: 1.5rem;
}
.font-bold {
  font-weight: 700;
}
.w-64 {
  width: 16rem;
}
.w-24 {
  width: 6rem;
}
.w-full {
  width: 100%;
}
.text-center {
  text-align: center;
}
.underline {
  text-decoration: underline;
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Table Responsiveness */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on mobile */
}

/* Pagination Styles */
.pagination-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.pagination-button {
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px; /* Touch-friendly height */
}

.pagination-button-inactive {
  background-color: #f3f4f6;
  color: #374151;
  &:hover:not(:disabled) {
    background-color: #e5e7eb;
    color: #1f2937;
  }
}

.pagination-button-active {
  background-color: #00A3E0;
  color: #ffffff;
  font-weight: 600;
  &:hover:not(:disabled) {
    background-color: #0284c7;
  }
}

.pagination-button:disabled {
  background-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Responsive Design */
@media (max-width: 640px) {
  .p-4 {
    padding: 0.75rem;
  }

  .loadingSpiner {
    min-height: 150px;
  }

  .filters-container {
    flex-direction: column;
    gap: 0.75rem;
  }

  .w-64, .w-24 {
    width: 100%;
  }

  .text-sm {
    font-size: 0.75rem;
  }

  .pagination-section {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pagination-container {
    gap: 0.25rem;
  }

  .pagination-button {
    min-width: 2rem;
    height: 2rem;
    font-size: 0.75rem;
    padding: 0.25rem;
    min-height: 40px; /* Maintain touch-friendly height */
  }

  /* Adjust table column widths for mobile */
  .table-responsive :deep(th),
  .table-responsive :deep(td) {
    padding: 0.5rem;
    font-size: 0.75rem;
    white-space: nowrap; /* Prevent text wrapping in cells */
  }

  /* Prioritize key columns */
  .table-responsive :deep(th[data-key="sn"]),
  .table-responsive :deep(td[data-key="sn"]) {
    min-width: 40px;
  }
  .table-responsive :deep(th[data-key="property_title"]),
  .table-responsive :deep(td[data-key="property_title"]) {
    min-width: 120px;
  }
  .table-responsive :deep(th[data-key="amount"]),
  .table-responsive :deep(td[data-key="amount"]) {
    min-width: 100px;
  }
  .table-responsive :deep(th[data-key="status"]),
  .table-responsive :deep(td[data-key="status"]) {
    min-width: 80px;
  }

  /* Reduce visibility of less critical columns on mobile */
  .table-responsive :deep(th[data-key="date"]),
  .table-responsive :deep(td[data-key="date"]),
  .table-responsive :deep(th[data-key="payment_method_name"]),
  .table-responsive :deep(td[data-key="payment_method_name"]),
  .table-responsive :deep(th[data-key="payment_type_name"]),
  .table-responsive :deep(td[data-key="payment_type_name"]) {
    display: none; /* Hide on mobile to reduce clutter */
  }
}

@media (max-width: 480px) {
  .p-4 {
    padding: 0.5rem;
  }

  .text-sm {
    font-size: 0.625rem;
  }

  .pagination-button {
    min-width: 1.75rem;
    height: 1.75rem;
    font-size: 0.625rem;
  }

  .table-responsive :deep(th),
  .table-responsive :deep(td) {
    font-size: 0.625rem;
  }
}
</style>
