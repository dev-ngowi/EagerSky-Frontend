<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <!-- Search and Buttons -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="filters.search"
          placeholder="Search by name, email, or subject"
          class="w-64"
          @input="debouncedFetchMessages(1)"
        />
      </div>
      <div class="flex space-x-2">
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
      </div>
    </div>

    <!-- Table or Form -->
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
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
          {{ rowData.is_read ? 'Yes' : 'No' }}
        </template>
        <template #cell(created_at)="{ rowData }">
          {{ formatDateTime(rowData.created_at) }}
        </template>
        <template #cell(updated_at)="{ rowData }">
          {{ formatDateTime(rowData.updated_at) }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton
            size="small"
            color="primary"
            icon="visibility"
            @click="openView(rowData)"
          />
          <VaButton
            size="small"
            color="warning"
            icon="edit"
            class="ml-2"
            @click="openForm(rowData, 'edit')"
          />
          <VaButton
            size="small"
            color="danger"
            icon="delete"
            class="ml-2"
            @click="confirmDelete(rowData.id)"
          />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} messages
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
            size="small"
            :disabled="pagination.current_page === pagination.last_page"
            @click="handlePageChange(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
      <div v-if="messages.length === 0 && !loadingMessages && errorMessage" class="text-center py-4 text-red-500 text-sm">
        {{ errorMessage }}
      </div>
      <div v-else-if="messages.length === 0 && !loadingMessages" class="text-center py-4 text-gray-500 text-sm">
        No messages found. Try adding a new message or adjusting the search.
      </div>
    </template>

    <template v-else>
      <MessageForm
        :message="selectedMessage"
        :mode="formMode"
        @close="cancelForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Message Modal -->
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
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import MessageForm from './MessageForm.vue';

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

export default defineComponent({
  name: 'ClientMessages',
  components: { MessageForm },
  setup() {
    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'https://e1.japango.co.tz';

    // State
    const messages = ref<Message[]>([]);
    const loadingMessages = ref<boolean>(false);
    const isLoading = ref<boolean>(false);
    const errorMessage = ref<string>('');
    const filters = reactive({ search: '' });
    const pagination = reactive({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const selectedMessage = ref<Message | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const componentKey = ref<number>(0);

    // Computed
    const columns = [
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

    // Helper Functions
    const formatDateTime = (date: string | undefined) => {
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
        const response = await makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/v1/client-message?${queryParams}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('fetchMessages response:', response);

        if (response.status === 200) {
          // Handle different possible response structures
          let messageData = response.data.data;
          if (!Array.isArray(messageData)) {
            // If response.data.data is not an array, check alternative structures
            if (response.data.data && Array.isArray(response.data.data.data)) {
              messageData = response.data.data.data; // Nested data (e.g., { data: { data: [...] } })
            } else if (Array.isArray(response.data)) {
              messageData = response.data; // Direct array (e.g., { data: [...] })
            } else {
              console.warn('Unexpected response.data.data format:', response.data);
              messageData = [];
              errorMessage.value = 'Invalid data format received from server';
            }
          }

          messages.value = messageData.map((msg: any) => ({
            id: msg.id,
            name: msg.name || 'N/A',
            email: msg.email || 'N/A',
            subject: msg.subject || 'N/A',
            message: msg.message || 'N/A',
            is_read: !!msg.is_read,
            created_at: msg.created_at || '',
            updated_at: msg.updated_at || '',
          }));

          // Handle pagination metadata
          const paginationData = response.data.pagination || response.data.meta || {};
          pagination.total = paginationData.total || messageData.length || 0;
          pagination.per_page = paginationData.per_page || 10;
          pagination.current_page = paginationData.current_page || page;
          pagination.last_page = paginationData.last_page || 1;

          if (messages.value.length === 0) {
            errorMessage.value = 'No messages found. Try adding a new message or adjusting the search.';
          }
        } else {
          errorMessage.value = response.data?.message || 'Failed to fetch messages';
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

    const debouncedFetchMessages = debounce(fetchMessages, 500);

    const debouncedHandleSubmit = debounce(
      async (payload: any, mode: 'add' | 'edit') => {
        isLoading.value = true;
        try {
          let response;
          if (mode === 'add') {
            response = await makeRequest({
              method: 'POST',
              url: `${API_BASE_URL}/v1/client-message`,
              headers: {
                Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              data: payload,
            });
          } else {
            response = await makeRequest({
              method: 'PUT',
              url: `${API_BASE_URL}/v1/client-message/${payload.id}`,
              headers: {
                Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              data: payload,
            });
          }
          if ([200, 201].includes(response.status)) {
            await fetchMessages(pagination.current_page);
            cancelForm();
            showToast('success', response.data.message || `Message ${mode === 'add' ? 'created' : 'updated'} successfully`);
            componentKey.value++;
          } else {
            showToast('error', response.data?.message || `Failed to ${mode === 'add' ? 'create' : 'update'} message`);
          }
        } catch (error: any) {
          console.error(`${mode}Message error:`, error.response?.data || error.message);
          const errorMessage =
            error.response?.data?.errors &&
            Array.isArray(Object.values(error.response.data.errors)) &&
            Object.values(error.response.data.errors)[0] &&
            Array.isArray(Object.values(error.response.data.errors)[0])
              ? (Object.values(error.response.data.errors)[0] as string[])[0]
              : error.response?.data?.message || `Failed to ${mode === 'add' ? 'create' : 'update'} message`;
          showToast('error', errorMessage);
        } finally {
          isLoading.value = false;
        }
      },
      1000,
      { leading: true, trailing: false }
    );

    const openForm = async (message: Message | null, mode: 'add' | 'edit') => {
      if (message && mode === 'edit') {
        try {
          const response = await makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/v1/client-message/${message.id}`,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          });
          console.log('openForm response:', response);
          if (response.status === 200) {
            selectedMessage.value = {
              id: response.data.data.id,
              name: response.data.data.name || '',
              email: response.data.data.email || '',
              subject: response.data.data.subject || '',
              message: response.data.data.message || '',
              is_read: !!response.data.data.is_read,
              created_at: response.data.data.created_at || '',
              updated_at: response.data.data.updated_at || '',
            };
            formMode.value = mode;
            addEditForm.value = true;
          } else {
            showToast('error', response.data?.message || 'Failed to load message for editing');
          }
        } catch (error: any) {
          console.error('openForm error:', error.response?.data || error.message);
          showToast('error', error.response?.data?.message || 'Failed to load message for editing');
        }
      } else {
        selectedMessage.value = null;
        formMode.value = mode;
        addEditForm.value = true;
      }
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
        const response = await makeRequest({
          method: 'DELETE',
          url: `${API_BASE_URL}/v1/client-message/${id}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteMessage response:', response);
        if (response.status === 204 || response.status === 200) {
          showToast('success', response.data?.message || 'Message deleted successfully');
          await fetchMessages(pagination.current_page);
          componentKey.value++;
        } else {
          showToast('error', response.data?.message || 'Failed to delete message');
        }
      } catch (error: any) {
        console.error('deleteMessage error:', error.response?.data || error.message);
        showToast('error', error.response?.data?.message || 'Failed to delete message');
      } finally {
        isLoading.value = false;
      }
    };

    const handlePageChange = async (page: number) => {
      await fetchMessages(page);
      componentKey.value++;
    };

    // Lifecycle Hooks
    onMounted(async () => {
      await fetchMessages();
    });

    return {
      messages,
      loadingMessages,
      isLoading,
      errorMessage,
      filters,
      pagination,
      selectedMessage,
      formMode,
      addEditForm,
      showView,
      componentKey,
      columns,
      formatDateTime,
      debouncedFetchMessages,
      debouncedHandleSubmit,
      openForm,
      cancelForm,
      openView,
      closeView,
      confirmDelete,
      handlePageChange,
    };
  },
});
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-6 {
  padding: 1.5rem;
}
.p-4 {
  padding: 1rem;
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
.space-y-2 > :not(:last-child) {
  margin-bottom: 0.5rem;
}
.w-64 {
  width: 16rem;
}
.ml-2 {
  margin-left: 0.5rem;
}
.text-sm {
  font-size: 0.875rem;
}
.text-red-500 {
  color: #ef4444;
}
.text-gray-500 {
  color: #6b7280;
}
.text-lg {
  font-size: 1.125rem;
}
.font-bold {
  font-weight: 700;
}
</style>