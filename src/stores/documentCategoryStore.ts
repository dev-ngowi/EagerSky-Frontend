import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useDocumentCategoryStore = defineStore('documentCategory', {
  state: () => ({
    loadingDocumentCategories: false,
    documentCategories: [] as any[],
    addingDocumentCategory: false,
    editingDocumentCategory: false,
    addedDocumentCategory: null as any,
    searchQuery: '' as string,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  }),

  actions: {
    async getDocumentCategories(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingDocumentCategories = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-categories`,
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
        })
        console.log('getDocumentCategories response:', response)
        if (response.status === 200) {
          this.documentCategories = response.data.data.map((category: any) => ({
            id: category.id,
            name: category.name || 'N/A',
            created_at: category.created_at ? format(new Date(category.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: category.updated_at ? format(new Date(category.updated_at), 'd MMMM yyyy') : 'N/A',
          }))
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          }
          this.searchQuery = params.search || this.searchQuery
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No document categories found. Add some categories to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            })
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch document categories.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getDocumentCategories error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch document categories.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.response?.data?.message || error.message }
      } finally {
        this.loadingDocumentCategories = false
      }
    },

    async addDocumentCategory(payload: any) {
      this.addingDocumentCategory = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-categories`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        console.log('addDocumentCategory response:', response)
        if (response.status === 201) {
          this.addedDocumentCategory = {
            ...response.data.data,
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
          }
          await this.getDocumentCategories({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Document category added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addDocumentCategory error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to add document category.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingDocumentCategory = false
      }
    },

    async updateDocumentCategory(payload: any, id: number) {
      this.editingDocumentCategory = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-categories/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        console.log('updateDocumentCategory response:', response)
        if (response.status === 200) {
          await this.getDocumentCategories({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Document category updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateDocumentCategory error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to update document category.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingDocumentCategory = false
      }
    },

    async deleteDocumentCategory(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-categories/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteDocumentCategory response:', response)
        if (response.status === 200) {
          await this.getDocumentCategories({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Document category deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteDocumentCategory error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to delete document category.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      }
    },
  },
})
