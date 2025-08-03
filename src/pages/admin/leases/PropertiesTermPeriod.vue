<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Term Periods</h2>
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, landlord, or payment period..."
          class="w-64"
          :disabled="loadingMethods"
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
      <div v-if="!methods || (methods.length === 0 && !loadingMethods)" class="text-center py-4">
        No term periods found.
      </div>
      <VaDataTable
        v-else-if="methods && methods.length > 0"
        :key="componentKey"
        :items="methods"
        striped
        :columns="columns"
        :loading="loadingMethods"
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
      <div v-if="methods && methods.length > 0" class="flex justify-between items-center mt-4">
        <div>
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} term periods
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
        <h2 class="text-xl font-bold mb-4">{{ formMode === 'add' ? 'Add New Term Period' : 'Edit Term Period' }}</h2>
        <form @submit.prevent="submitForm">
          <div class="grid grid-cols-1 gap-4">
            <div class="mb-4">
              <VaSelect
                v-model="form.property_id"
                :options="properties"
                label="Property"
                value-by="value"
                text-by="text"
                :error="!!errors.property_id"
                :error-messages="errors.property_id ? [errors.property_id] : []"
                :disabled="isSubmitting || properties.length === 0"
                required
              />
            </div>
            <div class="mb-4">
              <VaSelect
                v-model="form.user_id"
                :options="landlords"
                label="Landlord"
                value-by="value"
                text-by="text"
                :error="!!errors.user_id"
                :error-messages="errors.user_id ? [errors.user_id] : []"
                :disabled="isSubmitting || landlords.length === 0"
                required
              />
            </div>
            <div class="mb-4">
              <VaSelect
                v-model="form.period_of_payment"
                :options="paymentPeriodOptions"
                label="Payment Period"
                value-by="value"
                text-by="text"
                :error="!!errors.period_of_payment"
                :error-messages="errors.period_of_payment ? [errors.period_of_payment] : []"
                :disabled="isSubmitting"
                required
              />
            </div>
            <div class="mb-4">
              <VaInput
                v-model.number="form.amount"
                label="Amount"
                type="number"
                placeholder="Enter amount"
                :error="!!errors.amount"
                :error-messages="errors.amount ? [errors.amount] : []"
                :disabled="isSubmitting"
                required
              />
            </div>
            <div class="mb-4">
              <VaInput
                v-model="form.effective_from"
                label="Effective From"
                type="date"
                :error="!!errors.effective_from"
                :error-messages="errors.effective_from ? [errors.effective_from] : []"
                :disabled="isSubmitting"
                required
              />
            </div>
            <div class="mb-4">
              <VaInput
                v-model="form.notes"
                label="Notes"
                placeholder="Enter notes (optional)"
                :error="!!errors.notes"
                :error-messages="errors.notes ? [errors.notes] : []"
                :disabled="isSubmitting"
              />
            </div>
            <div class="mb-4">
              <VaCheckbox
                v-model="form.is_active"
                label="Is Active"
                :disabled="isSubmitting"
              />
            </div>
          </div>
          <div class="flex justify-end space-x-2 mt-4">
            <VaButton color="secondary" :disabled="isSubmitting" @click="closeForm">Cancel</VaButton>
            <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
              <div v-if="isSubmitting" class="spinner" />
              <span v-else>Submit</span>
            </VaButton>
          </div>
        </form>
      </div>
    </template>
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Term Period Details</div>
      <div v-if="selectedMethod" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedMethod.property_title || 'N/A' }}</p>
        <p><strong>Landlord:</strong> {{ selectedMethod.landlord_name || 'N/A' }}</p>
        <p><strong>Payment Period:</strong> {{ selectedMethod.period_of_payment || 'N/A' }}</p>
        <p><strong>Amount:</strong> {{ selectedMethod.amount || 'N/A' }}</p>
        <p><strong>Effective From:</strong> {{ parseDate(selectedMethod.effective_from, 'Effective From') }}</p>
        <p><strong>Notes:</strong> {{ selectedMethod.notes || 'N/A' }}</p>
        <p><strong>Active:</strong> {{ selectedMethod.is_active ? 'Yes' : 'No' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../services/makeRequest';

interface TermPeriod {
  id: number;
  property_id: number;
  property_title: string;
  landlord_id: number;
  landlord_name: string;
  period_of_payment: string;
  amount: number;
  effective_from: string;
  notes: string | null;
  is_active: boolean;
}

interface FormData {
  property_id: number | null;
  user_id: number | null;
  period_of_payment: string;
  amount: number | null;
  effective_from: string;
  notes: string;
  is_active: boolean;
}

interface Errors {
  property_id: string;
  user_id: string;
  period_of_payment: string;
  amount: string;
  effective_from: string;
  notes: string;
}

export default defineComponent({
  name: 'TermPeriodList',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'landlord_name', sortable: true, label: 'Landlord' },
        { key: 'period_of_payment', sortable: true, label: 'Payment Period' },
        { key: 'amount', sortable: true, label: 'Amount' },
        { key: 'effective_from', sortable: true, label: 'Effective From', render: (row: TermPeriod) => this.parseDate(row.effective_from, 'Effective From') },
        { key: 'is_active', sortable: true, label: 'Active', render: (row: TermPeriod) => row.is_active ? 'Yes' : 'No' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      methods: [] as TermPeriod[],
      properties: [] as { value: number; text: string }[],
      landlords: [] as { value: number; text: string }[],
      paymentPeriodOptions: [
        { value: 'monthly', text: 'Monthly' },
        { value: 'quarterly', text: 'Quarterly' },
        { value: 'annually', text: 'Annually' },
      ],
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
      selectedMethod: null as TermPeriod | null,
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
        property_id: null,
        user_id: null,
        period_of_payment: '',
        amount: null,
        effective_from: '',
        notes: '',
        is_active: true,
      }),
      errors: reactive<Errors>({
        property_id: '',
        user_id: '',
        period_of_payment: '',
        amount: '',
        effective_from: '',
        notes: '',
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
    console.log('TermPeriodList mounted, fetching term periods');
    await this.getMethods();
    await this.fetchOptions(); // Preload options on mount
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
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties-term-period`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        console.log('getMethods response:', response);
        if (response.status === 200) {
          this.methods = response.data.data;
          this.pagination = response.data.pagination;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No term periods found.',
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
            text: response.data?.message || 'Failed to fetch term periods.',
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
          text: error.response?.data?.message || error.message || 'Failed to fetch term periods.',
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
    async fetchOptions() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties-term-period/create-options`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('fetchOptions response:', response);
        if (response.status === 200) {
          this.properties = response.data.data.properties || [];
          this.landlords = response.data.data.landlords || [];
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Warning',
              text: 'No properties available to select.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
          if (this.landlords.length === 0) {
            Swal.fire({
              title: 'Warning',
              text: 'No landlord available to select.',
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
            text: response.data?.message || 'Failed to fetch form options.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchOptions error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch form options.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
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
    async openForm(method: TermPeriod | null, mode: 'add' | 'edit') {
      this.formMode = mode;
      this.addEditForm = true;
      await this.fetchOptions(); // Fetch options before setting form values
      if (mode === 'edit' && method) {
        this.selectedMethod = method;
        // Ensure properties are loaded before setting property_id
        if (this.properties.length > 0) {
          this.form.property_id = this.properties.find(p => p.value === method.property_id)?.value ?? null;
        } else {
          this.form.property_id = method.property_id ?? null;
          Swal.fire({
            title: 'Warning',
            text: 'Property options not loaded. Displaying ID only.',
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        this.form.user_id = this.landlords.find(l => l.value === method.landlord_id)?.value ?? null;
        this.form.period_of_payment = method.period_of_payment || '';
        this.form.amount = method.amount ?? null;
        this.form.effective_from = method.effective_from ? method.effective_from.split(' ')[0] : '';
        this.form.notes = method.notes || '';
        this.form.is_active = method.is_active ?? true;
      } else {
        this.selectedMethod = null;
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
      this.form.property_id = null;
      this.form.user_id = this.landlords.length === 1 ? this.landlords[0]?.value : null; // Auto-select landlord if only one
      this.form.period_of_payment = '';
      this.form.amount = null;
      this.form.effective_from = '';
      this.form.notes = '';
      this.form.is_active = true;
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));
    },
    openView(method: TermPeriod) {
      this.selectedMethod = method;
      this.showView = true;
    },
    closeView() {
      this.selectedMethod = null;
      this.showView = false;
    },
    async confirmDelete(method: TermPeriod) {
      this.selectedMethod = method;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the term period for "${method.property_title}". This action cannot be undone.`,
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
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties-term-period/${this.selectedMethod.id}`,
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
            text: 'Term period has been deleted successfully.',
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
            text: response.data?.message || 'Failed to delete term period.',
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
          text: error.response?.data?.message || 'Failed to delete term period.',
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

      if (!this.form.property_id) {
        this.errors.property_id = 'Property is required';
      }
      if (!this.form.user_id) {
        this.errors.user_id = 'Landlord is required';
      }
      if (!this.form.period_of_payment) {
        this.errors.period_of_payment = 'Payment period is required';
      }
      if (this.form.amount === null || this.form.amount === undefined) {
        this.errors.amount = 'Amount is required';
      } else if (this.form.amount < 0) {
        this.errors.amount = 'Amount must be non-negative';
      }
      if (!this.form.effective_from) {
        this.errors.effective_from = 'Effective from date is required';
      }
      if (this.form.notes && this.form.notes.length > 255) {
        this.errors.notes = 'Notes must not exceed 255 characters';
      }

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: FormData = {
          property_id: this.form.property_id,
          user_id: this.form.user_id,
          period_of_payment: this.form.period_of_payment,
          amount: this.form.amount,
          effective_from: this.form.effective_from,
          notes: this.form.notes,
          is_active: this.form.is_active,
        };
        await this.debouncedSubmit(payload, this.formMode);
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'An unexpected error occurred',
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
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties-term-period`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            data: payload,
          });
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties-term-period/${this.selectedMethod!.id}`,
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
            text: `Term period has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
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
          let errorMessage = response.data?.message || (mode === 'add' ? 'Failed to create term period.' : 'Failed to update term period.');
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
        let errorMessage = error.response?.data?.message || (mode === 'add' ? 'Failed to create term period.' : 'Failed to update term period.');
        if (error.response?.data?.errors) {
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
   padding-left: .5rem;
   padding-right:  .5rem;
   padding-top: .35rem;
   padding-bottom: .35rem;
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
  width: auto;
}

.border {
  border: 1px solid #e5e7eb;
}

.rounded {
  border-radius: 0.5rem;
}

.bg-gray- {
  background-color: #f0f3f0;
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