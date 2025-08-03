import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

// Define interfaces at the top for clarity
export interface EnergyConsumption {
  id: number;
  property_id: number | null;
  property_title: string | null;
  consumption_date: string;
  electricity_usage: number | null;
  gas_usage: number | null;
  water_usage: number | null;
  total_cost: number | null;
  status: string;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Payload {
  property_id: number | null;
  consumption_date: string;
  electricity_usage: number | null;
  gas_usage: number | null;
  water_usage: number | null;
  total_cost: number | null;
  status: string;
  due_date: string | null;
}

export const useEnergyConsumptionStore = defineStore('energyConsumption', {
  state: () => ({
    loadingEnergyConsumptions: false,
    energyConsumptions: [] as EnergyConsumption[],
    addingEnergyConsumption: false,
    editingEnergyConsumption: false,
    addedEnergyConsumption: null as EnergyConsumption | null,
    properties: [] as { value: number; text: string }[],
    loadingProperties: false,
    searchQuery: '' as string,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  }),

  actions: {
    async getEnergyConsumptions(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingEnergyConsumptions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/energy-consumptions`,
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
        });
        console.log('getEnergyConsumptions response:', response);
        if (response.status === 200) {
          this.energyConsumptions = response.data.data.map((consumption: any) => ({
            id: consumption.id,
            property_id: consumption.property_id,
            property_title: consumption.property_title || 'N/A',
            consumption_date: consumption.consumption_date
              ? format(new Date(consumption.consumption_date), 'd MMMM yyyy')
              : 'N/A',
            electricity_usage: consumption.electricity_usage,
            gas_usage: consumption.gas_usage,
            water_usage: consumption.water_usage,
            total_cost: consumption.total_cost,
            status: consumption.status || 'N/A',
            due_date: consumption.due_date ? format(new Date(consumption.due_date), 'd MMMM yyyy') : 'N/A',
            created_at: consumption.created_at ? format(new Date(consumption.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: consumption.updated_at ? format(new Date(consumption.updated_at), 'd MMMM yyyy') : 'N/A',
          }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          this.searchQuery = params.search || this.searchQuery;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No energy consumption records found. Add some records to get started.',
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
            text: response.data?.message || 'Failed to fetch energy consumption records.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('getEnergyConsumptions error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch energy consumption records.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        return { status: 'error', message: error.response?.data?.message || error.message };
      } finally {
        this.loadingEnergyConsumptions = false;
      }
    },

    async getProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No properties found. Please add properties first.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
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
          });
        }
      } catch (error: any) {
        console.error('getProperties error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingProperties = false;
      }
    },

    async addEnergyConsumption(payload: Payload) {
      this.addingEnergyConsumption = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/energy-consumptions`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('addEnergyConsumption response:', response);
        if (response.status === 201) {
          this.addedEnergyConsumption = {
            ...response.data.data,
            consumption_date: response.data.data.consumption_date
              ? format(new Date(response.data.data.consumption_date), 'd MMMM yyyy')
              : 'N/A',
            due_date: response.data.data.due_date
              ? format(new Date(response.data.data.due_date), 'd MMMM yyyy')
              : 'N/A',
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
            electricity_usage: response.data.data.electricity_usage,
            gas_usage: response.data.data.gas_usage,
            water_usage: response.data.data.water_usage,
            total_cost: response.data.data.total_cost,
          };
          await this.getEnergyConsumptions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Energy consumption record added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('addEnergyConsumption error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to add energy consumption record.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.addingEnergyConsumption = false;
      }
    },

    async updateEnergyConsumption(payload: Payload, id: number) {
      if (!Number.isInteger(id) || id <= 0) {
        console.error('Invalid ID in updateEnergyConsumption:', id);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid energy consumption record ID.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw new Error('Invalid ID: ID must be a positive integer');
      }

      this.editingEnergyConsumption = true;
      try {
        console.log('Sending update request for ID:', id, 'Payload:', payload);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/energy-consumptions/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('updateEnergyConsumption response:', response);
        if (response.status === 200) {
          await this.getEnergyConsumptions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Energy consumption record updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('updateEnergyConsumption error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to update energy consumption record.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.editingEnergyConsumption = false;
      }
    },

    async deleteEnergyConsumption(id: number) {
      if (!Number.isInteger(id) || id <= 0) {
        console.error('Invalid ID in deleteEnergyConsumption:', id);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid energy consumption record ID.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw new Error('Invalid ID: ID must be a positive integer');
      }

      try {
        console.log('Sending delete request for ID:', id);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/energy-consumptions/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteEnergyConsumption response:', response);
        if (response.status === 200 || response.status === 204) {
          await this.getEnergyConsumptions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Energy consumption record deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('deleteEnergyConsumption error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to delete energy consumption record.',
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