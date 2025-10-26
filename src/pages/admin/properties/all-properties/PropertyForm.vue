<template>
  <div class="form-container">
    <h2 class="form-title">
      {{ formMode === 'add' ? $t('Add New Property') : $t('Edit Property') }}
    </h2>
    <form @submit.prevent="submitForm" class="property-form">
      <div class="form-grid">
        <div class="form-field">
          <VaInput
            v-model="form.title"
            label="Title"
            placeholder="Enter property title"
            :error-messages="errors.title ? [errors.title] : []"
            :disabled="isSubmitting"
            required
            @input="validateTitle"
            class="form-input"
            aria-label="Enter property title"
          />
        </div>
        <div class="form-field">
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
            @input="validateCategory"
            class="form-select"
            aria-label="Select property category"
          />
        </div>
        <div class="form-field">
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
            @input="validateLocation"
            class="form-select"
            aria-label="Select property location"
          />
        </div>
        <div class="form-field">
          <VaInput
            v-model.number="form.price"
            type="number"
            label="Price"
            placeholder="Enter price"
            :error-messages="errors.price ? [errors.price] : []"
            :disabled="isSubmitting"
            @input="validatePrice"
            class="form-input"
            aria-label="Enter property price"
          />
        </div>
        <div class="form-field">
          <VaInput
            v-model.number="form.bedrooms"
            type="number"
            label="Bedrooms"
            placeholder="Enter number of bedrooms"
            :error-messages="errors.bedrooms ? [errors.bedrooms] : []"
            :disabled="isSubmitting"
            @input="validateBedrooms"
            class="form-input"
            aria-label="Enter number of bedrooms"
          />
        </div>
        <div class="form-field">
          <VaInput
            v-model.number="form.bathrooms"
            type="number"
            label="Bathrooms"
            placeholder="Enter number of bathrooms"
            :error-messages="errors.bathrooms ? [errors.bathrooms] : []"
            :disabled="isSubmitting"
            @input="validateBathrooms"
            class="form-input"
            aria-label="Enter number of bathrooms"
          />
        </div>
        <div class="form-field">
          <VaInput
            v-model.number="form.area_sqft"
            type="number"
            label="Area (sqft)"
            placeholder="Enter area in square feet"
            :error-messages="errors.area_sqft ? [errors.area_sqft] : []"
            :disabled="isSubmitting"
            @input="validateArea"
            class="form-input"
            aria-label="Enter area in square feet"
          />
        </div>
        <div class="form-field">
          <VaInput
            v-model.number="form.year_built"
            type="number"
            label="Year Built"
            placeholder="Enter year built"
            :error-messages="errors.year_built ? [errors.year_built] : []"
            :disabled="isSubmitting"
            @input="validateYearBuilt"
            class="form-input"
            aria-label="Enter year built"
          />
        </div>
        <div class="form-field">
          <VaSelect
            v-model="form.status"
            label="Status"
            placeholder="Select status"
            :options="statusOptions"
            :error-messages="errors.status ? [errors.status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            @input="validateStatus"
            class="form-select"
            aria-label="Select property status"
          />
        </div>
        <div class="form-field">
          <VaInput
            v-model="form.list_date"
            type="date"
            label="List Date"
            :error-messages="errors.list_date ? [errors.list_date] : []"
            :disabled="isSubmitting"
            @input="validateListDate"
            class="form-input"
            aria-label="Enter property list date"
          />
        </div>
        <div class="form-field">
          <VaSelect
            v-model="form.branch_id"
            label="Branch"
            placeholder="Select branch (optional)"
            :options="branches"
            :error-messages="errors.branch_id ? [errors.branch_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || isLoadingBranches"
            @input="validateBranch"
            class="form-select"
            aria-label="Select property branch (optional)"
          />
        </div>
        <div class="form-field">
          <div class="checkbox-container">
            <input
              type="checkbox"
              id="isFeatured"
              v-model="form.is_featured"
              :disabled="isSubmitting"
              @change="validateFeatured"
              class="checkbox-input"
              aria-label="Mark property as featured"
            />
            <label for="isFeatured" class="checkbox-label">Featured Property</label>
            <div v-if="errors.is_featured" class="error-text">
              {{ errors.is_featured }}
            </div>
          </div>
        </div>
        <div class="form-field form-field-full">
          <VaInput
            v-model="form.description"
            type="textarea"
            label="Description"
            placeholder="Enter property description (max 191 characters)"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting"
            maxlength="191"
            @input="validateDescription"
            class="form-textarea"
            aria-label="Enter property description"
          />
          <div class="character-counter">
            {{ form.description ? form.description.length : 0 }}/191 characters
          </div>
        </div>
      </div>
      <div class="form-actions">
        <VaButton
          color="secondary"
          :disabled="isSubmitting"
          @click="resetForm"
          class="cancel-button"
          aria-label="Cancel form"
        >
          Cancel
        </VaButton>
        <VaButton
          color="#00A3E0"
          type="submit"
          :disabled="isSubmitting || hasErrors"
          class="submit-button"
          :aria-label="formMode === 'add' ? 'Submit new property' : 'Update property'"
        >
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>{{ formMode === 'add' ? 'Submit' : 'Update' }}</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { usePropertyStore } from '../../../../stores/propertyStore';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';

interface Property {
  id?: number;
  title: string;
  description?: string;
  category_id: number;
  location_id: number;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  year_built?: number;
  status?: string;
  list_date?: string;
  branch_id?: number;
  team_id?: number;
  is_featured: boolean;
}

interface FormData {
  title: string;
  description: string;
  category_id: number | null;
  location_id: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  year_built: number | null;
  status: string;
  list_date: string;
  branch_id: number | null;
  team_id: number | null;
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
  team_id: string;
  is_featured: string;
}

export default defineComponent({
  name: 'PropertyForm',
  props: {
    property: {
      type: Object as PropType<Property | null>,
      default: null,
    },
    formMode: {
      type: String as PropType<'add' | 'edit'>,
      default: 'add',
    },
  },
  emits: {
    close: null,
    submit: (payload: Partial<Property>, mode: 'add' | 'edit') => true,
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
        team_id: null,
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
        team_id: '',
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
      return this.propertyStore.categories.map(category => ({
        value: category.id,
        text: category.name || `Category ${category.id}`,
      }));
    },
    locations() {
      return this.propertyStore.locations.map(location => ({
        value: location.id,
        text: `${location.street || 'N/A'}, ${location.city || 'N/A'}, ${location.country || 'N/A'}`,
      }));
    },
    branches() {
      return this.propertyStore.branches.map(branch => ({
        value: branch.id,
        text: branch.name || `Branch ${branch.id}`,
      }));
    },
    hasErrors() {
      return Object.values(this.errors).some(error => error);
    },
  },
  mounted() {
    if (this.formMode === 'edit' && this.property) {
      this.form = {
        title: this.property.title || '',
        description: this.property.description || '',
        category_id: this.property.category_id || null,
        location_id: this.property.location_id || null,
        price: this.property.price || null,
        bedrooms: this.property.bedrooms || null,
        bathrooms: this.property.bathrooms || null,
        area_sqft: this.property.area_sqft || null,
        year_built: this.property.year_built || null,
        status: this.property.status || '',
        list_date: this.property.list_date || '',
        branch_id: this.property.branch_id || null,
        team_id: this.property.team_id || null,
        is_featured: this.property.is_featured || false,
      };
    }
    this.loadDropdownData();
  },
  methods: {
    async loadDropdownData() {
      try {
        await Promise.all([
          this.propertyStore.getCategories().then(() => {
            this.isLoadingCategories = false;
          }),
          this.propertyStore.getLocations().then(() => {
            this.isLoadingLocations = false;
          }),
          this.propertyStore.getBranches().then(() => {
            this.isLoadingBranches = false;
          }),
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
    validateTitle() {
      this.errors.title = this.form.title ? '' : 'Title is required';
    },
    validateCategory() {
      this.errors.category_id = this.form.category_id ? '' : 'Category is required';
    },
    validateLocation() {
      this.errors.location_id = this.form.location_id ? '' : 'Location is required';
    },
    validatePrice() {
      this.errors.price = this.form.price && this.form.price < 0 ? 'Price cannot be negative' : '';
    },
    validateBedrooms() {
      this.errors.bedrooms = this.form.bedrooms && this.form.bedrooms < 0 ? 'Bedrooms cannot be negative' : '';
    },
    validateBathrooms() {
      this.errors.bathrooms = this.form.bathrooms && this.form.bathrooms < 0 ? 'Bathrooms cannot be negative' : '';
    },
    validateArea() {
      this.errors.area_sqft = this.form.area_sqft && this.form.area_sqft < 0 ? 'Area cannot be negative' : '';
    },
    validateYearBuilt() {
      this.errors.year_built =
        this.form.year_built && (this.form.year_built < 1900 || this.form.year_built > new Date().getFullYear())
          ? `Year built must be between 1900 and ${new Date().getFullYear()}`
          : '';
    },
    validateStatus() {
      this.errors.status = this.form.status ? '' : 'Status is required';
    },
    validateListDate() {
      this.errors.list_date = this.form.list_date && !this.isValidDate(this.form.list_date) ? 'Please enter a valid date' : '';
    },
    validateBranch() {
      this.errors.branch_id = '';
    },
    validateFeatured() {
      this.errors.is_featured = '';
    },
    validateDescription() {
      this.errors.description = this.form.description && this.form.description.length > 191 ? 'Description must not exceed 191 characters' : '';
    },
    async submitForm() {
      // Reset errors
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
        team_id: '',
        is_featured: '',
      };

      // Run all validations
      this.validateTitle();
      this.validateCategory();
      this.validateLocation();
      this.validatePrice();
      this.validateBedrooms();
      this.validateBathrooms();
      this.validateArea();
      this.validateYearBuilt();
      this.validateStatus();
      this.validateListDate();
      this.validateBranch();
      this.validateFeatured();
      this.validateDescription();

      if (this.hasErrors) {
        Swal.fire({
          title: 'Validation Error',
          text: Object.values(this.errors).filter(Boolean).join('; '),
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
        const payload: Partial<Property> = {
          title: this.form.title,
          description: this.form.description || undefined,
          category_id: this.form.category_id || undefined,
          location_id: this.form.location_id || undefined,
          price: this.form.price || undefined,
          bedrooms: this.form.bedrooms || undefined,
          bathrooms: this.form.bathrooms || undefined,
          area_sqft: this.form.area_sqft || undefined,
          year_built: this.form.year_built || undefined,
          status: this.form.status || undefined,
          list_date: this.form.list_date || undefined,
          branch_id: this.form.branch_id || undefined,
          team_id: this.form.team_id || undefined,
          is_featured: this.form.is_featured,
        };

        this.$emit('submit', payload, this.formMode);
      } catch (error: any) {
        console.error('Submission error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        let errorMessage = error.response?.data?.message || `Failed to ${this.formMode === 'add' ? 'add' : 'update'} property. Please try again.`;
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
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please contact support.';
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
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
        team_id: null,
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
        team_id: '',
        is_featured: '',
      };
      this.$emit('close');
    },
  },
});
</script>

<style lang="scss" scoped>
.form-container {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.form-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #374151;

  @media screen and (min-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
}

.property-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 768px) {
    gap: 0.75rem;
  }
}

.form-field {
  width: 100%;
}

.form-field-full {
  width: 100%;
}

.form-input,
.form-select,
.form-textarea {
  font-size: 0.875rem;

  :deep(.va-input__label),
  :deep(.va-select__label) {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  :deep(.va-input__input),
  :deep(.va-select__input) {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  :deep(.va-input__error-message),
  :deep(.va-select__error-message) {
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;
  }

  @media screen and (min-width: 768px) {
    font-size: 1rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 1rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.75rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.875rem;
    }
  }
}

.form-textarea {
  :deep(.va-input__input) {
    min-height: 100px;
    resize: vertical;
  }
}

.checkbox-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .checkbox-input {
    width: 1.25rem;
    height: 1.25rem;
    min-width: 40px;
    min-height: 40px;
    margin-right: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label {
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }

  .error-text {
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
}

.character-counter {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: right;

  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    gap: 1rem;
    margin-top: 1rem;
  }

  .cancel-button,
  .submit-button {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }

  .submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;

  @media screen and (min-width: 768px) {
    width: 1.25rem;
    height: 1.25rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .form-container {
    padding: 0.5rem;
  }

  .form-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .property-form {
    gap: 0.25rem;
  }

  .form-grid {
    gap: 0.25rem;
  }

  .form-input,
  .form-select,
  .form-textarea {
    font-size: 0.75rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.75rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.375rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.625rem;
    }
  }

  .checkbox-container {
    .checkbox-input {
      width: 1rem;
      height: 1rem;
      min-width: 36px;
      min-height: 36px;
    }

    .checkbox-label {
      font-size: 0.75rem;
    }

    .error-text {
      font-size: 0.625rem;
    }
  }

  .character-counter {
    font-size: 0.625rem;
    margin-top: 0.2rem;
  }

  .form-actions {
    gap: 0.25rem;
    margin-top: 0.5rem;

    .cancel-button,
    .submit-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }

    .spinner {
      width: 0.875rem;
      height: 0.875rem;
    }
  }
}

@media (max-width: 480px) {
  .form-container {
    padding: 0.25rem;
  }

  .form-title {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .form-input,
  .form-select,
  .form-textarea {
    font-size: 0.625rem;

    :deep(.va-input__label),
    :deep(.va-select__label) {
      font-size: 0.625rem;
    }

    :deep(.va-input__input),
    :deep(.va-select__input) {
      padding: 0.25rem;
    }

    :deep(.va-input__error-message),
    :deep(.va-select__error-message) {
      font-size: 0.5rem;
    }
  }

  .checkbox-container {
    .checkbox-input {
      width: 0.875rem;
      height: 0.875rem;
      min-width: 32px;
      min-height: 32px;
    }

    .checkbox-label {
      font-size: 0.625rem;
    }

    .error-text {
      font-size: 0.5rem;
    }
  }

  .character-counter {
    font-size: 0.5rem;
    margin-top: 0.125rem;
  }

  .form-actions {
    gap: 0.125rem;
    margin-top: 0.25rem;

    .cancel-button,
    .submit-button {
      font-size: 0.5rem;
      padding: 0.2rem 0.4rem;
    }

    .spinner {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
}
</style>