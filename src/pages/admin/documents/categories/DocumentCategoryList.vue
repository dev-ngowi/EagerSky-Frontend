<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput v-model="searchQuery" placeholder="Search by category name" class="w-64" @input="debouncedSearch" />
      </div>
      <div class="flex space-x-2">
        <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
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
          Add Category
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="documentCategories"
        striped
        :columns="columns"
        :loading="loadingDocumentCategories"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} categories
        </div>
        <div class="flex space-x-2">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1"
            @click="handlePageChange(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page"
            @click="handlePageChange(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <DocumentCategoryForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <DocumentCategoryEdit
        v-if="formMode === 'edit'"
        :document-category="selectedCategory"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Document Category Details') }}</div>
      <div v-if="selectedCategory" class="space-y-2">
        <p><strong>ID:</strong> {{ selectedCategory.id }}</p>
        <p><strong>Name:</strong> {{ selectedCategory.name }}</p>
        <p><strong>Created At:</strong> {{ selectedCategory.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedCategory.updated_at }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions, mapState } from 'pinia'
import { useDocumentCategoryStore } from '../../../../stores/documentCategoryStore'
import DocumentCategoryForm from './DocumentCategoryForm.vue'
import DocumentCategoryEdit from './DocumentCategoryEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'

export default defineComponent({
  name: 'DocumentCategoryList',
  components: { DocumentCategoryForm, DocumentCategoryEdit },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'updated_at', sortable: true, label: 'Updated At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedCategory: null as any,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedSearch: Function as () => void,
      debouncedHandleSubmit: Function as (payload: any, mode: 'add' | 'edit') => void,
    }
  },
  computed: {
    ...mapState(useDocumentCategoryStore, [
      'documentCategories',
      'loadingDocumentCategories',
      'pagination',
      'searchQuery',
    ]),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false })
    this.debouncedSearch = debounce(this.handleSearch, 500)
  },
  mounted() {
    this.getDocumentCategories({ page: 1, per_page: 10 })
  },
  methods: {
    ...mapActions(useDocumentCategoryStore, [
      'getDocumentCategories',
      'addDocumentCategory',
      'updateDocumentCategory',
      'deleteDocumentCategory',
    ]),
    openForm(category = null, mode: 'add' | 'edit' = 'add') {
      this.selectedCategory = category
      this.formMode = mode
      this.addEditForm = true
    },
    closeForm() {
      this.selectedCategory = null
      this.addEditForm = false
      this.formMode = 'add'
    },
    openView(category: any) {
      this.selectedCategory = category
      this.showView = true
    },
    closeView() {
      this.selectedCategory = null
      this.showView = false
    },
    cancelAdding() {
      this.closeForm()
      this.getDocumentCategories({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      })
    },
    async confirmDelete(category: any) {
      this.selectedCategory = category
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the category "${category.name}". This action cannot be undone unless no documents are associated with this category.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
        timer: undefined,
      })
      if (result.isConfirmed) {
        await this.handleDelete()
      }
    },
    async handleDelete() {
      if (!this.selectedCategory?.id) return
      this.deleting = true
      try {
        const response = await this.deleteDocumentCategory(this.selectedCategory.id)
        console.log('Delete response:', response)
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Document category has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          this.selectedCategory = null
          this.componentKey += 1
          await this.getDocumentCategories({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
        } else {
          console.warn('Delete failed with status:', response.status, response.data)
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete document category.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (err: any) {
        console.error('Delete error:', err.response || err)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to delete document category.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.deleting = false
      }
    },
    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      if (this.submitting) return
      this.submitting = true
      try {
        let response
        if (mode === 'add') {
          response = await this.addDocumentCategory(payload)
        } else {
          response = await this.updateDocumentCategory(payload, payload.id)
        }
        console.log(`${mode} response:`, response)
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Document category has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          await this.getDocumentCategories({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          this.componentKey += 1
          this.closeForm()
        } else {
          console.warn(`${mode} failed with status:`, response.status, response.data)
          let errorMessage =
            response.data?.message ||
            (mode === 'add' ? 'Failed to add document category.' : 'Failed to update document category.')
          if (response.status === 422 && response.data?.errors) {
            errorMessage += '\n' + Object.values(response.data.errors).flat().join('\n')
          }
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
          return
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response || err)
        let errorMessage =
          err.response?.data?.message ||
          (mode === 'add' ? 'Failed to add document category.' : 'Failed to update document category.')
        if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage += '\n' + Object.values(err.response.data.errors).flat().join('\n')
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        return
      } finally {
        this.submitting = false
      }
    },
    async handlePageChange(page: number) {
      await this.getDocumentCategories({ page, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
    },
    async handleSearch() {
      await this.getDocumentCategories({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
    },
  },
})
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
</style>
