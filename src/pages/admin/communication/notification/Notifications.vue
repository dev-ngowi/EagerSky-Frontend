<template>
  <div class="bg-white shadow-md rounded-lg p-4 sm:p-6">
    <div class="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
      <h2 class="text-xl font-semibold text-gray-800">Notifications</h2>

      <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        <div class="w-full sm:w-40">
          <VaSelect
            v-model="filters.status"
            label="Filter by Status"
            :options="statusOptions"
            value-by="value"
            text-by="text"
            clearable
            @update:modelValue="debouncedFetchNotifications(1)"
          />
        </div>

        <div class="w-full sm:w-40">
          <VaSelect
            v-model="filters.user_id"
            label="Filter by User"
            :options="users"
            value-by="id"
            text-by="username"
            clearable
            searchable
            @update:modelValue="debouncedFetchNotifications(1)"
          />
        </div>
      </div>
    </div>

    <VaAlert v-if="errorMessage" color="danger" class="mb-4">
      {{ errorMessage }}
    </VaAlert>

    <VaDataTable
      :items="notifications"
      striped
      :columns="columns"
      :loading="loadingNotifications"
      :per-page="pagination.per_page"
      :current-page="pagination.current_page"
      
      @update:currentPage="handlePageChange"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>

      <template #cell(user_name)="{ rowData }">
        <span class="font-medium text-blue-600">{{ rowData.user_name }}</span>
      </template>

      <template #cell(type)="{ rowData }">
        <VaChip size="small" :color="rowData.type === 'email' ? 'info' : 'warning'">
          {{ formatType(rowData.type) }}
        </VaChip>
      </template>

      <template #cell(status)="{ rowData }">
        <VaBadge 
          :color="rowData.status === 'approved' ? 'success' : rowData.status === 'pending' ? 'warning' : 'danger'"
          text-color="white"
          class="font-semibold"
        >
          {{ formatStatus(rowData.status) }}
        </VaBadge>
      </template>

      <template #cell(created_at)="{ rowData }">
        {{ formatDateTime(rowData.created_at) }}
      </template>
      <template #cell(updated_at)="{ rowData }">
        {{ formatDateTime(rowData.updated_at) }}
      </template>

      <template #cell(actions)="{ rowData }">
        <div class="flex space-x-2">
          <VaButton preset="secondary" icon="visibility" size="small" @click="openView(rowData)">View</VaButton>

          <VaButton 
            v-if="rowData.status === 'pending'" 
            preset="secondary" 
            color="success" 
            icon="check" 
            size="small" 
            :loading="isLoading"
            @click="confirmApprove(rowData.id)"
          >
            Approve
          </VaButton>

          <VaButton 
            v-if="rowData.status === 'pending'" 
            preset="secondary" 
            color="warning" 
            icon="close" 
            size="small" 
            :loading="isLoading"
            @click="confirmReject(rowData.id)"
          >
            Reject
          </VaButton>

          <VaButton 
            preset="secondary" 
            color="danger" 
            icon="delete" 
            size="small" 
            :loading="isLoading"
            @click="confirmDelete(rowData.id)"
          >
            Delete
          </VaButton>
        </div>
      </template>
    </VaDataTable>

    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 space-y-2 sm:space-y-0">
      <p class="text-sm text-gray-600">
        Showing 
        <span class="font-semibold">{{ (pagination.current_page - 1) * pagination.per_page + 1 }}</span>
        to 
        <span class="font-semibold">{{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }}</span>
        of 
        <span class="font-semibold">{{ pagination.total }}</span> entries
      </p>

      <div class="flex space-x-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1 || loadingNotifications"
          @click="handlePageChange(pagination.current_page - 1)"
        >
          Previous
        </VaButton>
        <VaButton
          size="small"
          :disabled="pagination.current_page >= pagination.last_page || loadingNotifications"
          @click="handlePageChange(pagination.current_page + 1)"
        >
          Next
        </VaButton>
      </div>
    </div>
  </div>

  <VaModal v-model="showView" title="Notification Details" size="large">
    <div v-if="viewNotification" class="space-y-3">
      <p><strong>ID:</strong> {{ viewNotification.id }}</p>
      <p><strong>User:</strong> {{ viewNotification.user_name }}</p>
      <p><strong>Type:</strong> <VaChip size="small" :color="viewNotification.type === 'email' ? 'info' : 'warning'">{{ formatType(viewNotification.type) }}</VaChip></p>
      <p><strong>Status:</strong> <VaBadge :color="viewNotification.status === 'approved' ? 'success' : viewNotification.status === 'pending' ? 'warning' : 'danger'" text-color="white">{{ formatStatus(viewNotification.status) }}</VaBadge></p>
      <p><strong>Created At:</strong> {{ formatDateTime(viewNotification.created_at) }}</p>
      <p><strong>Updated At:</strong> {{ formatDateTime(viewNotification.updated_at) }}</p>
      <div class="bg-gray-100 p-3 rounded-md">
        <strong>Message:</strong> 
        <p class="mt-1 whitespace-pre-wrap">{{ viewNotification.message }}</p>
      </div>
    </div>
    <div v-else>Loading...</div>
    <template #footer>
      <VaButton @click="closeView">Close</VaButton>
    </template>
  </VaModal>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import { VaDataTable, VaButton, VaSelect, VaChip, VaBadge, VaAlert, VaModal } from 'vuestic-ui';

// --- Type Definitions ---
interface Notification {
  id: number;
  user_name: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface PaginationState {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// Assumed type for makeRequest response data structure
interface ApiResponseData<T> {
    data?: T[];
    meta?: {
        total?: number;
        per_page?: number;
        current_page?: number;
        last_page?: number;
    };
    pagination?: { // Fallback for some Laravel API structures
        total?: number;
        per_page?: number;
        current_page?: number;
        last_page?: number;
    };
    message?: string;
}
type MakeRequestReturnType = Promise<{ status: number; data: ApiResponseData<any> }>;


export default defineComponent({
  name: 'Notifications',
  components: {
    VaDataTable, VaButton, VaSelect, VaChip, VaBadge, VaAlert, VaModal
  },
  setup() {
    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'https://app.eagersky.co.tz';
    const typedMakeRequest = makeRequest as (config: any) => MakeRequestReturnType;

    // State
    const notifications = ref<Notification[]>([]);
    const loadingNotifications = ref<boolean>(false);
    const isLoading = ref<boolean>(false);
    const errorMessage = ref<string>('');
    
    // Filters state
    const filters = reactive<{ status: string; user_id: string | number }>({ status: '', user_id: '' }); 
    
    // Pagination state
    const pagination = reactive<PaginationState>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    
    const viewNotification = ref<Notification | null>(null);
    const users = ref<User[]>([]);
    const showView = ref<boolean>(false);
    

    // Computed
    const columns = [
      { key: 'sn', sortable: false, label: 'SN' },
      { key: 'id', sortable: true, label: 'ID' },
      { key: 'user_name', sortable: true, label: 'User' },
      { key: 'type', sortable: true, label: 'Type' },
      { key: 'message', sortable: true, label: 'Message' },
      { key: 'status', sortable: true, label: 'Status' },
      { key: 'created_at', sortable: true, label: 'Created At' },
      { key: 'updated_at', sortable: true, label: 'Updated At' },
      { key: 'actions', sortable: false, label: 'Actions' },
    ];

    const statusOptions = ref([
      { value: '', text: 'All Statuses' },
      { value: 'pending', text: 'Pending' },
      { value: 'approved', text: 'Approved' },
      { value: 'rejected', text: 'Rejected' },
    ]);

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

    const formatType = (type: string | undefined): string => {
        if (!type) return 'N/A';
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const formatStatus = (status: string | undefined): string => {
        if (!status) return 'N/A';
        return status.charAt(0).toUpperCase() + status.slice(1);
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
    // End Helper Functions

    // API Functions
    const fetchNotifications = async (page: number = 1) => {
      loadingNotifications.value = true;
      errorMessage.value = '';
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          per_page: pagination.per_page.toString(),
          ...(filters.status && { status: filters.status }),
          // Ensure user_id is passed as a string if it exists
          ...(filters.user_id && { user_id: filters.user_id.toString() }),
        }).toString();
        
        const response = await typedMakeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/v1/notifications?${queryParams}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          const responseData = response.data.data || response.data;
          let notificationData = Array.isArray(responseData) ? responseData : (responseData.data || []);

          notifications.value = notificationData.map((notif: any): Notification => ({
            id: notif.id,
            user_name: notif.user_name || 'N/A',
            type: notif.type || 'N/A',
            message: notif.message || 'N/A',
            status: notif.status || 'N/A',
            created_at: notif.created_at || '',
            updated_at: notif.updated_at || '',
          }));

          const meta = response.data.meta || response.data.pagination || {};
          
          // FIX: This section updates the reactive pagination state with fresh data
          pagination.total = meta.total || notifications.value.length || 0;
          pagination.per_page = meta.per_page || 10;
          pagination.current_page = meta.current_page || page;
          pagination.last_page = meta.last_page || (Math.ceil(pagination.total / pagination.per_page) || 1);

          // Handle empty results on a page to move back
          if (notifications.value.length === 0 && pagination.current_page > 1) {
              await fetchNotifications(pagination.current_page - 1);
              return;
          }

          if (notifications.value.length === 0) {
            errorMessage.value = 'No notifications found. Try adjusting the filters.';
          } else {
             errorMessage.value = '';
          }

        } else {
          errorMessage.value = response.data?.message || 'Failed to fetch notifications';
          showToast('error', errorMessage.value);
          notifications.value = [];
        }
      } catch (error: any) {
        console.error('fetchNotifications error:', error.response?.data || error.message);
        errorMessage.value = error.response?.data?.message || error.message || 'Failed to fetch notifications';
        showToast('error', errorMessage.value);
        notifications.value = [];
      } finally {
        loadingNotifications.value = false;
      }
    };

    const debouncedFetchNotifications = debounce(fetchNotifications, 500);

    const fetchUsers = async () => {
      try {
        const response = await typedMakeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/v1/users`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        const userData = Array.isArray(response.data.data) ? response.data.data : [];
        users.value = userData.map((user: any): User => {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
            return {
                id: user.id,
                username: fullName.trim() || user.username || `User #${user.id}`,
            };
        });
      } catch (error: any) {
        console.error('fetchUsers error:', error.response?.data || error.message);
        // Do not show a toast for this, as it's a secondary function
        users.value = [];
      }
    };
    
    // --- Action Handlers Refactored (Approve/Reject/Delete) ---
    const handleAction = async (id: number, action: 'approve' | 'reject' | 'delete') => {
      if (isLoading.value) return;
      isLoading.value = true;
      
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const urlSegment = action === 'delete' ? '' : `/${action}`;
      const successMsg = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'deleted';
      
      try {
        const response = await typedMakeRequest({
          method,
          url: `${API_BASE_URL}/v1/notifications/${id}${urlSegment}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if ([200, 204].includes(response.status)) {
          showToast('success', response.data?.message || `Notification ${successMsg} successfully`);
          // Re-fetch the current page to update the table status or remove the row
          await fetchNotifications(pagination.current_page);
        } else {
          showToast('error', response.data?.message || `Failed to ${action} notification`);
        }
      } catch (error: any) {
        console.error(`${action}Notification error:`, error.response?.data || error.message);
        showToast('error', error.response?.data?.message || `Failed to ${action} notification`);
      } finally {
        isLoading.value = false;
      }
    };

    const confirmApprove = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?', text: 'This notification will be approved and sent to the user!', 
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', 
        confirmButtonText: 'Yes, approve it!', cancelButtonText: 'Cancel', position: 'center', toast: false,
      });
      if (result.isConfirmed) await handleAction(id, 'approve');
    };

    const confirmReject = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?', text: 'This notification will be rejected!', 
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', 
        confirmButtonText: 'Yes, reject it!', cancelButtonText: 'Cancel', position: 'center', toast: false,
      });
      if (result.isConfirmed) await handleAction(id, 'reject');
    };

    const confirmDelete = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?', text: 'This notification will be deleted permanently!', 
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', 
        confirmButtonText: 'Yes, delete it!', cancelButtonText: 'Cancel', position: 'center', toast: false,
      });
      if (result.isConfirmed) await handleAction(id, 'delete');
    };


    const openView = (notification: Notification) => {
      viewNotification.value = { ...notification };
      showView.value = true;
    };

    const closeView = () => {
      viewNotification.value = null;
      showView.value = false;
    };

    // FIX: The core fix for pagination. It takes the *new page number* and fetches data.
    const handlePageChange = async (page: number) => {
        if (page < 1 || page > pagination.last_page || loadingNotifications.value) return;
        await fetchNotifications(page);
    };

    // Lifecycle Hooks
    onMounted(async () => {
      await fetchUsers();
      // Initial data fetch
      await fetchNotifications();
    });

    return {
      notifications,
      loadingNotifications,
      isLoading,
      errorMessage,
      filters,
      pagination,
      viewNotification,
      users,
      showView,
      columns,
      statusOptions,
      formatDateTime,
      formatType,
      formatStatus,
      debouncedFetchNotifications,
      confirmApprove,
      confirmReject,
      confirmDelete,
      openView,
      closeView,
      handlePageChange, 
    };
  },
});
</script>