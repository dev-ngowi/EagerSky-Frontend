import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import Swal from 'sweetalert2'

export const useRoleStore = defineStore('role', {
  state: () => ({
    loadingRoles: false,
    roles: [] as any[],
    addingRole: false,
    editingRole: false,
    addedRole: null as any,
  }),

  actions: {
    async getRoles(params = {}) {
      this.loadingRoles = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        })
        console.log('getRoles response:', response)
        if (response.status === 200) {
          this.roles = response.data.data.roles.map((role: any) => ({
            id: role.id,
            name: role.name,
            description: role.description || 'N/A',
            created_at: role.created_at
              ? new Date(role.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'N/A',
            updated_at: role.updated_at
              ? new Date(role.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'N/A',
          }))
          if (response.data.data.roles.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No roles found. Add some roles to get started.',
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
            text: response.data?.message || 'Failed to fetch roles.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getRoles error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch roles.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingRoles = false
      }
    },

    async addRole(payload: any) {
      this.addingRole = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        console.log('addRole response:', response)
        if (response.status === 201) {
          this.addedRole = response.data.data.role
          await this.getRoles()
          Swal.fire({
            title: 'Success!',
            text: 'Role added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addRole error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add role.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingRole = false
      }
    },

    async updateRole(payload: any, id: number) {
      this.editingRole = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
          data: payload,
        })
        console.log('updateRole response:', response)
        if (response.status === 200) {
          await this.getRoles()
          Swal.fire({
            title: 'Success!',
            text: 'Role updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateRole error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update role.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingRole = false
      }
    },

    async deleteRole(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })
        console.log('deleteRole response:', response)
        if (response.status === 200) {
          await this.getRoles()
          Swal.fire({
            title: 'Success!',
            text: 'Role deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteRole error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete role.',
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
