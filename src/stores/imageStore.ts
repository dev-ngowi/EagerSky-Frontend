import { defineStore } from 'pinia';
import makeRequest from '../services/makeRequest';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

export interface Image {
  id: number;
  property_id: number | null;
  file_path: string;
  caption: string | null;
  uploader?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImageGroup {
  property_id: number | null;
  property_title: string | null;
  images: Image[];
  uploader?: string;
  created_at?: string;
}

export const useImageStore = defineStore('image', {
  state: () => ({
    loadingImages: false,
    images: [] as ImageGroup[],
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    addingImage: false,
    editingImage: false,
    addedImage: null as Image | null,
  }),

  actions: {
    async getImages(params: { page?: number; per_page?: number; search?: string; property_id?: number } = {}) {
      this.loadingImages = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params,
        });
        console.log('getImages response:', response);
        if (response.status === 200) {
          this.images = response.data.data
            .filter((group: any) => group.property_id !== null) // Filter out groups with null property_id
            .map((group: any) => ({
              property_id: group.property_id as number, // Ensure number type
              property_title: group.property_title || 'Unknown Property',
              images: group.images
                .filter((image: any) => image.property_id !== null) // Filter out images with null property_id
                .map((image: any) => ({
                  id: image.id,
                  property_id: image.property_id as number, // Ensure number type
                  file_path: image.file_path,
                  caption: image.caption || null,
                  uploader: image.uploader || 'EagerSky',
                  created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
                  updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
                })),
            }));
          this.pagination = {
            total: response.data.pagination.total,
            per_page: response.data.pagination.per_page,
            current_page: response.data.pagination.current_page,
            last_page: response.data.pagination.last_page,
          };
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No images found. Add some images to get started.',
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
            text: response.data?.message || 'Failed to fetch images.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('getImages error:', error.message, error.response?.data);
        let errorMessage = 'Failed to fetch images.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        return { status: 'error', message: errorMessage };
      } finally {
        this.loadingImages = false;
      }
    },

    async addImage(payload: FormData) {
      this.addingImage = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'multipart/form-data',
          },
          data: payload,
        });
        console.log('addImage response:', response);
        if (response.status === 201) {
          this.addedImage = {
            id: response.data.data.id,
            property_id: response.data.data.property_id,
            file_path: response.data.data.file_path,
            caption: response.data.data.caption || null,
            uploader: response.data.data.uploader || 'EagerSky',
            created_at: response.data.data.created_at ? format(new Date(response.data.data.created_at), 'd MMMM yyyy') : 'None',
            updated_at: response.data.data.updated_at ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy') : 'None',
          };
          Swal.fire({
            title: 'Success!',
            text: 'Image uploaded successfully.',
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
        console.error('addImage error:', error.message, error.response?.data);
        let errorMessage = 'Failed to upload image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.addingImage = false;
      }
    },

    async updateImage(payload: FormData, id: number) {
      this.editingImage = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'multipart/form-data',
          },
          data: payload,
        });
        console.log('updateImage response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Image updated successfully.',
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
        console.error('updateImage error:', error.message, error.response?.data);
        let errorMessage = 'Failed to update image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.editingImage = false;
      }
    },

    async deleteImage(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteImage response:', response);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Success!',
            text: 'Image deleted successfully.',
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
        console.error('deleteImage error:', error.message, error.response?.data);
        let errorMessage = 'Failed to delete image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
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