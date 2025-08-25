<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by name, contact, specialty, or license number"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
      <div class="flex space-x-2">
        <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
          {{ $t('Done', 'Done') }}
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          :disabled="!isAdmin"
          @click="openForm(null, 'add')"
        >
          {{ $t('Add Contractor', 'Add Contractor') }}
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="contractors"
        striped
        :columns="columns"
        :loading="loadingContractors"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(is_certified)="{ rowData }">
          {{ rowData.is_certified === true ? 'Yes' : rowData.is_certified === false ? 'No' : rowData.is_certified }}
        </template>
        <template #cell(created_at)="{ rowData }">
          {{ rowData.created_at_formatted || 'N/A' }}
        </template>
        <template #cell(updated_at)="{ rowData }">
          {{ rowData.updated_at_formatted || 'N/A' }}
        </template>
        <template #cell(deleted_at)="{ rowData }">
          {{ rowData.deleted_at_formatted || 'N/A' }}
        </template>
        <template #cell(contract_time_limit)="{ rowData }">
          {{ rowData.contract_time_limit_formatted || 'N/A' }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton 
            size="small" 
            color="primary" 
            icon="visibility" 
            @click.stop="openView(rowData)"
            :disabled="!rowData || !rowData.id"
          />
          <VaButton
            size="small"
            color="warning"
            icon="edit"
            class="ml-2"
            :disabled="!isAdmin"
            @click="openForm(rowData, 'edit')"
          />
          <VaButton
            v-if="rowData.certificate_path && rowData.certificate_path !== 'Restricted'"
            size="small"
            color="info"
            icon="picture_as_pdf"
            class="ml-2"
            @click="downloadCertificate(rowData.certificate_path)"
          >
            View PDF
          </VaButton>
          <VaButton
            v-if="!rowData.raw_deleted_at"
            size="small"
            color="danger"
            icon="delete"
            class="ml-2"
            :disabled="!isAdmin"
            @click="confirmDelete(rowData)"
          />
          <VaButton
            v-if="rowData.raw_deleted_at"
            size="small"
            color="success"
            icon="restore"
            class="ml-2"
            :disabled="!isAdmin"
            @click="confirmRestore(rowData)"
          />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} contractors
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
      <ContractorForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <ContractorEdit
        v-if="formMode === 'edit' && selectedContractor"
        :contractor="selectedContractor"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal 
      v-model="showView" 
      size="medium" 
      layout="centered" 
      close-button 
      hide-default-actions 
      class="p-4"
      @update:model-value="onModalClose"
    >
      <template #header>
        <div class="text-lg font-bold">{{ $t('Contractor Details', 'Contractor Details') }}</div>
      </template>
      
      <div v-if="selectedContractor && selectedContractor.id" class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-600">Name</p>
            <p class="text-base">{{ selectedContractor.name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Contact</p>
            <p class="text-base">{{ selectedContractor.contact || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Specialty</p>
            <p class="text-base">{{ selectedContractor.specialty || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Certified</p>
            <p class="text-base">
              {{
                selectedContractor.is_certified === true
                  ? 'Yes'
                  : selectedContractor.is_certified === false
                    ? 'No'
                    : 'N/A'
              }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">License Number</p>
            <p class="text-base">{{ selectedContractor.license_number || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Contract Time Limit</p>
            <p class="text-base">{{ selectedContractor.contract_time_limit_formatted || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Construction Status</p>
            <p class="text-base">{{ selectedContractor.construction_status || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Years of Experience</p>
            <p class="text-base">{{ selectedContractor.years_experience !== null ? selectedContractor.years_experience : 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Maintenance Requests</p>
            <p class="text-base">{{ selectedContractor.maintenance_request_count || 0 }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Created At</p>
            <p class="text-base">{{ selectedContractor.created_at_formatted || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600">Updated At</p>
            <p class="text-base">{{ selectedContractor.updated_at_formatted || 'N/A' }}</p>
          </div>
          <div v-if="selectedContractor.raw_deleted_at">
            <p class="text-sm font-medium text-gray-600">Deleted At</p>
            <p class="text-base text-red-600">{{ selectedContractor.deleted_at_formatted || 'N/A' }}</p>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4">
        <p class="text-gray-500">No contractor data available</p>
      </div>
      
      <template #footer>
        <div class="flex justify-end">
          <VaButton color="secondary" @click="closeView">Close</VaButton>
        </div>
      </template>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
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
    const isAdmin = computed(() => {
      return true; // Assume admin for demo
    });

    const contractors = ref<Contractor[]>([]);
    const loadingContractors = ref<boolean>(false);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const searchQuery = ref<string>('');

    return { isAdmin, contractors, loadingContractors, pagination, searchQuery };
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'contact', sortable: true, label: 'Contact' },
        { key: 'specialty', sortable: true, label: 'Specialty' },
        { key: 'is_certified', sortable: true, label: 'Certified' },
        { key: 'license_number', sortable: true, label: 'License Number' },
        { key: 'contract_time_limit', sortable: true, label: 'Contract Time Limit' },
        { key: 'construction_status', sortable: true, label: 'Construction Status' },
        { key: 'years_experience', sortable: true, label: 'Years Experience' },
        { key: 'maintenance_request_count', sortable: true, label: 'Maintenance Requests' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedContractor: null as Contractor | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      debouncedHandleSubmit: null as any,
      debouncedSearch: null as any,
    };
  },
  created() {
    this.debouncedHandleSubmit = debounce((payload: FormData, mode: 'add' | 'edit') => {
      this.handleSubmit(payload, mode);
    }, 1000, { leading: true, trailing: false });

    this.debouncedSearch = debounce(() => {
      this.handleSearch();
    }, 500);
  },
  mounted() {
    this.getContractors({ page: 1, per_page: 10 });
  },
  methods: {
    async getContractors(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingContractors = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || this.pagination.current_page,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || this.searchQuery,
          },
        });
        if (response.status === 200) {
          this.contractors = response.data.data.map((contractor: any) => ({
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
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          if (this.contractors.length === 0) {
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
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch contractors.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getContractors error:', error.response?.data || error);
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
        this.loadingContractors = false;
      }
    },

    async downloadCertificate(path: string) {
      if (!path) {
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

      // Ensure the path includes the /api prefix
      const correctedPath = path.replace('/v1/contractors/certificates/', '/api/v1/contractors/certificates/');

      try {
        console.log('Downloading certificate from:', correctedPath);
        console.log('Auth token:', localStorage.getItem('auth_token'));
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
        if (!contentType.includes('application/pdf')) {
          const text = await response.data.text();
          let errorMessage = 'Invalid file type received';
          try {
            const jsonError = JSON.parse(text);
            errorMessage = jsonError.message || errorMessage;
          } catch (e) {
            console.error('Failed to parse error response:', text);
          }
          throw new Error(errorMessage);
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
          errorMessage = 'Unauthorized access. Please log in again.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS error: The server blocked the request. Please contact the administrator.';
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
    },

    async addContractor(payload: FormData) {
      this.submitting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        if (response.status === 201) {
          await this.getContractors({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
        }
        return response;
      } catch (error: any) {
        console.error('addContractor error:', error.response?.data || error);
        throw error;
      } finally {
        this.submitting = false;
      }
    },

    async updateContractor(payload: FormData, id: number | string) {
      this.submitting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors/${id}`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        if (response.status === 200) {
          await this.getContractors({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
        }
        return response;
      } catch (error: any) {
        console.error('updateContractor error:', error.response?.data || error);
        throw error;
      } finally {
        this.submitting = false;
      }
    },

    async deleteContractor(id: number | string) {
      this.deleting = true;
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
          await this.getContractors({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
        }
        return response;
      } catch (error: any) {
        console.error('deleteContractor error:', error.response?.data || error);
        throw error;
      } finally {
        this.deleting = false;
      }
    },

    async restoreContractor(id: number | string) {
      this.deleting = true;
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
          await this.getContractors({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
        }
        return response;
      } catch (error: any) {
        console.error('restoreContractor error:', error.response?.data || error);
        throw error;
      } finally {
        this.deleting = false;
      }
    },

    openForm(contractor: Contractor | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !contractor) return;
      this.selectedContractor = contractor;
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedContractor = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.getContractors({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },

    openView(contractor: Contractor) {
      console.log('Opening view for contractor:', contractor);
      if (!contractor || !contractor.id) {
        console.error('Invalid contractor data:', contractor);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid contractor data. Please try again.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      
      this.selectedContractor = { ...contractor };
      this.showView = true;
      
      event?.preventDefault();
      event?.stopPropagation();
    },

    closeView() {
      this.selectedContractor = null;
      this.showView = false;
    },

    onModalClose(value: boolean) {
      if (!value) {
        this.closeView();
      }
    },

    confirmDelete(contractor: Contractor) {
      this.selectedContractor = contractor;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the contractor "${contractor.name}". This action cannot be undone.`,
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
          this.handleDelete();
        }
      });
    },

    confirmRestore(contractor: Contractor) {
      this.selectedContractor = contractor;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to restore the contractor "${contractor.name}".`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, restore it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleRestore();
        }
      });
    },

    cancelAdding() {
      this.closeForm();
    },

    async handleDelete() {
      if (!this.selectedContractor?.id) return;
      try {
        const response = await this.deleteContractor(this.selectedContractor.id);
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Contractor deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedContractor = null;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete contractor.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete contractor.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async handleRestore() {
      if (!this.selectedContractor?.id) return;
      try {
        const response = await this.restoreContractor(this.selectedContractor.id);
        if (response.status === 200) {
          Swal.fire({
            title: 'Restored!',
            text: 'Contractor restored successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedContractor = null;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to restore contractor.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to restore contractor.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async handleSubmit(payload: FormData, mode: 'add' | 'edit') {
      if (this.submitting) return;
      try {
        let response;
        if (mode === 'add') {
          response = await this.addContractor(payload);
        } else {
          response = await this.updateContractor(payload, this.selectedContractor!.id);
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Contractor has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.closeForm();
        } else {
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to add contractor.' : 'Failed to update contractor.');
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
      } catch (err: any) {
        let errorMessage =
          err.response?.data?.message || (mode === 'add' ? 'Failed to add contractor.' : 'Failed to update contractor.');
        if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage = Object.values(err.response.data.errors).flat().join('; ');
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
    },

    async handlePageChange(page: number) {
      await this.getContractors({
        page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    async handleSearch() {
      await this.getContractors({
        page: 1,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },
  },
});
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
.gap-4 {
  gap: 1rem;
}
.space-y-3 > :not(:last-child) {
  margin-bottom: 0.75rem;
}
.text-sm {
  font-size: 0.875rem;
}
.text-base {
  font-size: 1rem;
}
.font-medium {
  font-weight: 500;
}
.text-gray-600 {
  color: #4b5563;
}
.text-red-600 {
  color: #dc2626;
}
.text-gray-500 {
  color: #6b7280;
}
.text-center {
  text-align: center;
}
.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}
.justify-end {
  justify-content: flex-end;
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>