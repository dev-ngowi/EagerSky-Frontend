<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by name, email, or phone"
          class="w-64"
          @input="debouncedSearch"
        />
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
          Add Client
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="clients"
        striped
        :columns="columns"
        :loading="loadingClients"
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
          {{ pagination.total }} clients
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
      <ClientForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <ClientEdit
        v-if="formMode === 'edit'"
        :client="selectedClient"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Client Details') }}</div>
      <div v-if="selectedClient" class="space-y-2">
        <p><strong>Name:</strong> {{ selectedClient.name }}</p>
        <p><strong>Email:</strong> {{ selectedClient.email }}</p>
        <p><strong>Phone:</strong> {{ selectedClient.phone }}</p>
        <p><strong>Type:</strong> {{ selectedClient.type }}</p>
        <p><strong>Bookings Count:</strong> {{ selectedClient.bookings_count }}</p>
        <p><strong>Leads Count:</strong> {{ selectedClient.leads_count }}</p>
        <p><strong>Transactions Count:</strong> {{ selectedClient.transactions_count }}</p>
        <p><strong>Leases Count:</strong> {{ selectedClient.leases_count }}</p>
        <p><strong>Maintenance Requests Count:</strong> {{ selectedClient.maintenance_requests_count }}</p>
        <p><strong>Rental Applications Count:</strong> {{ selectedClient.rental_applications_count }}</p>
        <p><strong>Created At:</strong> {{ selectedClient.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedClient.updated_at }}</p>
        <p v-if="selectedClient.deleted_at"><strong>Deleted At:</strong> {{ selectedClient.deleted_at }}</p>
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
import { useClientStore } from '../../../../stores/clientStore'
import ClientForm from './ClientForm.vue'
import ClientEdit from './ClientEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'

export default defineComponent({
  name: 'ClientList',
  components: {
    ClientForm,
    ClientEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'email', sortable: true, label: 'Email' },
        { key: 'phone', sortable: true, label: 'Phone' },
        { key: 'type', sortable: true, label: 'Type' },
        { key: 'bookings_count', sortable: true, label: 'Bookings' },
        { key: 'leads_count', sortable: true, label: 'Leads' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedClient: null as any,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
    }
  },
  computed: {
    ...mapState(useClientStore, ['clients', 'loadingClients', 'pagination']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false })
    this.debouncedSearch = debounce(this.handleSearch, 500)
  },
  mounted() {
    this.getClients({ page: 1, per_page: 10 })
  },
  methods: {
    ...mapActions(useClientStore, ['getClients', 'deleteClient', 'addClient', 'updateClient']),

    openForm(client = null, mode: 'add' | 'edit' = 'add') {
      this.selectedClient = client
      this.formMode = mode
      this.addEditForm = true
    },

    closeForm() {
      this.selectedClient = null
      this.addEditForm = false
      this.formMode = 'add'
    },

    openView(client: any) {
      this.selectedClient = client
      this.showView = true
    },

    closeView() {
      this.selectedClient = null
      this.showView = false
    },

    confirmDelete(client: any) {
      this.selectedClient = client
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the client "${client.name}". This action cannot be undone.`,
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
      this.getClients({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      })
    },

    async handleDelete() {
      if (!this.selectedClient?.id) return
      this.deleting = true
      try {
        const response = await this.deleteClient(this.selectedClient.id)
        console.log('Delete response:', response)
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Client has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          this.selectedClient = null
          this.componentKey += 1
          await this.getClients({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
        } else {
          console.warn('Delete failed with status:', response.status, response.data)
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete client.',
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
          text: err.response?.data?.message || 'Failed to delete client.',
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
          response = await this.addClient(payload)
        } else {
          response = await this.updateClient({ id: this.selectedClient.id, ...payload })
        }
        console.log(`${mode} response:`, response)
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Client has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          await this.getClients({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          this.componentKey += 1
          this.closeForm()
        } else {
          console.warn(`${mode} failed with status:`, response.status, response.data)
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to add client.' : 'Failed to update client.')
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
          err.response?.data?.message || (mode === 'add' ? 'Failed to add client.' : 'Failed to update client.')
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
      await this.getClients({ page, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
    },

    async handleSearch() {
      await this.getClients({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery })
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
