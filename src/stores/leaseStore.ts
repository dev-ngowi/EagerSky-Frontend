import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useLeaseStore = defineStore('lease', {
  state: () => ({
    loadingLeases: false,
    leases: [] as any[],
    addingLease: false,
    editingLease: false,
    addedLease: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    searchQuery: '' as string,
    properties: [] as { value: number; text: string }[],
    clients: [] as { value: number; text: string }[],
    loadingProperties: false,
    loadingClients: false,
  }),

  actions: {
    async getLeases(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingLeases = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases`,
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
        console.log('getLeases response:', response)
        if (response.status === 200) {
          this.leases = response.data.data.map((lease: any) => ({
            id: lease.id,
            property_id: lease.property_id,
            property_title: lease.property_title || 'N/A',
            client_id: lease.client_id || 'Restricted',
            client_name: lease.client_name || 'Restricted',
            start_date: lease.start_date ? format(new Date(lease.start_date), 'd MMMM yyyy') : 'N/A',
            end_date: lease.end_date ? format(new Date(lease.end_date), 'd MMMM yyyy') : 'N/A',
            rent_amount: lease.rent_amount !== null ? lease.rent_amount : 'N/A',
            terms: lease.terms || 'N/A',
            is_signed: lease.is_signed !== null ? lease.is_signed : false,
            created_at: lease.created_at ? format(new Date(lease.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: lease.updated_at ? format(new Date(lease.updated_at), 'd MMMM yyyy') : 'N/A',
            deleted_at: lease.deleted_at ? format(new Date(lease.deleted_at), 'd MMMM yyyy') : null,
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
              text: 'No leases found. Add some leases to get started.',
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
            text: response.data?.message || 'Failed to fetch leases.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: unknown) {
        const err = error as any
        console.error('getLeases error:', err.response?.data || err.message)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || err.message || 'Failed to fetch leases.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: err.response?.data?.message || err.message }
      } finally {
        this.loadingLeases = false
      }
    },

    async getProperties() {
      this.loadingProperties = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        })
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }))
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No properties found. Please add properties first.',
              icon: 'warning',
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
      } catch (error: unknown) {
        const err = error as any
        console.error('getProperties error:', err.response?.data || err.message)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingProperties = false
      }
    },

    async getClients() {
      this.loadingClients = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        })
        if (response.status === 200) {
          this.clients = response.data.data.map((client: any) => ({
            value: client.id,
            text: client.name || `Client ${client.id}`,
          }))
          if (this.clients.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No clients found. Please add clients first.',
              icon: 'warning',
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
      } catch (error: unknown) {
        const err = error as any
        console.error('getClients error:', err.response?.data || err.message)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to fetch clients.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingClients = false
      }
    },

    async addLease(payload: any) {
      this.addingLease = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        console.log('addLease response:', response)
        if (response.status === 201) {
          this.addedLease = {
            ...response.data.data,
            start_date: response.data.data.start_date
              ? format(new Date(response.data.data.start_date), 'd MMMM yyyy')
              : 'N/A',
            end_date: response.data.data.end_date
              ? format(new Date(response.data.data.end_date), 'd MMMM yyyy')
              : 'N/A',
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
          }
          await this.getLeases({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Lease added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: unknown) {
        const err = error as any
        console.error('addLease error:', err.response?.data || err.message)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || err.message || 'Failed to add lease.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw err
      } finally {
        this.addingLease = false
      }
    },

    async updateLease(payload: any, id: number) {
      this.editingLease = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        console.log('updateLease response:', response)
        if (response.status === 200) {
          await this.getLeases({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Lease updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: unknown) {
        const err = error as any
        console.error('updateLease error:', err.response?.data || err.message)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || err.message || 'Failed to update lease.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw err
      } finally {
        this.editingLease = false
      }
    },

    async deleteLease(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteLease response:', response)
        if (response.status === 200) {
          await this.getLeases({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          Swal.fire({
            title: 'Success!',
            text: 'Lease deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: unknown) {
        const err = error as any
        console.error('deleteLease error:', err.response?.data || err.message)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || err.message || 'Failed to delete lease.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw err
      }
    },
  },
})