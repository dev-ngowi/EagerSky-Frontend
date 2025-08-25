<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput v-model="searchQuery" placeholder="Search by name" class="w-64" @input="debouncedSearch" />
        <VaSelect
          v-model="filters.country_id"
          placeholder="Filter by country"
          :options="countries"
          value-by="value"
          text-by="text"
          clearable
          :loading="loadingCountries"
          @update:modelValue="debouncedSearch"
        />
        <VaSelect
          v-model="filters.city_id"
          placeholder="Filter by city"
          :options="cities"
          value-by="value"
          text-by="text"
          clearable
          :loading="loadingCities"
          :disabled="!filters.country_id"
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
      <VaDataTable :key="componentKey" :items="locations" striped :columns="columns" :loading="loadingLocations">
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
        @update:modelValue="fetchLocations"
      />
    </template>
    <template v-else>
      <LocationForm v-if="formMode === 'add'" @close="closeForm" @submit="debouncedHandleSubmit" />
      <LocationEdit
        v-if="formMode === 'edit' && selectedLocation"
        :location="selectedLocation"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Location Details') }}</div>
      <div v-if="selectedLocation" class="space-y-2">
        <p><strong>Name:</strong> {{ selectedLocation.name }}</p>
        <p><strong>City:</strong> {{ selectedLocation.city || 'None' }}</p>
        <p><strong>Country:</strong> {{ selectedLocation.country || 'None' }}</p>
        <p><strong>Street:</strong> {{ selectedLocation.street || 'None' }}</p>
        <p><strong>Neighborhood:</strong> {{ selectedLocation.neighborhood || 'None' }}</p>
        <p><strong>Latitude:</strong> {{ selectedLocation.latitude || 'None' }}</p>
        <p><strong>Longitude:</strong> {{ selectedLocation.longitude || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedLocation.created_at || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ selectedLocation.updated_at || 'None' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapState } from 'pinia';
import { useLocationStore } from '../../../../stores/locationStore';
import { Location, CountryOption, CityOption } from '../../../../types/location';
import LocationForm from './LocationForm.vue';
import LocationEdit from './LocationEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';

export default defineComponent({
  name: 'LocationList',
  components: {
    LocationForm,
    LocationEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'city', sortable: true, label: 'City' },
        { key: 'country', sortable: true, label: 'Country' },
        { key: 'street', sortable: true, label: 'Street' },
        { key: 'neighborhood', sortable: true, label: 'Neighborhood' },
        { key: 'latitude', sortable: true, label: 'Latitude' },
        { key: 'longitude', sortable: true, label: 'Longitude' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      addEditForm: false,
      showView: false,
      selectedLocation: null as Location | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      filters: {
        country_id: null as number | null,
        city_id: null as number | null,
      },
      countries: [] as CountryOption[],
      cities: [] as CityOption[],
      loadingCountries: false,
      loadingCities: false,
    };
  },
  computed: {
    ...mapState(useLocationStore, ['locations', 'loadingLocations', 'pagination']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
    this.debouncedSearch = debounce(this.fetchLocations, 500);
  },
  mounted() {
    this.fetchLocations();
    this.fetchCountries();
    this.fetchCities();
  },
  methods: {
    ...mapActions(useLocationStore, ['getLocations', 'deleteLocation', 'addLocation', 'updateLocation']),

    async fetchCountries() {
      this.loadingCountries = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/country`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        if (response.status === 200) {
          this.countries = response.data.data.map((country: any) => ({
            value: country.id,
            text: country.name || `Country ${country.id}`,
          }));
        }
      } catch (error: any) {
        console.error('fetchCountries error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch countries.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingCountries = false;
      }
    },

    async fetchCities() {
      if (!this.filters.country_id) {
        this.cities = [];
        this.filters.city_id = null;
        return;
      }
      this.loadingCities = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/city`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params: { country_id: this.filters.country_id },
        });
        if (response.status === 200) {
          this.cities = response.data.data.map((city: any) => ({
            value: city.id,
            text: city.name || `City ${city.id}`,
          }));
          if (!this.cities.some((city) => city.value === this.filters.city_id)) {
            this.filters.city_id = null;
          }
        }
      } catch (error: any) {
        console.error('fetchCities error:', error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch cities.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingCities = false;
      }
    },

    async fetchLocations() {
      const params = {
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery || undefined,
        country_id: this.filters.country_id || undefined,
        city_id: this.filters.city_id || undefined,
      };
      await this.getLocations(params);
      this.componentKey += 1;
    },

    openForm(location: Location | null = null, mode: 'add' | 'edit' = 'add') {
      if (mode === 'edit' && !location) {
        Swal.fire({
          title: 'Error!',
          text: 'No location selected for editing.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      this.selectedLocation = location || {
        id: 0, // Temporary ID for new location, will be ignored in addLocation
        name: '',
        city_id: null,
        country_id: null,
        street_id: null,
        neighborhood_id: null,
        latitude: null,
        longitude: null,
        country: null,
        city: null,
        street: null,
        neighborhood: null,
        created_at: null,
        updated_at: null,
      };
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedLocation = null;
      this.addEditForm = false;
      this.formMode = 'add';
    },

    openView(location: Location) {
      this.selectedLocation = location;
      this.showView = true;
    },

    closeView() {
      this.selectedLocation = null;
      this.showView = false;
    },

    confirmDelete(location: Location) {
      this.selectedLocation = location;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the location "${location.name}". This action cannot be undone.`,
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
          this.handleDelete();
        }
      });
    },

    cancelAdding() {
      this.closeForm();
      this.fetchLocations();
    },

    async handleDelete() {
      if (!this.selectedLocation?.id) return;
      this.deleting = true;
      try {
        const response = await this.deleteLocation(this.selectedLocation.id);
        if (response.status === 200 || response.status === 204) {
          this.selectedLocation = null;
          this.componentKey += 1;
          await this.fetchLocations();
        }
      } catch (err: any) {
        console.error('Delete error:', err.response || err);
      } finally {
        this.deleting = false;
      }
    },

    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response;
        if (mode === 'add') {
          response = await this.addLocation(payload);
        } else {
          if (!this.selectedLocation?.id) {
            throw new Error('No location ID provided for update');
          }
          response = await this.updateLocation({ id: this.selectedLocation.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          this.closeForm();
          this.componentKey += 1;
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response || err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || `Failed to ${mode} location.`,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.submitting = false;
      }
    },

    debouncedHandleSubmit: Function as (payload: any, mode: 'add' | 'edit') => void,
    debouncedSearch: Function as () => void,
  },
});
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