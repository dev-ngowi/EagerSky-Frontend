import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useMaintenanceRequestStore = defineStore('maintenanceRequest', {
  state: () => ({
    loadingMaintenanceRequests: false,
    maintenanceRequests: [] as any[],
    addingMaintenanceRequest: false,
    editingMaintenanceRequest: false,
    addedMaintenanceRequest: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    properties: [] as { value: number; text: string }[],
    clients: [] as { value: number; text: string }[],
    contractors: [] as { value: number | null; text: string }[],
    loadingOptions: false,
  }),

  actions: {
    async getMaintenanceRequests(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingMaintenanceRequests = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests`,
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
        console.log('getMaintenanceRequests response:', response)
        if (response.status === 200) {
          this.maintenanceRequests = response.data.data.map((request: any) => ({
            id: request.id,
            property_id: request.property_id,
            property_title: request.property_title || 'N/A',
            client_id: request.client_id || 'Restricted',
            client_name: request.client_name || 'Restricted',
            contractor_id: request.contractor_id || null,
            contractor_name: request.contractor_name || 'N/A',
            description: request.description || 'Restricted',
            status: request.status,
            created_at: format(new Date(request.created_at), 'd MMMM yyyy'),
            updated_at: request.updated_at ? format(new Date(request.updated_at), 'd MMMM yyyy') : 'N/A',
            deleted_at: request.deleted_at ? format(new Date(request.deleted_at), 'd MMMM yyyy') : 'N/A',
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
              text: 'No maintenance requests found. Add some requests to get started.',
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
            text: response.data?.message || 'Failed to fetch maintenance requests.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getMaintenanceRequests error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch maintenance requests.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingMaintenanceRequests = false
      }
    },

    async addMaintenanceRequest(payload: any) {
      this.addingMaintenanceRequest = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('addMaintenanceRequest response:', response)
        if (response.status === 201) {
          this.addedMaintenanceRequest = response.data.data
          await this.getMaintenanceRequests({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Maintenance request added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addMaintenanceRequest error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add maintenance request.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingMaintenanceRequest = false
      }
    },

    async updateMaintenanceRequest(payload: any) {
      this.editingMaintenanceRequest = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('updateMaintenanceRequest response:', response)
        if (response.status === 200) {
          await this.getMaintenanceRequests({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Maintenance request updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateMaintenanceRequest error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update maintenance request.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingMaintenanceRequest = false
      }
    },

    async deleteMaintenanceRequest(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/maintenance-requests/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteMaintenanceRequest response:', response)
        if (response.status === 200) {
          await this.getMaintenanceRequests({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Maintenance request deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteMaintenanceRequest error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete maintenance request.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      }
    },

    async fetchProperties() {
      this.loadingOptions = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('fetchProperties response:', response)
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || 'N/A',
          }))
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No properties found. Please add properties first.',
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
            text: response.data?.message || 'Failed to fetch properties.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('fetchProperties error:', error.response?.data || error)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingOptions = false
      }
    },

    async fetchClients() {
      this.loadingOptions = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('fetchClients response:', response)
        if (response.status === 200) {
          this.clients = response.data.data.map((client: any) => ({
            value: client.id,
            text: client.name || 'N/A',
          }))
          if (this.clients.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No clients found. Please add clients first.',
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
            text: response.data?.message || 'Failed to fetch clients.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('fetchClients error:', error.response?.data || error)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch clients.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingOptions = false
      }
    },

    async fetchContractors() {
      this.loadingOptions = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/contractors`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('fetchContractors response:', response)
        if (response.status === 200) {
          this.contractors = [
            { value: null, text: 'None' },
            ...response.data.data.map((contractor: any) => ({
              value: contractor.id,
              text: contractor.name || 'N/A',
            })),
          ]
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No contractors found. You can still proceed without selecting a contractor.',
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
            text: response.data?.message || 'Failed to fetch contractors.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('fetchContractors error:', error.response?.data || error)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch contractors.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingOptions = false
      }
    },
  },
})
