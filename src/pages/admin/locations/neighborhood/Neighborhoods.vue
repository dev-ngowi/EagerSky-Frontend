<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingNeighborhoods">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading neighborhoods...'" />
      </div>
    </template>
    <template v-else-if="errorMessage && !addEditForm">
      <div class="error-container">
        <div class="error-text">{{ errorMessage }}</div>
        <button class="retry-btn" @click="retryFetch">
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-header">
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by name or description..."
            class="search-input"
            :disabled="loadingNeighborhoods || addEditForm"
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
        <div class="actions-container">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="loadingNeighborhoods || addEditForm"
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
      <div
        v-if="!addEditForm && (!neighborhoods || (neighborhoods.length === 0 && !loadingNeighborhoods))"
        class="empty-state"
      >
        <div class="empty-icon">🏘️</div>
        <h3 class="empty-title">No neighborhoods found</h3>
        <p class="empty-subtitle">Add your first neighborhood to get started</p>
        <VaButton color="primary" @click="openForm(null, 'add')" class="empty-action">
          Add Neighborhood
        </VaButton>
      </div>
      <div v-if="!addEditForm && neighborhoods && neighborhoods.length > 0" class="table-wrapper">
        <VaDataTable
          :key="componentKey"
          :items="neighborhoods"
          striped
          :columns="columns"
          :loading="loadingNeighborhoods"
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
          <template #cell(description)="{ rowData }">
            <span class="cell-text truncate" :title="rowData.description || 'No description'">
              {{ rowData.description || 'No description' }}
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
                :disabled="loadingNeighborhoods"
              />
              <VaButton
                size="small"
                color="warning"
                icon="edit"
                class="action-icon"
                @click="openForm(rowData, 'edit')"
                :disabled="loadingNeighborhoods"
              />
              <VaButton
                size="small"
                color="danger"
                icon="delete"
                class="action-icon"
                @click="confirmDelete(rowData)"
                :disabled="loadingNeighborhoods || deleting"
              />
            </div>
          </template>
        </VaDataTable>
      </div>
      <div v-if="!addEditForm && neighborhoods && neighborhoods.length > 0" class="pagination-wrapper">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} neighborhoods
        </div>
        <div class="pagination-controls">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingNeighborhoods"
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
            :disabled="loadingNeighborhoods"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingNeighborhoods"
            @click="handlePageChange(pagination.current_page + 1)"
            class="pagination-btn"
          >
            Next
          </VaButton>
        </div>
      </div>
      <template v-if="addEditForm">
        <div class="forms-container">
          <NeighborhoodForm
            v-if="formMode === 'add'"
            @close="closeForm"
            @submit="debouncedHandleSubmit"
          />
          <NeighborhoodEdit
            v-else-if="formMode === 'edit' && selectedNeighborhood"
            :neighborhood="selectedNeighborhood"
            @close="closeForm"
            @submit="debouncedHandleSubmit"
          />
        </div>
      </template>
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
            <h2 class="modal-title">{{ $t('Neighborhood Details') }}</h2>
          </div>
          <div v-if="selectedNeighborhood" class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ selectedNeighborhood.name || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Description:</span>
                <span class="detail-value">{{ selectedNeighborhood.description || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Schools:</span>
                <span class="detail-value">{{ getListDisplay(selectedNeighborhood.schools) || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Amenities:</span>
                <span class="detail-value">{{ getListDisplay(selectedNeighborhood.amenities) || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Crime Rate:</span>
                <span class="detail-value">{{ selectedNeighborhood.crime_rate || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Median Income:</span>
                <span class="detail-value">{{ selectedNeighborhood.median_income || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Population:</span>
                <span class="detail-value">{{ selectedNeighborhood.population || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Walk Score:</span>
                <span class="detail-value">{{ selectedNeighborhood.walk_score || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Transit Score:</span>
                <span class="detail-value">{{ selectedNeighborhood.transit_score || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">{{ selectedNeighborhood.last_updated || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ selectedNeighborhood.created_at || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Updated:</span>
                <span class="detail-value">{{ selectedNeighborhood.updated_at || 'N/A' }}</span>
              </div>
              <div v-if="selectedNeighborhood.locations && selectedNeighborhood.locations.length" class="detail-item full-width">
                <span class="detail-label">Locations:</span>
                <div class="locations-list">
                  <div v-for="location in selectedNeighborhood.locations" :key="location.id" class="location-tag">
                    {{ location.name }}
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
import NeighborhoodForm from './NeighborhoodForm.vue';
import NeighborhoodEdit from './NeighborhoodEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

// ------------------------------------------------------------------
// FIX: Corrected Neighborhood interface to resolve type errors.
interface Neighborhood {
  id: number;
  name: string;
  description: string | null;
  // This must match the type expected by NeighborhoodEdit.vue
  schools: { [category: string]: string[] } | null;
  amenities: { [category: string]: string[] } | null;
  
  // FIX: Change to number | null to match the expected type in NeighborhoodEdit.vue
  crime_rate: number | null; 
  
  // These should also be numbers if they are being edited as such
  median_income: number | null;
  population: number | null;
  walk_score: number | null;
  transit_score: number | null;
  
  last_updated: string;
  created_at: string;
  updated_at: string;
  locations: { id: number; name: string }[] | null;
  locations_count: number;
}
// ------------------------------------------------------------------

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

export default defineComponent({
  name: 'NeighborhoodList',
  components: {
    NeighborhoodForm,
    NeighborhoodEdit,
    Loader,
  },
  data() {
    return {
      // Mobile detection
      windowWidth: window.innerWidth,

      columns: [
        { key: 'sn', sortable: false, label: 'SN', width: '60px' },
        { key: 'name', sortable: true, label: 'Name', minWidth: '120px' },
        { key: 'description', sortable: true, label: 'Description', minWidth: '150px' },
        { key: 'walk_score', sortable: true, label: 'Walk', width: '80px' },
        { key: 'transit_score', sortable: true, label: 'Transit', width: '80px' },
        { key: 'locations_count', sortable: true, label: 'Locations', width: '100px' },
        { key: 'created_at', sortable: true, label: 'Created', width: '120px' },
        { key: 'actions', label: 'Actions', sortable: false, width: '140px' },
      ] as Array<{ key: string; sortable: boolean; label: string; width?: string; minWidth?: string }>,

      neighborhoods: [] as Neighborhood[],
      loadingNeighborhoods: false,
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
      selectedNeighborhood: null as Neighborhood | null,
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
      schoolOptions: {} as Record<string, { id: number; name: string }[]>,
      amenityOptions: {} as Record<string, { id: number; name: string }[]>,
      optionsLoaded: false,
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
    handleResize() {
      this.windowWidth = window.innerWidth;
    },
    openView(neighborhood: Neighborhood) {
      this.selectedNeighborhood = neighborhood;
      this.showView = true;
    },
    closeView() {
      this.selectedNeighborhood = null;
      this.showView = false;
    },
    // Helper function to display list items from the grouped object structure
    getListDisplay(item: { [category: string]: string[] } | null): string {
      if (!item) return '';
      return Object.values(item).flat().join(', ');
    },
    // Helper function to transform a flat list of names from the API into the grouped object structure for the form
    convertFlatToGrouped(flatNames: string[], options: Record<string, { id: number; name: string }[]>): { [category: string]: string[] } {
      const grouped: Record<string, string[]> = {};
      if (!Array.isArray(flatNames) || Object.keys(options).length === 0) return grouped;
      
      for (const name of flatNames) {
        let found = false;
        // Search through the options map to find the category for the name
        for (const [category, opts] of Object.entries(options)) {
          if (opts.some(o => o.name === name)) {
            if (!grouped[category]) {
              grouped[category] = [];
            }
            grouped[category].push(name);
            found = true;
            break;
          }
        }
        // If an item is received from the API but no matching option category exists, place it in 'uncategorized'
        if (!found) {
          if (!grouped.uncategorized) {
            grouped.uncategorized = [];
          }
          grouped.uncategorized.push(name);
        }
      }
      return grouped;
    },
    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            if (!this.addEditForm) { 
              this.errorMessage = 'Failed to load neighborhoods. Please check your connection and try again.';
            }
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async fetchOptions() {
      if (this.optionsLoaded) return;
      try {
        const [schoolRes, amenityRes] = await Promise.all([
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/school-options`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          }),
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/amenity-options`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          }),
        ]);
        this.schoolOptions = schoolRes.data;
        this.amenityOptions = amenityRes.data;
        this.optionsLoaded = true;
      } catch (optionsError) {
        console.error('Failed to load options for neighborhood forms:', optionsError);
        // We still set it to true to avoid trying again immediately on next fetch
        this.optionsLoaded = true; 
      }
    },
    async retryFetch() {
      if (this.addEditForm) return; 
      this.errorMessage = null;
      await this.getNeighborhoods({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },
    async getNeighborhoods(params: { page?: number; per_page?: number; search?: string } = {}) {
      if (this.addEditForm || this.loadingNeighborhoods) return; 

      this.loadingNeighborhoods = true;
      try {
        await this.fetchOptions();

        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods`,
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
          this.neighborhoods = response.data.data.map((neighborhood: any) => ({
            id: neighborhood.id,
            name: neighborhood.name || 'Unknown',
            description: neighborhood.description || null,
            
            // Map flat API arrays to grouped structure expected by NeighborhoodEdit
            schools: neighborhood.schools ? this.convertFlatToGrouped(neighborhood.schools, this.schoolOptions) : null,
            amenities: neighborhood.amenities ? this.convertFlatToGrouped(neighborhood.amenities, this.amenityOptions) : null,
            
            // FIX: Explicitly convert to number using parseFloat for compatibility
            crime_rate: neighborhood.crime_rate !== null ? parseFloat(neighborhood.crime_rate) : null,
            median_income: neighborhood.median_income !== null ? parseFloat(neighborhood.median_income) : null,
            population: neighborhood.population !== null ? parseFloat(neighborhood.population) : null,
            walk_score: neighborhood.walk_score !== null ? parseFloat(neighborhood.walk_score) : null,
            transit_score: neighborhood.transit_score !== null ? parseFloat(neighborhood.transit_score) : null,
            
            last_updated: neighborhood.last_updated ? format(new Date(neighborhood.last_updated), 'd MMMM yyyy') : 'N/A',
            created_at: neighborhood.created_at ? format(new Date(neighborhood.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: neighborhood.updated_at ? format(new Date(neighborhood.updated_at), 'd MMMM yyyy') : 'N/A',
            locations: neighborhood.locations || null,
            locations_count: neighborhood.locations_count || (neighborhood.locations?.length || 0),
          })) as Neighborhood[];

          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length || 0,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: Math.ceil((response.data.pagination?.total || response.data.data.length || 0) / (response.data.pagination?.per_page || params.per_page || 10)),
            from: (response.data.pagination?.total || response.data.data.length || 0) > 0 ? ((response.data.pagination?.current_page || params.page || 1) - 1) * (response.data.pagination?.per_page || params.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination?.current_page || params.page || 1) * (response.data.pagination?.per_page || params.per_page || 10), response.data.pagination?.total || response.data.data.length || 0),
          };
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch neighborhoods.');
        }
      } catch (error: any) {
        console.error('getNeighborhoods error:', error.message, error.response?.data);
        if (!this.addEditForm) {
          let errorMessage = error.response?.data?.message || 'Failed to fetch neighborhoods.';
          if (error.message.includes('Network Error')) {
            errorMessage = 'Network error: Unable to connect to the server.';
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
        this.loadingNeighborhoods = false;
      }
    },
    openForm(neighborhood: Neighborhood | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedNeighborhood = neighborhood || {
        id: 0, name: '', description: null, 
        schools: null, amenities: null,
        crime_rate: null, median_income: null, population: null, walk_score: null,
        transit_score: null, last_updated: '', created_at: '', updated_at: '',
        locations: null, locations_count: 0
      };
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedNeighborhood = null;
      this.addEditForm = false;
      this.formMode = 'add';
      if (!this.loadingNeighborhoods) {
        this.getNeighborhoods({
          page: this.pagination.current_page,
          per_page: this.pagination.per_page,
          search: this.searchQuery,
        });
      }
    },
    cancelAdding() {
      this.closeForm();
    },
    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      console.log(`Submitting in ${mode} mode with payload:`, payload);

      if (this.submitting) return;
      this.submitting = true;

      try {
        let response;
        // NOTE: Replace these mock responses with your actual API calls
        if (mode === 'add') {
          response = { status: 201, data: { message: 'Neighborhood added successfully.' } };
        } else {
          response = { status: 200, data: { message: 'Neighborhood updated successfully.' } };
        }

        if (response.status === 201 || response.status === 200) {
          this.closeForm();
          this.componentKey += 1;
          await this.getNeighborhoods();
          Swal.fire({ title: 'Success!', text: response.data.message, icon: 'success', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
        } else {
          throw new Error(response.data?.message || 'Unexpected response status');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || `Failed to ${mode} neighborhood.`;
        Swal.fire({ title: 'Error!', text: errorMessage, icon: 'error', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
      } finally {
        this.submitting = false;
      }
    },
    async confirmDelete(neighborhood: Neighborhood) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the neighborhood: ${neighborhood.name}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        // NOTE: Replace this with your actual delete API call
        Swal.fire({ title: 'Deleted!', text: 'Neighborhood deleted successfully.', icon: 'success', position: 'top-end', toast: true, showConfirmButton: false, timer: 3000 });
        await this.getNeighborhoods();
      }
    },
    async handleSearch() {
      if (this.addEditForm || this.loadingNeighborhoods) return;
      this.pagination.current_page = 1;
      await this.getNeighborhoods({
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
      await this.getNeighborhoods({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },
    handlePageChange(page: number) {
      if (this.addEditForm || this.loadingNeighborhoods || page < 1 || page > this.pagination.last_page) return;
      this.pagination.current_page = page;
      this.getNeighborhoods({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },
    handlePerPageChange(perPage: number) {
      if (this.addEditForm || this.loadingNeighborhoods) return;
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      this.getNeighborhoods({
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
  text-align: center;
  padding: 3rem 1rem;
  gap: 0.75rem;
  .empty-icon {
    font-size: 3rem;
  }
  .empty-title {
    font-size: 1.125rem;
    font-weight: 600;
  }
  .empty-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .empty-action {
    margin-top: 0.5rem;
  }
}
// Table and Pagination
.table-wrapper {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}
.responsive-table {
  min-width: 100%;
}
.cell-text {
  display: inline-block;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
.actions-cell {
  display: flex;
  gap: 0.25rem;
  .action-icon {
    padding: 0.25rem;
    min-width: 30px;
  }
}
.pagination-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  @media (min-width: 768px) {
    flex-direction: row;
  }
}
.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}
.pagination-controls {
  display: flex;
  gap: 0.5rem;
}
.pagination-btn {
  padding: 0.5rem 0.75rem;
}
// Modal Styles
.modal-content {
  padding: 1rem;
}
.modal-header {
  margin-bottom: 1rem;
  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
  }
}
.modal-body {
  margin-bottom: 1rem;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  &.full-width {
    grid-column: 1 / -1;
  }
}
.detail-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: #4b5563;
}
.detail-value {
  font-size: 1rem;
  color: #1f2937;
}
.locations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.location-tag {
  background-color: #e0f2f1;
  color: #00897b;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}
</style>