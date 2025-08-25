<template>
  <div class="p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-full overflow-x-auto">
    <h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Add New Image</h2>
    <div class="mb-6 p-4 bg-gray-100 rounded-lg">
      <h3 class="text-base sm:text-lg font-semibold text-gray-700">Upload Requirements</h3>
      <ul class="list-disc pl-5 text-sm sm:text-base text-gray-600">
        <li>Allowed formats: {{ requirements.allowed_formats.join(', ') }}</li>
        <li>Maximum size per image: {{ requirements.max_size }}</li>
        <li>Minimum images per property: {{ requirements.min_images_per_property }}</li>
        <li>Maximum images per property: {{ requirements.max_images_per_property }}</li>
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
          />
          <p v-if="!properties.length && !loadingProperties" class="text-red-500 text-sm mt-1">
            No properties available (all have maximum images).
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
            :disabled="isSubmitting || !form.property_id"
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            @change="handleMultipleFileChange"
          />
          <p v-if="errors.image" class="text-red-500 text-sm mt-1">{{ errors.image }}</p>
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
          :disabled="isSubmitting || !form.property_id || !form.images.length"
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

// Interfaces for type safety
interface Image {
  id: number;
  property_id: number;
  file_path: string;
  caption: string | null;
  uploader?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface FormData {
  property_id: number | null;
  caption: string;
  images: File[];
}

interface Errors {
  property_id: string;
  caption: string;
  image: string;
}

interface Requirements {
  allowed_formats: string[];
  max_size: string;
  max_size_bytes: number;
  min_images_per_property: number;
  max_images_per_property: number;
  caption_max_length: number;
  notes: string[];
}

interface Property {
  value: number;
  text: string;
}

interface ImagePreview {
  url: string;
  file: File;
}

export default defineComponent({
  name: 'ImageForm',
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
    loadingProperties: boolean;
    isSubmitting: boolean;
    imagePreviews: ImagePreview[];
    requirements: Requirements;
    uploadProgress: number;
  } {
    return {
      form: {
        property_id: null,
        caption: '',
        images: [],
      },
      errors: {
        property_id: '',
        caption: '',
        image: '',
      },
      properties: [],
      loadingProperties: false,
      isSubmitting: false,
      imagePreviews: [],
      requirements: {
        allowed_formats: ['jpeg', 'jpg', 'png'],
        max_size: '10MB (10240KB)',
        max_size_bytes: 10 * 1024 * 1024,
        min_images_per_property: 5,
        max_images_per_property: 10,
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
    },

    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status !== 200) {
          throw new Error(response.data?.message || 'Failed to fetch properties.');
        }

        const properties = response.data.data;
        this.properties = [];
        for (const property of properties) {
          const imageResponse = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images?property_id=${property.id}`,
            method: 'get',
            requiresAuth: true,
          });
          const imageCount = imageResponse.status === 200 ? (imageResponse.data.data?.length || imageResponse.data.data?.images?.length || 0) : 0;
          if (imageCount < this.requirements.max_images_per_property) {
            this.properties.push({
              value: property.id,
              text: property.title || `Property ${property.id}`,
            });
          }
        }

        if (!this.properties.length) {
          this.errors.property_id = 'No properties available for image upload.';
          Swal.fire({
            title: 'Info',
            text: 'No properties available. All properties have reached the maximum image limit.',
            icon: 'info',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        const errorMessage = error.response?.status === 401
          ? 'Your session has expired or the token is invalid. Please log in again.'
          : error.message.includes('Network Error')
            ? 'Network error: Unable to connect to the server. Please check your internet connection.'
            : error.response?.data?.message || error.message || 'Failed to fetch properties.';
        this.handleError(errorMessage, error.response?.status === 401);
      } finally {
        this.loadingProperties = false;
      }
    },

    async compressImage(file: File): Promise<File> {
      return new Promise((resolve, reject) => {
        new Compressor(file, {
          quality: 0.6,
          maxWidth: 1920,
          maxHeight: 1080,
          mimeType: file.type,
          success(compressedFile) {
            resolve(compressedFile as File);
          },
          error(err) {
            reject(err);
          },
        });
      });
    },

    async handleMultipleFileChange(event: Event) {
      this.errors.image = '';
      const input = event.target as HTMLInputElement;
      if (!input.files || !input.files.length) {
        this.form.images = [];
        this.imagePreviews = [];
        this.errors.image = 'Please select at least one image.';
        return;
      }

      const files = Array.from(input.files);
      const allowedTypes = this.requirements.allowed_formats.map((fmt) => `image/${fmt}`);
      const maxSize = this.requirements.max_size_bytes;

      const existingImages = this.form.property_id ? await this.currentImageCount(this.form.property_id) : 0;
      const totalImages = existingImages + files.length;

      if (totalImages > this.requirements.max_images_per_property) {
        this.errors.image = `Cannot add ${files.length} image(s). Maximum of ${this.requirements.max_images_per_property} images per property.`;
        this.form.images = [];
        this.imagePreviews = [];
        return;
      }

      if (files.length < this.requirements.min_images_per_property && existingImages === 0) {
        this.errors.image = `Please upload at least ${this.requirements.min_images_per_property} images for new properties.`;
        this.form.images = [];
        this.imagePreviews = [];
        return;
      }

      const compressedFiles: File[] = [];
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedTypes.includes(file.type) || !this.requirements.allowed_formats.includes(extension)) {
          this.errors.image = `Only ${this.requirements.allowed_formats.join(', ')} files are allowed.`;
          this.form.images = [];
          this.imagePreviews = [];
          return;
        }
        if (file.size > maxSize) {
          this.errors.image = 'Each image must not exceed 10MB before compression.';
          this.form.images = [];
          this.imagePreviews = [];
          return;
        }

        try {
          const compressedFile = await this.compressImage(file);
          compressedFiles.push(compressedFile);
        } catch (error) {
          this.errors.image = `Failed to compress image: ${file.name}`;
          this.form.images = [];
          this.imagePreviews = [];
          return;
        }
      }

      this.form.images = compressedFiles;
      this.imagePreviews = compressedFiles.map((file) => ({ url: URL.createObjectURL(file), file }));
      this.errors.image = '';
    },

    async currentImageCount(propertyId: number): Promise<number> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images?property_id=${propertyId}`,
          method: 'get',
          requiresAuth: true,
        });
        return response.status === 200 ? (response.data.data?.length || response.data.data?.images?.length || 0) : 0;
      } catch (error: any) {
        console.error('currentImageCount error:', error.message, error.response?.data);
        return 0;
      }
    },

    removePreview(index: number) {
      this.form.images.splice(index, 1);
      this.imagePreviews.splice(index, 1);
      this.errors.image = this.form.images.length ? '' : 'Please select at least one image.';
    },

    async uploadChunk(file: File, chunk: Blob, chunkIndex: number, totalChunks: number, filename: string, propertyId: number, userId: string, caption: string, retryCount = 0): Promise<void> {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunk_index', String(chunkIndex));
      formData.append('total_chunks', String(totalChunks));
      formData.append('filename', filename);
      formData.append('property_id', String(propertyId));
      formData.append('user_id', userId);
      formData.append('caption', caption);

      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/chunk`,
          method: 'post',
          data: formData,
          requiresAuth: true,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              this.uploadProgress = Math.min(100, (chunkIndex / totalChunks) * 100 + (progress / totalChunks));
            }
          },
        });

        if (response.status !== 200 && response.status !== 201) {
          throw new Error(response.data?.message || 'Chunk upload failed.');
        }
      } catch (error: any) {
        if (retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.uploadChunk(file, chunk, chunkIndex, totalChunks, filename, propertyId, userId, caption, retryCount + 1);
        }
        throw error;
      }
    },

    async submitForm() {
      this.errors = { property_id: '', caption: '', image: '' };
      if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
        this.handleError('You are not logged in. Please log in and try again.', true);
        return;
      }

      if (!this.form.property_id) {
        this.errors.property_id = 'Property is required';
      }
      if (!this.form.images.length) {
        this.errors.image = 'Please select at least one image.';
      }
      if (this.form.caption && this.form.caption.length > this.requirements.caption_max_length) {
        this.errors.caption = `Caption must not exceed ${this.requirements.caption_max_length} characters`;
      }
      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      this.uploadProgress = 0;
      try {
        const userProfile = this.authStore.userProfile;
        if (!userProfile?.id) {
          throw new Error('User profile not found. Please log in again.');
        }

        const chunkSize = 2 * 1024 * 1024; // 2MB chunks
        const uploadedImages: Image[] = [];

        for (const [index, image] of this.form.images.entries()) {
          const totalChunks = Math.ceil(image.size / chunkSize);
          const filename = `${Date.now()}_testimonials-${index + 1}.${image.name.split('.').pop()}`;

          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, image.size);
            const chunk = image.slice(start, end);
            await this.uploadChunk(image, chunk, i, totalChunks, filename, this.form.property_id!, userProfile.id, this.form.caption);
          }

          uploadedImages.push({
            id: index + 1, // Temporary ID, will be updated by server response
            property_id: this.form.property_id!,
            file_path: `/images/${filename}`,
            caption: this.form.caption || null,
            uploader: userProfile.username || 'EagerSky',
            created_at: format(new Date(), 'd MMMM yyyy'),
            updated_at: format(new Date(), 'd MMMM yyyy'),
            user_id: userProfile.id,
          });
        }

        Swal.fire({
          title: 'Success!',
          text: `${this.form.images.length} image(s) uploaded successfully.`,
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
                  .map(([key, value]) => [key === 'images.0' ? 'image' : key, Array.isArray(value) ? value[0] : value] as [string, string])
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('; ')
              : error.message || 'Failed to upload images.';
        this.handleError(errorMessage, error.response?.status === 401 || error.message.includes('User profile not found'));
      } finally {
        this.isSubmitting = false;
        this.uploadProgress = 0;
      }
    },

    resetForm() {
      this.form = { property_id: null, caption: '', images: [] };
      this.imagePreviews = [];
      this.errors = { property_id: '', caption: '', image: '' };
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
</style>
