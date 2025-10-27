<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, user, or status"
          class="w-64"
          @input="debouncedSearch"
        />
        <VaSelect
          v-model="pagination.per_page"
          :options="[10, 25, 50]"
          placeholder="Items per page"
          class="w-32"
          @update:modelValue="changePerPage"
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
          @click="openAddForm"
        >
          Add Lease
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :items="leases"
        striped
        :columns="columns"
        :loading="loadingLeases"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="debouncedChangePage"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openEditForm(rowData)" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} leases
        </div>
        <div class="flex space-x-2">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1"
            @click="debouncedChangePage(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page"
            @click="debouncedChangePage(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <LeaseForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <LeaseEdit
        v-if="formMode === 'edit'"
        :lease="selectedLease"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Lease Details', 'Lease Details') }}</div>
      <div v-if="selectedLease" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedLease.property_title || 'N/A' }}</p>
        <p><strong>User:</strong> {{ selectedLease.user_name || 'N/A' }}</p>
        <p><strong>Start Date:</strong> {{ selectedLease.start_date || 'N/A' }}</p>
        <p><strong>End Date:</strong> {{ selectedLease.end_date || 'N/A' }}</p>
        <p><strong>Rent Amount:</strong> {{ selectedLease.rent_amount || 'N/A' }}</p>
        <p><strong>Terms:</strong> {{ selectedLease.terms || 'N/A' }}</p>
        <p><strong>Signed:</strong> {{ selectedLease.is_signed ? 'Yes' : 'No' }}</p>
        <p><strong>Created:</strong> {{ selectedLease.created_at || 'N/A' }}</p>
        <p><strong>Updated:</strong> {{ selectedLease.updated_at || 'N/A' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="showView = false">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import LeaseForm from './LeaseForm.vue'
import LeaseEdit from './LeaseEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'
import makeRequest from '../../../services/makeRequest'
import { format } from 'date-fns'
import type { Lease, Payload } from '../../../types/lease'

export default defineComponent({
  name: 'Leases',
  components: {
    LeaseForm,
    LeaseEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'user_name', sortable: true, label: 'User' },
        { key: 'start_date', sortable: true, label: 'Start Date' },
        { key: 'end_date', sortable: true, label: 'End Date' },
        { key: 'rent_amount', sortable: true, label: 'Rent Amount' },
        { key: 'is_signed', sortable: true, label: 'Signed' },
        { key: 'created_at', sortable: true, label: 'Created' },
        { key: 'updated_at', sortable: true, label: 'Updated' },
        { key: 'actions', sortable: false, label: 'Actions' },
      ],
      leases: [] as Lease[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
      addEditForm: false,
      showView: false,
      selectedLease: null as Lease | null,
      formMode: 'add' as 'add' | 'edit',
      deleting: false,
      submitting: false,
      loadingLeases: false,
      searchQuery: '' as string,
      debouncedHandleSubmit: debounce(
        function (this: any, payload: Payload, mode: 'add' | 'edit') {
          return this.handleSubmit(payload, mode)
        },
        1000,
        { leading: true, trailing: false }
      ) as (payload: Payload, mode: 'add' | 'edit') => void,
      debouncedSearch: debounce(
        function (this: any) {
          return this.handleSearch()
        },
        500
      ) as () => void,
      debouncedChangePage: debounce(
        function (this: any, page: number) {
          return this.changePage(page)
        },
        500,
        { leading: true, trailing: false }
      ) as (page: number) => void,
    }
  },
  mounted() {
    console.log('Leases mounted, fetching leases')
    this.getLeases({ page: 1, per_page: this.pagination.per_page })
  },
  methods: {
    async getLeases(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingLeases = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || this.pagination.current_page,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || this.searchQuery,
          },
        })
        console.log('getLeases response:', response)
        if (response.status === 200) {
          if (!response.data.pagination) {
            throw new Error('Pagination metadata missing in API response')
          }
          this.leases = response.data.data.map((lease: any) => ({
            id: lease.id,
            property_id: lease.property_id,
            property_title: lease.property_title || 'N/A',
            user_id: lease.user_id,
            user_name: lease.user_name || 'N/A',
            start_date: lease.start_date ? format(new Date(lease.start_date), 'd MMMM yyyy') : 'N/A',
            end_date: lease.end_date ? format(new Date(lease.end_date), 'd MMMM yyyy') : 'N/A',
            rent_amount: lease.rent_amount !== null ? lease.rent_amount : 'N/A',
            terms: lease.terms || 'N/A',
            is_signed: lease.is_signed !== null ? lease.is_signed : false,
            created_at: lease.created_at ? format(new Date(lease.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: lease.updated_at ? format(new Date(lease.updated_at), 'd MMMM yyyy') : 'N/A',
            deleted_at: lease.deleted_at ? format(new Date(lease.deleted_at), 'd MMMM yyyy') : null,
          }))
          this.pagination = {
            total: response.data.pagination.total,
            per_page: response.data.pagination.per_page,
            current_page: response.data.pagination.current_page,
            last_page: response.data.pagination.last_page,
          }
          this.searchQuery = params.search || this.searchQuery
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No leases found. Add some leases to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            })
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch leases.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
        return response
      } catch (error: any) {
        console.error('getLeases error:', error)
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch leases.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return { status: 'error', message: error.message || 'Failed to fetch leases.' }
      } finally {
        this.loadingLeases = false
      }
    },
    async changePage(page: number) {
      if (page < 1 || page > this.pagination.last_page) {
        console.warn(`Invalid page number: ${page}`)
        return
      }
      console.log('Changing page to:', page)
      await this.getLeases({ page, per_page: this.pagination.per_page, search: this.searchQuery })
    },
    async changePerPage(perPage: number) {
      console.log('Changing per page to:', perPage)
      this.pagination.per_page = perPage
      this.pagination.current_page = 1
      await this.getLeases({ page: 1, per_page: perPage, search: this.searchQuery })
    },
    async handleSearch() {
      console.log('Searching with query:', this.searchQuery)
      await this.getLeases({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery })
    },
    openAddForm() {
      console.log('Opening add form')
      this.formMode = 'add'
      this.selectedLease = null
      this.addEditForm = true
    },
    openEditForm(lease: Lease) {
      console.log('Opening edit form for lease:', JSON.stringify(lease, null, 2))
      this.formMode = 'edit'
      this.selectedLease = lease
      this.addEditForm = true
    },
    openView(lease: Lease) {
      console.log('Opening view modal for lease:', JSON.stringify(lease, null, 2))
      this.selectedLease = lease
      this.showView = true
    },
    async confirmDelete(lease: Lease) {
      console.log('Confirming delete for lease:', JSON.stringify(lease, null, 2))
      this.selectedLease = lease
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the lease for "${lease.property_title}" by "${lease.user_name}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      })
      if (result.isConfirmed) {
        await this.handleDelete()
      }
    },
    async handleDelete() {
      if (!this.selectedLease?.id) return
      this.deleting = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${this.selectedLease.id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
        })
        console.log('Delete response:', response)
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Lease has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          this.selectedLease = null
          await this.getLeases({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
        } else {
          console.warn('Delete failed with status:', response.status, response.data)
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete lease.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Delete error:', error.response || error)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete lease.',
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
    async handleSubmit(payload: Payload, mode: 'add' | 'edit') {
      if (this.submitting) return
      this.submitting = true
      try {
        let response
        if (mode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: payload,
          })
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${this.selectedLease!.id}`,
            method: 'put',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: payload,
          })
        }
        console.log(`${mode} response:`, response)
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Lease has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          await this.getLeases({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          this.closeForm()
        } else {
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to add lease.' : 'Failed to update lease.')
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
        }
      } catch (error: any) {
        let errorMessage =
          error.response?.data?.message || (mode === 'add' ? 'Failed to add lease.' : 'Failed to update lease.')
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMessage += '\n' + Object.values(error.response.data.errors).flat().join('\n')
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
      } finally {
        this.submitting = false
      }
    },
    cancelAdding() {
      this.closeForm()
      this.getLeases({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      })
    },
    closeForm() {
      console.log('Closing form, resetting selectedLease')
      this.addEditForm = false
      this.showView = false
      this.selectedLease = null
      this.formMode = 'add'
    },
  },
})
</script>

<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 1.5rem;

  @media screen and (max-width: 768px) {
    padding: 1rem;
  }

  @media screen and (max-width: 480px) {
    padding: 0.5rem;
  }
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

.w-32 {
  width: 8rem;
}
</style>