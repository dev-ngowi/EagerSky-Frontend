<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <!-- Loading State -->
    <template v-if="loadingLocations">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading locations...'" />
      </div>
    </template>
   
    <!-- Error State -->
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
        <!-- Search and Filters -->
        <div class="filters-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by name..."
            class="search-input"
            :disabled="loadingLocations || addEditForm"
            @input="debouncedSearch"
          />
          <div class="filter-row">
            <VaSelect
              v-model="filters.country_id"
              placeholder="Filter by country"
              :options="countries"
              value-by="value"
              text-by="text"
              clearable
              :loading="loadingCountries"
              :disabled="loadingLocations || addEditForm"
              @update:modelValue="handleCountryChange"
              class="filter-select"
            />
            <VaSelect
              v-model="filters.city_id"
              placeholder="Filter by city"
              :options="cities"
              value-by="value"
              text-by="text"
              clearable
              :loading="loadingCities"
              :disabled="!filters.country_id || loadingLocations || addEditForm"
              @update:modelValue="debouncedSearch"
              class="filter-select"
            />
          </div>
          <VaButton
            v-if="(searchQuery || filters.country_id || filters.city_id) && !addEditForm"
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
            :disabled="loadingLocations || addEditForm"
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
      <!-- Empty State (Only show when no forms open) -->
      <div
        v-if="!addEditForm && (!locations || (locations.length === 0 && !loadingLocations))"
        class="empty-state"
      >
        <div class="empty-icon">📍</div>
        <h3 class="empty-title">No locations found</h3>
        <p class="empty-subtitle">Add your first location to get started</p>
        <VaButton color="primary" @click="openForm(null, 'add')" class="empty-action">
          Add Location
        </VaButton>
      </div>
      <!-- Data Table (HIDDEN when addEditForm is true) -->
      <div v-if="!addEditForm && locations && locations.length > 0" class="table-wrapper">
        <VaDataTable
          :key="componentKey"
          :items="locations"
          striped
          :columns="columns"
          :loading="loadingLocations"
          :no-data-html="'No locations found.'"
          class="responsive-table"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </template>
         
          <template #cell(name)="{ rowData }">
            <span class="cell-text truncate" :title="rowData.name">
              {{ rowData.name || 'N/A' }}
            </span>
          </template>
         
          <template #cell(city)="{ rowData }">
            <span class="cell-text truncate" :title="rowData.city || 'None'">
              {{ rowData.city || 'None' }}
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
                :disabled="loadingLocations"
              />
              <VaButton
                size="small"
                color="warning"
                icon="edit"
                class="action-icon"
                @click="openForm(rowData, 'edit')"
                :disabled="loadingLocations"
              />
              <VaButton
                size="small"
                color="danger"
                icon="delete"
                class="action-icon"
                @click="confirmDelete(rowData)"
                :disabled="loadingLocations || deleting"
              />
            </div>
          </template>
        </VaDataTable>
      </div>
      <!-- Pagination (HIDDEN when addEditForm is true) -->
      <div v-if="!addEditForm && locations && locations.length > 0" class="pagination-wrapper">
        <div class="pagination-info">
          Showing {{ paginationFrom }} to {{ paginationTo }} of {{ pagination.total }} locations
        </div>
        <div class="pagination-controls">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingLocations"
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
            :disabled="loadingLocations"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingLocations"
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
          <LocationForm
            v-if="formMode === 'add'"
            @close="closeForm"
            @submit="debouncedHandleSubmit"
          />
          <LocationEdit
            v-else-if="formMode === 'edit' && selectedLocation"
            :location="selectedLocation"
            @close="closeForm"
            @submit="debouncedHandleSubmit"
          />
        </div>
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
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">{{ $t('Location Details') }}</h2>
          </div>
         
          <div v-if="selectedLocation" class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ selectedLocation.name || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">City:</span>
                <span class="detail-value">{{ selectedLocation.city || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Country:</span>
                <span class="detail-value">{{ selectedLocation.country || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Street:</span>
                <span class="detail-value">{{ selectedLocation.street || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Neighborhood:</span>
                <span class="detail-value">{{ selectedLocation.neighborhood || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Latitude:</span>
                <span class="detail-value">{{ selectedLocation.latitude || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Longitude:</span>
                <span class="detail-value">{{ selectedLocation.longitude || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ selectedLocation.created_at || 'None' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Updated:</span>
                <span class="detail-value">{{ selectedLocation.updated_at || 'None' }}</span>
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
import { mapActions, mapState } from 'pinia';
import { useLocationStore } from '../../../../stores/locationStore';
import { Location, CountryOption, CityOption } from '../../../../types/location';
import LocationForm from './LocationForm.vue';
import LocationEdit from './LocationEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import type { DataTableColumnSource } from 'vuestic-ui';
export default defineComponent({
  name: 'LocationList',
  components: {
    LocationForm,
    LocationEdit,
    Loader,
  },
  data() {
    return {
      // Mobile detection
      windowWidth: window.innerWidth,
     
      // Existing data properties
      columns: [
        { key: 'sn' as const, sortable: false, label: 'SN', width: '60px' },
        { key: 'name' as const, sortable: true, label: 'Name', minWidth: '120px' },
        { key: 'city' as const, sortable: true, label: 'City', minWidth: '100px' },
        { key: 'country' as const, sortable: true, label: 'Country', minWidth: '100px' },
        { key: 'street' as const, sortable: true, label: 'Street', minWidth: '120px' },
        { key: 'neighborhood' as const, sortable: true, label: 'Neighborhood', minWidth: '100px' },
        { key: 'latitude' as const, sortable: true, label: 'Lat', width: '80px' },
        { key: 'longitude' as const, sortable: true, label: 'Lng', width: '80px' },
        { key: 'created_at' as const, sortable: true, label: 'Created', width: '120px' },
        { key: 'actions' as const, label: 'Actions', sortable: false, width: '140px' },
      ] as DataTableColumnSource<string>[],
      addEditForm: false,
      showView: false,
      selectedLocation: null as Location | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      filters: {
        country_id: null as number | null,
        city_id: null as number | null,
      },
      countries: [] as CountryOption[],
      cities: [] as CityOption[],
      loadingCountries: false,
      loadingCities: false,
      errorMessage: null as string | null,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      debouncedHandleSubmit: undefined as ((payload: any, mode: 'add' | 'edit') => void) | undefined,
      debouncedSearch: undefined as (() => void) | undefined,
    };
  },
  computed: {
    ...mapState(useLocationStore, ['locations', 'loadingLocations', 'pagination']),
    isMobile() {
      return this.windowWidth < 768;
    },
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
    paginationFrom() {
      return (this.pagination.current_page - 1) * this.pagination.per_page + 1;
    },
    paginationTo() {
      return Math.min(this.pagination.current_page * this.pagination.per_page, this.pagination.total);
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
    });
    this.$nextTick(() => {
      Promise.all([this.fetchCountries(), this.fetchCities(), this.fetchLocations()]);
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    ...mapActions(useLocationStore, ['getLocations', 'deleteLocation', 'addLocation', 'updateLocation']),
    // Mobile resize handler
    handleResize() {
      this.windowWidth = window.innerWidth;
    },
    // All existing methods remain exactly the same
    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            this.errorMessage = 'Failed to load data. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async fetchCountries() {
      this.loadingCountries = true;
      this.errorMessage = null;
      try {
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/country`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
          })
        );
        if (response && response.status === 200) {
          this.countries = response.data.data.map((country: any) => ({
            value: country.id,
            text: country.name || `Country ${country.id}`,
          }));
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch countries.');
        }
      } catch (error: any) {
        console.error('fetchCountries error:', error.message, error.response?.data);
        this.errorMessage = error.response?.data?.message || 'Failed to fetch countries.';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingCountries = false;
      }
    },
    async fetchCities() {
      if (!this.filters.country_id) {
        this.cities = [];
        this.filters.city_id = null;
        return;
      }
      this.loadingCities = true;
      this.errorMessage = null;
      try {
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/city`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            params: { country_id: this.filters.country_id },
          })
        );
        if (response && response.status === 200) {
          this.cities = response.data.data.map((city: any) => ({
            value: city.id,
            text: city.name || `City ${city.id}`,
          }));
          if (!this.cities.some((city) => city.value === this.filters.city_id)) {
            this.filters.city_id = null;
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch cities.');
        }
      } catch (error: any) {
        console.error('fetchCities error:', error.message, error.response?.data);
        this.errorMessage = error.response?.data?.message || 'Failed to fetch cities.';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingCities = false;
      }
    },
    async fetchLocations(page: number = this.pagination.current_page) {
      if (this.loadingLocations) return;
      this.errorMessage = null;
      const params = {
        page,
        per_page: this.pagination.per_page,
        search: this.searchQuery || undefined,
        country_id: this.filters.country_id || undefined,
        city_id: this.filters.city_id || undefined,
      };
      try {
        const response = await this.fetchWithRetry(() => this.getLocations(params));
        if (response && this.locations.length === 0) {
          Swal.fire({
            title: 'Info',
            text: 'No locations found. Add some locations to get started.',
            icon: 'info',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('fetchLocations error:', error.message, error.response?.data);
        this.errorMessage = error.response?.data?.message || 'Failed to fetch locations.';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    async retryFetch() {
      this.errorMessage = null;
      await Promise.all([this.fetchCountries(), this.fetchCities(), this.fetchLocations()]);
    },
    async handleSearch() {
      this.pagination.current_page = 1;
      await this.fetchLocations();
      this.componentKey += 1;
    },
    async clearSearch() {
      this.searchQuery = '';
      this.filters.country_id = null;
      this.filters.city_id = null;
      this.cities = [];
      this.pagination.current_page = 1;
      await this.fetchLocations();
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      if (this.loadingLocations || page < 1 || page > this.pagination.last_page) return;
      await this.fetchLocations(page);
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      await this.fetchLocations();
      this.componentKey += 1;
    },
    async handleCountryChange() {
      this.filters.city_id = null;
      await this.fetchCities();
      await this.handleSearch();
    },
    openForm(location: Location | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !location) {
        Swal.fire({
          title: 'Error!',
          text: 'No location selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      this.selectedLocation = location || {
        id: 0,
        name: '',
        city_id: null,
        country_id: null,
        street_id: null,
        neighborhood_id: null,
        latitude: null,
        longitude: null,
        country: null,
        city: null,
        street: null,
        neighborhood: null,
        created_at: null,
        updated_at: null,
      };
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedLocation = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.fetchLocations();
    },
    openView(location: Location) {
      this.selectedLocation = location;
      this.showView = true;
    },
    closeView() {
      this.selectedLocation = null;
      this.showView = false;
    },
    confirmDelete(location: Location) {
      this.selectedLocation = location;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the location "${location.name}". This action cannot be undone.`,
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
      if (!this.selectedLocation?.id || this.deleting) return;
      this.deleting = true;
      try {
        const response = await this.deleteLocation(this.selectedLocation.id);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Location deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.selectedLocation = null;
          this.componentKey += 1;
          await this.fetchLocations();
        } else {
          throw new Error(response.data?.message || 'Failed to delete location.');
        }
      } catch (err: any) {
        console.error('Delete error:', err.response?.data || err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to delete location.',
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
          response = await this.addLocation(payload);
        } else {
          if (!this.selectedLocation?.id) {
            throw new Error('No location ID provided for update');
          }
          response = await this.updateLocation({ id: this.selectedLocation.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Location has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.closeForm();
          this.componentKey += 1;
        } else {
          throw new Error(response.data?.message || `Failed to ${mode} location.`);
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response?.data || err);
        let errorMessage = err.response?.data?.message || `Failed to ${mode} location.`;
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
        this.submitting = false;
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
    margin-bottom: 0;
    @media (min-width: 640px) {
      margin-bottom: 0;
    }
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
    @media (min-width: 640px) {
      margin-left: 1rem;
      padding: 0.625rem 1.25rem;
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
.filters-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto;
    gap: 1rem;
    align-items: end;
  }
  .search-input {
    width: 100%;
    @media (min-width: 768px) {
      max-width: 16rem;
    }
  }
  .filter-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    @media (min-width: 768px) {
      flex-direction: row;
      gap: 1rem;
    }
    .filter-select {
      flex: 1;
      min-width: 140px;
    }
  }
  .clear-btn {
    align-self: flex-start;
    white-space: nowrap;
    @media (min-width: 768px) {
      align-self: center;
      grid-column: 4;
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
  min-width: 800px;
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
    &[data-key="sn"] {
      width: 60px;
      min-width: 60px;
    }
    &[data-key="latitude"],
    &[data-key="longitude"] {
      width: 80px;
      min-width: 80px;
      text-align: center;
    }
    &[data-key="actions"] {
      width: 140px;
      min-width: 140px;
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
// Forms (full width)
:deep(.va-form) {
  width: 100%;
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
  max-width: 500px;
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
  max-height: 50vh;
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
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
  .detail-label {
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
    min-width: 90px;
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
  .filters-container {
    gap: 0.5rem;
    .filter-row {
      gap: 0.5rem;
    }
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
  }
}
</style>