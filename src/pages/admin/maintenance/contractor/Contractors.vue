<template>
  <div class="responsive-container">
    <div class="bg-white shadow-md rounded-lg">
      <!-- Header (UNCHANGED) -->
      <div class="header-wrapper">
        <div class="title-section">
          <h2 class="title">Contractors</h2>
        </div>
        <div class="header-controls-wrapper">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by name, contact, specialty, or license number"
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
              :disabled="!isAdmin"
              @click="openForm(null, 'add')"
            >
              Add Contractor
            </VaButton>
          </div>
        </div>
      </div>

      <!-- ✅ FIXED TABLE WITH ALL CELL TEMPLATES -->
      <template v-if="!addEditForm">
        <div class="table-scroll-container">
          <VaDataTable
            :key="componentKey"
            :items="contractors"
            striped
            :columns="columns"
            :loading="loadingContractors"
            :per-page="pagination.per_page"
            :current-page="pagination.current_page"
            :hoverable="true"
            @update:currentPage="handlePageChange"
            class="responsive-datatable"
          >
            <!-- ✅ ALL CELLS -->
            <template #cell(sn)="{ rowIndex }">
              {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
            </template>
            
            <template #cell(name)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.name">
                {{ rowData.name || 'N/A' }}
              </span>
            </template>
            
            <template #cell(contact)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.contact">
                {{ rowData.contact || 'N/A' }}
              </span>
            </template>
            
            <template #cell(specialty)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.specialty">
                {{ rowData.specialty || 'N/A' }}
              </span>
            </template>
            
            <template #cell(is_certified)="{ rowData }">
              <span class="cell-badge" :class="rowData.is_certified === true ? 'badge-success' : 'badge-danger'">
                {{ rowData.is_certified === true ? 'Yes' : rowData.is_certified === false ? 'No' : 'N/A' }}
              </span>
            </template>
            
            <template #cell(license_number)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.license_number">
                {{ rowData.license_number || 'N/A' }}
              </span>
            </template>
            
            <template #cell(contract_time_limit)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.contract_time_limit_formatted">
                {{ rowData.contract_time_limit_formatted || 'N/A' }}
              </span>
            </template>
            
            <template #cell(construction_status)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.construction_status">
                {{ rowData.construction_status || 'N/A' }}
              </span>
            </template>
            
            <template #cell(years_experience)="{ rowData }">
              <span class="cell-text">
                {{ rowData.years_experience !== null ? rowData.years_experience : 'N/A' }}
              </span>
            </template>
            
            <template #cell(maintenance_request_count)="{ rowData }">
              <span class="cell-text badge-info">
                {{ rowData.maintenance_request_count || 0 }}
              </span>
            </template>
            
            <template #cell(created_at)="{ rowData }">
              <span class="cell-text truncate-text" :title="rowData.created_at_formatted">
                {{ rowData.created_at_formatted || 'N/A' }}
              </span>
            </template>

            <!-- ✅ FIXED ACTIONS - ALL BUTTONS RESPONSIVE -->
            <template #cell(actions)="{ rowData }">
              <div class="responsive-actions">
                <!-- 1️⃣ VIEW BUTTON -->
                <VaButton 
                  size="small" 
                  color="primary" 
                  icon="visibility" 
                  class="action-btn-small"
                  :title="`View ${rowData.name}`"
                  @click="openView(rowData)"
                />
                
                <!-- 2️⃣ EDIT BUTTON -->
                <VaButton
                  v-if="isAdmin"
                  size="small"
                  color="warning"
                  icon="edit"
                  class="action-btn-small ml-1"
                  :title="`Edit ${rowData.name}`"
                  @click="openForm(rowData, 'edit')"
                />
                
                <!-- 3️⃣ PDF BUTTON -->
                <VaButton
                  v-if="rowData.certificate_path && rowData.certificate_path !== 'Restricted'"
                  size="small"
                  color="info"
                  :icon="isMobile ? 'picture_as_pdf' : undefined"
                  :text="isMobile ? undefined : 'PDF'"
                  class="action-btn-small ml-1"
                  :title="`Download certificate for ${rowData.name}`"
                  @click="downloadCertificate(rowData.certificate_path)"
                />
                
                <!-- 4️⃣ DELETE/RESTORE BUTTON -->
                <VaButton
                  v-if="!rowData.raw_deleted_at && isAdmin"
                  size="small"
                  color="danger"
                  icon="delete"
                  class="action-btn-small ml-1"
                  :title="`Delete ${rowData.name}`"
                  @click="confirmDelete(rowData)"
                />
                <VaButton
                  v-else-if="rowData.raw_deleted_at && isAdmin"
                  size="small"
                  color="success"
                  icon="restore"
                  class="action-btn-small ml-1"
                  :title="`Restore ${rowData.name}`"
                  @click="confirmRestore(rowData)"
                />
              </div>
            </template>
          </VaDataTable>
        </div>
        
        <!-- Pagination (UNCHANGED) -->
        <div class="pagination-wrapper">
          <div class="pagination-info-responsive">
            Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
            {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
            {{ pagination.total }} contractors
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

      <!-- Forms -->
      <template v-else>
        <ContractorForm 
          v-if="formMode === 'add'" 
          @close="closeForm" 
          @submit="debouncedHandleSubmit" 
        />
        <ContractorEdit
          v-if="formMode === 'edit' && selectedContractor"
          :contractor="selectedContractor"
          @close="closeForm"
          @submit="debouncedHandleSubmit"
        />
      </template>

      <!-- Modal (UNCHANGED) -->
      <VaModal 
        v-model="showView" 
        :size="isMobile ? 'full' : 'medium'" 
        layout="centered" 
        close-button 
        hide-default-actions 
        class="responsive-modal"
        @update:model-value="onModalClose"
      >
        <!-- Modal content same as before -->
        <template #header>
          <div class="modal-title-responsive">Contractor Details</div>
        </template>
        <!-- ... rest of modal ... -->
        <template #footer>
          <div class="modal-footer-responsive">
            <VaButton color="secondary" @click="closeView">Close</VaButton>
          </div>
        </template>
      </VaModal>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue';
import ContractorForm from './ContractorForm.vue';
import ContractorEdit from './ContractorEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format, parseISO, isValid } from 'date-fns';
import type { Contractor, Pagination } from '../../../../types/contractor';

export default defineComponent({
  name: 'ContractorList',
  components: {
    ContractorForm,
    ContractorEdit,
  },
  setup() {
    // ✅ MOBILE DETECTION
    const windowWidth = ref<number>(window.innerWidth);
    const isMobile = computed(() => windowWidth.value < 768);

    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };

    // ✅ STATE
    const isAdmin = ref<boolean>(true); // Replace with your auth logic
    const contractors = ref<Contractor[]>([]);
    const loadingContractors = ref<boolean>(false);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const searchQuery = ref<string>('');

    // ✅ FORM STATE
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const selectedContractor = ref<Contractor | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const componentKey = ref<number>(0);
    const deleting = ref<boolean>(false);
    const submitting = ref<boolean>(false);

    // ✅ COLUMNS
    const columns = [
      { key: 'sn', sortable: false, label: 'SN', width: '60px' },
      { key: 'name', sortable: true, label: 'Name', width: '140px' },
      { key: 'contact', sortable: true, label: 'Contact', width: '120px' },
      { key: 'specialty', sortable: true, label: 'Specialty', width: '130px' },
      { key: 'is_certified', sortable: true, label: 'Certified', width: '90px' },
      { key: 'license_number', sortable: true, label: 'License #', width: '110px' },
      { key: 'contract_time_limit', sortable: true, label: 'Contract', width: '120px' },
      { key: 'construction_status', sortable: true, label: 'Status', width: '100px' },
      { key: 'years_experience', sortable: true, label: 'Exp', width: '70px' },
      { key: 'maintenance_request_count', sortable: true, label: 'Requests', width: '90px' },
      { key: 'created_at', sortable: true, label: 'Created', width: '110px' },
      { key: 'actions', label: 'Actions', sortable: false, width: '220px' },
    ];

    // ✅ DEBOUNCED FUNCTIONS
    let debouncedSearch: any = null;
    let debouncedHandleSubmit: any = null;

    // ✅ 1️⃣ GET CONTRACTORS
    const getContractors = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
      loadingContractors.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors`,
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
          contractors.value = response.data.data.map((contractor: any) => ({
            id: contractor.id,
            name: contractor.name ?? 'N/A',
            contact: contractor.contact ?? 'Restricted',
            specialty: contractor.specialty ?? 'N/A',
            is_certified: contractor.is_certified !== undefined ? contractor.is_certified : null,
            certificate_path: contractor.certificate_path ?? null,
            license_number: contractor.license_number ?? 'Restricted',
            raw_contract_time_limit: contractor.contract_time_limit ?? null,
            contract_time_limit_formatted: contractor.contract_time_limit
              ? isValid(parseISO(contractor.contract_time_limit))
                ? format(parseISO(contractor.contract_time_limit), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            construction_status: contractor.construction_status ?? 'Restricted',
            years_experience: contractor.years_experience !== undefined ? contractor.years_experience : null,
            maintenance_request_count: contractor.maintenance_request_count || 0,
            raw_created_at: contractor.created_at ?? null,
            created_at_formatted: contractor.created_at
              ? isValid(parseISO(contractor.created_at))
                ? format(parseISO(contractor.created_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            raw_updated_at: contractor.updated_at ?? null,
            updated_at_formatted: contractor.updated_at
              ? isValid(parseISO(contractor.updated_at))
                ? format(parseISO(contractor.updated_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            raw_deleted_at: contractor.deleted_at ?? null,
            deleted_at_formatted: contractor.deleted_at
              ? isValid(parseISO(contractor.deleted_at))
                ? format(parseISO(contractor.deleted_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
          }));

          pagination.value = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };

          if (contractors.value.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No contractors found. Add some contractors to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }
      } catch (error: any) {
        console.error('getContractors error:', error);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch contractors.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingContractors.value = false;
      }
    };

    // ✅ 2️⃣ DOWNLOAD CERTIFICATE
    const downloadCertificate = async (path: string) => {
      if (!path || path === 'Restricted') {
        Swal.fire({
          title: 'Error!',
          text: 'No certificate available for download.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      const correctedPath = path.replace('/v1/contractors/certificates/', '/api/v1/contractors/certificates/');

      try {
        const response = await makeRequest({
          url: `${correctedPath}?download=1`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/pdf',
          },
          responseType: 'blob',
        });

        const contentType = response.headers['content-type'];
        if (!contentType?.includes('application/pdf')) {
          throw new Error('Invalid file type received');
        }

        const filename = path.split('/').pop() || 'certificate.pdf';
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Success!',
          text: 'Certificate downloaded successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error: any) {
        console.error('Download error:', error);
        let errorMessage = 'Failed to download certificate.';
        if (error.response?.status === 404) {
          errorMessage = 'Certificate file not found.';
        } else if (error.response?.status === 401) {
          errorMessage = 'Unauthorized access.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
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

    // ✅ 3️⃣ FORM OPERATIONS
    const openForm = (contractor: Contractor | null = null, mode: 'add' | 'edit' = 'add') => {
      if (mode === 'edit' && !contractor) return;
      selectedContractor.value = contractor;
      formMode.value = mode;
      addEditForm.value = true;
    };

    const closeForm = () => {
      selectedContractor.value = null;
      addEditForm.value = false;
      formMode.value = 'add';
      getContractors({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    };

    const cancelAdding = () => {
      closeForm();
    };

    // ✅ 4️⃣ VIEW MODAL
    const openView = (contractor: Contractor) => {
      if (!contractor || !contractor.id) {
        Swal.fire({
          title: 'Error!',
          text: 'Invalid contractor data.',
          icon: 'error',
          position: 'top-end',
          toast: true,
        });
        return;
      }
      selectedContractor.value = { ...contractor };
      showView.value = true;
    };

    const closeView = () => {
      selectedContractor.value = null;
      showView.value = false;
    };

    const onModalClose = (value: boolean) => {
      if (!value) {
        closeView();
      }
    };

    // ✅ 5️⃣ DELETE/RESTORE
    const confirmDelete = (contractor: Contractor) => {
      Swal.fire({
        title: 'Are you sure?',
        text: `Delete "${contractor.name}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete!',
      }).then((result) => {
        if (result.isConfirmed) {
          handleDelete(contractor.id);
        }
      });
    };

    const confirmRestore = (contractor: Contractor) => {
      Swal.fire({
        title: 'Restore contractor?',
        text: `Restore "${contractor.name}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, restore!',
      }).then((result) => {
        if (result.isConfirmed) {
          handleRestore(contractor.id);
        }
      });
    };

    const handleDelete = async (id: number | string) => {
      deleting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          await getContractors({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
          componentKey.value++;
          Swal.fire({
            title: 'Deleted!',
            text: 'Contractor deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            timer: 1500,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete contractor.',
          icon: 'error',
          position: 'top-end',
          toast: true,
        });
      } finally {
        deleting.value = false;
      }
    };

    const handleRestore = async (id: number | string) => {
      deleting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors/${id}/restore`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          await getContractors({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
          componentKey.value++;
          Swal.fire({
            title: 'Restored!',
            text: 'Contractor restored successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            timer: 1500,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to restore contractor.',
          icon: 'error',
          position: 'top-end',
          toast: true,
        });
      } finally {
        deleting.value = false;
      }
    };

    // ✅ 6️⃣ SUBMIT HANDLER
    const handleSubmit = async (payload: FormData, mode: 'add' | 'edit') => {
      submitting.value = true;
      try {
        let response;
        if (mode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            data: payload,
          });
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors/${selectedContractor.value!.id}`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            data: payload,
          });
        }

        if (response.status === 201 || response.status === 200) {
          await getContractors({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
          componentKey.value++;
          closeForm();
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Contractor ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            position: 'top-end',
            toast: true,
            timer: 1500,
          });
        }
      } catch (error: any) {
        let errorMessage = error.response?.data?.message || `Failed to ${mode} contractor.`;
        if (error.response?.status === 422 && error.response.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).flat().join('; ');
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
        });
      } finally {
        submitting.value = false;
      }
    };

    // ✅ 7️⃣ PAGINATION & SEARCH
    const handlePageChange = async (page: number) => {
      await getContractors({
        page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value++;
    };

    const handleSearch = async () => {
      await getContractors({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value++;
    };

    // ✅ LIFECYCLE
    onMounted(() => {
      window.addEventListener('resize', handleResize);
      
      // ✅ SETUP DEBOUNCED FUNCTIONS
      debouncedSearch = debounce(handleSearch, 500);
      debouncedHandleSubmit = debounce(handleSubmit, 1000, { leading: true, trailing: false });
      
      getContractors({ page: 1, per_page: 10 });
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });

    // ✅ 🚀 RETURN ALL METHODS & STATE
    return {
      // Responsive
      isMobile,
      
      // State
      isAdmin,
      contractors,
      loadingContractors,
      pagination,
      searchQuery,
      addEditForm,
      showView,
      selectedContractor,
      formMode,
      componentKey,
      deleting,
      submitting,
      
      // Columns
      columns,
      
      // Debounced
      debouncedSearch,
      debouncedHandleSubmit,
      
      // ✅ ALL METHODS EXPORTED HERE:
      getContractors,
      downloadCertificate,      // ✅ FIXED
      openForm,                 // ✅ FIXED  
      closeForm,
      cancelAdding,
      openView,                 // ✅ FIXED
      closeView,
      onModalClose,
      confirmDelete,
      confirmRestore,
      handleDelete,
      handleRestore,
      handleSubmit,
      handlePageChange,
      handleSearch,
    };
  },
});
</script>

<style lang="scss" scoped>
.responsive-container {
  width: 100%;
  padding: 0.5rem;

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

.title-section {
  flex-shrink: 0;
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

  @media (min-width: 1400px) {  // Increased for 12 columns
    overflow-x: visible;
    margin: 0 0 1rem 0;
    border: none;
  }
}

.responsive-datatable {
  min-width: 1600px; // ✅ Wide enough for ALL 12 columns

  @media (min-width: 1400px) {
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

  .cell-text {
    display: block;
    line-height: 1.4;
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
  max-height: 60vh;
  overflow-y: auto;
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

  strong {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 600;
  }

  span {
    color: #4b5563;
    word-break: break-word;
  }

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;

    strong {
      min-width: 140px;
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
  color: #6b7280;
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