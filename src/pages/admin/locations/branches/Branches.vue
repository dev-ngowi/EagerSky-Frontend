<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput v-model="searchQuery" placeholder="Search by name or address" class="w-64" @input="debouncedSearch" />
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
          Add
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="branches"
        striped
        :columns="columns"
        :loading="loadingBranches"
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
          {{ pagination.total }} branches
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
      <BranchForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <BranchEdit
        v-if="formMode === 'edit'"
        :branch="selectedBranch"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Branch Details') }}</div>
      <div v-if="selectedBranch" class="space-y-2">
        <p><strong>Name:</strong> {{ selectedBranch.name }}</p>
        <p><strong>Address:</strong> {{ selectedBranch.address }}</p>
        <p><strong>Users Count:</strong> {{ selectedBranch.users_count }}</p>
        <p><strong>Properties Count:</strong> {{ selectedBranch.properties_count }}</p>
        <p><strong>Created At:</strong> {{ selectedBranch.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedBranch.updated_at }}</p>
        <p><strong>Deleted At:</strong> {{ selectedBranch.deleted_at || 'None' }}</p>
        <div v-if="selectedBranch.users && selectedBranch.users.length">
          <strong>Users:</strong>
          <ul class="list-disc pl-5">
            <li v-for="user in selectedBranch.users" :key="user.id">{{ user.fullname }}</li>
          </ul>
        </div>
        <div v-if="selectedBranch.properties && selectedBranch.properties.length">
          <strong>Properties:</strong>
          <ul class="list-disc pl-5">
            <li v-for="property in selectedBranch.properties" :key="property.id">{{ property.title }}</li>
          </ul>
        </div>
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
import { useBranchStore } from '../../../../stores/branchStore'
import BranchForm from './BranchForm.vue'
import BranchEdit from './BranchEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'

export default defineComponent({
  name: 'BranchList',
  components: {
    BranchForm,
    BranchEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'address', sortable: true, label: 'Address' },
        { key: 'users_count', sortable: true, label: 'Users Count' },
        { key: 'properties_count', sortable: true, label: 'Properties Count' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedBranch: null as any,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
    }
  },
  computed: {
    ...mapState(useBranchStore, ['branches', 'loadingBranches', 'pagination']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false })
    this.debouncedSearch = debounce(this.handleSearch, 500)
  },
  mounted() {
    this.getBranches({ page: 1, per_page: 10 })
  },
  methods: {
    ...mapActions(useBranchStore, ['getBranches', 'deleteBranch', 'addBranch', 'updateBranch']),

    openForm(branch = null, mode: 'add' | 'edit' = 'add') {
      this.selectedBranch = branch
      this.formMode = mode
      this.addEditForm = true
    },

    closeForm() {
      this.selectedBranch = null
      this.addEditForm = false
      this.formMode = 'add'
    },

    openView(branch: any) {
      this.selectedBranch = branch
      this.showView = true
    },

    closeView() {
      this.selectedBranch = null
      this.showView = false
    },

    confirmDelete(branch: any) {
      this.selectedBranch = branch
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the branch "${branch.name}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
        timer: undefined,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete()
        }
      })
    },

    cancelAdding() {
      this.closeForm()
      this.getBranches({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      })
    },

    async handleDelete() {
      if (!this.selectedBranch?.id) return
      this.deleting = true
      try {
        const response = await this.deleteBranch(this.selectedBranch.id)
        console.log('Delete response:', response)
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Branch has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          this.selectedBranch = null
          this.componentKey += 1
          await this.getBranches({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
        } else {
          console.warn('Delete failed with status:', response.status, response.data)
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete branch.',
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
          text: err.response?.data?.message || 'Failed to delete branch.',
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
          response = await this.addBranch(payload)
        } else {
          response = await this.updateBranch({ id: this.selectedBranch.id, ...payload })
        }
        console.log(`${mode} response:`, response)
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Branch has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          await this.getBranches({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          this.componentKey += 1
          this.closeForm()
        } else {
          console.warn(`${mode} failed with status:`, response.status, response.data)
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to create branch.' : 'Failed to update branch.')
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
          err.response?.data?.message || (mode === 'add' ? 'Failed to create branch.' : 'Failed to update branch.')
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
      await this.getBranches({ page, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
    },

    async handleSearch() {
      await this.getBranches({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
    },

    debouncedHandleSubmit: Function as (payload: any, mode: 'add' | 'edit') => void,
    debouncedSearch: Function as () => void,
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
