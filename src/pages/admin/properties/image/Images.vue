<template>
  <div class="image-list-container">
    <template v-if="loadingImages">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading images...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-container">
        <span class="error-text">{{ errorMessage }}</span>
        <button class="retry-button" @click="retryFetch" aria-label="Retry loading images">
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <template v-if="!addEditForm">
        <div class="filters-container">
          <div class="filter-group">
            <VaInput
              v-model="searchQuery"
              placeholder="Search by caption..."
              class="search-input"
              :disabled="loadingImages"
              @input="debouncedSearch"
              aria-label="Search images by caption"
            />
            <VaButton
              v-if="searchQuery || filters.property_id"
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
              class="property-filter"
              @update:modelValue="debouncedSearch"
              aria-label="Filter images by property"
            />
          </div>
          <div class="actions-group">
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
              class="add-button"
              @click="openForm(null, 'add')"
              aria-label="Add new image"
            >
              Add Image
            </VaButton>
          </div>
        </div>
        <div v-if="!groupedImages || (groupedImages.length === 0 && !loadingImages)" class="no-data">
          No images found.
        </div>
        <VaDataTable
          v-else-if="groupedImages && groupedImages.length > 0"
          :key="componentKey"
          :items="groupedImages"
          :columns="columns"
          striped
          :loading="loadingImages"
          class="image-table"
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
                :alt="image.caption || rowData.property_title || `Image ${index + 1}`"
                class="thumbnail"
                @error="handleImageError($event, image)"
              />
              <span v-if="rowData.images.length > 6" class="more-text">
                +{{ rowData.images.length - 6 }} more
              </span>
              <span v-if="!rowData.images.length" class="no-images-text">
                No images
              </span>
            </div>
          </template>
          <template #cell(actions)="{ rowData }">
            <VaButton
              size="small"
              color="primary"
              icon="visibility"
              class="action-button"
              @click="openView(rowData)"
              aria-label="View images for this property"
            />
            <VaButton
              size="small"
              color="warning"
              icon="edit"
              class="action-button"
              @click="openForm(rowData, 'edit')"
              aria-label="Edit images for this property"
            />
            <VaButton
              size="small"
              color="danger"
              icon="delete"
              class="action-button"
              @click="confirmDelete(rowData)"
              aria-label="Delete images for this property"
            />
          </template>
        </VaDataTable>
        <div v-if="groupedImages && groupedImages.length > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} image groups
          </div>
          <div class="pagination-buttons">
            <VaButton
              size="small"
              :disabled="pagination.current_page === 1"
              @click="handlePageChange(pagination.current_page - 1)"
              class="pagination-button"
              aria-label="Previous page"
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
              aria-label="Next page"
            >
              Next
            </VaButton>
          </div>
        </div>
      </template>
      <template v-if="addEditForm">
        <div class="form-container">
          <ImageForm
            v-if="formMode === 'add'"
            @close="closeForm"
            @submit="debouncedHandleSubmit"
            class="image-form"
          />
          <ImageEdit
            v-if="formMode === 'edit' && selectedImage && selectedImage.property_id !== null"
            :property-id="selectedImage.property_id"
            :property-title="selectedImage.property_title || 'Unknown Property'"
            :initial-images="selectedImage.images"
            @close="closeForm"
            class="image-form"
          />
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="done-button"
            @click="cancelAdding"
            aria-label="Close image form"
          >
            Done
          </VaButton>
        </div>
      </template>
      <VaModal
        v-model="showView"
        size="medium"
        layout="centered"
        close-button
        hide-default-actions
        class="image-modal"
        aria-label="Image details modal"
      >
        <div class="modal-title">Image Details</div>
        <div v-if="selectedImage" class="modal-content">
          <p><strong>Property ID:</strong> {{ selectedImage.property_id }}</p>
          <p><strong>Property Title:</strong> {{ selectedImage.property_title || 'None' }}</p>
          <p><strong>Uploader:</strong> {{ selectedImage.uploader || 'None' }}</p>
          <p><strong>Caption:</strong> {{ selectedImage.images?.[0]?.caption || 'None' }}</p>
          <p><strong>Created At:</strong> {{ selectedImage.images?.[0]?.created_at || 'None' }}</p>
          <p><strong>Updated At:</strong> {{ selectedImage.images?.[0]?.updated_at || 'None' }}</p>
          <div class="modal-image-grid">
            <div v-for="(image, index) in selectedImage.images" :key="index" class="image-wrapper">
              <img
                :src="getImageUrl(image.file_path)"
                :alt="image.caption || selectedImage.property_title || `Property Image ${index + 1}`"
                class="modal-image"
                @error="handleImageError($event, image)"
              />
              <VaButton
                size="small"
                color="danger"
                icon="delete"
                class="delete-image-button"
                @click="confirmDeleteImage(image.id)"
                :aria-label="`Delete image ${index + 1}`"
              />
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <VaButton
            color="secondary"
            @click="closeView"
            class="modal-close-button"
            aria-label="Close image details modal"
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
import ImageForm from './ImageForm.vue';
import ImageEdit from './ImageEdit.vue';
import Loader from '../../../../components/Loader.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

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

interface ImageGroup {
  property_id: number | null;
  property_title: string | null;
  images: Image[];
  uploader?: string;
  created_at?: string;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from?: number;
  to?: number;
}

export default defineComponent({
  name: 'ImageList',
  components: {
    ImageForm,
    ImageEdit,
    Loader,
  },
  data() {
    return {
      columns: [
        { key: 'sn', label: 'SN', sortable: false },
        { key: 'property_title', label: 'Property', sortable: true },
        { key: 'uploader', label: 'Uploader', sortable: true },
        { key: 'images', label: 'Images' },
        { key: 'created_at', label: 'Created At', sortable: true },
        { key: 'actions', label: 'Actions' },
      ] as Array<{ key: string; label: string; sortable?: boolean }>,
      addEditForm: false,
      showView: false,
      selectedImage: null as ImageGroup | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '',
      filters: {
        property_id: null as number | null,
      },
      properties: [] as { value: number; text: string }[],
      loadingProperties: false,
      loadingImages: false,
      images: [] as ImageGroup[],
      errorMessage: null as string | null,
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
      debouncedHandleSubmit: undefined as ((payload: FormData, mode: 'add' | 'edit') => void) | undefined,
      debouncedSearch: undefined as (() => void) | undefined,
    };
  },
  computed: {
    groupedImages(): ImageGroup[] {
      return this.images.map((group: ImageGroup) => {
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
            this.errorMessage = 'Failed to load images. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    async retryFetch() {
      this.errorMessage = null;
      await Promise.all([this.fetchProperties(), this.fetchImages()]);
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
          this.properties = response.data.data.map((property: any) => ({
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
    async fetchImages() {
      this.loadingImages = true;
      try {
        const response = await this.fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/images`,
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
            },
          })
        );
        if (response && response.status === 200) {
          this.images = response.data.data
            .filter((group: any) => group.property_id !== null)
            .map((group: any) => ({
              property_id: group.property_id as number,
              property_title: group.property_title || 'Unknown Property',
              images: group.images
                .filter((image: any) => image.property_id !== null)
                .map((image: any) => ({
                  id: image.id,
                  property_id: image.property_id as number,
                  file_path: image.file_path,
                  caption: image.caption || null,
                  uploader: image.uploader || 'EagerSky',
                  created_at: image.created_at ? format(new Date(image.created_at), 'd MMMM yyyy') : 'None',
                  updated_at: image.updated_at ? format(new Date(image.updated_at), 'd MMMM yyyy') : 'None',
                  user_id: String(image.user_id),
                })),
            }));
          this.pagination = {
            total: response.data.pagination.total || 0,
            per_page: response.data.pagination.per_page || 10,
            current_page: response.data.pagination.current_page || 1,
            last_page: Math.ceil((response.data.pagination.total || 0) / (response.data.pagination.per_page || 10)),
            from: response.data.pagination.total > 0 ? ((response.data.pagination.current_page || 1) - 1) * (response.data.pagination.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination.current_page || 1) * (response.data.pagination.per_page || 10), response.data.pagination.total || 0),
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
          throw new Error(response?.data?.message || 'Failed to fetch images.');
        }
      } catch (error: any) {
        let errorMessage = 'Failed to fetch images.';
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
    async addImage(payload: FormData) {
      this.submitting = true;
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
        if (response.status === 201) {
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
        let errorMessage = 'Failed to upload image.';
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
        let errorMessage = 'Failed to delete image.';
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        throw error;
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
    async handleSearch() {
      console.log('Search query:', this.searchQuery);
      this.pagination.current_page = 1;
      await this.fetchImages();
    },
    clearSearch() {
      this.searchQuery = '';
      this.filters.property_id = null;
      this.pagination.current_page = 1;
      this.fetchImages();
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
    openForm(image: ImageGroup | null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && image && image.property_id !== null) {
        this.selectedImage = {
          ...image,
          property_id: image.property_id,
          property_title: image.property_title || 'Unknown Property',
          images: image.images.map(img => ({
            ...img,
            user_id: img.user_id ? String(img.user_id) : undefined,
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
    openView(image: ImageGroup) {
      this.selectedImage = image;
      this.showView = true;
    },
    closeView() {
      this.selectedImage = null;
      this.showView = false;
    },
    confirmDelete(image: ImageGroup) {
      this.selectedImage = image;
      Swal.fire({
        title: 'Are you sure?',
        text: `Delete all images for "${image.property_title || 'Property ' + image.property_id}"?`,
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
        text: 'Delete this image?',
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
          this.selectedImage.images = this.selectedImage.images.filter((img: Image) => img.id !== imageId);
          if (this.selectedImage.images.length === 0) {
            this.closeView();
            this.fetchImages();
          } else {
            this.componentKey += 1;
          }
        }
      } finally {
        this.deleting = false;
      }
    },
    async handleDelete() {
      if (!this.selectedImage?.property_id || this.deleting) return;
      this.deleting = true;
      try {
        for (const image of this.selectedImage.images) {
          await this.deleteImage(image.id);
        }
        this.closeView();
        this.fetchImages();
      } finally {
        this.deleting = false;
      }
    },
    async handleSubmit(payload: FormData, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response;
        if (mode === 'add') {
          response = await this.addImage(payload);
        } else {
          this.closeForm();
          return;
        }
        if (response.status === 200 || response.status === 201) {
          this.closeForm();
        }
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
.image-list-container {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;

  @media screen and (max-width: 640px) {
    min-height: 150px;
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  text-align: center;

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
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
  font-size: 0.875rem;
  color: #2563eb;
  text-decoration: underline;
  margin-top: 0.5rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
  }
}

.filters-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
}

.filter-group,
.actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
}

.search-input,
.property-filter,
.per-page-select {
  font-size: 0.875rem;

  :deep(.va-input__input),
  :deep(.va-select__input) {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  :deep(.va-input__label),
  :deep(.va-select__label) {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  @media screen and (min-width: 768px) {
    font-size: 1rem;

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.75rem;
    }

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 1rem;
    }
  }
}

.search-input {
  width: 100%;
  max-width: 16rem;

  @media screen and (max-width: 640px) {
    max-width: 100%;
  }
}

.property-filter {
  width: 100%;
  max-width: 12rem;

  @media screen and (max-width: 640px) {
    max-width: 100%;
  }
}

.per-page-select {
  width: 100%;
  max-width: 8rem;

  @media screen and (max-width: 640px) {
    max-width: 100%;
  }
}

.clear-button,
.add-button,
.done-button,
.action-button,
.pagination-button,
.modal-close-button {
  min-height: 40px;
  min-width: 40px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}

.no-data {
  text-align: center;
  padding: 1rem;
  font-size: 0.875rem;
  color: #6b7280;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 1.5rem;
  }
}

.image-table {
  :deep(.va-data-table__table) {
    width: 100%;
    table-layout: auto;
  }

  :deep(.va-data-table__table-th) {
    font-size: 0.875rem;
    padding: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
      padding: 0.75rem;
    }
  }

  :deep(.va-data-table__table-td) {
    font-size: 0.875rem;
    padding: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
      padding: 0.75rem;
    }
  }
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;

  @media screen and (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
  }
}

.thumbnail {
  width: 4rem;
  height: 4rem;
  object-fit: cover;
  border-radius: 0.25rem;

  @media screen and (max-width: 640px) {
    width: 3rem;
    height: 3rem;
  }
}

.more-text,
.no-images-text {
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
    gap: 1rem;
    margin-top: 1rem;
  }
}

.pagination-info {
  font-size: 0.75rem;
  color: #6b7280;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.pagination-buttons {
  display: flex;
  gap: 0.25rem;

  @media screen and (min-width: 768px) {
    gap: 0.5rem;
  }
}

.image-modal {
  :deep(.va-modal__dialog) {
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    padding: 0.75rem;

    @media screen and (min-width: 768px) {
      max-width: 600px;
      padding: 1rem;
    }
  }
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #374151;

  @media screen and (min-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    gap: 0.75rem;
  }
}

.modal-image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }
}

.image-wrapper {
  position: relative;
}

.modal-image {
  max-width: 100%;
  height: auto;
  border-radius: 0.25rem;
}

.delete-image-button {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  min-width: 40px;
  min-height: 40px;
  font-size: 0.75rem;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
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
  .image-list-container {
    padding: 0.5rem;
  }

  .error-text,
  .retry-button {
    font-size: 0.75rem;
  }

  .filters-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .filter-group,
  .actions-group {
    gap: 0.25rem;
  }

  .search-input,
  .property-filter,
  .per-page-select {
    font-size: 0.75rem;

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.375rem;
    }

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.75rem;
    }
  }

  .clear-button,
  .add-button,
  .done-button,
  .action-button,
  .pagination-button,
  .modal-close-button {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
  }

  .no-data {
    font-size: 0.75rem;
    padding: 0.75rem;
  }

  .image-table {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.75rem;
      padding: 0.25rem;
    }
  }

  .pagination-info {
    font-size: 0.625rem;
  }

  .pagination-buttons {
    gap: 0.125rem;
  }

  .modal-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .modal-content {
    font-size: 0.75rem;
    gap: 0.25rem;
  }

  .modal-image-grid {
    grid-template-columns: 1fr;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .delete-image-button {
    font-size: 0.625rem;
  }
}

@media (max-width: 480px) {
  .image-list-container {
    padding: 0.25rem;
  }

  .error-text,
  .retry-button {
    font-size: 0.625rem;
  }

  .search-input,
  .property-filter,
  .per-page-select {
    font-size: 0.625rem;

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.25rem;
    }

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.625rem;
    }
  }

  .clear-button,
  .add-button,
  .done-button,
  .action-button,
  .pagination-button,
  .modal-close-button {
    font-size: 0.5rem;
    padding: 0.2rem 0.4rem;
  }

  .no-data {
    font-size: 0.625rem;
    padding: 0.5rem;
  }

  .image-table {
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.2rem;
    }
  }

  .thumbnail {
    width: 2.5rem;
    height: 2.5rem;
  }

  .more-text,
  .no-images-text {
    font-size: 0.625rem;
  }

  .pagination-info {
    font-size: 0.5rem;
  }

  .modal-title {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .modal-content {
    font-size: 0.625rem;
    gap: 0.125rem;
  }

  .delete-image-button {
    font-size: 0.5rem;
  }
}
</style>