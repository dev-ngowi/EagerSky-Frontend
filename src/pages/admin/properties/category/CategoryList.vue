<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingCategories">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading categories...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading categories"
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
            placeholder="Search by category name..."
            class="search-input"
            :disabled="loadingCategories"
            @input="debouncedSearch"
            aria-label="Search categories by name"
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
            :disabled="loadingCategories"
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
            aria-label="Add new category"
          >
            Add Category
          </VaButton>
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="done-button"
            @click="cancelAdding"
            aria-label="Close category form"
          >
            Done
          </VaButton>
        </div>
      </div>
      <div v-if="!addEditForm">
        <div v-if="!categories || (categories.length === 0 && !loadingCategories)" class="no-data-message">
          No categories found.
        </div>
        <div v-else-if="categories && categories.length > 0" class="table-responsive">
          <VaDataTable
            :key="componentKey"
            :items="categories"
            striped
            :columns="columns"
            :loading="loadingCategories"
          >
            <template #cell(sn)="{ rowIndex }">
              {{ ((currentPage || 1) - 1) * (perPage || 10) + rowIndex + 1 }}
            </template>
            <template #cell(actions)="{ rowData }">
              <div class="action-buttons">
                <VaButton
                  size="small"
                  color="warning"
                  icon="edit"
                  @click="openForm(rowData, 'edit')"
                  aria-label="Edit category"
                />
                <VaButton
                  size="small"
                  color="danger"
                  icon="delete"
                  @click="deleteCategory(rowData.id)"
                  aria-label="Delete category"
                />
              </div>
            </template>
          </VaDataTable>
        </div>
        <div v-if="categories && categories.length > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} categories
          </div>
          <div class="pagination-buttons">
            <VaButton
              size="small"
              :disabled="currentPage === 1 || loadingCategories"
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
              :disabled="currentPage === pagination.last_page || loadingCategories"
              @click="handlePageChange(currentPage + 1)"
              aria-label="Go to next page"
            >
              Next
            </VaButton>
          </div>
        </div>
      </div>
      <template v-else>
        <CategoryForm
          :category="selectedCategory"
          :form-mode="formMode"
          @close="closeForm"
          @submit="handleSubmitSuccess"
        />
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import CategoryForm from './CategoryForm.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

interface Category {
  id: number;
  name: string;
  // **FIX:** Change 'created_at?: string' to 'created_at: string' to match the required prop type in CategoryForm.vue
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
  name: 'CategoryList',
  components: {
    CategoryForm,
    Loader,
  },
  data() {
    return {
      categories: [] as Category[],
      loadingCategories: false,
      searchQuery: '',
      currentPage: 1,
      perPage: 10,
      totalItems: 0,
      errorMessage: null as string | null,
      addEditForm: false,
      selectedCategory: null as Category | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      submitting: false,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Array<{ value: number; text: string }>,
      debouncedSearch: null as unknown as () => void,
    };
  },
  computed: {
    columns() {
      return [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Category Name' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ] as Array<{ key: string; sortable: boolean; label: string }>;
    },
    pagination(): Pagination {
      const current = this.currentPage || 1;
      const perPage = this.perPage || 10;
      const total = this.totalItems || 0;
      return {
        current_page: current,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
        from: total > 0 ? (current - 1) * perPage + 1 : 0,
        to: Math.min(current * perPage, total),
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
    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            this.errorMessage = 'Failed to load categories. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async retryFetch() {
      this.errorMessage = null;
      await this.fetchCategories();
    },
    async fetchCategories() {
      this.loadingCategories = true;
      try {
        console.log('Fetching categories...', { page: this.currentPage, perPage: this.perPage, search: this.searchQuery });
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            params: {
              page: this.currentPage || 1,
              per_page: this.perPage || 10,
              search: this.searchQuery || undefined,
            },
          })
        );
        if (response && response.status === 200) {
          this.categories = response.data.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            // Ensure created_at is a string, providing 'N/A' as a fallback if the backend field is missing (though the API should ideally provide it).
            created_at: item.created_at ? format(new Date(item.created_at), 'd MMMM yyyy') : 'N/A',
          })) as Category[]; // Explicitly cast to Category[] to satisfy the required 'created_at' field.
          this.currentPage = response.data.pagination.current_page || 1;
          this.perPage = response.data.pagination.per_page || 10;
          this.totalItems = response.data.pagination.total || 0;
          console.log('Fetch categories response:', response.data);
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No categories found. Add some categories to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch categories.');
        }
      } catch (error: any) {
        console.error('Failed to fetch categories after retries');
        let errorMessage = 'Failed to fetch categories.';
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
        this.loadingCategories = false;
      }
    },
    async addCategory(payload: { name: string }) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
        method: 'post',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
        data: payload,
      });
    },
    async updateCategory(id: number, payload: { name: string }) {
      return await makeRequest({
        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories/${id}`,
        method: 'put',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
        data: payload,
      });
    },
    async deleteCategory(id: number) {
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
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories/${id}`,
            method: 'delete',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
          });
          if (response.status === 200 || response.status === 204) {
            Swal.fire({
              title: 'Success!',
              text: 'Category deleted successfully.',
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
            this.componentKey += 1;
            await this.fetchCategories();
          } else {
            throw new Error(response.data?.message || 'Unexpected response status');
          }
        } catch (err: any) {
          console.error('Delete error:', err.response || err);
          let errorMessage = err.response?.data?.message || 'Failed to delete category.';
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
        }
      }
    },
    async handleSearch() {
      console.log('Search query:', this.searchQuery);
      this.currentPage = 1;
      await this.fetchCategories();
    },
    clearSearch() {
      this.searchQuery = '';
      this.currentPage = 1;
      this.fetchCategories();
    },
    handlePageChange(page: number) {
      this.currentPage = page || 1;
      this.fetchCategories();
    },
    handlePerPageChange(perPage: number) {
      this.perPage = perPage || 10;
      this.currentPage = 1;
      this.fetchCategories();
    },
    openForm(category: Category | null = null, mode: 'add' | 'edit' = 'add') {
      // When opening for edit, we must ensure the object passed has all required properties.
      // Since the Categories array has been mapped to include 'created_at' as a string,
      // it should conform to the updated Category interface.
      this.selectedCategory = category ? { ...category } : null; 
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedCategory = null;
      this.addEditForm = false;
      this.formMode = 'add';
    },
    cancelAdding() {
      this.closeForm();
      this.fetchCategories();
    },
    async handleSubmitSuccess(payload: { name: string }, mode: 'add' | 'edit') {
      if (this.submitting) {
        console.log('handleSubmitSuccess blocked: Already submitting');
        return;
      }
      this.submitting = true;
      try {
        console.log('handleSubmitSuccess called with:', { payload, mode });
        let response;
        if (mode === 'add') {
          response = await this.addCategory(payload);
        } else {
          if (!this.selectedCategory) {
            throw new Error('No category selected for update');
          }
          response = await this.updateCategory(this.selectedCategory.id, payload);
        }
        if (response.status === 201 || response.status === 200) {
          this.closeForm();
          this.componentKey += 1;
          await this.fetchCategories();
          Swal.fire({
            title: 'Success!',
            text: mode === 'add' ? 'Category added successfully.' : 'Category updated successfully.',
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
          err.response?.data?.message || (mode === 'add' ? 'Failed to add category.' : 'Failed to update category.');
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
    min-width: 400px;
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
      min-width: 300px;
    }

    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.25rem;
    }

    :deep(.va-data-table__table-th[data-key="created_at"]),
    :deep(.va-data-table__table-td[data-key="created_at"]) {
      display: none; /* Hide Created At column on mobile */
    }

    :deep(.va-data-table__table-th[data-key="sn"]),
    :deep(.va-data-table__table-td[data-key="sn"]) {
      min-width: 40px;
    }

    :deep(.va-data-table__table-th[data-key="name"]),
    :deep(.va-data-table__table-td[data-key="name"]) {
      min-width: 120px;
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
      min-width: 250px;
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