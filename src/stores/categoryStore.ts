import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import Swal from 'sweetalert2';

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  last_page: number;
  total?: number;
}

interface State {
  categories: Category[];
  loadingCategories: boolean;
  pagination: Pagination;
  addingCategory: boolean;
  editingCategory: boolean;
  deletingCategory: boolean;
}

export interface ApiResponse {
  status: number;
  data: any;
  message?: string;
}

export const useCategoryStore = defineStore('category', {
  state: (): State => ({
    categories: [],
    loadingCategories: false,
    pagination: {
      current_page: 1,
      per_page: 10,
      last_page: 1,
      total: 0,
    },
    addingCategory: false,
    editingCategory: false,
    deletingCategory: false,
  }),
  actions: {
    handleError(error: any, defaultMessage: string): ApiResponse {
      const status = error.response?.status;
      let text = error.response?.data?.message || defaultMessage;

      if (status === 403) {
        text = 'You do not have permission to perform this action.';
      } else if (status === 404) {
        text = 'API endpoint not found. Please check the server configuration or URL.';
      } else if (status === 422) {
        const errors = error.response?.data?.errors;
        text = errors ? Object.values(errors).flat().join(' ') : 'Validation failed.';
      } else if (status === 400 && text.includes('Cannot delete category')) {
        text = 'Cannot delete category because it is associated with properties.';
      }

      console.error('Error details:', error.response?.data || error.message);

      Swal.fire({
        title: 'Error!',
        text,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 5000,
      });

      return { status: status || 500, data: null, message: text };
    },

    async getCategories(params: { page?: number; per_page?: number; search?: string } = {}): Promise<ApiResponse> {
      if (this.loadingCategories) {
        console.log('getCategories blocked: Already fetching');
        return { status: 429, data: null, message: 'Already fetching categories' };
      }
      this.loadingCategories = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params,
        });
        console.log('getCategories response:', response);
        if (response.status === 200) {
          this.categories = response.data.data.map((category: any) => ({
            id: category.id,
            name: category.name,
            created_at: category.created_at
              ? new Date(category.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'N/A',
          }));
          this.pagination = {
            current_page: response.data.current_page,
            per_page: response.data.per_page,
            last_page: response.data.last_page,
            total: response.data.total,
          };
          console.log('Updated categories:', this.categories);
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
        }
        return response;
      } catch (error: any) {
        return this.handleError(error, 'Failed to fetch categories.');
      } finally {
        this.loadingCategories = false;
      }
    },

    async addCategory(payload: { name: string }): Promise<ApiResponse> {
      if (this.addingCategory) {
        console.log('addCategory blocked: Already adding');
        return { status: 429, data: null, message: 'Already adding a category' };
      }
      this.addingCategory = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: payload,
        });
        console.log('addCategory response:', response);
        if (response.status === 201) {
          this.categories.unshift({
            id: response.data.id,
            name: response.data.name,
            created_at: response.data.created_at
              ? new Date(response.data.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'N/A',
          });
          this.pagination.total = (this.pagination.total || 0) + 1;
          this.pagination.last_page = Math.ceil(this.pagination.total / this.pagination.per_page);
          console.log('Categories after add:', this.categories);
        }
        return response;
      } catch (error: any) {
        this.handleError(error, 'Failed to add category.');
        throw error;
      } finally {
        this.addingCategory = false;
      }
    },

    async updateCategory(id: number, payload: { name: string }): Promise<ApiResponse> {
      if (this.editingCategory) {
        console.log('updateCategory blocked: Already editing');
        return { status: 429, data: null, message: 'Already editing a category' };
      }
      this.editingCategory = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: payload,
        });
        console.log('updateCategory response:', response);
        if (response.status === 200) {
          const index = this.categories.findIndex(category => category.id === id);
          if (index !== -1) {
            this.categories[index] = {
              id: response.data.id,
              name: response.data.name,
              created_at: response.data.created_at
                ? new Date(response.data.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'N/A',
            };
            console.log('Categories after update:', this.categories);
          }
        }
        return response;
      } catch (error: any) {
        this.handleError(error, 'Failed to update category.');
        throw error;
      } finally {
        this.editingCategory = false;
      }
    },

    async deleteCategory(id: number): Promise<ApiResponse> {
      if (this.deletingCategory) {
        console.log('deleteCategory blocked: Already deleting');
        return { status: 429, data: null, message: 'Already deleting a category' };
      }
      this.deletingCategory = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteCategory response:', response);
        if (response.status === 200 || response.status === 204) {
          this.categories = this.categories.filter(category => category.id !== id);
          this.pagination.total = (this.pagination.total || 1) - 1;
          this.pagination.last_page = Math.ceil(this.pagination.total / this.pagination.per_page);
          console.log('Categories after delete:', this.categories);
        }
        return response;
      } catch (error: any) {
        this.handleError(error, 'Failed to delete category.');
        throw error;
      } finally {
        this.deletingCategory = false;
      }
    },
  },
});