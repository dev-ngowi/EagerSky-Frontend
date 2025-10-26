<template>
  <div class="p-6 bg-white shadow-md rounded-lg">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Manage Images for Room {{ roomNumber }}</h2>
   
    <form @submit.prevent="submitForm">
      <!-- Property and Room Info -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <VaInput
          v-model="propertyTitle"
          label="Property"
          :disabled="true"
          class="w-full"
        />
        <VaInput
          v-model="roomNumber"
          label="Room"
          :disabled="true"
          class="w-full"
        />
      </div>
      <!-- Current Images -->
      <div class="mb-6">
        <p class="text-lg font-medium text-gray-700 mb-2">
          Current Images ({{ currentImages.length }}/{{ requirements.max_images_per_room }})
        </p>
        <div v-if="currentImages.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div
            v-for="(img, index) in currentImages"
            :key="img.id"
            class="relative p-2 bg-gray-50 rounded-lg border"
            :class="{ 'border-blue-500': replaceImageId === img.id, 'border-red-500': imagesToDelete.includes(img.id) }"
          >
            <img
              :src="getImageUrl(img.file_path)"
              :alt="img.caption || `Image ${index + 1}`"
              class="h-32 w-full object-cover rounded"
              @error="handleImageError($event, img)"
            />
            <div class="mt-2 flex items-center space-x-2">
              <label class="flex items-center text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="imagesToDelete"
                  :value="img.id"
                  :disabled="isSubmitting"
                  class="mr-1"
                />
                Delete
              </label>
              <label class="flex items-center text-sm text-gray-600 cursor-pointer">
                <input
                  type="radio"
                  name="replace"
                  :value="img.id"
                  :checked="replaceImageId === img.id"
                  :disabled="isSubmitting"
                  @change="selectImageToReplace(img)"
                  class="mr-1"
                />
                Replace
              </label>
            </div>
            <VaInput
              v-model="img.caption"
              label="Caption"
              class="mt-2"
              :disabled="isSubmitting"
              :maxlength="requirements.caption_max_length"
              :error-messages="errors[`caption_${img.id}`] ? [errors[`caption_${img.id}`]] : []"
              @update:modelValue="updateImageCaption(img)"
            />
          </div>
        </div>
        <p v-else class="text-gray-500 text-sm">No images for this room.</p>
      </div>
      <!-- New/Replace Images -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ replaceImageId ? `Replace Image (ID: ${replaceImageId})` : 'Add New Images' }}
        </label>
        <input
          type="file"
          ref="fileInput"
          :multiple="!replaceImageId"
          :accept="requirements.allowed_formats.map((fmt) => `image/${fmt}`).join(',')"
          :disabled="isSubmitting || (!replaceImageId && currentImages.length - imagesToDelete.length >= requirements.max_images_per_room)"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          @change="handleFileChange"
        />
        <p v-if="errors.images" class="text-red-500 text-sm mt-1">{{ errors.images }}</p>
        <p v-if="!replaceImageId && currentImages.length - imagesToDelete.length >= requirements.max_images_per_room" class="text-red-500 text-sm mt-1">
          Maximum number of images reached. To add a new one, please delete or replace an existing image.
        </p>
        <div v-if="!replaceImageId" class="mt-4">
          <VaInput
            v-model="newImageCaption"
            label="Caption for New Images"
            placeholder="Enter caption (optional)"
            :disabled="isSubmitting"
            :maxlength="requirements.caption_max_length"
            :error-messages="errors.newImageCaption ? [errors.newImageCaption] : []"
            class="w-full"
          />
        </div>
        <div v-if="imagePreviews.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          <div v-for="(preview, index) in imagePreviews" :key="index" class="relative p-2 bg-gray-50 rounded-lg border">
            <img
              :src="preview.url"
              :alt="`Preview ${index + 1}`"
              class="h-32 w-full object-cover rounded"
            />
            <button
              type="button"
              class="absolute top-1 right-1 text-red-500 hover:text-red-700"
              @click="removePreview(index)"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <!-- Progress Bar -->
      <div v-if="isSubmitting && uploadProgress > 0" class="mb-6">
        <p class="text-sm text-gray-600">Uploading: {{ uploadProgress }}%</p>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div
            class="bg-blue-600 h-2.5 rounded-full"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>
      <!-- Form Actions -->
      <div class="flex justify-end space-x-3 mt-6">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Cancel</VaButton>
        <VaButton
          color="#00A3E0"
          type="submit"
          :disabled="isSubmitting || (!imagePreviews.length && !imagesToDelete.length && !updatedCaptions.length)"
        >
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Save Changes</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import { cloneDeep } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import { useAuthStore } from '../../../../stores/auth-store';
import { AuthMiddleware } from '../../../../utils/authMiddleware';
import Compressor from 'compressorjs';
import { v4 as uuidv4 } from 'uuid';
import { AxiosProgressEvent } from 'axios';
// Interfaces
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
interface Requirements {
  allowed_formats: string[];
  max_size: string;
  max_size_bytes: number;
  max_images_per_room: number;
  min_images_per_room: number;
  caption_max_length: number;
  notes: string[];
}
interface Errors {
  images: string;
  newImageCaption: string;
  [key: string]: string;
}
interface ImagePreview {
  url: string;
  file: File;
}
export default defineComponent({
  name: 'RoomImageEdit',
  props: {
    propertyId: {
      type: [Number, null] as PropType<number | null>,
      required: true,
    },
    propertyTitle: {
      type: String,
      required: true,
    },
    roomId: {
      type: Number,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    initialImages: {
      type: Array as PropType<Image[]>,
      required: false,
      default: () => [],
      validator: (images: Image[]) => {
        return images.every(img =>
          typeof img.id === 'number' &&
          typeof img.property_id === 'number' &&
          typeof img.room_id === 'number' &&
          typeof img.file_path === 'string' &&
          (img.caption === null || typeof img.caption === 'string') &&
          (img.user_id === undefined || typeof img.user_id === 'string')
        );
      },
    },
  },
  emits: ['close', 'submit'],
  setup() {
    return {
      fileInput: ref<HTMLInputElement | null>(null),
      router: useRouter(),
      authStore: useAuthStore(),
    };
  },
  data(): {
    isSubmitting: boolean;
    loadingImages: boolean;
    errors: Errors;
    currentImages: Image[];
    imagesToDelete: number[];
    updatedCaptions: { id: number; caption: string | null }[];
    replaceImageId: number | null;
    imagePreviews: ImagePreview[];
    failedImages: Set<string>;
    newImageCaption: string;
    requirements: Requirements;
    uploadProgress: number;
  } {
    return {
      isSubmitting: false,
      loadingImages: false,
      errors: { images: '', newImageCaption: '' },
      currentImages: [],
      imagesToDelete: [],
      updatedCaptions: [],
      replaceImageId: null,
      imagePreviews: [],
      failedImages: new Set<string>(),
      newImageCaption: '',
      requirements: {
        allowed_formats: ['jpeg', 'jpg', 'png', 'gif'],
        max_size: '10MB (10240KB)',
        max_size_bytes: 10 * 1024 * 1024,
        max_images_per_room: 8,
        min_images_per_room: 3,
        caption_max_length: 255,
        notes: [
          'Images must be unique by filename.',
          'Images will be watermarked with the uploader’s name.',
          'Only users with admin or agent roles can upload images.',
        ],
      },
      uploadProgress: 0,
    };
  },
  watch: {
    initialImages: {
      handler(newImages) {
        if (Array.isArray(newImages)) {
          const newImagesJSON = JSON.stringify(newImages);
          const currentImagesJSON = JSON.stringify(this.currentImages);
          if (newImagesJSON !== currentImagesJSON) {
            this.currentImages = cloneDeep(newImages.map(img => ({
              ...img,
              user_id: img.user_id,
            })));
            this.resetFormState();
          }
        } else {
          console.warn('Invalid initialImages received:', newImages);
          this.currentImages = [];
          this.resetFormState();
        }
      },
      immediate: true,
      deep: true,
    },
  },
  async created() {
    if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
      this.handleError('You are not logged in. Please log in and try again.', true);
      return;
    }
    await this.fetchRequirements();
    if (!this.initialImages || this.initialImages.length === 0) {
      await this.fetchImages();
    }
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
    async fetchRequirements() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/requirements`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.requirements = response.data.requirements;
        }
      } catch (error: any) {
        this.handleError(error.response?.data?.message || 'Failed to fetch upload requirements.');
      }
    },
    async fetchImages() {
      this.loadingImages = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images`,
          method: 'get',
          params: { room_id: this.roomId },
          requiresAuth: true,
        });
        if (response.status === 200) {
          const images = Array.isArray(response.data.data)
            ? response.data.data[0]?.images || []
            : response.data.data.images || [];
         
          this.currentImages = images
            .filter((image: any) => image.room_id === this.roomId)
            .map((image: any) => ({
              id: image.id,
              property_id: image.property_id,
              room_id: image.room_id,
              file_path: image.file_path,
              caption: image.caption || null,
              uploader: image.uploader || 'EagerSky',
              created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
              updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
              user_id: image.user_id,
            }));
         
          if (this.currentImages.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No images found for this room. Add some images to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }
      } catch (error: any) {
        const errorMessage = error.response?.status === 401
          ? 'Your session has expired or the token is invalid. Please log in again.'
          : error.message.includes('Network Error')
            ? 'Network error: Unable to connect to the server. Please check your internet connection.'
            : error.response?.data?.message || 'Failed to fetch room images.';
        this.handleError(errorMessage, error.response?.status === 401);
      } finally {
        this.loadingImages = false;
      }
    },
    resetFormState() {
      this.imagesToDelete = [];
      this.updatedCaptions = [];
      this.replaceImageId = null;
      this.imagePreviews = [];
      this.newImageCaption = '';
      this.errors = { images: '', newImageCaption: '' };
      this.uploadProgress = 0;
      if (this.fileInput) {
        this.fileInput.value = '';
      }
    },
    getImageUrl(filePath: string): string {
      const baseUrl = import.meta.env.VITE_APP_API_BASE_URL.replace(/\/api$/, '');
      return `${baseUrl}/${filePath.replace(/^\/+/, '')}`;
    },
    handleImageError(event: Event, image: Image) {
      const target = event.target as HTMLImageElement;
      const defaultImage = `${import.meta.env.VITE_APP_API_BASE_URL.replace(/\/api$/, '')}/images/default.jpg`;
      if (!this.failedImages.has(image.file_path) && target.src !== defaultImage) {
        this.failedImages.add(image.file_path);
        target.src = defaultImage;
      } else if (target.src === defaultImage) {
        target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
      }
    },
    selectImageToReplace(image: Image) {
      if (this.replaceImageId === image.id) {
        this.replaceImageId = null;
        this.imagePreviews = [];
      } else {
        this.replaceImageId = image.id;
        this.imagesToDelete = this.imagesToDelete.filter(id => id !== image.id);
        this.imagePreviews = [];
      }
      if (this.fileInput) {
        this.fileInput.value = '';
      }
      this.errors.images = '';
    },
    updateImageCaption(image: Image) {
      const existing = this.updatedCaptions.find(uc => uc.id === image.id);
      if (existing) {
        existing.caption = image.caption;
      } else {
        this.updatedCaptions.push({ id: image.id, caption: image.caption });
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
    async handleFileChange(event: Event) {
      this.errors.images = '';
      const input = event.target as HTMLInputElement;
      if (!input.files || !input.files.length) {
        this.errors.images = this.replaceImageId
          ? 'Please select an image to replace.'
          : 'Please select at least one image.';
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      const maxSize = this.requirements.max_size_bytes;
      const allowedTypes = this.requirements.allowed_formats.map(fmt => `image/${fmt}`);
      const allowedExtensions = this.requirements.allowed_formats;
      const newImageCount = input.files.length;
      const currentImageCount = this.currentImages.length - (this.replaceImageId ? 1 : this.imagesToDelete.length);
      // Check if adding new images would exceed the maximum limit
      if (!this.replaceImageId && currentImageCount + newImageCount > this.requirements.max_images_per_room) {
        this.errors.images = `Cannot add ${newImageCount} image(s). Maximum of ${this.requirements.max_images_per_room} images per room. Only ${this.requirements.max_images_per_room - currentImageCount} more image(s) can be added.`;
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      if (this.replaceImageId && newImageCount > 1) {
        this.errors.images = 'Only one image can be selected for replacement.';
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      const compressedFiles: File[] = [];
      for (const file of Array.from(input.files)) {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(extension)) {
          this.errors.images = `Only ${allowedExtensions.join(', ')} files are allowed.`;
          this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
          this.imagePreviews = [];
          return;
        }
        if (file.size > maxSize) {
          this.errors.images = 'Each image must not exceed 10MB before compression.';
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
          this.errors.images = error.message;
          this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
          this.imagePreviews = [];
          return;
        }
      }
      this.imagePreviews = compressedFiles.map(file => ({ url: URL.createObjectURL(file), file }));
      this.errors.images = '';
      console.log(`Successfully processed ${compressedFiles.length} images`);
    },
    removePreview(index: number) {
      URL.revokeObjectURL(this.imagePreviews[index].url);
      this.imagePreviews.splice(index, 1);
      if (!this.imagePreviews.length && !this.imagesToDelete.length && !this.updatedCaptions.length) {
        this.errors.images = 'Please select images to add, replace, delete, or update captions.';
      }
    },
    async uploadChunk(
      file: File,
      chunk: Blob,
      chunkIndex: number,
      totalChunks: number,
      filename: string,
      propertyId: number,
      roomId: number,
      userId: string,
      caption: string,
      retryCount = 0
    ): Promise<any> {
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
          throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Chunk upload failed.'}`);
        }
        return response;
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
      if (this.isSubmitting) return;
      this.errors = { images: '', newImageCaption: '' };
      this.updatedCaptions.forEach(({ id }) => {
        this.errors[`caption_${id}`] = '';
      });
      if (!this.imagePreviews.length && !this.imagesToDelete.length && !this.updatedCaptions.length) {
        this.errors.images = 'Please select images to add, replace, delete, or update captions.';
        return;
      }
      if (this.newImageCaption && this.newImageCaption.length > this.requirements.caption_max_length) {
        this.errors.newImageCaption = `Caption must not exceed ${this.requirements.caption_max_length} characters`;
        return;
      }
      if (this.updatedCaptions.some(({ caption }) => caption && caption.length > this.requirements.caption_max_length)) {
        this.updatedCaptions.forEach(({ id, caption }) => {
          if (caption && caption.length > this.requirements.caption_max_length) {
            this.errors[`caption_${id}`] = `Caption must not exceed ${this.requirements.caption_max_length} characters`;
          }
        });
        return;
      }
      if (this.propertyId === null) {
        this.handleError('Property ID is required to proceed.');
        return;
      }
      if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
        this.handleError('You are not logged in. Please log in and try again.', true);
        return;
      }
      this.isSubmitting = true;
      this.uploadProgress = 0;
      try {
        const userProfile = this.authStore.userProfile;
        if (!userProfile?.id) {
          throw new Error('User profile not found. Please log in again.');
        }
        console.log('Submitting form with user_id:', userProfile.id);
        // Handle image deletion
        if (this.imagesToDelete.length) {
          await this.deleteImages(userProfile.id);
        }
        // Handle caption updates
        if (this.updatedCaptions.length) {
          await this.updateCaptions(userProfile.id);
        }
        // Handle image replacement or addition
        if (this.imagePreviews.length) {
          if (this.replaceImageId) {
            await this.replaceImage(userProfile.id);
          } else {
            await this.addImages(userProfile.id);
          }
        }
        Swal.fire({
          title: 'Success!',
          text: 'Room images updated successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.$emit('submit');
        this.$emit('close');
      } catch (error: any) {
        const errorMessage = error.response?.status === 413
          ? 'The uploaded data is too large. Please try uploading smaller images or contact support.'
          : error.response?.status === 401
            ? 'Your session has expired or the token is invalid. Please log in again.'
            : error.response?.status === 422
              ? error.response?.data?.message || 'Validation error: Please check your input and try again.'
              : error.response?.status === 500
                ? error.response?.data?.message || 'Server error: Failed to process the request. Please try again or contact support.'
                : error.response?.data?.errors
                  ? Object.entries(error.response.data.errors)
                      .map(([key, value]) => [key === 'images.0' ? 'images' : key, Array.isArray(value) ? value[0] : value])
                      .filter(Boolean)
                      .join('; ')
                  : error.message || 'Failed to update room images.';
        console.error('Submission error:', error.response?.data || error.message);
        this.handleError(errorMessage, error.response?.status === 401 || error.message.includes('User profile not found'));
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
      } finally {
        this.isSubmitting = false;
        this.uploadProgress = 0;
        if (this.fileInput) {
          this.fileInput.value = '';
        }
      }
    },
    async deleteImages(userId: string) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/bulk-delete`,
          method: 'post',
          data: { ids: this.imagesToDelete, user_id: userId },
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.currentImages = this.currentImages.filter(img => !this.imagesToDelete.includes(img.id));
          this.imagesToDelete = [];
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to delete images.');
      }
    },
    async updateCaptions(userId: string) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/bulk-update`,
          method: 'post',
          data: { updates: this.updatedCaptions, user_id: userId },
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.currentImages = this.currentImages.map(img => {
            const updated = this.updatedCaptions.find(uc => uc.id === img.id);
            return updated ? { ...img, caption: updated.caption } : img;
          });
          this.updatedCaptions = [];
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to update captions.');
      }
    },
    async replaceImage(userId: string) {
      if (!this.replaceImageId || !this.imagePreviews.length || this.propertyId === null) {
        throw new Error('Missing required data for image replacement.');
      }
      const file = this.imagePreviews[0].file;
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const filename = `${uuidv4()}_room-testimonial-replace.${extension}`;
      const chunkSize = 2 * 1024 * 1024; // 2MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        await this.uploadChunk(file, chunk, i, totalChunks, filename, this.propertyId, this.roomId, userId, this.newImageCaption || '');
      }
      // Prepare payload for replace request
      const payload = {
        filename,
        property_id: this.propertyId,
        room_id: this.roomId,
        user_id: userId,
        caption: this.newImageCaption || '',
      };
      console.log('Sending replace request with payload:', payload); // Debug payload
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/${this.replaceImageId}/replace`,
          method: 'post',
          data: payload,
          requiresAuth: true,
        });
        if (response.status === 200) {
          const updatedImage = response.data.data;
          this.currentImages = this.currentImages.map(img =>
            img.id === this.replaceImageId
              ? {
                  ...img,
                  file_path: updatedImage.file_path,
                  caption: updatedImage.caption || null,
                  updated_at: updatedImage.updated_at ? format(new Date(updatedImage.updated_at), 'd MMMM yyyy') : 'None',
                  user_id: updatedImage.user_id,
                }
              : img
          );
          this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
          this.imagePreviews = [];
          this.replaceImageId = null;
          this.newImageCaption = '';
        }
      } catch (error: any) {
        console.error('Replace request failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to replace image.');
      }
    },
    async addImages(userId: string) {
      if (this.propertyId === null) return;
      const chunkSize = 2 * 1024 * 1024; // 2MB chunks
      const newImages: Image[] = [];
      const availableSlots = this.requirements.max_images_per_room - (this.currentImages.length - this.imagesToDelete.length);
      if (this.imagePreviews.length > availableSlots) {
        this.errors.images = `Cannot add ${this.imagePreviews.length} image(s). Only ${availableSlots} more image(s) can be added to reach the maximum of ${this.requirements.max_images_per_room}.`;
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
        return;
      }
      for (const [index, preview] of this.imagePreviews.entries()) {
        const file = preview.file;
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const filename = `${uuidv4()}_room-testimonial-${index + 1}.${extension}`;
        const totalChunks = Math.ceil(file.size / chunkSize);
        let lastResponse: any = null;
        try {
          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);
            lastResponse = await this.uploadChunk(
              file,
              chunk,
              i,
              totalChunks,
              filename,
              this.propertyId,
              this.roomId,
              userId,
              this.newImageCaption || ''
            );
          }
          if (lastResponse.status === 201) {
            const image = lastResponse.data.data;
            newImages.push({
              id: image.id,
              property_id: image.property_id,
              room_id: image.room_id,
              file_path: image.file_path,
              caption: image.caption || null,
              uploader: image.uploader || 'EagerSky',
              created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
              updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
              user_id: image.user_id,
            });
          }
        } catch (error: any) {
          console.error(`Failed to upload image ${filename}:`, error.message);
          throw new Error(`Failed to upload image ${index + 1}: ${error.message}`);
        }
      }
      this.currentImages.push(...newImages);
      this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
      this.imagePreviews = [];
      this.newImageCaption = '';
    },
  },
});
</script>
<style scoped>
/* Container */
.p-6 {
  padding: 1.5rem;
}
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
/* Typography */
.text-2xl {
  font-size: 1.5rem;
}
.text-lg {
  font-size: 1.125rem;
}
.text-sm {
  font-size: 0.875rem;
}
.font-bold {
  font-weight: 700;
}
.font-medium {
  font-weight: 500;
}
.text-gray-800 {
  color: #1f2937;
}
.text-gray-700 {
  color: #374151;
}
.text-gray-600 {
  color: #4b5563;
}
.text-gray-500 {
  color: #6b7280;
}
.text-red-500 {
  color: #ef4444;
}
.text-blue-700 {
  color: #1d4ed8;
}
.text-red-700 {
  color: #b91c1c;
}
/* Grid */
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: repeat(1, 1fr);
}
.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}
.sm\:grid-cols-3 {
  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}
.md\:grid-cols-4 {
  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
}
.gap-4 {
  gap: 1rem;
}
/* Image Container */
.relative {
  position: relative;
}
.p-2 {
  padding: 0.5rem;
}
.bg-gray-50 {
  background-color: #f9fafb;
}
.rounded {
  border-radius: 0.25rem;
}
.border {
  border-width: 1px;
  border-color: #e5e7eb;
}
.border-blue-500 {
  border-color: #3b82f6;
}
.border-red-500 {
  border-color: #ef4444;
}
.h-32 {
  height: 8rem;
}
.w-full {
  width: 100%;
}
.object-cover {
  object-fit: cover;
}
/* Inputs and Labels */
.cursor-pointer {
  cursor: pointer;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-6 {
  margin-bottom: 1.5rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.mr-1 {
  margin-right: 0.25rem;
}
/* File Input */
.file\:mr-4::file-selector-button {
  margin-right: 1rem;
}
.file\:py-2::file-selector-button {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.file\:px-4::file-selector-button {
  padding-left: 1rem;
  padding-right: 1rem;
}
.file\:rounded::file-selector-button {
  border-radius: 0.25rem;
}
.file\:border-0::file-selector-button {
  border-width: 0;
}
.file\:text-sm::file-selector-button {
  font-size: 0.875rem;
}
.file\:font-semibold::file-selector-button {
  font-weight: 600;
}
.file\:bg-blue-50::file-selector-button {
  background-color: #eff6ff;
}
.file\:text-blue-700::file-selector-button {
  color: #1d4ed8;
}
.hover\:file\:bg-blue-100:hover::file-selector-button {
  background-color: #dbeafe;
}
/* Delete Button */
.absolute {
  position: absolute;
}
.top-1 {
  top: 0.25rem;
}
.right-1 {
  right: 0.25rem;
}
.h-5 {
  height: 1.25rem;
}
.w-5 {
  width: 1.25rem;
}
/* Form Actions */
.flex {
  display: flex;
}
.justify-end {
  justify-content: flex-end;
}
.space-x-3 > :not(:last-child) {
  margin-right: 0.75rem;
}
/* Spinner */
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
/* Progress Bar */
.bg-gray-200 {
  background-color: #e5e7eb;
}
.rounded-full {
  border-radius: 9999px;
}
.h-2\.5 {
  height: 0.625rem;
}
.bg-blue-600 {
  background-color: #2563eb;
}
</style>