<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Property') }}</h2>

    <form @submit.prevent="submitForm" :disabled="isSubmitting || loadingDropdowns">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.title"
            label="Title"
            placeholder="Enter property title"
            :error-messages="errors.title ? [errors.title] : []"
            :disabled="isSubmitting || loadingDropdowns"
            required
            aria-describedby="title-error"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.category_id"
            label="Category"
            placeholder="Select category"
            :options="categories"
            :error-messages="errors.category_id ? [errors.category_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingDropdowns"
            required
            aria-describedby="category-error"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.location_id"
            label="Location"
            placeholder="Select location"
            :options="locations"
            :error-messages="errors.location_id ? [errors.location_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingDropdowns"
            required
            aria-describedby="location-error"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.price"
            type="number"
            label="Price (Optional)"
            placeholder="Enter price"
            :error-messages="errors.price ? [errors.price] : []"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="price-error"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.bedrooms"
            type="number"
            label="Bedrooms (Optional)"
            placeholder="Enter number of bedrooms"
            :error-messages="errors.bedrooms ? [errors.bedrooms] : []"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="bedrooms-error"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.bathrooms"
            type="number"
            label="Bathrooms (Optional)"
            placeholder="Enter number of bathrooms"
            :error-messages="errors.bathrooms ? [errors.bathrooms] : []"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="bathrooms-error"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.area_sqft"
            type="number"
            label="Area (sqft)"
            placeholder="Enter area in square feet"
            :error-messages="errors.area_sqft ? [errors.area_sqft] : []"
            :disabled="isSubmitting || loadingDropdowns"
            required
            aria-describedby="area-error"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.year_built"
            type="number"
            label="Year Built (Optional)"
            placeholder="Enter year built"
            :error-messages="errors.year_built ? [errors.year_built] : []"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="year-built-error"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.status"
            label="Status (Optional)"
            placeholder="Select status"
            :options="statusOptions"
            :error-messages="errors.status ? [errors.status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="status-error"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.list_date"
            type="date"
            label="List Date"
            :error-messages="errors.list_date ? [errors.list_date] : []"
            :disabled="isSubmitting || loadingDropdowns"
            required
            aria-describedby="list-date-error"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.branch_id"
            label="Branch (Optional)"
            placeholder="Select branch"
            :options="branches"
            :error-messages="errors.branch_id ? [errors.branch_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="branch-error"
          />
        </div>

        <div class="mb-4">
          <VaCheckbox
            v-model="form.is_featured"
            label="Featured Property"
            :error-messages="errors.is_featured ? [errors.is_featured] : []"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="featured-error"
          />
        </div>

        <div class="mb-4 col-span-2">
          <VaInput
            v-model="form.description"
            type="textarea"
            label="Description (Optional)"
            placeholder="Enter property description"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting || loadingDropdowns"
            aria-describedby="description-error"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting || loadingDropdowns" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting || loadingDropdowns">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

// Define interfaces
interface Location {
  id: number;
  street: string | null;
  city: string | null;
  country: string | null;
}

interface Category {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Property {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  location_id: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  year_built: number | null;
  status: string | null;
  list_date: string | null;
  branch_id: number | null;
  team_id: number | null;
  is_featured: boolean;
}

interface FormData {
  title: string;
  description: string | null;
  category_id: number | null;
  location_id: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  year_built: number | null;
  status: string | null;
  list_date: string;
  branch_id: number | null;
  team_id: number | null; // Added team_id
  is_featured: boolean;
}

interface Errors {
  title: string;
  description: string;
  category_id: string;
  location_id: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  area_sqft: string;
  year_built: string;
  status: string;
  list_date: string;
  branch_id: string;
  team_id: string; // Added team_id
  is_featured: string;
}

interface Payload {
  title: string;
  description: string | null;
  category_id: number | null;
  location_id: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  year_built: number | null;
  status: string | null;
  list_date: string;
  branch_id: number | null;
  team_id: number | null;
  is_featured: boolean;
}

export default defineComponent({
  name: 'PropertyEdit',
  props: {
    property: {
      type: Object as () => Property,
      required: true,
    },
  },
  emits: {
    close: null,
  },
  data() {
    return {
      form: {
        title: '',
        description: '',
        category_id: null,
        location_id: null,
        price: null,
        bedrooms: null,
        bathrooms: null,
        area_sqft: null,
        year_built: null,
        status: null,
        list_date: '',
        branch_id: null,
        team_id: null, // Added team_id
        is_featured: false,
      } as FormData,
      errors: {
        title: '',
        description: '',
        category_id: '',
        location_id: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        area_sqft: '',
        year_built: '',
        status: '',
        list_date: '',
        branch_id: '',
        team_id: '', // Added team_id
        is_featured: '',
      } as Errors,
      isSubmitting: false,
      loadingDropdowns: true,
      rawPropertyData: null as Property | null,
      categories: [] as { value: number; text: string }[],
      locations: [] as { value: number; text: string }[],
      branches: [] as { value: number; text: string }[],
      statusOptions: [
        { value: 'available', text: 'Available' },
        { value: 'sold', text: 'Sold' },
        { value: 'pending', text: 'Pending' },
        { value: 'for_rent', text: 'For Rent' },
      ],
    };
  },
  async mounted() {
    try {
      await Promise.all([
        this.fetchCategories(),
        this.fetchLocations(),
        this.fetchBranches(),
        this.loadRawPropertyData(),
      ]);

      this.initializeForm();
      this.validateDropdownValues();

      console.log('Dropdown Data:', this.getDropdownData());
      console.log('Raw Property Data:', this.rawPropertyData);
      console.log('Initialized Form Data:', this.getFormData());
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to load property data or dropdowns. Please try again.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      this.loadingDropdowns = false;
    }
  },
  methods: {
    async fetchCategories() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
        });
        console.log('fetchCategories response:', response);
        if (response.status === 200) {
          this.categories = response.data.data.map((category: any) => ({
            value: category.id,
            text: category.name || `Category ${category.id}`,
          }));
          console.log('Categories after mapping:', this.categories);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch categories.');
        }
      } catch (error: any) {
        console.error('fetchCategories error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch categories.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async fetchLocations() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
        });
        console.log('fetchLocations response:', response);
        if (response.status === 200) {
          this.locations = response.data.data.map((location: any) => ({
            value: location.id,
            text: [location.street, location.city, location.country]
              .filter(Boolean)
              .join(', ') || `Location ${location.id}`,
          }));
          console.log('Locations after mapping:', this.locations);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch locations.');
        }
      } catch (error: any) {
        console.error('fetchLocations error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch locations.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async fetchBranches() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'get',
        });
        console.log('fetchBranches response:', response);
        if (response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            value: Number(branch.id),
            text: branch.name || `Branch ${branch.id}`,
          }));
          console.log('Branches after mapping:', this.branches);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch branches.');
        }
      } catch (error: any) {
        console.error('fetchBranches error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch branches.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },

    async loadRawPropertyData() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${this.property.id}`,
          method: 'get',
        });
        console.log('loadRawPropertyData response:', response);
        if (response.status === 200) {
          this.rawPropertyData = response.data.data;
        } else {
          throw new Error(response.data?.message || 'Failed to fetch property.');
        }
      } catch (error: any) {
        console.error('loadRawPropertyData error:', error.response?.data || error.message);
        this.rawPropertyData = this.property;
      }
    },

    initializeForm() {
      const data = this.rawPropertyData || this.property;

      const extractNumericValue = (value: any): number | null => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const cleaned = value.replace(/[^\d.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      const extractBooleanValue = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        }
        return false;
      };

      const formatDateForInput = (dateValue: any): string => {
        if (!dateValue) return '';

        let date: Date;
        if (typeof dateValue === 'string') {
          date = new Date(dateValue);
        } else if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          return '';
        }

        if (isNaN(date.getTime())) return '';

        return date.toISOString().split('T')[0];
      };

      this.form = {
        title: data.title || '',
        description: data.description || '',
        category_id: data.category_id != null ? Number(data.category_id) : null,
        location_id: data.location_id != null ? Number(data.location_id) : null,
        price: extractNumericValue(data.price),
        bedrooms: extractNumericValue(data.bedrooms),
        bathrooms: extractNumericValue(data.bathrooms),
        area_sqft: extractNumericValue(data.area_sqft),
        year_built: extractNumericValue(data.year_built),
        status: data.status || null,
        list_date: formatDateForInput(data.list_date),
        branch_id: data.branch_id != null ? Number(data.branch_id) : null, // Fixed: Use branch_id
        team_id: data.team_id != null ? Number(data.team_id) : null, // Added team_id
        is_featured: extractBooleanValue(data.is_featured),
      };
    },

    validateDropdownValues() {
      if (this.form.category_id != null && !this.categories.some(c => c.value === this.form.category_id)) {
        console.warn(`Category ID ${this.form.category_id} not found in categories. Resetting.`);
        this.form.category_id = null;
      }
      if (this.form.location_id != null && !this.locations.some(l => l.value === this.form.location_id)) {
        console.warn(`Location ID ${this.form.location_id} not found in locations. Resetting.`);
        this.form.location_id = null;
      }
      if (this.form.branch_id != null && !this.branches.some(b => b.value === this.form.branch_id)) {
        console.warn(`Branch ID ${this.form.branch_id} not found in branches. Resetting.`);
        this.form.branch_id = null;
      }
      if (this.form.status != null && !this.statusOptions.some(s => s.value === this.form.status)) {
        console.warn(`Status ${this.form.status} not found in statusOptions. Resetting.`);
        this.form.status = null;
      }
    },

    async submitForm() {
      this.errors = {
        title: '',
        description: '',
        category_id: '',
        location_id: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        area_sqft: '',
        year_built: '',
        status: '',
        list_date: '',
        branch_id: '',
        team_id: '', // Added team_id
        is_featured: '',
      };

      if (!this.form.title) this.errors.title = 'Title is required';
      if (!this.form.category_id) this.errors.category_id = 'Category is required';
      if (!this.form.location_id) this.errors.location_id = 'Location is required';
      if (!this.form.area_sqft) this.errors.area_sqft = 'Area is required';
      if (this.form.area_sqft && this.form.area_sqft < 0) this.errors.area_sqft = 'Area cannot be negative';
      if (!this.form.list_date) this.errors.list_date = 'List date is required';
      if (this.form.price && this.form.price < 0) this.errors.price = 'Price cannot be negative';
      if (this.form.bedrooms && this.form.bedrooms < 0) this.errors.bedrooms = 'Number of bedrooms cannot be negative';
      if (this.form.bathrooms && this.form.bathrooms < 0) this.errors.bathrooms = 'Bathrooms cannot be negative';
      if (this.form.year_built && (this.form.year_built < 1900 || this.form.year_built > new Date().getFullYear())) {
        this.errors.year_built = `Year built must be between 1900 and ${new Date().getFullYear()}`;
      }
      if (this.form.list_date && !this.isValidDate(this.form.list_date)) {
        this.errors.list_date = 'Please enter a valid date not in the future';
      }
      if (this.form.status && !this.statusOptions.some(s => s.value === this.form.status)) {
        this.errors.status = 'Invalid status selected';
      }
      if (this.form.branch_id && !this.branches.some(b => b.value === this.form.branch_id)) {
        this.errors.branch_id = 'Invalid branch selected';
      }

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          title: this.form.title,
          description: this.form.description || null,
          category_id: this.form.category_id,
          location_id: this.form.location_id,
          price: this.form.price || null,
          bedrooms: this.form.bedrooms || null,
          bathrooms: this.form.bathrooms || null,
          area_sqft: this.form.area_sqft,
          year_built: this.form.year_built || null,
          status: this.form.status || null, // Fixed: Use form.status directly
          list_date: this.form.list_date,
          branch_id: this.form.branch_id || null, // Fixed: Use form.branch_id
          team_id: this.form.team_id || null, // Added team_id
          is_featured: this.form.is_featured,
        };

        console.log('Submitting Payload:', payload);

        await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties/${this.property.id}`,
          method: 'put',
          headers: {
            Accept: 'application/json',
          },
          data: payload,
        });

        Swal.fire({
          title: 'Success!',
          text: 'Property updated successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.$emit('close');
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to update property.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(
            this.errors,
            Object.fromEntries(
              Object.entries(error.response.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            ),
          );
          errorMessage = Object.values(this.errors).filter(Boolean).join('; ');
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }

        Swal.fire({
          title: 'Error!',
          text: errorMessage,
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

    isValidDate(dateString: string): boolean {
      const date = new Date(dateString);
      const today = new Date();
      return date instanceof Date && !isNaN(date.getTime()) && date <= today;
    },

    resetForm() {
      this.initializeForm();
      this.errors = {
        title: '',
        description: '',
        category_id: '',
        location_id: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        area_sqft: '',
        year_built: '',
        status: '',
        list_date: '',
        branch_id: '',
        team_id: '', // Added team_id
        is_featured: '',
      };
      this.$emit('close');
    },

    getFormData() {
      return { ...this.form };
    },

    getDropdownData() {
      return {
        categories: this.categories,
        locations: this.locations,
        branches: this.branches,
        statusOptions: this.statusOptions,
      };
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
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
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