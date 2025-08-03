<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput v-model="searchQuery" placeholder="Search by category name" class="w-64" @input="debouncedSearch" />
      </div>
      <div>
        <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          @click="openForm(null, 'add')"
        >
          Add Category
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable :key="componentKey" :items="categories" striped :columns="columns" :loading="loadingCategories">
        <template #cell(sn)="{ rowIndex }">
          {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="deleteCategory(rowData.id)" />
        </template>
      </VaDataTable>
      <VaPagination
        v-model="pagination.current_page"
        :pages="pagination.last_page || 1"
        :per-page="pagination.per_page || 10"
        :visible-pages="5"
        class="mt-4"
        @update:modelValue="fetchCategories"
      />
    </template>
    <template v-else>
      <CategoryForm
        :category="selectedCategory"
        :form-mode="formMode"
        @close="closeForm"
        @submit="handleSubmitSuccess"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useCategoryStore, Category, Pagination } from '../../../../stores/categoryStore';
import CategoryForm from './CategoryForm.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';

export default defineComponent({
  name: 'CategoryList',
  components: {
    CategoryForm,
  },
  setup() {
    const categoryStore = useCategoryStore();
    return { categoryStore };
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Category Name' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      selectedCategory: null as Category | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      submitting: false,
      searchQuery: '' as string,
      debouncedSearch: (() => {}) as () => void,
    };
  },
  computed: {
    categories(): Category[] {
      console.log('Computed categories:', this.categoryStore.categories);
      return this.categoryStore.categories;
    },
    loadingCategories(): boolean {
      return this.categoryStore.loadingCategories;
    },
    pagination(): Pagination {
      return {
        current_page: this.categoryStore.pagination.current_page || 1,
        per_page: this.categoryStore.pagination.per_page || 10,
        last_page: this.categoryStore.pagination.last_page || 1,
        total: this.categoryStore.pagination.total || 0,
      };
    },
  },
  created() {
    this.debouncedSearch = debounce(this.fetchCategories, 500) as () => void;
  },
  mounted() {
    this.fetchCategories();
  },
  methods: {
    async fetchCategories() {
      const params = {
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery || undefined,
      };
      console.log('Fetching categories with params:', params);
      await this.categoryStore.getCategories(params);
      this.componentKey += 1;
      console.log('Categories after fetch:', this.categoryStore.categories);
    },
    openForm(category: Category | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedCategory = category;
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
          response = await this.categoryStore.addCategory(payload);
        } else {
          if (!this.selectedCategory) {
            throw new Error('No category selected for update');
          }
          response = await this.categoryStore.updateCategory(this.selectedCategory.id, payload);
        }
        // Check if response is defined and has a status
        if (!response) {
          throw new Error('No response received from the server');
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
          throw new Error(response.message || 'Unexpected response status');
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
          const response = await this.categoryStore.deleteCategory(id);
          if (!response) {
            throw new Error('No response received from the server');
          }
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
            throw new Error(response.message || 'Unexpected response status');
          }
        } catch (err: any) {
          console.error('Delete error:', err.response || err);
          Swal.fire({
            title: 'Error!',
            text: err.response?.data?.message || 'Failed to delete category.',
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

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-6 {
  padding: 1.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.w-64 {
  width: 16rem;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
</style>