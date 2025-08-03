import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const usePropertyFeatureStore = defineStore('propertyFeature', {
  state: () => ({
    loadingPropertyFeatures: false,
    propertyFeatures: [] as any[],
    addingPropertyFeature: false,
    editingPropertyFeature: false,
    addedPropertyFeature: null as any,
  }),

  actions: {
    async getPropertyFeatures() {
      this.loadingPropertyFeatures = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })
        console.log('getPropertyFeatures response:', response)
        if (response.status === 200) {
          this.propertyFeatures = response.data.data.map((feature: any) => ({
            id: feature.id,
            property_id: feature.property_id,
            property_title: feature.property_title || 'None',
            feature_name: feature.feature_name,
            value: feature.value,
            created_at: format(new Date(feature.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(feature.updated_at), 'd MMMM yyyy'),
          }))
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No property features found. Add some features to get started.',
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
            text: response.data?.message || 'Failed to fetch property features.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getPropertyFeatures error:', error.message, { response: error.response?.data })
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.message || 'Failed to fetch property features.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingPropertyFeatures = false
      }
    },

    async addPropertyFeature(payload: any) {
      this.addingPropertyFeature = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        })
        console.log('addPropertyFeature response:', response)
        if (response.status === 201) {
          this.addedPropertyFeature = response.data.data
          await this.getPropertyFeatures()
          Swal.fire({
            title: 'Success!',
            text: 'Property feature added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addPropertyFeature error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to add property feature.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingPropertyFeature = false
      }
    },

    async updatePropertyFeature(payload: any) {
      this.editingPropertyFeature = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        })
        console.log('updatePropertyFeature response:', response)
        if (response.status === 200) {
          await this.getPropertyFeatures()
          Swal.fire({
            title: 'Success!',
            text: 'Property feature updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updatePropertyFeature error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to update property feature.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingPropertyFeature = false
      }
    },

    async deletePropertyFeature(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })
        console.log('deletePropertyFeature response:', response)
        if (response.status === 200) {
          await this.getPropertyFeatures()
          Swal.fire({
            title: 'Success!',
            text: 'Property feature deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deletePropertyFeature error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to delete property feature.',
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
