<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <!-- Filters & Actions -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by caption"
          class="w-64"
          @input="debouncedSearch"
        />
        <VaSelect
          v-model="filters.property_id"
          placeholder="Filter by property"
          :options="properties"
          value-by="value"
          text-by="text"
          clearable
          :loading="loadingProperties"
          @update:modelValue="debouncedSearch"
        />
        <VaSelect
          v-model="filters.room_id"
          placeholder="Filter by room"
          :options="rooms"
          value-by="value"
          text-by="text"
          clearable
          :loading="loadingRooms"
          @update:modelValue="debouncedSearch"
        />
      </div>
      <div>
        <VaButton
          v-if="addEditForm"
          icon="close"
          color="success"
          size="small"
          class="px-4"
          @click="cancelAdding"
        >
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          @click="openForm(null, 'add')"
        >
          Add Room Image
        </VaButton>
      </div>
    </div>

    <!-- Table View -->
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="groupedImages"
        :columns="columns"
        striped
        :loading="loadingImages"
        :no-data-html="'No room images found.'"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>

        <template #cell(images)="{ rowData }">
          <div class="grid grid-cols-3 gap-2">
            <img
              v-for="(image, index) in rowData.images.slice(0, 6)"
              :key="index"
              :src="getImageUrl(image.file_path)"
              :alt="image.caption || rowData.room_number || `Image ${index + 1}`"
              class="h-16 w-16 object-cover rounded"
              @error="handleImageError($event, image)"
            />
            <span v-if="rowData.images.length > 6" class="text-sm text-gray-500">
              +{{ rowData.images.length - 6 }} more
            </span>
            <span v-if="!rowData.images.length" class="text-sm text-gray-500">No images</span>
          </div>
        </template>

        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>

      <!-- Pagination -->
      <VaPagination
        v-if="pagination.last_page > 1"
        v-model="pagination.current_page"
        :pages="pagination.last_page"
        :per-page="pagination.per_page"
        :visible-pages="5"
        class="mt-4"
        @update:modelValue="fetchImages"
      />
    </template>

    <!-- Add/Edit Form -->
    <template v-else>
      <RoomImageForm
        v-if="formMode === 'add'"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
      <RoomImageEdit
        v-if="formMode === 'edit' && selectedImage && selectedImage.room_id !== null"
        :room-id="selectedImage.room_id"
        :room-number="selectedImage.room_number || 'Unknown Room'"
        :property-id="selectedImage.property_id"
        :property-title="selectedImage.property_title || 'Unknown Property'"
        :initial-images ="selectedImage.images"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Room Image Details</div>
      <div v-if="selectedImage" class="space-y-2">
        <p><strong>Property ID:</strong> {{ selectedImage.property_id }}</p>
        <p><strong>Property Title:</strong> {{ selectedImage.property_title || 'None' }}</p>
        <p><strong>Room ID:</strong> {{ selectedImage.room_id }}</p>
        <p><strong>Room Number:</strong> {{ selectedImage.room_number || 'None' }}</p>
        <p><strong>Uploader:</strong> {{ selectedImage.uploader || 'None' }}</p>
        <p><strong>Caption:</strong> {{ selectedImage.images?.[0]?.caption || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedImage.images?.[0]?.created_at || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ selectedImage.images?.[0]?.updated_at || 'None' }}</p>

        <div class="grid grid-cols-3 gap-2 mt-4">
          <div v-for="(image, index) in selectedImage.images" :key="index" class="relative">
            <img
              :src="getImageUrl(image.file_path)"
              :alt="image.caption || selectedImage.room_number || `Room Image ${index + 1}`"
              class="max-w-full h-auto rounded"
              @error="handleImageError($event, image)"
            />
            <VaButton
              size="small"
              color="danger"
              icon="delete"
              class="absolute top-1 right-1"
              @click="confirmDeleteImage(image.id)"
            />
          </div>
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import RoomImageForm from './RoomImageForm.vue';
import RoomImageEdit from './RoomImageEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import {
  RoomImage,
  RoomImageGroup,
  Pagination,
  ImageFilters,
  PropertyOption,
  RoomOption,
  RoomImageResponse,
  RoomImageUploadResponse,
} from '../../../../types/room-image';

export default defineComponent({
  name: 'RoomImageList',
  components: {
    RoomImageForm,
    RoomImageEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', label: 'SN' },
        { key: 'property_title', label: 'Property' },
        { key: 'room_number', label: 'Room' },
        { key: 'uploader', label: 'Uploader' },
        { key: 'images', label: 'Images' },
        { key: 'created_at', label: 'Created At' },
        { key: 'actions', label: 'Actions' },
      ] as { key: string; label: string }[],
      addEditForm: false,
      showView: false,
      selectedImage: null as RoomImageGroup | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '',
      filters: {
        property_id: null,
        room_id: null,
        search: undefined,
      } as ImageFilters,
      properties: [] as PropertyOption[],
      rooms: [] as RoomOption[],
      loadingProperties: false,
      loadingRooms: false,
      loadingImages: false,
      images: [] as RoomImageGroup[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as Pagination,
      failedImages: new Set<string>(),
      debouncedHandleSubmit: null as unknown as (payload: FormData, mode: 'add' | 'edit') => Promise<void>,
      debouncedSearch: null as unknown as () => Promise<void>,
    };
  },
  computed: {
    groupedImages(): RoomImageGroup[] {
      return this.images.map((group: RoomImageGroup) => {
        const hasImages = Array.isArray(group.images) && group.images.length > 0;
        return {
          ...group,
          uploader: hasImages ? group.images[0].uploader : 'EagerSky',
          created_at: hasImages ? group.images[0].created_at : 'N/A',
          images: hasImages ? group.images : [],
        };
      });
    },
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false }) as (payload: FormData, mode: 'add' | 'edit') => Promise<void>;
    this.debouncedSearch = debounce(this.fetchImages, 500) as () => Promise<void>;
  },
  mounted() {
    this.fetchImages();
    this.fetchProperties();
    this.fetchRooms();
  },
  methods: {
    getImageUrl(filePath: string): string {
      const baseUrl = import.meta.env.VITE_APP_API_BASE_URL.replace(/\/api$/, '');
      return `${baseUrl}/${filePath.replace(/^\/+/, '')}`;
    },

    handleImageError(event: Event, image: RoomImage) {
      const target = event.target as HTMLImageElement;
      const defaultImage = `${import.meta.env.VITE_APP_API_BASE_URL.replace(/\/api$/, '')}/images/default.jpg`;
      if (!this.failedImages.has(image.file_path) && target.src !== defaultImage) {
        this.failedImages.add(image.file_path);
        target.src = defaultImage;
      } else if (target.src === defaultImage) {
        target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
      }
    },

    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any): PropertyOption => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
        }
      } catch (error: any) {
        let errorMessage = 'Failed to fetch properties.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      } finally {
        this.loadingProperties = false;
      }
    },

    async fetchRooms() {
      this.loadingRooms = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rooms`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params: {
            property_id: this.filters.property_id || undefined,
          },
        });
        if (response.status === 200) {
          this.rooms = response.data.data.map((room: any): RoomOption => ({
            value: room.id,
            text: room.room_number || `Room ${room.id}`,
          }));
        }
      } catch (error: any) {
        let errorMessage = 'Failed to fetch rooms.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      } finally {
        this.loadingRooms = false;
      }
    },

    async fetchImages() {
      this.loadingImages = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery || undefined,
            property_id: this.filters.property_id || undefined,
            room_id: this.filters.room_id || undefined,
          },
        });
        if (response.status === 200) {
          const responseData: RoomImageResponse = response.data;
          this.images = responseData.data
            .filter((group) => group.room_id !== null)
            .map((group): RoomImageGroup => ({
              property_id: group.property_id,
              property_title: group.property_title || 'Unknown Property',
              room_id: group.room_id,
              room_number: group.room_number || 'Unknown Room',
              images: group.images
                .filter((image) => image.room_id !== null)
                .map((image): RoomImage => ({
                  id: image.id,
                  property_id: image.property_id,
                  room_id: image.room_id,
                  file_path: image.file_path,
                  caption: image.caption || null,
                  uploader: image.uploader || 'EagerSky',
                  created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
                  updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
                  user_id: image.user_id,
                })),
              uploader: group.images.length > 0 ? group.images[0].uploader : 'EagerSky',
              created_at: group.images.length > 0 ? group.images[0].created_at : 'N/A',
            }));
          this.pagination = {
            total: responseData.pagination.total,
            per_page: responseData.pagination.per_page,
            current_page: responseData.pagination.current_page,
            last_page: responseData.pagination.last_page,
          };
          if (responseData.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No room images found. Add some images to get started.',
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
            text: response.data?.message || 'Failed to fetch room images.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        let errorMessage = 'Failed to fetch room images.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 5000 });
      } finally {
        this.loadingImages = false;
      }
    },

    async addImage(payload: FormData): Promise<RoomImageUploadResponse> {
      this.submitting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'multipart/form-data',
          },
          data: payload,
        });
        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: 'Room image uploaded successfully.',
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
        let errorMessage = 'Failed to upload room image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        throw error;
      } finally {
        this.submitting = false;
      }
    },

    async updateImage(payload: FormData, id: number): Promise<RoomImageUploadResponse> {
      this.submitting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/${id}/replace`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'multipart/form-data',
          },
          data: payload,
        });
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room image replaced successfully.',
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
        let errorMessage = 'Failed to replace room image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        throw error;
      } finally {
        this.submitting = false;
      }
    },

    async deleteImage(id: number): Promise<void> {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room image deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        let errorMessage = 'Failed to delete room image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        throw error;
      }
    },

    openForm(image: RoomImageGroup | null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && image && image.room_id !== null) {
        this.selectedImage = {
          ...image,
          property_id: image.property_id,
          property_title: image.property_title || 'Unknown Property',
          room_id: image.room_id,
          room_number: image.room_number || 'Unknown Room',
          images: image.images.map((img): RoomImage => ({
            ...img,
            property_id: img.property_id,
            room_id: img.room_id,
          })),
        };
        this.formMode = mode;
        this.addEditForm = true;
      } else if (mode === 'add') {
        this.selectedImage = null;
        this.formMode = mode;
        this.addEditForm = true;
      }
    },

    closeForm() {
      this.selectedImage = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.fetchImages();
    },

    openView(image: RoomImageGroup) {
      this.selectedImage = image;
      this.showView = true;
    },

    closeView() {
      this.selectedImage = null;
      this.showView = false;
    },

    confirmDelete(image: RoomImageGroup) {
      this.selectedImage = image;
      Swal.fire({
        title: 'Are you sure?',
        text: `Delete all images for Room "${image.room_number || 'Room ' + image.room_id}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete them!',
      }).then((result) => {
        if (result.isConfirmed) this.handleDelete();
      });
    },

    confirmDeleteImage(imageId: number) {
      Swal.fire({
        title: 'Are you sure?',
        text: 'Delete this room image?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
      }).then((result) => {
        if (result.isConfirmed) this.handleDeleteImage(imageId);
      });
    },

    async handleDeleteImage(imageId: number) {
      if (this.deleting) return;
      this.deleting = true;
      try {
        await this.deleteImage(imageId);
        if (this.selectedImage) {
          this.selectedImage.images = this.selectedImage.images.filter((img: RoomImage) => img.id !== imageId);
          if (this.selectedImage.images.length === 0) {
            this.closeView();
            this.fetchImages();
          } else {
            this.componentKey += 1;
          }
        }
      } catch (error: any) {
        let errorMessage = 'Failed to delete room image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      } finally {
        this.deleting = false;
      }
    },

    async handleDelete() {
      if (!this.selectedImage?.room_id || this.deleting) return;
      this.deleting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/bulk-delete`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: { ids: this.selectedImage.images.map((img: RoomImage) => img.id) },
        });
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Room images deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.closeView();
          this.fetchImages();
        }
      } catch (error: any) {
        let errorMessage = 'Failed to delete room images.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      } finally {
        this.deleting = false;
      }
    },

    async handleSubmit(payload: FormData, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response: RoomImageUploadResponse;
        if (mode === 'add') {
          response = await this.addImage(payload);
        } else {
          const imageId = this.selectedImage?.images[0]?.id;
          if (!imageId) {
            throw new Error('No image ID selected for update');
          }
          response = await this.updateImage(payload, imageId);
        }

        if (response.status === 200 || response.status === 201) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: mode === 'add' ? 'Room images uploaded.' : 'Room image replaced.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
          });
          this.closeForm();
        }
      } catch (error: any) {
        let errorMessage = 'Something went wrong.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      } finally {
        this.submitting = false;
      }
    },

    cancelAdding() {
      this.closeForm();
    },
  },
});
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-6 {
  padding: 1.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.w-64 {
  width: 16rem;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
.h-16 {
  height: 4rem;
}
.w-16 {
  width: 4rem;
}
.object-cover {
  object-fit: cover;
}
.rounded {
  border-radius: 0.25rem;
}
.max-w-full {
  max-width: 100%;
}
.h-auto {
  height: auto;
}
.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}
.gap-2 {
  gap: 0.5rem;
}
.text-sm {
  font-size: 0.875rem;
}
.text-gray-500 {
  color: #6b7280;
}
.absolute {
  position: absolute;
}
.top-1 {
  top: 0.25rem;
}
.right-1 {
  right: 0.25rem;
}
</style>