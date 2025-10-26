<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="isLoading">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading leases...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="text-center py-4 text-red-600">
        {{ errorMessage }}
        <button class="ml-4 text-blue-600 underline" @click="retryFetch" aria-label="Retry fetching leases">
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="filters-container flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <VaInput
            v-model="searchQuery"
            placeholder="Search leases by property or status"
            class="w-full sm:w-64"
            :disabled="isLoading"
            @input="debouncedSearch"
            aria-label="Search leases"
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

      <div v-if="leases.length === 0" class="text-center py-4 text-gray-500">
        No leases found
      </div>
      <VaDataTable
        v-else
        :key="componentKey"
        :items="leases"
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
        <template #cell(start_date)="{ rowData }">
          {{ formatDate(rowData.start_date, 'd MMMM yyyy') }}
        </template>
        <template #cell(end_date)="{ rowData }">
          {{ formatDate(rowData.end_date, 'd MMMM yyyy') }}
        </template>
        <template #cell(terms)="{ rowData }">
          {{ rowData.terms || 'N/A' }}
        </template>
        <template #cell(rent_amount)="{ rowData }">
          {{ rowData.rent_amount ? `TZS ${Number(rowData.rent_amount).toLocaleString()}` : 'N/A' }}
        </template>
        <template #cell(status)="{ rowData }">
          <span :class="getStatusClass(rowData.is_signed)">
            {{ rowData.is_signed ? 'Signed' : 'Unsigned' }}
          </span>
        </template>
        <template #cell(action)="{ rowData }">
          <VaButton
            v-if="rowData.is_signed"
            color="primary"
            size="small"
            @click="downloadLease(rowData.id)"
            :disabled="downloadingLease === rowData.id"
            aria-label="Download lease PDF"
          >
            <span v-if="downloadingLease === rowData.id" class="animate-spin mr-2">↻</span>
            {{ downloadingLease === rowData.id ? 'Downloading...' : 'Download Lease' }}
          </VaButton>
          <span v-else>-</span>
        </template>
      </VaDataTable>
      <div v-if="leases.length > 0" class="pagination-section flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
        <div class="text-sm">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} leases
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

interface Lease {
  id: string;
  property_title: string | null;
  start_date: string | null;
  end_date: string | null;
  terms: string | null;
  rent_amount: number | null;
  is_signed: boolean;
  room_id?: number | null;
  room_number?: string | null;
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
  { key: 'start_date', sortable: true, label: 'Start Date' },
  { key: 'end_date', sortable: true, label: 'End Date' },
  { key: 'terms', sortable: true, label: 'Terms' },
  { key: 'rent_amount', sortable: true, label: 'Rent Amount' },
  { key: 'status', sortable: true, label: 'Status' },
  { key: 'action', sortable: false, label: 'Action' },
]);

const leases = ref<Lease[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const componentKey = ref<number>(0);
const searchQuery = ref<string>('');
const downloadingLease = ref<string | null>(null);
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

const getStatusClass = (isSigned: boolean): string => {
  return isSigned
    ? 'bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium'
    : 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium';
};

const fetchLeases = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
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
    const baseUrl = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/leases`;
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

    const leaseData = response.data.data;
    if (!Array.isArray(leaseData)) {
      throw new Error('Invalid response format - expected array of leases');
    }

    leases.value = leaseData.map((lease: any): Lease => ({
      id: lease.id.toString(),
      property_title: lease.property_title || 'N/A',
      start_date: lease.start_date || null,
      end_date: lease.end_date || null,
      terms: lease.terms || 'N/A',
      rent_amount: lease.rent_amount || null,
      is_signed: lease.is_signed || false,
      room_id: lease.room_id || null,
      room_number: lease.room_number || null,
    }));

    pagination.value = response.data.pagination || {
      total: leaseData.length,
      per_page: params.per_page || 10,
      current_page: params.page || 1,
      last_page: Math.ceil(leaseData.length / (params.per_page || 10)) || 1,
      from: leaseData.length > 0 ? (params.page || 1 - 1) * (params.per_page || 10) + 1 : 0,
      to: Math.min((params.page || 1) * (params.per_page || 10), leaseData.length),
    };

    if (leases.value.length === 0 && !searchQuery.value && !params.search) {
      Swal.fire({
        title: 'Info',
        text: 'No leases found.',
        icon: 'info',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  } catch (error: any) {
    console.error('Error fetching leases:', error);
    let errorMessageText = 'Failed to fetch leases.';
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
  await fetchLeases({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const downloadLease = async (leaseId: string) => {
  downloadingLease.value = leaseId;
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
    downloadingLease.value = null;
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/tenant/leases/${leaseId}/pdf`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    const pdfUrl = response.data?.data?.url;
    if (response.data?.status === 'success' && pdfUrl) {
      try {
        new URL(pdfUrl);
        const pdfWindow = window.open(pdfUrl, '_blank');
        if (!pdfWindow) {
          Swal.fire({
            icon: 'warning',
            title: 'Pop-up Blocked',
            text: 'Your browser blocked the new tab. Please allow pop-ups for this site and try again.',
            confirmButtonColor: '#007bff',
          });
          return;
        }
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Your lease is opening in a new tab.',
          confirmButtonColor: '#007bff',
          timer: 3000,
          timerProgressBar: true,
        });
      } catch (urlError) {
        console.error('Invalid PDF URL received from server:', pdfUrl, urlError);
        Swal.fire({
          icon: 'error',
          title: 'Invalid URL',
          text: 'The server provided an invalid URL for the PDF.',
          confirmButtonColor: '#007bff',
        });
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Could Not Get PDF',
        text: response.data?.message || 'The server did not provide a valid PDF link. Please try again.',
        confirmButtonColor: '#007bff',
      });
    }
  } catch (error: any) {
    let errorMessageText = error.response?.data?.message || 'An unexpected error occurred while downloading the lease.';
    if (error.response?.status === 401) {
      localStorage.removeItem('userData');
      router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      errorMessageText = 'Session expired. Please log in again.';
    } else if (error.response?.status === 403) {
      errorMessageText = 'Unauthorized: You can only download your own lease.';
    } else if (error.response?.status === 404) {
      errorMessageText = 'Lease not found or not signed.';
    } else if (error.response?.status === 422) {
      errorMessageText = error.response?.data?.message || 'Payment not completed for this lease.';
    } else if (error.status === 0 || error.message.includes('Network Error')) {
      errorMessageText = 'Network error: Failed to connect to the server.';
    }

    Swal.fire({
      icon: 'error',
      title: 'Download Failed',
      text: errorMessageText,
      confirmButtonColor: '#007bff',
      timer: 5000,
    });
  } finally {
    downloadingLease.value = null;
  }
};

const handlePageChange = async (page: number) => {
  if (isLoading.value) return;
  if (page < 1 || page > pagination.value.last_page) return;
  pagination.value.current_page = page;
  await fetchLeases({
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
  await fetchLeases({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const clearSearch = () => {
  searchQuery.value = '';
  pagination.value.current_page = 1;
  fetchLeases({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const debouncedSearch = debounce(() => {
  if (isLoading.value) return;
  pagination.value.current_page = 1;
  fetchLeases({
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
  .table-responsive :deep(th[data-key="status"]),
  .table-responsive :deep(td[data-key="status"]) {
    min-width: 80px;
  }
  .table-responsive :deep(th[data-key="action"]),
  .table-responsive :deep(td[data-key="action"]) {
    min-width: 100px;
  }

  /* Reduce visibility of less critical columns on mobile */
  .table-responsive :deep(th[data-key="start_date"]),
  .table-responsive :deep(td[data-key="start_date"]),
  .table-responsive :deep(th[data-key="end_date"]),
  .table-responsive :deep(td[data-key="end_date"]),
  .table-responsive :deep(th[data-key="terms"]),
  .table-responsive :deep(td[data-key="terms"]),
  .table-responsive :deep(th[data-key="rent_amount"]),
  .table-responsive :deep(td[data-key="rent_amount"]) {
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