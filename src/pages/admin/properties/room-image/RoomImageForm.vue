<template>
  <div class="p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-full overflow-x-auto">
    <h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Add New Room Image</h2>
    <div class="mb-6 p-4 bg-gray-100 rounded-lg">
      <h3 class="text-base sm:text-lg font-semibold text-gray-700">Upload Requirements</h3>
      <ul class="list-disc pl-5 text-sm sm:text-base text-gray-600">
        <li>Allowed formats: {{ requirements.allowed_formats.join(', ') }}</li>
        <li>Maximum size: {{ requirements.max_size }}</li>
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
            No properties available.
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
            No rooms available for this property.
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
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../../stores/auth-store';
import { AuthMiddleware } from '../../../../utils/authMiddleware';

// Define interfaces explicitly
interface Image {
  id: number;
  property_id: number;
  room_id: number;
  file_path: string;
  caption: string | null;
  uploader?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
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
  image: string;
}

interface Requirements {
  allowed_formats: string[];
  max_size: string;
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
    imagePreviews: { url: string; file: File }[];
    requirements: Requirements;
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
        image: '',
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
        min_images_per_room: 3,
        max_images_per_room: 8,
        caption_max_length: 255,
        notes: [
          'Images must be unique by filename.',
          'Images will be watermarked with the uploader’s name.',
          'Only users with admin or agent roles can upload images.',
        ],
      },
    };
  },
  mounted() {
    if (!this.authStore.isAuthenticated || !AuthMiddleware.isSessionValid()) {
      this.handleError('You are not logged in. Please log in and try again.', true);
      return;
    }
    this.fetchProperties();
    this.fetchRequirements();
  },
  methods: {
    // Centralized error handling
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

    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          requiresAuth: true,
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
          if (!this.properties.length) {
            this.errors.property_id = 'No properties available.';
            Swal.fire({
              title: 'Info',
              text: 'No properties available for image upload.',
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
            : error.response?.data?.message || 'Failed to fetch properties.';
        this.errors.property_id = errorMessage;
        this.handleError(errorMessage, error.response?.status === 401);
      } finally {
        this.loadingProperties = false;
      }
    },

    async fetchRooms() {
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
        if (response.status === 200) {
          this.rooms = (await Promise.all(
            response.data.data.map(async (room: any) => {
              const imageCount = await this.currentImageCount(room.id);
              return imageCount < this.requirements.max_images_per_room
                ? { value: room.id, text: room.room_number || `Room ${room.id}` }
                : null;
            })
          )).filter((room): room is Room => room !== null);
          if (!this.rooms.length) {
            this.errors.room_id = 'No rooms available for this property.';
            Swal.fire({
              title: 'Info',
              text: 'No rooms available for image upload.',
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
            : error.response?.data?.message || 'Failed to fetch rooms.';
        this.errors.room_id = errorMessage;
        this.handleError(errorMessage, error.response?.status === 401);
      } finally {
        this.loadingRooms = false;
      }
    },

    async handleMultipleFileChange(event: Event) {
      this.errors.image = '';
      const input = event.target as HTMLInputElement;
      if (!input.files || !input.files.length) {
        this.errors.image = 'Please select at least one image.';
        this.form.images = [];
        this.imagePreviews = [];
        return;
      }

      const files = Array.from(input.files);
      const allowedTypes = this.requirements.allowed_formats.map((fmt: string) => `image/${fmt}`);
      const maxSize = 10 * 1024 * 1024; // 10MB
      const existingImages = this.form.room_id ? await this.currentImageCount(this.form.room_id) : 0;
      const totalImages = existingImages + files.length;

      if (totalImages > this.requirements.max_images_per_room) {
        this.errors.image = `Cannot add ${files.length} image(s). Maximum of ${this.requirements.max_images_per_room} images per room.`;
        this.form.images = [];
        this.imagePreviews = [];
        return;
      }

      if (files.length < this.requirements.min_images_per_room && existingImages === 0) {
        this.errors.image = `Please upload at least ${this.requirements.min_images_per_room} images for new rooms.`;
        this.form.images = [];
        this.imagePreviews = [];
        return;
      }

      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedTypes.includes(file.type) || !this.requirements.allowed_formats.includes(extension)) {
          this.errors.image = `Only ${this.requirements.allowed_formats.join(', ')} files are allowed.`;
          this.form.images = [];
          this.imagePreviews = [];
          return;
        }
        if (file.size > maxSize) {
          this.errors.image = 'Each image must not exceed 10MB.';
          this.form.images = [];
          this.imagePreviews = [];
          return;
        }
      }

      this.form.images = files;
      this.imagePreviews = files.map(file => ({ url: URL.createObjectURL(file), file }));
      this.errors.image = '';
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
      this.form.images.splice(index, 1);
      this.imagePreviews.splice(index, 1);
      if (!this.form.images.length) {
        this.errors.image = 'Please select at least one image.';
      } else {
        this.errors.image = '';
      }
    },

    async submitForm() {
      if (this.isSubmitting) return;
      this.errors = { property_id: '', room_id: '', caption: '', image: '' };
      
      if (!this.form.property_id) {
        this.errors.property_id = 'Property is required';
      }
      if (!this.form.room_id) {
        this.errors.room_id = 'Room is required';
      }
      if (!this.form.images.length) {
        this.errors.image = 'Please select at least one image.';
      }
      if (this.form.caption && this.form.caption.length > this.requirements.caption_max_length) {
        this.errors.caption = `Caption must not exceed ${this.requirements.caption_max_length} characters`;
      }

      if (Object.values(this.errors).some(error => error)) {
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

        const formData = new FormData();
        formData.append('property_id', String(this.form.property_id));
        formData.append('room_id', String(this.form.room_id));
        formData.append('user_id', String(userProfile.id));
        this.form.images.forEach((image, index) => {
          formData.append(`images[]`, image);
          formData.append(`captions[]`, this.form.caption || '');
        });

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images`,
          method: 'post',
          data: formData,
          requiresAuth: true,
        });

        if (response.status === 201) {
          const newImages = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          const formattedImages = newImages.map((image: any) => ({
            id: image.id,
            property_id: image.property_id,
            room_id: image.room_id,
            file_path: image.file_path,
            caption: image.caption || null,
            uploader: image.uploader || 'EagerSky',
            created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
            updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
            user_id: image.user_id ? Number(image.user_id) : undefined,
          })) as Image[];

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
          this.$emit('close', formattedImages);
        }
      } catch (error: any) {
        const errorMessage = error.response?.status === 401
          ? 'Your session has expired or the token is invalid. Please log in again.'
          : error.response?.status === 422 && error.response?.data?.errors
            ? Object.entries(error.response.data.errors)
                .map(([key, value]) => [key === 'images.0' ? 'image' : key, Array.isArray(value) ? value[0] : value])
                .filter(Boolean)
                .join('; ')
            : error.message || 'Failed to upload room images.';
        this.handleError(errorMessage, error.response?.status === 401 || error.message.includes('User profile not found'));
      } finally {
        this.isSubmitting = false;
      }
    },

    resetForm() {
      this.form = { property_id: null, room_id: null, caption: '', images: [] };
      this.imagePreviews = [];
      this.errors = { property_id: '', room_id: '', caption: '', image: '' };
      this.$emit('close');
    },
  },
});
</script>

<style scoped>
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
@keyframes spin { to { transform: rotate(360deg); } }
</style>