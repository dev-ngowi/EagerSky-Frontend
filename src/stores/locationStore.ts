import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import {
  Location,
  CountryOption,
  CityOption,
  StreetOption,
  NeighborhoodOption,
} from '../types/location';

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface State {
  loadingLocations: boolean;
  locations: Location[];
  pagination: Pagination;
  addingLocation: boolean;
  editingLocation: boolean;
  addedLocation: Location | null;
}

export const useLocationStore = defineStore('location', {
  state: (): State => ({
    loadingLocations: false,
    locations: [],
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    addingLocation: false,
    editingLocation: false,
    addedLocation: null,
  }),

  actions: {
    async getLocations(
      params: { page?: number; per_page?: number; search?: string; city_id?: number; country_id?: number } = {},
    ) {
      this.loadingLocations = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        console.log('getLocations response:', response);
        if (response.status === 200) {
          this.locations = response.data.data.map((location: any) => ({
            id: location.id,
            name: location.name,
            city: location.city || 'None',
            city_id: location.city_id || null,
            country: location.country || 'None',
            country_id: location.country_id || null,
            street: location.street || 'None',
            street_id: location.street_id || null,
            neighborhood: location.neighborhood || 'None',
            neighborhood_id: location.neighborhood_id || null,
            latitude: location.latitude || 'None',
            longitude: location.longitude || 'None',
            created_at: location.created_at ? format(new Date(location.created_at), 'd MMMM yyyy') : 'None',
            updated_at: location.updated_at ? format(new Date(location.updated_at), 'd MMMM yyyy') : 'None',
          }));
          this.pagination = response.data.pagination;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No locations found. Add some locations to get started.',
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
            text: response.data?.message || 'Failed to fetch locations.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('getLocations error:', error.message, { response: error.response?.data });
        Swal.fire({
          title: 'Error!',
          text: error.message.includes('Invalid JSON response')
            ? 'Server returned an invalid response. Please check the server configuration.'
            : error.response?.data?.message || 'Failed to fetch locations.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        return { status: 'error', message: error.message };
      } finally {
        this.loadingLocations = false;
      }
    },

    async addLocation(payload: any) {
      this.addingLocation = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        });
        console.log('addLocation response:', response);
        if (response.status === 201) {
          this.addedLocation = {
            id: response.data.data.id,
            name: response.data.data.name,
            city: response.data.data.city || 'None',
            city_id: response.data.data.city_id || null,
            country: response.data.data.country || 'None',
            country_id: response.data.data.country_id || null,
            street: response.data.data.street || 'None',
            street_id: response.data.data.street_id || null,
            neighborhood: response.data.data.neighborhood || 'None',
            neighborhood_id: response.data.data.neighborhood_id || null,
            latitude: response.data.data.latitude || 'None',
            longitude: response.data.data.longitude || 'None',
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'None',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'None',
          };
          Swal.fire({
            title: 'Success!',
            text: 'Location added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          await this.getLocations({ page: this.pagination.current_page, per_page: this.pagination.per_page });
          return response;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to add location.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return response;
        }
      } catch (error: any) {
        console.error('addLocation error:', error.message, { response: error.response?.data });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add location.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.addingLocation = false;
      }
    },

    async updateLocation(payload: any) {
      this.editingLocation = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations/${payload.id}`,
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        });
        console.log('updateLocation response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Location updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          await this.getLocations({ page: this.pagination.current_page, per_page: this.pagination.per_page });
          return response;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to update location.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return response;
        }
      } catch (error: any) {
        console.error('updateLocation error:', error.message, { response: error.response?.data });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update location.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.editingLocation = false;
      }
    },

    async deleteLocation(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations/${id}`,
          method: 'delete',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        console.log('deleteLocation response:', response);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Success!',
            text: 'Location deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          await this.getLocations({ page: this.pagination.current_page, per_page: this.pagination.per_page });
          return response;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete location.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return response;
        }
      } catch (error: any) {
        console.error('deleteLocation error:', error.message, { response: error.response?.data });
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete location.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    },

    async getCountries(params: { search?: string } = {}) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/country`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        return response;
      } catch (error: any) {
        console.error('getCountries error:', error.message, { response: error.response?.data });
        throw error;
      }
    },

    async getCities(params: { country_id: number }) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/city`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        return response;
      } catch (error: any) {
        console.error('getCities error:', error.message, { response: error.response?.data });
        throw error;
      }
    },

    async getStreets(params: { city_id: number }) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/street`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        return response;
      } catch (error: any) {
        console.error('getStreets error:', error.message, { response: error.response?.data });
        throw error;
      }
    },

    async getNeighborhoods(params: { city_id: number }) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        return response;
      } catch (error: any) {
        console.error('getNeighborhoods error:', error.message, { response: error.response?.data });
        throw error;
      }
    },
  },
});