<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <!-- Search and Buttons -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by user, property type, or location"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
      <div class="flex space-x-2">
        <VaButton
          v-if="addEditForm"
          icon="close"
          color="success"
          size="small"
          class="px-4"
          @click="cancelAdding"
        >
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          :disabled="!canCreate"
          @click="openForm(null, 'add')"
        >
          Add Alert
        </VaButton>
      </div>
    </div>

    <!-- Table or Form -->
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="alerts"
        striped
        :columns="columns"
        :loading="loadingAlerts"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(min_price)="{ rowData }">
          {{ formatCurrency(rowData.min_price) }}
        </template>
        <template #cell(max_price)="{ rowData }">
          {{ formatCurrency(rowData.max_price) }}
        </template>
        <template #cell(notification_frequency)="{ rowData }">
          {{ formatFrequency(rowData.notification_frequency) }}
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
            :disabled="!canEdit(rowData)"
            @click="openForm(rowData, 'edit')"
          />
          <VaButton
            size="small"
            color="danger"
            icon="delete"
            class="ml-2"
            :disabled="!canDelete(rowData)"
            @click="confirmDelete(rowData)"
          />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} alerts
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
      <div v-if="alerts.length === 0 && !loadingAlerts && errorMessage" class="text-center py-4 text-red-500 text-sm">
        {{ errorMessage }}
      </div>
      <div v-else-if="alerts.length === 0 && !loadingAlerts" class="text-center py-4 text-gray-500 text-sm">
        No alerts found. Try adding a new alert or adjusting the search.
      </div>
    </template>

    <template v-else>
      <AlertForm
        :alert="selectedAlert"
        :mode="formMode"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Alert Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Alert Details</div>
      <div v-if="selectedAlert" class="space-y-2">
        <p><strong>User:</strong> {{ selectedAlert.username || 'N/A' }}</p>
        <p><strong>Property Category:</strong> {{ selectedAlert.property_category_name || 'N/A' }}</p>
        <p><strong>Min Price:</strong> {{ formatCurrency(selectedAlert.min_price) }}</p>
        <p><strong>Max Price:</strong> {{ formatCurrency(selectedAlert.max_price) }}</p>
        <p><strong>Min Bedrooms:</strong> {{ selectedAlert.min_bedrooms === 'N/A' ? 'N/A' : selectedAlert.min_bedrooms }}</p>
        <p><strong>Max Bedrooms:</strong> {{ selectedAlert.max_bedrooms === 'N/A' ? 'N/A' : selectedAlert.max_bedrooms }}</p>
        <p><strong>Location:</strong> {{ selectedAlert.location_name || 'N/A' }}</p>
        <p><strong>Notification Frequency:</strong> {{ formatFrequency(selectedAlert.notification_frequency) }}</p>
        <p><strong>Created At:</strong> {{ formatDateTime(selectedAlert.created_at) }}</p>
        <p><strong>Updated At:</strong> {{ formatDateTime(selectedAlert.updated_at) }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import AlertForm from './AlertForm.vue';
import { Alert, Payload, ApiResponse, UserOption, LocationOption, PropertyCategoryOption } from '../../../../types/alert';
import { AxiosResponse } from 'axios';
import { format } from 'date-fns';

export default defineComponent({
  name: 'Alerts',
  components: { AlertForm },
  setup() {
    const alerts = ref<Alert[]>([]);
    const searchQuery = ref<string>('');
    const errorMessage = ref<string>('');
    const selectedAlert = ref<Alert | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const componentKey = ref<number>(0);
    const loadingAlerts = ref<boolean>(false);
    const pagination = ref<{
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    }>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const users = ref<UserOption[]>([]);
    const locations = ref<LocationOption[]>([]);
    const propertyCategories = ref<PropertyCategoryOption[]>([]);

    // Computed
    const isAdmin = computed(() => true); // Replace with real auth logic
    const currentUserId = computed(() => 1); // Replace with real user ID from auth
    const canCreate = computed(() => isAdmin.value);
    const canEdit = computed(() => (alert: Alert) => isAdmin.value || currentUserId.value === alert.user_id);
    const canDelete = computed(() => (alert: Alert) => isAdmin.value || currentUserId.value === alert.user_id);

    const columns = computed(() => [
      { key: 'sn', sortable: false, label: 'SN' },
      { key: 'username', sortable: true, label: 'User' },
      { key: 'property_category_name', sortable: true, label: 'Property Category' },
      { key: 'location_name', sortable: true, label: 'Location' },
      { key: 'notification_frequency', sortable: true, label: 'Frequency' },
      { key: 'actions', sortable: false, label: 'Actions' },
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

    const formatCurrency = (value: number | 'N/A' | undefined) => {
      if (value === 'N/A' || value === undefined) return 'N/A';
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
      }).format(value);
    };

    const formatFrequency = (value: string | undefined) => {
      if (!value) return 'N/A';
      return value.charAt(0).toUpperCase() + value.slice(1);
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
    const fetchAlerts = async (page: number = 1) => {
      loadingAlerts.value = true;
      errorMessage.value = '';
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts`,
          method: 'get',
          headers: { Accept: 'application/json' },
          params: {
            page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          },
        }) as AxiosResponse<
          | { data: any[]; message?: string; pagination?: { total: number; per_page: number; current_page: number; last_page: number } }
          | { message: string; errors?: Record<string, string[]> }
        >;

        if (response.status === 200 && 'data' in response.data) {
          alerts.value = response.data.data.map((alert: any) => ({
            id: alert.id,
            user_id: alert.user_id,
            username: alert.user_name || 'N/A',
            property_category_id: alert.property_category_id,
            property_category_name: alert.property_category_name || 'N/A',
            min_price: alert.min_price !== null ? alert.min_price : 'N/A',
            max_price: alert.max_price !== null ? alert.max_price : 'N/A',
            min_bedrooms: alert.min_bedrooms !== null ? alert.min_bedrooms : 'N/A',
            max_bedrooms: alert.max_bedrooms !== null ? alert.max_bedrooms : 'N/A',
            location_id: alert.location_id,
            location_name: alert.location_name || 'N/A',
            notification_frequency: alert.notification_frequency,
            created_at: alert.created_at ? format(new Date(alert.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: alert.updated_at ? format(new Date(alert.updated_at), 'd MMMM yyyy') : 'N/A',
          }));
          pagination.value = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || pagination.value.per_page,
            current_page: response.data.pagination?.current_page || page,
            last_page: response.data.pagination?.last_page || 1,
          };
          if (alerts.value.length === 0) {
            errorMessage.value = 'No alerts found. Try adding a new alert or adjusting the search.';
          }
        } else {
          errorMessage.value = response.data.message || 'Failed to fetch alerts';
          showToast('error', errorMessage.value);
        }
      } catch (error: any) {
        console.error('fetchAlerts error:', error);
        errorMessage.value = error.response?.data?.message || error.message || 'Failed to fetch alerts';
        showToast('error', errorMessage.value);
      } finally {
        loadingAlerts.value = false;
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: { Accept: 'application/json' },
        }) as AxiosResponse<
          | { data: any[]; message?: string; pagination?: any }
          | { message: string; errors?: Record<string, string[]> }
        >;
        if (response.status === 200 && 'data' in response.data) {
          users.value = response.data.data.map((user: any) => ({
            value: user.id,
            text: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username || 'N/A',
          }));
        } else {
          throw new Error(response.data.message || 'Failed to fetch users');
        }
      } catch (error: any) {
        console.error('fetchUsers error:', error);
        showToast('error', error.message || 'Failed to fetch users');
      }
    };

    const fetchLocations = async () => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
          headers: { Accept: 'application/json' },
        }) as AxiosResponse<
          | { data: any[]; message?: string; pagination?: any }
          | { message: string; errors?: Record<string, string[]> }
        >;
        if (response.status === 200 && 'data' in response.data) {
          locations.value = response.data.data.map((location: any) => ({
            value: location.id,
            text: location.name,
          }));
        } else {
          throw new Error(response.data.message || 'Failed to fetch locations');
        }
      } catch (error: any) {
        console.error('fetchLocations error:', error);
        showToast('error', error.message || 'Failed to fetch locations');
      }
    };

    const fetchPropertyCategories = async () => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
          headers: { Accept: 'application/json' },
        }) as AxiosResponse<
          | { data: any[]; message?: string; pagination?: any }
          | { message: string; errors?: Record<string, string[]> }
        >;
        if (response.status === 200 && 'data' in response.data) {
          propertyCategories.value = response.data.data.map((category: any) => ({
            value: category.id,
            text: category.name,
          }));
        } else {
          throw new Error(response.data.message || 'Failed to fetch property categories');
        }
      } catch (error: any) {
        console.error('fetchPropertyCategories error:', error);
        showToast('error', error.message || 'Failed to fetch property categories');
      }
    };

    const debouncedSearch = debounce(fetchAlerts, 500);

    const debouncedHandleSubmit = debounce(
      async (payload: Payload, mode: 'add' | 'edit') => {
        try {
          let response: AxiosResponse<
            | { data: any; message?: string; pagination?: any }
            | { message: string; errors?: Record<string, string[]> }
          >;
          if (mode === 'add') {
            response = await makeRequest({
              url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts`,
              method: 'post',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              data: payload,
            });
          } else {
            response = await makeRequest({
              url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts/${payload.id}`,
              method: 'put',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              data: payload,
            });
          }
          if (response.status === 200 || response.status === 201) {
            await fetchAlerts(pagination.value.current_page);
            closeForm();
            showToast('success', response.data.message || `Alert ${mode === 'add' ? 'created' : 'updated'} successfully`);
            componentKey.value++;
          } else {
            showToast('error', response.data.message || `Failed to ${mode === 'add' ? 'create' : 'update'} alert`);
          }
        } catch (error: any) {
          console.error(`${mode}Alert error:`, error);
          const errorMessage = error.response?.data?.message || `Failed to ${mode === 'add' ? 'create' : 'update'} alert`;
          showToast('error', errorMessage);
        }
      },
      1000,
      { leading: true, trailing: false }
    );

    const openForm = async (alert: Alert | null, mode: 'add' | 'edit') => {
      selectedAlert.value = alert;
      formMode.value = mode;
      addEditForm.value = true;
    };

    const closeForm = () => {
      selectedAlert.value = null;
      addEditForm.value = false;
      formMode.value = 'add';
    };

    const openView = (alert: Alert) => {
      selectedAlert.value = { ...alert };
      showView.value = true;
    };

    const closeView = () => {
      selectedAlert.value = null;
      showView.value = false;
    };

    const cancelAdding = async () => {
      closeForm();
      await fetchAlerts(pagination.value.current_page);
    };

    const confirmDelete = async (alert: Alert) => {
      selectedAlert.value = alert;
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the alert for "${alert.property_category_name}" at "${alert.location_name}". This action cannot be undone.`,
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
        await handleDelete();
      }
    };

    const handleDelete = async () => {
      if (!selectedAlert.value?.id) return;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts/${selectedAlert.value.id}`,
          method: 'delete',
          headers: { Accept: 'application/json' },
        }) as AxiosResponse<
          | { data: any; message?: string; pagination?: any }
          | { message: string; errors?: Record<string, string[]> }
        >;
        if (response.status === 200 || response.status === 204) {
          showToast('success', response.data.message || 'Alert deleted successfully');
          selectedAlert.value = null;
          componentKey.value++;
          await fetchAlerts(pagination.value.current_page);
        } else {
          showToast('error', response.data.message || 'Failed to delete alert');
        }
      } catch (error: any) {
        console.error('deleteAlert error:', error);
        showToast('error', error.response?.data?.message || error.message || 'Failed to delete alert');
      }
    };

    const handlePageChange = async (page: number) => {
      await fetchAlerts(page);
      componentKey.value++;
    };

    // Lifecycle Hooks
    onMounted(async () => {
      await Promise.all([fetchUsers(), fetchPropertyCategories(), fetchLocations(), fetchAlerts()]);
    });

    return {
      alerts,
      searchQuery,
      errorMessage,
      selectedAlert,
      formMode,
      addEditForm,
      showView,
      componentKey,
      loadingAlerts,
      pagination,
      users,
      locations,
      propertyCategories,
      columns,
      canCreate,
      canEdit,
      canDelete,
      formatDateTime,
      formatCurrency,
      formatFrequency,
      openForm,
      closeForm,
      openView,
      closeView,
      cancelAdding,
      confirmDelete,
      handlePageChange,
      debouncedSearch,
      debouncedHandleSubmit,
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