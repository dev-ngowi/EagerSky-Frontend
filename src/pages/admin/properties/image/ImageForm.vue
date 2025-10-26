<template>
  <div class="form-container">
    <h2 class="form-title">Add New Image</h2>
    <div class="requirements-container">
      <h3 class="requirements-title">Upload Requirements</h3>
      <ul class="requirements-list">
        <li>Allowed formats: {{ requirements.allowed_formats.join(', ') }}</li>
        <li>Maximum size per image: {{ requirements.max_size }}</li>
        <li>Minimum images per property: {{ requirements.min_images_per_property }}</li>
        <li>Maximum images per property: {{ requirements.max_images_per_property }}</li>
        <li>Maximum caption length: {{ requirements.caption_max_length }} characters</li>
        <li v-for="(note, index) in requirements.notes" :key="index">{{ note }}</li>
      </ul>
    </div>
    <form @submit.prevent="submitForm" class="image-form">
      <div class="form-grid">
        <div class="form-field">
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
            aria-label="Select property for image upload"
            class="form-select"
          />
          <p v-if="!properties.length && !loadingProperties" class="error-text">
            No properties available (all have maximum images).
          </p>
        </div>
        <div class="form-field">
          <VaInput
            v-model="form.caption"
            label="Caption"
            placeholder="Enter caption (optional)"
            :error-messages="errors.caption ? [errors.caption] : []"
            :disabled="isSubmitting"
            :maxlength="requirements.caption_max_length"
            aria-label="Enter image caption"
            class="form-input"
          />
        </div>
        <div class="form-field">
          <label class="file-label">Images</label>
          <input
            type="file"
            multiple
            :accept="requirements.allowed_formats.map((fmt) => `image/${fmt}`).join(',')"
            :disabled="isSubmitting || !form.property_id"
            class="file-input"
            @change="handleMultipleFileChange"
            aria-label="Upload images"
          />
          <p v-if="errors.image" class="error-text">{{ errors.image }}</p>
          <div v-if="imagePreviews.length" class="preview-grid">
            <div v-for="(preview, index) in imagePreviews" :key="index" class="preview-item">
              <img
                :src="preview.url"
                :alt="`Image Preview ${index + 1}`"
                class="preview-image"
              />
              <button
                type="button"
                class="remove-button"
                :disabled="isSubmitting"
                @click="removePreview(index)"
                aria-label="Remove image preview"
              >
                <svg class="remove-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div v-if="uploadProgress > 0" class="progress-container">
            <p class="progress-text">Upload Progress: {{ uploadProgress }}%</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <VaButton
          color="secondary"
          :disabled="isSubmitting"
          @click="resetForm"
          class="cancel-button"
          aria-label="Cancel image upload"
        >
          Cancel
        </VaButton>
        <VaButton
          color="#00A3E0"
          type="submit"
          :disabled="isSubmitting || !form.property_id || !form.images.length"
          class="submit-button"
          aria-label="Submit image upload"
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

<style lang="scss" scoped>
.form-container {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 0.75rem;
  max-width: 100%;
  overflow-x: auto;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.form-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #374151;

  @media screen and (min-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
}

.requirements-container {
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
}

.requirements-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
  }
}

.requirements-list {
  list-style: disc;
  padding-left: 1.25rem;
  font-size: 0.75rem;
  color: #4b5563;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.image-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 768px) {
    gap: 0.75rem;
  }
}

.form-field {
  width: 100%;
}

.form-input,
.form-select {
  font-size: 0.875rem;

  :deep(.va-input__label),
  :deep(.va-select__label) {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  :deep(.va-input__input),
  :deep(.va-select__input) {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  :deep(.va-input__error-message),
  :deep(.va-select__error-message) {
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;
  }

  @media screen and (min-width: 768px) {
    font-size: 1rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 1rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.75rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.875rem;
    }
  }
}

.file-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
  }
}

.file-input {
  width: 100%;
  font-size: 0.75rem;
  color: #4b5563;

  &::file-selector-button {
    margin-right: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    background-color: #e0f2fe;
    color: #1e40af;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #bfdbfe;
    }
  }

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;

    &::file-selector-button {
      font-size: 0.875rem;
    }
  }
}

.error-text {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-top: 1rem;
  }

  @media screen and (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.preview-item {
  position: relative;
  padding: 0.5rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  min-width: 0;
}

.preview-image {
  max-height: 8rem;
  width: 100%;
  object-fit: cover;
  border-radius: 0.25rem;
  aspect-ratio: 1/1;
}

.remove-button {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: #b91c1c;
  }
}

.remove-icon {
  width: 1.25rem;
  height: 1.25rem;
  min-width: 40px;
  min-height: 40px;
}

.progress-container {
  margin-top: 0.5rem;
}

.progress-text {
  font-size: 0.75rem;
  color: #4b5563;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.progress-bar {
  width: 100%;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  height: 0.5rem;
  overflow: hidden;
}

.progress-fill {
  background-color: #2563eb;
  height: 100%;
  border-radius: 0.25rem;
  transition: width 0.3s ease-in-out;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    gap: 1rem;
    margin-top: 1rem;
  }
}

.cancel-button,
.submit-button {
  min-height: 40px;
  min-width: 40px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;

  @media screen and (min-width: 768px) {
    width: 1.25rem;
    height: 1.25rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .form-container {
    padding: 0.5rem;
  }

  .form-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .requirements-container {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .requirements-title {
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .requirements-list {
    font-size: 0.625rem;
    padding-left: 1rem;
  }

  .image-form {
    gap: 0.25rem;
  }

  .form-grid {
    gap: 0.25rem;
  }

  .form-input,
  .form-select {
    font-size: 0.75rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.75rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.375rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.625rem;
    }
  }

  .file-label {
    font-size: 0.75rem;
  }

  .file-input {
    font-size: 0.625rem;

    &::file-selector-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.625rem;
    }
  }

  .error-text {
    font-size: 0.625rem;
  }

  .preview-grid {
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .preview-item {
    padding: 0.25rem;
  }

  .preview-image {
    max-height: 6rem;
  }

  .remove-icon {
    width: 1rem;
    height: 1rem;
    min-width: 36px;
    min-height: 36px;
  }

  .progress-text {
    font-size: 0.625rem;
  }

  .progress-bar {
    height: 0.375rem;
  }

  .form-actions {
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .cancel-button,
  .submit-button {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
  }

  .spinner {
    width: 0.875rem;
    height: 0.875rem;
  }
}

@media (max-width: 480px) {
  .form-container {
    padding: 0.25rem;
  }

  .form-title {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .requirements-container {
    padding: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .requirements-title {
    font-size: 0.625rem;
  }

  .requirements-list {
    font-size: 0.5rem;
    padding-left: 0.75rem;
  }

  .form-input,
  .form-select {
    font-size: 0.625rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.625rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.25rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.5rem;
    }
  }

  .file-label {
    font-size: 0.625rem;
  }

  .file-input {
    font-size: 0.5rem;

    &::file-selector-button {
      padding: 0.25rem 0.5rem;
      font-size: 0.5rem;
    }
  }

  .error-text {
    font-size: 0.5rem;
  }

  .preview-image {
    max-height: 5rem;
  }

  .remove-icon {
    width: 0.875rem;
    height: 0.875rem;
    min-width: 32px;
    min-height: 32px;
  }

  .progress-text {
    font-size: 0.5rem;
  }

  .progress-bar {
    height: 0.25rem;
  }

  .form-actions {
    gap: 0.125rem;
    margin-top: 0.25rem;
  }

  .cancel-button,
  .submit-button {
    font-size: 0.5rem;
    padding: 0.2rem 0.4rem;
  }

  .spinner {
    width: 0.75rem;
    height: 0.75rem;
  }
}
</style>
