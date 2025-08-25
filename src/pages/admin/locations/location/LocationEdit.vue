<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Edit Location</h2>
    <form @submit.prevent="submitForm">
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
            :disabled="isSubmitting || !form.country_id || form.country_id.toString().startsWith('temp-')"
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
            :disabled="isSubmitting || !form.city_id || form.city_id.toString().startsWith('temp-')"
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
            :disabled="isSubmitting || !form.city_id || form.city_id.toString().startsWith('temp-')"
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
import { defineComponent, reactive, ref, watch } from 'vue';
import {
  FormData,
  Errors,
  Payload,
  Location,
  CountryOption,
  CityOption,
  StreetOption,
  NeighborhoodOption,
} from '../../../../types/location';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default defineComponent({
  name: 'LocationEdit',
  props: {
    location: {
      type: Object as () => Location,
      required: true,
    },
  },
  emits: ['submit', 'close'],
  setup(props) {
    const form = reactive<FormData>({
      id: props.location.id || null,
      name: props.location.name || '',
      city_id: props.location.city_id || null,
      country_id: props.location.country_id || null,
      street_id: props.location.street_id || null,
      neighborhood_id: props.location.neighborhood_id || null,
      latitude:
        props.location.latitude && props.location.latitude !== 'None'
          ? parseFloat(String(props.location.latitude))
          : null,
      longitude:
        props.location.longitude && props.location.longitude !== 'None'
          ? parseFloat(String(props.location.longitude))
          : null,
    });

    const errors = reactive<Errors>({
      name: '',
      city_id: '',
      country_id: '',
      street_id: '',
      neighborhood_id: '',
      latitude: '',
      longitude: '',
    });

    const countries = reactive<CountryOption[]>([]);
    const cities = reactive<CityOption[]>([]);
    const streets = reactive<StreetOption[]>([]);
    const neighborhoods = reactive<NeighborhoodOption[]>([]);
    const loadingCountries = ref<boolean>(false);
    const loadingCities = ref<boolean>(false);
    const loadingStreets = ref<boolean>(false);
    const loadingNeighborhoods = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    // Initialize options with existing values, using temporary IDs if necessary
    const initializeOptions = () => {
      // Clear existing options to avoid duplicates
      countries.splice(0, countries.length);
      cities.splice(0, cities.length);
      streets.splice(0, streets.length);
      neighborhoods.splice(0, neighborhoods.length);

      if (props.location.country && props.location.country !== 'None') {
        const countryValue = props.location.country_id || `temp-country-${props.location.country}`;
        countries.push({
          value: countryValue,
          text: props.location.country,
        });
        if (!form.country_id) form.country_id = countryValue;
      }
      if (props.location.city && props.location.city !== 'None') {
        const cityValue = props.location.city_id || `temp-city-${props.location.city}`;
        cities.push({
          value: cityValue,
          text: props.location.city,
        });
        if (!form.city_id) form.city_id = cityValue;
      }
      if (props.location.street && props.location.street !== 'None') {
        const streetValue = props.location.street_id || `temp-street-${props.location.street}`;
        streets.push({
          value: streetValue,
          text: props.location.street,
        });
        if (!form.street_id) form.street_id = streetValue;
      }
      if (props.location.neighborhood && props.location.neighborhood !== 'None') {
        const neighborhoodValue = props.location.neighborhood_id || `temp-neighborhood-${props.location.neighborhood}`;
        neighborhoods.push({
          value: neighborhoodValue,
          text: props.location.neighborhood,
        });
        if (!form.neighborhood_id) form.neighborhood_id = neighborhoodValue;
      }
    };

    // Watch for changes in location prop
    watch(
      () => props.location,
      (newLocation) => {
        console.log('LocationEdit: Location prop changed:', JSON.parse(JSON.stringify(newLocation)));
        form.id = newLocation.id || null;
        form.name = newLocation.name || '';
        form.country_id = newLocation.country_id || null;
        form.city_id = newLocation.city_id || null;
        form.street_id = newLocation.street_id || null;
        form.neighborhood_id = newLocation.neighborhood_id || null;
        form.latitude =
          newLocation.latitude && newLocation.latitude !== 'None'
            ? parseFloat(String(newLocation.latitude))
            : null;
        form.longitude =
          newLocation.longitude && newLocation.longitude !== 'None'
            ? parseFloat(String(newLocation.longitude))
            : null;

        // Reinitialize options to ensure saved values are included
        initializeOptions();
      },
      { immediate: true, deep: true },
    );

    return {
      form,
      errors,
      countries,
      cities,
      streets,
      neighborhoods,
      loadingCountries,
      loadingCities,
      loadingStreets,
      loadingNeighborhoods,
      isSubmitting,
    };
  },
  async mounted() {
    await this.fetchCountries();
    if (this.form.country_id && !this.form.country_id.toString().startsWith('temp-')) {
      await this.fetchCities();
      if (this.form.city_id && !this.form.city_id.toString().startsWith('temp-')) {
        await this.fetchStreetsAndNeighborhoods();
      }
    }
  },
  methods: {
    async fetchCountries() {
      this.loadingCountries = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/country`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        console.log('LocationEdit: Fetched countries:', response.data.data);
        if (response.status === 200) {
          const fetchedCountries: CountryOption[] = response.data.data.map((country: any) => ({
            value: country.id,
            text: country.name || `Country ${country.id}`,
          }));

          // Preserve the saved country if it exists and no real ID matches
          const savedCountryText = this.location.country && this.location.country !== 'None' ? this.location.country : null;
          const savedCountryMatch = savedCountryText
            ? fetchedCountries.find((c: CountryOption) => c.text.toLowerCase() === savedCountryText.toLowerCase())
            : null;

          if (savedCountryMatch) {
            // Update form with real country ID
            this.form.country_id = savedCountryMatch.value;
          } else if (savedCountryText && !this.countries.some((c: CountryOption) => c.text.toLowerCase() === savedCountryText.toLowerCase())) {
            // Keep the temporary ID if no match is found
            const countryValue = `temp-country-${savedCountryText}`;
            fetchedCountries.push({ value: countryValue, text: savedCountryText });
          }

          // Update countries array
          this.countries.splice(0, this.countries.length, ...fetchedCountries);
          console.log('LocationEdit: Updated countries array:', JSON.parse(JSON.stringify(this.countries)));
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch countries.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('LocationEdit: Failed to fetch countries:', error.message);
        this.errors.country_id = 'Failed to load countries';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch countries.',
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
      if (!this.form.country_id || this.form.country_id.toString().startsWith('temp-')) {
        this.cities.splice(0, this.cities.length);
        this.streets.splice(0, this.streets.length);
        this.neighborhoods.splice(0, this.neighborhoods.length);
        this.form.city_id = null;
        this.form.street_id = null;
        this.form.neighborhood_id = null;
        return;
      }
      this.loadingCities = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/city`,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          params: { country_id: this.form.country_id },
        });
        console.log('LocationEdit: Fetched cities:', response.data.data);
        if (response.status === 200) {
          const fetchedCities: CityOption[] = response.data.data.map((city: any) => ({
            value: city.id,
            text: city.name || `City ${city.id}`,
          }));

          // Preserve the saved city if it exists and no real ID matches
          const savedCityText = this.location.city && this.location.city !== 'None' ? this.location.city : null;
          const savedCityMatch = savedCityText
            ? fetchedCities.find((c: CityOption) => c.text.toLowerCase() === savedCityText.toLowerCase())
            : null;

          if (savedCityMatch) {
            // Update form with real city ID
            this.form.city_id = savedCityMatch.value;
          } else if (savedCityText && !this.cities.some((c: CityOption) => c.text.toLowerCase() === savedCityText.toLowerCase())) {
            // Keep the temporary ID if no match is found
            const cityValue = `temp-city-${savedCityText}`;
            fetchedCities.push({ value: cityValue, text: savedCityText });
          }

          // Update cities array
          this.cities.splice(0, this.cities.length, ...fetchedCities);
          console.log('LocationEdit: Updated cities array:', JSON.parse(JSON.stringify(this.cities)));

          // Reset dependent fields if city_id is not valid
          if (!this.cities.some((city) => city.value === this.form.city_id)) {
            this.form.city_id = null;
            this.form.street_id = null;
            this.form.neighborhood_id = null;
            this.streets.splice(0, this.streets.length);
            this.neighborhoods.splice(0, this.neighborhoods.length);
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch cities.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('LocationEdit: Failed to fetch cities:', error.message);
        this.errors.city_id = 'Failed to load cities';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch cities.',
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
    async fetchStreetsAndNeighborhoods() {
      if (!this.form.city_id || this.form.city_id.toString().startsWith('temp-')) {
        this.streets.splice(0, this.streets.length);
        this.neighborhoods.splice(0, this.neighborhoods.length);
        this.form.street_id = null;
        this.form.neighborhood_id = null;
        return;
      }
      this.loadingStreets = true;
      this.loadingNeighborhoods = true;
      try {
        const [streetsResponse, neighborhoodsResponse] = await Promise.all([
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/street`,
            method: 'get',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            params: { city_id: this.form.city_id },
          }),
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/neighborhoods`,
            method: 'get',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            params: { city_id: this.form.city_id },
          }),
        ]);
        console.log('LocationEdit: Fetched streets:', streetsResponse.data.data);
        console.log('LocationEdit: Fetched neighborhoods:', neighborhoodsResponse.data.data);
        if (streetsResponse.status === 200) {
          const fetchedStreets: StreetOption[] = streetsResponse.data.data.map((street: any) => ({
            value: street.id,
            text: street.name || `Street ${street.id}`,
          }));

          // Preserve the saved street if it exists and no real ID matches
          const savedStreetText = this.location.street && this.location.street !== 'None' ? this.location.street : null;
          const savedStreetMatch = savedStreetText
            ? fetchedStreets.find((s: StreetOption) => s.text.toLowerCase() === savedStreetText.toLowerCase())
            : null;

          if (savedStreetMatch) {
            // Update form with real street ID
            this.form.street_id = savedStreetMatch.value;
          } else if (savedStreetText && !this.streets.some((s: StreetOption) => s.text.toLowerCase() === savedStreetText.toLowerCase())) {
            // Keep the temporary ID if no match is found
            const streetValue = `temp-street-${savedStreetText}`;
            fetchedStreets.push({ value: streetValue, text: savedStreetText });
          }

          // Update streets array
          this.streets.splice(0, this.streets.length, ...fetchedStreets);
          console.log('LocationEdit: Updated streets array:', JSON.parse(JSON.stringify(this.streets)));
        } else {
          Swal.fire({
            title: 'Error!',
            text: streetsResponse.data?.message || 'Failed to fetch streets.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        if (neighborhoodsResponse.status === 200) {
          const fetchedNeighborhoods: NeighborhoodOption[] = neighborhoodsResponse.data.data.map((neighborhood: any) => ({
            value: neighborhood.id,
            text: neighborhood.name || `Neighborhood ${neighborhood.id}`,
          }));

          // Preserve the saved neighborhood if it exists and no real ID matches
          const savedNeighborhoodText =
            this.location.neighborhood && this.location.neighborhood !== 'None' ? this.location.neighborhood : null;
          const savedNeighborhoodMatch = savedNeighborhoodText
            ? fetchedNeighborhoods.find((n: NeighborhoodOption) => n.text.toLowerCase() === savedNeighborhoodText.toLowerCase())
            : null;

          if (savedNeighborhoodMatch) {
            // Update form with real neighborhood ID
            this.form.neighborhood_id = savedNeighborhoodMatch.value;
          } else if (
            savedNeighborhoodText &&
            !this.neighborhoods.some((n: NeighborhoodOption) => n.text.toLowerCase() === savedNeighborhoodText.toLowerCase())
          ) {
            // Keep the temporary ID if no match is found
            const neighborhoodValue = `temp-neighborhood-${savedNeighborhoodText}`;
            fetchedNeighborhoods.push({ value: neighborhoodValue, text: savedNeighborhoodText });
          }

          // Update neighborhoods array
          this.neighborhoods.splice(0, this.neighborhoods.length, ...fetchedNeighborhoods);
          console.log('LocationEdit: Updated neighborhoods array:', JSON.parse(JSON.stringify(this.neighborhoods)));
        } else {
          Swal.fire({
            title: 'Error!',
            text: neighborhoodsResponse.data?.message || 'Failed to fetch neighborhoods.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('LocationEdit: Failed to fetch streets or neighborhoods:', error.message);
        this.errors.street_id = 'Failed to load streets';
        this.errors.neighborhood_id = 'Failed to load neighborhoods';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch streets or neighborhoods.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingStreets = false;
        this.loadingNeighborhoods = false;
      }
    },
    async submitForm() {
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      // Validate form fields
      if (!this.form.name) {
        this.errors.name = 'Name is required';
      }
      if (!this.form.country_id || this.form.country_id.toString().startsWith('temp-')) {
        this.errors.country_id = 'Please select a valid country from the list';
      }
      if (!this.form.city_id || this.form.city_id.toString().startsWith('temp-')) {
        this.errors.city_id = 'Please select a valid city from the list';
      }
      if (this.form.name && this.form.name.length > 255) {
        this.errors.name = 'Name must not exceed 255 characters';
      }
      if (this.form.latitude && (isNaN(this.form.latitude) || this.form.latitude < -90 || this.form.latitude > 90)) {
        this.errors.latitude = 'Latitude must be between -90 and 90';
      }
      if (
        this.form.longitude &&
        (isNaN(this.form.longitude) || this.form.longitude < -180 || this.form.longitude > 180)
      ) {
        this.errors.longitude = 'Longitude must be between -180 and 180';
      }

      if (Object.values(this.errors).some((error) => error)) {
        Swal.fire({
          title: 'Validation Error',
          text: 'Please correct the errors in the form before submitting.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          id: this.form.id,
          name: this.form.name,
          country_id: typeof this.form.country_id === 'number' ? this.form.country_id : null,
          city_id: typeof this.form.city_id === 'number' ? this.form.city_id : null,
          street_id: typeof this.form.street_id === 'number' ? this.form.street_id : null,
          neighborhood_id: typeof this.form.neighborhood_id === 'number' ? this.form.neighborhood_id : null,
          latitude: this.form.latitude || null,
          longitude: this.form.longitude || null,
        };

        console.log('LocationEdit: Submitting payload:', payload);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations/${this.form.id}`,
          method: 'patch',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          data: payload,
        });
        console.log('LocationEdit: Update response:', response.data);
        this.$emit('submit', payload, 'edit');
        Swal.fire({
          title: 'Success!',
          text: 'Location updated successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } catch (error: any) {
        console.error('LocationEdit: Submission error:', error.message);
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors);
        } else {
          this.errors.name = error.response?.data?.message || 'An unexpected error occurred';
        }
        Swal.fire({
          title: 'Error!',
          text: this.errors.name || 'An unexpected error occurred',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.isSubmitting = false;
      }
    },
  },
});
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