<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Location') }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4"> 
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter location name"
            :error="!!errors.name"
            :error-messages="errors.name ? [errors.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.country_id"
            label="Country"
            placeholder="Select country"
            :options="countries"
            :error="!!errors.country_id"
            :error-messages="errors.country_id ? [errors.country_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingCountries"
            :disabled="isSubmitting"
            required
            @update:modelValue="fetchCities"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.city_id"
            label="City"
            placeholder="Select city"
            :options="cities"
            :error="!!errors.city_id"
            :error-messages="errors.city_id ? [errors.city_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingCities"
            :disabled="isSubmitting || !form.country_id"
            required
            @update:modelValue="fetchStreetsAndNeighborhoods"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.street_id"
            label="Street"
            placeholder="Select street (optional)"
            :options="streets"
            :error="!!errors.street_id"
            :error-messages="errors.street_id ? [errors.street_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingStreets"
            :disabled="isSubmitting || !form.city_id"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.neighborhood_id"
            label="Neighborhood"
            placeholder="Select neighborhood (optional)"
            :options="neighborhoods"
            :error="!!errors.neighborhood_id"
            :error-messages="errors.neighborhood_id ? [errors.neighborhood_id] : []"
            value-by="value"
            text-by="text"
            :loading="loadingNeighborhoods"
            :disabled="isSubmitting || !form.city_id"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.latitude"
            label="Latitude"
            placeholder="Enter latitude (optional)"
            :error="!!errors.latitude"
            :error-messages="errors.latitude ? [errors.latitude] : []"
            :disabled="isSubmitting"
            type="number"
            step="any"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.longitude"
            label="Longitude"
            placeholder="Enter longitude (optional)"
            :error="!!errors.longitude"
            :error-messages="errors.longitude ? [errors.longitude] : []"
            :disabled="isSubmitting"
            type="number"
            step="any"
          />
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'LocationForm',
  props: {
    selectedLocation: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'submit'],
  data() {
    return {
      form: {
        name: '',
        city_id: null as number | null,
        country_id: null as number | null,
        street_id: null as number | null,
        neighborhood_id: null as number | null,
        latitude: null as number | null,
        longitude: null as number | null,
      },
      errors: {
        name: '',
        city_id: '',
        country_id: '',
        street_id: '',
        neighborhood_id: '',
        latitude: '',
        longitude: '',
      },
      countries: [] as { value: number; text: string }[],
      cities: [] as { value: number; text: string }[],
      streets: [] as { value: number; text: string }[],
      neighborhoods: [] as { value: number; text: string }[],
      loadingCountries: false,
      loadingCities: false,
      loadingStreets: false,
      loadingNeighborhoods: false,
      isSubmitting: false,
    }
  },
  watch: {
    selectedLocation: {
      handler(newVal) {
        if (newVal) {
          this.form = {
            name: newVal.name,
            city_id: newVal.city_id,
            country_id: newVal.country_id,
            street_id: newVal.street_id,
            neighborhood_id: newVal.neighborhood_id,
            latitude: newVal.latitude,
            longitude: newVal.longitude,
          }
          this.fetchCities()
          this.fetchStreetsAndNeighborhoods()
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.fetchCountries()
  },
  methods: {
    async fetchCountries() {
      this.loadingCountries = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/country`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })

        if (response.status === 200) {
          this.countries = response.data.data.map((country: any) => ({
            value: country.id,
            text: country.name || `Country ${country.id}`,
          }))
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch countries.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Failed to fetch countries:', error.message)
        this.errors.country_id = 'Failed to load countries'
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch countries.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingCountries = false
      }
    },

    async fetchCities() {
      if (!this.form.country_id) {
        this.cities = []
        this.streets = []
        this.neighborhoods = []
        this.form.city_id = null
        this.form.street_id = null
        this.form.neighborhood_id = null
        return
      }

      this.loadingCities = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/city`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params: { country_id: this.form.country_id },
        })

        if (response.status === 200) {
          this.cities = response.data.data.map((city: any) => ({
            value: city.id,
            text: city.name || `City ${city.id}`,
          }))
          this.form.city_id = null
          this.form.street_id = null
          this.form.neighborhood_id = null
          this.streets = []
          this.neighborhoods = []
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch cities.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Failed to fetch cities:', error.message)
        this.errors.city_id = 'Failed to load cities'
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch cities.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingCities = false
      }
    },

    async fetchStreetsAndNeighborhoods() {
      if (!this.form.city_id) {
        this.streets = []
        this.neighborhoods = []
        this.form.street_id = null
        this.form.neighborhood_id = null
        return
      }

      this.loadingStreets = true
      this.loadingNeighborhoods = true
      try {
        const [streetsResponse, neighborhoodsResponse] = await Promise.all([
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/street`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            params: { city_id: this.form.city_id },
          }),
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods`,
            method: 'get',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            params: { city_id: this.form.city_id },
          }),
        ])

        if (streetsResponse.status === 200) {
          this.streets = streetsResponse.data.data.map((street: any) => ({
            value: street.id,
            text: street.name || `Street ${street.id}`,
          }))
          this.form.street_id = null
        } else {
          Swal.fire({
            title: 'Error!',
            text: streetsResponse.data?.message || 'Failed to fetch streets.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }

        if (neighborhoodsResponse.status === 200) {
          this.neighborhoods = neighborhoodsResponse.data.data.map((neighborhood: any) => ({
            value: neighborhood.id,
            text: neighborhood.name || `Neighborhood ${neighborhood.id}`,
          }))
          this.form.neighborhood_id = null
        } else {
          Swal.fire({
            title: 'Error!',
            text: neighborhoodsResponse.data?.message || 'Failed to fetch neighborhoods.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('Failed to fetch streets or neighborhoods:', error.message)
        this.errors.street_id = 'Failed to load streets'
        this.errors.neighborhood_id = 'Failed to load neighborhoods'
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch streets or neighborhoods.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingStreets = false
        this.loadingNeighborhoods = false
      }
    },

    validateForm() {
      this.errors = {
        name: '',
        city_id: '',
        country_id: '',
        street_id: '',
        neighborhood_id: '',
        latitude: '',
        longitude: '',
      }

      let isValid = true

      if (!this.form.name) {
        this.errors.name = 'Name is required'
        isValid = false
      } else if (this.form.name.length > 255) {
        this.errors.name = 'Name must not exceed 255 characters'
        isValid = false
      }

      if (!this.form.country_id) {
        this.errors.country_id = 'Country is required'
        isValid = false
      }

      if (!this.form.city_id) {
        this.errors.city_id = 'City is required'
        isValid = false
      }

      if (this.form.latitude && (isNaN(this.form.latitude) || this.form.latitude < -90 || this.form.latitude > 90)) {
        this.errors.latitude = 'Latitude must be between -90 and 90'
        isValid = false
      }

      if (
        this.form.longitude &&
        (isNaN(this.form.longitude) || this.form.longitude < -180 || this.form.longitude > 180)
      ) {
        this.errors.longitude = 'Longitude must be between -180 and 180'
        isValid = false
      }

      return isValid
    },

    async handleSubmit() {
      const isValid = this.validateForm()
      if (!isValid) return

      this.isSubmitting = true
      try {
        const payload = {
          name: this.form.name,
          city_id: this.form.city_id,
          country_id: this.form.country_id,
          street_id: this.form.street_id || null,
          neighborhood_id: this.form.neighborhood_id || null,
          latitude: this.form.latitude || null,
          longitude: this.form.longitude || null,
        }

        const operation = this.selectedLocation ? 'update' : 'add'
        this.$emit('submit', payload, operation)
      } catch (error: any) {
        console.error('Submission error:', error.message)
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'An unexpected error occurred',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.isSubmitting = false
      }
    },
  },
})
</script>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.md\:grid-cols-2 {
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.gap-4 {
  gap: 1rem;
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