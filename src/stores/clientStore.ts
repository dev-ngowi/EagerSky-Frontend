import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useClientStore = defineStore('client', {
  state: () => ({
    loadingClients: false,
    clients: [] as any[],
    addingClient: false,
    editingClient: false,
    addedClient: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  }),

  actions: {
    async getClients(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingClients = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
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
        console.log('getClients response:', response)
        if (response.status === 200) {
          this.clients = response.data.data.map((client: any) => ({
            id: client.id,
            name: client.name,
            email: client.email || 'Restricted',
            phone: client.phone || 'Restricted',
            type: client.type,
            bookings_count: client.bookings_count,
            leads_count: client.leads_count,
            transactions_count: client.transactions_count,
            leases_count: client.leases_count,
            maintenance_requests_count: client.maintenance_requests_count,
            rental_applications_count: client.rental_applications_count,
            created_at: format(new Date(client.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(client.updated_at), 'd MMMM yyyy'),
            deleted_at: client.deleted_at ? format(new Date(client.deleted_at), 'd MMMM yyyy') : null,
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
              text: 'No clients found. Add some clients to get started.',
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
        return response
      } catch (error: any) {
        console.error('getClients error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch clients.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingClients = false
      }
    },

    async addClient(payload: any) {
      this.addingClient = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('addClient response:', response)
        if (response.status === 201) {
          this.addedClient = response.data.data
          await this.getClients({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Client added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addClient error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add client.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingClient = false
      }
    },

    async updateClient(payload: any) {
      this.editingClient = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('updateClient response:', response)
        if (response.status === 200) {
          await this.getClients({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Client updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateClient error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update client.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingClient = false
      }
    },

    async deleteClient(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteClient response:', response)
        if (response.status === 200) {
          await this.getClients({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Client deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteClient error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete client.',
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
