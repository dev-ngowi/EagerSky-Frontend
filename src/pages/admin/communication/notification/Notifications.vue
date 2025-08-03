<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <!-- Filters -->
    <div class="flex flex-wrap items-center mb-4 space-x-4">
      <div class="w-64">
        <VaSelect
          v-model="filters.status"
          label="Status"
          placeholder="Select status"
          :options="statusOptions"
          clearable
          @update:modelValue="debouncedFetchNotifications(1)"
        />
      </div>
      <div class="w-64">
        <VaSelect
          v-model="filters.user_id"
          label="User"
          placeholder="Select user"
          :options="users"
          value-by="id"
          text-by="username"
          clearable
          @update:modelValue="debouncedFetchNotifications(1)"
        />
      </div>
    </div>

    <!-- Main Content -->
    <VaDataTable
      :key="componentKey"
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
        {{ rowData.user_name || 'N/A' }}
      </template>
      <template #cell(type)="{ rowData }">
        {{ formatType(rowData.type) }}
      </template>
      <template #cell(message)="{ rowData }">
        {{ rowData.message || 'N/A' }}
      </template>
      <template #cell(status)="{ rowData }">
        {{ formatStatus(rowData.status) }}
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
          v-if="rowData.status === 'pending'"
          size="small"
          color="success"
          icon="check_circle"
          class="ml-2"
          @click="confirmApprove(rowData.id)"
        />
        <VaButton
          v-if="rowData.status === 'pending'"
          size="small"
          color="danger"
          icon="cancel"
          class="ml-2"
          @click="confirmReject(rowData.id)"
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
        {{ pagination.total }} notifications
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
    <div v-if="notifications.length === 0 && !loadingNotifications && errorMessage" class="text-center py-4 text-red-500 text-sm">
      {{ errorMessage }}
    </div>
    <div v-else-if="notifications.length === 0 && !loadingNotifications" class="text-center py-4 text-gray-500 text-sm">
      No notifications found. Try adjusting the filters.
    </div>

    <!-- View Notification Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Notification Details</div>
      <div v-if="viewNotification" class="space-y-2">
        <p><strong>User:</strong> {{ viewNotification.user_name || 'N/A' }}</p>
        <p><strong>Type:</strong> {{ formatType(viewNotification.type) }}</p>
        <p><strong>Message:</strong> {{ viewNotification.message || 'N/A' }}</p>
        <p><strong>Status:</strong> {{ formatStatus(viewNotification.status) }}</p>
        <p><strong>Created At:</strong> {{ formatDateTime(viewNotification.created_at) }}</p>
        <p><strong>Updated At:</strong> {{ formatDateTime(viewNotification.updated_at) }}</p>
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
}

export default defineComponent({
  name: 'Notifications',
  setup() {
    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'https://app.eagersky.co.tz';

    // State
    const notifications = ref<Notification[]>([]);
    const loadingNotifications = ref<boolean>(false);
    const isLoading = ref<boolean>(false);
    const errorMessage = ref<string>('');
    const filters = reactive({ status: '', user_id: '' });
    const pagination = reactive({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const viewNotification = ref<Notification | null>(null);
    const users = ref<User[]>([]);
    const showView = ref<boolean>(false);
    const componentKey = ref<number>(0);

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

    const formatType = (type: string | undefined) => {
      if (!type) return 'N/A';
      return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const formatStatus = (status: string | undefined) => {
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

    // API Functions
    const fetchNotifications = async (page: number = 1) => {
      loadingNotifications.value = true;
      errorMessage.value = '';
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          per_page: pagination.per_page.toString(),
          ...(filters.status && { status: filters.status }),
          ...(filters.user_id && { user_id: filters.user_id }),
        }).toString();
        const response = await makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/v1/notifications?${queryParams}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('fetchNotifications response:', response);

        if (response.status === 200) {
          let notificationData = response.data.data;
          if (!Array.isArray(notificationData)) {
            if (response.data.data && Array.isArray(response.data.data.data)) {
              notificationData = response.data.data.data;
            } else if (Array.isArray(response.data)) {
              notificationData = response.data;
            } else {
              console.warn('Unexpected response.data.data format:', response.data);
              notificationData = [];
              errorMessage.value = 'Invalid data format received from server';
            }
          }

          notifications.value = notificationData.map((notif: any) => ({
            id: notif.id,
            user_name: notif.user_name || 'N/A',
            type: notif.type || 'N/A',
            message: notif.message || 'N/A',
            status: notif.status || 'N/A',
            created_at: notif.created_at || '',
            updated_at: notif.updated_at || '',
          }));

          const paginationData = response.data.pagination || response.data.meta || {};
          pagination.total = paginationData.total || notificationData.length || 0;
          pagination.per_page = paginationData.per_page || 10;
          pagination.current_page = paginationData.current_page || page;
          pagination.last_page = paginationData.last_page || 1;

          if (notifications.value.length === 0) {
            errorMessage.value = 'No notifications found. Try adjusting the filters.';
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
        const response = await makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/v1/users`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('fetchUsers response:', response);
        users.value = Array.isArray(response.data.data) ? response.data.data : [];
      } catch (error: any) {
        console.error('fetchUsers error:', error.response?.data || error.message);
        showToast('error', 'Failed to fetch users');
        users.value = [];
      }
    };

    const confirmApprove = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This notification will be approved and sent to the user!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, approve it!',
        cancelButtonText: 'Cancel',
        position: 'center',
        toast: false,
      });
      if (result.isConfirmed) {
        await handleApprove(id);
      }
    };

    const handleApprove = async (id: number) => {
      isLoading.value = true;
      try {
        const response = await makeRequest({
          method: 'POST',
          url: `${API_BASE_URL}/v1/notifications/${id}/approve`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('approveNotification response:', response);
        if (response.status === 200) {
          showToast('success', response.data.message || 'Notification approved successfully');
          await fetchNotifications(pagination.current_page);
          componentKey.value++;
        } else {
          showToast('error', response.data?.message || 'Failed to approve notification');
        }
      } catch (error: any) {
        console.error('approveNotification error:', error.response?.data || error.message);
        showToast('error', error.response?.data?.message || 'Failed to approve notification');
      } finally {
        isLoading.value = false;
      }
    };

    const confirmReject = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This notification will be rejected!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, reject it!',
        cancelButtonText: 'Cancel',
        position: 'center',
        toast: false,
      });
      if (result.isConfirmed) {
        await handleReject(id);
      }
    };

    const handleReject = async (id: number) => {
      isLoading.value = true;
      try {
        const response = await makeRequest({
          method: 'POST',
          url: `${API_BASE_URL}/v1/notifications/${id}/reject`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('rejectNotification response:', response);
        if (response.status === 200) {
          showToast('success', response.data.message || 'Notification rejected successfully');
          await fetchNotifications(pagination.current_page);
          componentKey.value++;
        } else {
          showToast('error', response.data?.message || 'Failed to reject notification');
        }
      } catch (error: any) {
        console.error('rejectNotification error:', error.response?.data || error.message);
        showToast('error', error.response?.data?.message || 'Failed to reject notification');
      } finally {
        isLoading.value = false;
      }
    };

    const confirmDelete = async (id: number) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This notification will be deleted permanently!',
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
          url: `${API_BASE_URL}/v1/notifications/${id}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteNotification response:', response);
        if (response.status === 204 || response.status === 200) {
          showToast('success', response.data.message || 'Notification deleted successfully');
          await fetchNotifications(pagination.current_page);
          componentKey.value++;
        } else {
          showToast('error', response.data?.message || 'Failed to delete notification');
        }
      } catch (error: any) {
        console.error('deleteNotification error:', error.response?.data || error.message);
        showToast('error', error.response?.data?.message || 'Failed to delete notification');
      } finally {
        isLoading.value = false;
      }
    };

    const openView = (notification: Notification) => {
      viewNotification.value = { ...notification };
      showView.value = true;
    };

    const closeView = () => {
      viewNotification.value = null;
      showView.value = false;
    };

    const handlePageChange = async (page: number) => {
      await fetchNotifications(page);
      componentKey.value++;
    };

    // Lifecycle Hooks
    onMounted(async () => {
      await fetchUsers();
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
      componentKey,
      columns,
      statusOptions,
      formatDateTime,
      formatType,
      formatStatus,
      debouncedFetchNotifications,
      fetchUsers,
      confirmApprove,
      handleApprove,
      confirmReject,
      handleReject,
      confirmDelete,
      handleDelete,
      openView,
      closeView,
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