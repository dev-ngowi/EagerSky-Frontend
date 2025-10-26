<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppointmentTypeStore } from '../../../../stores/appointmentTypeStore';
import AppointmentTypeForm from './AppointmentTypeForm.vue';
import AppointmentTypeEdit from './AppointmentTypeEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import type { AppointmentType, FormData, ApiResponse } from '../../../../types/appointment-type';

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

// Pinia store
const store = useAppointmentTypeStore();
const { appointmentTypes, loadingAppointmentTypes, pagination } = storeToRefs(store);
const { getAppointmentTypes, deleteAppointmentType, addAppointmentType, updateAppointmentType } = store;

// Fixed: Added 'as const' to align property
const responsiveColumns = computed(() => [
  {
    key: 'sn',
    sortable: false,
    label: 'SN',
    width: '60px'
  },
  {
    key: 'name',
    sortable: true,
    label: 'Name',
    width: '200px'
  },
  {
    key: 'created_at',
    sortable: true,
    label: 'Created',
    width: '120px'
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    width: '140px',
    align: 'center' as const // Fixed: explicitly typed as const
  },
]);

const addEditForm = ref<boolean>(false);
const showView = ref<boolean>(false);
const selectedAppointmentType = ref<AppointmentType | null>(null);
const formMode = ref<'add' | 'edit'>('add');
const componentKey = ref<number>(0);
const deleting = ref<boolean>(false);
const submitting = ref<boolean>(false);
const searchQuery = ref<string>('');
const errorMessage = ref<string | null>(null);

const perPageOptions = ref([
  { value: 10, text: '10' },
  { value: 25, text: '25' },
  { value: 50, text: '50' },
]);

const paginationPages = computed<number[]>(() => {
  const pages: number[] = [];
  const lastPage = pagination.value.last_page || 1;
  const current = pagination.value.current_page || 1;
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

const computedPagination = computed<Pagination>(() => {
  const current = pagination.value.current_page || 1;
  const perPage = pagination.value.per_page || 10;
  const total = pagination.value.total || 0;
  return {
    current_page: current,
    per_page: perPage,
    total,
    last_page: Math.ceil(total / perPage) || 1,
    from: total > 0 ? (current - 1) * perPage + 1 : 0,
    to: Math.min(current * perPage, total),
  };
});

// Format date function
const formatDate = (date: string | Date | null, formatString: string): string => {
  if (!date) return 'None';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsedDate) ? format(parsedDate, formatString) : 'None';
};

// Retry logic
const fetchWithRetry = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        errorMessage.value = 'Failed to load appointment types. Please check your connection and try again.';
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
};

const retryFetch = async () => {
  errorMessage.value = null;
  await getAppointmentTypes({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

// Methods
const openForm = (appointmentType: AppointmentType | null = null, mode: 'add' | 'edit' = 'add') => {
  if (mode === 'edit' && !appointmentType) {
    Swal.fire({
      title: 'Error!',
      text: 'No appointment type selected for editing.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    });
    return;
  }
  selectedAppointmentType.value = appointmentType;
  formMode.value = mode;
  addEditForm.value = true;
};

const closeForm = async () => {
  selectedAppointmentType.value = null;
  addEditForm.value = false;
  formMode.value = 'add';
  // Refresh data after closing form
  await getAppointmentTypes({
    page: pagination.value.current_page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
};

const openView = (appointmentType: AppointmentType) => {
  selectedAppointmentType.value = appointmentType;
  showView.value = true;
};

const closeView = () => {
  selectedAppointmentType.value = null;
  showView.value = false;
};

const confirmDelete = (appointmentType: AppointmentType) => {
  selectedAppointmentType.value = appointmentType;
  Swal.fire({
    title: 'Confirm Delete',
    html: `
      <div class="text-sm">
        <p>Are you sure you want to delete</p>
        <p class="font-medium text-blue-600 mt-1">"${appointmentType.name}"</p>
        <p class="text-red-600 font-medium mt-2">This action cannot be undone.</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: '<i class="va-icon mr-1">delete</i>Yes, delete it',
    cancelButtonText: '<i class="va-icon mr-1">close</i>Cancel',
    buttonsStyling: false,
    customClass: {
      confirmButton: 'px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
      cancelButton: 'px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-3'
    },
    reverseButtons: true,
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
  if (!selectedAppointmentType.value?.id || deleting.value) return;
  deleting.value = true;
  try {
    const response = await deleteAppointmentType(selectedAppointmentType.value.id);
    if (response.status === 200) {
      Swal.fire({
        title: 'Deleted!',
        text: 'Appointment type has been deleted successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
      });
      selectedAppointmentType.value = null;
      componentKey.value += 1;
      await getAppointmentTypes({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    } else {
      throw new Error(response.data.message || 'Failed to delete appointment type.');
    }
  } catch (error: any) {
    console.error('deleteAppointmentType error:', error.response?.data || error);
    let errorMessage = error.response?.data?.message || 'Failed to delete appointment type.';
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
    } else if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessage = Object.values(error.response.data.errors).flat().join('; ');
    }
    Swal.fire({
      title: 'Error!',
      text: errorMessage,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 4000,
    });
  } finally {
    deleting.value = false;
  }
};

const handleSubmit = async (payload: FormData & { id?: number }, mode: 'add' | 'edit') => {
  if (submitting.value) return;
  submitting.value = true;
  try {
    let response: ApiResponse<AppointmentType | null>;
    if (mode === 'add') {
      response = await addAppointmentType(payload);
    } else {
      if (!selectedAppointmentType.value?.id) {
        throw new Error('No appointment type selected for editing.');
      }
      response = await updateAppointmentType({ id: selectedAppointmentType.value.id, ...payload });
    }
    if (response.status === 201 || response.status === 200) {
      Swal.fire({
        title: mode === 'add' ? 'Created!' : 'Updated!',
        text: `Appointment type has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
      });
      componentKey.value += 1;
      closeForm();
    } else {
      let errorMessage = response.data.message || (mode === 'add' ? 'Failed to add appointment type.' : 'Failed to update appointment type.');
      if (response.status === 422 && response.data.errors) {
        errorMessage = Object.values(response.data.errors).flat().join('; ');
      }
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 4000,
      });
    }
  } catch (error: any) {
    console.error('handleSubmit error:', error.response?.data || error);
    let errorMessage = error.response?.data?.message || (mode === 'add' ? 'Failed to add appointment type.' : 'Failed to update appointment type.');
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
    } else if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessage = Object.values(error.response.data.errors).flat().join('; ');
    }
    Swal.fire({
      title: 'Error!',
      text: errorMessage,
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 4000,
    });
  } finally {
    submitting.value = false;
  }
};

const handlePageChange = async (page: number) => {
  if (loadingAppointmentTypes.value || addEditForm.value) return;
  if (page < 1 || page > pagination.value.last_page) {
    console.warn(`Invalid page number: ${page}, last_page: ${pagination.value.last_page}`);
    return;
  }
  pagination.value.current_page = page;
  await getAppointmentTypes({
    page,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const handlePerPageChange = async (perPage: number) => {
  if (loadingAppointmentTypes.value || addEditForm.value) return;
  pagination.value.per_page = perPage || 10;
  pagination.value.current_page = 1;
  await getAppointmentTypes({
    page: 1,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
  componentKey.value += 1;
};

const clearSearch = () => {
  searchQuery.value = '';
  pagination.value.current_page = 1;
  getAppointmentTypes({
    page: 1,
    per_page: pagination.value.per_page,
    search: '',
  });
};

const debouncedSearch = debounce(() => {
  if (loadingAppointmentTypes.value || addEditForm.value) return;
  pagination.value.current_page = 1;
  getAppointmentTypes({
    page: 1,
    per_page: pagination.value.per_page,
    search: searchQuery.value,
  });
}, 300);

const debouncedHandleSubmit = debounce((payload: FormData & { id?: number }, mode: 'add' | 'edit') => {
  handleSubmit(payload, mode);
}, 1000, { leading: true, trailing: false });

// Initial data fetch
onMounted(() => {
  getAppointmentTypes({
    page: 1,
    per_page: pagination.value.per_page,
    search: '',
  });
});
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-2 sm:p-4">
    <!-- Loading State -->
    <template v-if="loadingAppointmentTypes">
      <div class="loadingSpiner">
        <Loader :loading-text="'Loading appointment types...'" />
      </div>
    </template>

    <!-- Error State -->
    <template v-else-if="errorMessage">
      <div class="text-center py-4 sm:py-6 text-red-600 space-y-2">
        <p class="text-sm sm:text-base">{{ errorMessage }}</p>
        <button
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          @click="retryFetch"
        >
          <i class="va-icon mr-1">refresh</i>
          Retry
        </button>
      </div>
    </template>

    <!-- Main Content -->
    <template v-else>
      <!-- Header: Search & Controls -->
      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
        <!-- Search Section -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by appointment type name"
            class="w-full sm:w-64"
            :disabled="loadingAppointmentTypes"
            @input="debouncedSearch"
          />
          <VaButton
            v-if="searchQuery"
            color="warning"
            size="small"
            class="w-full sm:w-auto justify-center"
            @click="clearSearch"
          >
            Clear
          </VaButton>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="w-full sm:w-32"
            @update:modelValue="handlePerPageChange"
          />
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
            @click="cancelAdding"
          >
            Done
          </VaButton>
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
            @click="openForm(null, 'add')"
          >
            Add Appointment Type
          </VaButton>
        </div>
      </div>

      <!-- Data Table with Overlay Form -->
      <div class="relative">
        <!-- Overlay when form is open -->
        <div
          v-if="addEditForm"
          class="fixed inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center p-2 sm:p-4"
          @click="cancelAdding"
        >
          <!-- Form Overlay -->
          <div
            class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            @click.stop
          >
            <!-- Close button in form overlay -->
            <div class="sticky top-0 z-20 bg-white border-b px-4 py-3 rounded-t-lg flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ formMode === 'add' ? 'Add Appointment Type' : 'Edit Appointment Type' }}
              </h2>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                @click="cancelAdding"
                aria-label="Close form"
              >
                <i class="va-icon text-xl">close</i>
              </button>
            </div>

            <!-- Form Content -->
            <div class="p-4 sm:p-6">
              <AppointmentTypeForm
                v-if="formMode === 'add'"
                @close="closeForm"
                @submit="debouncedHandleSubmit"
              />
              <AppointmentTypeEdit
                v-if="formMode === 'edit' && selectedAppointmentType"
                :appointment-type="selectedAppointmentType"
                @close="closeForm"
                @submit="debouncedHandleSubmit"
              />
            </div>
          </div>
        </div>

        <!-- Table Content with reduced opacity when form is open -->
        <div :class="[
          'transition-opacity duration-300',
          addEditForm ? 'opacity-30 pointer-events-none' : 'opacity-100'
        ]">
          <!-- Empty State -->
          <div
            v-if="!appointmentTypes || (appointmentTypes.length === 0 && !loadingAppointmentTypes)"
            class="text-center py-8 sm:py-12"
          >
            <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="va-icon text-3xl sm:text-4xl text-gray-400">event</i>
            </div>
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No appointment types found</h3>
            <p v-if="searchQuery" class="text-sm text-gray-500 mb-4">
              Try adjusting your search terms
            </p>
            <p v-else class="text-sm text-gray-500 mb-6">
              Get started by adding your first appointment type
            </p>
            <VaButton
              v-if="!searchQuery && !addEditForm"
              color="#00A3E0"
              @click="openForm(null, 'add')"
            >
              <i class="va-icon mr-2">add</i>
              Add First Type
            </VaButton>
          </div>

          <!-- Data Table -->
          <div v-else-if="appointmentTypes && appointmentTypes.length > 0" class="overflow-hidden">
            <div class="overflow-x-auto border rounded-lg">
              <VaDataTable
                :key="componentKey"
                :items="appointmentTypes"
                striped
                :columns="responsiveColumns"
                :loading="loadingAppointmentTypes"
                :hoverable="!addEditForm"
                class="min-w-full"
              >
                <!-- Serial Number -->
                <template #cell(sn)="{ rowIndex }">
                  <div class="text-center sm:text-left px-2 py-1">
                    {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
                  </div>
                </template>

                <!-- Name -->
                <template #cell(name)="{ rowData }">
                  <div class="px-2 py-1 truncate max-w-[150px] sm:max-w-none" :title="rowData.name">
                    <span class="font-medium">{{ rowData.name || 'Unnamed' }}</span>
                  </div>
                </template>

                <!-- Created At -->
                <template #cell(created_at)="{ rowData }">
                  <div class="px-2 py-1">
                    <div class="font-medium">{{ formatDate(rowData.created_at, 'MMM d') }}</div>
                    <div class="text-xs text-gray-500 sm:hidden">{{ formatDate(rowData.created_at, 'yyyy') }}</div>
                  </div>
                </template>

                <!-- Actions -->
                <template #cell(actions)="{ rowData }">
                  <div class="px-1 py-1 flex justify-center sm:justify-start space-x-1 sm:space-x-2">
                    <VaButton
                      size="small"
                      color="primary"
                      icon="visibility"
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm"
                      @click="openView(rowData)"
                    />
                    <VaButton
                      size="small"
                      color="warning"
                      icon="edit"
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm"
                      @click="openForm(rowData, 'edit')"
                    />
                    <VaButton
                      size="small"
                      color="danger"
                      icon="delete"
                      class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                      rounded
                      :disabled="addEditForm"
                      @click="confirmDelete(rowData)"
                    />
                  </div>
                </template>
              </VaDataTable>
            </div>

            <!-- Pagination -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-4">
              <!-- Results Info -->
              <div class="text-sm text-gray-700 text-center sm:text-left">
                Showing <span class="font-medium">{{ computedPagination.from }}</span> to
                <span class="font-medium">{{ computedPagination.to }}</span> of
                <span class="font-medium">{{ computedPagination.total }}</span> appointment types
              </div>
              
              <!-- Pagination Controls -->
              <div class="flex flex-wrap justify-center sm:justify-end items-center gap-1 sm:gap-2">
                <VaButton
                  size="small"
                  :disabled="pagination.current_page === 1 || loadingAppointmentTypes || addEditForm"
                  class="px-3 py-1.5 min-w-[72px] h-9"
                  :color="pagination.current_page === 1 || addEditForm ? 'gray' : 'default'"
                  @click="handlePageChange(pagination.current_page - 1)"
                >
                  <i class="va-icon mr-1">chevron_left</i>
                  Previous
                </VaButton>
                
                <template v-if="paginationPages.length > 0">
                  <VaButton
                    v-for="page in paginationPages"
                    :key="page"
                    size="small"
                    :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
                    :disabled="addEditForm"
                    class="px-2.5 py-1.5 min-w-[36px] h-9 text-sm"
                    @click="handlePageChange(page)"
                  >
                    {{ page }}
                  </VaButton>
                </template>
                
                <VaButton
                  size="small"
                  :disabled="pagination.current_page === pagination.last_page || loadingAppointmentTypes || addEditForm"
                  class="px-3 py-1.5 min-w-[72px] h-9"
                  :color="pagination.current_page === pagination.last_page || addEditForm ? 'gray' : 'default'"
                  @click="handlePageChange(pagination.current_page + 1)"
                >
                  Next
                  <i class="va-icon ml-1">chevron_right</i>
                </VaButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- View Modal -->
      <VaModal
        v-model="showView"
        size="medium"
        layout="centered"
        close-button
        hide-default-actions
        class="p-2 sm:p-4"
      >
        <div class="text-base sm:text-lg font-bold mb-4 text-gray-900">
          <i class="va-icon mr-2">visibility</i>
          Appointment Type Details
        </div>
        
        <div v-if="selectedAppointmentType" class="space-y-4 text-sm">
          <!-- Main Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label class="font-medium text-gray-700 block mb-1">Name</label>
              <div class="text-sm font-medium bg-white p-2 rounded">
                {{ selectedAppointmentType.name || 'None' }}
              </div>
            </div>
          </div>

          <!-- Timestamps -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label class="font-medium text-gray-700 block mb-1">Created</label>
              <div class="text-sm bg-blue-50 p-2 rounded">
                {{ formatDate(selectedAppointmentType.created_at, 'd MMM yyyy HH:mm') || 'None' }}
              </div>
            </div>
            <div>
              <label class="font-medium text-gray-700 block mb-1">Updated</label>
              <div class="text-sm bg-blue-50 p-2 rounded">
                {{ formatDate(selectedAppointmentType.updated_at, 'd MMM yyyy HH:mm') || 'None' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <template #footer>
          <div class="flex justify-end pt-4">
            <VaButton color="secondary" @click="closeView" class="px-6">
              Close
            </VaButton>
          </div>
        </template>
      </VaModal>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.loadingSpiner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;

  @media (min-width: 640px) {
    min-height: 400px;
  }
}

/* Ensure smooth scrolling on mobile */
:deep(.va-data-table__table-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 639px) {
    border-radius: 0.5rem;
    margin: 0 -0.5rem;
  }
}

/* Improve mobile button touch targets */
:deep(.va-button--small) {
  min-height: 36px !important;

  @media (min-width: 640px) {
    min-height: 32px !important;
  }
}

/* Table header improvements */
:deep(.va-data-table__thead th) {
  @media (max-width: 639px) {
    white-space: nowrap;
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
  }
}

/* Table body improvements */
:deep(.va-data-table__tbody td) {
  @media (max-width: 639px) {
    padding: 0.75rem 0.25rem;
    vertical-align: middle;
  }
}

/* Form overlay animations */
.form-overlay-enter-active,
.form-overlay-leave-active {
  transition: all 0.3s ease;
}

.form-overlay-enter-from,
.form-overlay-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-20px);
}

.form-overlay-enter-to,
.form-overlay-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Modal responsive improvements */
:deep(.va-modal__content) {
  @media (max-width: 639px) {
    margin: 0.25rem;
    max-width: calc(100vw - 0.5rem);
  }
}
</style>