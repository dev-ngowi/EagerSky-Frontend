<template>
  <div class="container">
 <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Maintenance Requests</h2>
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, user, description, or status"
          class="w-64"
          @input="debouncedSearch"
        />
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
            @click="openForm(null, 'add')"
          >
            {{ $t('Add Maintenance Request', 'Add Maintenance Request') }}
          </VaButton>
        </div>
      </div>
    </div>

    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="maintenanceRequests"
        striped
        :columns="columns"
        :loading="loadingMaintenanceRequests"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        :hoverable="true"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(status)="{ rowData }">
          <VaSelect
            v-model="rowData.status"
            :options="statusOptions"
            :disabled="updatingStatus && updatingId === rowData.id"
            @update:modelValue="updateStatus(rowData, $event)"
            class="w-32"
            value-by="value"
            text-by="text"
          />
        </template>
        <template #cell(updated_at)="{ rowData }">
          {{ rowData.updated_at_formatted || 'N/A' }}
        </template>
        <template #cell(deleted_at)="{ rowData }">
          {{ rowData.deleted_at_formatted || 'N/A' }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton
            v-if="rowData.contractor_assignment_id && Number.isInteger(rowData.contractor_assignment_id) && rowData.contractor_assignment_id > 0"
            size="small"
            color="info"
            icon="track_changes"
            class="ml-2"
            @click="openTrackProgress(rowData.contractor_assignment_id)"
          >
            Track Progress
          </VaButton>
          <VaButton
            v-else
            size="small"
            color="info"
            icon="person_add"
            class="ml-2"
            @click="openAssignContractor(rowData)"
          >
            Assign Contractor
          </VaButton>
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} maintenance requests
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
    </template>
    <template v-else>
      <MaintenanceRequestForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <MaintenanceRequestEdit
        v-if="formMode === 'edit' && selectedMaintenanceRequest"
        :maintenance-request="selectedMaintenanceRequest"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
      <AssignContractor
        v-if="formMode === 'assign' && selectedMaintenanceRequest"
        :maintenance-request="selectedMaintenanceRequest"
        @close="closeForm"
        @submit="handleContractorAssignment"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Maintenance Request Details', 'Maintenance Request Details') }}</div>
      <div v-if="selectedMaintenanceRequest" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedMaintenanceRequest.property_title || 'N/A' }}</p>
        <p><strong>User:</strong> {{ selectedMaintenanceRequest.user_name || 'N/A' }}</p>
        <p><strong>Description:</strong> {{ selectedMaintenanceRequest.description || 'N/A' }}</p>
        <p><strong>Status:</strong> {{ selectedMaintenanceRequest.status || 'N/A' }}</p>
        <p><strong>Contractor:</strong> {{ selectedMaintenanceRequest.contractor_name || 'Not Assigned' }}</p>
        <p><strong>Updated At:</strong> {{ selectedMaintenanceRequest.updated_at_formatted || 'N/A' }}</p>
        <p v-if="selectedMaintenanceRequest.raw_deleted_at">
          <strong>Deleted At:</strong> {{ selectedMaintenanceRequest.deleted_at_formatted || 'N/A' }}
        </p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>

    <!-- Track Progress Modal -->
    <VaModal
      v-model="showTrackProgress"
      :title="$t('Track Contractor Progress', 'Track Contractor Progress')"
      size="medium"
      close-button
      @ok="closeTrackProgress"
      @cancel="closeTrackProgress"
    >
      <TrackContractorProgress
        v-if="selectedAssignmentId && Number.isInteger(selectedAssignmentId) && selectedAssignmentId > 0"
        :assignment-id="selectedAssignmentId"
        @update="handleProgressUpdated"
        @close="closeTrackProgress"
      />
      <div v-else class="text-red-500">
        Error: Invalid contractor assignment ID.
      </div>
    </VaModal>
  </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import MaintenanceRequestForm from './MaintenanceRequestForm.vue';
import MaintenanceRequestEdit from './MaintenanceRequestEdit.vue';
import AssignContractor from '../assign/AssignContractor.vue';
import TrackContractorProgress from '../progress/TrackContractorProgress.vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import type { MaintenanceRequest, Payload, Pagination } from '../../../../types/maintenanceRequest';

export default defineComponent({
  name: 'MaintenanceRequestList',
  components: {
    MaintenanceRequestForm,
    MaintenanceRequestEdit,
    AssignContractor,
    TrackContractorProgress,
  },
  setup() {
    const maintenanceRequests = ref<MaintenanceRequest[]>([]);
    const loadingMaintenanceRequests = ref<boolean>(false);
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const showTrackProgress = ref<boolean>(false);
    const selectedMaintenanceRequest = ref<MaintenanceRequest | null>(null);
    const selectedAssignmentId = ref<number | null>(null);
    const formMode = ref<'add' | 'edit' | 'assign'>('add');
    const componentKey = ref<number>(0);
    const deleting = ref<boolean>(false);
    const submitting = ref<boolean>(false);
    const updatingStatus = ref<boolean>(false);
    const updatingId = ref<number | null>(null);
    const searchQuery = ref<string>('');
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });

    const statusOptions = [
      { value: 'pending', text: 'Pending' },
      { value: 'in_progress', text: 'In Progress' },
      { value: 'completed', text: 'Completed' },
    ];

    const columns = [
      { key: 'sn', sortable: false, label: 'SN' },
      { key: 'property_title', sortable: true, label: 'Property' },
      { key: 'user_name', sortable: true, label: 'User' },
      { key: 'description', sortable: true, label: 'Description' },
      { key: 'status', sortable: true, label: 'Status' },
      { key: 'contractor_name', label: 'Contractor' },
      { key: 'updated_at', sortable: true, label: 'Updated At' },
      { key: 'deleted_at', sortable: true, label: 'Deleted At' },
      { key: 'actions', sortable: false, label: 'Actions' },
    ];

    const debouncedSearch = debounce(() => {
      getMaintenanceRequests({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    }, 500);

    const debouncedHandleSubmit = debounce((payload: Payload, mode: 'add' | 'edit') => {
      handleSubmit(payload, mode);
    }, 1000, { leading: true, trailing: false });

    const getMaintenanceRequests = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
      loadingMaintenanceRequests.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || pagination.value.current_page,
            per_page: params.per_page || pagination.value.per_page,
            search: params.search || searchQuery.value,
          },
        });
        if (response.status === 200) {
          maintenanceRequests.value = response.data.data.map((request: any) => ({
            id: Number(request.id),
            property_id: request.property_id !== null ? Number(request.property_id) : null,
            property_title: request.property_title || 'N/A',
            user_id: request.user_id !== null ? Number(request.user_id) : null,
            user_name: request.user_name || 'N/A',
            description: request.description || 'N/A',
            status: request.status || 'pending',
            contractor_name: request.contractor_name || 'Not Assigned',
            contractor_assignment_id: request.contractor_assignment_id ? Number(request.contractor_assignment_id) : null,
            raw_updated_at: request.updated_at || null,
            updated_at_formatted: request.updated_at
              ? isValid(parseISO(request.updated_at))
                ? format(parseISO(request.updated_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            raw_deleted_at: request.deleted_at || null,
            deleted_at_formatted: request.deleted_at
              ? isValid(parseISO(request.deleted_at))
                ? format(parseISO(request.deleted_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
          }));
          pagination.value = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          if (maintenanceRequests.value.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No maintenance requests found. Add some requests to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch maintenance requests.');
        }
      } catch (error: any) {
        console.error('getMaintenanceRequests error:', error.response?.data || error);
        let errorMessage = error.response?.data?.message || 'Failed to fetch maintenance requests.';
        if (error.response?.status === 401) {
          errorMessage = 'Your session has expired or the token is invalid. Please log in again.';
          Swal.fire({
            title: 'Authentication Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Go to Login',
          }).then((result) => {
            if (result.isConfirmed) {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('jwt');
              localStorage.removeItem('userProfile');
              import('vue-router').then(({ useRouter }) => {
                const router = useRouter();
                router.push('/login');
              });
            }
          });
          return;
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingMaintenanceRequests.value = false;
      }
    };

    const addMaintenanceRequest = async (payload: Payload) => {
      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        if (response.status === 201) {
          await getMaintenanceRequests({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
          componentKey.value += 1;
        }
        return response;
      } catch (error: any) {
        console.error('addMaintenanceRequest error:', error.response?.data || error);
        throw error;
      } finally {
        submitting.value = false;
      }
    };

    const updateMaintenanceRequest = async (payload: Payload) => {
      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        if (response.status === 200) {
          await getMaintenanceRequests({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
          componentKey.value += 1;
        }
        return response;
      } catch (error: any) {
        console.error('updateMaintenanceRequest error:', error.response?.data || error);
        throw error;
      } finally {
        submitting.value = false;
      }
    };

    const updateStatus = async (maintenanceRequest: MaintenanceRequest, newStatus: string) => {
      updatingStatus.value = true;
      updatingId.value = maintenanceRequest.id;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${maintenanceRequest.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: { status: newStatus },
        });
        if (response.status === 200) {
          maintenanceRequest.status = newStatus;
          Swal.fire({
            title: 'Success!',
            text: 'Maintenance request status updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to update status.');
        }
      } catch (error: any) {
        console.error('updateStatus error:', error.response?.data || error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update maintenance request status.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        updatingStatus.value = false;
        updatingId.value = null;
      }
    };

    const deleteMaintenanceRequest = async (id: number) => {
      deleting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          await getMaintenanceRequests({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
          componentKey.value += 1;
        }
        return response;
      } catch (error: any) {
        console.error('deleteMaintenanceRequest error:', error.response?.data || error);
        throw error;
      } finally {
        deleting.value = false;
      }
    };

    const openForm = (maintenanceRequest: MaintenanceRequest | null = null, mode: 'add' | 'edit' = 'add') => {
      selectedMaintenanceRequest.value = maintenanceRequest;
      formMode.value = mode;
      addEditForm.value = true;
    };

    const openAssignContractor = (maintenanceRequest: MaintenanceRequest) => {
      if (!maintenanceRequest?.id) {
        Swal.fire({
          title: 'Error!',
          text: 'Invalid maintenance request selected.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      selectedMaintenanceRequest.value = maintenanceRequest;
      formMode.value = 'assign';
      addEditForm.value = true;
    };

    const openTrackProgress = (assignmentId: number) => {
      if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
        Swal.fire({
          title: 'Error!',
          text: 'Invalid contractor assignment ID.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      selectedAssignmentId.value = assignmentId;
      showTrackProgress.value = true;
    };

    const closeTrackProgress = () => {
      showTrackProgress.value = false;
      selectedAssignmentId.value = null;
    };

    const closeForm = () => {
      selectedMaintenanceRequest.value = null;
      addEditForm.value = false;
      formMode.value = 'add';
      getMaintenanceRequests({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    };

    const openView = (maintenanceRequest: MaintenanceRequest) => {
      selectedMaintenanceRequest.value = maintenanceRequest;
      showView.value = true;
    };

    const closeView = () => {
      selectedMaintenanceRequest.value = null;
      showView.value = false;
    };

    const confirmDelete = (maintenanceRequest: MaintenanceRequest) => {
      selectedMaintenanceRequest.value = maintenanceRequest;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the maintenance request for "${maintenanceRequest.property_title || 'N/A'}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          handleDelete();
        }
      });
    };

    const handleDelete = async () => {
      if (!selectedMaintenanceRequest.value?.id) return;
      try {
        const response = await deleteMaintenanceRequest(Number(selectedMaintenanceRequest.value.id));
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Maintenance request deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          selectedMaintenanceRequest.value = null;
        } else {
          throw new Error(response.data?.message || 'Failed to delete maintenance request.');
        }
      } catch (error: any) {
        console.error('handleDelete error:', error.response?.data || error);
        let errorMessage = error.response?.data?.message || 'Failed to delete maintenance request.';
        if (error.response?.status === 401) {
          errorMessage = 'Your session has expired or the token is invalid. Please log in again.';
          Swal.fire({
            title: 'Authentication Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Go to Login',
          }).then((result) => {
            if (result.isConfirmed) {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('jwt');
              localStorage.removeItem('userProfile');
              import('vue-router').then(({ useRouter }) => {
                const router = useRouter();
                router.push('/login');
              });
            }
          });
          return;
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    };

    const handleSubmit = async (payload: Payload, mode: 'add' | 'edit') => {
      if (submitting.value) return;
      try {
        let response;
        if (mode === 'add') {
          response = await addMaintenanceRequest(payload);
        } else {
          response = await updateMaintenanceRequest(payload);
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Maintenance request has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          closeForm();
        } else {
          let errorMessage =
            response.data?.message ||
            (mode === 'add' ? 'Failed to add maintenance request.' : 'Failed to update maintenance request.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage = Object.values(response.data.errors).flat().join('; ');
          }
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('handleSubmit error:', error.response?.data || error);
        let errorMessage =
          error.response?.data?.message ||
          (mode === 'add' ? 'Failed to add maintenance request.' : 'Failed to update maintenance request.');
        if (error.response?.status === 401) {
          errorMessage = 'Your session has expired or the token is invalid. Please log in again.';
          Swal.fire({
            title: 'Authentication Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Go to Login',
          }).then((result) => {
            if (result.isConfirmed) {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('jwt');
              localStorage.removeItem('userProfile');
              import('vue-router').then(({ useRouter }) => {
                const router = useRouter();
                router.push('/login');
              });
            }
          });
          return;
        }
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).flat().join('; ');
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    };

    const handleContractorAssignment = async (assignment: any) => {
      closeForm();
      Swal.fire({
        title: 'Success!',
        text: 'Contractor assigned successfully.',
        icon: 'success',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      await getMaintenanceRequests({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };

    const handleProgressUpdated = async () => {
      closeTrackProgress();
      await getMaintenanceRequests({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };

    const handlePageChange = async (page: number) => {
      await getMaintenanceRequests({
        page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };

    const cancelAdding = () => {
      closeForm();
    };

    // Initial data fetch
    getMaintenanceRequests({ page: 1, per_page: 10 });

    return {
      columns,
      maintenanceRequests,
      loadingMaintenanceRequests,
      pagination,
      addEditForm,
      showView,
      showTrackProgress,
      selectedMaintenanceRequest,
      selectedAssignmentId,
      formMode,
      componentKey,
      deleting,
      submitting,
      updatingStatus,
      updatingId,
      searchQuery,
      statusOptions,
      debouncedSearch,
      debouncedHandleSubmit,
      openForm,
      openAssignContractor,
      openTrackProgress,
      closeTrackProgress,
      closeForm,
      openView,
      closeView,
      confirmDelete,
      handleDelete,
      handleSubmit,
      handleContractorAssignment,
      handleProgressUpdated,
      handlePageChange,
      cancelAdding,
      updateStatus,
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
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.text-xl {
  font-size: 1.25rem;
}
.font-bold {
  font-weight: 700;
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
.w-64 {
  width: 16rem;
}
.w-32 {
  width: 8rem;
}
</style>