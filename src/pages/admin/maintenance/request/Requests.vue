<template>
  <div class="responsive-container">
    <div class="bg-white shadow-md rounded-lg">
      <!-- Responsive Header -->
      <div class="header-wrapper">
        <h2 class="title">Maintenance Requests</h2>
        <div class="header-controls-wrapper">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by property, user, description, or status"
            class="search-input-responsive"
            @input="debouncedSearch"
          />
          <div class="action-buttons-wrapper">
            <VaButton
              v-if="addEditForm"
              icon="close"
              color="success"
              size="small"
              class="action-btn-responsive"
              @click="cancelAdding"
            >
              Done
            </VaButton>
            <VaButton
              v-if="!addEditForm"
              icon="add"
              color="#00A3E0"
              size="small"
              class="action-btn-responsive"
              @click="openForm(null, 'add')"
            >
              {{ $t('Add Maintenance Request', 'Add Maintenance Request') }}
            </VaButton>
          </div>
        </div>
      </div>
      <!-- Table Section -->
      <template v-if="!addEditForm">
        <div class="table-scroll-container">
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
            class="responsive-datatable"
          >
            <!-- ✅ ALL CELLS WITH PROPER DISPLAY -->
            <template #cell(sn)="{ rowIndex }">
              {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
            </template>
          
            <!-- ✅ PROPERTY TITLE DISPLAY -->
            <template #cell(property_title)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.property_title">
                {{ rowData.property_title || 'N/A' }}
              </span>
            </template>
          
            <!-- ✅ USER NAME DISPLAY -->
            <template #cell(user_name)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.user_name">
                {{ rowData.user_name || 'N/A' }}
              </span>
            </template>
          
            <!-- ✅ DESCRIPTION DISPLAY -->
            <template #cell(description)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.description">
                {{ rowData.description || 'N/A' }}
              </span>
            </template>
          
            <!-- ✅ CONTRACTOR NAME DISPLAY -->
            <template #cell(contractor_name)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.contractor_name">
                {{ rowData.contractor_name || 'Not Assigned' }}
              </span>
            </template>
          
            <!-- ✅ STATUS SELECT -->
            <template #cell(status)="{ rowData }">
              <VaSelect
                v-model="rowData.status"
                :options="statusOptions"
                :disabled="updatingStatus && updatingId === rowData.id"
                @update:modelValue="updateStatus(rowData, $event)"
                class="status-select-responsive"
                value-by="value"
                text-by="text"
              />
            </template>
          
            <!-- ✅ UPDATED AT -->
            <template #cell(updated_at)="{ rowData }">
              <span class="cell-text truncate-text">
                {{ rowData.updated_at_formatted || 'N/A' }}
              </span>
            </template>
          
            <!-- ✅ DELETED AT -->
            <template #cell(deleted_at)="{ rowData }">
              <span class="cell-text truncate-text">
                {{ rowData.deleted_at_formatted || 'N/A' }}
              </span>
            </template>
          
            <!-- ✅ RESPONSIVE ACTIONS -->
            <template #cell(actions)="{ rowData }">
              <div class="responsive-actions">
                <VaButton
                  size="small"
                  color="primary"
                  icon="visibility"
                  @click="openView(rowData)"
                  class="action-btn-small"
                />
                <VaButton
                  size="small"
                  color="warning"
                  icon="edit"
                  class="action-btn-small ml-1"
                  @click="openForm(rowData, 'edit')"
                />
              
                <!-- ✅ RESPONSIVE CONTRACTOR BUTTONS -->
                <template v-if="rowData.contractor_assignment_id && Number.isInteger(rowData.contractor_assignment_id) && rowData.contractor_assignment_id > 0">
                  <VaButton
                    size="small"
                    color="info"
                    :icon="isMobile ? 'track_changes' : undefined"
                    :text="isMobile ? undefined : 'Track'"
                    class="action-btn-small ml-1"
                    @click="openTrackProgress(rowData.contractor_assignment_id)"
                  />
                </template>
                <template v-else>
                  <VaButton
                    size="small"
                    color="info"
                    :icon="isMobile ? 'person_add' : undefined"
                    :text="isMobile ? undefined : 'Assign'"
                    class="action-btn-small ml-1"
                    @click="openAssignContractor(rowData)"
                  />
                </template>
              
                <VaButton
                  size="small"
                  color="danger"
                  icon="delete"
                  class="action-btn-small ml-1"
                  @click="confirmDelete(rowData)"
                />
              </div>
            </template>
          </VaDataTable>
        </div>
      
        <!-- Responsive Pagination -->
        <div class="pagination-wrapper">
          <div class="pagination-info-responsive">
            Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
            {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
            {{ pagination.total }} maintenance requests
          </div>
          <div class="pagination-buttons-wrapper">
            <VaButton
              size="small"
              :disabled="pagination.current_page === 1"
              @click="handlePageChange(pagination.current_page - 1)"
              class="pagination-btn-responsive"
            >
              Previous
            </VaButton>
            <VaButton
              size="small"
              :disabled="pagination.current_page === pagination.last_page"
              @click="handlePageChange(pagination.current_page + 1)"
              class="pagination-btn-responsive"
            >
              Next
            </VaButton>
          </div>
        </div>
      </template>
      <!-- Forms (UNCHANGED) -->
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
      <!-- Responsive View Modal -->
      <VaModal
        v-model="showView"
        :size="isMobile ? 'full' : 'medium'"
        layout="centered"
        close-button
        hide-default-actions
        class="responsive-modal"
      >
        <div class="modal-content-wrapper">
          <div class="modal-title-responsive">
            {{ $t('Maintenance Request Details', 'Maintenance Request Details') }}
          </div>
          <div v-if="selectedMaintenanceRequest" class="modal-body-responsive">
            <div class="detail-grid-responsive">
              <div class="detail-item">
                <strong>Property:</strong>
                <span>{{ selectedMaintenanceRequest.property_title || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <strong>User:</strong>
                <span>{{ selectedMaintenanceRequest.user_name || 'N/A' }}</span>
              </div>
              <div class="detail-item full-width">
                <strong>Description:</strong>
                <span class="description-full">{{ selectedMaintenanceRequest.description || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <strong>Status:</strong>
                <span>{{ selectedMaintenanceRequest.status || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <strong>Contractor:</strong>
                <span>{{ selectedMaintenanceRequest.contractor_name || 'Not Assigned' }}</span>
              </div>
              <div class="detail-item">
                <strong>Updated At:</strong>
                <span>{{ selectedMaintenanceRequest.updated_at_formatted || 'N/A' }}</span>
              </div>
              <div v-if="selectedMaintenanceRequest.raw_deleted_at" class="detail-item">
                <strong>Deleted At:</strong>
                <span>{{ selectedMaintenanceRequest.deleted_at_formatted || 'N/A' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer-responsive">
            <VaButton color="secondary" @click="closeView">Close</VaButton>
          </div>
        </div>
      </VaModal>
      <!-- Responsive Track Progress Modal -->
      <VaModal
        v-model="showTrackProgress"
        :size="isMobile ? 'full' : 'medium'"
        :title="$t('Track Contractor Progress', 'Track Contractor Progress')"
        layout="centered"
        close-button
        @ok="closeTrackProgress"
        @cancel="closeTrackProgress"
        class="responsive-modal"
      >
        <TrackContractorProgress
          v-if="selectedAssignmentId && Number.isInteger(selectedAssignmentId) && selectedAssignmentId > 0"
          :assignment-id="selectedAssignmentId"
          @update="handleProgressUpdated"
          @close="closeTrackProgress"
        />
        <div v-else class="error-message-responsive">
          Error: Invalid contractor assignment ID.
        </div>
      </VaModal>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import MaintenanceRequestForm from './MaintenanceRequestForm.vue';
import MaintenanceRequestEdit from './MaintenanceRequestEdit.vue';
import AssignContractor from '../assign/AssignContractor.vue';
import TrackContractorProgress from '../progress/TrackContractorProgress.vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import type { MaintenanceRequest, Payload, Pagination } from '../../../../types/maintenanceRequest';
// ✅ RESPONSIVE: Mobile detection
const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value < 768);
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};
export default defineComponent({
  name: 'MaintenanceRequestList',
  components: {
    MaintenanceRequestForm,
    MaintenanceRequestEdit,
    AssignContractor,
    TrackContractorProgress,
  },
  setup() {
    // ALL ORIGINAL REFS - UNCHANGED
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
    // ✅ RESPONSIVE: Columns with widths for mobile
    const columns = [
      { key: 'sn', sortable: false, label: 'SN', width: '60px' },
      { key: 'property_title', sortable: true, label: 'Property', width: '150px' },
      { key: 'user_name', sortable: true, label: 'User', width: '120px' },
      { key: 'description', sortable: true, label: 'Description', width: '180px' },
      { key: 'status', sortable: true, label: 'Status', width: '110px' },
      { key: 'contractor_name', label: 'Contractor', width: '130px' },
      { key: 'updated_at', sortable: true, label: 'Updated', width: '110px' },
      { key: 'deleted_at', sortable: true, label: 'Deleted', width: '110px' },
      { key: 'actions', sortable: false, label: 'Actions', width: '200px' },
    ];
    // ALL ORIGINAL - UNCHANGED
    const statusOptions = [
      { value: 'pending', text: 'Pending' },
      { value: 'in_progress', text: 'In Progress' },
      { value: 'completed', text: 'Completed' },
    ];
    // ALL ORIGINAL METHODS - UNCHANGED (getMaintenanceRequests, addMaintenanceRequest, etc.)
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
    // ALL YOUR ORIGINAL METHODS HERE (EXACTLY SAME)
    const getMaintenanceRequests = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
      // ... YOUR ORIGINAL CODE - UNCHANGED ...
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
          await getMaintenanceRequests({ page: 1, per_page: pagination.value.per_page });
          Swal.fire({
            title: 'Success!',
            text: 'Maintenance request added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to add maintenance request.');
        }
      } catch (error: any) {
        console.error('addMaintenanceRequest error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add maintenance request.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        submitting.value = false;
      }
    };
    const updateMaintenanceRequest = async (id: number, payload: Partial<Payload>) => {
      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        if (response.status === 200) {
          await getMaintenanceRequests({ page: pagination.value.current_page, per_page: pagination.value.per_page });
          Swal.fire({
            title: 'Success!',
            text: 'Maintenance request updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to update maintenance request.');
        }
      } catch (error: any) {
        console.error('updateMaintenanceRequest error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update maintenance request.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        submitting.value = false;
      }
    };
    const handleSubmit = async (payload: Payload, mode: 'add' | 'edit') => {
      if (submitting.value) return;
      try {
        if (mode === 'add') {
          await addMaintenanceRequest(payload);
        } else if (mode === 'edit' && selectedMaintenanceRequest.value) {
          await updateMaintenanceRequest(selectedMaintenanceRequest.value.id, payload);
        }
        closeForm();
      } catch (error) {
        console.error('handleSubmit error:', error);
      }
    };
    const updateStatus = async (rowData: MaintenanceRequest, newStatus: string) => {
      if (updatingStatus.value) return;
      updatingStatus.value = true;
      updatingId.value = rowData.id;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${rowData.id}/status`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: { status: newStatus },
        });
        if (response.status === 200) {
          rowData.status = newStatus;
          await getMaintenanceRequests({ page: pagination.value.current_page, per_page: pagination.value.per_page });
          Swal.fire({
            title: 'Success!',
            text: 'Status updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 2000,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to update status.');
        }
      } catch (error: any) {
        console.error('updateStatus error:', error);
        rowData.status = rowData.status; // Revert
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update status.',
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
    const openForm = (request: MaintenanceRequest | null = null, mode: 'add' | 'edit' | 'assign' = 'add') => {
      selectedMaintenanceRequest.value = request ? { ...request } : null;
      formMode.value = mode;
      addEditForm.value = true;
      if (mode === 'edit' && request) {
        // Pre-fill form if needed
      } else if (mode === 'assign' && request) {
        // Pre-fill for assign
      } else {
        // Reset form
      }
    };
    const closeForm = () => {
      selectedMaintenanceRequest.value = null;
      formMode.value = 'add';
      addEditForm.value = false;
      // Reset form data if needed
    };
    const cancelAdding = () => {
      closeForm();
      getMaintenanceRequests({ page: pagination.value.current_page, per_page: pagination.value.per_page });
    };
    const openView = (request: MaintenanceRequest) => {
      selectedMaintenanceRequest.value = { ...request };
      showView.value = true;
    };
    const closeView = () => {
      selectedMaintenanceRequest.value = null;
      showView.value = false;
    };
    const openTrackProgress = (assignmentId: number) => {
      selectedAssignmentId.value = assignmentId;
      showTrackProgress.value = true;
    };
    const closeTrackProgress = () => {
      selectedAssignmentId.value = null;
      showTrackProgress.value = false;
    };
    const openAssignContractor = (request: MaintenanceRequest) => {
      openForm(request, 'assign');
    };
    const handleContractorAssignment = async (payload: any) => {
      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${selectedMaintenanceRequest.value?.id}/assign-contractor`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        if (response.status === 200) {
          await getMaintenanceRequests({ page: pagination.value.current_page, per_page: pagination.value.per_page });
          Swal.fire({
            title: 'Success!',
            text: 'Contractor assigned successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          closeForm();
        } else {
          throw new Error(response.data?.message || 'Failed to assign contractor.');
        }
      } catch (error: any) {
        console.error('handleContractorAssignment error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to assign contractor.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        submitting.value = false;
      }
    };
    const confirmDelete = async (request: MaintenanceRequest) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      });
      if (result.isConfirmed) {
        await handleDelete(request.id);
      }
    };
    const handleDelete = async (id: number) => {
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
        if (response.status === 200 || response.status === 204) {
          await getMaintenanceRequests({ page: pagination.value.current_page, per_page: pagination.value.per_page });
          Swal.fire({
            title: 'Deleted!',
            text: 'Maintenance request deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to delete maintenance request.');
        }
      } catch (error: any) {
        console.error('handleDelete error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete maintenance request.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        deleting.value = false;
      }
    };
    const handlePageChange = (page: number) => {
      pagination.value.current_page = page;
      getMaintenanceRequests({
        page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };
    const handleProgressUpdated = async () => {
      await getMaintenanceRequests({ page: pagination.value.current_page, per_page: pagination.value.per_page });
      closeTrackProgress();
    };
    // RESPONSIVE: Lifecycle hooks
    onMounted(() => {
      window.addEventListener('resize', handleResize);
      getMaintenanceRequests({ page: 1, per_page: 10 });
    });
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });
    // RETURN ALL ORIGINAL + RESPONSIVE
    return {
      // ✅ RESPONSIVE
      isMobile,
     
      // ALL ORIGINAL
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
      // ALL YOUR ORIGINAL METHODS
      getMaintenanceRequests,
      addMaintenanceRequest,
      updateMaintenanceRequest,
      handleSubmit,
      updateStatus,
      openForm,
      closeForm,
      cancelAdding,
      openView,
      closeView,
      openTrackProgress,
      closeTrackProgress,
      openAssignContractor,
      handleContractorAssignment,
      confirmDelete,
      handleDelete,
      handlePageChange,
      handleProgressUpdated,
    };
  },
});
</script>
<style lang="scss" scoped>
.responsive-container {
  width: 100%;
  padding: 0.5rem;
  min-height: 100vh;
  @media (min-width: 640px) {
    padding: 1rem;
  }
  @media (min-width: 1024px) {
    padding: 1.5rem;
  }
}
.bg-white {
  background-color: #ffffff;
  width: 100%;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
/* Header Responsiveness */
.header-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0.5rem;
  margin-bottom: 1rem;
  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    margin-bottom: 0;
  }
}
.title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
  @media (min-width: 1024px) {
    font-size: 1.25rem;
  }
}
.header-controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    width: auto;
  }
}
.search-input-responsive {
  width: 100%;
  max-width: 100%;
  @media (min-width: 640px) {
    width: 16rem;
  }
}
.action-buttons-wrapper {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;
  @media (min-width: 640px) {
    justify-content: flex-end;
  }
  .action-btn-responsive {
    flex: 1;
    min-width: 80px;
    @media (min-width: 640px) {
      flex: none;
    }
  }
}
/* Table Responsiveness */
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 0.5rem 1rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  @media (min-width: 1200px) {
    overflow-x: visible;
    margin: 0 0 1rem 0;
    border: none;
  }
}
.responsive-datatable {
  min-width: 1400px; // Ensures all columns visible on mobile scroll
  @media (min-width: 1200px) {
    min-width: auto;
  }
  :deep(.va-data-table__table) {
    table-layout: fixed;
  }
  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
    background-color: #f9fafb;
    font-weight: 600;
    border-bottom: 2px solid #e5e7eb;
    @media (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
    vertical-align: middle;
    @media (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }
  .status-select-responsive {
    width: 100%;
    min-width: 80px;
    @media (min-width: 768px) {
      width: 8rem;
    }
  }
  .cell-text {
    display: block;
    line-height: 1.4;
    word-break: break-word;
  }
}
.truncate-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
/* Actions Responsiveness */
.responsive-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
  min-width: 0;
  @media (min-width: 768px) {
    gap: 0.5rem;
    justify-content: flex-start;
  }
  .action-btn-small {
    flex: 1;
    min-width: 32px;
    max-width: 40px;
    @media (min-width: 768px) {
      flex: none;
      max-width: none;
    }
    &.ml-1 {
      margin-left: 0.25rem;
      @media (min-width: 768px) {
        margin-left: 0.5rem;
      }
    }
  }
}
/* Pagination Responsiveness */
.pagination-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0.5rem;
  align-items: center;
  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: space-between;
    padding: 1.5rem;
  }
}
.pagination-info-responsive {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  order: 2;
  flex-shrink: 0;
  @media (min-width: 640px) {
    order: 1;
    text-align: left;
  }
}
.pagination-buttons-wrapper {
  display: flex;
  gap: 0.5rem;
  order: 1;
  @media (min-width: 640px) {
    order: 2;
  }
  .pagination-btn-responsive {
    flex: 1;
    max-width: 80px;
    @media (min-width: 640px) {
      flex: none;
    }
  }
}
/* Modal Responsiveness */
.responsive-modal {
  :deep(.va-modal__content) {
    margin: 0.25rem;
    width: calc(100% - 0.5rem);
    @media (min-width: 768px) {
      margin: 0;
      width: auto;
    }
  }
}
.modal-content-wrapper {
  width: 100%;
  padding: 1rem;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-title-responsive {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  @media (min-width: 768px) {
    text-align: left;
    font-size: 1.25rem;
  }
}
.modal-body-responsive {
  margin-bottom: 1rem;
}
.detail-grid-responsive {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
  &.full-width {
    grid-column: 1 / -1;
  }
  strong {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 600;
  }
  span {
    color: #4b5563;
    word-break: break-word;
  }
  .description-full {
    white-space: pre-wrap;
    line-height: 1.5;
  }
  @media (min-width: 640px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;
    strong {
      min-width: 100px;
      flex-shrink: 0;
    }
  }
}
.modal-footer-responsive {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  @media (min-width: 768px) {
    justify-content: flex-end;
  }
  :deep(.va-button) {
    width: 100%;
    max-width: 120px;
    @media (min-width: 768px) {
      width: auto;
    }
  }
}
.error-message-responsive {
  padding: 2rem;
  text-align: center;
  color: #dc2626;
  font-size: 1rem;
}
/* Extra Small Screens */
@media (max-width: 480px) {
  .responsive-datatable {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.7rem;
      padding: 0.375rem 0.125rem;
    }
    .responsive-actions {
      gap: 0.125rem;
      .action-btn-small {
        min-width: 28px;
        max-width: 36px;
      }
    }
  }
  .header-wrapper {
    padding: 0.75rem 0.25rem;
  }
  .pagination-wrapper {
    padding: 0.75rem 0.25rem;
  }
}
</style>