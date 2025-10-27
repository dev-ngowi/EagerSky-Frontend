<template>
  <div class="card">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
      <h2 class="text-lg sm:text-xl font-bold text-gray-900">Term Periods</h2>
      
      <VaButton
        v-if="!addEditForm"
        icon="add"
        color="#00A3E0"
        size="small"
        class="w-full sm:w-auto px-4 justify-center whitespace-nowrap"
        :disabled="loadingMethods"
        @click="openForm(null, 'add')"
      >
        Add Term Period
      </VaButton>
    </div>
    
    <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto flex-wrap">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, landlord, or payment period..."
          class="w-full sm:w-64"
          :disabled="loadingMethods || addEditForm"
          @update:modelValue="handleSearchInput"
        />
        <VaButton 
          v-if="searchQuery" 
          color="warning" 
          size="small" 
          class="w-full sm:w-auto justify-center"
          :disabled="loadingMethods || addEditForm"
          @click="clearSearch"
        >
          Clear
        </VaButton>
      </div>
      
      <div class="flex items-center gap-2 sm:gap-4 w-full lg:w-auto">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-full sm:w-32"
          :disabled="loadingMethods || addEditForm"
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
      </div>
    </div>
    
    <div class="relative">
      <div 
        v-if="addEditForm" 
        class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-2 sm:p-4"
        @click="cancelAdding"
      >
        <div 
          class="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
          @click.stop
        >
          <div class="sticky top-0 z-10 bg-white border-b px-4 py-3 rounded-t-lg flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
              <i class="va-icon mr-2 text-blue-500">{{ formMode === 'add' ? 'add' : 'edit' }}</i>
              {{ formMode === 'add' ? 'Add New Term Period' : 'Edit Term Period' }}
            </h3>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 flex items-center justify-center"
              @click="cancelAdding"
              aria-label="Close form"
            >
              <i class="va-icon">close</i>
            </button>
          </div>
          
          <div class="p-4 sm:p-6">
            <form @submit.prevent="submitForm" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <VaSelect
                    v-model="form.property_id"
                    :options="properties"
                    label="Property *"
                    value-by="value"
                    text-by="text"
                    :error="!!errors.property_id"
                    :error-messages="errors.property_id ? [errors.property_id] : []"
                    :disabled="isSubmitting || properties.length === 0"
                    searchable
                    clearable
                    required
                  />
                </div>
                
                <div>
                  <VaSelect
                    v-model="form.user_id"
                    :options="landlords"
                    label="Landlord *"
                    value-by="value"
                    text-by="text"
                    :error="!!errors.user_id"
                    :error-messages="errors.user_id ? [errors.user_id] : []"
                    :disabled="isSubmitting || landlords.length === 0"
                    searchable
                    clearable
                    required
                  />
                </div>
                
                <div>
                  <VaSelect
                    v-model="form.period_of_payment"
                    :options="paymentPeriodOptions"
                    label="Payment Period *"
                    value-by="value"
                    text-by="text"
                    :error="!!errors.period_of_payment"
                    :error-messages="errors.period_of_payment ? [errors.period_of_payment] : []"
                    :disabled="isSubmitting"
                    required
                  />
                </div>
                
                <div>
                  <VaInput
                    v-model.number="form.amount"
                    label="Rent per Month with Service Charge *"
                    type="number"
                    :error="!!errors.amount"
                    :error-messages="errors.amount ? [errors.amount] : []"
                    disabled
                    class="bg-gray-50"
                  />
                  <p v-if="form.property_id" class="text-xs text-gray-500 mt-1">
                    Auto-filled from selected property
                  </p>
                </div>
                
                <div class="md:col-span-2">
                  <VaInput
                    v-model="form.effective_from"
                    label="Effective From *"
                    type="date"
                    :error="!!errors.effective_from"
                    :error-messages="errors.effective_from ? [errors.effective_from] : []"
                    :disabled="isSubmitting"
                    required
                  />
                </div>
                
                <div class="md:col-span-2">
                  <VaInput
                    v-model="form.notes"
                    label="Notes"
                    type="textarea"
                    :rows="3"
                    placeholder="Enter notes (optional, max 255 characters)"
                    :error="!!errors.notes"
                    :error-messages="errors.notes ? [errors.notes] : []"
                    :disabled="isSubmitting"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    {{ form.notes?.length || 0 }}/255 characters
                  </p>
                </div>
                
                <div class="md:col-span-2">
                  <VaCheckbox
                    v-model="form.is_active"
                    label="Active Term Period"
                    :disabled="isSubmitting"
                    hint="Only active periods will be available for selection in other forms"
                  />
                </div>
              </div>
              
              <div class="flex flex-col sm:flex-row gap-3 pt-6 border-t bg-gray-50 rounded-b-lg px-4 py-3">
                <VaButton 
                  color="secondary" 
                  :disabled="isSubmitting" 
                  class="w-full sm:w-auto"
                  @click="cancelAdding"
                >
                  Cancel
                </VaButton>
                <VaButton 
                  type="submit" 
                  color="#00A3E0" 
                  :disabled="isSubmitting"
                  :loading="isSubmitting"
                  class="w-full sm:w-auto"
                >
                  {{ formMode === 'add' ? 'Create Term Period' : 'Update Term Period' }}
                </VaButton>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div :class="[
        'transition-all duration-300',
        addEditForm ? 'opacity-30 pointer-events-none' : 'opacity-100'
      ]">
        <div
          v-if="!methods || (methods.length === 0 && !loadingMethods)"
          class="text-center py-8 sm:py-12"
        >
          <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <i class="va-icon text-3xl sm:text-4xl text-blue-400">schedule</i>
          </div>
          <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No term periods found</h3>
          <p v-if="searchQuery" class="text-sm text-gray-500 mb-4">
            Try adjusting your search criteria
          </p>
          <p v-else class="text-sm text-gray-500 mb-6">
            Get started by adding your first term period
          </p>
          <VaButton
            v-if="!searchQuery && !addEditForm"
            color="#00A3E0"
            @click="openForm(null, 'add')"
            class="px-6"
          >
            <i class="va-icon mr-2">add</i>
            Add First Term Period
          </VaButton>
        </div>
        
        <div v-else-if="methods && methods.length > 0" class="overflow-hidden">
          <div class="overflow-x-auto border rounded-lg">
            <VaDataTable
              :key="componentKey"
              :items="methods"
              striped
              :columns="standardColumns"
              :loading="loadingMethods"
              :hoverable="!addEditForm"
              class="min-w-full"
            >
              <template #cell(sn)="{ rowIndex }">
                <div class="text-center sm:text-left px-2 py-1">
                  {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
                </div>
              </template>
              
              <template #cell(property_title)="{ rowData }">
                <div class="px-2 py-1 truncate max-w-[140px] sm:max-w-[200px] md:max-w-none" :title="rowData.property_title">
                  <span class="font-medium text-sm">{{ rowData.property_title || 'N/A' }}</span>
                </div>
              </template>
              
              <template #cell(landlord_name)="{ rowData }">
                <div class="px-2 py-1 truncate max-w-[120px] sm:max-w-[180px] md:max-w-none" :title="getLandlordDisplayName(rowData)">
                  <span class="text-sm font-medium">{{ getLandlordDisplayName(rowData) }}</span>
                </div>
              </template>
              
              <template #cell(period_of_payment)="{ rowData }">
                <div class="px-2 py-1">
                  <span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {{ getPaymentPeriodDisplay(rowData.period_of_payment) }}
                  </span>
                </div>
              </template>
              
              <template #cell(amount)="{ rowData }">
                <div class="px-2 py-1 text-right sm:text-left">
                  <span class="font-semibold text-sm">
                    {{ formatCurrency(rowData.amount) }}
                  </span>
                </div>
              </template>
              
              <template #cell(effective_from)="{ rowData }">
                <div class="hidden sm:table-cell px-2 py-1">
                  <div class="font-medium text-sm">{{ parseDate(rowData.effective_from, 'Effective From') }}</div>
                </div>
                <div class="sm:hidden px-2 py-1 text-xs text-gray-500">
                  {{ formatDateShort(rowData.effective_from) }}
                </div>
              </template>
              
              <template #cell(is_active)="{ rowData }">
                <div class="px-2 py-1 text-center">
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-medium inline-block min-w-[40px]"
                    :class="{
                      'bg-green-100 text-green-800': rowData.is_active,
                      'bg-gray-100 text-gray-600': !rowData.is_active
                    }"
                  >
                    {{ rowData.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </template>
              
              <template #cell(actions)="{ rowData }">
                <div class="px-1 py-1 flex justify-center sm:justify-start space-x-1 sm:space-x-2">
                  <VaButton 
                    size="small" 
                    color="primary" 
                    icon="visibility" 
                    class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                    rounded
                    :disabled="addEditForm || loadingMethods"
                    @click="openView(rowData)" 
                  />
                  <VaButton
                    size="small"
                    color="warning"
                    icon="edit"
                    class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                    rounded
                    :disabled="addEditForm || loadingMethods"
                    @click="openForm(rowData, 'edit')"
                  />
                  <VaButton 
                    size="small" 
                    color="danger" 
                    icon="delete" 
                    class="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9"
                    rounded
                    :disabled="addEditForm || loadingMethods"
                    @click="confirmDelete(rowData)" 
                  />
                </div>
              </template>
            </VaDataTable>
          </div>
          
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div class="text-sm text-gray-700 text-center sm:text-left order-2 sm:order-1">
              Showing <span class="font-medium">{{ pagination.from }}</span> to 
              <span class="font-medium">{{ pagination.to }}</span> of 
              <span class="font-medium">{{ pagination.total }}</span> term periods
            </div>
            
            <div class="flex flex-wrap justify-center sm:justify-end items-center gap-1 sm:gap-2 order-1 sm:order-2">
              <VaButton
                size="small"
                :disabled="pagination.current_page === 1 || loadingMethods || addEditForm"
                class="px-3 py-1.5 min-w-[72px] h-9"
                :color="pagination.current_page === 1 || addEditForm ? 'gray' : 'default'"
                @click="handlePageChange(pagination.current_page - 1)"
              >
                <i class="va-icon mr-1">chevron_left</i>
                Previous
              </VaButton>
              
              <VaButton
                v-for="page in filteredPaginationPages"
                :key="page"
                size="small"
                :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
                :disabled="addEditForm || loadingMethods || page === '...'"
                class="px-2.5 py-1.5 min-w-[36px] h-9 text-sm"
                @click="handlePageChange(Number(page))"
              >
                {{ page }}
              </VaButton>
              
              <VaButton
                size="small"
                :disabled="pagination.current_page === pagination.last_page || loadingMethods || addEditForm"
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
    
    <VaModal 
      v-model="showView" 
      :size="modalSize" 
      layout="centered" 
      close-button 
      hide-default-actions
      class="p-2 sm:p-4"
    >
      <div class="text-base sm:text-lg font-bold mb-4 flex items-center">
        <i class="va-icon mr-2 text-blue-500">visibility</i>
        Term Period Details
      </div>
      
      <div v-if="selectedMethod" class="space-y-6 text-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div class="text-center sm:text-left">
            <div class="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Property</div>
            <div class="font-semibold text-gray-900">{{ selectedMethod.property_title || 'N/A' }}</div>
          </div>
          <div class="text-center sm:text-left">
            <div class="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Landlord</div>
            <div class="font-semibold text-gray-900">{{ getLandlordDisplayName(selectedMethod) }}</div>
          </div>
          <div class="text-center sm:text-left">
            <div class="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Payment Period</div>
            <div class="font-semibold text-gray-900">{{ getPaymentPeriodDisplay(selectedMethod.period_of_payment) }}</div>
          </div>
          <div class="text-center sm:text-left">
            <div class="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Monthly Rent</div>
            <div class="font-semibold text-green-600">{{ formatCurrency(selectedMethod.amount) }}</div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-sm text-gray-700 mb-3 flex items-center">
                <i class="va-icon mr-2 text-blue-500">schedule</i>
                Schedule
              </h4>
              <div class="space-y-2">
                <div>
                  <span class="text-xs font-medium text-gray-500">Effective From:</span>
                  <div class="font-medium mt-1">{{ parseDate(selectedMethod.effective_from, 'Effective From') }}</div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-gray-500">Status:</span>
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-green-100 text-green-800': selectedMethod.is_active,
                      'bg-gray-100 text-gray-600': !selectedMethod.is_active
                    }"
                  >
                    {{ selectedMethod.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <div v-if="selectedMethod.notes" class="bg-yellow-50 p-4 rounded-lg">
              <h4 class="font-medium text-sm text-gray-700 mb-3 flex items-center">
                <i class="va-icon mr-2 text-yellow-500">note</i>
                Notes
              </h4>
              <div class="text-sm text-gray-900 whitespace-pre-wrap">{{ selectedMethod.notes }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end pt-4">
          <VaButton color="secondary" @click="closeView" class="px-6">
            Close
          </VaButton>
        </div>
      </template>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../services/makeRequest';
import type { DataTableColumn } from 'vuestic-ui'; // Import Vuestic's type for better compatibility

interface TermPeriod {
  id: number;
  property_id: number;
  property_title: string;
  landlord_id: number;
  landlord_name: string | null;
  period_of_payment: string;
  amount: number;
  effective_from: string;
  notes: string | null;
  is_active: boolean;
}

interface Property {
  value: number;
  text: string;
  combined_amount: number;
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

// FIX: Define a standard column type that adheres to VaDataTable's expected props.
// The `width` must be `string | number`. The responsive object `{ xs: string, sm: string }`
// is not supported directly by the prop type. Use string widths for VaDataTable
// and rely on utility classes in the cell templates for true responsiveness.
type StandardDataTableColumn = DataTableColumn & { 
  key: string; 
  sortable: boolean; 
  label: string; 
  width?: string; 
  align?: 'left' | 'center' | 'right';
};


export default defineComponent({
  name: 'TermPeriodList',
  data() {
    return {
      windowWidth: window.innerWidth, // Add windowWidth for modal size responsiveness
      
      // FIX: Standardize column definition to use simple string/number widths
      // This resolves TS2322 (Type Incompatibility for VaDataTable columns)
      standardColumns: [
        { key: 'sn', sortable: false, label: 'SN', width: '60px', align: 'left' },
        { key: 'property_title', sortable: true, label: 'Property', width: '250px', align: 'left' },
        { key: 'landlord_name', sortable: true, label: 'Landlord', width: '200px', align: 'left' },
        { key: 'period_of_payment', sortable: true, label: 'Period', width: '120px', align: 'left' },
        { key: 'amount', sortable: true, label: 'Rent', width: '120px', align: 'right' },
        { key: 'effective_from', sortable: true, label: 'From', width: '120px', align: 'left' },
        { key: 'is_active', sortable: true, label: 'Status', width: '100px', align: 'center' },
        { key: 'actions', label: 'Actions', sortable: false, width: '140px', align: 'center' },
      ] as StandardDataTableColumn[],
      
      methods: [] as TermPeriod[],
      properties: [] as Property[],
      landlords: [] as { value: number; text: string }[],
      paymentPeriodOptions: [
        { value: 'quarterly', text: 'Quarterly' },
        { value: 'semi-annually', text: 'Semi-Annually' },
        { value: 'annually', text: 'Annually' },
        { value: 'semester_1', text: 'Semester 1 (Jan-Jun)' },
        { value: 'semester_2', text: 'Semester 2 (Jul-Dec)' },
      ] as { value: string; text: string }[],
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
      debouncedSearch: null as any,
    };
  },
  computed: {
    // FIX: Filter out '...' so that only numbers are passed to handlePageChange
    filteredPaginationPages() {
      return this.paginationPages.filter(page => page !== '...');
    },
    // The original paginationPages which can contain '...' for display
    paginationPages(): (number | string)[] {
      const pages: (number | string)[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page;
      const range = 2;

      if (lastPage === 0) return [];
      
      // Always show page 1
      if (lastPage >= 1) pages.push(1);

      // Ellipsis after page 1
      if (current > range + 1 && lastPage > 4) {
        pages.push('...');
      }

      // Pages around current
      for (let i = Math.max(2, current - range); i <= Math.min(lastPage - 1, current + range); i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      // Ellipsis before last page
      if (current < lastPage - range && lastPage > 4) {
        pages.push('...');
      }

      // Always show last page if > 1 and not already included
      if (lastPage > 1 && !pages.includes(lastPage)) {
        pages.push(lastPage);
      }

      // Ensure no double '...'
      return pages.filter((page, index, self) => 
        page !== '...' || self[index + 1] !== '...'
      );
    },
    // FIX: Compute modal size as a single string to resolve TS2322 error
    modalSize(): 'small' | 'medium' | 'large' | 'auto' {
      return this.windowWidth < 640 ? 'small' : this.windowWidth < 1024 ? 'medium' : 'large';
    }
  },
  watch: {
    'form.property_id'(newPropertyId: number | null) {
      if (newPropertyId) {
        const selectedProperty = this.properties.find(p => p.value === newPropertyId);
        this.form.amount = selectedProperty ? selectedProperty.combined_amount : null;
        this.errors.amount = '';
      } else {
        this.form.amount = null;
      }
    },
  },
  async mounted() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
    window.addEventListener('resize', this.handleResize);
    await Promise.all([this.getMethods(), this.fetchOptions()]);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
    },
    // Formatters
    formatCurrency(amount: number | null): string {
      return amount ? `$${amount.toLocaleString()}` : 'N/A';
    },

    formatDateShort(dateStr: string | null): string {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        return isValid(date) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
      } catch {
        return 'N/A';
      }
    },

    getPaymentPeriodDisplay(period: string): string {
      const periodMap: Record<string, string> = {
        'quarterly': 'Quarterly',
        'semi-annually': 'Semi-Annually', 
        'annually': 'Annually',
        'semester_1': 'Semester 1',
        'semester_2': 'Semester 2',
        'monthly': 'Monthly (Legacy)'
      };
      return periodMap[period] || period;
    },

    getLandlordDisplayName(method: TermPeriod): string {
      return method.landlord_name || 
               this.landlords.find(l => l.value === method.landlord_id)?.text || 
               `Landlord ID: ${method.landlord_id}` || 'N/A';
    },

    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) return 'N/A';
      try {
        let parsed = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
        if (isValid(parsed)) return format(parsed, 'd MMMM yyyy');
        parsed = new Date(dateStr);
        if (isValid(parsed)) return format(parsed, 'd MMMM yyyy');
        return 'N/A';
      } catch (error) {
        console.error(`${context}: Error parsing date "${dateStr}"`, error);
        return 'N/A';
      }
    },

    // Form Management
    async openForm(method: TermPeriod | null, mode: 'add' | 'edit') {
      this.formMode = mode;
      this.addEditForm = true;
      await this.fetchOptions();
      
      if (mode === 'edit' && method) {
        this.selectedMethod = method;
        this.resetForm();
        
        // Populate form fields
        this.form.property_id = method.property_id;
        this.form.user_id = method.landlord_id;
        // Handle 'monthly' legacy conversion if needed, otherwise use the value directly
        this.form.period_of_payment = this.paymentPeriodOptions.some(p => p.value === method.period_of_payment) 
          ? method.period_of_payment 
          : 'semi-annually'; // Default to a valid period if API sends a legacy/unknown one
        this.form.amount = method.amount;
        // Only take the date part for the input[type=date]
        this.form.effective_from = method.effective_from.split(' ')[0]; 
        this.form.notes = method.notes || '';
        this.form.is_active = method.is_active ?? true;
      } else {
        this.selectedMethod = null;
        this.resetForm();
      }
    },

    openView(method: TermPeriod) {
      this.selectedMethod = method;
      this.showView = true;
    },

    closeView() {
      this.selectedMethod = null;
      this.showView = false;
    },

    closeForm() {
      this.selectedMethod = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.resetForm();
      this.getMethods();
    },

    cancelAdding() {
      Swal.fire({
        title: 'Cancel Changes?',
        text: 'Any unsaved changes will be lost.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#6b7280',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Cancel Changes',
        cancelButtonText: 'Continue Editing',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.closeForm();
        }
      });
    },
    
    // API Calls
    async fetchOptions() {
      try {
        const [propertiesRes, landlordsRes] = await Promise.all([
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/options`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          }),
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/landlords/options`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          }),
        ]);
        
        this.properties = propertiesRes.data.map((p: any) => ({
          value: p.id,
          text: p.title,
          combined_amount: p.rent_amount + p.service_charge_amount,
        }));
        this.landlords = landlordsRes.data.map((l: any) => ({
          value: l.id,
          text: l.full_name,
        }));
      } catch (error) {
        console.error('Failed to load options:', error);
        // Inform user about option loading failure if necessary
      }
    },

    async getMethods(params: { page?: number; per_page?: number; search?: string } = {}) {
      if (this.loadingMethods) return;
      this.loadingMethods = true;
      this.methods = [];
      
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/term-periods`,
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
        
        if (response && response.status === 200) {
          this.methods = response.data.data.map((item: any) => ({
            ...item,
            // Ensure amount is treated as a number
            amount: parseFloat(item.amount) || 0, 
          })) as TermPeriod[];

          this.pagination = {
            total: response.data.pagination?.total || 0,
            per_page: response.data.pagination?.per_page || this.pagination.per_page,
            current_page: response.data.pagination?.current_page || 1,
            last_page: response.data.pagination?.last_page || 1,
            from: response.data.pagination?.from || 0,
            to: response.data.pagination?.to || 0,
          };
        }
      } catch (error) {
        console.error('Failed to fetch term periods:', error);
        Swal.fire({ title: 'Error!', text: 'Failed to fetch term periods.', icon: 'error', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
      } finally {
        this.loadingMethods = false;
      }
    },

    async submitForm() {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.resetErrors();
      
      const endpoint = this.formMode === 'add' 
        ? `${import.meta.env.VITE_APP_API_BASE_URL}/v1/term-periods`
        : `${import.meta.env.VITE_APP_API_BASE_URL}/v1/term-periods/${this.selectedMethod?.id}`;
      const method = this.formMode === 'add' ? 'post' : 'put';

      const dataToSend = {
        ...this.form,
        // Ensure effective_from is sent in a standard date format without time if it's a date-only field
        effective_from: this.form.effective_from, 
        // Ensure amount is not null if property is selected, though it's calculated
        amount: this.form.amount || 0, 
        _method: this.formMode === 'edit' ? 'put' : undefined, // For Laravel API
      };

      try {
        const response = await makeRequest({
          url: endpoint,
          method: method,
          data: dataToSend,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        
        if (response.status === 201 || response.status === 200) {
          this.closeForm();
          this.componentKey += 1;
          Swal.fire({ title: 'Success!', text: `Term Period ${this.formMode === 'add' ? 'created' : 'updated'} successfully.`, icon: 'success', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
        } else {
          throw new Error(response.data?.message || 'Unexpected response status');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data);
        const errorMessage = error.response?.data?.message || `Failed to ${this.formMode} term period.`;
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors);
        }
        Swal.fire({ title: 'Error!', text: errorMessage, icon: 'error', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
      } finally {
        this.isSubmitting = false;
      }
    },

    async confirmDelete(method: TermPeriod) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the term period for property: ${method.property_title}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        try {
          // NOTE: Replace this mock with your actual delete API call
          await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/term-periods/${method.id}`,
            method: 'delete',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          });
          
          Swal.fire({ title: 'Deleted!', text: 'Term Period deleted successfully.', icon: 'success', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
          await this.getMethods();
        } catch (error) {
          console.error('Delete error:', error);
          Swal.fire({ title: 'Error!', text: 'Failed to delete term period.', icon: 'error', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
        }
      }
    },

    resetForm() {
      // Clear reactive form data
      this.form.property_id = null;
      this.form.user_id = null;
      this.form.period_of_payment = this.paymentPeriodOptions[0]?.value || '';
      this.form.amount = null;
      this.form.effective_from = format(new Date(), 'yyyy-MM-dd'); // Default to today
      this.form.notes = '';
      this.form.is_active = true;
      
      // Clear errors
      this.resetErrors();
    },

    resetErrors() {
      this.errors.property_id = '';
      this.errors.user_id = '';
      this.errors.period_of_payment = '';
      this.errors.amount = '';
      this.errors.effective_from = '';
      this.errors.notes = '';
    },

    // Pagination & Search
    handleSearchInput() {
      if (this.addEditForm) return;
      this.debouncedSearch();
    },

    handleSearch() {
      if (this.addEditForm || this.loadingMethods) return;
      this.pagination.current_page = 1;
      this.getMethods({ page: 1, search: this.searchQuery });
      this.componentKey += 1;
    },

    clearSearch() {
      if (this.addEditForm) return;
      this.searchQuery = '';
      this.pagination.current_page = 1;
      this.getMethods({ page: 1, search: this.searchQuery });
      this.componentKey += 1;
    },

    // FIX: Ensure 'page' is a number when calling handlePageChange
    handlePageChange(page: number) {
      if (this.addEditForm || this.loadingMethods || page < 1 || page > this.pagination.last_page) return;
      this.pagination.current_page = page;
      this.getMethods({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    // FIX: Correct typo from 'per_page' to 'perPage'
    handlePerPageChange(perPage: number) {
      if (this.addEditForm || this.loadingMethods) return;
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      this.getMethods({ page: 1, per_page: perPage, search: this.searchQuery });
      this.componentKey += 1;
    },
  },
});
</script>

<style scoped>
/* Add/adjust styles as needed, Tailwind is mostly in the template */
.card {
  @apply bg-white shadow-lg rounded-xl p-4 sm:p-6 md:p-8;
}

/* Ensure no override on VaDataTable's styling but allow custom overrides */
.min-w-full {
  min-width: 100%;
}
</style>