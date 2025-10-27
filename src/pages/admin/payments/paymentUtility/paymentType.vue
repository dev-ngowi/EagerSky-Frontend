<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Payment Types</h2>
    <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-4 md:space-y-0">
      
      <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by payment type name or payment method..."
          class="w-full sm:w-64"
          :disabled="loadingTypes"
          @update:modelValue="handleSearchInput"
        />
        <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch">Clear Search</VaButton>
      </div>
      <div class="flex items-center space-x-4 w-full md:w-auto justify-between sm:justify-end">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-32"
          @update:modelValue="handlePerPageChange"
        />
        <div class="flex items-center space-x-4">
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="px-4"
            @click="openForm(null, 'add')"
          >
            Add
          </VaButton>
          <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
            Done
          </VaButton>
        </div>
      </div>
    </div>
   
    <template v-if="!addEditForm">
      <div v-if="!types || (types.length === 0 && !loadingTypes)" class="text-center py-4">
        No payment types found.
      </div>
      <div
        v-else-if="types && types.length > 0"
        class="overflow-x-auto"
      >
        <VaDataTable
          :key="componentKey"
          :items="types"
          striped
          :columns="columns"
          :loading="loadingTypes"
          class="min-w-full"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </template>
          <template #cell(payment_method_name)="{ rowData }">
            {{ rowData.payment_methods?.method_name || 'N/A' }}
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="flex space-x-1">
              <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
              <VaButton size="small" color="warning" icon="edit" @click="openForm(rowData, 'edit')" />
              <VaButton size="small" color="danger" icon="delete" @click="confirmDelete(rowData)" />
            </div>
          </template>
        </VaDataTable>
      </div>
      <div v-if="types && types.length > 0" class="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-2 sm:space-y-0">
        <div class="text-sm text-center sm:text-left">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} payment types
        </div>
        <div class="flex flex-wrap justify-center sm:justify-end space-x-1 sm:space-x-2">
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
        <h2 class="text-xl font-bold mb-4">{{ formMode === 'add' ? 'Add New Payment Type' : 'Edit Payment Type' }}</h2>
        <form @submit.prevent="submitForm">
          <div class="grid grid-cols-1 gap-4">
            <div class="mb-4">
              <VaInput
                v-model="form.name"
                label="Payment Type Name"
                placeholder="Enter payment type name"
                :error="!!errors.name"
                :error-messages="errors.name ? [errors.name] : []"
                :disabled="isSubmitting"
                required
              />
            </div>
            <div class="mb-4">
              <VaSelect
                v-model="form.payment_method_id"
                :options="paymentMethods"
                label="Payment Method"
                placeholder="Select payment method"
                value-by="id"
                text-by="method_name"
                :error="!!errors.payment_method_id"
                :error-messages="errors.payment_method_id ? [errors.payment_method_id] : []"
                :disabled="isSubmitting || loadingMethods"
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
      <div class="text-lg font-bold mb-4">Payment Type Details</div>
      <div v-if="selectedType" class="space-y-2">
        <p><strong>Name:</strong> {{ selectedType.name || 'N/A' }}</p>
        <p><strong>Payment Method:</strong> {{ selectedType.payment_methods?.method_name || 'N/A' }}</p>
        <p><strong>Payment Method ID:</strong> {{ selectedType.payment_method_id || 'N/A' }}</p>
        <p><strong>Created At:</strong> {{ parseDate(selectedType.created_at, 'Created At') }}</p>
        <p><strong>Updated At:</strong> {{ parseDate(selectedType.updated_at, 'Updated At') }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, ref, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';
interface PaymentType {
  id: number;
  name: string;
  payment_method_id: number | null;
  payment_methods?: {
    id: number;
    // UPDATED: Changed 'name' to 'method_name' to match the endpoint response structure
    method_name: string;
    method_type: string; // Added method_type as seen in the response
    created_at: string;
    updated_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}
interface PaymentMethod {
  id: number;
  method_name: string;
}
interface FormData {
  name: string;
  payment_method_id: number | null;
}
interface Errors {
  name: string;
  payment_method_id: string;
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
  name: 'PaymentTypeList',
  
  setup() {
    const columns = [
      { key: 'sn', sortable: false, label: 'SN' },
      { key: 'name', sortable: true, label: 'Payment Type Name' },
      {
        key: 'payment_method_name',
        sortable: true,
        // UPDATED: Label remains the same for display purposes
        label: 'Payment Method',
      },
      { key: 'created_at', sortable: true, label: 'Created At' },
      { key: 'updated_at', sortable: true, label: 'Updated At' },
      { key: 'actions', label: 'Actions', sortable: false },
    ];
    const types = ref<PaymentType[]>([]);
    const paymentMethods = ref<PaymentMethod[]>([]);
    const pagination = reactive<Pagination>({
      total: 0,
      per_page: 15,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });
    const loadingTypes = ref(false);
    const loadingMethods = ref(false);
    const showView = ref(false);
    const selectedType = ref<PaymentType | null>(null);
    const addEditForm = ref(false);
    const formMode = ref<'add' | 'edit'>('add');
    const componentKey = ref(0);
    const searchQuery = ref('');
    const isSubmitting = ref(false);
    const perPageOptions = [
      { value: 10, text: '10' },
      { value: 15, text: '15' },
      { value: 25, text: '25' },
      { value: 50, text: '50' },
    ];
    const form = reactive<FormData>({
      name: '',
      payment_method_id: null,
    });
    const errors = reactive<Errors>({
      name: '',
      payment_method_id: '',
    });
    const debouncedSearch = ref<((value: string) => void) | null>(null);
    const paginationPages = computed(() => {
      const pages: number[] = [];
      const lastPage = pagination.last_page;
      const current = pagination.current_page;
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
    return {
      columns,
      types,
      paymentMethods,
      pagination,
      loadingTypes,
      loadingMethods,
      showView,
      selectedType,
      addEditForm,
      formMode,
      componentKey,
      searchQuery,
      isSubmitting,
      perPageOptions,
      form,
      errors,
      paginationPages,
      debouncedSearch,
    };
  },
  async mounted() {
    console.log('PaymentTypeList mounted, fetching payment types and methods');
    await Promise.all([this.getTypes(), this.getPaymentMethods()]);
    this.debouncedSearch = debounce((value: string) => {
      this.handleSearch(value);
    }, 500);
  },
  methods: {
    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) {
        console.warn(`${context}: Date string is null or undefined`);
        return 'N/A';
      }
      try {
        let parsed = parse(dateStr, "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'", new Date());
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
    async getPaymentMethods() {
      this.loadingMethods = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-methods`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('getPaymentMethods response:', response);
        if (response.status === 200) {
          // Note: Assuming the /payment-methods endpoint returns a method_name or a name field
          // The structure of the payment_methods array in the main response suggests the full list endpoint might return "method_name"
          this.paymentMethods = response.data.data.map((method: any) => ({
            id: method.id,
            // Prioritize method_name as suggested by the main response's nested object, fallback to name
            method_name: method.method_name || method.name,
          }));
          if (this.paymentMethods.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No payment methods available. Please add payment methods first.',
              icon: 'warning',
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
        console.error('getPaymentMethods error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch payment methods.',
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
    async getTypes(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingTypes = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };
        if (params.search || this.searchQuery) {
          requestParams.search = params.search || this.searchQuery;
        }
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        
        console.log('getTypes response:', response);
        
        if (response.status === 200) {
          // Map response data including payment_methods relationship
          this.types = response.data.data.map((type: any) => ({
            id: type.id,
            name: type.name,
            payment_method_id: type.payment_method_id,
            // The structure already correctly includes the nested payment_methods object
            payment_methods: type.payment_methods,
            created_at: type.created_at,
            updated_at: type.updated_at,
          })) as PaymentType[]; // Assert type for safety
          this.pagination = {
            total: response.data.total || this.types.length,
            per_page: response.data.per_page || params.per_page || 15,
            current_page: response.data.current_page || params.page || 1,
            last_page: response.data.last_page || 1,
            from: response.data.from || (this.types.length > 0 ? (response.data.current_page - 1) * response.data.per_page + 1 : 0),
            to: response.data.to || Math.min(response.data.current_page * response.data.per_page, response.data.total),
          };
          if (this.types.length === 0 && !this.searchQuery) {
            Swal.fire({
              title: 'Info',
              text: 'No payment types found.',
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
            text: response.data?.message || 'Failed to fetch payment types.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getTypes error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch payment types.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingTypes = false;
      }
    },
    async handleSearchInput(value: string) {
      this.searchQuery = value;
      console.log('Search input changed:', value);
      if (this.debouncedSearch) {
        this.debouncedSearch(value);
      }
    },
    async handleSearch(value: string) {
      console.log('Searching with query:', value);
      // Reset to page 1 for search results
      await this.getTypes({ page: 1, per_page: this.pagination.per_page, search: value });
      this.componentKey += 1;
    },
    clearSearch() {
      this.searchQuery = '';
      console.log('Clearing search');
      this.getTypes({ page: 1, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      console.log('Changing page to:', page);
      await this.getTypes({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      console.log('Changing per page to:', perPage);
      this.pagination.per_page = perPage;
      // Reset to page 1 on per_page change
      await this.getTypes({ page: 1, per_page: perPage, search: this.searchQuery });
      this.componentKey += 1;
    },
    async cancelAdding() {
      this.closeForm();
      // Optionally re-fetch data or rely on existing data refresh
      if (this.types.length === 0) {
        await this.getTypes({
          page: this.pagination.current_page,
          per_page: this.pagination.per_page,
          search: this.searchQuery,
        });
      }
    },
    openForm(type: PaymentType | null, mode: 'add' | 'edit') {
      this.selectedType = type;
      this.formMode = mode;
      this.addEditForm = true;
      if (mode === 'edit' && type) {
        this.form.name = type.name;
        this.form.payment_method_id = type.payment_method_id;
      } else {
        this.resetForm();
      }
    },
    closeForm() {
      this.selectedType = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.resetForm();
    },
    resetForm() {
      this.form.name = '';
      this.form.payment_method_id = null;
      Object.keys(this.errors).forEach((key) => {
        (this.errors as any)[key] = '';
      });
    },
    openView(type: PaymentType) {
      // Create a deep copy to avoid mutating original data
      this.selectedType = {
        ...type,
        payment_methods: type.payment_methods ? { ...type.payment_methods } : null
      };
      this.showView = true;
    },
    closeView() {
      this.selectedType = null;
      this.showView = false;
    },
    async confirmDelete(type: PaymentType) {
      this.selectedType = type;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the payment type "${type.name}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete();
        }
      });
    },
    async handleDelete() {
      if (!this.selectedType?.id) return;
      this.loadingTypes = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types/${this.selectedType.id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('Delete response:', response);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Payment type has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedType = null;
          this.componentKey += 1;
          // Re-fetch data to update the list and pagination
          await this.getTypes({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete payment type.',
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
          text: error.response?.data?.message || 'Failed to delete payment type.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingTypes = false;
      }
    },
    async submitForm() {
      // Clear previous errors
      Object.keys(this.errors).forEach((key) => {
        (this.errors as any)[key] = '';
      });
      // Client-side validation
      if (!this.form.name.trim()) {
        this.errors.name = 'Payment type name is required';
      } else if (this.form.name.length > 50) {
        this.errors.name = 'Payment type name must not exceed 50 characters';
      }
      if (!this.form.payment_method_id) {
        this.errors.payment_method_id = 'Payment method is required';
      }
      if (Object.values(this.errors).some((error) => error)) {
        return;
      }
      this.isSubmitting = true;
      try {
        const payload: FormData = {
          name: this.form.name.trim(),
          payment_method_id: this.form.payment_method_id,
        };
        const response = await makeRequest({
          url: this.formMode === 'add'
            ? `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types`
            : `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types/${this.selectedType!.id}`,
          method: this.formMode === 'add' ? 'post' : 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log(`${this.formMode} response:`, response);
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: this.formMode === 'add' ? 'Created!' : 'Updated!',
            text: `Payment type has been ${this.formMode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          // Re-fetch data to show the new/updated entry
          await this.getTypes({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
          this.closeForm();
        } else {
          this.handleSubmitError(response);
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        this.handleSubmitError(error.response || error);
      } finally {
        this.isSubmitting = false;
      }
    },
    handleSubmitError(errorResponse: any) {
      let errorMessage = errorResponse?.data?.message ||
        (this.formMode === 'add' ? 'Failed to create payment type.' : 'Failed to update payment type.');
      if (errorResponse?.status === 422 && errorResponse?.data?.errors) {
        // Map backend validation errors
        Object.assign(this.errors, errorResponse.data.errors);
        errorMessage = Object.values(errorResponse.data.errors).flat().join('\n');
      }
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 5000,
      });
    },
  },
});
</script>
<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 1.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.ml-2 {
  margin-left: 0.5rem;
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
</style>