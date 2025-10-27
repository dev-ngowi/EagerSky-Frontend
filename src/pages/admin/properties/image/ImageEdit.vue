<template>
  <div class="form-container">
    <h2 class="form-title">Manage Images for {{ propertyTitle }}</h2>
    
    <form @submit.prevent="submitForm" class="image-form">
      <!-- Property Title -->
      <div class="form-field">
        <VaInput
          v-model="propertyTitle"
          label="Property"
          :disabled="true"
          class="form-input"
          aria-label="Property title (read-only)"
        />
      </div>
      <!-- Current Images -->
      <div class="form-field">
        <p class="section-title">
          Current Images ({{ currentImages.length }}/{{ requirements.max_images_per_property }})
        </p>
        <div v-if="currentImages.length" class="image-grid">
          <div
            v-for="(img, index) in currentImages"
            :key="img.id"
            class="image-item"
            :class="{ 'border-blue-500': replaceImageId === img.id, 'border-red-500': imagesToDelete.includes(img.id) }"
          >
            <img
              :src="getImageUrl(img.file_path)"
              :alt="img.caption || `Image ${index + 1}`"
              class="image-preview"
              @error="handleImageError($event, img)"
            />
            <div class="image-actions">
              <label class="action-label">
                <input
                  type="checkbox"
                  v-model="imagesToDelete"
                  :value="img.id"
                  :disabled="isSubmitting"
                  class="action-checkbox"
                  :aria-label="`Delete image ${index + 1}`"
                />
                Delete
              </label>
              <label class="action-label">
                <input
                  type="radio"
                  name="replace"
                  :value="img.id"
                  :checked="replaceImageId === img.id"
                  :disabled="isSubmitting"
                  @change="selectImageToReplace(img)"
                  class="action-radio"
                  :aria-label="`Replace image ${index + 1}`"
                />
                Replace
              </label>
            </div>
            <VaInput
              v-model="img.caption"
              label="Caption"
              class="form-input caption-input"
              :disabled="isSubmitting"
              :maxlength="requirements.caption_max_length"
              :error-messages="errors[`caption_${img.id}`] ? [errors[`caption_${img.id}`]] : []"
              @update:modelValue="updateImageCaption(img)"
              :aria-label="`Edit caption for image ${index + 1}`"
            />
          </div>
        </div>
        <p v-else class="no-images-text">No images for this property.</p>
      </div>
      <!-- New/Replace Images -->
      <div class="form-field">
        <label class="file-label">
          {{ replaceImageId ? `Replace Image (ID: ${replaceImageId})` : 'Add New Images' }}
        </label>
        <input
          type="file"
          ref="fileInput"
          :multiple="!replaceImageId"
          :accept="requirements.allowed_formats.map((fmt) => `image/${fmt}`).join(',')"
          :disabled="isSubmitting || (!replaceImageId && currentImages.length >= requirements.max_images_per_property)"
          class="file-input"
          @change="handleFileChange"
          :aria-label="replaceImageId ? `Replace image with ID ${replaceImageId}` : 'Add new images'"
        />
        <p v-if="errors.images" class="error-text">{{ errors.images }}</p>
        <p v-if="!replaceImageId && currentImages.length >= requirements.max_images_per_property" class="error-text">
          Maximum number of images reached. To add a new one, please delete or replace an existing image.
        </p>
        <div v-if="!replaceImageId" class="form-field">
          <VaInput
            v-model="newImageCaption"
            label="Caption for New Images"
            placeholder="Enter caption (optional)"
            :disabled="isSubmitting"
            :maxlength="requirements.caption_max_length"
            :error-messages="errors.newImageCaption ? [errors.newImageCaption] : []"
            class="form-input"
            aria-label="Enter caption for new images"
          />
        </div>
        <div v-if="imagePreviews.length" class="preview-grid">
          <div v-for="(preview, index) in imagePreviews" :key="index" class="preview-item">
            <img
              :src="preview.url"
              :alt="`Preview ${index + 1}`"
              class="preview-image"
            />
            <button
              type="button"
              class="remove-button"
              @click="removePreview(index)"
              :aria-label="`Remove image preview ${index + 1}`"
            >
              <svg class="remove-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <!-- Form Actions -->
      <div class="form-actions">
        <VaButton
          color="secondary"
          :disabled="isSubmitting"
          @click="$emit('close')"
          class="cancel-button"
          aria-label="Cancel image editing"
        >
          Cancel
        </VaButton>
        <VaButton
          color="#00A3E0"
          type="submit"
          :disabled="isSubmitting || (!imagePreviews.length && !imagesToDelete.length && !updatedCaptions.length)"
          class="submit-button"
          aria-label="Save image changes"
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
import { format } from 'date-fns';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../../stores/auth-store';
import { AuthMiddleware } from '../../../../utils/authMiddleware';

// Interfaces
interface Image {
  id: number;
  property_id: number;
  file_path: string;
  caption: string | null;
  uploader?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string; // Changed to string to align with Images.vue
}

interface Requirements {
  allowed_formats: string[];
  max_size: string;
  max_images_per_property: number;
  min_images_per_property: number;
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
  name: 'ImageEdit',
  props: {
    propertyId: {
      type: Number,
      required: true,
    },
    propertyTitle: {
      type: String,
      required: true,
    },
    initialImages: {
      type: Array as PropType<Image[]>,
      required: true,
      default: () => [],
      validator: (images: Image[]) => {
        return images.every(img =>
          typeof img.id === 'number' &&
          typeof img.property_id === 'number' &&
          typeof img.file_path === 'string' &&
          (img.caption === null || typeof img.caption === 'string') &&
          (img.user_id === undefined || typeof img.user_id === 'string') // Changed to string
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
        max_images_per_property: 10,
        min_images_per_property: 5,
        caption_max_length: 255,
        notes: [
          'Images must be unique by filename.',
          'Images will be watermarked with the uploader’s name.',
          'Only users with admin or agent roles can upload images.',
        ],
      },
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
              user_id: img.user_id ? String(img.user_id) : undefined, // Ensure string
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
    },
    async fetchImages() {
      this.loadingImages = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images`,
          method: 'get',
          params: { property_id: this.propertyId },
          requiresAuth: true,
        });
        console.log('fetchImages response:', response);
        if (response.status === 200) {
          const images = Array.isArray(response.data.data)
            ? response.data.data
            : response.data.data?.images || [];
          
          this.currentImages = images
            .filter((image: any) => image.property_id === this.propertyId)
            .map((image: any) => ({
              id: image.id,
              property_id: image.property_id,
              file_path: image.file_path,
              caption: image.caption || null,
              uploader: image.uploader || 'EagerSky',
              created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
              updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
              user_id: image.user_id ? String(image.user_id) : undefined, // Changed to string
            }));
          
          if (this.currentImages.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No images found for this property. Add some images to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch images.');
        }
      } catch (error: any) {
        const errorMessage = error.response?.status === 401
          ? 'Your session has expired or the token is invalid. Please log in again.'
          : error.message.includes('Network Error')
            ? 'Network error: Unable to connect to the server. Please check your internet connection.'
            : error.response?.data?.message || error.message || 'Failed to fetch images.';
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
      this.errors[`caption_${image.id}`] = '';
      if (image.caption && image.caption.length > this.requirements.caption_max_length) {
        this.errors[`caption_${image.id}`] = `Caption must not exceed ${this.requirements.caption_max_length} characters`;
        return;
      }
      const initialImage = this.initialImages.find(img => img.id === image.id);
      if (initialImage && initialImage.caption !== image.caption) {
        const existingUpdate = this.updatedCaptions.find(uc => uc.id === image.id);
        if (existingUpdate) {
          existingUpdate.caption = image.caption;
        } else {
          this.updatedCaptions.push({ id: image.id, caption: image.caption });
        }
      }
    },
    async handleFileChange(event: Event) {
      this.errors.images = '';
      const input = event.target as HTMLInputElement;
      if (!input.files || !input.files.length) {
        this.errors.images = this.replaceImageId
          ? 'Please select an image to replace.'
          : 'Please select at least one image.';
        this.imagePreviews = [];
        return;
      }

      const maxSizePerFile = 10 * 1024 * 1024; // 10MB per file
      const maxTotalSize = 15 * 1024 * 1024; // 15MB total payload
      const allowedTypes = this.requirements.allowed_formats.map(fmt => `image/${fmt}`);
      const allowedExtensions = this.requirements.allowed_formats;
      const newImageCount = input.files.length;
      const totalImages = this.currentImages.length + newImageCount - (this.replaceImageId ? 1 : this.imagesToDelete.length);
      let totalSize = 0;

      if (this.replaceImageId && newImageCount > 1) {
        this.errors.images = 'Only one image can be selected for replacement.';
        this.imagePreviews = [];
        return;
      }

      if (!this.replaceImageId && totalImages > this.requirements.max_images_per_property) {
        this.errors.images = `Cannot add ${newImageCount} image(s). Maximum of ${this.requirements.max_images_per_property} images per property.`;
        this.imagePreviews = [];
        return;
      }

      const previews: ImagePreview[] = [];
      for (const file of Array.from(input.files)) {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        totalSize += file.size;

        if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(extension)) {
          this.errors.images = `Only ${allowedExtensions.join(', ')} files are allowed.`;
          this.imagePreviews = [];
          return;
        }

        if (file.size > maxSizePerFile) {
          this.errors.images = 'Each image must not exceed 10MB.';
          this.imagePreviews = [];
          return;
        }

        previews.push({ url: URL.createObjectURL(file), file });
      }

      if (!this.replaceImageId && totalSize > maxTotalSize) {
        this.errors.images = 'Total size of images exceeds 15MB. Please select smaller files or fewer images.';
        this.imagePreviews = [];
        return;
      }

      this.imagePreviews = previews;
    },
    removePreview(index: number) {
      this.imagePreviews.splice(index, 1);
      if (!this.imagePreviews.length) {
        this.errors.images = 'Please select at least one image.';
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

      if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
        this.handleError('You are not logged in. Please log in and try again.', true);
        return;
      }

      this.isSubmitting = true;
      try {
        const userProfile = this.authStore.userProfile;
        if (!userProfile?.id) {
          throw new Error('User profile not found. Please log in again.');
        }

        console.log('Submitting form with user_id:', userProfile.id);

        // Handle Deletions
        if (this.imagesToDelete.length) {
          const response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/bulk-delete`,
            method: 'post',
            data: { ids: this.imagesToDelete },
            requiresAuth: true,
          });
          if (response.status === 200) {
            this.currentImages = this.currentImages.filter(img => !this.imagesToDelete.includes(img.id));
            this.imagesToDelete = [];
          }
        }

        // Handle Caption Updates
        if (this.updatedCaptions.length) {
          const response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/bulk-update-captions`,
            method: 'post',
            data: { updates: this.updatedCaptions },
            requiresAuth: true,
          });
          if (response.status === 200) {
            this.currentImages = this.currentImages.map(img => {
              const updated = this.updatedCaptions.find(uc => uc.id === img.id);
              return updated ? { ...img, caption: updated.caption } : img;
            });
            this.updatedCaptions = [];
          }
        }

        // Handle Replacements or Additions
        if (this.imagePreviews.length) {
          if (this.replaceImageId) {
            const file = this.imagePreviews[0]?.file;
            if (!file || !(file instanceof File)) {
              throw new Error('No valid image selected for replacement.');
            }
            const formData = new FormData();
            formData.append('property_id', String(this.propertyId));
            formData.append('user_id', String(userProfile.id));
            formData.append('image', file);
            const existingImage = this.currentImages.find(img => img.id === this.replaceImageId);
            if (existingImage?.caption) {
              formData.append('caption', existingImage.caption);
            }
            const response = await makeRequest({
              url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/${this.replaceImageId}/replace`,
              method: 'post',
              data: formData,
              requiresAuth: true,
            });
            if (response.status === 200) {
              const updatedImage = response.data.data;
              this.currentImages = this.currentImages.map(img =>
                img.id === this.replaceImageId
                  ? {
                      id: updatedImage.id,
                      property_id: updatedImage.property_id,
                      file_path: updatedImage.file_path,
                      caption: updatedImage.caption || null,
                      uploader: updatedImage.uploader || 'EagerSky',
                      created_at: updatedImage.created_at ? format(new Date(updatedImage.created_at), 'd MMMM yyyy') : 'None',
                      updated_at: updatedImage.updated_at ? format(new Date(updatedImage.updated_at), 'd MMMM yyyy') : 'None',
                      user_id: updatedImage.user_id ? String(updatedImage.user_id) : undefined,
                    }
                  : img
              );
              this.replaceImageId = null;
              this.imagePreviews = [];
            }
          } else {
            // Handle Additions
            for (const [index, preview] of this.imagePreviews.entries()) {
              const file = preview.file;
              if (file.size <= 2 * 1024 * 1024) {
                // Use /v1/images for small files
                console.log(`Uploading small file ${file.name} directly via /v1/images`);
                const formData = new FormData();
                formData.append('images[]', file, file.name);
                formData.append('captions[]', this.newImageCaption || '');
                formData.append('property_id', String(this.propertyId));
                formData.append('user_id', String(userProfile.id));
                const response = await makeRequest({
                  url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images`,
                  method: 'post',
                  data: formData,
                  requiresAuth: true,
                });
                if (response.status === 201) {
                  const newImage = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
                  this.currentImages.push({
                    id: newImage.id,
                    property_id: newImage.property_id,
                    file_path: newImage.file_path,
                    caption: newImage.caption || null,
                    uploader: newImage.uploader || 'EagerSky',
                    created_at: newImage.created_at ? format(new Date(newImage.created_at), 'd MMMM yyyy') : 'None',
                    updated_at: newImage.updated_at ? format(new Date(newImage.updated_at), 'd MMMM yyyy') : 'None',
                    user_id: newImage.user_id ? String(newImage.user_id) : undefined,
                  });
                }
              } else {
                // Chunked upload for larger files
                const chunkSize = 2 * 1024 * 1024; // 2MB chunks
                const totalChunks = Math.ceil(file.size / chunkSize);
                const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                const filename = `${Date.now()}_testimonials-${index + 1}.${extension}`;
                const maxRetries = 3;

                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                  let attempt = 1;
                  let success = false;
                  const start = chunkIndex * chunkSize;
                  const end = Math.min(start + chunkSize, file.size);
                  const chunk = new Blob([file.slice(start, end)], { type: file.type }); // Explicitly set MIME type

                  while (attempt <= maxRetries && !success) {
                    console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${filename} (attempt ${attempt})`);
                    const formData = new FormData();
                    formData.append('chunk', chunk, `chunk_${chunkIndex}.${extension}`);
                    formData.append('chunk_index', String(chunkIndex));
                    formData.append('total_chunks', String(totalChunks));
                    formData.append('filename', filename);
                    formData.append('property_id', String(this.propertyId));
                    formData.append('user_id', String(userProfile.id));
                    formData.append('caption', this.newImageCaption || '');

                    try {
                      const response = await makeRequest({
                        url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images/chunk`,
                        method: 'post',
                        data: formData,
                        requiresAuth: true,
                      });
                      console.log(`Chunk ${chunkIndex + 1} response:`, response);

                      if (response.status === 200 || response.status === 201) {
                        success = true;
                        if (response.status === 201) {
                          const newImage = response.data.data;
                          this.currentImages.push({
                            id: newImage.id,
                            property_id: newImage.property_id,
                            file_path: newImage.file_path,
                            caption: newImage.caption || null,
                            uploader: newImage.uploader || 'EagerSky',
                            created_at: newImage.created_at ? format(new Date(newImage.created_at), 'd MMMM yyyy') : 'None',
                            updated_at: newImage.updated_at ? format(new Date(newImage.updated_at), 'd MMMM yyyy') : 'None',
                            user_id: newImage.user_id ? String(newImage.user_id) : undefined,
                          });
                        }
                      }
                    } catch (error: any) {
                      console.error(`Chunk ${chunkIndex + 1} upload failed (attempt ${attempt}):`, error.response?.data || error.message);
                      if (attempt === maxRetries) {
                        throw new Error(`Failed to upload chunk ${chunkIndex + 1} for ${filename} after ${maxRetries} attempts: ${error.response?.data?.message || error.message}`);
                      }
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      attempt++;
                    }
                  }
                }
              }
            }
            this.imagePreviews = [];
            this.newImageCaption = '';
          }
        }

        Swal.fire({
          title: 'Success!',
          text: 'Images have been updated successfully.',
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
            : error.response?.status === 422 && error.response?.data?.errors
              ? Object.entries(error.response.data.errors)
                  .map(([key, value]) => [key === 'chunk' ? 'images' : key, Array.isArray(value) ? value[0] : value])
                  .filter(Boolean)
                  .join('; ')
              : error.response?.data?.message || error.message || 'Failed to process images.';
        console.error('Submission error:', error.response?.data || error.message);
        this.handleError(errorMessage, error.response?.status === 401 || error.message.includes('User profile not found'));
        this.imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
        this.imagePreviews = [];
      } finally {
        this.isSubmitting = false;
        if (this.fileInput) {
          this.fileInput.value = '';
        }
      }
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

.image-form {
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

.section-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
}

.image-grid,
.preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  @media screen and (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.image-item,
.preview-item {
  position: relative;
  padding: 0.5rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  min-width: 0;
}

.image-preview,
.preview-image {
  max-height: 8rem;
  width: 100%;
  object-fit: cover;
  border-radius: 0.25rem;
}

.image-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;

  @media screen and (min-width: 768px) {
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
}

.action-label {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.action-checkbox,
.action-radio {
  width: 1rem;
  height: 1rem;
  margin-right: 0.25rem;
  min-width: 40px;
  min-height: 40px;
}

.form-input,
.caption-input {
  font-size: 0.875rem;

  :deep(.va-input__label) {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  :deep(.va-input__input) {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  :deep(.va-input__error-message) {
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;
  }

  @media screen and (min-width: 768px) {
    font-size: 1rem;

    :deep(.va-input__label) {
      font-size: 1rem;
    }

    :deep(.va-input__input) {
      padding: 0.75rem;
    }

    :deep(.va-input__error-message) {
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

.error-text,
.no-images-text {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.no-images-text {
  color: #6b7280;
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

.border-blue-500 {
  border-color: #3b82f6;
}

.border-red-500 {
  border-color: #ef4444;
}

@media (max-width: 640px) {
  .form-container {
    padding: 0.5rem;
  }

  .form-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .image-form {
    gap: 0.25rem;
  }

  .section-title {
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .image-grid,
  .preview-grid {
    gap: 0.25rem;
  }

  .image-item,
  .preview-item {
    padding: 0.25rem;
  }

  .image-preview,
  .preview-image {
    max-height: 6rem;
  }

  .image-actions {
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  .action-label {
    font-size: 0.625rem;
  }

  .action-checkbox,
  .action-radio {
    width: 0.875rem;
    height: 0.875rem;
    min-width: 36px;
    min-height: 36px;
  }

  .form-input,
  .caption-input {
    font-size: 0.75rem;

    :deep(.va-input__label) {
      font-size: 0.75rem;
    }

    :deep(.va-input__input) {
      padding: 0.375rem;
    }

    :deep(.va-input__error-message) {
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

  .error-text,
  .no-images-text {
    font-size: 0.625rem;
  }

  .remove-icon {
    width: 1rem;
    height: 1rem;
    min-width: 36px;
    min-height: 36px;
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

  .section-title {
    font-size: 0.625rem;
  }

  .image-grid,
  .preview-grid {
    gap: 0.125rem;
  }

  .image-item,
  .preview-item {
    padding: 0.125rem;
  }

  .image-preview,
  .preview-image {
    max-height: 5rem;
  }

  .image-actions {
    gap: 0.125rem;
  }

  .action-label {
    font-size: 0.5rem;
  }

  .action-checkbox,
  .action-radio {
    width: 0.75rem;
    height: 0.75rem;
    min-width: 32px;
    min-height: 32px;
  }

  .form-input,
  .caption-input {
    font-size: 0.625rem;

    :deep(.va-input__label) {
      font-size: 0.625rem;
    }

    :deep(.va-input__input) {
      padding: 0.25rem;
    }

    :deep(.va-input__error-message) {
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

  .error-text,
  .no-images-text {
    font-size: 0.5rem;
  }

  .remove-icon {
    width: 0.875rem;
    height: 0.875rem;
    min-width: 32px;
    min-height: 32px;
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