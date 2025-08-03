<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('neighborhood.edit') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter neighborhood name"
            :error="!!errors.name"
            :error-messages="errors.name ? [errors.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaTextarea
            v-model="form.description"
            label="Description"
            placeholder="Enter neighborhood description"
            :error="!!errors.description"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4" v-if="optionsLoaded && formattedSchoolOptions.length">
          <VaSelect
            :key="schoolOptionsKey"
            v-model="form.schools"
            label="Schools"
            placeholder="Select schools"
            :options="useFlatOptions ? flatSchoolOptions : formattedSchoolOptions"
            multiple
            :error="!!errors.schools"
            :error-messages="errors.schools ? [errors.schools] : []"
            :disabled="isSubmitting"
            value-by="id"
            text-by="name"
            dropdown-class="va-select-dropdown"
            @update:modelValue="validateSchools"
          />
          <VaButton preset="secondary" @click="toggleFlatOptions" class="mt-2">
            {{ useFlatOptions ? 'Use Grouped Options' : 'Use Flat Options' }}
          </VaButton>
        </div>
        <div class="mb-4" v-else>
          <p>Loading school options...</p>
        </div>
        <div class="mb-4" v-if="optionsLoaded && formattedAmenityOptions.length">
          <VaSelect
            :key="amenityOptionsKey"
            v-model="form.amenities"
            label="Amenities"
            placeholder="Select amenities"
            :options="useFlatOptions ? flatAmenityOptions : formattedAmenityOptions"
            multiple
            :error="!!errors.amenities"
            :error-messages="errors.amenities ? [errors.amenities] : []"
            :disabled="isSubmitting"
            value-by="id"
            text-by="name"
            dropdown-class="va-select-dropdown"
            @update:modelValue="validateAmenities"
          />
        </div>
        <div class="mb-4" v-else>
          <p>Loading amenity options...</p>
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.crime_rate"
            type="number"
            label="Crime Rate (%)"
            placeholder="Enter crime rate (0-100)"
            :error="!!errors.crime_rate"
            :error-messages="errors.crime_rate ? [errors.crime_rate] : []"
            :disabled="isSubmitting"
            min="0"
            max="100"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.median_income"
            type="number"
            label="Median Income"
            placeholder="Enter median income"
            :error="!!errors.median_income"
            :error-messages="errors.median_income ? [errors.median_income] : []"
            :disabled="isSubmitting"
            min="0"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.population"
            type="number"
            label="Population"
            placeholder="Enter population"
            :error="!!errors.population"
            :error-messages="errors.population ? [errors.population] : []"
            :disabled="isSubmitting"
            min="0"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.walk_score"
            type="number"
            label="Walk Score"
            placeholder="Enter walk score (0-100)"
            :error="!!errors.walk_score"
            :error-messages="errors.walk_score ? [errors.walk_score] : []"
            :disabled="isSubmitting"
            min="0"
            max="100"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.transit_score"
            type="number"
            label="Transit Score"
            placeholder="Enter transit score (0-100)"
            :error="!!errors.transit_score"
            :error-messages="errors.transit_score ? [errors.transit_score] : []"
            :disabled="isSubmitting"
            min="0"
            max="100"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.last_updated"
            type="date"
            label="Last Updated"
            :error="!!errors.last_updated"
            :error-messages="errors.last_updated ? [errors.last_updated] : []"
            :disabled="isSubmitting"
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
import { defineComponent, reactive, ref, computed, onMounted, watch } from 'vue';
import { FormData, Errors, Payload, Neighborhood, GroupedOptions } from '../../../../types/neighborhood';
import Swal from 'sweetalert2';
import axios from 'axios';

export default defineComponent({
  name: 'NeighborhoodEdit',
  props: {
    neighborhood: {
      type: Object as () => Neighborhood,
      required: true,
    },
  },
  emits: ['submit', 'close'],
  setup(props) {
    const form = reactive<FormData>({
      name: props.neighborhood.name || '',
      description: props.neighborhood.description || '',
      schools: [],
      amenities: [],
      crime_rate: props.neighborhood.crime_rate ?? null,
      median_income: props.neighborhood.median_income ?? null,
      population: props.neighborhood.population ?? null,
      walk_score: props.neighborhood.walk_score ?? null,
      transit_score: props.neighborhood.transit_score ?? null,
      last_updated: props.neighborhood.last_updated
        ? new Date(props.neighborhood.last_updated).toISOString().split('T')[0]
        : '',
    });

    const errors = reactive<Errors>({
      name: '',
      description: '',
      schools: '',
      amenities: '',
      crime_rate: '',
      median_income: '',
      population: '',
      walk_score: '',
      transit_score: '',
      last_updated: '',
    });

    const isSubmitting = ref<boolean>(false);
    const schoolOptions = ref<GroupedOptions>({});
    const amenityOptions = ref<GroupedOptions>({});
    const optionsLoaded = ref<boolean>(false);
    const schoolOptionsKey = ref<number>(0);
    const amenityOptionsKey = ref<number>(0);
    const useFlatOptions = ref<boolean>(false);

    const fetchOptions = async () => {
      try {
        const [schoolResponse, amenityResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/v1/school-options`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
          }),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/v1/amenity-options`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
          }),
        ]);
        schoolOptions.value = schoolResponse.data;
        amenityOptions.value = amenityResponse.data;
        console.log('schoolOptions:', JSON.stringify(schoolOptions.value, null, 2));
        console.log('amenityOptions:', JSON.stringify(amenityOptions.value, null, 2));
        console.log('neighborhood.schools:', JSON.stringify(props.neighborhood.schools, null, 2));
        console.log('neighborhood.amenities:', JSON.stringify(props.neighborhood.amenities, null, 2));

        // Map neighborhood schools and amenities (names) to IDs
        const schoolIds: number[] = [];
        Object.keys(props.neighborhood.schools).forEach((category) => {
          const ids = props.neighborhood.schools[category]
            .map((name) => {
              const option = schoolOptions.value[category]?.find((opt) => opt.name === name);
              if (!option) console.warn(`School not found: ${name} in category ${category}`);
              return option?.id;
            })
            .filter((id): id is number => id !== undefined);
          schoolIds.push(...ids);
        });
        form.schools = schoolIds;

        const amenityIds: number[] = [];
        Object.keys(props.neighborhood.amenities).forEach((category) => {
          const ids = props.neighborhood.amenities[category]
            .map((name) => {
              const option = amenityOptions.value[category]?.find((opt) => opt.name === name);
              if (!option) console.warn(`Amenity not found: ${name} in category ${category}`);
              return option?.id;
            })
            .filter((id): id is number => id !== undefined);
          amenityIds.push(...ids);
        });
        form.amenities = amenityIds;

        console.log('form.schools:', JSON.stringify(form.schools, null, 2));
        console.log('form.amenities:', JSON.stringify(form.amenities, null, 2));
        optionsLoaded.value = true;
        // Force re-render
        schoolOptionsKey.value += 1;
        amenityOptionsKey.value += 1;
      } catch (error: any) {
        console.error('Error fetching options:', error.message);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to load school or amenity options.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        optionsLoaded.value = true;
      }
    };

    // Format grouped options for VaSelect
    const formattedSchoolOptions = computed(() => {
      const options = Object.keys(schoolOptions.value).map((category) => ({
        text: category.replace(/_/g, ' ').toUpperCase(),
        values: Array.isArray(schoolOptions.value[category])
          ? schoolOptions.value[category].map((opt) => ({
              id: opt.id,
              name: opt.name,
            }))
          : [],
      }));
      console.log('formattedSchoolOptions:', JSON.stringify(options, null, 2));
      return options;
    });

    const formattedAmenityOptions = computed(() => {
      const options = Object.keys(amenityOptions.value).map((category) => ({
        text: category.replace(/_/g, ' ').toUpperCase(),
        values: Array.isArray(amenityOptions.value[category])
          ? amenityOptions.value[category].map((opt) => ({
              id: opt.id,
              name: opt.name,
            }))
          : [],
      }));
      console.log('formattedAmenityOptions:', JSON.stringify(options, null, 2));
      return options;
    });

    // Flat options for testing
    const flatSchoolOptions = computed(() => {
      return Object.values(schoolOptions.value).flat();
    });

    const flatAmenityOptions = computed(() => {
      return Object.values(amenityOptions.value).flat();
    });

    // Validate v-model values
    const validateSchools = (value: number[]) => {
      const validIds = Object.values(schoolOptions.value)
        .flat()
        .map((opt) => opt.id);
      form.schools = value.filter((id) => validIds.includes(id));
      console.log('Validated form.schools:', JSON.stringify(form.schools, null, 2));
    };

    const validateAmenities = (value: number[]) => {
      const validIds = Object.values(amenityOptions.value)
        .flat()
        .map((opt) => opt.id);
      form.amenities = value.filter((id) => validIds.includes(id));
      console.log('Validated form.amenities:', JSON.stringify(form.amenities, null, 2));
    };

    // Toggle between flat and grouped options
    const toggleFlatOptions = () => {
      useFlatOptions.value = !useFlatOptions.value;
      schoolOptionsKey.value += 1;
      amenityOptionsKey.value += 1;
      console.log('useFlatOptions:', useFlatOptions.value);
    };

    // Watch for changes to force re-render
    watch([schoolOptions, amenityOptions], () => {
      schoolOptionsKey.value += 1;
      amenityOptionsKey.value += 1;
    });

    onMounted(fetchOptions);

    return {
      form,
      errors,
      isSubmitting,
      schoolOptions,
      amenityOptions,
      optionsLoaded,
      formattedSchoolOptions,
      formattedAmenityOptions,
      flatSchoolOptions,
      flatAmenityOptions,
      schoolOptionsKey,
      amenityOptionsKey,
      useFlatOptions,
      validateSchools,
      validateAmenities,
      toggleFlatOptions,
    };
  },
  methods: {
    transformToCategoryObject(ids: number[], options: GroupedOptions): { [category: string]: number[] } {
      const result: { [category: string]: number[] } = {};
      Object.keys(options).forEach((category) => {
        const categoryIds = options[category]
          .filter((option) => ids.includes(option.id))
          .map((option) => option.id);
        if (categoryIds.length > 0) {
          result[category] = categoryIds;
        }
      });
      console.log('transformToCategoryObject result:', JSON.stringify(result, null, 2));
      return result;
    },

    async submitForm() {
      console.log('form.schools:', JSON.stringify(this.form.schools, null, 2));
      console.log('form.amenities:', JSON.stringify(this.form.amenities, null, 2));
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      if (!this.form.name) this.errors.name = 'Name is required';
      if (this.form.name && this.form.name.length > 255) this.errors.name = 'Name must not exceed 255 characters';
      if (this.form.crime_rate && (this.form.crime_rate < 0 || this.form.crime_rate > 100))
        this.errors.crime_rate = 'Crime rate must be between 0 and 100';
      if (this.form.median_income && this.form.median_income < 0)
        this.errors.median_income = 'Median income must be non-negative';
      if (this.form.population && this.form.population < 0) this.errors.population = 'Population must be non-negative';
      if (this.form.walk_score && (this.form.walk_score < 0 || this.form.walk_score > 100))
        this.errors.walk_score = 'Walk score must be between 0 and 100';
      if (this.form.transit_score && (this.form.transit_score < 0 || this.form.transit_score > 100))
        this.errors.transit_score = 'Transit score must be between 0 and 100';

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          id: this.neighborhood.id,
          name: this.form.name,
          description: this.form.description || null,
          schools: this.form.schools.length
            ? this.transformToCategoryObject(this.form.schools, this.schoolOptions)
            : null,
          amenities: this.form.amenities.length
            ? this.transformToCategoryObject(this.form.amenities, this.amenityOptions)
            : null,
          crime_rate: this.form.crime_rate ?? null,
          median_income: this.form.median_income ?? null,
          population: this.form.population ?? null,
          walk_score: this.form.walk_score ?? null,
          transit_score: this.form.transit_score ?? null,
          last_updated: this.form.last_updated || null,
        };

        this.$emit('submit', payload, 'edit');
      } catch (error: any) {
        console.error('Submission error:', error.message);
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors);
        } else {
          this.errors.name = error.response?.data?.message || 'An unexpected error occurred';
        }
        Swal.fire({
          title: 'Error!',
          text: this.errors.name,
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
/* Ensure dropdown is visible */
.va-select-dropdown {
  z-index: 10000 !important;
  max-height: 400px !important;
  overflow-y: auto !important;
  opacity: 1 !important;
  visibility: visible !important;
  background: white !important;
  color: black !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}
.va-select-dropdown__content {
  display: block !important;
}
.va-select-option {
  display: block !important;
  padding: 8px 16px !important;
  color: black !important;
}
</style>