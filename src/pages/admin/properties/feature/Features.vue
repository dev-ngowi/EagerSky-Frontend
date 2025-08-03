<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput v-model="searchQuery" placeholder="Search by feature name" class="w-64" @input="debouncedSearch" />
        <VaSelect
          v-model="filters.property_id"
          placeholder="Filter by property"
          :options="properties"
          value-by="value"
          text-by="text"
          clearable
          :loading="loadingProperties"
          @update:modelValue="debouncedSearch"
        />
      </div>
      <div>
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
        :items="propertyFeatures"
        striped
        :columns="columns"
        :loading="loadingPropertyFeatures"
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
      <VaPagination
        v-model="pagination.current_page"
        :pages="pagination.last_page"
        :per-page="pagination.per_page"
        :visible-pages="5"
        class="mt-4"
        @update:modelValue="fetchPropertyFeatures"
      />
    </template>
    <template v-else>
      <PropertyFeatureForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <PropertyFeatureEdit
        v-if="formMode === 'edit'"
        :feature="selectedPropertyFeature"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">Property Feature Details</div>
      <div v-if="selectedPropertyFeature" class="space-y-2">
        <p><strong>Property ID:</strong> {{ selectedPropertyFeature.property_id }}</p>
        <p><strong>Property Title:</strong> {{ selectedPropertyFeature.property_title || 'None' }}</p>
        <p><strong>Feature Name:</strong> {{ selectedPropertyFeature.feature_name }}</p>
        <p><strong>Value:</strong> {{ selectedPropertyFeature.value }}</p>
        <p><strong>Created At:</strong> {{ selectedPropertyFeature.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedPropertyFeature.updated_at }}</p>
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
import { usePropertyFeatureStore } from '../../../../stores/propertyFeature-store'
import PropertyFeatureForm from './FeatureForm.vue'
import PropertyFeatureEdit from './FeatureEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'
import makeRequest from '../../../../services/makeRequest'

export default defineComponent({
  name: 'PropertyFeatureList',
  components: {
    PropertyFeatureForm,
    PropertyFeatureEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'feature_name', sortable: true, label: 'Feature Name' },
        { key: 'value', sortable: true, label: 'Value' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedPropertyFeature: null as any,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      filters: {
        property_id: null as number | null,
      },
      properties: [] as { value: number; text: string }[],
      loadingProperties: false,
    }
  },
  computed: {
    ...mapState(usePropertyFeatureStore, ['propertyFeatures', 'loadingPropertyFeatures', 'pagination']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 500, { leading: true, trailing: false })
    this.debouncedSearch = debounce(this.fetchPropertyFeatures, 500)
  },
  mounted() {
    this.fetchPropertyFeatures()
    this.fetchProperties()
  },
  methods: {
    ...mapActions(usePropertyFeatureStore, [
      'getPropertyFeatures',
      'deletePropertyFeature',
      'addPropertyFeature',
      'updatePropertyFeature',
    ]),

    async fetchProperties() {
      this.loadingProperties = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }))
        }
      } catch (error: any) {
        console.error('fetchProperties error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingProperties = false
      }
    },

    async fetchPropertyFeatures() {
      console.log('fetchPropertyFeatures called') // Debug log
      const params = {
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery || undefined,
        property_id: this.filters.property_id || undefined,
      }
      try {
        await this.getPropertyFeatures(params)
        console.log('Fetched propertyFeatures:', this.propertyFeatures) // Debug log
        this.componentKey += 1 // Force table re-render
      } catch (error: any) {
        console.error('fetchPropertyFeatures error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: 'Failed to fetch property features.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      }
    },

    openForm(propertyFeature = null, mode: 'add' | 'edit' = 'add') {
      this.selectedPropertyFeature = propertyFeature
      this.formMode = mode
      this.addEditForm = true
    },

    closeForm() {
      this.selectedPropertyFeature = null
      this.addEditForm = false
      this.formMode = 'add'
      // Only fetch if not already fetching to avoid duplicates
      if (!this.loadingPropertyFeatures) {
        this.fetchPropertyFeatures()
      }
    },

    openView(propertyFeature: any) {
      this.selectedPropertyFeature = propertyFeature
      this.showView = true
    },

    closeView() {
      this.selectedPropertyFeature = null
      this.showView = false
    },

    confirmDelete(propertyFeature: any) {
      this.selectedPropertyFeature = propertyFeature
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the feature "${propertyFeature.feature_name}" for property "${propertyFeature.property_title}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete()
        }
      })
    },

    cancelAdding() {
      this.closeForm()
    },

    async handleDelete() {
      if (!this.selectedPropertyFeature?.id) return
      this.deleting = true
      try {
        const response = await this.deletePropertyFeature(this.selectedPropertyFeature.id)
        if (response.status === 200) {
          this.selectedPropertyFeature = null
          await this.fetchPropertyFeatures()
        }
      } catch (err: any) {
        console.error('Delete error:', err.response || err)
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete feature.',
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
      console.log('handleSubmit called with payload:', payload, 'mode:', mode) // Debug log
      try {
        let response
        if (mode === 'add') {
          response = await this.addPropertyFeature(payload)
        } else {
          response = await this.updatePropertyFeature({ id: this.selectedPropertyFeature.id, ...payload })
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: mode === 'add' ? 'Feature added successfully.' : 'Feature updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
          this.closeForm() // Close form and reload table
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response || err)
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || `Failed to ${mode} feature.`,
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
.w-64 {
  width: 16rem;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
</style>