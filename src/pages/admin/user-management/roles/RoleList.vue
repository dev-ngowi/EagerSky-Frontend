<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingRoles">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading roles...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading roles"
        >
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-container">
        <!-- Search -->
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by role name..."
            class="search-input"
            :disabled="loadingRoles"
            @input="debouncedSearch"
            aria-label="Search roles by name"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search query">
            Clear Search
          </VaButton>
        </div>
        <!-- Pagination Controls and Add Button -->
        <div class="per-page-container">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="loadingRoles"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
          <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="action-button" @click="cancelAdding" aria-label="Finish adding or editing role">
            Done
          </VaButton>
          <!-- <VaButton
            v-if="!addEditForm && isAdmin"
            icon="add"
            color="#00A3E0"
            size="small"
            class="action-button"
            @click="openForm(null, 'add')"
            aria-label="Add new role"
          >
            Add
          </VaButton> -->
        </div>
      </div>
      <div v-if="!roles || (roles.length === 0 && !loadingRoles)" class="no-data-message">
        No roles found.
      </div>
      <div v-else-if="roles && roles.length > 0" class="table-responsive">
        <VaDataTable
          :key="componentKey"
          :items="roles"
          striped
          :columns="columns"
          :loading="loadingRoles"
          :no-data-html="'No roles found.'"
          :grid="false"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </template>
          <template #cell(actions)="{ rowData }">
            <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" aria-label="View role details" />
            <!-- <VaButton
              v-if="isAdmin"
              size="small"
              color="warning"
              icon="edit"
              class="action-button"
              @click="openForm(rowData, 'edit')"
              aria-label="Edit role"
            />
            <VaButton
              v-if="isAdmin"
              size="small"
              color="danger"
              icon="delete"
              class="action-button"
              @click="confirmDelete(rowData)"
              aria-label="Delete role"
            /> -->
          </template>
        </VaDataTable>
      </div>
      <!-- Pagination Navigation -->
      <div v-if="roles && roles.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} roles
        </div>
        <div class="pagination-buttons">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingRoles"
            @click="handlePageChange(pagination.current_page - 1)"
            aria-label="Go to previous page"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
            :aria-label="`Go to page ${page}`"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingRoles"
            @click="handlePageChange(pagination.current_page + 1)"
            aria-label="Go to next page"
          >
            Next
          </VaButton>
        </div>
      </div>
      <!-- Form and Edit -->
      <template v-if="addEditForm">
        <RoleForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
        <RoleEdit
          v-if="formMode === 'edit' && selectedRole"
          :role="selectedRole"
          @close="closeForm"
          @submit="debouncedHandleSubmit"
        />
      </template>
    </template>
    <!-- View Modal -->
    <VaModal
      v-model="showView"
      :size="isMobile ? 'full' : 'medium'"
      layout="centered"
      close-button
      hide-default-actions
      class="modal-container"
    >
      <div class="modal-title">{{ $t('Role Details') }}</div>
      <div v-if="selectedRole" class="modal-content">
        <p><strong>Role Name:</strong> {{ selectedRole.name }}</p>
        <p><strong>Description:</strong> {{ selectedRole.description || 'N/A' }}</p>
        <p><strong>Created At:</strong> {{ selectedRole.created_at || 'N/A' }}</p>
        <p><strong>Updated At:</strong> {{ selectedRole.updated_at || 'N/A' }}</p>
      </div>
      <div class="modal-footer">
        <VaButton color="secondary" @click="closeView" aria-label="Close role details modal">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Loader from '../../../../components/Loader.vue';
import RoleForm from './RoleForm.vue';
import RoleEdit from './RoleEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format } from 'date-fns';

interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

// Reactive state
const windowWidth = ref(window.innerWidth);
const onResize = () => {
  windowWidth.value = window.innerWidth;
};
onMounted(() => {
  window.addEventListener('resize', onResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
const isMobile = computed(() => windowWidth.value < 768);

const userData = JSON.parse(localStorage.getItem('userData') || '{}');
const isAdmin = computed(() => userData.role === 'admin');

// Local data
const roles = ref<Role[]>([]);
const loadingRoles = ref<boolean>(false);
const pagination = ref<Pagination>({
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
  from: 0,
  to: 0,
});
const searchQuery = ref<string>('');
const errorMessage = ref<string | null>(null);
const selectedRole = ref<Role | null>(null);
const formMode = ref<'add' | 'edit'>('add');
const addEditForm = ref<boolean>(false);
const showView = ref<boolean>(false);
const componentKey = ref<number>(0);
const deleting = ref<boolean>(false);
const submitting = ref<boolean>(false);
const perPageOptions = ref([
  { value: 10, text: '10' },
  { value: 25, text: '25' },
  { value: 50, text: '50' },
]);

// Computed properties
const columns = computed(() => [
  { key: 'sn', sortable: false, label: 'SN' },
  { key: 'name', sortable: true, label: 'Role Name' },
  { key: 'description', sortable: true, label: 'Description' },
  { key: 'created_at', sortable: true, label: 'Created At', width: '150px' },
  { key: 'actions', label: 'Actions', sortable: false },
]);

const paginationPages = computed(() => {
  const pages: number[] = [];
  const lastPage = pagination.value.last_page;
  const current = pagination.value.current_page;
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

// Methods
const fetchWithRetry = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        errorMessage.value = 'Failed to load roles. Please check your connection and try again.';
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
};

const fetchRoles = async (page: number = pagination.value.current_page) => {
  if (loadingRoles.value) return;
  loadingRoles.value = true;
  errorMessage.value = null;
  const params = {
    page,
    per_page: pagination.value.per_page,
    search: searchQuery.value || undefined,
  };
  try {
    const response = await fetchWithRetry(() =>
      makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles`,
        method: 'get',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        params,
      })
    );
    if (!response) throw new Error('No response from server');
    const { roles: fetchedRoles, pagination: fetchedPagination } = response.data.data;
    roles.value = fetchedRoles.map((role: any) => ({
      id: role.id,
      name: role.name,
      description: role.description || null,
      created_at: role.created_at ? format(new Date(role.created_at), 'd MMMM yyyy') : null,
      updated_at: role.updated_at ? format(new Date(role.updated_at), 'd MMMM yyyy') : null,
    }));
    pagination.value = {
      total: fetchedPagination.total_items || fetchedRoles.length,
      per_page: fetchedPagination.per_page || params.per_page || 10,
      current_page: fetchedPagination.current_page || params.page || 1,
      last_page: fetchedPagination.total_pages || 1,
      from: fetchedPagination.current_page
        ? (fetchedPagination.current_page - 1) * fetchedPagination.per_page + 1
        : 0,
      to: fetchedPagination.current_page
        ? Math.min(
            fetchedPagination.current_page * fetchedPagination.per_page,
            fetchedPagination.total_items || fetchedRoles.length
          )
        : 0,
    };
    if (roles.value.length === 0) {
      Swal.fire({
        title: 'Info',
        text: 'No roles found. Add some roles to get started.',
        icon: 'info',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  } catch (error: any) {
    console.error('fetchRoles error:', error.message, error.response?.data);
    errorMessage.value = error.response?.data?.message || 'Failed to fetch roles.';
    Swal.fire({
      title: 'Error!',
      text: errorMessage.value,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
  } finally {
    loadingRoles.value = false;
  }
};

const retryFetch = async () => {
  errorMessage.value = null;
  await fetchRoles();
};

const handleSearch = async () => {
  pagination.value.current_page = 1;
  await fetchRoles();
  componentKey.value += 1;
};

const clearSearch = async () => {
  searchQuery.value = '';
  pagination.value.current_page = 1;
  await fetchRoles();
  componentKey.value += 1;
};

const handlePageChange = async (page: number) => {
  if (loadingRoles.value || page < 1 || page > pagination.value.last_page) return;
  await fetchRoles(page);
  componentKey.value += 1;
};

const handlePerPageChange = async (perPage: number) => {
  pagination.value.per_page = perPage;
  pagination.value.current_page = 1;
  await fetchRoles();
  componentKey.value += 1;
};

const openForm = (role: Role | null = null, mode: 'add' | 'edit' = 'add') => {
  if (mode === 'edit' && !role) {
    Swal.fire({
      title: 'Error!',
      text: 'No role selected for editing.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    return;
  }
  selectedRole.value = role || {
    id: 0,
    name: '',
    description: null,
    created_at: null,
    updated_at: null,
  };
  formMode.value = mode;
  addEditForm.value = true;
};

const closeForm = () => {
  selectedRole.value = null;
  addEditForm.value = false;
  formMode.value = 'add';
  fetchRoles();
};

const openView = (role: Role) => {
  selectedRole.value = role;
  showView.value = true;
};

const closeView = () => {
  selectedRole.value = null;
  showView.value = false;
};

const confirmDelete = (role: Role) => {
  selectedRole.value = role;
  Swal.fire({
    title: 'Are you sure?',
    text: `You are about to delete the role "${role.name}". This action cannot be undone.`,
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

const cancelAdding = () => {
  closeForm();
};

const handleDelete = async () => {
  if (!selectedRole.value?.id || deleting.value) return;
  deleting.value = true;
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles/${selectedRole.value.id}`,
      method: 'delete',
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
    });
    if (response.status === 200 || response.status === 204) {
      Swal.fire({
        title: 'Deleted!',
        text: 'Role deleted successfully.',
        icon: 'success',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      selectedRole.value = null;
      componentKey.value += 1;
      await fetchRoles();
    } else {
      throw new Error(response.data?.message || 'Failed to delete role.');
    }
  } catch (err: any) {
    console.error('Delete error:', err.response?.data || err);
    Swal.fire({
      title: 'Error!',
      text: err.response?.data?.message || 'Failed to delete role.',
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

const handleSubmit = async (payload: any, mode: 'add' | 'edit') => {
  if (submitting.value) return;
  submitting.value = true;
  try {
    let response;
    if (mode === 'add') {
      response = await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles`,
        method: 'post',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        data: payload,
      });
    } else {
      if (!selectedRole.value?.id) {
        throw new Error('No role ID provided for update');
      }
      response = await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles/${selectedRole.value.id}`,
        method: 'put',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        data: payload,
      });
    }
    if (response.status === 201 || response.status === 200) {
      Swal.fire({
        title: mode === 'add' ? 'Created!' : 'Updated!',
        text: `Role has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
        icon: 'success',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      closeForm();
      componentKey.value += 1;
    } else {
      let errorMessage = response.data?.message || `Failed to ${mode} role.`;
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
    console.error(`${mode} error:`, err.response?.data || err);
    let errorMessage = err.response?.data?.message || `Failed to ${mode} role.`;
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
  } finally {
    submitting.value = false;
  }
};

// Debounced methods
const debouncedHandleSubmit = debounce(handleSubmit, 1000, { leading: true, trailing: false });
const debouncedSearch = debounce(handleSearch, 300);

// Initial fetch
onMounted(() => {
  fetchRoles();
});
</script>

<style lang="scss" scoped>
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

.p-4 {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;

  @media screen and (min-width: 768px) {
    min-height: 400px;
  }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }

  .retry-button {
    margin-top: 0.5rem;
    color: #2563eb;
    text-decoration: underline;
    font-size: 0.875rem;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    min-height: 40px;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .search-input {
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;

    @media screen and (min-width: 640px) {
      max-width: 16rem;
    }

    @media screen and (min-width: 768px) {
      max-width: 20rem;
    }
  }

  .va-button {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}

.per-page-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .per-page-select {
    width: 100%;
    max-width: 8rem;
    font-size: 0.875rem;

    @media screen and (min-width: 768px) {
      max-width: 10rem;
      font-size: 1rem;
    }
  }

  .action-button {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}

.no-data-message {
  text-align: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.875rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  :deep(.va-data-table) {
    min-width: 400px;
  }

  :deep(.va-data-table__table) {
    min-width: 100%;
    table-layout: auto;
  }

  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.5rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #374151;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.875rem 0.75rem;
    }
  }

  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.875rem 0.75rem;
    }
  }

  :deep(.va-data-table__table-tr:hover) {
    background-color: #f8fafc;
  }
}

.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .pagination-info {
    font-size: 0.75rem;
    color: #6b7280;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }

  .pagination-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;

    @media screen and (min-width: 768px) {
      gap: 0.5rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }
    }
  }
}

.modal-container {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.75rem;

    @media screen and (min-width: 768px) {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
  }

  .modal-content {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
    font-size: 0.875rem;

    @media screen and (min-width: 768px) {
      max-height: 70vh;
      padding-right: 1rem;
      font-size: 1rem;
    }

    p {
      margin: 0.5rem 0;

      @media screen and (min-width: 768px) {
        margin: 1rem 0;
      }
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;

    @media screen and (min-width: 768px) {
      margin-top: 1rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }
    }
  }
}

@media (max-width: 640px) {
  .p-4 {
    padding: 0.5rem;
  }

  .controls-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .search-container {
    .search-input {
      font-size: 0.75rem;
      max-width: 100%;
    }

    .va-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }
  }

  .per-page-container {
    .per-page-select {
      font-size: 0.75rem;
      max-width: 7rem;
    }

    .action-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }
  }

  .no-data-message {
    font-size: 0.75rem;
    padding: 0.75rem;
  }

  .table-responsive {
    :deep(.va-data-table) {
      min-width: 300px;
    }

    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.25rem;
    }

    :deep(.va-data-table__table-th[data-key="description"]),
    :deep(.va-data-table__table-td[data-key="description"]),
    :deep(.va-data-table__table-th[data-key="created_at"]),
    :deep(.va-data-table__table-td[data-key="created_at"]) {
      display: none; /* Hide less critical columns on mobile */
    }

    :deep(.va-data-table__table-th[data-key="sn"]),
    :deep(.va-data-table__table-td[data-key="sn"]) {
      min-width: 40px;
    }

    :deep(.va-data-table__table-th[data-key="name"]),
    :deep(.va-data-table__table-td[data-key="name"]) {
      min-width: 120px;
    }

    :deep(.va-data-table__table-th[data-key="actions"]),
    :deep(.va-data-table__table-td[data-key="actions"]) {
      min-width: 50px;
    }
  }

  .pagination-container {
    gap: 0.25rem;

    .pagination-info {
      font-size: 0.625rem;
    }

    .pagination-buttons {
      .va-button {
        font-size: 0.625rem;
        padding: 0.25rem 0.5rem;
        min-width: 40px;
      }
    }
  }

  .modal-container {
    padding: 0.5rem;

    .modal-title {
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }

    .modal-content {
      max-height: 50vh;
      font-size: 0.75rem;

      p {
        margin: 0.25rem 0;
      }
    }

    .modal-footer {
      margin-top: 0.5rem;

      .va-button {
        font-size: 0.625rem;
        padding: 0.25rem 0.5rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .p-4 {
    padding: 0.25rem;
  }

  .controls-container {
    gap: 0.125rem;
  }

  .search-container {
    .search-input {
      font-size: 0.625rem;
    }

    .va-button {
      font-size: 0.5rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .per-page-container {
    .per-page-select {
      font-size: 0.625rem;
      max-width: 6rem;
    }

    .action-button {
      font-size: 0.5rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .no-data-message {
    font-size: 0.625rem;
    padding: 0.5rem;
  }

  .error-message {
    font-size: 0.75rem;
    padding: 0.75rem;

    .retry-button {
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .table-responsive {
    :deep(.va-data-table) {
      min-width: 250px;
    }

    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.2rem;
    }
  }

  .pagination-container {
    .pagination-info {
      font-size: 0.5rem;
    }

    .pagination-buttons {
      .va-button {
        font-size: 0.5rem;
        padding: 0.2rem 0.4rem;
        min-width: 36px;
      }
    }
  }

  .modal-container {
    padding: 0.25rem;

    .modal-title {
      font-size: 0.875rem;
    }

    .modal-content {
      max-height: 40vh;
      font-size: 0.625rem;
    }
  }
}
</style>