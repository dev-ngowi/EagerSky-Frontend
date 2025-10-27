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
  from: number;
  to: number;
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
      from: 0,
      to: 0,
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
    if (response.status === 200 && 'pagination' in response.data) {
      this.rooms = response.data.data.map((room: any) => ({
        id: room.id,
        property_id: Number(room.property_id),
        property_title: room.property_title || null,
        room_category_id: Number(room.room_category_id) || 0,
        room_category_name: room.room_category_name || null,
        room_number: room.room_number,
        size: Number(room.size),
        rent: Number(room.rent),
        is_available: room.is_available,
        description: room.description ?? '', // Convert null to empty string
        features: Array.isArray(room.features) ? room.features : [],
        created_at: room.created_at ? format(new Date(room.created_at), 'd MMMM yyyy') : 'None',
        updated_at: room.updated_at ? format(new Date(room.updated_at), 'd MMMM yyyy') : 'None',
      }));
      this.pagination = {
        total: response.data.pagination.total,
        per_page: response.data.pagination.per_page,
        current_page: response.data.pagination.current_page,
        last_page: response.data.pagination.last_page,
        from: response.data.pagination.from || 0,
        to: response.data.pagination.to || 0,
      };
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
    throw error;
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
          this.addedRoom = {
            ...response.data.data,
            property_id: Number(response.data.data.property_id),
            room_category_id: Number(response.data.data.room_category_id) || 0,
            room_category_name: response.data.data.room_category_name || null,
            size: Number(response.data.data.size),
            rent: Number(response.data.data.rent),
            description: response.data.data.description || null,
            features: Array.isArray(response.data.data.features) ? response.data.data.features : [],
            created_at: response.data.data.created_at ? format(new Date(response.data.data.created_at), 'd MMMM yyyy') : 'None',
            updated_at: response.data.data.updated_at ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy') : 'None',
          };
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