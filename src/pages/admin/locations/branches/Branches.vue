<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <!-- Loading State -->
    <template v-if="loadingBranches">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading branches...'" />
      </div>
    </template>
    
    <!-- Error State (Hidden when forms open) -->
    <template v-else-if="errorMessage && !addEditForm">
      <div class="error-container">
        <div class="error-text">{{ errorMessage }}</div>
        <button class="retry-btn" @click="retryFetch">
          Retry
        </button>
      </div>
    </template>
    
    <!-- Main Content -->
    <template v-else>
      <!-- Controls Header (Always visible) -->
      <div class="controls-header">
        <!-- Search -->
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by name or address..."
            class="search-input"
            :disabled="loadingBranches || addEditForm"
            @input="debouncedSearch"
          />
          <VaButton 
            v-if="searchQuery && !addEditForm" 
            color="warning" 
            size="small" 
            @click="clearSearch"
            class="clear-btn"
          >
            Clear Search
          </VaButton>
        </div>
        
        <!-- Actions -->
        <div class="actions-container">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="loadingBranches || addEditForm"
            @update:modelValue="handlePerPageChange"
          />
          <VaButton 
            v-if="addEditForm" 
            icon="close" 
            color="success" 
            size="small" 
            class="action-btn"
            @click="cancelAdding"
          >
            Done
          </VaButton>
          <VaButton
            v-else
            icon="add"
            color="#00A3E0"
            size="small"
            class="action-btn"
            @click="openForm(null, 'add')"
          >
            Add
          </VaButton>
        </div>
      </div>

      <!-- Empty State (Only when no forms & no data) -->
      <div 
        v-if="!addEditForm && (!branches || (branches.length === 0 && !loadingBranches))" 
        class="empty-state"
      >
        <div class="empty-icon">🏢</div>
        <h3 class="empty-title">No branches found</h3>
        <p class="empty-subtitle">Add your first branch to get started</p>
        <VaButton color="primary" @click="openForm(null, 'add')" class="empty-action">
          Add Branch
        </VaButton>
      </div>

      <!-- Data Table (HIDDEN when addEditForm is true) -->
      <div v-if="!addEditForm && branches && branches.length > 0" class="table-wrapper">
        <VaDataTable
          :key="componentKey"
          :items="branches"
          striped
          :columns="columns"
          :loading="loadingBranches"
          class="responsive-table"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
          </template>
          
          <template #cell(name)="{ rowData }">
            <span class="cell-text truncate" :title="rowData.name">
              {{ rowData.name || 'N/A' }}
            </span>
          </template>
          
          <template #cell(address)="{ rowData }">
            <span class="cell-text truncate" :title="rowData.address || 'No address'">
              {{ rowData.address || 'No address' }}
            </span>
          </template>
          
          <template #cell(actions)="{ rowData }">
            <div class="actions-cell">
              <VaButton 
                size="small" 
                color="primary" 
                icon="visibility" 
                @click="openView(rowData)"
                class="action-icon"
                :disabled="loadingBranches"
              />
              <VaButton 
                size="small" 
                color="warning" 
                icon="edit" 
                class="action-icon"
                @click="openForm(rowData, 'edit')"
                :disabled="loadingBranches"
              />
              <VaButton 
                size="small" 
                color="danger" 
                icon="delete" 
                class="action-icon"
                @click="confirmDelete(rowData)"
                :disabled="loadingBranches || deleting"
              />
            </div>
          </template>
        </VaDataTable>
      </div>

      <!-- Pagination (HIDDEN when addEditForm is true) -->
      <div v-if="!addEditForm && branches && branches.length > 0" class="pagination-wrapper">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} branches
        </div>
        <div class="pagination-controls">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingBranches"
            @click="handlePageChange(pagination.current_page - 1)"
            class="pagination-btn"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
            class="pagination-btn"
            :disabled="loadingBranches"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingBranches"
            @click="handlePageChange(pagination.current_page + 1)"
            class="pagination-btn"
          >
            Next
          </VaButton>
        </div>
      </div>

      <!-- Forms (Take full width when visible) -->
      <template v-if="addEditForm">
        <div class="forms-container">
          <BranchForm 
            v-if="formMode === 'add'" 
            @close="closeForm" 
            @submit="debouncedHandleSubmit" 
          />
          <BranchEdit
            v-else-if="formMode === 'edit' && selectedBranch"
            :branch="selectedBranch"
            @close="closeForm"
            @submit="debouncedHandleSubmit"
          />
        </div>
      </template>

      <!-- View Modal (Responsive) -->
      <VaModal 
        v-model="showView" 
        :size="isMobile ? 'full' : 'large'" 
        layout="centered" 
        close-button 
        hide-default-actions 
        class="modal-container"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">{{ $t('Branch Details') }}</h2>
          </div>
          
          <div v-if="selectedBranch" class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ selectedBranch.name || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address:</span>
                <span class="detail-value">{{ selectedBranch.address || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Users Count:</span>
                <span class="detail-value">{{ selectedBranch.users_count || 0 }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Properties Count:</span>
                <span class="detail-value">{{ selectedBranch.properties_count || 0 }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ selectedBranch.created_at || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Updated:</span>
                <span class="detail-value">{{ selectedBranch.updated_at || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Deleted:</span>
                <span class="detail-value">{{ selectedBranch.deleted_at || 'N/A' }}</span>
              </div>
              
              <!-- Users -->
              <div v-if="selectedBranch.users && selectedBranch.users.length" class="detail-item full-width">
                <span class="detail-label">Users:</span>
                <div class="users-list">
                  <div v-for="user in selectedBranch.users" :key="user.id" class="user-tag">
                    {{ user.fullname }}
                  </div>
                </div>
              </div>
              
              <!-- Properties -->
              <div v-if="selectedBranch.properties && selectedBranch.properties.length" class="detail-item full-width">
                <span class="detail-label">Properties:</span>
                <div class="properties-list">
                  <div v-for="property in selectedBranch.properties" :key="property.id" class="property-tag">
                    {{ property.title }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <VaButton color="secondary" @click="closeView" class="modal-close-btn">
              Close
            </VaButton>
          </div>
        </div>
      </VaModal>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted } from 'vue';
import BranchForm from './BranchForm.vue';
import BranchEdit from './BranchEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

interface Branch {
  id: number;
  name: string;
  address: string;
  users_count: number;
  properties_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  users: { id: number; fullname: string }[] | null;
  properties: { id: number; title: string }[] | null;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

export default defineComponent({
  name: 'BranchList',
  components: {
    BranchForm,
    BranchEdit,
    Loader,
  },
  data() {
    return {
      // Mobile detection
      windowWidth: window.innerWidth,
      
      columns: [
        { key: 'sn', sortable: false, label: 'SN', width: '60px' },
        { key: 'name', sortable: true, label: 'Name', minWidth: '120px' },
        { key: 'address', sortable: true, label: 'Address', minWidth: '150px' },
        { key: 'users_count', sortable: true, label: 'Users', width: '80px' },
        { key: 'properties_count', sortable: true, label: 'Properties', width: '90px' },
        { key: 'created_at', sortable: true, label: 'Created', width: '120px' },
        { key: 'actions', label: 'Actions', sortable: false, width: '140px' },
      ] as Array<{ key: string; sortable: boolean; label: string; width?: string; minWidth?: string }>,
      
      branches: [] as Branch[],
      loadingBranches: false,
      errorMessage: null as string | null,
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      } as Pagination,
      addEditForm: false,
      showView: false,
      selectedBranch: null as Branch | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Array<{ value: number; text: string }>,
      debouncedHandleSubmit: undefined as ((payload: any, mode: 'add' | 'edit') => void) | undefined,
      debouncedSearch: undefined as (() => void) | undefined,
    };
  },
  computed: {
    isMobile() {
      return this.windowWidth < 768;
    },
    paginationPages(): number[] {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page || 1;
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
    },
    pagination(): Pagination {
      const current = this.pagination.current_page || 1;
      const perPage = this.pagination.per_page || 10;
      const total = this.pagination.total || 0;
      return {
        current_page: current,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
        from: total > 0 ? (current - 1) * perPage + 1 : 0,
        to: Math.min(current * perPage, total),
      };
    },
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
    this.debouncedSearch = debounce(this.handleSearch, 300);
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
    this.$nextTick(() => {
      this.windowWidth = window.innerWidth;
      this.retryFetch();
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    // Mobile resize handler
    handleResize() {
      this.windowWidth = window.innerWidth;
    },

    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            if (!this.addEditForm) { // Only set error if no form open
              this.errorMessage = 'Failed to load branches. Please check your connection and try again.';
            }
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },

    async retryFetch() {
      if (this.addEditForm) return; // Don't retry when form open
      this.errorMessage = null;
      await this.getBranches({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },

    async getBranches(params: { page?: number; per_page?: number; search?: string } = {}) {
      if (this.addEditForm || this.loadingBranches) return; // Prevent calls when form open
      
      this.loadingBranches = true;
      try {
        console.log('Fetching branches...', {
          page: params.page || this.pagination.current_page,
          perPage: params.per_page || this.pagination.per_page,
          search: params.search || this.searchQuery,
        });
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            params: {
              page: params.page || 1,
              per_page: params.per_page || this.pagination.per_page,
              search: params.search || '',
            },
          })
        );
        if (response && response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            id: branch.id,
            name: branch.name || 'Unknown',
            address: branch.address || 'Unknown',
            users_count: branch.users_count || 0,
            properties_count: branch.properties_count || 0,
            created_at: branch.created_at ? format(new Date(branch.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: branch.updated_at ? format(new Date(branch.updated_at), 'd MMMM yyyy') : 'N/A',
            deleted_at: branch.deleted_at ? format(new Date(branch.deleted_at), 'd MMMM yyyy') : null,
            users: branch.users || null,
            properties: branch.properties || null,
          }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length || 0,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: Math.ceil((response.data.pagination?.total || response.data.data.length || 0) / (response.data.pagination?.per_page || params.per_page || 10)),
            from: (response.data.pagination?.total || response.data.data.length || 0) > 0 ? ((response.data.pagination?.current_page || params.page || 1) - 1) * (response.data.pagination?.per_page || params.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination?.current_page || params.page || 1) * (response.data.pagination?.per_page || params.per_page || 10), response.data.pagination?.total || response.data.data.length || 0),
          };
          console.log('Fetched branches:', response.data);
          if (response.data.data.length === 0 && !this.addEditForm) {
            Swal.fire({
              title: 'Info',
              text: 'No branches found. Add some branches to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch branches.');
        }
      } catch (error: any) {
        console.error('getBranches error:', error.message, error.response?.data);
        if (!this.addEditForm) { // Only show errors when no form open
          let errorMessage = error.response?.data?.message || 'Failed to fetch branches.';
          if (error.message.includes('Network Error')) {
            errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
          } else if (error.message.includes('Invalid JSON response')) {
            errorMessage = 'Server returned an invalid response. Please check the server configuration.';
          }
          this.errorMessage = errorMessage;
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
      } finally {
        this.loadingBranches = false;
      }
    },

    // Keep all other existing methods unchanged
    async addBranch(payload: any) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        return response;
      } catch (error: any) {
        console.error('addBranch error:', error.response?.data || error.message);
        throw error;
      }
    },

    async updateBranch(payload: any) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        return response;
      } catch (error: any) {
        console.error('updateBranch error:', error.response?.data || error.message);
        throw error;
      }
    },

    async deleteBranch(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        return response;
      } catch (error: any) {
        console.error('deleteBranch error:', error.response?.data || error.message);
        throw error;
      }
    },

    openForm(branch: Branch | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedBranch = branch || {
        id: 0, name: '', address: '', users_count: 0, properties_count: 0,
        created_at: '', updated_at: '', deleted_at: null, users: null, properties: null
      };
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedBranch = null;
      this.addEditForm = false;
      this.formMode = 'add';
      // Only refresh if not loading
      if (!this.loadingBranches) {
        this.getBranches({
          page: this.pagination.current_page,
          per_page: this.pagination.per_page,
          search: this.searchQuery,
        });
      }
    },

    openView(branch: Branch) {
      this.selectedBranch = branch;
      this.showView = true;
    },

    closeView() {
      this.selectedBranch = null;
      this.showView = false;
    },

    confirmDelete(branch: Branch) {
      this.selectedBranch = branch;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the branch "${branch.name}". This action cannot be undone.`,
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

    cancelAdding() {
      this.closeForm();
    },

    async handleDelete() {
      if (!this.selectedBranch?.id || this.deleting) return;
      this.deleting = true;
      try {
        const response = await this.deleteBranch(this.selectedBranch.id);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Branch has been deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.selectedBranch = null;
          this.componentKey += 1;
          await this.getBranches({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to delete branch.');
        }
      } catch (err: any) {
        console.error('Delete error:', err.response?.data || err);
        let errorMessage = err.response?.data?.message || 'Failed to delete branch.';
        if (err.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
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
        this.deleting = false;
      }
    },

    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response;
        if (mode === 'add') {
          response = await this.addBranch(payload);
        } else {
          response = await this.updateBranch({ id: this.selectedBranch!.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Branch has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.closeForm();
          if (this.debouncedHandleSubmit) {
            (this.debouncedHandleSubmit as any).cancel();
            this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
          }
        } else {
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to create branch.' : 'Failed to update branch.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage = Object.values(response.data.errors).flat().join('; ');
          }
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response?.data || err);
        let errorMessage =
          err.response?.data?.message || (mode === 'add' ? 'Failed to create branch.' : 'Failed to update branch.');
        if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage = Object.values(err.response.data.errors).flat().join('; ');
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
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
        this.submitting = false;
      }
    },

    async handleSearch() {
      if (this.addEditForm || this.loadingBranches) return;
      this.pagination.current_page = 1;
      await this.getBranches({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    async clearSearch() {
      if (this.addEditForm) return;
      this.searchQuery = '';
      this.pagination.current_page = 1;
      await this.getBranches({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    handlePageChange(page: number) {
      if (this.addEditForm || this.loadingBranches || page < 1 || page > this.pagination.last_page) return;
      this.pagination.current_page = page;
      this.getBranches({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    handlePerPageChange(perPage: number) {
      if (this.addEditForm || this.loadingBranches) return;
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      this.getBranches({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },
  },
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
  padding: 0.75rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
}

// Loading
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;

  @media (min-width: 768px) {
    min-height: 400px;
  }
}

// Error State
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
  text-align: center;

  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: center;
    text-align: left;
  }

  .error-text {
    color: #ef4444;
    font-size: 0.875rem;
  }

  .retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    text-decoration: none;
    transition: background-color 0.2s;

    &:hover {
      background: #2563eb;
    }
  }
}

// Controls Header
.controls-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.5rem;
  }
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: end;
    gap: 1rem;
  }

  .search-input {
    width: 100%;

    @media (min-width: 768px) {
      max-width: 16rem;
    }
  }

  .clear-btn {
    flex-shrink: 0;
    white-space: nowrap;

    @media (min-width: 768px) {
      align-self: center;
    }
  }
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .per-page-select {
    flex: 1;
    max-width: 8rem;

    @media (min-width: 640px) {
      flex: none;
    }
  }

  .action-btn {
    flex: 1;
    justify-content: center;

    @media (min-width: 640px) {
      flex: none;
    }
  }
}

// Empty State
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  text-align: center;
  color: #6b7280;

  @media (min-width: 768px) {
    padding: 4rem 2rem;
    gap: 1.5rem;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #374151;
  }

  .empty-subtitle {
    font-size: 0.875rem;
  }

  .empty-action {
    width: 100%;
    max-width: 200px;

    @media (min-width: 640px) {
      width: auto;
    }
  }
}

// Table
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;

  @media (min-width: 1024px) {
    overflow-x: visible;
  }
}

.responsive-table {
  min-width: 900px;

  @media (min-width: 1024px) {
    min-width: auto;
  }

  :deep(.va-data-table__table) {
    table-layout: auto;
  }

  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }

  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;

    @media (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }

  .truncate {
    max-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions-cell {
    display: flex;
    gap: 0.25rem;
    justify-content: center;

    @media (min-width: 768px) {
      gap: 0.5rem;
    }

    .action-icon {
      flex: 1;
      min-width: 32px;

      @media (min-width: 768px) {
        flex: none;
      }
    }
  }
}

// Pagination
.pagination-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.pagination-info {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 0.875rem;
    text-align: left;
  }
}

.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;

  @media (min-width: 768px) {
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .pagination-btn {
    flex: 1;
    min-width: 36px;
    max-width: 48px;

    @media (min-width: 768px) {
      flex: none;
      max-width: none;
    }

    &:first-child,
    &:last-child {
      flex: none;
      white-space: nowrap;
      min-width: 72px;

      @media (min-width: 768px) {
        min-width: auto;
      }
    }
  }
}

// Forms Container
.forms-container {
  width: 100%;
  margin-top: 1.5rem;
  
  @media (min-width: 768px) {
    margin-top: 2rem;
  }
}

:deep(.va-form) {
  width: 100%;
  
  @media (min-width: 640px) {
    max-width: 600px;
    margin: 0 auto;
  }
}

// Modal
.modal-container {
  :deep(.va-modal__content) {
    padding: 1rem;

    @media (min-width: 768px) {
      padding: 2rem;
    }
  }
}

.modal-content {
  width: 100%;
  max-width: 600px;
}

.modal-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: center;

  @media (min-width: 768px) {
    text-align: left;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }
}

.modal-body {
  max-height: 60vh;
  overflow-y: auto;
  margin-bottom: 1.5rem;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &.full-width {
    flex-direction: column;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 1rem;
  }

  .detail-label {
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
    min-width: 120px;
    flex-shrink: 0;

    @media (min-width: 768px) {
      flex-shrink: 0;
    }
  }

  .detail-value {
    flex: 1;
    color: #4b5563;
    word-break: break-word;
  }
}

.users-list,
.properties-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.user-tag,
.property-tag {
  background: #e5e7eb;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  display: flex;
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-end;
  }

  .modal-close-btn {
    width: 100%;
    max-width: 120px;

    @media (min-width: 768px) {
      width: auto;
    }
  }
}

// Extra small screens
@media (max-width: 480px) {
  .p-4 {
    padding: 0.5rem;
  }

  .controls-header {
    gap: 0.5rem;
  }

  .search-container {
    gap: 0.5rem;
  }

  .table-wrapper {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.375rem 0.125rem;
    }
  }

  .pagination-controls {
    .pagination-btn {
      font-size: 0.75rem;
      min-width: 32px;
      max-width: 40px;

      &:first-child,
      &:last-child {
        min-width: 60px;
      }
    }
  }

  .modal-container {
    :deep(.va-modal__content) {
      padding: 0.75rem;
    }

    .detail-grid {
      gap: 0.75rem;
    }

    .detail-item {
      gap: 0.125rem;
      padding: 0.5rem 0;

      .detail-label,
      .detail-value {
        font-size: 0.75rem;
      }
    }

    .user-tag,
    .property-tag {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.375rem;
    }
  }
}
</style>