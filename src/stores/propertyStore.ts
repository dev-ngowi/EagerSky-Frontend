import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import Swal from 'sweetalert2'

interface Location {
  id: number
  street: string | null
  city: string | null
  country: string | null
}

interface Category {
  id: number
  name: string
}

interface Branch {
  id: number
  name: string
}

interface Property {
  id: number
  title: string
  description: string | null
  category_id: number | null
  location_id: number | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  year_built: number | null
  status: string | null
  list_date: string | null
  user: string | null
  branch_id: number | null
  is_featured: boolean
  created_at: string | null
}

interface Pagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export const usePropertyStore = defineStore('property', {
  state: () => ({
    loadingProperties: false,
    properties: [] as Property[],
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    } as Pagination,
    categories: [] as Category[],
    locations: [] as Location[],
    branches: [] as Branch[],
    addingProperty: false,
    editingProperty: false,
    deletingProperty: false,
  }),

  actions: {
    async getProperties(
      params: {
        page?: number
        per_page?: number
        search?: string
        category_id?: number
        status?: string
        min_price?: number
        max_price?: number
      } = {},
    ) {
      this.loadingProperties = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          params,
        })
        console.log('getProperties response:', response)
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            id: property.id,
            title: property.title,
            description: property.description || 'N/A',
            category: property.category?.name || 'N/A',
            category_id: property.category_id || null,
            location: property.location
              ? `${property.location.street || 'N/A'}, ${property.location.city || 'N/A'}, ${property.location.country || 'N/A'}`
              : 'N/A',
            location_id: property.location_id || null,
            price: property.price ? `TZS ${property.price.toLocaleString()}` : 'N/A',
            bedrooms: property.bedrooms ?? 'N/A',
            bathrooms: property.bathrooms ?? 'N/A',
            area_sqft: property.area_sqft ? `${property.area_sqft} sqft` : 'N/A',
            year_built: property.year_built ?? 'N/A',
            status: property.status || 'N/A',
            list_date: property.list_date
              ? new Date(property.list_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'N/A',
            user: property.user?.name || 'N/A',
            branch: property.branch?.name || 'N/A',
            branch_id: property.team_id || null,
            is_featured: property.is_featured ? 'Yes' : 'No',
            created_at: property.created_at
              ? new Date(property.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'N/A',
          }))
          this.pagination = response.data.pagination
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No properties found. Add some properties to get started.',
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
        return response
      } catch (error: any) {
        console.error('getProperties error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message }
      } finally {
        this.loadingProperties = false
      }
    },

    // Updated getProperty method for your property store
async getProperty(id: number) {
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${id}`,
      method: 'get',
    })

    console.log('getProperty response:', response)

    if (response.status === 200) {
      // Return the raw property data without transformation for editing
      const rawProperty = response.data.data;
      
      // Ensure the property has the correct structure
      const property = {
        id: rawProperty.id,
        title: rawProperty.title,
        description: rawProperty.description,
        category_id: rawProperty.category_id,
        location_id: rawProperty.location_id,
        price: rawProperty.price,
        bedrooms: rawProperty.bedrooms,
        bathrooms: rawProperty.bathrooms,
        area_sqft: rawProperty.area_sqft,
        year_built: rawProperty.year_built,
        status: rawProperty.status,
        list_date: rawProperty.list_date,
        branch_id: rawProperty.branch_id || rawProperty.team_id, // Handle both field names
        is_featured: rawProperty.is_featured,
        user: rawProperty.user?.name || null,
        created_at: rawProperty.created_at,
      };

      return {
        ...response,
        data: {
          ...response.data,
          data: property
        }
      };
    } else {
      Swal.fire({
        title: 'Error!',
        text: response.data?.message || 'Failed to fetch property.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      })
    }

    return response
  } catch (error: any) {
    console.error('getProperty error:', error.response?.data || error.message)
    Swal.fire({
      title: 'Error!',
      text: error.response?.data?.message || 'Failed to fetch property.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
    })
    return { status: 'error', message: error.message }
  }
},

    async getCategories() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
        })
        console.log('getCategories response:', response)
        if (response.status === 200) {
          this.categories = response.data.data.map((category: any) => ({
            id: category.id,
            name: category.name || `Category ${category.id}`,
          }))
          console.log('Categories after mapping:', this.categories)
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch property categories.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('getCategories error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch property categories.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      }
    },

    async getLocations() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
        })
        console.log('getLocations response:', response)
        if (response.status === 200) {
          this.locations = response.data.data.map((location: any) => ({
            id: location.id,
            street: location.street || null,
            city: location.city || null,
            country: location.country || null,
          }))
          console.log('Locations after mapping:', this.locations)
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch locations.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('getLocations error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch locations.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      }
    },

    async getBranches() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'get',
        })
        console.log('getBranches response:', response)
        if (response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            id: branch.id,
            name: branch.name || `Branch ${branch.id}`,
          }))
          console.log('Branches after mapping:', this.branches)
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
      } catch (error: any) {
        console.error('getBranches error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch branches.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      }
    },

    async addProperty(payload: any) {
      this.addingProperty = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        })
        console.log('addProperty response:', response)
        if (response.status === 201) {
          await this.getProperties({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Property added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('addProperty error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add property.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.addingProperty = false
      }
    },

    async updateProperty(id: number, payload: any) {
      this.editingProperty = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${id}`,
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        })
        console.log('updateProperty response:', response)
        if (response.status === 200) {
          await this.getProperties({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Property updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('updateProperty error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update property.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.editingProperty = false
      }
    },

    async deleteProperty(id: number) {
      this.deletingProperty = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })
        console.log('deleteProperty response:', response)
        if (response.status === 200) {
          await this.getProperties({ page: this.pagination.current_page, per_page: this.pagination.per_page })
          Swal.fire({
            title: 'Success!',
            text: 'Property deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('deleteProperty error:', error.response?.data || error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete property.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        throw error
      } finally {
        this.deletingProperty = false
      }
    },
  },
})