<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingOwners">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading property owners...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading property owners"
        >
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-container">
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by name or email..."
            class="search-input"
            :disabled="loadingOwners"
            @input="debouncedSearch"
            aria-label="Search property owners by name or email"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search query">
            Clear Search
          </VaButton>
        </div>
        <div class="pagination-add-container">
          <VaSelect
            v-model="perPage"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="loadingOwners"
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
            aria-label="Add new property owner"
          >
            Add Property Owner
          </VaButton>
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="done-button"
            @click="closeForm"
            aria-label="Close property owner form"
          >
            Done
          </VaButton>
        </div>
      </div>
      <div v-if="!addEditForm">
        <div v-if="!owners || (owners.length === 0 && !loadingOwners)" class="no-data-message">
          No property owners found.
        </div>
        <div v-else-if="owners && owners.length > 0" class="table-responsive">
          <VaDataTable
            :key="componentKey"
            :items="formattedOwners"
            striped
            :columns="columns"
            :loading="loadingOwners"
          >
            <template #cell(sn)="{ rowIndex }">
              {{ ((currentPage || 1) - 1) * (perPage || 10) + rowIndex + 1 }}
            </template>
            <template #cell(property_category.name)="{ rowData }">
              {{ rowData.property_category?.name || 'Not specified' }}
            </template>
            <template #cell(actions)="{ rowData }">
              <div class="action-buttons">
                <VaButton
                  size="small"
                  color="warning"
                  icon="edit"
                  @click="openForm(rowData, 'edit')"
                  aria-label="Edit property owner"
                />
                <VaButton
                  size="small"
                  color="danger"
                  icon="delete"
                  @click="deleteOwner(rowData.id)"
                  aria-label="Delete property owner"
                />
              </div>
            </template>
          </VaDataTable>
        </div>
        <div v-if="owners && owners.length > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} property owners
          </div>
          <div class="pagination-buttons">
            <VaButton
              size="small"
              :disabled="currentPage === 1 || loadingOwners"
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
              :disabled="currentPage === pagination.last_page || loadingOwners"
              @click="handlePageChange(currentPage + 1)"
              aria-label="Go to next page"
            >
              Next
            </VaButton>
          </div>
        </div>
      </div>
      <template v-else>
        <PropertyOwnerForm
          :property-owner="selectedOwner"
          :form-mode="formMode"
          @close="closeForm"
          @submit="handleSubmitSuccess"
        />
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PropertyOwnerForm from './PropertyOwnerForm.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';

/**
 * Interface representing a City object.
 */
interface City {
  id: number;
  name: string;
}

/**
 * Interface representing the full Location object expected by the form.
 * This structure is derived from the TypeScript error message.
 */
interface Location {
  id: number;
  name: string;
  city: City;
}

interface PropertyOwner {
  id: number;
  user: {
    id: number; // Added 'id' based on the implicit structure of selectedOwner
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    username?: string; // Added optional fields based on the implicit structure of selectedOwner
    pin: string | number; // Added optional fields based on the implicit structure of selectedOwner
    nida_number?: string; // Added optional fields based on the implicit structure of selectedOwner
  };
  owner_type: string;
  property_count: number;
  // **FIX:** Updated the location type to the full expected structure.
  location: Location | null; 
  property_category: { id: number; name: string } | null;
  shared_living_space: boolean;
  is_verified: boolean;
  business_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
  created_at: string;
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
  name: 'PropertyOwnerList',
  components: { PropertyOwnerForm, Loader },
  data() {
    return {
      owners: [] as PropertyOwner[],
      loadingOwners: false,
      searchQuery: '',
      currentPage: 1,
      perPage: 10,
      totalItems: 0,
      errorMessage: null as string | null,
      addEditForm: false,
      selectedOwner: null as PropertyOwner | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      debouncedSearch: null as unknown as () => void,
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'user.full_name', sortable: true, label: 'Name' },
        { key: 'owner_type', sortable: true, label: 'Type' },
        { key: 'property_count', sortable: true, label: 'Property Count' },
        { key: 'location.name', sortable: true, label: 'Location' },
        { key: 'property_category.name', sortable: true, label: 'Category' },
        { key: 'is_verified', sortable: true, label: 'Verified' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ] as Array<{ key: string; sortable: boolean; label: string }>,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Array<{ value: number; text: string }>,
    };
  },
  computed: {
    formattedOwners(): any[] {
      return this.owners.map(owner => ({
        ...owner,
        user: {
          ...owner.user,
          full_name: `${owner.user.first_name} ${owner.user.last_name}`,
        },
        // **NOTE**: Since location in PropertyOwner is now the full object, 
        // we'll format the display but keep the original object for `selectedOwner`.
        location: owner.location ? { ...owner.location } : { name: 'Not specified' },
        property_category: {
          name: owner.property_category?.name || 'Not specified',
          id: owner.property_category?.id || null,
        },
        created_at: this.formatDate(owner.created_at),
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
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 300);
  },
  mounted() {
    this.retryFetch();
  },
  methods: {
    formatDate(dateString: string): string {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    },
    async fetchOwners() {
      this.loadingOwners = true;
      try {
        const params = {
          page: this.currentPage,
          per_page: this.perPage,
          search: this.searchQuery || undefined,
        };

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/admin/property-owners`,
          method: 'get',
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          this.owners = response.data.data;
          this.currentPage = response.data.pagination.current_page;
          this.perPage = response.data.pagination.per_page;
          this.totalItems = response.data.pagination.total;
          if (this.owners.length === 0 && !this.searchQuery) { // Only show info if not searching
            Swal.fire({
              title: 'Info',
              text: 'No property owners found. Add some to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch property owners');
        }
      } catch (error: any) {
        console.error('Failed to fetch property owners:', error);
        this.errorMessage = error.response?.data?.message || 'Failed to fetch property owners. Please try again.';
      } finally {
        this.loadingOwners = false;
      }
    },
    async retryFetch() {
      this.errorMessage = null;
      await this.fetchOwners();
    },
    async handleSearch() {
      this.currentPage = 1;
      await this.fetchOwners();
    },
    clearSearch() {
      this.searchQuery = '';
      this.currentPage = 1;
      this.fetchOwners();
    },
    handlePageChange(page: number) {
      this.currentPage = page;
      this.fetchOwners();
    },
    handlePerPageChange(perPage: number) {
      this.perPage = perPage;
      this.currentPage = 1;
      this.fetchOwners();
    },
    // The fix requires that when opening the form for editing, we pass a value 
    // that conforms to the PropertyOwner type, which now has the full location object.
    openForm(owner: PropertyOwner | null, mode: 'add' | 'edit') {
      // Use the owner data directly since the interface now matches the expected prop type
      this.selectedOwner = owner ? { ...owner } : null; 
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedOwner = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.fetchOwners();
    },
    async handleSubmitSuccess(payload: Partial<PropertyOwner>, mode: 'add' | 'edit') {
      this.closeForm();
      this.componentKey += 1;
      Swal.fire({
        title: 'Success!',
        text: mode === 'add' ? 'Property owner added successfully.' : 'Property owner updated successfully.',
        icon: 'success',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    },
    async deleteOwner(id: number) {
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
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/admin/property-owners/${id}`,
            method: 'delete',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          });
          if (response.status === 200 || response.status === 204) {
            this.fetchOwners();
            Swal.fire({
              title: 'Deleted!',
              text: 'Property owner deleted successfully.',
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || 'Failed to delete property owner.';
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

.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .search-input {
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;

    @media screen and (min-width: 640px) {
      max-width: 16rem;
    }

    @media screen and (min-width: 768px) {
      max-width: 20rem;
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

@media (max-width: 640px) {
  .p-4 {
    padding: 0.5rem;
  }

  .controls-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .search-container {
    .search-input {
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

    :deep(.va-data-table__table-th[data-key="location.name"]),
    :deep(.va-data-table__table-td[data-key="location.name"]),
    :deep(.va-data-table__table-th[data-key="property_category.name"]),
    :deep(.va-data-table__table-td[data-key="property_category.name"]),
    :deep(.va-data-table__table-th[data-key="is_verified"]),
    :deep(.va-data-table__table-td[data-key="is_verified"]),
    :deep(.va-data-table__table-th[data-key="created_at"]),
    :deep(.va-data-table__table-td[data-key="created_at"]) {
      display: none; /* Hide less critical columns on mobile */
    }

    :deep(.va-data-table__table-th[data-key="sn"]),
    :deep(.va-data-table__table-td[data-key="sn"]) {
      min-width: 40px;
    }

    :deep(.va-data-table__table-th[data-key="user.full_name"]),
    :deep(.va-data-table__table-td[data-key="user.full_name"]) {
      min-width: 120px;
    }

    :deep(.va-data-table__table-th[data-key="owner_type"]),
    :deep(.va-data-table__table-td[data-key="owner_type"]) {
      min-width: 80px;
    }

    :deep(.va-data-table__table-th[data-key="property_count"]),
    :deep(.va-data-table__table-td[data-key="property_count"]) {
      min-width: 80px;
    }

    :deep(.va-data-table__table-th[data-key="actions"]),
    :deep(.va-data-table__table-td[data-key="actions"]) {
      min-width: 80px;
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
}

@media (max-width: 480px) {
  .p-4 {
    padding: 0.25rem;
  }

  .controls-container {
    gap: 0.125rem;
  }

  .search-container {
    .search-input {
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
}
</style>