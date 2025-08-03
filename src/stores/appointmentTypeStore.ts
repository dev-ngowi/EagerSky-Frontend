import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useAppointmentTypeStore = defineStore('appointmentType', {
  state: () => ({
    loadingAppointmentTypes: false,
    appointmentTypes: [] as any[],
    addingAppointmentType: false,
    editingAppointmentType: false,
    addedAppointmentType: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  }),

  actions: {
    async getAppointmentTypes(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingAppointmentTypes = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types`,
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
        console.log('getAppointmentTypes response:', response)
        if (response.status === 200) {
          this.appointmentTypes = response.data.data.map((appointmentType: any) => ({
            id: appointmentType.id,
            name: appointmentType.name,
            created_at: format(new Date(appointmentType.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(appointmentType.updated_at), 'd MMMM yyyy'),
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
              text: 'No appointment types found. Add some appointment types to get started.',
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
            text: response.data?.message || 'Failed to fetch appointment types.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getAppointmentTypes error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch appointment types.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingAppointmentTypes = false
      }
    },

    async addAppointmentType(payload: any) {
      this.addingAppointmentType = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('addAppointmentType response:', response)
        if (response.status === 201) {
          this.addedAppointmentType = response.data.data
          await this.getAppointmentTypes({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Appointment type added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addAppointmentType error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add appointment type.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingAppointmentType = false
      }
    },

    async updateAppointmentType(payload: any) {
      this.editingAppointmentType = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('updateAppointmentType response:', response)
        if (response.status === 200) {
          await this.getAppointmentTypes({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Appointment type updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateAppointmentType error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update appointment type.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingAppointmentType = false
      }
    },

    async deleteAppointmentType(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/appointment-types/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteAppointmentType response:', response)
        if (response.status === 200) {
          await this.getAppointmentTypes({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Appointment type deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteAppointmentType error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete appointment type.',
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
