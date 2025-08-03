import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import Swal from 'sweetalert2';
import type { User, Role, Branch } from '../types/user';

export const useUserStore = defineStore('user', {
  state: () => ({
    loadingUsers: false,
    users: [] as User[],
    roles: [] as Role[],
    branches: [] as Branch[],
    searchQuery: '' as string,
    currentPage: 1,
    perPage: 10,
    totalItems: 0,
    editingUser: false,
    loggingIn: false,
    resettingPassword: false,
    verifyingOtp: false,
    currentUser: null as User | null,
    authToken: localStorage.getItem('auth_token') || '',
  }),

  actions: {
    // stores/userStore.ts
async getUsers() {
  this.loadingUsers = true;
  try {
    const response = await makeRequest({
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
      method: 'get',
      params: {
        search: this.searchQuery,
        page: this.currentPage,
        per_page: this.perPage,
      },
    });
    console.log('getUsers response:', response);
    if (response.status === 200) {
      this.users = response.data.data.map((user: any) => ({
        id: user.id,
        first_name: user.first_name || 'N/A',
        last_name: user.last_name || 'N/A',
        username: user.username || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        role_id: user.role_id || null,
        role: user.role || 'N/A', // Include role from response
        branch_id: user.branch || null,
        client_type: user.client_type || 'N/A',
        student_registration_number: user.student_registration_number
          ? String(user.student_registration_number)
          : 'N/A',
        created_at: user.created_at
          ? new Date(user.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'N/A',
        updated_at: user.updated_at
          ? new Date(user.updated_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'N/A',
        bookings: user.bookings.map((booking: any) => ({
          id: booking.id,
          property_id: booking.property_id,
          property_title: booking.property_title || 'N/A',
          property_price: booking.property_price || null,
          client_id: booking.client_id,
          client_fullname: booking.client_fullname || 'N/A',
          agent_id: booking.agent_id || null,
          agent_fullname: booking.agent_fullname || 'N/A',
          appointment_type_id: booking.appointment_type_id,
          appointment_type_name: booking.appointment_type_name || 'N/A',
          date: booking.date
            ? new Date(booking.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'N/A',
          duration: booking.duration || 'N/A',
          time_slot: booking.time_slot
            ? new Date(booking.time_slot).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A',
          status: booking.status || 'N/A',
          created_at: booking.created_at
            ? new Date(booking.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'N/A',
          updated_at: booking.updated_at
            ? new Date(booking.updated_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'N/A',
          deleted_at: booking.deleted_at || null,
        })),
      }));
      this.totalItems = response.data.pagination.total;
      this.currentPage = response.data.pagination.current_page;
      this.perPage = response.data.pagination.per_page;
      if (response.data.data.length === 0) {
        Swal.fire({
          title: 'Info',
          text: 'No users found.',
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
        text: response.data?.message || 'Failed to fetch users.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
    return response;
  } catch (error: any) {
    console.error('getUsers error:', error.message, { response: error.response?.data });
    Swal.fire({
      title: 'Error!',
      text: error.response?.data?.message || 'Failed to fetch users.',
      icon: 'error',
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
      timer: 5000,
    });
    return { status: 'error', message: error.message };
  } finally {
    this.loadingUsers = false;
  }
},

    async getBranches() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'get',
        });
        if (response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            value: branch.id,
            text: branch.name,
          }));
        }
      } catch (error: any) {
        console.error('getBranches error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch branches.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async getRoles() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles`,
          method: 'get',
        });
        console.log('getRoles response:', response);
        if (response.status === 200) {
          this.roles = response.data.data.roles.map((role: any) => {
            console.log('Mapping role:', role);
            return {
              value: role.id,
              text: role.name, 
            };
          });
          console.log('Mapped roles:', this.roles);
        } else {
          console.warn('No roles data in response:', response);
          this.roles = [];
        }
      } catch (error: any) {
        console.error('getRoles error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch roles.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.roles = [];
      }
    },

    async updateUser(payload: any) {
      if (!this.authToken) {
        Swal.fire({
          title: 'Error!',
          text: 'You are not logged in. Please log in to update users.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      this.editingUser = true;
      try {
        const normalizedPayload = {
          ...payload,
          nida_number: payload.nida_number ? String(payload.nida_number) : null,
          student_registration_number: payload.student_registration_number
            ? String(payload.student_registration_number)
            : null,
          pin: payload.pin ? String(payload.pin) : null,
        };
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${this.authToken || ''}`,
            'Content-Type': 'application/json',
          },
          data: normalizedPayload,
        });
        console.log('updateUser response:', response);
        if (response.status === 200) {
          await this.getUsers();
          Swal.fire({
            title: 'Success!',
            text: 'User updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('updateUser error:', error.message);
        if (error.response?.status === 401) {
          this.authToken = '';
          this.currentUser = null;
          localStorage.removeItem('auth_token');
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to update user.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        throw error;
      } finally {
        this.editingUser = false;
      }
    },

    async deleteUser(id: number) {
      if (!this.authToken) {
        Swal.fire({
          title: 'Error!',
          text: 'You are not logged in. Please log in to delete users.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${this.authToken || ''}`,
          },
        });
        console.log('deleteUser response:', response);
        if (response.status === 200) {
          await this.getUsers();
          Swal.fire({
            title: 'Success!',
            text: 'User deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('deleteUser error:', error.message);
        if (error.response?.status === 401) {
          this.authToken = '';
          this.currentUser = null;
          localStorage.removeItem('auth_token');
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to delete user.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        throw error;
      }
    },

    async verifyOtp(payload: { user_id: number; otp: string }) {
      this.verifyingOtp = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users/verify-otp`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('verifyOtp response:', response);
        if (response.status === 200) {
          this.authToken = response.data.data.token || '';
          localStorage.setItem('auth_token', this.authToken);
          this.currentUser = response.data.data;
          await this.getUsers();
          Swal.fire({
            title: 'Success!',
            text: 'OTP verified successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('verifyOtp error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to verify OTP.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.verifyingOtp = false;
      }
    },

    async login(payload: any) {
      this.loggingIn = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/login`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('login response:', response);
        if (response.status === 200) {
          this.authToken = response.data.data.token || '';
          localStorage.setItem('auth_token', this.authToken);
          this.currentUser = response.data.data;
          Swal.fire({
            title: 'Success!',
            text: 'Logged in successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('login error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to login.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.loggingIn = false;
      }
    },

    async requestPasswordReset(email: string) {
      this.resettingPassword = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/password/reset-request`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: { email },
        });
        console.log('requestPasswordReset response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Password reset link sent to your email.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('requestPasswordReset error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to send password reset link.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.resettingPassword = false;
      }
    },

    async resetPassword(payload: { email: string; token: string; password: string; password_confirmation: string }) {
      this.resettingPassword = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/password/reset`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('resetPassword response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Password reset successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('resetPassword error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to reset password.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.resettingPassword = false;
      }
    },

    async logout() {
      if (!this.authToken) {
        Swal.fire({
          title: 'Error!',
          text: 'You are not logged in.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/logout`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${this.authToken || ''}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('logout response:', response);
        if (response.status === 200) {
          this.authToken = '';
          this.currentUser = null;
          localStorage.removeItem('auth_token');
          Swal.fire({
            title: 'Success!',
            text: 'Logged out successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('logout error:', error.message);
        if (error.response?.status === 401) {
          this.authToken = '';
          this.currentUser = null;
          localStorage.removeItem('auth_token');
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to logout.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        throw error;
      }
    },

    setSearchQuery(query: string) {
      this.searchQuery = query;
      this.currentPage = 1;
    },

    setPage(page: number) {
      this.currentPage = page;
    },

    setPerPage(perPage: number) {
      this.perPage = perPage;
      this.currentPage = 1;
    },
  },
});