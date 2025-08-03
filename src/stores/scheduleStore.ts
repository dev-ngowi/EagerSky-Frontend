import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    loadingSchedules: false,
    schedules: [] as any[],
    addingSchedule: false,
    editingSchedule: false,
    addedSchedule: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  }),

  actions: {
    async getSchedules(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingSchedules = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/schedules`,
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
        console.log('getSchedules response:', response)
        if (response.status === 200) {
          this.schedules = response.data.data.map((schedule: any) => ({
            id: schedule.id,
            agent_id: schedule.agent_id,
            agent_name: schedule.agent_name || 'None',
            property_id: schedule.property_id,
            property_title: schedule.property_title || 'None',
            start_time: format(new Date(schedule.start_time), 'd MMMM yyyy HH:mm'),
            end_time: format(new Date(schedule.end_time), 'd MMMM yyyy HH:mm'),
            status: schedule.status,
            notes: schedule.notes || 'None',
            created_at: format(new Date(schedule.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(schedule.updated_at), 'd MMMM yyyy'),
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
              text: 'No schedules found. Add some schedules to get started.',
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
            text: response.data?.message || 'Failed to fetch schedules.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getSchedules error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch schedules.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingSchedules = false
      }
    },

    async addSchedule(payload: any) {
      this.addingSchedule = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/schedules`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('addSchedule response:', response)
        if (response.status === 201) {
          this.addedSchedule = response.data.data
          await this.getSchedules({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Schedule added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addSchedule error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add schedule.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingSchedule = false
      }
    },

    async updateSchedule(payload: any) {
      this.editingSchedule = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/schedules/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })
        console.log('updateSchedule response:', response)
        if (response.status === 200) {
          await this.getSchedules({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Schedule updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateSchedule error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update schedule.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingSchedule = false
      }
    },

    async deleteSchedule(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/schedules/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('deleteSchedule response:', response)
        if (response.status === 200) {
          await this.getSchedules({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Schedule deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteSchedule error:', error.message, error.response?.data)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete schedule.',
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
