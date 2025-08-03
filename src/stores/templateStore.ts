import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'
import type { Template, Payload } from '../types/template'

export const useTemplateStore = defineStore('template', {
  state: () => ({
    loadingTemplates: false,
    templates: [] as Template[],
    addingTemplate: false,
    editingTemplate: false,
    addedTemplate: null as Template | null,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    searchQuery: '' as string,
  }),

  actions: {
    async getTemplates(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingTemplates = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates`,
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
        if (response.status === 200) {
          this.templates = response.data.data.map((template: any) => ({
            id: template.id,
            name: template.name || 'N/A',
            content: template.content || 'N/A',
            created_at: template.created_at ? format(new Date(template.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: template.updated_at ? format(new Date(template.updated_at), 'd MMMM yyyy') : 'N/A',
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
              text: 'No templates found. Add some templates to get started.',
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
            text: response.data?.message || 'Failed to fetch templates.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getTemplates error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch templates.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.response?.data?.message || error.message }
      } finally {
        this.loadingTemplates = false
      }
    },

    async addTemplate(payload: Payload) {
      this.addingTemplate = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        if (response.status === 201) {
          this.addedTemplate = {
            id: response.data.data.id,
            name: response.data.data.name,
            content: response.data.data.content,
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
          }
          await this.getTemplates({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Template added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addTemplate error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to add template.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingTemplate = false
      }
    },

    async updateTemplate(payload: Payload, id: number) {
      this.editingTemplate = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        if (response.status === 200) {
          await this.getTemplates({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Template updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateTemplate error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to update template.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingTemplate = false
      }
    },

    async deleteTemplate(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        if (response.status === 200 || response.status === 204) {
          await this.getTemplates({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Template deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteTemplate error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to delete template.',
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