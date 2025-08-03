import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { Neighborhood, GroupedOptions } from '../types/neighborhood';

export const useNeighborhoodStore = defineStore('neighborhood', {
  state: () => ({
    loadingNeighborhoods: false,
    neighborhoods: [] as Neighborhood[],
    addingNeighborhood: false,
    editingNeighborhood: false,
    addedNeighborhood: null as Neighborhood | null,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    schoolOptions: {} as GroupedOptions,
    amenityOptions: {} as GroupedOptions,
  }),

  actions: {
    async getNeighborhoods(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingNeighborhoods = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods`,
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
        });
        console.log('getNeighborhoods response:', response);
        if (response.status === 200) {
          this.neighborhoods = response.data.data.map((neighborhood: any) => ({
            id: neighborhood.id,
            name: neighborhood.name,
            description: neighborhood.description || 'None',
            schools: neighborhood.schools_by_category || {},
            amenities: neighborhood.amenities_by_category || {},
            crime_rate: neighborhood.crime_rate || 'N/A',
            median_income: neighborhood.median_income || 'N/A',
            population: neighborhood.population || 'N/A',
            walk_score: neighborhood.walk_score || 'N/A',
            transit_score: neighborhood.transit_score || 'N/A',
            last_updated: neighborhood.last_updated
              ? format(new Date(neighborhood.last_updated), 'd MMMM yyyy')
              : 'None',
            locations_count: neighborhood.locations_count || 0,
            created_at: format(new Date(neighborhood.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(neighborhood.updated_at), 'd MMMM yyyy'),
            locations: neighborhood.locations || [],
          }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No neighborhoods found. Add some neighborhoods to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch neighborhoods.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('getNeighborhoods error:', error.message, { response: error.response?.data });
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch neighborhoods.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        return { status: 'error', message: error.message };
      } finally {
        this.loadingNeighborhoods = false;
      }
    },

    async addNeighborhood(payload: any) {
      this.addingNeighborhood = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        console.log('addNeighborhood response:', response);
        if (response.status === 201) {
          this.addedNeighborhood = {
            ...response.data.data,
            schools: response.data.data.schools_by_category || {},
            amenities: response.data.data.amenities_by_category || {},
            last_updated: response.data.data.last_updated
              ? format(new Date(response.data.data.last_updated), 'd MMMM yyyy')
              : 'None',
            created_at: format(new Date(response.data.data.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(response.data.data.updated_at), 'd MMMM yyyy'),
          };
          Swal.fire({
            title: 'Success!',
            text: 'Neighborhood added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return response;
        }
        return response;
      } catch (error: any) {
        console.error('addNeighborhood error:', error.message, error.response?.data);
        throw error;
      } finally {
        this.addingNeighborhood = false;
      }
    },

    async updateNeighborhood(payload: any) {
      this.editingNeighborhood = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        console.log('updateNeighborhood response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Neighborhood updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return response;
        }
        return response;
      } catch (error: any) {
        console.error('updateNeighborhood error:', error.message, error.response?.data);
        throw error;
      } finally {
        this.editingNeighborhood = false;
      }
    },

    async deleteNeighborhood(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteNeighborhood response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Neighborhood deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('deleteNeighborhood error:', error.message, error.response?.data);
        throw error;
      }
    },

    async getSchoolOptions() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/school-options`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('getSchoolOptions response:', response.data);
        if (response.status === 200) {
          // Ensure the response is in the correct format
          if (typeof response.data === 'object' && !Array.isArray(response.data)) {
            this.schoolOptions = response.data;
          } else {
            throw new Error('Invalid school options format');
          }
        }
        return response;
      } catch (error: any) {
        console.error('getSchoolOptions error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to fetch school options.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    },

    async getAmenityOptions() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/amenity-options`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('getAmenityOptions response:', response.data);
        if (response.status === 200) {
          // Ensure the response is in the correct format
          if (typeof response.data === 'object' && !Array.isArray(response.data)) {
            this.amenityOptions = response.data;
          } else {
            throw new Error('Invalid amenity options format');
          }
        }
        return response;
      } catch (error: any) {
        console.error('getAmenityOptions error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to fetch amenity options.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    },
  },
});