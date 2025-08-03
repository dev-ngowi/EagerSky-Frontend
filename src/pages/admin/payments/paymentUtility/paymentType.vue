<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Payment Types</h2>
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by payment type name..."
          class="w-64"
          :disabled="loadingTypes"
          @update:modelValue="handleSearchInput"
        />
        <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch">Clear Search</VaButton>
      </div>
      <div class="flex items-center space-x-4">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-32"
          @update:modelValue="handlePerPageChange"
        />
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
    <template v-if="!addEditForm">
      <div v-if="!types || (types.length === 0 && !loadingTypes)" class="text-center py-4">
        No payment types found.
      </div>
      <VaDataTable
        v-else-if="types && types.length > 0"
        :key="componentKey"
        :items="types"
        striped
        :columns="columns"
        :loading="loadingTypes"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div v-if="types && types.length > 0" class="flex justify-between items-center mt-4">
        <div>
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} payment types
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
  payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentMethod {
  id: number;
  method_name: string;
}

interface FormData {
  name: string;
  payment_method_id: string | null;
}

interface Errors {
  name: string;
  payment_method_id: string;
}

export default defineComponent({
  name: 'PaymentTypeList',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Payment Type Name' },
        { key: 'payment_method_id', sortable: true, label: 'Payment Method ID' },
        { key: 'created_at', sortable: true, label: 'Created At', render: (row: PaymentType) => this.parseDate(row.created_at, 'Created At') },
        { key: 'updated_at', sortable: true, label: 'Updated At', render: (row: PaymentType) => this.parseDate(row.updated_at, 'Updated At') },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      types: [] as PaymentType[],
      paymentMethods: [] as PaymentMethod[],
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingTypes: false,
      loadingMethods: false,
      showView: false,
      selectedType: null as PaymentType | null,
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
        name: '',
        payment_method_id: null,
      }),
      errors: reactive<Errors>({
        name: '',
        payment_method_id: '',
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
    console.log('PaymentTypeList mounted, fetching payment types and methods');
    await Promise.all([this.getTypes(), this.getPaymentMethods()]);
  },
  methods: {
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
          this.paymentMethods = response.data.data.map((method: any) => ({
            id: method.id,
            method_name: method.method_name,
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
          this.types = response.data.data.map((type: any) => ({
            id: type.id,
            name: type.name,
            payment_method_id: type.payment_method_id,
            created_at: type.created_at,
            updated_at: type.updated_at,
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
      this.debouncedSearch(value);
    },
    async handleSearch(value: string) {
      console.log('Searching with query:', value);
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
      await this.getTypes({ page: 1, per_page: perPage, search: this.searchQuery });
      this.componentKey += 1;
    },
    async cancelAdding() {
      this.closeForm();
      await this.getTypes({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
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
      this.errors.name = '';
      this.errors.payment_method_id = '';
    },
    openView(type: PaymentType) {
      this.selectedType = type;
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
        showConfirmButton: true,
        timer: undefined,
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
        if (response.status === 200) {
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
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      if (!this.form.name) {
        this.errors.name = 'Payment type name is required';
      }
      if (this.form.name && this.form.name.length > 50) {
        this.errors.name = 'Payment type name must not exceed 50 characters';
      }
      if (!this.form.payment_method_id && this.formMode === 'add') {
        this.errors.payment_method_id = 'Payment method is required';
      }

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: FormData = {
          name: this.form.name,
          payment_method_id: this.form.payment_method_id,
        };
        await this.debouncedSubmit(payload, this.formMode);
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'An unexpected error occurred';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors);
          errorMessage = Object.values(error.response.data.errors).flat().join('\n');
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
      } finally {
        this.isSubmitting = false;
      }
    },
    async handleSubmit(payload: FormData, mode: 'add' | 'edit') {
      try {
        let response;
        if (mode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            data: payload,
          });
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payment-types/${this.selectedType!.id}`,
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
            text: `Payment type has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          await this.getTypes({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
          this.closeForm();
        } else {
          let errorMessage = response.data?.message || (mode === 'add' ? 'Failed to create payment type.' : 'Failed to update payment type.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage = Object.values(response.data.errors).flat().join('\n');
            Object.assign(this.errors, response.data.errors);
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
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || (mode === 'add' ? 'Failed to create payment type.' : 'Failed to update payment type.');
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors);
          errorMessage = Object.values(error.response.data.errors).flat().join('\n');
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
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

@media screen and (max-width: 768px) {
  .card {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}

@media screen and (max-width: 480px) {
  .card {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
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

.w-32 {
  width: 8rem;
}

.w-64 {
  width: 16rem;
}

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
