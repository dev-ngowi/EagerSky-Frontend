<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-end items-center mb-4">
      <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
        Done
      </VaButton>
    
    </div>
    <template v-if="!addEditForm">
      <VaDataTable :key="componentKey" :items="roles" striped :columns="columns" :loading="loadingRoles">
        <template #cell(sn)="{ rowIndex }">
          {{ rowIndex + 1 }}
        </template>
        
      </VaDataTable>
    </template>
    <template v-else>
      <RoleForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <RoleEdit v-if="formMode === 'edit'" :role="selectedRole" @close="closeForm" @submit="debouncedHandleSubmit" />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Role Details') }}</div>
      <div v-if="selectedRole" class="space-y-2">
        <p><strong>Role Name:</strong> {{ selectedRole.name }}</p>
        <p><strong>Description:</strong> {{ selectedRole.description }}</p>
        <p><strong>Created At:</strong> {{ selectedRole.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedRole.updated_at }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { mapActions, mapState } from 'pinia'
import { useRoleStore } from '../../../../stores/roleStore'
import RoleForm from './RoleForm.vue'
import RoleEdit from './RoleEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'

export default defineComponent({
  name: 'RoleList',
  components: {
    RoleForm,
    RoleEdit,
  },
  setup() {
    const isAdmin = computed(() => {
      return true // Assume admin for demo; adjust based on auth
    })

    return { isAdmin }
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Role Name' },
        { key: 'description', sortable: true, label: 'Description' },
        { key: 'created_at', sortable: true, label: 'Created At' },
      ],
      addEditForm: false,
      showView: false,
      selectedRole: null as any,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
    }
  },
  computed: {
    ...mapState(useRoleStore, ['roles', 'loadingRoles']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false })
  },
  mounted() {
    this.getRoles()
  },
  methods: {
    ...mapActions(useRoleStore, ['getRoles', 'deleteRole', 'addRole', 'updateRole']),

    openForm(role = null, mode: 'add' | 'edit' = 'add') {
      this.selectedRole = role
      this.formMode = mode
      this.addEditForm = true
    },

    closeForm() {
      this.selectedRole = null
      this.addEditForm = false
      this.formMode = 'add'
    },

    openView(role: any) {
      this.selectedRole = role
      this.showView = true
    },

    closeView() {
      this.selectedRole = null
      this.showView = false
    },

    confirmDelete(role: any) {
      this.selectedRole = role
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the role "${role.name}". This action cannot be undone.`,
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
      this.getRoles()
    },

    async handleDelete() {
      if (!this.selectedRole?.id) return
      this.deleting = true
      try {
        const response = await this.deleteRole(this.selectedRole.id)
        console.log('Delete response:', response)
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Role deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          this.selectedRole = null
          this.componentKey += 1
          await this.getRoles()
        } else {
          console.warn('Delete failed with status:', response.status, response.data)
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete role.',
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
          text: err.response?.data?.message || 'Failed to delete role.',
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
          response = await this.addRole(payload)
        } else {
          response = await this.updateRole(payload, this.selectedRole.id)
        }
        console.log(`${mode} response:`, response)
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Role has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          await this.getRoles()
          this.componentKey += 1
          this.closeForm()
        } else {
          console.warn(`${mode} failed with status:`, response.status, response.data)
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to add role.' : 'Failed to update role.')
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
          err.response?.data?.message || (mode === 'add' ? 'Failed to add role.' : 'Failed to update role.')
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

    debouncedHandleSubmit: Function as (payload: any, mode: 'add' | 'edit') => void,
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
</style>
