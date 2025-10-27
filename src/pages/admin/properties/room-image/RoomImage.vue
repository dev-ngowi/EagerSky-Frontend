<template>
  <div class="container">
    <template v-if="loadingImages">
      <div class="loading-container">
        <Loader :loading-text="'Loading room images...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-container">
        <span class="error-text">{{ errorMessage }}</span>
        <button class="retry-button" @click="retryFetch" aria-label="Retry loading room images">
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div v-if="!addEditForm">
        <div class="controls-container">
          <div class="search-filter-group">
            <VaInput
              v-model="searchQuery"
              placeholder="Search by caption..."
              class="search-input"
              :disabled="loadingImages"
              @input="debouncedSearch"
              aria-label="Search room images by caption"
            />
            <VaButton
              v-if="searchQuery || filters.property_id || filters.room_id"
              color="warning"
              size="small"
              class="clear-button"
              @click="clearSearch"
              aria-label="Clear search and filters"
            >
              Clear Search
            </VaButton>
            <VaSelect
              v-model="filters.property_id"
              placeholder="Filter by property"
              :options="properties"
              value-by="value"
              text-by="text"
              clearable
              :loading="loadingProperties"
              class="filter-select"
              @update:modelValue="debouncedSearch"
              aria-label="Filter room images by property"
            />
            <VaSelect
              v-model="filters.room_id"
              placeholder="Filter by room"
              :options="rooms"
              value-by="value"
              text-by="text"
              clearable
              :loading="loadingRooms"
              class="filter-select"
              @update:modelValue="debouncedSearch"
              aria-label="Filter room images by room"
            />
          </div>
          <div class="pagination-actions-group">
            <VaSelect
              v-model="pagination.per_page"
              :options="perPageOptions"
              label="Items per page"
              value-by="value"
              text-by="text"
              class="per-page-select"
              @update:modelValue="handlePerPageChange"
              aria-label="Select items per page"
            />
            <VaButton
              icon="add"
              color="#00A3E0"
              size="small"
              class="action-button"
              @click="openForm(null, 'add')"
              aria-label="Add new room image"
            >
              Add Room Image
            </VaButton>
          </div>
        </div>
        <div v-if="!groupedImages || (groupedImages.length === 0 && !loadingImages)" class="no-data">
          No room images found.
        </div>
        <VaDataTable
          v-else-if="groupedImages && groupedImages.length > 0"
          :key="componentKey"
          :items="groupedImages"
          striped
          :columns="columns"
          :loading="loadingImages"
          class="data-table"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
          </template>
          <template #cell(images)="{ rowData }">
            <div class="image-grid">
              <img
                v-for="(image, index) in rowData.images.slice(0, 6)"
                :key="index"
                :src="getImageUrl(image.file_path)"
                :alt="image.caption || rowData.room_number || `Image ${index + 1}`"
                class="image-preview"
                @error="handleImageError($event, image)"
              />
              <span v-if="rowData.images.length > 6" class="more-images">
                +{{ rowData.images.length - 6 }} more
              </span>
              <span v-if="!rowData.images.length" class="no-images">No images</span>
            </div>
          </template>
          <template #cell(actions)="{ rowData }">
            <VaButton
              size="small"
              color="primary"
              icon="visibility"
              class="action-button"
              @click="openView(rowData)"
              :aria-label="`View images for room ${rowData.room_number || 'ID ' + rowData.room_id}`"
            />
            <VaButton
              size="small"
              color="warning"
              icon="edit"
              class="action-button"
              @click="openForm(rowData, 'edit')"
              :aria-label="`Edit images for room ${rowData.room_number || 'ID ' + rowData.room_id}`"
            />
            <VaButton
              size="small"
              color="danger"
              icon="delete"
              class="action-button"
              @click="confirmDelete(rowData)"
              :aria-label="`Delete images for room ${rowData.room_number || 'ID ' + rowData.room_id}`"
            />
          </template>
        </VaDataTable>
        <div v-if="groupedImages && groupedImages.length > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} images
          </div>
          <div class="pagination-buttons">
            <VaButton
              size="small"
              :disabled="pagination.current_page === 1"
              @click="handlePageChange(pagination.current_page - 1)"
              class="pagination-button"
              aria-label="Go to previous page"
            >
              Previous
            </VaButton>
            <VaButton
              v-for="page in paginationPages"
              :key="page"
              size="small"
              :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
              @click="handlePageChange(page)"
              class="pagination-button"
              :aria-label="`Go to page ${page}`"
            >
              {{ page }}
            </VaButton>
            <VaButton
              size="small"
              :disabled="pagination.current_page === pagination.last_page"
              @click="handlePageChange(pagination.current_page + 1)"
              class="pagination-button"
              aria-label="Go to next page"
            >
              Next
            </VaButton>
          </div>
        </div>
      </div>
      <template v-if="addEditForm">
        <RoomImageForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
        <RoomImageEdit
          v-if="formMode === 'edit' && selectedImage && selectedImage.room_id !== null"
          :room-id="selectedImage.room_id"
          :room-number="selectedImage.room_number || 'Unknown Room'"
          :property-id="selectedImage.property_id"
          :property-title="selectedImage.property_title || 'Unknown Property'"
          :initial-images="selectedImage.images"
          @close="closeForm"
          @submit="debouncedHandleSubmit"
        />
        <VaButton
          icon="close"
          color="success"
          size="small"
          class="action-button done-button"
          @click="cancelAdding"
          aria-label="Finish adding or editing room image"
        >
          Done
        </VaButton>
      </template>
      <VaModal
        v-model="showView"
        size="medium"
        layout="centered"
        close-button
        hide-default-actions
        class="modal"
      >
        <div class="modal-title">Room Image Details</div>
        <div v-if="selectedImage" class="modal-content">
          <p><strong>Property ID:</strong> {{ selectedImage.property_id }}</p>
          <p><strong>Property Title:</strong> {{ selectedImage.property_title || 'None' }}</p>
          <p><strong>Room ID:</strong> {{ selectedImage.room_id }}</p>
          <p><strong>Room Number:</strong> {{ selectedImage.room_number || 'None' }}</p>
          <p><strong>Uploader:</strong> {{ selectedImage.uploader || 'None' }}</p>
          <p><strong>Caption:</strong> {{ selectedImage.images?.[0]?.caption || 'None' }}</p>
          <p><strong>Created At:</strong> {{ selectedImage.images?.[0]?.created_at || 'None' }}</p>
          <p><strong>Updated At:</strong> {{ selectedImage.images?.[0]?.updated_at || 'None' }}</p>
          <div class="modal-image-grid">
            <div v-for="(image, index) in selectedImage.images" :key="index" class="image-container">
              <img
                :src="getImageUrl(image.file_path)"
                :alt="image.caption || selectedImage.room_number || `Room Image ${index + 1}`"
                class="modal-image"
                @error="handleImageError($event, image)"
              />
              <VaButton
                size="small"
                color="danger"
                icon="delete"
                class="delete-image-button"
                @click="confirmDeleteImage(image.id)"
                :aria-label="`Delete image ${image.caption || 'Room Image ' + (index + 1)}`"
              />
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <VaButton
            color="secondary"
            @click="closeView"
            class="modal-close-button"
            aria-label="Close room image details"
          >
            Close
          </VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent, computed } from 'vue';
import RoomImageForm from './RoomImageForm.vue';
import RoomImageEdit from './RoomImageEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
interface RoomImage {
  id: number;
  property_id: number;
  room_id: number;
  file_path: string;
  caption: string | null;
  uploader: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}
interface RoomImageGroup {
  property_id: number;
  property_title: string;
  room_id: number;
  room_number: string;
  images: RoomImage[];
  uploader: string;
  created_at: string;
}
interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}
interface ImageFilters {
  property_id: number | null;
  room_id: number | null;
  search: string | undefined;
}
interface PropertyOption {
  value: number;
  text: string;
}
interface RoomOption {
  value: number;
  text: string;
}
interface RoomImageResponse {
  data: RoomImageGroup[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}
interface RoomImageUploadResponse {
  status: number;
  data?: any;
}
export default defineComponent({
  name: 'RoomImageList',
  components: {
    RoomImageForm,
    RoomImageEdit,
    Loader,
  },
  data() {
    return {
      columns: [
        { key: 'sn', label: 'SN', sortable: false },
        { key: 'property_title', label: 'Property', sortable: true },
        { key: 'room_number', label: 'Room', sortable: true },
        { key: 'uploader', label: 'Uploader', sortable: true },
        { key: 'images', label: 'Images', sortable: false },
        { key: 'created_at', label: 'Created At', sortable: true },
        { key: 'actions', label: 'Actions', sortable: false },
      ] as Array<{ key: string; label: string; sortable?: boolean }>,
      addEditForm: false,
      showView: false,
      selectedImage: null as RoomImageGroup | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '',
      errorMessage: null as string | null,
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
        from: 0,
        to: 0,
      } as Pagination,
      failedImages: new Set<string>(),
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Array<{ value: number; text: string }>,
      debouncedHandleSubmit: undefined as ((payload: FormData, mode: 'add' | 'edit') => Promise<void>) | undefined,
      debouncedSearch: undefined as (() => Promise<void>) | undefined,
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
    paginationPages(): number[] {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page || 1;
      const range = 2;
      let start = Math.max(1, current - range);
      let end = Math.min(lastPage, current + range);
      if (end - start < 2 * range) {
        if (start === 1) {
          end = Math.min(lastPage, start + 2 * range);
        } else if (end === lastPage) {
          start = Math.max(1, end - 2 * range);
        }
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },
    pagination(): Pagination {
      const current = this.pagination.current_page || 1;
      const perPage = this.pagination.per_page || 10;
      const total = this.pagination.total || 0;
      return {
        current_page: current,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
        from: total > 0 ? (current - 1) * perPage + 1 : 0,
        to: Math.min(current * perPage, total),
      };
    },
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
    this.debouncedSearch = debounce(this.handleSearch, 300);
  },
  mounted() {
    this.retryFetch();
  },
  methods: {
    async fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            this.errorMessage = 'Failed to load room images. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async retryFetch() {
      this.errorMessage = null;
      await Promise.all([this.fetchProperties(), this.fetchRooms(), this.fetchImages()]);
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingRooms = false;
      }
    },
    async fetchImages() {
      this.loadingImages = true;
      try {
        console.log('Fetching room images...', {
          page: this.pagination.current_page,
          perPage: this.pagination.per_page,
          search: this.searchQuery,
          property_id: this.filters.property_id,
          room_id: this.filters.room_id,
        });
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
              Accept: 'application/json',
            },
            params: {
              page: this.pagination.current_page || 1,
              per_page: this.pagination.per_page || 10,
              search: this.searchQuery || undefined,
              property_id: this.filters.property_id || undefined,
              room_id: this.filters.room_id || undefined,
            },
          })
        );
        if (response && response.status === 200) {
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
                  created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'N/A',
                  updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'N/A',
                  user_id: String(image.user_id),
                })),
              uploader: group.images.length > 0 ? group.images[0].uploader : 'EagerSky',
              created_at: group.images.length > 0 && group.images[0].created_at ? format(new Date(group.images[0].created_at), 'd MMMM yyyy') : 'N/A',
            }));
          this.pagination = {
            total: responseData.pagination.total || 0,
            per_page: responseData.pagination.per_page || 10,
            current_page: responseData.pagination.current_page || 1,
            last_page: Math.ceil((responseData.pagination.total || 0) / (responseData.pagination.per_page || 10)),
            from: responseData.pagination.total > 0 ? ((responseData.pagination.current_page || 1) - 1) * (responseData.pagination.per_page || 10) + 1 : 0,
            to: Math.min((responseData.pagination.current_page || 1) * (responseData.pagination.per_page || 10), responseData.pagination.total || 0),
          };
          console.log('Fetched room images:', responseData);
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
          throw new Error(response?.data?.message || 'Failed to fetch room images.');
        }
      } catch (error: any) {
        console.error('fetchImages error:', error.message);
        let errorMessage = 'Failed to fetch room images.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.submitting = false;
      }
    },
    async updateImage(id: number): Promise<RoomImageUploadResponse> {
      this.submitting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/room-images/${id}/replace`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
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
        if (response.status === 200 || response.status === 204) {
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
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
        if (response.status === 200 || response.status === 204) {
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.deleting = false;
      }
    },
    async handleSearch() {
      console.log('Search query:', this.searchQuery, 'Filters:', this.filters);
      this.pagination.current_page = 1;
      await this.fetchImages();
    },
    clearSearch() {
      this.searchQuery = '';
      this.filters.property_id = null;
      this.filters.room_id = null;
      this.pagination.current_page = 1;
      this.fetchImages();
      this.fetchRooms();
    },
    handlePageChange(page: number) {
      this.pagination.current_page = page || 1;
      this.fetchImages();
    },
    handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage || 10;
      this.pagination.current_page = 1;
      this.fetchImages();
    },
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
            created_at: img.created_at,
            updated_at: img.updated_at,
            user_id: String(img.user_id),
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
      setTimeout(() => this.fetchImages(), 500);
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
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete them!',
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete();
        }
      });
    },
    confirmDeleteImage(imageId: number) {
      Swal.fire({
        title: 'Are you sure?',
        text: 'Delete this room image?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDeleteImage(imageId);
        }
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
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.deleting = false;
      }
    },
    async handleSubmit(payload: FormData, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        if (mode === 'add') {
          await this.addImage(payload);
        } else if (mode === 'edit' && this.selectedImage?.images[0]?.id) {
          await this.updateImage(this.selectedImage.images[0].id);
        }
        this.closeForm();
      } catch (error: any) {
        let errorMessage = 'Something went wrong.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
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
<style lang="scss" scoped>
.container {
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
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 16rem;
  @media screen and (min-width: 768px) {
    min-height: 20rem;
  }
}
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  text-align: center;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    padding: 1rem;
  }
}
.error-text {
  font-size: 0.875rem;
  color: #ef4444;
  @media screen and (min-width: 768px) {
    font-size: 1rem;
  }
}
.retry-button {
  font-size: 0.75rem;
  color: #2563eb;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;
  margin-top: 0.25rem;
  min-height: 40px;
  min-width: 40px;
  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    margin-left: 1rem;
    margin-top: 0;
  }
}
.controls-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
}
.search-filter-group,
.pagination-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
}
.search-input,
.filter-select,
.per-page-select {
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
.search-input {
  width: 100%;
  max-width: 16rem;
}
.filter-select {
  width: 100%;
  max-width: 12rem;
}
.per-page-select {
  width: 100%;
  max-width: 8rem;
}
.clear-button,
.action-button,
.pagination-button,
.modal-close-button,
.done-button,
.delete-image-button {
  min-height: 40px;
  min-width: 40px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}
.delete-image-button {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
}
.no-data {
  text-align: center;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  @media screen and (min-width: 768px) {
    padding: 1rem;
    font-size: 1rem;
  }
}
.data-table {
  width: 100%;
  overflow-x: auto;
  :deep(.va-data-table__table) {
    min-width: 36rem;
    border-collapse: separate;
    border-spacing: 0;
  }
  :deep(.va-data-table__table-th) {
    font-size: 0.75rem;
    padding: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem;
    }
  }
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem;
    }
  }
  :deep(.va-data-table__table-tr) {
    border-bottom: 1px solid #e5e7eb;
  }
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  @media screen and (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media screen and (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
.image-preview {
  width: 4rem;
  height: 4rem;
  object-fit: cover;
  border-radius: 0.25rem;
  @media screen and (max-width: 640px) {
    width: 3.5rem;
    height: 3.5rem;
  }
  @media screen and (max-width: 480px) {
    width: 100%;
    height: auto;
    max-height: 6rem;
  }
}
.more-images,
.no-images {
  font-size: 0.75rem;
  color: #6b7280;
  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}
.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
  }
}
.pagination-info {
  font-size: 0.75rem;
  color: #4b5563;
  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}
.pagination-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  @media screen and (min-width: 768px) {
    gap: 0.5rem;
  }
}
.modal {
  padding: 0.75rem;
  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}
.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #374151;
  @media screen and (min-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}
.modal-content {
  font-size: 0.875rem;
  color: #4b5563;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  @media screen and (min-width: 768px) {
    font-size: 1rem;
    gap: 0.5rem;
  }
}
.modal-image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.75rem;
  @media screen and (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media screen and (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
.image-container {
  position: relative;
}
.modal-image {
  width: 100%;
  height: auto;
  max-height: 8rem;
  object-fit: cover;
  border-radius: 0.25rem;
  @media screen and (min-width: 768px) {
    max-height: 10rem;
  }
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
  @media screen and (min-width: 768px) {
    margin-top: 1rem;
  }
}
@media (max-width: 640px) {
  .container {
    padding: 0.5rem;
  }
  .loading-container {
    min-height: 12rem;
  }
  .error-container {
    padding: 0.5rem;
  }
  .error-text {
    font-size: 0.75rem;
  }
  .retry-button {
    font-size: 0.625rem;
    min-height: 36px;
    min-width: 36px;
  }
  .controls-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }
  .search-filter-group,
  .pagination-actions-group {
    gap: 0.25rem;
  }
  .search-input,
  .filter-select,
  .per-page-select {
    font-size: 0.75rem;
    max-width: 100%;
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
  .clear-button,
  .action-button,
  .pagination-button,
  .modal-close-button,
  .done-button,
  .delete-image-button {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
    min-height: 36px;
    min-width: 36px;
  }
  .no-data {
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  .data-table {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.375rem;
    }
  }
  .pagination-container {
    gap: 0.25rem;
    margin-top: 0.5rem;
  }
  .pagination-info {
    font-size: 0.625rem;
  }
  .pagination-buttons {
    gap: 0.125rem;
  }
  .modal {
    padding: 0.5rem;
  }
  .modal-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  .modal-content {
    font-size: 0.75rem;
    gap: 0.125rem;
  }
  .modal-image-grid {
    margin-top: 0.5rem;
  }
  .modal-actions {
    margin-top: 0.5rem;
  }
}
@media (max-width: 480px) {
  .container {
    padding: 0.25rem;
  }
  .loading-container {
    min-height: 10rem;
  }
  .error-container {
    padding: 0.25rem;
  }
  .error-text {
    font-size: 0.625rem;
  }
  .retry-button {
    font-size: 0.5rem;
    min-height: 32px;
    min-width: 32px;
  }
  .controls-container {
    gap: 0.125rem;
    margin-bottom: 0.25rem;
  }
  .search-filter-group,
  .pagination-actions-group {
    gap: 0.125rem;
  }
  .search-input,
  .filter-select,
  .per-page-select {
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
  .clear-button,
  .action-button,
  .pagination-button,
  .modal-close-button,
  .done-button,
  .delete-image-button {
    font-size: 0.5rem;
    padding: 0.2rem 0.4rem;
    min-height: 32px;
    min-width: 32px;
  }
  .no-data {
    font-size: 0.625rem;
    padding: 0.25rem;
  }
  .data-table {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.25rem;
    }
  }
  .pagination-container {
    gap: 0.125rem;
    margin-top: 0.25rem;
  }
  .pagination-info {
    font-size: 0.5rem;
  }
  .modal {
    padding: 0.25rem;
  }
  .modal-title {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }
  .modal-content {
    font-size: 0.625rem;
  }
  .modal-image-grid {
    margin-top: 0.25rem;
  }
  .modal-actions {
    margin-top: 0.25rem;
  }
}
</style>