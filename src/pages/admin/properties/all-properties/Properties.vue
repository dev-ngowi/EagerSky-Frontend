<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingProperties">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading properties...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading properties"
        >
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-container">
        <div class="filter-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by title or description..."
            class="search-input"
            :disabled="loadingProperties"
            @input="debouncedSearch"
            aria-label="Search properties by title or description"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search and filters">
            Clear Search
          </VaButton>
          <VaSelect
            v-model="filters.category_id"
            placeholder="Filter by category"
            :options="categoriesForSelect"
            value-by="value"
            text-by="text"
            clearable
            class="filter-select"
            :disabled="loadingProperties"
            @update:modelValue="debouncedSearch"
            aria-label="Filter properties by category"
          />
          <VaSelect
            v-model="filters.location_id"
            placeholder="Filter by location"
            :options="locationsForSelect"
            value-by="value"
            text-by="text"
            clearable
            class="filter-select"
            :disabled="loadingProperties"
            @update:modelValue="debouncedSearch"
            aria-label="Filter properties by location"
          />
          <VaSelect
            v-model="filters.status"
            placeholder="Filter by status"
            :options="statusOptions"
            clearable
            class="filter-select"
            :disabled="loadingProperties"
            @update:modelValue="debouncedSearch"
            aria-label="Filter properties by status"
          />
        </div>
        <div class="pagination-add-container">
          <VaSelect
            v-model="perPage"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="loadingProperties"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="add-button"
            @click="openForm(null, 'add')"
            aria-label="Add new property"
          >
            Add Property
          </VaButton>
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="done-button"
            @click="cancelAdding"
            aria-label="Close property form"
          >
            Done
          </VaButton>
        </div>
      </div>
      <div v-if="!addEditForm">
        <div v-if="!properties || (properties.length === 0 && !loadingProperties)" class="no-data-message">
          No properties found.
        </div>
        <div v-else-if="properties && properties.length > 0" class="table-responsive">
          <VaDataTable
            :key="componentKey"
            :items="formattedProperties"
            striped
            :columns="columns"
            :loading="loadingProperties"
          >
            <template #cell(sn)="{ rowIndex }">
              {{ ((currentPage || 1) - 1) * (perPage || 10) + rowIndex + 1 }}
            </template>
            <template #cell(actions)="{ rowData }">
              <div class="action-buttons">
                <VaButton
                  size="small"
                  color="primary"
                  icon="visibility"
                  @click="openView(rowData)"
                  aria-label="View property details"
                />
                <VaButton
                  size="small"
                  color="warning"
                  icon="edit"
                  @click="openForm(rowData, 'edit')"
                  aria-label="Edit property"
                />
                <VaButton
                  size="small"
                  color="danger"
                  icon="delete"
                  @click="deleteProperty(rowData.id)"
                  aria-label="Delete property"
                />
              </div>
            </template>
          </VaDataTable>
        </div>
        <div v-if="properties && properties.length > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} properties
          </div>
          <div class="pagination-buttons">
            <VaButton
              size="small"
              :disabled="currentPage === 1 || loadingProperties"
              @click="handlePageChange(currentPage - 1)"
              aria-label="Go to previous page"
            >
              Previous
            </VaButton>
            <VaButton
              v-for="page in paginationPages"
              :key="page"
              size="small"
              :color="currentPage === page ? '#00A3E0' : 'secondary'"
              @click="handlePageChange(page)"
              :aria-label="`Go to page ${page}`"
            >
              {{ page }}
            </VaButton>
            <VaButton
              size="small"
              :disabled="currentPage === pagination.last_page || loadingProperties"
              @click="handlePageChange(currentPage + 1)"
              aria-label="Go to next page"
            >
              Next
            </VaButton>
          </div>
        </div>
      </div>
      <template v-else>
        <PropertyForm
          :property="selectedProperty"
          :form-mode="formMode"
          @close="closeForm"
          @submit="handleSubmitSuccess"
          class="form-container"
        />
      </template>
      <VaModal
        v-model="showView"
        :size="isMobile ? 'small' : 'large'"
        layout="centered"
        close-button
        hide-default-actions
        class="modal-container"
      >
        <div class="modal-title">Property Details</div>
        <div v-if="selectedProperty" class="modal-content">
          <p><strong>Title:</strong> {{ selectedProperty.title }}</p>
          <p><strong>Description:</strong> {{ selectedProperty.description || 'N/A' }}</p>
          <p><strong>Category:</strong> {{ selectedProperty.category?.name || 'N/A' }}</p>
          <p>
            <strong>Location:</strong>
            {{ selectedProperty.location ? `${selectedProperty.location.name}, ${selectedProperty.location.city}` : 'N/A' }}
          </p>
          <p><strong>Price:</strong> {{ formatPrice(selectedProperty.price) }}</p>
          <p><strong>Commission Amount:</strong> {{ formatPrice(selectedProperty.commission_amount) }}</p>
          <p><strong>Combined Amount:</strong> {{ formatPrice(selectedProperty.combined_amount) }}</p>
          <p><strong>Term (Months):</strong> {{ selectedProperty.term_months || 'N/A' }}</p>
          <p><strong>Bedrooms:</strong> {{ selectedProperty.bedrooms ?? 'N/A' }}</p>
          <p><strong>Bathrooms:</strong> {{ selectedProperty.bathrooms ?? 'N/A' }}</p>
          <p><strong>Area:</strong> {{ selectedProperty.area_sqft || 'N/A' }} sqft</p>
          <p><strong>Year Built:</strong> {{ selectedProperty.year_built ?? 'N/A' }}</p>
          <p><strong>Status:</strong> {{ formatStatus(selectedProperty.status) }}</p>
          <p><strong>List Date:</strong> {{ formatDate(selectedProperty.list_date) }}</p>
          <p><strong>Branch:</strong> {{ selectedProperty.branch?.name || 'N/A' }}</p>
          <p><strong>Featured:</strong> {{ selectedProperty.is_featured ? 'Yes' : 'No' }}</p>
          <p><strong>Created At:</strong> {{ formatDate(selectedProperty.created_at) }}</p>
        </div>
        <div class="modal-footer">
          <VaButton color="secondary" @click="closeView" aria-label="Close property details modal">
            Close
          </VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import PropertyForm from './PropertyForm.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
interface Property {
  id: number;
  title: string;
  description?: string;
  features?: any;
  category?: { id: number; name: string };
  category_id: number;
  location?: { id: number; name: string; city: string; country: string; street: string };
  location_id: number;
  price: number;
  commission_amount?: string;
  commission_rate?: string;
  term_months?: number;
  combined_amount?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  year_built?: number;
  status: string;
  list_date?: string;
  sold_date?: string;
  user?: any;
  branch?: { id: number; name: string };
  team_id?: number;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
}
interface SelectOption {
  value: number | string;
  text: string;
}
interface Filters {
  category_id?: number | null;
  location_id?: number | null;
  status?: string;
  min_price?: number | null;
  max_price?: number | null;
}
interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from?: number;
  to?: number;
}
export default defineComponent({
  name: 'PropertyList',
  components: { PropertyForm, Loader },
  data() {
    return {
      properties: [] as Property[],
      loadingProperties: false,
      searchQuery: '',
      currentPage: 1,
      perPage: 10,
      totalItems: 0,
      errorMessage: null as string | null,
      addEditForm: false,
      selectedProperty: null as Property | null,
      formMode: 'add' as 'add' | 'edit',
      showView: false,
      componentKey: 0,
      submitting: false,
      filters: {
        category_id: null,
        location_id: null,
        status: '',
        min_price: null,
        max_price: null,
      } as Filters,
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'title', sortable: true, label: 'Title' },
        { key: 'category', sortable: true, label: 'Category' },
        { key: 'location', sortable: true, label: 'Location' },
        { key: 'price', sortable: true, label: 'Price' },
        { key: 'bedrooms', sortable: true, label: 'Bedrooms' },
        { key: 'bathrooms', sortable: true, label: 'Bathrooms' },
        { key: 'area_sqft', sortable: true, label: 'Area (sqft)' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'list_date', sortable: true, label: 'List Date' },
        { key: 'actions', label: 'Actions', sortable: false },
      ] as Array<{ key: string; sortable: boolean; label: string }>,
      statusOptions: [
        { value: 'for_rent', text: 'For Rent' },
        { value: 'for_sale', text: 'For Sale' },
        { value: 'available', text: 'Available' },
        { value: 'sold', text: 'Sold' },
        { value: 'pending', text: 'Pending' },
        { value: 'rented', text: 'Rented' },
      ] as Array<{ value: string; text: string }>,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Array<{ value: number; text: string }>,
      debouncedSearch: null as unknown as () => void,
    };
  },
  computed: {
    isMobile(): boolean {
      return window.innerWidth < 768;
    },
    formattedProperties(): any[] {
      if (!this.properties) return [];
      
      return this.properties.map(property => ({
        ...property,
        category: property.category?.name || 'N/A',
        location: property.location ? `${property.location.name}, ${property.location.city}` : 'N/A',
        price: this.formatPrice(property.price),
        status: this.formatStatus(property.status),
        list_date: this.formatDate(property.list_date),
      }));
    },
    pagination(): Pagination {
      const current = this.currentPage || 1;
      const perPageVal = this.perPage || 10;
      const total = this.totalItems || 0;
      return {
        current_page: current,
        per_page: perPageVal,
        total,
        last_page: Math.ceil(total / perPageVal),
        from: total > 0 ? (current - 1) * perPageVal + 1 : 0,
        to: Math.min(current * perPageVal, total),
      };
    },
    paginationPages(): number[] {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.currentPage || 1;
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
    categoriesForSelect(): SelectOption[] {
      if (!this.properties || this.properties.length === 0) return [];
      
      const uniqueCategories = new Map();
      this.properties.forEach(property => {
        if (property.category && property.category.id && property.category.name) {
          uniqueCategories.set(property.category.id, {
            value: property.category.id,
            text: property.category.name,
          });
        }
      });
      
      return Array.from(uniqueCategories.values());
    },
    locationsForSelect(): SelectOption[] {
      if (!this.properties || this.properties.length === 0) return [];
      
      const uniqueLocations = new Map();
      this.properties.forEach(property => {
        if (property.location && property.location.id && property.location.name) {
          uniqueLocations.set(property.location.id, {
            value: property.location.id,
            text: property.location.city ? `${property.location.name}, ${property.location.city}` : property.location.name,
          });
        }
      });
      
      return Array.from(uniqueLocations.values());
    },
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 300);
  },
  mounted() {
    this.retryFetch();
  },
  methods: {
    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            this.errorMessage = 'Failed to load properties. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async retryFetch() {
      this.errorMessage = null;
      await this.fetchProperties();
    },
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        console.log('Fetching properties...', {
          page: this.currentPage,
          perPage: this.perPage,
          search: this.searchQuery,
          filters: this.filters,
        });
        
        const params: any = {
          page: this.currentPage || 1,
          per_page: this.perPage || 10,
        };
        
        if (this.searchQuery) {
          params.search = this.searchQuery;
        }
        
        if (this.filters.category_id) {
          params.category_id = this.filters.category_id;
        }
        if (this.filters.location_id) {
          params.location_id = this.filters.location_id;
        }
        if (this.filters.status) {
          params.status = this.filters.status;
        }
        if (this.filters.min_price) {
          params.min_price = this.filters.min_price;
        }
        if (this.filters.max_price) {
          params.max_price = this.filters.max_price;
        }
        
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            params,
          })
        );
        
        if (response && response.status === 200) {
          this.properties = response.data.data || [];
         
          if (response.data.pagination) {
            this.currentPage = response.data.pagination.current_page || 1;
            this.perPage = response.data.pagination.per_page || 10;
            this.totalItems = response.data.pagination.total || 0;
          }
         
          console.log('Fetch properties response:', response.data);
         
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No properties found. Add some properties to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch properties.');
        }
      } catch (error: any) {
        console.error('Failed to fetch properties after retries');
        let errorMessage = 'Failed to fetch properties.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
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
        this.loadingProperties = false;
      }
    },
    async addProperty(payload: Partial<Property>) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
        method: 'post',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
        data: payload,
      });
    },
    async updateProperty(id: number, payload: Partial<Property>) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${id}`,
        method: 'put',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
        data: payload,
      });
    },
    formatPrice(price: number | string): string {
      if (!price) return 'N/A';
      const numPrice = typeof price === 'string' ? parseFloat(price) : price;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
      }).format(numPrice);
    },
    formatStatus(status: string): string {
      if (!status) return 'N/A';
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },
    formatDate(dateString: string | null): string {
      if (!dateString) return 'N/A';
      try {
        return format(new Date(dateString), 'd MMMM yyyy');
      } catch {
        return 'N/A';
      }
    },
    async handleSearch() {
      console.log('Search query:', this.searchQuery);
      this.currentPage = 1;
      await this.fetchProperties();
    },
    clearSearch() {
      this.searchQuery = '';
      this.filters = {
        category_id: null,
        location_id: null,
        status: '',
        min_price: null,
        max_price: null,
      };
      this.currentPage = 1;
      this.fetchProperties();
    },
    handlePageChange(page: number) {
      this.currentPage = page || 1;
      this.fetchProperties();
    },
    handlePerPageChange(newPerPage: number) {
      this.perPage = newPerPage || 10;
      this.currentPage = 1;
      this.fetchProperties();
    },
    openForm(property: Property | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedProperty = property ? { ...property } : null;
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedProperty = null;
      this.addEditForm = false;
      this.formMode = 'add';
    },
    cancelAdding() {
      this.closeForm();
      this.fetchProperties();
    },
    async handleSubmitSuccess(payload: Partial<Property>, mode: 'add' | 'edit') {
      if (this.submitting) {
        console.log('handleSubmitSuccess blocked: Already submitting');
        return;
      }
      this.submitting = true;
      try {
        console.log('handleSubmitSuccess called with:', { payload, mode });
        let response;
        if (mode === 'add') {
          response = await this.addProperty(payload);
        } else {
          if (!this.selectedProperty) {
            throw new Error('No property selected for update');
          }
          response = await this.updateProperty(this.selectedProperty.id, payload);
        }
        if (response.status === 201 || response.status === 200) {
          this.closeForm();
          this.componentKey += 1;
          await this.fetchProperties();
          Swal.fire({
            title: 'Success!',
            text: mode === 'add' ? 'Property added successfully.' : 'Property updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          throw new Error(response.data?.message || 'Unexpected response status');
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response || err);
        let errorMessage =
          err.response?.data?.message || (mode === 'add' ? 'Failed to add property.' : 'Failed to update property.');
        if (err.response?.status === 404) {
          errorMessage = 'API endpoint not found. Please check the server configuration.';
        } else if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage += '\n' + Object.values(err.response.data.errors).flat().join('\n');
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
    async openView(property: Property) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${property.id}`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        
        if (response.status === 200 && response.data?.data) {
          this.selectedProperty = response.data.data;
          this.showView = true;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch property details.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to fetch property details.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    closeView() {
      this.selectedProperty = null;
      this.showView = false;
    },
    async deleteProperty(id: number) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      });
      
      if (result.isConfirmed) {
        try {
          const response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${id}`,
            method: 'delete',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          });
         
          if (response.status === 200 || response.status === 204) {
            this.fetchProperties();
            Swal.fire({
              title: 'Deleted!',
              text: 'Property deleted successfully.',
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } catch (err: any) {
          const errorMessage =
            err.response?.data?.message ||
            'Failed to delete property.' +
              (err.response?.status === 422 && err.response?.data?.errors
                ? '; ' + Object.values(err.response.data.errors).flat().join('; ')
                : '');
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
      }
    },
  },
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
.filter-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @media screen and (min-width: 640px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }
  .search-input,
  .filter-select {
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;
    @media screen and (min-width: 640px) {
      max-width: 12rem;
    }
    @media screen and (min-width: 768px) {
      max-width: 14rem;
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
.pagination-add-container {
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
    max-width: 6rem;
    font-size: 0.875rem;
    @media screen and (min-width: 768px) {
      max-width: 8rem;
      font-size: 1rem;
    }
  }
  .add-button,
  .done-button {
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
    min-width: 600px;
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
  .action-buttons {
    display: flex;
    gap: 0.25rem;
    @media screen and (min-width: 768px) {
      gap: 0.5rem;
    }
    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem;
      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem;
      }
    }
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
.form-container {
  padding: 0.75rem;
  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}
.modal-container {
  padding: 0.75rem;
  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
  .modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    @media screen and (min-width: 768px) {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
  }
  .modal-content {
    font-size: 0.875rem;
    line-height: 1.5;
    p {
      margin-bottom: 0.5rem;
    }
    @media screen and (min-width: 768px) {
      font-size: 1rem;
      p {
        margin-bottom: 0.75rem;
      }
    }
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
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
  .filter-container {
    .search-input,
    .filter-select {
      font-size: 0.75rem;
      max-width: 100%;
    }
    .va-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }
  }
  .pagination-add-container {
    .per-page-select {
      font-size: 0.75rem;
      max-width: 5rem;
    }
    .add-button,
    .done-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }
  }
  .no-data-message {
    font-size: 0.75rem;
    padding: 0.75rem;
  }
  .error-message {
    font-size: 0.75rem;
    padding: 0.75rem;
    .retry-button {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
  }
  .table-responsive {
    :deep(.va-data-table) {
      min-width: 400px;
    }
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.25rem;
    }
    :deep(.va-data-table__table-th[data-key="category"]),
    :deep(.va-data-table__table-td[data-key="category"]),
    :deep(.va-data-table__table-th[data-key="location"]),
    :deep(.va-data-table__table-td[data-key="location"]),
    :deep(.va-data-table__table-th[data-key="bedrooms"]),
    :deep(.va-data-table__table-td[data-key="bedrooms"]),
    :deep(.va-data-table__table-th[data-key="bathrooms"]),
    :deep(.va-data-table__table-td[data-key="bathrooms"]),
    :deep(.va-data-table__table-th[data-key="area_sqft"]),
    :deep(.va-data-table__table-td[data-key="area_sqft"]),
    :deep(.va-data-table__table-th[data-key="list_date"]),
    :deep(.va-data-table__table-td[data-key="list_date"]) {
      display: none; /* Hide less critical columns on mobile */
    }
    :deep(.va-data-table__table-th[data-key="sn"]),
    :deep(.va-data-table__table-td[data-key="sn"]) {
      min-width: 40px;
    }
    :deep(.va-data-table__table-th[data-key="title"]),
    :deep(.va-data-table__table-td[data-key="title"]) {
      min-width: 120px;
    }
    :deep(.va-data-table__table-th[data-key="price"]),
    :deep(.va-data-table__table-td[data-key="price"]) {
      min-width: 80px;
    }
    :deep(.va-data-table__table-th[data-key="status"]),
    :deep(.va-data-table__table-td[data-key="status"]) {
      min-width: 80px;
    }
    :deep(.va-data-table__table-th[data-key="actions"]),
    :deep(.va-data-table__table-td[data-key="actions"]) {
      min-width: 100px;
    }
    .action-buttons {
      gap: 0.2rem;
      .va-button {
        font-size: 0.625rem;
        padding: 0.2rem;
      }
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
  .form-container {
    padding: 0.5rem;
  }
  .modal-container {
    padding: 0.5rem;
    .modal-title {
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }
    .modal-content {
      font-size: 0.75rem;
      p {
        margin-bottom: 0.25rem;
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
  .filter-container {
    .search-input,
    .filter-select {
      font-size: 0.625rem;
    }
    .va-button {
      font-size: 0.5rem;
      padding: 0.2rem 0.4rem;
    }
  }
  .pagination-add-container {
    .per-page-select {
      font-size: 0.625rem;
      max-width: 4rem;
    }
    .add-button,
    .done-button {
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
      min-width: 300px;
    }
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.2rem;
    }
    .action-buttons {
      .va-button {
        font-size: 0.5rem;
        padding: 0.15rem;
      }
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
  .form-container {
    padding: 0.25rem;
  }
  .modal-container {
    padding: 0.25rem;
    .modal-title {
      font-size: 0.875rem;
    }
    .modal-content {
      font-size: 0.625rem;
      p {
        margin-bottom: 0.2rem;
      }
    }
    .modal-footer {
      .va-button {
        font-size: 0.5rem;
        padding: 0.2rem 0.4rem;
      }
    }
  }
}
</style>