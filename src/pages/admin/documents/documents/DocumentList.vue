<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput v-model="searchQuery" placeholder="Search documents..." class="w-64" @input="debouncedSearch" />
      </div>
      <div class="flex space-x-2">
        <VaButton
          v-if="addEditForm"
          icon="close"
          color="success"
          size="small"
          class="px-4"
          @click="closeForm"
        >
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          @click="openAddForm"
        >
          Add Document
        </VaButton>
      </div>
    </div>

    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="documents"
        striped
        :columns="columns"
        :loading="loadingDocuments"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        :hoverable="true"
        :clickable="true"
        @row-click="openView"
        @update:currentPage="changePage"
      >
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click.stop="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click.stop="openEditForm(rowData)" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click.stop="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} documents
        </div>
        <div class="flex space-x-2">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1"
            @click="changePage(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page"
            @click="changePage(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <DocumentForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" :categories="categories" />
      <DocumentEdit
        v-if="formMode === 'edit' && selectedDocument"
        :document="selectedDocument"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
        :categories="categories"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Document Details') }}</div>
      <div v-if="selectedDocument" class="space-y-2">
        <p><strong>Title:</strong> {{ selectedDocument.title }}</p>
        <p><strong>Category:</strong> {{ selectedDocument.category_name || 'N/A' }}</p>
        <p v-if="selectedDocument.file_path">
          <strong>File:</strong>
          <button
            type="button"
            class="text-blue-600 hover:underline"
            @click="openFilePreview(selectedDocument.file_path)"
          >
            View File
          </button>
        </p>
        <p><strong>Created:</strong> {{ selectedDocument.created_at }}</p>
        <p><strong>Updated:</strong> {{ selectedDocument.updated_at }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="showView = false">Close</VaButton>
      </div>
    </VaModal>

    <!-- File Preview Modal -->
    <VaModal v-model="showFilePreview" size="large" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">File Preview</div>
      <div v-if="filePreviewUrl && filePreviewIsImage" class="flex justify-center">
        <img :src="filePreviewUrl" alt="File Preview" class="max-w-full max-h-[60vh] object-contain border rounded" />
      </div>
      <div v-else-if="filePreviewUrl && filePreviewIsPdf" class="flex justify-center">
        <iframe :src="filePreviewUrl" class="w-full h-[60vh] border rounded"></iframe>
      </div>
      <div v-else-if="filePreviewUrl" class="flex justify-center">
        <p class="text-gray-600">Preview not available for this file type. <a :href="filePreviewUrl" download class="text-blue-600 hover:underline">Download file</a></p>
      </div>
      <div v-else class="text-red-500">File not available.</div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="showFilePreview = false">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import DocumentForm from './DocumentForm.vue';
import DocumentEdit from './DocumentEdit.vue';
import { Document, CategoryOption } from '../../../../types/document';

export default defineComponent({
  name: 'DocumentList',
  components: { DocumentForm, DocumentEdit },
  setup() {
    const addEditForm = ref(false);
    const showView = ref(false);
    const showFilePreview = ref(false);
    const filePreviewUrl = ref<string>('');
    const filePreviewIsImage = ref<boolean>(false);
    const filePreviewIsPdf = ref<boolean>(false);
    const selectedDocument = ref<Document | null>(null);
    const formMode = ref<'view' | 'add' | 'edit'>('add');
    const searchQuery = ref('');
    const componentKey = ref(0);
    const loadingDocuments = ref(false);
    const documents = ref<Document[]>([]);
    const categories = ref<CategoryOption[]>([]);
    const pagination = reactive({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });

    const debouncedSearch = debounce((value: string) => {
      searchQuery.value = value;
      getDocuments({ page: 1, per_page: pagination.per_page, search: value });
      componentKey.value += 1;
    }, 500);

    const debouncedHandleSubmit = debounce(
      async (payload: FormData, mode: 'add' | 'edit') => {
        try {
          const response = mode === 'add'
            ? await addDocument(payload)
            : await updateDocument(payload, payload.get('id') as string);
          if ([200, 201].includes(response.status)) {
            Swal.fire({
              title: mode === 'add' ? 'Created!' : 'Updated!',
              text: `Document has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 1500,
            });
            addEditForm.value = false;
            componentKey.value += 1;
            await getDocuments({
              page: pagination.current_page,
              per_page: pagination.per_page,
              search: searchQuery.value,
            });
          }
        } catch (error: any) {
          Swal.fire({
            title: 'Error!',
            text: error.message || 'Failed to save document.',
            icon: 'error',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
          });
        }
      },
      1000,
      { leading: true, trailing: false }
    );

    async function getDocuments(params: { page?: number; per_page?: number; search?: string } = {}) {
      loadingDocuments.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/documents`,
          method: 'get',
          requiresAuth: true,
        });
        console.log('getDocuments response:', response.data); // Debug
        if (response.status === 200) {
          documents.value = response.data.data.map((doc: any) => ({
            id: doc.id,
            title: doc.title || 'N/A',
            category_id: parseInt(doc.category_id, 10) || null,
            category_name: doc.category?.name || categories.value.find(cat => cat.id === parseInt(doc.category_id, 10))?.name || 'N/A',
            file_path: doc.file_path
              ? `${import.meta.env.VITE_APP_API_BASE_URL}/storage/documents${doc.file_path.split('/storage/documents')[1] || doc.file_path}`
              : 'N/A',
            created_at: doc.created_at ? format(new Date(doc.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: doc.updated_at ? format(new Date(doc.updated_at), 'd MMMM yyyy') : 'N/A',
          }));
          pagination.total = response.data.pagination?.total || response.data.data.length;
          pagination.per_page = response.data.pagination?.per_page || params.per_page || 10;
          pagination.current_page = response.data.pagination?.current_page || params.page || 1;
          pagination.last_page = response.data.pagination?.last_page || 1;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No documents found. Add some documents to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }
      } catch (error: any) {
        console.error('getDocuments error:', error.response?.data); // Debug
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch documents.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingDocuments.value = false;
      }
    }

    async function getCategories() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-categories`,
          method: 'get',
          requiresAuth: true,
          params: { per_page: 1000 },
        });
        console.log('getCategories response:', response.data); // Debug
        if (response.status === 200) {
          categories.value = response.data.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name || `Category ${cat.id}`,
          }));
          if (categories.value.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No categories found. Please add categories first.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }
      } catch (error: any) {
        console.error('getCategories error:', error.response?.data); // Debug
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch categories.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    }

    async function addDocument(formData: FormData) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/documents`,
          method: 'post',
          requiresAuth: true,
          data: formData,
        });
        console.log('addDocument response:', response.data); // Debug
        return response;
      } catch (error: any) {
        console.error('addDocument error:', error.response?.data); // Debug
        throw new Error(error.response?.data?.message || 'Failed to add document');
      }
    }

    async function updateDocument(formData: FormData, id: string) {
      formData.append('_method', 'PUT');
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/documents/${id}`,
          method: 'post',
          requiresAuth: true,
          data: formData,
        });
        console.log('updateDocument response:', response.data); // Debug
        return response;
      } catch (error: any) {
        console.error('updateDocument error:', error.response?.data); // Debug
        throw new Error(error.response?.data?.message || 'Failed to update document');
      }
    }

    async function deleteDocument(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/documents/${id}`,
          method: 'delete',
          requiresAuth: true,
        });
        console.log('deleteDocument response:', response.data); // Debug
        return response;
      } catch (error: any) {
        console.error('deleteDocument error:', error.response?.data); // Debug
        throw new Error(error.response?.data?.message || 'Failed to delete document');
      }
    }

    async function openFilePreview(filePath: string) {
      if (!filePath || filePath === 'N/A') {
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

      const fullUrl = filePath.startsWith('http')
        ? filePath
        : `${import.meta.env.VITE_APP_API_BASE_URL}/storage/documents${filePath.split('/storage/documents')[1] || filePath}`;
      console.log('Opening file preview for URL:', fullUrl); // Debug
      try {
        const response = await makeRequest({
          method: 'get',
          url: fullUrl,
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
        filePreviewUrl.value = URL.createObjectURL(blob);
        filePreviewIsImage.value = /\.(jpg|jpeg|png)$/i.test(filePath);
        filePreviewIsPdf.value = /\.pdf$/i.test(filePath);
        showFilePreview.value = true;
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
    }

    getCategories().then(() => {
      getDocuments({ page: 1, per_page: 10 });
    });

    return {
      addEditForm,
      showView,
      showFilePreview,
      filePreviewUrl,
      filePreviewIsImage,
      filePreviewIsPdf,
      selectedDocument,
      formMode,
      searchQuery,
      debouncedSearch,
      debouncedHandleSubmit,
      componentKey,
      documents,
      loadingDocuments,
      pagination,
      categories,
      columns: computed(() => [
        {
          key: 'sn',
          sortable: false,
          label: 'SN',
          render: ({ rowIndex }: { rowIndex: number }) => {
            return (pagination.current_page - 1) * pagination.per_page + rowIndex + 1;
          },
        },
        { key: 'title', label: 'Title', sortable: true },
        { key: 'category_name', label: 'Category', sortable: true },
        { key: 'created_at', label: 'Created', sortable: true },
        { key: 'updated_at', label: 'Updated', sortable: true },
        { key: 'actions', label: 'Actions', sortable: false },
      ]),
      getDocuments,
      addDocument,
      updateDocument,
      deleteDocument,
      openFilePreview,
      openAddForm: () => {
        formMode.value = 'add';
        selectedDocument.value = null;
        addEditForm.value = true;
      },
      openEditForm: (item: Document) => {
        console.log('Opening edit form for document:', item); // Debug
        formMode.value = 'edit';
        selectedDocument.value = item;
        addEditForm.value = true;
      },
      openView: (item: Document) => {
        formMode.value = 'view';
        selectedDocument.value = item;
        showView.value = true;
      },
      confirmDelete: async (item: Document) => {
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: `Do you want to delete "${item.title}"?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, delete it!',
          position: 'center',
          toast: false,
          showConfirmButton: true,
        });
        if (result.isConfirmed) {
          try {
            const response = await deleteDocument(item.id!);
            if (response.status === 204) {
              Swal.fire({
                title: 'Deleted!',
                text: 'Document has been deleted successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                position: 'top-end',
                toast: true,
              });
              componentKey.value += 1;
              await getDocuments({
                page: pagination.current_page,
                per_page: pagination.per_page,
                search: searchQuery.value,
              });
            }
          } catch (error: any) {
            Swal.fire({
              title: 'Error!',
              text: error.message || 'Failed to delete document.',
              icon: 'error',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }
      },
      changePage: async (page: number) => {
        await getDocuments({
          page,
          per_page: pagination.per_page,
          search: searchQuery.value,
        });
        componentKey.value += 1;
      },
      closeForm: () => {
        addEditForm.value = false;
        showView.value = false;
        showFilePreview.value = false;
        selectedDocument.value = null;
        formMode.value = 'add';
        getDocuments({
          page: pagination.current_page,
          per_page: pagination.per_page,
          search: searchQuery.value,
        });
      },
    };
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
.flex {
  display: flex;
}
.justify-between {
  justify-content: space-between;
}
.items-center {
  align-items: center;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
.w-64 {
  width: 16rem;
}
.space-y-2 > :not(:last-child) {
  margin-bottom: 0.5rem;
}
.text-blue-600 {
  color: #2563eb;
}
.hover\:underline:hover {
  text-decoration: underline;
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