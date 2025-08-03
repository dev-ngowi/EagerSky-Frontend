<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by agent or property"
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
          Add Schedule
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="schedules"
        striped
        :columns="columns"
        :loading="loadingSchedules"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(status)="{ rowData }">
          {{ rowData.status }}
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
          {{ pagination.total }} schedules
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
      <ScheduleForm v-if="formMode === 'add'" @close="closeForm" @submit="handleSubmit($event, 'add')" />
      <ScheduleEdit
        v-if="formMode === 'edit' && selectedSchedule"
        :schedule="selectedSchedule"
        @close="closeForm"
        @submit="handleSubmit($event, 'edit')"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Schedule Details', 'Schedule Details') }}</div>
      <div v-if="selectedSchedule" class="space-y-2">
        <p><strong>Agent:</strong> {{ selectedSchedule.agent_name || 'None' }}</p>
        <p><strong>Property:</strong> {{ selectedSchedule.property_title || 'None' }}</p>
        <p><strong>Start Time:</strong> {{ selectedSchedule.start_time || 'None' }}</p>
        <p><strong>End Time:</strong> {{ selectedSchedule.end_time || 'None' }}</p>
        <p><strong>Status:</strong> {{ selectedSchedule.status || 'None' }}</p>
        <p><strong>Notes:</strong> {{ selectedSchedule.notes || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedSchedule.created_at || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ selectedSchedule.updated_at || 'None' }}</p>
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
import { useScheduleStore } from '../../../../stores/scheduleStore'
import ScheduleForm from './ScheduleForm.vue'
import ScheduleEdit from './ScheduleEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'
import type { Schedule } from '../../../../types/schedule'

export default defineComponent({
  name: 'ScheduleList',
  components: {
    ScheduleForm,
    ScheduleEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'agent_name', sortable: true, label: 'Agent' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'start_time', sortable: true, label: 'Start Time' },
        { key: 'end_time', sortable: true, label: 'End Time' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedSchedule: null as Schedule | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedSearch: null as any,
    }
  },
  computed: {
    ...mapState(useScheduleStore, ['schedules', 'loadingSchedules', 'pagination']),
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500)
  },
  mounted() {
    console.log('ScheduleList mounted, fetching schedules')
    this.getSchedules({ page: 1, per_page: 10 })
  },
  methods: {
    ...mapActions(useScheduleStore, ['getSchedules', 'deleteSchedule', 'addSchedule', 'updateSchedule']),

    openForm(schedule: Schedule | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !schedule) {
        console.error('Cannot open edit form without a valid schedule')
        Swal.fire({
          title: 'Error!',
          text: 'No schedule selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        return
      }
      this.selectedSchedule = schedule
        ? {
            ...schedule,
            agent_id: Number(schedule.agent_id),
            property_id: schedule.property_id ? Number(schedule.property_id) : null,
          }
        : null
      this.formMode = mode
      this.addEditForm = true
      if (mode === 'edit' && schedule) {
        console.log('Schedule data to be edited:', JSON.stringify(this.selectedSchedule, null, 2))
      }
    },

    closeForm() {
      console.log('Closing form, resetting selectedSchedule and formMode')
      this.selectedSchedule = null
      this.addEditForm = false
      this.formMode = 'add'
    },

    openView(schedule: Schedule) {
      this.selectedSchedule = schedule
      this.showView = true
    },

    closeView() {
      this.selectedSchedule = null
      this.showView = false
    },

    confirmDelete(schedule: Schedule) {
      this.selectedSchedule = schedule
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the schedule for "${schedule.agent_name}" starting on ${schedule.start_time}. This action cannot be undone.`,
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

    async handleDelete() {
      if (!this.selectedSchedule?.id) {
        console.error('No schedule selected for deletion')
        Swal.fire({
          title: 'Error!',
          text: 'No schedule selected for deletion.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        return
      }

      this.deleting = true
      try {
        const response = await this.deleteSchedule(this.selectedSchedule.id)
        console.log('Delete response:', response)
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Schedule deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
          await this.getSchedules({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          this.componentKey += 1
          this.closeView()
        }
      } catch (error: any) {
        console.error('Delete error:', error.response || error)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete schedule.',
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

    cancelAdding() {
      console.log('Cancel adding, refreshing schedules')
      this.closeForm()
      this.getSchedules({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      }).then(() => {
        this.componentKey += 1
        console.log('Schedules refreshed after cancel, new componentKey:', this.componentKey)
      })
    },

    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      if (this.submitting) {
        console.warn('Submission already in progress, ignoring')
        return
      }
      this.submitting = true
      try {
        let response
        if (mode === 'add') {
          console.log('Submitting add schedule payload:', payload)
          response = await this.addSchedule(payload)
        } else {
          if (!this.selectedSchedule?.id) {
            throw new Error('No schedule selected for editing')
          }
          console.log('Submitting update schedule payload:', { id: this.selectedSchedule.id, ...payload })
          response = await this.updateSchedule({ id: this.selectedSchedule.id, ...payload })
        }
        console.log(`${mode} response:`, response)
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Schedule has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          })
          console.log('Fetching updated schedules after successful submission')
          await this.getSchedules({
            page: 1, // Reset to page 1 to ensure new data is visible
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          })
          this.componentKey += 1
          console.log('Updated componentKey:', this.componentKey, 'Schedules:', this.schedules)
          this.closeForm()
        } else {
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to add schedule.' : 'Failed to update schedule.')
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
      } catch (err: any) {
        console.error(`${mode} error:`, err.response || err)
        let errorMessage =
          err.response?.data?.message || (mode === 'add' ? 'Failed to add schedule.' : 'Failed to update schedule.')
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
      } finally {
        this.submitting = false
      }
    },

    async handlePageChange(page: number) {
      console.log('Changing page to:', page)
      await this.getSchedules({ page, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
      console.log('Page changed, new componentKey:', this.componentKey, 'Schedules:', this.schedules)
    },

    async handleSearch() {
      console.log('Searching with query:', this.searchQuery)
      await this.getSchedules({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery })
      this.componentKey += 1
      console.log('Search completed, new componentKey:', this.componentKey, 'Schedules:', this.schedules)
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