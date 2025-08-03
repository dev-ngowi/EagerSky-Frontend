<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Document') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.title"
            label="Title"
            placeholder="Enter document title"
            :error="!!errors.title"
            :error-messages="errors.title ? [errors.title] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="selectedCategory"
            label="Category"
            placeholder="Select category"
            :options="categories"
            :error="!!errors.category_id"
            :error-messages="errors.category_id ? [errors.category_id] : []"
            value-by="id"
            text-by="name"
            :disabled="isSubmitting"
            required
            @update:modelValue="handleCategoryChange"
          />
        </div>
        <div class="mb-4 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">File (Optional, PDF, DOC, DOCX, JPG, PNG, max 10MB)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.png"
            :disabled="isSubmitting"
            class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            @change="handleFileChange"
          />
          <p v-if="errors.file" class="text-red-500 text-sm mt-1">{{ errors.file }}</p>
          <p v-if="form.file" class="text-sm text-gray-600 mt-1">
            Selected file: {{ form.file.name }} ({{ (form.file.size / 1024 / 1024).toFixed(2) }} MB)
            <button
              type="button"
              class="ml-2 text-red-600 hover:underline text-sm"
              @click="clearFile"
              :disabled="isSubmitting"
            >
              Clear
            </button>
            <button
              v-if="filePreview"
              type="button"
              class="ml-2 text-blue-600 hover:underline text-sm"
              @click="openPreview(filePreview, isImage, isPdf)"
              :disabled="isSubmitting"
            >
              Preview
            </button>
          </p>
          <div v-if="hasCurrentFile" class="mt-2">
            <p class="text-sm text-gray-600">Current file:</p>
            <button
              type="button"
              class="text-blue-600 hover:underline text-sm"
              @click="openPreview(fullFilePath, !!isCurrentFileImage, !!isCurrentFilePdf)"
              :disabled="isSubmitting"
            >
              View Current File
            </button>
            <button
              type="button"
              class="ml-2 text-red-600 hover:underline text-sm"
              @click="clearCurrentFile"
              :disabled="isSubmitting"
            >
              Clear Current File
            </button>
          </div>
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner inline-block mr-2"></div>
          <span>{{ isSubmitting ? 'Submitting...' : 'Submit' }}</span>
        </VaButton>
      </div>
    </form>

    <!-- File Preview Modal -->
    <VaModal v-model="showPreview" size="large" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">File Preview</div>
      <div v-if="previewUrl && previewIsImage" class="flex justify-center">
        <img :src="previewUrl" alt="File Preview" class="max-w-full max-h-[60vh] object-contain border rounded" />
      </div>
      <div v-else-if="previewUrl && previewIsPdf" class="flex justify-center">
        <iframe :src="previewUrl" class="w-full h-[60vh] border rounded"></iframe>
      </div>
      <div v-else-if="previewUrl" class="flex justify-center">
        <p class="text-gray-600">Preview not available for this file type. <a :href="previewUrl" download class="text-blue-600 hover:underline">Download file</a></p>
      </div>
      <div v-else class="text-red-500">File not available.</div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="showPreview = false">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, PropType, computed } from 'vue';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import { FormData as FormDataType, Errors, Document, CategoryOption } from '../../../../types/document';

export default defineComponent({
  name: 'DocumentEdit',
  props: {
    document: {
      type: Object as PropType<Document>,
      required: true,
    },
    categories: {
      type: Array as PropType<CategoryOption[]>,
      required: true,
    },
  },
  emits: ['close', 'submit'],
  setup(props) {
    const form = reactive<FormDataType>({
      id: props.document.id,
      title: props.document.title,
      category_id: props.document.category_id ? parseInt(String(props.document.category_id), 10) : null,
      file: null,
    });

    const errors = reactive<Errors>({
      title: '',
      category_id: '',
      file: '',
    });

    const filePreview = ref<string>('');
    const isImage = ref<boolean>(false);
    const isPdf = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);
    const showPreview = ref<boolean>(false);
    const previewUrl = ref<string>('');
    const previewIsImage = ref<boolean>(false);
    const previewIsPdf = ref<boolean>(false);

    const hasCurrentFile = computed(() => {
      return !!props.document.file_path && !form.file;
    });

    const isCurrentFileImage = computed(() => {
      return !!props.document.file_path && /\.(jpg|jpeg|png)$/i.test(props.document.file_path);
    });

    const isCurrentFilePdf = computed(() => {
      return !!props.document.file_path && /\.pdf$/i.test(props.document.file_path);
    });

    const fullFilePath = computed(() => {
      if (props.document.file_path && !props.document.file_path.startsWith('http')) {
        const fileSegment = props.document.file_path.split('/storage/documents')[1] || props.document.file_path;
        return `${import.meta.env.VITE_APP_API_BASE_URL}/storage/documents${fileSegment}`;
      }
      return props.document.file_path || '';
    });

    const selectedCategory = computed({
      get: () => {
        console.log('form.category_id:', form.category_id, 'categories:', props.categories); // Debug
        const category = props.categories.find((cat) => cat.id === form.category_id || cat.id === parseInt(String(form.category_id), 10));
        return category || null;
      },
      set: (newValue: CategoryOption | null) => {
        form.category_id = newValue ? newValue.id : null;
        console.log('Updated form.category_id:', form.category_id); // Debug
      },
    });

    return {
      form,
      errors,
      filePreview,
      isImage,
      isPdf,
      isSubmitting,
      showPreview,
      previewUrl,
      previewIsImage,
      previewIsPdf,
      hasCurrentFile,
      isCurrentFileImage,
      isCurrentFilePdf,
      fullFilePath,
      selectedCategory,
    };
  },
  beforeUnmount() {
    if (this.filePreview) URL.revokeObjectURL(this.filePreview);
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  },
  methods: {
    handleCategoryChange(category: CategoryOption | null) {
      this.form.category_id = category ? category.id : null;
      this.errors.category_id = '';
      console.log('Category changed to:', this.form.category_id); // Debug
    },
    handleFileChange(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        this.form.file = file;
        this.errors.file = '';
        this.isImage = ['image/jpeg', 'image/png'].includes(file.type);
        this.isPdf = file.type === 'application/pdf';
        if (this.isImage || this.isPdf || ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
          this.filePreview = URL.createObjectURL(file);
        } else {
          this.filePreview = '';
        }
        console.log('File selected:', file.name, 'Preview URL:', this.filePreview); // Debug
      } else {
        this.clearFile();
      }
    },
    clearFile() {
      this.form.file = null;
      this.filePreview = '';
      this.previewUrl = '';
      this.isImage = false;
      this.isPdf = false;
      this.errors.file = '';
    },
    clearCurrentFile() {
      this.form.file = null;
      this.filePreview = '';
      this.previewUrl = '';
      this.isImage = false;
      this.isPdf = false;
      this.errors.file = '';
    },
    async openPreview(url: string, isImage: boolean, isPdf: boolean) {
      if (!url) {
        Swal.fire({
          title: 'Error',
          text: 'No file available for preview.',
          icon: 'error',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      console.log('Opening preview for URL:', url); // Debug
      try {
        if (url.startsWith('blob:')) {
          this.previewUrl = url;
          this.previewIsImage = isImage;
          this.previewIsPdf = isPdf;
          this.showPreview = true;
        } else {
          const response = await makeRequest({
            method: 'get',
            url: url,
            responseType: 'blob',
            requiresAuth: true,
          });
          console.log('File fetch response:', {
            status: response.status,
            headers: response.headers,
            contentType: response.headers['content-type'],
          }); // Debug
          if (response.headers['content-type'].includes('text/html')) {
            throw new Error('Server returned an HTML error page instead of the file.');
          }
          const blob = new Blob([response.data], { type: response.headers['content-type'] });
          this.previewUrl = URL.createObjectURL(blob);
          this.previewIsImage = isImage;
          this.previewIsPdf = isPdf;
          this.showPreview = true;
        }
      } catch (error: any) {
        const status = error.response?.status;
        let message = 'Unable to load file for preview.';
        if (status === 404) {
          message = 'File not found on the server. It may have been deleted or moved.';
        } else if (status === 403) {
          message = 'You are not authorized to access this file.';
        } else if (status === 401) {
          message = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('HTML error page')) {
          message = 'Invalid server response. Please check the file path or server configuration.';
        }
        console.error('Preview error:', error); // Debug
        Swal.fire({
          title: 'Error',
          text: message,
          icon: 'error',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    async submitForm() {
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      if (!this.form.title) this.errors.title = 'Title is required';
      if (!this.form.category_id) this.errors.category_id = 'Category is required';
      if (this.form.file) {
        if (
          ![
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
          ].includes(this.form.file.type)
        ) {
          this.errors.file = 'File must be PDF, DOC, DOCX, JPG, or PNG';
        } else if (this.form.file.size > 10 * 1024 * 1024) {
          this.errors.file = 'File size must not exceed 10MB';
        }
      }

      if (Object.values(this.errors).some((error) => error)) return;

      const confirmed = await Swal.fire({
        title: 'Confirm Submission',
        text: 'Are you sure you want to update this document?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit',
      });
      if (!confirmed.isConfirmed) return;

      this.isSubmitting = true;
      try {
        const formData = new FormData();
        formData.append('id', String(this.form.id));
        formData.append('title', this.form.title);
        formData.append('category_id', String(this.form.category_id));
        if (this.form.file) formData.append('file', this.form.file);
        console.log('FormData:', this.logFormData(formData)); // Debug
        this.$emit('submit', formData, 'edit');
      } catch (error: any) {
        this.errors.file = error.message || 'Failed to prepare form data';
        Swal.fire({
          title: 'Error!',
          text: this.errors.file,
          icon: 'error',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.isSubmitting = false;
      }
    },
    logFormData(formData: FormData): Record<string, any> {
      const entries: Record<string, any> = {};
      formData.forEach((value, key) => {
        entries[key] = value instanceof File ? `File: ${value.name}` : value;
      });
      return entries;
    },
    resetForm() {
      Object.assign(this.form, {
        id: this.$props.document.id,
        title: this.$props.document.title,
        category_id: this.$props.document.category_id ? parseInt(String(this.$props.document.category_id), 10) : null,
        file: null,
      });
      this.clearFile();
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));
      this.$emit('close');
    },
  },
});
</script>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.md\:grid-cols-2 {
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.gap-4 {
  gap: 1rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 3px solid #fff;
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.text-sm {
  font-size: 0.875rem;
}
.text-gray-600 {
  color: #4b5563;
}
.text-red-500 {
  color: #ef4444;
}
.text-blue-600 {
  color: #2563eb;
}
.max-w-full {
  max-width: 100%;
}
.max-h-\[60vh\] {
  max-height: 60vh;
}
.object-contain {
  object-fit: contain;
}
.border {
  border: 1px solid #e5e7eb;
}
.rounded {
  border-radius: 0.25rem;
}
</style>