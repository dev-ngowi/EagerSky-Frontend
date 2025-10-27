<template>
  <div class="p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-full overflow-x-auto">
    <h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Add New Room Image</h2>
    <div class="mb-6 p-4 bg-gray-100 rounded-lg">
      <h3 class="text-base sm:text-lg font-semibold text-gray-700">Upload Requirements</h3>
      <ul class="list-disc pl-5 text-sm sm:text-base text-gray-600">
        <li>Allowed formats: {{ requirements.allowed_formats.join(', ') }}</li>
        <li>Maximum size per image: {{ requirements.max_size }}</li>
        <li>Minimum images per room: {{ requirements.min_images_per_room }}</li>
        <li>Maximum images per room: {{ requirements.max_images_per_room }}</li>
        <li>Maximum caption length: {{ requirements.caption_max_length }} characters</li>
        <li v-for="(note, index) in requirements.notes" :key="index">{{ note }}</li>
      </ul>
    </div>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div class="mb-4 sm:mb-6">
          <VaSelect
            v-model="form.property_id"
            label="Property"
            placeholder="Select property"
            :options="properties"
            :error-messages="errors.property_id ? [errors.property_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingProperties"
            :disabled="isSubmitting || !properties.length"
            required
            @update:modelValue="fetchRooms"
          />
          <p v-if="!properties.length && !loadingProperties" class="text-red-500 text-sm mt-1">
            No properties available (all have maximum images).
          </p>
        </div>
        <div class="mb-4 sm:mb-6">
          <VaSelect
            v-model="form.room_id"
            label="Room"
            placeholder="Select room"
            :options="rooms"
            :error-messages="errors.room_id ? [errors.room_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingRooms"
            :disabled="isSubmitting || !form.property_id || !rooms.length"
            required
          />
          <p v-if="!rooms.length && !loadingRooms && form.property_id" class="text-red-500 text-sm mt-1">
            No rooms available for this property (all have maximum images).
          </p>
        </div>
        <div class="mb-4 sm:mb-6">
          <VaInput
            v-model="form.caption"
            label="Caption"
            placeholder="Enter caption (optional)"
            :error-messages="errors.caption ? [errors.caption] : []"
            :disabled="isSubmitting"
            :maxlength="requirements.caption_max_length"
          />
        </div>
        <div class="mb-4 sm:mb-6">
          <label class="block text-sm font-medium text-gray-700">Images</label>
          <input
            type="file"
            multiple
            :accept="requirements.allowed_formats.map((fmt) => `image/${fmt}`).join(',')"
            :disabled="isSubmitting || !form.room_id"
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            @change="handleMultipleFileChange"
          />
          <p v-for="error in errors.image" :key="error" class="text-red-500 text-sm mt-1">{{ error }}</p>
          <div v-if="imagePreviews.length" class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div v-for="(preview, index) in imagePreviews" :key="index" class="relative p-2 bg-gray-50 rounded-lg border min-w-0">
              <img
                :src="preview.url"
                :alt="`Image Preview ${index + 1}`"
                class="max-h-32 w-full object-cover rounded aspect-square"
              />
              <button
                type="button"
                class="absolute top-1 right-1 text-red-500 hover:text-red-700 z-10"
                :disabled="isSubmitting"
                @click="removePreview(index)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div v-if="uploadProgress > 0" class="mt-2">
            <p class="text-sm text-gray-600">Upload Progress: {{ uploadProgress }}%</p>
            <div class="w-full bg-gray-200 rounded h-2">
              <div class="bg-blue-600 h-2 rounded" :style="{ width: `${uploadProgress}%` }"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-end space-x-3 mt-4 sm:mt-6">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton
          color="#00A3E0"
          type="submit"
          :disabled="isSubmitting || !form.room_id || !form.images.length"
        >
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Swal from 'sweetalert2';
import Compressor from 'compressorjs';
import { format } from 'date-fns';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../../stores/auth-store';
import { AuthMiddleware } from '../../../../utils/authMiddleware';
import makeRequest from '../../../../services/makeRequest';
import { v4 as uuidv4 } from 'uuid';
import { AxiosProgressEvent } from 'axios';

// Interfaces for type safety
interface Image {
  id: number;
  property_id: number;
  room_id: number;
  file_path: string;
  caption: string | null;
  uploader?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface FormData {
  property_id: number | null;
  room_id: number | null;
  caption: string;
  images: File[];
}

interface Errors {
  property_id: string;
  room_id: string;
  caption: string;
  image: string[];
}

interface Requirements {
  allowed_formats: string[];
  max_size: string;
  max_size_bytes: number;
  min_images_per_room: number;
  max_images_per_room: number;
  caption_max_length: number;
  notes: string[];
}

interface Property {
  value: number;
  text: string;
}

interface Room {
  value: number;
  text: string;
}

interface ImagePreview {
  url: string;
  file: File;
}

export default defineComponent({
  name: 'RoomImageForm',
  emits: {
    close: (images?: Image[]) => true,
  },
  setup() {
    return {
      router: useRouter(),
      authStore: useAuthStore(),
    };
  },
  data(): {
    form: FormData;
    errors: Errors;
    properties: Property[];
    rooms: Room[];
    loadingProperties: boolean;
    loadingRooms: boolean;
    isSubmitting: boolean;
    imagePreviews: ImagePreview[];
    requirements: Requirements;
    uploadProgress: number;
  } {
    return {
      form: {
        property_id: null,
        room_id: null,
        caption: '',
        images: [],
      },
      errors: {
        property_id: '',
        room_id: '',
        caption: '',
        image: [],
      },
      properties: [],
      rooms: [],
      loadingProperties: false,
      loadingRooms: false,
      isSubmitting: false,
      imagePreviews: [],
      requirements: {
        allowed_formats: ['jpeg', 'jpg', 'png', 'gif'],
        max_size: '10MB (10240KB)',
        max_size_bytes: 10 * 1024 * 1024,
        min_images_per_room: 3,
        max_images_per_room: 8,
        caption_max_length: 255,
        notes: [
          'Images must be unique by filename.',
          'Images will be watermarked with the uploader\'s name.',
          'Only users with admin or agent roles can upload images.',
        ],
      },
      uploadProgress: 0,
    };
  },
  mounted() {
    if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
      this.handleError('You are not logged in. Please log in and try again.', true);
      return;
    }
    this.fetchProperties();
  },
  methods: {
    handleError(message: string, redirectToLogin = false) {
      console.error('Error:', message);
      Swal.fire({
        title: redirectToLogin ? 'Authentication Error!' : 'Error!',
        text: message,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: redirectToLogin,
        confirmButtonText: redirectToLogin ? 'Go to Login' : undefined,
        timer: redirectToLogin ? undefined : 3000,
      }).then((result) => {
        if (redirectToLogin && result.isConfirmed) {
          AuthMiddleware.clearSession();
          this.authStore.clearAuthData();
          this.router.push({ name: 'login' });
        }
      });
      this.isSubmitting = false;
      this.uploadProgress = 0;
    },
    async fetchProperties() {
      console.log('Fetching properties...');
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          requiresAuth: true,
        });
        console.log('Properties response:', response);
        if (response.status !== 200) {
          throw new Error(response.data?.message || 'Failed to fetch properties.');
        }
        this.properties = [];
        for (const property of response.data.data) {
          const roomResponse = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
            method: 'get',
            requiresAuth: true,
            params: { property_id: property.id },
          });
          if (roomResponse.status === 200 && roomResponse.data.data.length) {
            const hasAvailableRoom = await Promise.all(
              roomResponse.data.data.map(async (room: any) => {
                const imageCount = await this.currentImageCount(room.id);
                return imageCount < this.requirements.max_images_per_room;
              })
            );
            if (hasAvailableRoom.some(Boolean)) {
              this.properties.push({
                value: property.id,
                text: property.title || `Property ${property.id}`,
              });
            }
          }
        }
        console.log('Available properties:', this.properties);
        if (!this.properties.length) {
          this.errors.property_id = 'No properties with available rooms for image upload.';
          Swal.fire({
            title: 'Info',
            text: 'No properties available. All rooms have reached the maximum image limit.',
            icon: 'info',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Error fetching properties:', error);
        const errorMessage = error.response?.status === 401
          ? 'Your session has expired or the token is invalid. Please log in again.'
          : error.message.includes('Network Error')
            ? 'Network error: Unable to connect to the server. Please check your internet connection.'
            : error.response?.data?.message || 'Failed to fetch properties.';
        this.errors.property_id = errorMessage;
        this.handleError(errorMessage, error.response?.status === 401);
      } finally {
        this.loadingProperties = false;
      }
    },
    async fetchRooms() {
      console.log('Fetching rooms for property:', this.form.property_id);
      this.form.room_id = null;
      this.rooms = [];
      if (!this.form.property_id) {
        this.errors.room_id = 'Please select a property first.';
        return;
      }
      this.loadingRooms = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          requiresAuth: true,
          params: { property_id: this.form.property_id },
        });
        console.log('Rooms response:', response);
        if (response.status !== 200) {
          throw new Error(response.data?.message || 'Failed to fetch rooms.');
        }
        this.rooms = [];
        for (const room of response.data.data) {
          const imageCount = await this.currentImageCount(room.id);
          if (imageCount < this.requirements.max_images_per_room) {
            this.rooms.push({
              value: room.id,
              text: room.room_number || `Room ${room.id}`,
            });
          }
        }
        console.log('Available rooms:', this.rooms);
        if (!this.rooms.length) {
          this.errors.room_id = 'No rooms available for this property.';
          Swal.fire({
            title: 'Info',
            text: 'No rooms available. All rooms have reached the maximum image limit.',
            icon: 'info',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Error fetching rooms:', error);
        const errorMessage = error.response?.status === 401
          ? 'Your session has expired or the token is invalid. Please log in again.'
          : error.message.includes('Network Error')
            ? 'Network error: Unable to connect to the server. Please check your internet connection.'
            : error.response?.data?.message || 'Failed to fetch rooms.';
        this.errors.room_id = errorMessage;
        this.handleError(errorMessage, error.response?.status === 401);
      } finally {
        this.loadingRooms = false;
      }
    },
    async compressImage(file: File): Promise<File> {
      console.log(`Compressing image: ${file.name}, size: ${file.size} bytes`);
      return new Promise((resolve, reject) => {
        new Compressor(file, {
          quality: 0.6,
          maxWidth: 1920,
          maxHeight: 1080,
          mimeType: file.type,
          success(compressedFile) {
            console.log(`Image compressed: ${file.name}, new size: ${compressedFile.size} bytes`);
            resolve(compressedFile as File);
          },
          error(err) {
            console.error('Compression error:', err);
            reject(new Error(`Failed to compress image: ${file.name}`));
          },
        });
      });
    },
    async handleMultipleFileChange(event: Event) {
      console.log('File input changed');
      this.errors.image = [];
      const input = event.target as HTMLInputElement;
      if (!input.files || !input.files.length) {
        this.errors.image.push('Please select at least one image.');
        this.form.images = [];
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      const files = Array.from(input.files);
      console.log(`Selected ${files.length} files`);
      const allowedTypes = this.requirements.allowed_formats.map((fmt) => `image/${fmt}`);
      const maxSize = this.requirements.max_size_bytes;
      const existingImages = this.form.room_id ? await this.currentImageCount(this.form.room_id) : 0;
      const totalImages = existingImages + files.length;
      console.log(`Existing images: ${existingImages}, new images: ${files.length}, total: ${totalImages}`);
      
      if (totalImages > this.requirements.max_images_per_room) {
        this.errors.image.push(`Cannot add ${files.length} image(s). Maximum of ${this.requirements.max_images_per_room} images per room.`);
        this.form.images = [];
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      if (files.length < this.requirements.min_images_per_room && existingImages === 0) {
        this.errors.image.push(`Please upload at least ${this.requirements.min_images_per_room} images for new rooms.`);
        this.form.images = [];
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      const compressedFiles: File[] = [];
      for (const file of files) {
        console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedTypes.includes(file.type) || !this.requirements.allowed_formats.includes(extension)) {
          this.errors.image.push(`Only ${this.requirements.allowed_formats.join(', ')} files are allowed.`);
          this.form.images = [];
          this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
          this.imagePreviews = [];
          return;
        }
        if (file.size > maxSize) {
          this.errors.image.push('Each image must not exceed 10MB before compression. Try compressing or using a smaller file.');
          this.form.images = [];
          this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
          this.imagePreviews = [];
          return;
        }
        if (file.size > maxSize / 2) {
          Swal.fire({
            title: 'Large File Detected',
            text: 'Your image will be compressed to reduce size, which may affect quality.',
            icon: 'info',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        try {
          const compressedFile = await this.compressImage(file);
          compressedFiles.push(compressedFile);
        } catch (error: any) {
          this.errors.image.push(error.message);
          this.form.images = [];
          this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
          this.imagePreviews = [];
          return;
        }
      }
      this.form.images = compressedFiles;
      this.imagePreviews = compressedFiles.map(file => ({ url: URL.createObjectURL(file), file }));
      this.errors.image = [];
      console.log(`Successfully processed ${compressedFiles.length} images`);
    },
    async currentImageCount(roomId: number): Promise<number> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images`,
          method: 'get',
          requiresAuth: true,
          params: { room_id: roomId },
        });
        return response.status === 200 ? (response.data.data?.[0]?.images?.length || 0) : 0;
      } catch (error: any) {
        console.error('currentImageCount error:', error.message, error.response?.data);
        return 0;
      }
    },
    removePreview(index: number) {
      console.log(`Removing preview at index ${index}`);
      URL.revokeObjectURL(this.imagePreviews[index].url);
      this.form.images.splice(index, 1);
      this.imagePreviews.splice(index, 1);
      this.errors.image = this.form.images.length ? [] : ['Please select at least one image.'];
    },
    async uploadChunk(file: File, chunk: Blob, chunkIndex: number, totalChunks: number, filename: string, propertyId: number, roomId: number, userId: string, caption: string, retryCount = 0): Promise<void> {
      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${filename} (attempt ${retryCount + 1})`);
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunk_index', String(chunkIndex));
      formData.append('total_chunks', String(totalChunks));
      formData.append('filename', filename);
      formData.append('property_id', String(propertyId));
      formData.append('room_id', String(roomId));
      formData.append('user_id', userId);
      formData.append('caption', caption);
      formData.append('session_id', uuidv4());
      
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/chunk`,
          method: 'post',
          data: formData,
          requiresAuth: true,
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              this.uploadProgress = Math.min(100, (chunkIndex / totalChunks) * 100 + (progress / totalChunks));
            }
          },
        });
        
        console.log(`Chunk ${chunkIndex + 1} response:`, response);
        
        if (response.status !== 200 && response.status !== 201) {
          console.error(`Chunk upload failed with status ${response.status}:`, response.data);
          throw new Error(response.data?.message || `Chunk upload failed with status ${response.status}.`);
        }
      } catch (error: any) {
        console.error('Chunk upload error:', {
          filename,
          chunkIndex,
          totalChunks,
          retryCount,
          error: error.message,
          response: error.response?.data,
        });
        
        if (retryCount < 3) {
          console.log(`Retrying chunk upload in ${1000 * (retryCount + 1)}ms`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.uploadChunk(file, chunk, chunkIndex, totalChunks, filename, propertyId, roomId, userId, caption, retryCount + 1);
        }
        
        throw new Error(`Failed to upload chunk for ${filename} after 3 retries: ${error.message}`);
      }
    },
    async submitForm() {
      // Reset errors and validate
      this.errors = { property_id: '', room_id: '', caption: '', image: [] };
      
      if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
        console.error('Authentication error');
        this.handleError('You are not logged in. Please log in and try again.', true);
        return;
      }
      
      // Form validation
      if (!this.form.property_id) {
        console.error('Property ID missing');
        this.errors.property_id = 'Property is required';
      }
      if (!this.form.room_id) {
        console.error('Room ID missing');
        this.errors.room_id = 'Room is required';
      }
      if (!this.form.images.length) {
        console.error('No images selected');
        this.errors.image.push('Please select at least one image.');
      }
      if (this.form.caption && this.form.caption.length > this.requirements.caption_max_length) {
        console.error('Caption too long');
        this.errors.caption = `Caption must not exceed ${this.requirements.caption_max_length} characters`;
      }
      
      // If validation errors exist, stop submission
      const hasErrors = this.errors.property_id !== '' || 
                       this.errors.room_id !== '' || 
                       this.errors.caption !== '' || 
                       this.errors.image.length > 0;
                       
      // console.log('Validation errors:', JSON.parse(JSON.stringify(this.errors)));
      // console.log('Has errors:', hasErrors);
      
      if (hasErrors) {
        console.error('Form validation failed');
        return;
      }
      
      this.isSubmitting = true;
      this.uploadProgress = 0;
      
      try {
        const userProfile = this.authStore.userProfile;
        
        // if (!userProfile?.id) {
        //   console.error('User profile not found');
        //   throw new Error('User profile not found. Please log in again.');
        // }
        
        const chunkSize = 2 * 1024 * 1024; // 2MB chunks
        const uploadedImages: Image[] = [];
                
        for (const [index, image] of this.form.images.entries()) {
          
          const extension = image.name.split('.').pop()?.toLowerCase() || '';
          const filename = `${uuidv4()}_room-testimonials-${index + 1}.${extension}`;
          const totalChunks = Math.ceil(image.size / chunkSize);
                    
          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, image.size);
            const chunk = image.slice(start, end);
                        
            try {
              await this.uploadChunk(image, chunk, i, totalChunks, filename, this.form.property_id!, this.form.room_id!, userProfile.id, this.form.caption);
            } catch (chunkError) {
              throw chunkError;
            }
          }
          
          uploadedImages.push({
            id: index + 1, // Temporary ID
            property_id: this.form.property_id!,
            room_id: this.form.room_id!,
            file_path: `/room_images/${filename}`,
            caption: this.form.caption || null,
            uploader: userProfile.username || 'EagerSky',
            created_at: format(new Date(), 'd MMMM yyyy'),
            updated_at: format(new Date(), 'd MMMM yyyy'),
            user_id: userProfile.id,
          });
          
        }
                
        Swal.fire({
          title: 'Success!',
          text: `${this.form.images.length} room image(s) uploaded successfully.`,
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        
        this.resetForm();
        this.$emit('close', uploadedImages);
      } catch (error: any) {
        const errorMessage = error.response?.status === 413
          ? 'The uploaded data is too large. Please try uploading smaller images or contact support.'
          : error.response?.status === 401
            ? 'Your session has expired or the token is invalid. Please log in again.'
            : error.response?.data?.errors
              ? Object.entries(error.response.data.errors)
                  .map(([key, value]) => [key === 'chunk' ? 'image' : key, Array.isArray(value) ? value[0] : value] as [string, string])
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('; ')
              : error.message || 'Failed to upload room images. Please try again or contact support.';
              
        this.handleError(errorMessage, error.response?.status === 401 || error.message.includes('User profile not found'));
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        this.form.images = [];
      } finally {
        this.isSubmitting = false;
        this.uploadProgress = 0;
      }
    },
    resetForm() {
      console.log('Resetting form');
      this.form = { property_id: null, room_id: null, caption: '', images: [] };
      this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
      this.imagePreviews = [];
      this.errors = { property_id: '', room_id: '', caption: '', image: [] };
      this.uploadProgress = 0;
      this.$emit('close');
    },
  },
});
</script>

<style scoped>
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
/* Container */
.bg-white { background-color: #ffffff; }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
.rounded-lg { border-radius: 0.5rem; }
.p-4 { padding: 1rem; }
.sm\:p-6 { @media (min-width: 640px) { padding: 1.5rem; } }
.max-w-full { max-width: 100%; }
.overflow-x-auto { overflow-x: auto; }
/* Typography */
.text-xl { font-size: 1.25rem; }
.sm\:text-2xl { @media (min-width: 640px) { font-size: 1.5rem; } }
.text-base { font-size: 1rem; }
.sm\:text-lg { @media (min-width: 640px) { font-size: 1.125rem; } }
.text-sm { font-size: 0.875rem; }
.sm\:text-base { @media (min-width: 640px) { font-size: 1rem; } }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
.text-gray-800 { color: #1f2937; }
.text-gray-700 { color: #374151; }
.text-gray-600 { color: #4b5563; }
.text-red-500 { color: #ef4444; }
/* Grid */
.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.sm\:grid-cols-2 { @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); } }
.md\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, 1fr); } }
.md\:grid-cols-3 { @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); } }
.gap-3 { gap: 0.75rem; }
.sm\:gap-4 { @media (min-width: 640px) { gap: 1rem; } }
/* Image Preview Container */
.relative { position: relative; }
.p-2 { padding: 0.5rem; }
.bg-gray-50 { background-color: #f9fafb; }
.rounded { border-radius: 0.25rem; }
.border { border-width: 1px; border-color: #e5e7eb; }
.min-w-0 { min-width: 0; }
/* Images */
.max-h-32 { max-height: 8rem; }
.w-full { width: 100%; }
.object-cover { object-fit: cover; }
.aspect-square { aspect-ratio: 1 / 1; }
/* Delete Button */
.absolute { position: absolute; }
.top-1 { top: 0.25rem; }
.right-1 { right: 0.25rem; }
.z-10 { z-index: 10; }
.text-red-500 { color: #ef4444; }
.hover\:text-red-700:hover { color: #b91c1c; }
.h-5 { height: 1.25rem; }
.w-5 { width: 1.25rem; }
/* Spacing */
.mb-4 { margin-bottom: 1rem; }
.sm\:mb-6 { @media (min-width: 640px) { margin-bottom: 1.5rem; } }
.mt-1 { margin-top: 0.25rem; }
.mt-4 { margin-top: 1rem; }
.space-x-3 > :not(:last-child) { margin-right: 0.75rem; }
.pl-5 { padding-left: 1.25rem; }
/* List */
.list-disc { list-style-type: disc; }
</style>