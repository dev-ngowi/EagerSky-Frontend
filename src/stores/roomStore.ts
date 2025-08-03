import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { Room } from '../types/room';
import { AxiosResponse } from 'axios';

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

interface RoomsResponse {
  data: Room[];
  pagination: Pagination;
}

interface ErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export const useRoomStore = defineStore('room', {
  state: () => ({
    loadingRooms: false,
    rooms: [] as Room[],
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    addingRoom: false,
    editingRoom: false,
    addedRoom: null as Room | null,
  }),

  actions: {
    async getRooms(params: { page?: number; per_page?: number; search?: string; property_id?: number } = {}) {
      this.loadingRooms = true;
      try {
        const response: AxiosResponse<RoomsResponse | ErrorResponse> = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params,
        });
        console.log('getRooms response:', response);
        if (response.status === 200) {
          if ('pagination' in response.data) {
            this.rooms = response.data.data.map((room: Room) => ({
              id: room.id,
              property_id: room.property_id,
              property_title: room.property_title || 'None',
              room_number: room.room_number,
              size: room.size,
              rent: room.rent,
              is_available: room.is_available,
              created_at: room.created_at ? format(new Date(room.created_at), 'd MMMM yyyy') : 'None',
              updated_at: room.updated_at ? format(new Date(room.updated_at), 'd MMMM yyyy') : 'None',
            }));
            this.pagination = response.data.pagination;
            if (response.data.data.length === 0) {
              Swal.fire({
                title: 'Info',
                text: 'No rooms found. Add some rooms to get started.',
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
              text: (response.data as ErrorResponse).message || 'Failed to fetch rooms.',
              icon: 'error',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: (response.data as ErrorResponse).message || 'Failed to fetch rooms.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('getRooms error:', error.message, { response: error.response?.data });
        const errorMessage = error.message.includes('Invalid JSON response')
          ? 'Server returned an invalid response. Please check the server configuration.'
          : error.response?.data?.message || error.message || 'Failed to fetch rooms.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        throw error; // Throw the error instead of returning a custom object
      } finally {
        this.loadingRooms = false;
      }
    },

    async addRoom(payload: any) {
      this.addingRoom = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('addRoom response:', response);
        if (response.status === 201) {
          this.addedRoom = response.data.data;
          Swal.fire({
            title: 'Success!',
            text: 'Room added successfully.',
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
        console.error('addRoom error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to add room.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.addingRoom = false;
      }
    },

    async updateRoom(payload: any) {
      this.editingRoom = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('updateRoom response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room updated successfully.',
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
        console.error('updateRoom error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update room.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.editingRoom = false;
      }
    },

    async deleteRoom(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        console.log('deleteRoom response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room deleted successfully.',
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
        console.error('deleteRoom error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete room.',
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