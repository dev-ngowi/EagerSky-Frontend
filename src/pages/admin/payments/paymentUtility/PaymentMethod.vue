<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Payment Methods</h2>
    
    <div class="controls-wrapper">
      
      <div class="search-group">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by name..."
          class="va-input-full-width"
          :disabled="loadingMethods"
          @update:modelValue="handleSearchInput"
        />
        <VaButton 
          v-if="searchQuery" 
          color="warning" 
          size="small" 
          @click="clearSearch"
          class="clear-search-btn"
        >
          Clear
        </VaButton>
      </div>

      <div class="actions-group">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Per page"
          value-by="value"
          text-by="text"
          class="va-select-per-page"
          @update:modelValue="handlePerPageChange"
        />
        
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="add-button"
          @click="openForm(null, 'add')"
        >
          Add
        </VaButton>
        <VaButton 
          v-if="addEditForm" 
          icon="close" 
          color="success" 
          size="small" 
          class="done-button" 
          @click="cancelAdding"
        >
          Done
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <div v-if="!methods || (methods.length === 0 && !loadingMethods)" class="text-center py-4">
        No payment methods found.
      </div>
      <VaDataTable
        v-else-if="methods && methods.length > 0"
        :key="componentKey"
        :items="methods"
        striped
        :columns="columns"
        :loading="loadingMethods"
        class="responsive-data-table"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <div class="flex-nowrap">
            <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" title="View" />
            <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" title="Edit" />
            <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" title="Delete" />
          </div>
        </template>
      </VaDataTable>
      
      <div v-if="methods && methods.length > 0" class="pagination-wrapper">
        <div class="pagination-summary">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} methods
        </div>
        <div class="pagination-controls">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1"
            @click="handlePageChange(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
          >
            {{ page }}
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
      <div class="p-4">
        <h2 class="text-xl font-bold mb-4">{{ formMode === 'add' ? 'Add New Payment Method' : 'Edit Payment Method' }}</h2>
        <form @submit.prevent="submitForm">
          <div class="grid grid-cols-1 gap-4">
            <div class="mb-4">
              <VaInput
                v-model="form.method_name"
                label="Payment Method Name"
                placeholder="Enter payment method name"
                :error="!!errors.method_name"
                :error-messages="errors.method_name ? [errors.method_name] : []"
                :disabled="isSubmitting"
                required
              />
            </div>
          </div>
          <div class="flex justify-end space-x-2 mt-4">
            <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
            <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
              <div v-if="isSubmitting" class="spinner" />
              <span v-else>Submit</span>
            </VaButton>
          </div>
        </form>
      </div>
    </template>
    
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Payment Method Details</div>
      <div v-if="selectedMethod" class="space-y-2">
        <p><strong>Name:</strong> {{ selectedMethod.method_name || 'N/A' }}</p>
        <p><strong>Created At:</strong> {{ parseDate(selectedMethod.created_at, 'Created At') }}</p>
        <p><strong>Updated At:</strong> {{ parseDate(selectedMethod.updated_at, 'Updated At') }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
// Script section is unchanged as responsiveness is primarily a concern of the template and styles.
// ... (The entire script block from your original code is here) ...
import { defineComponent, reactive, ref, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface PaymentMethod {
  id: number;
  method_name: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  method_name: string;
}

interface Errors {
  method_name: string;
}

export default defineComponent({
  name: 'PaymentMethodList',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'method_name', sortable: true, label: 'Payment Method Name' },
        { key: 'created_at', sortable: true, label: 'Created At', render: (row: PaymentMethod) => this.parseDate(row.created_at, 'Created At') },
        { key: 'updated_at', sortable: true, label: 'Updated At', render: (row: PaymentMethod) => this.parseDate(row.updated_at, 'Updated At') },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      methods: [] as PaymentMethod[],
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingMethods: false,
      showView: false,
      selectedMethod: null as PaymentMethod | null,
      addEditForm: false,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      searchQuery: '' as string,
      isSubmitting: false,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      form: reactive<FormData>({
        method_name: '',
      }),
      errors: reactive<Errors>({
        method_name: '',
      }),
      debouncedSearch: debounce(
        function (this: any, value: string) {
          this.handleSearch(value);
        },
        500
      ) as (value: string) => void,
      debouncedSubmit: debounce(
        function (this: any, payload: FormData, mode: 'add' | 'edit') {
          return this.handleSubmit(payload, mode);
        },
        1000,
        { leading: true, trailing: false }
      ) as (payload: FormData, mode: 'add' | 'edit') => void,
    };
  },
  computed: {
    paginationPages() {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page;
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
  },
  async mounted() {
    console.log('PaymentMethodList mounted, fetching payment methods');
    await this.getMethods();
  },
  methods: {
    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) {
        console.warn(`${context}: Date string is null or undefined`);
        return 'N/A';
      }
      try {
        let parsed = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        parsed = new Date(dateStr);
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        console.warn(`${context}: Invalid date format for "${dateStr}"`);
        return 'N/A';
      } catch (error) {
        console.error(`${context}: Error parsing date "${dateStr}"`, error);
        return 'N/A';
      }
    },
    async getMethods(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingMethods = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (params.search || this.searchQuery) {
          requestParams.search = params.search || this.searchQuery;
        }

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        console.log('getMethods response:', response);
        if (response.status === 200) {
          this.methods = response.data.data.map((method: any) => ({
            id: method.id,
            method_name: method.method_name,
            created_at: method.created_at,
            updated_at: method.updated_at,
          }));
          this.pagination = {
            total: response.data.total || response.data.data.length,
            per_page: response.data.per_page || params.per_page || 15,
            current_page: response.data.current_page || params.page || 1,
            last_page: response.data.last_page || 1,
            from: response.data.from || (response.data.data.length > 0 ? (response.data.current_page - 1) * response.data.per_page + 1 : 0),
            to: response.data.to || Math.min(response.data.current_page * response.data.per_page, response.data.total),
          };
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No payment methods found.',
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
            text: response.data?.message || 'Failed to fetch payment methods.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getMethods error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch payment methods.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingMethods = false;
      }
    },
    async handleSearchInput(value: string) {
      this.searchQuery = value;
      console.log('Search input changed:', value);
      this.debouncedSearch(value);
    },
    async handleSearch(value: string) {
      console.log('Searching with query:', value);
      await this.getMethods({ page: 1, per_page: this.pagination.per_page, search: value });
      this.componentKey += 1;
    },
    clearSearch() {
      this.searchQuery = '';
      console.log('Clearing search');
      this.getMethods({ page: 1, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      console.log('Changing page to:', page);
      await this.getMethods({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      console.log('Changing per page to:', perPage);
      this.pagination.per_page = perPage;
      await this.getMethods({ page: 1, per_page: perPage, search: this.searchQuery });
      this.componentKey += 1;
    },
    async cancelAdding() {
      this.closeForm();
      await this.getMethods({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },
    openForm(method: PaymentMethod | null, mode: 'add' | 'edit') {
      this.selectedMethod = method;
      this.formMode = mode;
      this.addEditForm = true;
      if (mode === 'edit' && method) {
        this.form.method_name = method.method_name;
      } else {
        this.resetForm();
      }
    },
    closeForm() {
      this.selectedMethod = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.resetForm();
    },
    resetForm() {
      this.form.method_name = '';
      this.errors.method_name = '';
    },
    openView(method: PaymentMethod) {
      this.selectedMethod = method;
      this.showView = true;
    },
    closeView() {
      this.selectedMethod = null;
      this.showView = false;
    },
    async confirmDelete(method: PaymentMethod) {
      this.selectedMethod = method;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the payment method "${method.method_name}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
        timer: undefined,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete();
        }
      });
    },
    async handleDelete() {
      if (!this.selectedMethod?.id) return;
      this.loadingMethods = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods/${this.selectedMethod.id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('Delete response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Payment method has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedMethod = null;
          this.componentKey += 1;
          await this.getMethods({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete payment method.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Delete error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete payment method.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingMethods = false;
      }
    },
    async submitForm() {
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      if (!this.form.method_name) {
        this.errors.method_name = 'Payment method name is required';
      }
      if (this.form.method_name && this.form.method_name.length > 50) {
        this.errors.method_name = 'Payment method name must not exceed 50 characters';
      }

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: FormData = {
          method_name: this.form.method_name,
        };
        await this.debouncedSubmit(payload, this.formMode);
      } catch (error: any) {
        console.error('Submission error:', error.message);
        this.errors.method_name = error.response?.data?.message || 'An unexpected error occurred';
        Swal.fire({
          title: 'Error!',
          text: this.errors.method_name,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.isSubmitting = false;
      }
    },
    async handleSubmit(payload: FormData, mode: 'add' | 'edit') {
      try {
        let response;
        if (mode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            data: payload,
          });
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods/${this.selectedMethod!.id}`,
            method: 'put',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            data: payload,
          });
        }
        console.log(`${mode} response:`, response);
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Payment method has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          await this.getMethods({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
          this.closeForm();
        } else {
          let errorMessage = response.data?.message || (mode === 'add' ? 'Failed to create payment method.' : 'Failed to update payment method.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage += '\n' + Object.values(response.data.errors).flat().join('\n');
            Object.assign(this.errors, response.data.errors);
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
        let errorMessage = error.response?.data?.message || (mode === 'add' ? 'Failed to create payment method.' : 'Failed to update payment method.');
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors);
          errorMessage += '\n' + Object.values(error.response.data.errors).flat().join('\n');
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
  },
});
</script>

<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 1.5rem; /* Default padding for desktop */
}

/* --- Responsive Controls and Layout --- */

.controls-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.search-group, .actions-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.va-input-full-width {
  width: 16rem; /* Default desktop width */
}

.va-select-per-page {
  width: 8rem; /* Default desktop width */
}

/* Pagination Wrapper for responsiveness */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.pagination-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap; /* Allows buttons to wrap on smaller screens */
}

/* Mobile: < 768px */
@media screen and (max-width: 768px) {
  .card {
    padding: 1rem;
  }

  /* Stack controls vertically on mobile */
  .controls-wrapper {
    flex-direction: column;
    align-items: stretch; /* Stretch items to full width */
    gap: 1rem;
  }

  .search-group {
    width: 100%;
    /* Keep search and clear in a row */
    justify-content: flex-start; 
    gap: 0.5rem; /* tighter spacing for mobile */
  }

  .va-input-full-width {
    width: 100%; /* Search input takes up available width */
    flex-grow: 1;
  }
  
  .clear-search-btn {
      /* Ensure button doesn't take up too much space */
      white-space: nowrap; 
      flex-shrink: 0;
  }

  .actions-group {
    width: 100%;
    /* Distribute space between per page and action buttons */
    justify-content: space-between; 
    gap: 0.5rem;
  }

  .va-select-per-page {
    width: 6rem; /* Smaller width for select */
    flex-shrink: 0;
  }
  
  .add-button, .done-button {
      flex-grow: 1;
      text-align: center;
  }

  /* Data Table Responsiveness: Force horizontal scroll for smaller screens */
  .responsive-data-table {
      overflow-x: auto;
  }

  /* Pagination: Stack summary and controls on mobile */
  .pagination-wrapper {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .pagination-summary {
      font-size: 0.875rem; /* Smaller font size for summary */
  }
}

/* Extra Small Mobile: < 480px */
@media screen and (max-width: 480px) {
    .card {
        padding: 0.5rem;
    }
    
    .search-group {
        /* If both search and clear still don't fit well, 
           you might make the search input slightly smaller or 
           remove the 'Clear' text and just keep the icon, but this 
           current setup should be fine. */
    }

    .actions-group {
        /* The justify-between makes the select on the left and 
           action button on the right, which is good for small screens. */
    }
}


/* --- Original Styles (Kept for completeness) --- */

.mb-4 {
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}

/* The original 'flex', 'justify-between', 'items-center', etc. 
   are now contained within the new specific classes like 
   .controls-wrapper, .search-group, .actions-group, and 
   .pagination-wrapper. */

.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}

/* Replaced .space-x-4 with .search-group and .actions-group gap: 1rem */

/* Replaced .w-32, .w-64 with .va-select-per-page and .va-input-full-width 
   and used media queries to override for responsiveness. */

.border {
  border: 1px solid #e5e7eb;
}

.rounded {
  border-radius: 0.5rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: 1fr;
}

.gap-4 {
  gap: 1rem;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ml-2 {
  margin-left: 0.5rem;
}
</style>