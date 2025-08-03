<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <h1 class="text-2xl font-bold mb-4">{{ $t('Templates') }}</h1>
    <div class="flex justify-between items-center mb-4">
      <VaInput
        v-model="searchQuery"
        placeholder="Search templates..."
        class="w-64"
        @input="debouncedSearch"
      />
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
          Add Template
        </VaButton>
      </div>
    </div>

    <template v-if="!addEditForm">
      <VaDataTable
        :items="templates"
        :columns="columns"
        :loading="loadingTemplates"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        :hoverable="true"
        :clickable="true"
        @row-click="openView"
        @update:currentPage="changePage"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ row }">
          <div class="flex space-x-2">
            <VaButton
              preset="plain"
              icon="edit"
              color="primary"
              title="Edit"
              @click.stop="openEditForm(row.rowData)"
            />
            <VaButton
              preset="plain"
              icon="delete"
              color="danger"
              title="Delete"
              @click.stop="confirmDelete(row.rowData)"
            />
          </div>
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} templates
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
      <div v-if="formMode === 'add'" class="bg-white shadow-md rounded-lg p-6">
        <h2 class="text-lg font-bold mb-4">Add New Template</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <VaInput
              v-model="addForm.name"
              placeholder="Enter template name"
              class="mt-1 w-full"
              :error="!!addErrors.name"
              :error-messages="addErrors.name ? [addErrors.name] : []"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Content</label>
            <VaTextarea
              v-model="addForm.content"
              placeholder="Enter template content"
              class="mt-1 w-full"
              rows="5"
              :error="!!addErrors.content"
              :error-messages="addErrors.content ? [addErrors.content] : []"
            />
          </div>
          <div class="flex justify-end space-x-2">
            <VaButton color="secondary" @click="resetAddForm">Cancel</VaButton>
            <VaButton color="#00A3E0" :disabled="submitting" @click="handleAddSubmit">
              <div v-if="submitting" class="spinner" />
              <span v-else>Submit</span>
            </VaButton>
          </div>
        </div>
      </div>
      <div v-if="formMode === 'edit' && selectedTemplate" class="bg-white shadow-md rounded-lg p-6">
        <h2 class="text-lg font-bold mb-4">Edit Template</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <VaInput
              v-model="editForm.name"
              placeholder="Enter template name"
              class="mt-1 w-full"
              :error="!!editErrors.name"
              :error-messages="editErrors.name ? [editErrors.name] : []"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Content</label>
            <VaTextarea
              v-model="editForm.content"
              placeholder="Enter template content"
              class="mt-1 w-full"
              rows="5"
              :error="!!editErrors.content"
              :error-messages="editErrors.content ? [editErrors.content] : []"
            />
          </div>
          <div class="flex justify-end space-x-2">
            <VaButton color="secondary" @click="resetEditForm">Cancel</VaButton>
            <VaButton color="#00A3E0" :disabled="submitting" @click="handleEditSubmit">
              <div v-if="submitting" class="spinner" />
              <span v-else>Submit</span>
            </VaButton>
          </div>
        </div>
      </div>
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div v-if="selectedTemplate" class="space-y-2">
        <h2 class="text-lg font-bold mb-4">Template Details</h2>
        <p><strong>Name:</strong> {{ selectedTemplate.name }}</p>
        <p><strong>Content:</strong> {{ selectedTemplate.content }}</p>
        <p><strong>Created:</strong> {{ selectedTemplate.created_at }}</p>
        <p><strong>Updated:</strong> {{ selectedTemplate.updated_at }}</p>
        <div class="flex justify-end mt-4">
          <VaButton color="secondary" @click="showView = false">Close</VaButton>
        </div>
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

interface Template {
  id?: number;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  id?: number;
  name: string;
  content: string;
}

interface Errors {
  name: string;
  content: string;
}

interface Payload {
  id?: number;
  name: string;
  content: string;
}

export default defineComponent({
  name: 'TemplateList',
  setup() {
    const templates = ref<Template[]>([]);
    const loadingTemplates = ref<boolean>(false);
    const pagination = reactive({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const searchQuery = ref<string>('');
    const addEditForm = ref<boolean>(false);
    const showView = ref<boolean>(false);
    const selectedTemplate = ref<Template | null>(null);
    const formMode = ref<'view' | 'add' | 'edit'>('add');
    const submitting = ref<boolean>(false);

    const addForm = reactive<FormData>({
      name: '',
      content: '',
    });
    const addErrors = reactive<Errors>({
      name: '',
      content: '',
    });

    const editForm = reactive<FormData>({
      id: undefined,
      name: '',
      content: '',
    });
    const editErrors = reactive<Errors>({
      name: '',
      content: '',
    });

    const debouncedSearch = debounce((value: string) => {
      searchQuery.value = value;
      getTemplates({ page: 1, per_page: pagination.per_page, search: value });
    }, 500);

    const resetAddForm = () => {
      Object.assign(addForm, { name: '', content: '' });
      Object.keys(addErrors).forEach((key) => (addErrors[key as keyof Errors] = ''));
    };

    const resetEditForm = () => {
      Object.assign(editForm, { id: undefined, name: '', content: '' });
      Object.keys(editErrors).forEach((key) => (editErrors[key as keyof Errors] = ''));
    };

    const debouncedHandleSubmit = debounce(
      async (payload: Payload, mode: 'add' | 'edit') => {
        try {
          let response;
          if (mode === 'add') {
            response = await addTemplate(payload);
          } else {
            response = await updateTemplate(payload, payload.id!);
          }
          if ([200, 201].includes(response.status)) {
            Swal.fire({
              title: mode === 'add' ? 'Created!' : 'Updated!',
              text: `Template has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 1500,
            });
            addEditForm.value = false;
            await getTemplates({
              page: pagination.current_page,
              per_page: pagination.per_page,
              search: searchQuery.value,
            });
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.data?.message || `Failed to ${mode === 'add' ? 'add' : 'update'} template.`,
              icon: 'error',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } catch (error: any) {
          let errorMessage = error.response?.data?.message || `Failed to ${mode === 'add' ? 'add' : 'update'} template.`;
          if (error.response?.status === 422 && error.response?.data?.errors) {
            const errors = Object.fromEntries(
              Object.entries(error.response.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            );
            errorMessage = Object.values(errors).filter(Boolean).join('; ');
            Object.assign(mode === 'add' ? addErrors : editErrors, errors);
          } else if (error.response?.status === 404) {
            errorMessage = 'Template not found. It may have been deleted.';
          }
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      },
      1000,
      { leading: true, trailing: false }
    );

    async function getTemplates(params: { page?: number; per_page?: number; search?: string } = {}) {
      loadingTemplates.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || pagination.current_page,
            per_page: params.per_page || pagination.per_page,
            search: params.search || searchQuery.value,
          },
        });
        console.log('getTemplates response:', response.data); // Debug
        if (response.status === 200) {
          templates.value = response.data.data.map((template: any) => ({
            id: template.id,
            name: template.name || 'N/A',
            content: template.content || 'N/A',
            created_at: template.created_at ? format(new Date(template.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: template.updated_at ? format(new Date(template.updated_at), 'd MMMM yyyy') : 'N/A',
          }));
          pagination.total = response.data.pagination?.total || response.data.data.length;
          pagination.per_page = response.data.pagination?.per_page || params.per_page || 10;
          pagination.current_page = response.data.pagination?.current_page || params.page || 1;
          pagination.last_page = response.data.pagination?.last_page || 1;
          searchQuery.value = params.search || searchQuery.value;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No templates found. Add some templates to get started.',
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
            text: response.data?.message || 'Failed to fetch templates.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('getTemplates error:', error.response?.data || error.message); // Debug
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch templates.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return { status: 'error', message: error.response?.data?.message || error.message };
      } finally {
        loadingTemplates.value = false;
      }
    }

    async function addTemplate(payload: Payload) {
      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('addTemplate response:', response.data); // Debug
        return response;
      } catch (error: any) {
        console.error('addTemplate error:', error.response?.data || error.message); // Debug
        throw error;
      } finally {
        submitting.value = false;
      }
    }

    async function updateTemplate(payload: Payload, id: number) {
      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        console.log('updateTemplate response:', response.data); // Debug
        return response;
      } catch (error: any) {
        console.error('updateTemplate error:', error.response?.data || error.message); // Debug
        throw error;
      } finally {
        submitting.value = false;
      }
    }

    async function deleteTemplate(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteTemplate response:', response.data); // Debug
        return response;
      } catch (error: any) {
        console.error('deleteTemplate error:', error.response?.data || error.message); // Debug
        throw error;
      }
    }

    const openAddForm = () => {
      formMode.value = 'add';
      selectedTemplate.value = null;
      resetAddForm();
      addEditForm.value = true;
    };

    const openEditForm = (item: Template) => {
      formMode.value = 'edit';
      selectedTemplate.value = item;
      Object.assign(editForm, {
        id: item.id,
        name: item.name,
        content: item.content,
      });
      Object.keys(editErrors).forEach((key) => (editErrors[key as keyof Errors] = ''));
      addEditForm.value = true;
    };

    const openView = (row: { rowData: Template }) => {
      formMode.value = 'view';
      selectedTemplate.value = row.rowData;
      showView.value = true;
    };

    const confirmDelete = async (item: Template) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to delete "${item.name}"?`,
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
          const response = await deleteTemplate(item.id!);
          if (response.status === 204 || response.status === 200) {
            Swal.fire({
              title: 'Deleted!',
              text: 'Template has been deleted successfully.',
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 1500,
            });
            await getTemplates({
              page: pagination.current_page,
              per_page: pagination.per_page,
              search: searchQuery.value,
            });
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.data?.message || 'Failed to delete template.',
              icon: 'error',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } catch (error: any) {
          Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to delete template.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      }
    };

    const changePage = async (page: number) => {
      await getTemplates({
        page,
        per_page: pagination.per_page,
        search: searchQuery.value,
      });
    };

    const closeForm = () => {
      addEditForm.value = false;
      showView.value = false;
      selectedTemplate.value = null;
      formMode.value = 'add';
      resetAddForm();
      resetEditForm();
      getTemplates({
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: searchQuery.value,
      });
    };

    const handleAddSubmit = async () => {
      Object.keys(addErrors).forEach((key) => (addErrors[key as keyof Errors] = ''));

      if (!addForm.name) addErrors.name = 'Name is required';
      if (!addForm.content) addErrors.content = 'Content is required';
      if (Object.values(addErrors).some((error) => error)) return;

      await debouncedHandleSubmit(
        {
          name: addForm.name,
          content: addForm.content,
        },
        'add',
      );
    };

    const handleEditSubmit = async () => {
      Object.keys(editErrors).forEach((key) => (editErrors[key as keyof Errors] = ''));

      if (!editForm.name) editErrors.name = 'Name is required';
      if (!editForm.content) editErrors.content = 'Content is required';
      if (Object.values(editErrors).some((error) => error)) return;

      await debouncedHandleSubmit(
        {
          id: editForm.id,
          name: editForm.name,
          content: editForm.content,
        },
        'edit',
      );
    };

    getTemplates({ page: 1, per_page: 10 });

    return {
      templates,
      loadingTemplates,
      pagination,
      searchQuery,
      addEditForm,
      showView,
      selectedTemplate,
      formMode,
      submitting,
      addForm,
      addErrors,
      editForm,
      editErrors,
      debouncedSearch,
      debouncedHandleSubmit,
      getTemplates,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      columns: computed(() => [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'created_at', sortable: true, label: 'Created' },
        { key: 'updated_at', sortable: true, label: 'Updated' },
        { key: 'actions', sortable: false, label: 'Actions' },
      ]),
      openAddForm,
      openEditForm,
      openView,
      confirmDelete,
      changePage,
      closeForm,
      handleAddSubmit,
      handleEditSubmit,
      resetAddForm,
      resetEditForm,
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
.p-4 {
  padding: 1rem;
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
.space-y-4 > :not(:last-child) {
  margin-bottom: 1rem;
}
.w-64 {
  width: 16rem;
}
.w-full {
  width: 100%;
}
.text-sm {
  font-size: 0.875rem;
}
.font-medium {
  font-weight: 500;
}
.text-gray-700 {
  color: #4b5563;
}
.mt-1 {
  margin-top: 0.25rem;
}
.space-y-2 > :not(:last-child) {
  margin-bottom: 0.5rem;
}
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
</style>