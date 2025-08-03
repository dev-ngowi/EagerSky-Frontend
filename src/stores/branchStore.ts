import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useBranchStore = defineStore('branch', {
  state: () => ({
    loadingBranches: false,
    branches: [] as any[],
    addingBranch: false,
    editingBranch: false,
    addedBranch: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  }),

  actions: {
    async getBranches(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingBranches = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
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
        console.log('getBranches response:', response)
        if (response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            id: branch.id,
            name: branch.name,
            address: branch.address,
            users_count: branch.users_count || 0,
            properties_count: branch.properties_count || 0,
            created_at: format(new Date(branch.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(branch.updated_at), 'd MMMM yyyy'),
            deleted_at: branch.deleted_at ? format(new Date(branch.deleted_at), 'd MMMM yyyy') : null,
            users: branch.users || [],
            properties: branch.properties || [],
          }))
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          }
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No branches found. Add some branches to get started.',
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
            text: response.data?.message || 'Failed to fetch branches.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getBranches error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch branches.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingBranches = false
      }
    },

    async addBranch(payload: any) {
      this.addingBranch = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('addBranch response:', response)
        if (response.status === 201) {
          this.addedBranch = response.data.data
          return response
        }
        return response
      } catch (error: any) {
        console.error('addBranch error:', error.message, error.response?.data)
        throw error
      } finally {
        this.addingBranch = false
      }
    },

    async updateBranch(payload: any) {
      this.editingBranch = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('updateBranch response:', response)
        if (response.status === 200) {
          return response
        }
        return response
      } catch (error: any) {
        console.error('updateBranch error:', error.message, error.response?.data)
        throw error
      } finally {
        this.editingBranch = false
      }
    },

    async deleteBranch(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteBranch response:', response)
        return response
      } catch (error: any) {
        console.error('deleteBranch error:', error.message, error.response?.data)
        throw error
      }
    },
  },
})
