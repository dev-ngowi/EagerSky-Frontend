<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Property') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.title"
            label="Title"
            placeholder="Enter property title"
            :error-messages="errors.title ? [errors.title] : []"
            :disabled="isSubmitting"
            required
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
            :disabled="isSubmitting || isLoadingCategories"
            required
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
            :disabled="isSubmitting || isLoadingLocations"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.price"
            type="number"
            label="Price"
            placeholder="Enter price"
            :error-messages="errors.price ? [errors.price] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.bedrooms"
            type="number"
            label="Bedrooms"
            placeholder="Enter number of bedrooms"
            :error-messages="errors.bedrooms ? [errors.bedrooms] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.bathrooms"
            type="number"
            label="Bathrooms"
            placeholder="Enter number of bathrooms"
            :error-messages="errors.bathrooms ? [errors.bathrooms] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.area_sqft"
            type="number"
            label="Area (sqft)"
            placeholder="Enter area in square feet"
            :error-messages="errors.area_sqft ? [errors.area_sqft] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.year_built"
            type="number"
            label="Year Built"
            placeholder="Enter year built"
            :error-messages="errors.year_built ? [errors.year_built] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.status"
            label="Status"
            placeholder="Select status"
            :options="statusOptions"
            :error-messages="errors.status ? [errors.status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.list_date"
            type="date"
            label="List Date"
            :error-messages="errors.list_date ? [errors.list_date] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.branch_id"
            label="Branch"
            placeholder="Select branch (optional)"
            :options="branches"
            :error-messages="errors.branch_id ? [errors.branch_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || isLoadingBranches"
          />
        </div>
        <div class="mb-4">
          <VaCheckbox
            v-model="form.is_featured"
            label="Featured Property"
            :error-messages="errors.is_featured ? [errors.is_featured] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4 col-span-2">
          <VaInput
            v-model="form.description"
            type="textarea"
            label="Description"
            placeholder="Enter property description"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting"
          />
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { usePropertyStore } from '../../../../stores/propertyStore';
import { FormData, Errors, Payload } from '../../../../types/property';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default defineComponent({
  name: 'PropertyForm',
  emits: {
    close: null,
  },
  setup() {
    const propertyStore = usePropertyStore();
    return { propertyStore };
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
        status: '',
        list_date: '',
        branch_id: null,
        team_id: null, // Set team_id to null
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
        team_id: '', // Included team_id
        is_featured: '',
      } as Errors,
      isSubmitting: false,
      isLoadingCategories: true,
      isLoadingLocations: true,
      isLoadingBranches: true,
      statusOptions: [
        { value: 'sold', text: 'Sold' },
        { value: 'pending', text: 'Pending' },
        { value: 'for_rent', text: 'For Rent' },
        { value: 'for_sale', text: 'For Sale' },
      ],
    };
  },
  computed: {
    categories() {
      console.log('Raw categories from store:', this.propertyStore.categories);
      return this.propertyStore.categories.map(category => ({
        value: category.id,
        text: category.name || `Category ${category.id}`,
      }));
    },
    locations() {
      console.log('Raw locations from store:', this.propertyStore.locations);
      return this.propertyStore.locations.map(location => ({
        value: location.id,
        text: `${location.street || 'N/A'}, ${location.city || 'N/A'}, ${location.country || 'N/A'}`,
      }));
    },
    branches() {
      console.log('Raw branches from store:', this.propertyStore.branches);
      return this.propertyStore.branches.map(branch => ({
        value: branch.id,
        text: branch.name || `Branch ${branch.id}`,
      }));
    },
  },
  async mounted() {
    try {
      await Promise.all([
        this.propertyStore.getCategories().then(() => { this.isLoadingCategories = false; }),
        this.propertyStore.getLocations().then(() => { this.isLoadingLocations = false; }),
        this.propertyStore.getBranches().then(() => { this.isLoadingBranches = false; }),
      ]);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to load dropdown data.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  },
  methods: {
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
        team_id: '', // Included team_id
        is_featured: '',
      };

      if (!this.form.title) this.errors.title = 'Title is required';
      if (!this.form.category_id) this.errors.category_id = 'Category is required';
      if (!this.form.location_id) this.errors.location_id = 'Location is required';
      if (this.form.price && this.form.price < 0) this.errors.price = 'Price cannot be negative';
      if (this.form.bedrooms && this.form.bedrooms < 0) this.errors.bedrooms = 'Bedrooms cannot be negative';
      if (this.form.bathrooms && this.form.bathrooms < 0) this.errors.bathrooms = 'Bathrooms cannot be negative';
      if (this.form.area_sqft && this.form.area_sqft < 0) this.errors.area_sqft = 'Area cannot be negative';
      if (this.form.year_built && (this.form.year_built < 1900 || this.form.year_built > new Date().getFullYear())) {
        this.errors.year_built = `Year built must be between 1900 and ${new Date().getFullYear()}`;
      }
      if (this.form.list_date && !this.isValidDate(this.form.list_date)) {
        this.errors.list_date = 'Please enter a valid date';
      }
      if (this.form.description && this.form.description.length > 1000) {
        this.errors.description = 'Description must not exceed 1000 characters';
      }

      if (Object.values(this.errors).some(error => error)) {
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
          area_sqft: this.form.area_sqft || null,
          year_built: this.form.year_built || null,
          status: this.form.status || null,
          list_date: this.form.list_date || null,
          branch_id: this.form.branch_id || null,
          team_id: this.form.team_id || null, // Included team_id
          is_featured: this.form.is_featured,
        };

        await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });

        Swal.fire({
          title: 'Success!',
          text: 'Property added successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.$emit('close');
        this.resetForm();
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to add property.';
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
      return date instanceof Date && !isNaN(date.getTime());
    },
    resetForm() {
      this.form = {
        title: '',
        description: '',
        category_id: null,
        location_id: null,
        price: null,
        bedrooms: null,
        bathrooms: null,
        area_sqft: null,
        year_built: null,
        status: '',
        list_date: '',
        branch_id: null,
        team_id: null, // Included team_id
        is_featured: false,
      };
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
        team_id: '', // Included team_id
        is_featured: '',
      };
      this.$emit('close');
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