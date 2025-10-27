<template>
  <div class="container">
    <template v-if="loadingPropertyFeatures">
      <div class="loading-container">
        <Loader :loading-text="'Loading property features...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-container">
        <span class="error-text">{{ errorMessage }}</span>
        <button class="retry-button" @click="retryFetch" aria-label="Retry loading property features">
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div v-if="!addEditForm">
        <div class="controls-container">
          <div class="search-filter-group">
            <VaInput
              v-model="searchQuery"
              placeholder="Search by feature name..."
              class="search-input"
              :disabled="loadingPropertyFeatures"
              @input="debouncedSearch"
              aria-label="Search property features by name"
            />
            <VaButton
              v-if="searchQuery || filters.property_id"
              color="warning"
              size="small"
              class="clear-button"
              @click="clearSearch"
              aria-label="Clear search and filters"
            >
              Clear Search
            </VaButton>
            <VaSelect
              v-model="filters.property_id"
              placeholder="Filter by property"
              :options="properties"
              value-by="value"
              text-by="text"
              clearable
              :loading="loadingProperties"
              class="filter-select"
              @update:modelValue="debouncedSearch"
              aria-label="Filter property features by property"
            />
          </div>
          <div class="pagination-actions-group">
            <VaSelect
              v-model="pagination.per_page"
              :options="perPageOptions"
              label="Items per page"
              value-by="value"
              text-by="text"
              class="per-page-select"
              @update:modelValue="handlePerPageChange"
              aria-label="Select items per page"
            />
            <VaButton
              icon="add"
              color="#00A3E0"
              size="small"
              class="action-button"
              @click="openForm(null, 'add')"
              aria-label="Add new property feature"
            >
              Add Feature
            </VaButton>
            <VaButton
              v-if="addEditForm"
              icon="close"
              color="success"
              size="small"
              class="action-button"
              @click="cancelAdding"
              aria-label="Finish adding or editing feature"
            >
              Done
            </VaButton>
          </div>
        </div>
        <div v-if="!propertyFeatures || (propertyFeatures.length === 0 && !loadingPropertyFeatures)" class="no-data">
          No property features found.
        </div>
        <VaDataTable
          v-else-if="propertyFeatures && propertyFeatures.length > 0"
          :key="componentKey"
          :items="propertyFeatures"
          striped
          :columns="columns"
          :loading="loadingPropertyFeatures"
          class="data-table"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
          </template>
          <template #cell(actions)="{ rowData }">
            <VaButton
              size="small"
              color="primary"
              icon="visibility"
              class="action-button"
              @click="openView(rowData)"
              :aria-label="`View details for ${rowData.feature_name}`"
            />
            <VaButton
              size="small"
              color="warning"
              icon="edit"
              class="action-button"
              @click="openForm(rowData, 'edit')"
              :aria-label="`Edit ${rowData.feature_name}`"
            />
            <VaButton
              size="small"
              color="danger"
              icon="delete"
              class="action-button"
              @click="confirmDelete(rowData)"
              :aria-label="`Delete ${rowData.feature_name}`"
            />
          </template>
        </VaDataTable>
        <div v-if="propertyFeatures && propertyFeatures.length > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} features
          </div>
          <div class="pagination-buttons">
            <VaButton
              size="small"
              :disabled="pagination.current_page === 1"
              @click="handlePageChange(pagination.current_page - 1)"
              class="pagination-button"
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
              class="pagination-button"
              :aria-label="`Go to page ${page}`"
            >
              {{ page }}
            </VaButton>
            <VaButton
              size="small"
              :disabled="pagination.current_page === pagination.last_page"
              @click="handlePageChange(pagination.current_page + 1)"
              class="pagination-button"
              aria-label="Go to next page"
            >
              Next
            </VaButton>
          </div>
        </div>
      </div>
      <template v-if="addEditForm">
        <PropertyFeatureForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
        <PropertyFeatureEdit
          v-if="formMode === 'edit' && selectedPropertyFeature"
          :feature="selectedPropertyFeature"
          @close="closeForm"
          @submit="debouncedHandleSubmit"
        />
      </template>
      <!-- View Modal -->
      <VaModal
        v-model="showView"
        size="medium"
        layout="centered"
        close-button
        hide-default-actions
        class="modal"
      >
        <div class="modal-title">Property Feature Details</div>
        <div v-if="selectedPropertyFeature" class="modal-content">
          <p><strong>Property ID:</strong> {{ selectedPropertyFeature.property_id }}</p>
          <p><strong>Property Title:</strong> {{ selectedPropertyFeature.property_title || 'None' }}</p>
          <p><strong>Feature Name:</strong> {{ selectedPropertyFeature.feature_name }}</p>
          <p><strong>Value:</strong> {{ selectedPropertyFeature.value }}</p>
          <p><strong>Created At:</strong> {{ selectedPropertyFeature.created_at || 'N/A' }}</p>
          <p><strong>Updated At:</strong> {{ selectedPropertyFeature.updated_at || 'N/A' }}</p>
        </div>
        <div class="modal-actions">
          <VaButton
            color="secondary"
            @click="closeView"
            class="modal-close-button"
            aria-label="Close property feature details"
          >
            Close
          </VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import PropertyFeatureForm from './FeatureForm.vue';
import PropertyFeatureEdit from './FeatureEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

interface PropertyFeature {
  id: number;
  property_id: number;
  property_title?: string;
  feature_name: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from?: number;
  to?: number;
}

export default defineComponent({
  name: 'PropertyFeatureList',
  components: {
    PropertyFeatureForm,
    PropertyFeatureEdit,
    Loader,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'feature_name', sortable: true, label: 'Feature Name' },
        { key: 'value', sortable: true, label: 'Value' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ] as Array<{ key: string; sortable: boolean; label: string }>,
      addEditForm: false,
      showView: false,
      selectedPropertyFeature: null as PropertyFeature | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      filters: {
        property_id: null as number | null,
      },
      properties: [] as { value: number; text: string }[],
      loadingProperties: false,
      loadingPropertyFeatures: false,
      propertyFeatures: [] as PropertyFeature[],
      errorMessage: null as string | null,
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      } as Pagination,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Array<{ value: number; text: string }>,
      debouncedHandleSubmit: undefined as ((payload: any, mode: 'add' | 'edit') => void) | undefined,
      debouncedSearch: undefined as (() => void) | undefined,
    };
  },
  computed: {
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
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 500, { leading: true, trailing: false });
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
            this.errorMessage = 'Failed to load property features. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async retryFetch() {
      this.errorMessage = null;
      await Promise.all([this.fetchProperties(), this.fetchPropertyFeatures()]);
    },
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
        }
      } catch (error: any) {
        console.error('fetchProperties error:', error.message);
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
    async fetchPropertyFeatures() {
      this.loadingPropertyFeatures = true;
      try {
        console.log('Fetching property features...', {
          page: this.pagination.current_page,
          perPage: this.pagination.per_page,
          search: this.searchQuery,
          property_id: this.filters.property_id,
        });
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            params: {
              page: this.pagination.current_page || 1,
              per_page: this.pagination.per_page || 10,
              search: this.searchQuery || undefined,
              property_id: this.filters.property_id || undefined,
            },
          })
        );
        if (response && response.status === 200) {
          this.propertyFeatures = response.data.data.map((item: any) => ({
            id: item.id,
            property_id: item.property_id,
            property_title: item.property_title || 'None',
            feature_name: item.feature_name,
            value: item.value,
            created_at: item.created_at ? format(new Date(item.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: item.updated_at ? format(new Date(item.updated_at), 'd MMMM yyyy') : 'N/A',
          }));
          this.pagination = {
            total: response.data.pagination.total || 0,
            per_page: response.data.pagination.per_page || 10,
            current_page: response.data.pagination.current_page || 1,
            last_page: Math.ceil((response.data.pagination.total || 0) / (response.data.pagination.per_page || 10)),
            from: response.data.pagination.total > 0 ? ((response.data.pagination.current_page || 1) - 1) * (response.data.pagination.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination.current_page || 1) * (response.data.pagination.per_page || 10), response.data.pagination.total || 0),
          };
          console.log('Fetched propertyFeatures:', response.data);
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No property features found. Add some features to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch property features.');
        }
      } catch (error: any) {
        console.error('fetchPropertyFeatures error:', error.message);
        let errorMessage = 'Failed to fetch property features.';
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
        this.loadingPropertyFeatures = false;
      }
    },
    async addPropertyFeature(payload: any) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features`,
        method: 'post',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
        data: payload,
      });
    },
    async updatePropertyFeature({ id, ...payload }: { id: number }) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features/${id}`,
        method: 'put',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
        data: payload,
      });
    },
    async deletePropertyFeature(id: number) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features/${id}`,
        method: 'delete',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
      });
    },
    async handleSearch() {
      console.log('Search query:', this.searchQuery, 'Property ID:', this.filters.property_id);
      this.pagination.current_page = 1;
      await this.fetchPropertyFeatures();
    },
    clearSearch() {
      this.searchQuery = '';
      this.filters.property_id = null;
      this.pagination.current_page = 1;
      this.fetchPropertyFeatures();
    },
    handlePageChange(page: number) {
      this.pagination.current_page = page || 1;
      this.fetchPropertyFeatures();
    },
    handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage || 10;
      this.pagination.current_page = 1;
      this.fetchPropertyFeatures();
    },
    openForm(propertyFeature: PropertyFeature | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedPropertyFeature = propertyFeature;
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedPropertyFeature = null;
      this.addEditForm = false;
      this.formMode = 'add';
      if (!this.loadingPropertyFeatures) {
        this.fetchPropertyFeatures();
      }
    },
    openView(propertyFeature: PropertyFeature) {
      this.selectedPropertyFeature = propertyFeature;
      this.showView = true;
    },
    closeView() {
      this.selectedPropertyFeature = null;
      this.showView = false;
    },
    confirmDelete(propertyFeature: PropertyFeature) {
      this.selectedPropertyFeature = propertyFeature;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the feature "${propertyFeature.feature_name}" for property "${propertyFeature.property_title || 'Property ' + propertyFeature.property_id}". This action cannot be undone.`,
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
      if (!this.selectedPropertyFeature?.id || this.deleting) return;
      this.deleting = true;
      try {
        const response = await this.deletePropertyFeature(this.selectedPropertyFeature.id);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Success!',
            text: 'Feature deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.selectedPropertyFeature = null;
          await this.fetchPropertyFeatures();
        } else {
          throw new Error(response.data?.message || 'Unexpected response status');
        }
      } catch (err: any) {
        console.error('Delete error:', err.response || err);
        let errorMessage = err.response?.data?.message || 'Failed to delete feature.';
        if (err.response?.status === 422 && err.response?.data?.errors) {
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
        this.deleting = false;
      }
    },
    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      console.log('handleSubmit called with payload:', payload, 'mode:', mode);
      try {
        let response;
        if (mode === 'add') {
          response = await this.addPropertyFeature(payload);
        } else if (this.selectedPropertyFeature) {
          response = await this.updatePropertyFeature({ id: this.selectedPropertyFeature.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: mode === 'add' ? 'Feature added successfully.' : 'Feature updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.closeForm();
        } else {
          throw new Error(response.data?.message || `Unexpected response status: ${response.status}`);
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response || err);
        let errorMessage = err.response?.data?.message || `Failed to ${mode} feature.`;
        if (err.response?.status === 422 && err.response?.data?.errors) {
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
  },
});
</script>

<style lang="scss" scoped>
.container {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 0.75rem;
  max-width: 100%;
  overflow-x: auto;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 16rem;

  @media screen and (min-width: 768px) {
    min-height: 20rem;
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  text-align: center;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    padding: 1rem;
  }
}

.error-text {
  font-size: 0.875rem;
  color: #ef4444;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
  }
}

.retry-button {
  font-size: 0.75rem;
  color: #2563eb;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;
  margin-top: 0.25rem;
  min-height: 40px;
  min-width: 40px;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    margin-left: 1rem;
    margin-top: 0;
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
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
}

.search-filter-group,
.pagination-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
}

.search-input,
.filter-select,
.per-page-select {
  font-size: 0.875rem;

  :deep(.va-input__label),
  :deep(.va-select__label) {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  :deep(.va-input__input),
  :deep(.va-select__input) {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  :deep(.va-input__error-message),
  :deep(.va-select__error-message) {
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;
  }

  @media screen and (min-width: 768px) {
    font-size: 1rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 1rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.75rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.875rem;
    }
  }
}

.search-input {
  width: 100%;
  max-width: 16rem;
}

.filter-select {
  width: 100%;
  max-width: 12rem;
}

.per-page-select {
  width: 100%;
  max-width: 8rem;
}

.clear-button,
.action-button,
.pagination-button,
.modal-close-button {
  min-height: 40px;
  min-width: 40px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}

.no-data {
  text-align: center;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;

  @media screen and (min-width: 768px) {
    padding: 1rem;
    font-size: 1rem;
  }
}

.data-table {
  width: 100%;
  overflow-x: auto;

  :deep(.va-data-table__table) {
    min-width: 36rem;
  }

  :deep(.va-data-table__table-th) {
    font-size: 0.75rem;
    padding: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem;
    }
  }

  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem;
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
    gap: 0.75rem;
    margin-top: 1rem;
  }
}

.pagination-info {
  font-size: 0.75rem;
  color: #4b5563;

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
}

.modal {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #374151;

  @media screen and (min-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.modal-content {
  font-size: 0.875rem;
  color: #4b5563;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    gap: 0.5rem;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    margin-top: 1rem;
  }
}

@media (max-width: 640px) {
  .container {
    padding: 0.5rem;
  }

  .loading-container {
    min-height: 12rem;
  }

  .error-container {
    padding: 0.5rem;
  }

  .error-text {
    font-size: 0.75rem;
  }

  .retry-button {
    font-size: 0.625rem;
    min-height: 36px;
    min-width: 36px;
  }

  .controls-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .search-filter-group,
  .pagination-actions-group {
    gap: 0.25rem;
  }

  .search-input,
  .filter-select,
  .per-page-select {
    font-size: 0.75rem;
    max-width: 100%;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.75rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.375rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.625rem;
    }
  }

  .clear-button,
  .action-button,
  .pagination-button,
  .modal-close-button {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
    min-height: 36px;
    min-width: 36px;
  }

  .no-data {
    font-size: 0.75rem;
    padding: 0.5rem;
  }

  .data-table {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.375rem;
    }
  }

  .pagination-container {
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .pagination-info {
    font-size: 0.625rem;
  }

  .pagination-buttons {
    gap: 0.125rem;
  }

  .modal {
    padding: 0.5rem;
  }

  .modal-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .modal-content {
    font-size: 0.75rem;
    gap: 0.125rem;
  }

  .modal-actions {
    margin-top: 0.5rem;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0.25rem;
  }

  .loading-container {
    min-height: 10rem;
  }

  .error-container {
    padding: 0.25rem;
  }

  .error-text {
    font-size: 0.625rem;
  }

  .retry-button {
    font-size: 0.5rem;
    min-height: 32px;
    min-width: 32px;
  }

  .controls-container {
    gap: 0.125rem;
    margin-bottom: 0.25rem;
  }

  .search-filter-group,
  .pagination-actions-group {
    gap: 0.125rem;
  }

  .search-input,
  .filter-select,
  .per-page-select {
    font-size: 0.625rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.625rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.25rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.5rem;
    }
  }

  .clear-button,
  .action-button,
  .pagination-button,
  .modal-close-button {
    font-size: 0.5rem;
    padding: 0.2rem 0.4rem;
    min-height: 32px;
    min-width: 32px;
  }

  .no-data {
    font-size: 0.625rem;
    padding: 0.25rem;
  }

  .data-table {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.25rem;
    }
  }

  .pagination-container {
    gap: 0.125rem;
    margin-top: 0.25rem;
  }

  .pagination-info {
    font-size: 0.5rem;
  }

  .modal {
    padding: 0.25rem;
  }

  .modal-title {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .modal-content {
    font-size: 0.625rem;
  }

  .modal-actions {
    margin-top: 0.25rem;
  }
}
</style>