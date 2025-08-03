import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import type { Alert, UserOption, LocationOption, PropertyCategoryOption, ApiResponse, Payload } from '../types/alert';
import { AxiosResponse } from 'axios';

interface AlertState {
  loadingAlerts: boolean;
  alerts: Alert[];
  addingAlert: boolean;
  editingAlert: boolean;
  users: UserOption[];
  locations: LocationOption[];
  propertyCategories: PropertyCategoryOption[];
  addedAlert: Alert | null;
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
  searchQuery: string;
}

export const useAlertStore = defineStore('alert', {
  state: (): AlertState => ({
    loadingAlerts: false,
    alerts: [],
    addingAlert: false,
    editingAlert: false,
    users: [],
    locations: [],
    propertyCategories: [],
    addedAlert: null,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    searchQuery: '',
  }),
  actions: {
    async getAlerts(params: { page?: number; per_page?: number; search?: string } = {}): Promise<ApiResponse<Alert[]>> {
      this.loadingAlerts = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts`,
          method: 'get',
          headers: {
            Accept: 'application/json',
          },
          params: {
            page: params.page ?? this.pagination.current_page,
            per_page: params.per_page ?? this.pagination.per_page,
            search: params.search ?? this.searchQuery,
          },
        });

        console.log('getAlerts response:', response);

        if (response.status === 200) {
          this.alerts = response.data.data.map((alert: any) => ({
            id: alert.id,
            user_id: alert.user_id,
            username: alert.user_name || 'N/A',
            property_category_id: alert.property_category_id,
            property_category_name: alert.property_category_name || 'N/A',
            min_price: alert.min_price !== null ? alert.min_price : 'N/A',
            max_price: alert.max_price !== null ? alert.max_price : 'N/A',
            min_bedrooms: alert.min_bedrooms !== null ? alert.min_bedrooms : 'N/A',
            max_bedrooms: alert.max_bedrooms !== null ? alert.max_bedrooms : 'N/A',
            location_id: alert.location_id,
            location_name: alert.location_name || 'N/A',
            notification_frequency: alert.notification_frequency,
            created_at: alert.created_at ? format(new Date(alert.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: alert.updated_at ? format(new Date(alert.updated_at), 'd MMMM yyyy') : 'N/A',
          }));

          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };

          this.searchQuery = params.search ?? this.searchQuery;

          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No alerts found. Add some alerts to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }

          return {
            ...response,
            data: { data: this.alerts, pagination: this.pagination },
          };
        } else {
          const errorMessage = 'message' in response.data ? response.data.message : 'Failed to fetch alerts.';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return {
            ...response,
            data: { message: errorMessage, errors: response.data.errors },
          };
        }
      } catch (error: any) {
        console.error('getAlerts error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch alerts.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      } finally {
        this.loadingAlerts = false;
      }
    },
    async getUsers(): Promise<ApiResponse<UserOption[]>> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: user.id,
            text: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username || 'N/A',
          }));
          return {
            ...response,
            data: { data: this.users },
          };
        }
        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to fetch users.';
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('getUsers error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'Failed to fetch users.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      }
    },
    async getAdvisorUsers(): Promise<ApiResponse<UserOption[]>> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/advisor-users`,
          method: 'get',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: user.id,
            text: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username || 'N/A',
          }));
          return {
            ...response,
            data: { data: this.users },
          };
        }
        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to fetch advisor users.';
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('getAdvisorUsers error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'Failed to fetch advisor users.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      }
    },
    async getLocations(): Promise<ApiResponse<LocationOption[]>> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          this.locations = response.data.data.map((location: any) => ({
            value: location.id,
            text: location.name,
          }));
          return {
            ...response,
            data: { data: this.locations },
          };
        }
        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to fetch locations.';
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('getLocations error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'Failed to fetch locations.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      }
    },
    async getPropertyCategories(): Promise<ApiResponse<PropertyCategoryOption[]>> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.status === 200) {
          this.propertyCategories = response.data.data.map((category: any) => ({
            value: category.id,
            text: category.name,
          }));
          return {
            ...response,
            data: { data: this.propertyCategories },
          };
        }
        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to fetch property categories.';
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('getPropertyCategories error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'Failed to fetch property categories.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      }
    },
    async addAlert(payload: Payload): Promise<ApiResponse<Alert>> {
      this.addingAlert = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: payload,
        });

        console.log('addAlert response:', response);

        if (response.status === 201) {
          const newAlert: Alert = {
            id: response.data.data.id,
            user_id: response.data.data.user_id,
            username: response.data.data.user_name || 'N/A',
            property_category_id: response.data.data.property_category_id,
            property_category_name: response.data.data.property_category_name || 'N/A',
            min_price: response.data.data.min_price !== null ? response.data.data.min_price : 'N/A',
            max_price: response.data.data.max_price !== null ? response.data.data.max_price : 'N/A',
            min_bedrooms: response.data.data.min_bedrooms !== null ? response.data.data.min_bedrooms : 'N/A',
            max_bedrooms: response.data.data.max_bedrooms !== null ? response.data.data.max_bedrooms : 'N/A',
            location_id: response.data.data.location_id,
            location_name: response.data.data.location_name || 'N/A',
            notification_frequency: response.data.data.notification_frequency,
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
          };
          this.addedAlert = newAlert;
          await this.getAlerts({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Alert added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return {
            ...response,
            data: { data: newAlert },
          };
        }

        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to add alert.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('addAlert error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to add alert.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      } finally {
        this.addingAlert = false;
      }
    },
    async updateAlert(payload: Payload & { id: number }): Promise<ApiResponse<Alert>> {
      this.editingAlert = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts/${payload.id}`,
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: payload,
        });

        console.log('updateAlert response:', response);

        if (response.status === 200) {
          const updatedAlert: Alert = {
            id: response.data.data.id,
            user_id: response.data.data.user_id,
            username: response.data.data.user_name || 'N/A',
            property_category_id: response.data.data.property_category_id,
            property_category_name: response.data.data.property_category_name || 'N/A',
            min_price: response.data.data.min_price !== null ? response.data.data.min_price : 'N/A',
            max_price: response.data.data.max_price !== null ? response.data.data.max_price : 'N/A',
            min_bedrooms: response.data.data.min_bedrooms !== null ? response.data.data.min_bedrooms : 'N/A',
            max_bedrooms: response.data.data.max_bedrooms !== null ? response.data.data.max_bedrooms : 'N/A',
            location_id: response.data.data.location_id,
            location_name: response.data.data.location_name || 'N/A',
            notification_frequency: response.data.data.notification_frequency,
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
          };
          await this.getAlerts({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Alert updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return {
            ...response,
            data: { data: updatedAlert },
          };
        }

        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to update alert.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('updateAlert error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update alert.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      } finally {
        this.editingAlert = false;
      }
    },
    async deleteAlert(id: number): Promise<ApiResponse<null>> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/alerts/${id}`,
          method: 'delete',
          headers: {
            Accept: 'application/json',
          },
        });

        console.log('deleteAlert response:', response);

        if (response.status === 200) {
          await this.getAlerts({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Alert deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          return {
            ...response,
            data: { data: null },
          };
        }

        const errorMessage = 'message' in response.data ? response.data.message : 'Failed to delete alert.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          ...response,
          data: { message: errorMessage, errors: response.data.errors },
        };
      } catch (error: any) {
        console.error('deleteAlert error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete alert.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return {
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          headers: error.response?.headers || {},
          config: error.config || {},
          data: { message: errorMessage, errors: error.response?.data?.errors },
        };
      }
    },
  },
});