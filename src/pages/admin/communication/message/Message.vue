<template>
  <div class="bg-white shadow-md rounded-lg p-4 sm:p-6">
    <div v-if="loadingMessages" class="loadingSpinner">
      <Loader v-if="hasLoaderComponent" :loading-text="'Loading messages...'" />
      <div v-else>Loading messages...</div>
    </div>
    <div v-else-if="errorMessage" class="text-center py-4 text-red-600">
      {{ errorMessage }}
      <button class="ml-4 text-blue-600 underline" @click="retryFetch">
        Retry
      </button>
    </div>
    <div v-else>
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-4 sm:space-y-0">
        <div class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 w-full sm:w-auto">
          <VaInput
            v-model="filters.search"
            placeholder="Search by name, email, or subject"
            class="w-full sm:w-64"
            :disabled="loadingMessages"
            @input="debouncedFetchMessages(1)"
          />
          <VaButton v-if="filters.search" color="warning" size="small" @click="clearSearch" class="sm:w-auto">
            Clear Search
          </VaButton>
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-full sm:w-32"
            @update:modelValue="debouncedFetchMessages(1)"
          />
        </div>
        <div class="flex space-x-2 w-full sm:w-auto justify-end">
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="px-4"
            @click="openForm(null, 'add')"
          >
            Add Message
          </VaButton>
           <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="px-4"
            @click="cancelForm"
          >
            Done
          </VaButton>
        </div>
      </div>

      <div v-if="!addEditForm">
        <div v-if="!messages || messages.length === 0" class="text-center py-4">
          No messages found. Try adding a new message or adjusting the search.
        </div>
        <VaDataTable
          v-else
          :items="messages"
          striped
          :columns="columns"
          :loading="loadingMessages"
          :per-page="pagination.per_page"
          :current-page="pagination.current_page"
          @update:currentPage="handlePageChange"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </template>
          <template #cell(is_read)="{ rowData }">
            {{ (rowData as Message).is_read ? 'Yes' : 'No' }}
          </template>
          <template #cell(created_at)="{ rowData }">
            {{ formatDateTime((rowData as Message).created_at) }}
          </template>
          <template #cell(updated_at)="{ rowData }">
            {{ formatDateTime((rowData as Message).updated_at) }}
          </template>
          <template #cell(actions)="{ rowData }">
            <VaButton
              size="small"
              color="primary"
              icon="visibility"
              @click="openView(rowData as Message)"
            />
            <VaButton
              size="small"
              color="danger"
              icon="delete"
              class="ml-2"
              @click="confirmDelete((rowData as Message).id)"
            />
          </template>
        </VaDataTable>
        <div v-if="messages && messages.length > 0" class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 space-y-2 sm:space-y-0">
          <div class="text-sm">
            Showing {{ paginationComputed.from }} to {{ paginationComputed.to }} of {{ paginationComputed.total }} messages
          </div>
          <div class="flex space-x-2 overflow-x-auto">
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
              :disabled="pagination.current_page === paginationComputed.last_page"
              @click="handlePageChange(pagination.current_page + 1)"
            >
              Next
            </VaButton>
          </div>
        </div>
      </div>
      <MessageForm
        v-else
        :message="selectedMessage"
        :mode="formMode"
        @close="cancelForm"
        @submit="debouncedHandleSubmit"
      />
      <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
        <div class="text-lg font-bold mb-4">Message Details</div>
        <div v-if="selectedMessage" class="space-y-2">
          <p><strong>Name:</strong> {{ selectedMessage.name || 'N/A' }}</p>
          <p><strong>Email:</strong> {{ selectedMessage.email || 'N/A' }}</p>
          <p><strong>Subject:</strong> {{ selectedMessage.subject || 'N/A' }}</p>
          <p><strong>Message:</strong> {{ selectedMessage.message || 'N/A' }}</p>
          <p><strong>Read Status:</strong> {{ selectedMessage.is_read ? 'Read' : 'Unread' }}</p>
          <p><strong>Created At:</strong> {{ formatDateTime(selectedMessage.created_at) }}</p>
          <p><strong>Updated At:</strong> {{ formatDateTime(selectedMessage.updated_at) }}</p>
        </div>
        <div class="flex justify-end mt-4">
          <VaButton color="secondary" @click="closeView">Close</VaButton>
        </div>
      </VaModal>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import MessageForm from './MessageForm.vue';
import Loader from '../../../../components/Loader.vue';

// --- Type Definitions for TypeScript Safety ---

interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginationState {
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

// Type for VaDataTable columns
interface DataColumn {
  key: keyof (Message & { sn: unknown; actions: unknown }); // Include virtual keys 'sn' and 'actions'
  sortable?: boolean;
  label: string;
}

// Type for the API response structure to ensure type safety on data parsing
interface ApiResponse<T> {
    data: {
        data: T | T[];
        total?: number;
        per_page?: number;
        current_page?: number;
        last_page?: number;
    };
    status: number;
    message?: string;
    errors?: Record<string, string[]>;
}

// The utility type to ensure the `makeRequest` returns a consistent structure.
type MakeRequestReturnType<T> = Promise<{ status: number; data: ApiResponse<T> | Record<string, any> }>;


export default defineComponent({
  name: 'ClientMessages',
  components: { MessageForm, Loader },
  setup() {
    // Casting makeRequest to the assumed type to satisfy TS
    const typedMakeRequest = makeRequest as <T>(config: any) => MakeRequestReturnType<T>;

    const API_BASE_URL: string = import.meta.env.VITE_APP_API_BASE_URL || 'https://app.eagersky.co.tz';

    // State
    const messages = ref<Message[]>([]);
    const loadingMessages = ref<boolean>(false);
    const isLoading = ref<boolean>(false);
    const errorMessage = ref<string>('');
    const filters = reactive<{ search: string }>({ search: '' });
    const pagination = reactive<PaginationState>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });
    const selectedMessage = ref<Message | null>(null);
    // formMode only needs to support 'add' now, but keeping 'add' | 'edit' for compatibility
    const formMode = ref<'add' | 'edit'>('add');
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const hasLoaderComponent = ref<boolean>(true);
    const perPageOptions = ref<PerPageOption[]>([
      { value: 10, text: '10' },
      { value: 25, text: '25' },
      { value: 50, text: '50' },
      { value: 100, text: '100' },
      { value: -1, text: 'All' },
    ]);
    const maxRetries = 3;
    const retryDelay = 2000;

    // Computed
    const columns: DataColumn[] = [
      { key: 'sn', sortable: false, label: 'SN' },
      { key: 'id', sortable: true, label: 'ID' },
      { key: 'name', sortable: true, label: 'Name' },
      { key: 'email', sortable: true, label: 'Email' },
      { key: 'subject', sortable: true, label: 'Subject' },
      { key: 'is_read', sortable: true, label: 'Read Status' },
      { key: 'created_at', sortable: true, label: 'Created At' },
      { key: 'updated_at', sortable: true, label: 'Updated At' },
      { key: 'actions', sortable: false, label: 'Actions' },
    ];

    const paginationComputed = computed<PaginationState>(() => {
        const total = pagination.total;
        const perPage = Math.max(pagination.per_page, 1); // Avoid division by zero/negative
        const currentPage = pagination.current_page;
        const lastPage = perPage === -1 ? 1 : Math.ceil(total / perPage) || 1;
        const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
        const to = perPage === -1 ? total : Math.min(currentPage * perPage, total);

        return {
            ...pagination, // Spread the original properties
            last_page: lastPage,
            from: from,
            to: to,
        };
    });


    const paginationPages = computed(() => {
      if (pagination.per_page === -1) return [];
      const pages: number[] = [];
      const lastPage = paginationComputed.value.last_page;
      const current = pagination.current_page;
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

    // Helper Functions
    const formatDateTime = (date: string | undefined): string => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const showToast = (icon: 'success' | 'error', title: string) => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon,
        title,
      });
    };

    const fetchWithRetry = async <T>(fn: () => MakeRequestReturnType<T>, retries: number, delay: number): Promise<Awaited<MakeRequestReturnType<T>> | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            errorMessage.value = 'Failed to load messages. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    };

    // API Functions
    const fetchMessages = async (page: number = 1) => {
      loadingMessages.value = true;
      errorMessage.value = '';
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          per_page: pagination.per_page.toString(),
          ...(filters.search && { search: filters.search }),
        }).toString();

        const response = await fetchWithRetry<Message>(
          () =>
            typedMakeRequest({
              method: 'GET',
              url: `${API_BASE_URL}/v1/client-message?${queryParams}`,
              headers: {
                Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
                Accept: 'application/json',
              },
            }),
          maxRetries,
          retryDelay
        );

        if (response && response.status === 200) {
          const apiData = response.data as ApiResponse<Message>;
          let messageData = Array.isArray(apiData.data.data) ? apiData.data.data : apiData.data.data ? [apiData.data.data] : [];

          messages.value = messageData.map((msg: any) => ({
            id: msg.id,
            name: msg.name || 'N/A',
            email: msg.email || 'N/A',
            subject: msg.subject || 'N/A',
            message: msg.message || 'N/A',
            is_read: !!msg.is_read,
            created_at: msg.created_at || '',
            updated_at: msg.updated_at || '',
          })) as Message[];

          // Update pagination metadata, using nullish coalescing to safely get values
          pagination.total = Number(apiData.data.total) ?? messages.value.length;
          pagination.per_page = Number(apiData.data.per_page) ?? pagination.per_page;
          pagination.current_page = Number(apiData.data.current_page) ?? page;
          pagination.last_page = Number(apiData.data.last_page) ?? paginationComputed.value.last_page;


          // Ensure current_page is within valid bounds
          if (pagination.current_page > paginationComputed.value.last_page && pagination.per_page !== -1 && paginationComputed.value.last_page > 0) {
            pagination.current_page = paginationComputed.value.last_page;
            await fetchMessages(pagination.current_page);
            return;
          }

          if (messages.value.length === 0 && !filters.search) {
             errorMessage.value = 'No messages found. Try adding a new message.';
          } else if (messages.value.length === 0 && filters.search) {
             errorMessage.value = 'No messages found for your current search. Try adjusting the search.';
          }

        } else {
          errorMessage.value = response?.data?.message || 'Failed to fetch messages';
          showToast('error', errorMessage.value);
          messages.value = [];
        }
      } catch (error: any) {
        console.error('fetchMessages error:', error.response?.data || error.message);
        errorMessage.value = error.response?.data?.message || error.message || 'Failed to fetch messages';
        showToast('error', errorMessage.value);
        messages.value = [];
      } finally {
        loadingMessages.value = false;
      }
    };

    const debouncedFetchMessages = debounce((page: number = 1) => {
      pagination.current_page = page;
      fetchMessages(page);
    }, 500);

    const retryFetch = async () => {
      errorMessage.value = '';
      await fetchMessages(pagination.current_page);
    };

    const clearSearch = () => {
      filters.search = '';
      debouncedFetchMessages(1);
    };

    // debouncedHandleSubmit logic is now only relevant for 'add' mode, as 'edit' is removed.
    const debouncedHandleSubmit = debounce(
      async (payload: any, mode: 'add' | 'edit') => {
        if (mode === 'edit') return; // Ignore 'edit' submissions

        isLoading.value = true;
        try {
          const config = {
            method: 'POST',
            url: `${API_BASE_URL}/v1/client-message`,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: payload,
          };

          const response = await typedMakeRequest<Message>(config);

          if ([200, 201].includes(response.status)) {
            await fetchMessages(1); // Fetch the first page to see the new message
            cancelForm();
            showToast('success', (response.data as ApiResponse<any>).message || `Message created successfully`);
          } else {
             const apiResponse = response.data as ApiResponse<any>;
             showToast('error', apiResponse.message || `Failed to create message`);
          }
        } catch (error: any) {
          console.error(`add Message error:`, error.response?.data || error.message);
          const errorResponse = error.response?.data as ApiResponse<any> | undefined;
          let errorMsg = `Failed to create message`;

          if (errorResponse?.errors) {
            const firstErrorKey = Object.keys(errorResponse.errors)[0];
            const firstErrorMessage = errorResponse.errors[firstErrorKey]?.[0];
            if (firstErrorMessage) {
              errorMsg = firstErrorMessage;
            } else if (errorResponse.message) {
              errorMsg = errorResponse.message;
            }
          } else if (error.response?.data?.message) {
             errorMsg = error.response.data.message;
          } else if (error.message) {
             errorMsg = error.message;
          }

          showToast('error', errorMsg);
        } finally {
          isLoading.value = false;
        }
      },
      1000,
      { leading: true, trailing: false }
    );

    const openForm = async (message: Message | null, mode: 'add' | 'edit') => {
      // Allow 'add' mode, but block 'edit' mode.
      if (mode === 'edit') {
        console.warn('Edit functionality is disabled.');
        return;
      }
      
      selectedMessage.value = null;
      formMode.value = mode;
      addEditForm.value = true;
    };

    const cancelForm = async () => {
      selectedMessage.value = null;
      formMode.value = 'add';
      addEditForm.value = false;
      await fetchMessages(pagination.current_page);
    };

    const openView = (message: Message) => {
      selectedMessage.value = { ...message };
      showView.value = true;
    };

    const closeView = () => {
      selectedMessage.value = null;
      showView.value = false;
    };

    const confirmDelete = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This message will be deleted permanently!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        position: 'center',
        toast: false,
      });
      if (result.isConfirmed) {
        await handleDelete(id);
      }
    };

    const handleDelete = async (id: number) => {
      isLoading.value = true;
      try {
        const response = await typedMakeRequest<any>({
          method: 'DELETE',
          url: `${API_BASE_URL}/v1/client-message/${id}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 204 || response.status === 200) {
          showToast('success', (response.data as ApiResponse<any>).message || 'Message deleted successfully');
          // Adjust page if current page is empty
          if (messages.value.length === 1 && pagination.current_page > 1 && pagination.per_page !== -1) {
            pagination.current_page--;
          }
          await fetchMessages(pagination.current_page);
        } else {
          showToast('error', (response.data as ApiResponse<any>).message || 'Failed to delete message');
        }
      } catch (error: any) {
        console.error('deleteMessage error:', error.response?.data || error.message);
        showToast('error', error.response?.data?.message || 'Failed to delete message');
      } finally {
        isLoading.value = false;
      }
    };

    const handlePageChange = async (page: number) => {
      if (pagination.per_page === -1) return; // No pagination for "All"
      if (page < 1 || page > paginationComputed.value.last_page) return; // Prevent invalid page navigation

      pagination.current_page = page;
      await fetchMessages(page);
    };

    // Lifecycle Hooks
    onMounted(async () => {
      // Check for Loader component existence
      try {
        await import('../../../../components/Loader.vue');
      } catch (error) {
        console.warn('Loader component not found, using fallback:', error);
        hasLoaderComponent.value = false;
      }
      await fetchMessages();
    });

    return {
      messages,
      loadingMessages,
      isLoading,
      errorMessage,
      filters,
      pagination: pagination,
      selectedMessage,
      formMode,
      addEditForm,
      showView,
      hasLoaderComponent,
      columns,
      perPageOptions,
      paginationPages,
      paginationComputed,
      formatDateTime,
      debouncedFetchMessages,
      debouncedHandleSubmit,
      openForm,
      cancelForm,
      openView,
      closeView,
      confirmDelete,
      handlePageChange,
      retryFetch,
      clearSearch,
    };
  },
});
</script>

<style scoped>
/*
  The styles are the same as the previous responsive version.
  The changes were primarily in the template and script logic.
*/
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
/* Simplified padding for better mobile feel */
.p-4 {
  padding: 1rem;
}
.p-6 {
  padding: 1.5rem;
}
.sm\:p-6 {
  /* Only apply the larger padding on small screens and up */
  @media (min-width: 640px) {
    padding: 1.5rem;
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
.flex-col {
  flex-direction: column;
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
.space-y-2 > :not(:last-child) {
  margin-bottom: 0.5rem;
}
.space-y-4 > :not(:last-child) {
  margin-bottom: 1rem;
}
.w-full {
  width: 100%;
}
.sm\:flex-row {
  @media (min-width: 640px) {
    flex-direction: row;
  }
}
.sm\:w-64 {
  @media (min-width: 640px) {
    width: 16rem;
  }
}
.sm\:w-32 {
  @media (min-width: 640px) {
    width: 8rem;
  }
}
.sm\:w-auto {
  @media (min-width: 640px) {
    width: auto;
  }
}
.sm\:space-x-4 > :not(:last-child) {
  @media (min-width: 640px) {
    margin-right: 1rem;
  }
}
.sm\:space-y-0 > :not(:last-child) {
  @media (min-width: 640px) {
    margin-bottom: 0;
  }
}

.ml-2 {
  margin-left: 0.5rem;
}
.text-sm {
  font-size: 0.875rem;
}
.text-red-600 {
  color: #dc2626;
}
.text-blue-600 {
  color: #2563eb;
}
.text-lg {
  font-size: 1.125rem;
}
.font-bold {
  font-weight: 700;
}
.loadingSpinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style>