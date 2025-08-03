<template>
  <div class="bg-white shadow-md rounded-lg p-6 sm:p-4">
    <div class="flex flex-col sm:grid sm:grid-cols-3 gap-4 items-center mb-4">
      <div class="flex flex-wrap gap-4 items-center col-span-2">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by title or description"
          class="w-full sm:w-64"
          @input="debouncedSearch"
        />
        <VaSelect
          v-model="filters.category_id"
          placeholder="Filter by category"
          :options="categories"
          value-by="value"
          text-by="text"
          clearable
          class="w-full sm:w-48"
          @update:modelValue="debouncedSearch"
        />
        <VaSelect
          v-model="filters.location_id"
          placeholder="Filter by location"
          :options="locations"
          value-by="value"
          text-by="text"
          clearable
          class="w-full sm:w-48"
          @update:modelValue="debouncedSearch"
        />
        <VaSelect
          v-model="filters.status"
          placeholder="Filter by status"
          :options="[
            { value: 'available', text: 'Available' },
            { value: 'sold', text: 'Sold' },
            { value: 'pending', text: 'Pending' },
            { value: 'rented', text: 'Rented' },
          ]"
          clearable
          class="w-full sm:w-48"
          @update:modelValue="debouncedSearch"
        />
      </div>
      <div class="flex items-center justify-end space-x-2">
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
          Add Property
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <div class="overflow-x-auto">
        <VaDataTable :key="componentKey" :items="properties" striped :columns="columns" :loading="loadingProperties">
          <template #cell(sn)="{ rowIndex }">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="flex space-x-2">
              <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
              <VaButton size="small" color="warning" icon="edit" @click="openForm(rowData, 'edit')" />
              <VaButton size="small" color="danger" icon="delete" @click="deleteProperty(rowData.id)" />
            </div>
          </template>
        </VaDataTable>
      </div>
      <VaPagination
        v-model="pagination.current_page"
        :pages="pagination.last_page"
        :per-page="pagination.per_page"
        :visible-pages="5"
        class="mt-4 flex justify-center"
        @update:modelValue="fetchProperties"
      />
    </template>
    <template v-else>
      <PropertyForm v-if="formMode === 'add'" class="p-4" @close="closeForm" />
      <PropertyEdit v-if="formMode === 'edit' && selectedProperty" :property="selectedProperty" class="p-4" @close="closeForm" />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="large" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Property Details') }}</div>
      <div v-if="selectedProperty" class="space-y-2">
        <p><strong>Title:</strong> {{ selectedProperty.title }}</p>
        <p><strong>Description:</strong> {{ selectedProperty.description || 'N/A' }}</p>
        <p>
          <strong>Category:</strong>
          {{ categories.find((c) => c.value === selectedProperty!.category_id)?.text || 'N/A' }}
        </p>
        <p>
          <strong>Location:</strong>
          {{ locations.find((l) => l.value === selectedProperty!.location_id)?.text || 'N/A' }}
        </p>
        <p><strong>Price:</strong> {{ selectedProperty.price || 'N/A' }}</p>
        <p><strong>Bedrooms:</strong> {{ selectedProperty.bedrooms ?? 'N/A' }}</p>
        <p><strong>Bathrooms:</strong> {{ selectedProperty.bathrooms ?? 'N/A' }}</p>
        <p><strong>Area:</strong> {{ selectedProperty.area_sqft || 'N/A' }}</p>
        <p><strong>Year Built:</strong> {{ selectedProperty.year_built ?? 'N/A' }}</p>
        <p><strong>Status:</strong> {{ selectedProperty.status || 'N/A' }}</p>
        <p><strong>List Date:</strong> {{ selectedProperty.list_date || 'N/A' }}</p>
        <p><strong>Created By:</strong> {{ selectedProperty.user || 'N/A' }}</p>
        <p>
          <strong>Branch:</strong>
          {{ branches.find((b) => b.value === selectedProperty!.branch_id)?.text || 'N/A' }}
        </p>
        <p><strong>Featured:</strong> {{ selectedProperty.is_featured ? 'Yes' : 'No' }}</p>
        <p><strong>Created At:</strong> {{ selectedProperty.created_at || 'N/A' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { usePropertyStore } from '../../../../stores/propertyStore'
import { Property, Filters } from '../../../../types/property'
import PropertyForm from './PropertyForm.vue'
import PropertyEdit from './PropertyEdit.vue'
import Swal from 'sweetalert2'
import { debounce } from 'lodash'

interface SelectOption {
  value: number
  text: string
}

export default defineComponent({
  name: 'PropertyList',
  components: { PropertyForm, PropertyEdit },
  setup() {
    const propertyStore = usePropertyStore()
    const isAdminOrAgent = computed(() => true) // Allow all users since authentication is removed
    return { propertyStore, isAdminOrAgent }
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'title', sortable: true, label: 'Title' },
        { key: 'category', sortable: true, label: 'Category' },
        { key: 'location', sortable: true, label: 'Location' },
        { key: 'price', sortable: true, label: 'Price' },
        { key: 'bedrooms', sortable: true, label: 'Bedrooms' },
        { key: 'bathrooms', sortable: true, label: 'Bathrooms' },
        { key: 'area_sqft', sortable: true, label: 'Area (sqft)' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'list_date', sortable: true, label: 'List Date' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedProperty: null as Property | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      searchQuery: '',
      filters: {
        category_id: null,
        location_id: null,
        status: '',
        min_price: null,
        max_price: null,
      } as Filters,
    }
  },
  computed: {
    properties() {
      return this.propertyStore.properties as Property[]
    },
    loadingProperties() {
      return this.propertyStore.loadingProperties
    },
    pagination() {
      return this.propertyStore.pagination
    },
    categories() {
      return this.propertyStore.categories.map((category: any) => ({
        value: category.id,
        text: category.name || `Category ${category.id}`,
      })) as SelectOption[]
    },
    locations() {
      return this.propertyStore.locations.map((location: any) => ({
        value: location.id,
        text: location.name || `Location ${location.id}`,
      })) as SelectOption[]
    },
    branches() {
      return this.propertyStore.branches.map((branch: any) => ({
        value: branch.id,
        text: branch.name || `Branch ${branch.id}`,
      })) as SelectOption[]
    },
  },
  async mounted() {
    await Promise.all([
      this.propertyStore.getCategories(),
      this.propertyStore.getLocations(),
      this.propertyStore.getBranches(),
      this.fetchProperties(),
    ])
    this.componentKey += 1
  },
  created() {
    this.debouncedSearch = debounce(this.fetchProperties, 500)
  },
  methods: {
    async fetchProperties() {
      const params = {
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery || undefined,
        category_id: this.filters.category_id || undefined,
        location_id: this.filters.location_id || undefined,
        status: this.filters.status || undefined,
        min_price: this.filters.min_price || undefined,
        max_price: this.filters.max_price || undefined,
      }
      await this.propertyStore.getProperties(params)
      this.componentKey += 1
    },
    openForm(property: Property | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedProperty = property
      this.formMode = mode
      this.addEditForm = true
    },
    closeForm() {
      this.selectedProperty = null
      this.addEditForm = false
      this.formMode = 'add'
      this.fetchProperties()
    },
    openView(property: Property) {
      this.propertyStore.getProperty(property.id).then((response: any) => {
        if (response.status === 200 && response.data?.data) {
          this.selectedProperty = response.data.data as Property
          this.showView = true
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch property details.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      }).catch((err: any) => {
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to fetch property details.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      })
    },
    closeView() {
      this.selectedProperty = null
      this.showView = false
    },
    cancelAdding() {
      this.closeForm()
    },
    async deleteProperty(id: number) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      })
      if (result.isConfirmed) {
        try {
          const response = await this.propertyStore.deleteProperty(id)
          if (response.status === 200) {
            this.fetchProperties()
            Swal.fire({
              title: 'Deleted!',
              text: 'Property deleted successfully.',
              icon: 'success',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            })
          }
        } catch (err: any) {
          const errorMessage =
            err.response?.data?.message ||
            'Failed to delete property.' +
              (err.response?.status === 422 && err.response?.data?.errors
                ? '; ' + Object.values(err.response.data.errors).flat().join('; ')
                : '')
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
      }
    },
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
.sm\:p-4 {
  @media (min-width: 640px) {
    padding: 1rem;
  }
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.w-full {
  width: 100%;
}
.sm\:w-64 {
  @media (min-width: 640px) {
    width: 16rem;
  }
}
.sm\:w-48 {
  @media (min-width: 640px) {
    width: 12rem;
  }
}
.gap-4 {
  gap: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.overflow-x-auto {
  overflow-x: auto;
}
.flex-col {
  flex-direction: column;
}
.sm\:grid {
  @media (min-width: 640px) {
    display: grid;
  }
}
.sm\:grid-cols-3 {
  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}
.space-y-2 {
  > :not(:last-child) {
    margin-bottom: 0.5rem;
  }
}
</style>