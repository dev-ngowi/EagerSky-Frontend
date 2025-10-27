<template>
  <div class="form-container">
    <!-- Header Section -->
    <div class="form-header">
      <h2 class="form-title">
        {{ formMode === 'add' ? 'Add New Property Owner' : 'Edit Property Owner' }}
      </h2>
    </div>

    <!-- Global Error Alert -->
    <div v-if="globalError" class="global-error-alert">
      <VaAlert color="danger" icon="warning" closeable @close="globalError = ''">
        <template #title>Validation Failed</template>
        {{ globalError }}
      </VaAlert>
    </div>

    <!-- Form -->
    <form @submit.prevent="submitForm" class="property-form">
      <!-- Step 1: Personal Information -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-header">
          <h3 class="step-title">Personal Information</h3>
          <p class="step-description">Enter the basic personal details for the property owner</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <VaInput
              v-model="form.first_name"
              label="First Name"
              placeholder="Enter first name"
              :error-messages="errors.first_name ? [errors.first_name] : []"
              :error="!!errors.first_name"
              required
              @input="validateFirstName"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="person" size="small" />
              </template>
            </VaInput>
          </div>

          <div class="form-group">
            <VaInput
              v-model="form.last_name"
              label="Last Name"
              placeholder="Enter last name"
              :error-messages="errors.last_name ? [errors.last_name] : []"
              :error="!!errors.last_name"
              required
              @input="validateLastName"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="person" size="small" />
              </template>
            </VaInput>
          </div>
         
        </div>
        <div class="form-grid">
          <div class="form-group">
            <VaInput
              v-model="form.email"
              type="email"
              label="Email Address"
              placeholder="Enter email address"
              :error-messages="errors.email ? [errors.email] : []"
              :error="!!errors.email"
              required
              @input="validateEmail"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="email" size="small" />
              </template>
            </VaInput>
          </div>

          <div class="form-group">
            <VaInput
              v-model="form.phone"
              label="Phone Number"
              placeholder="e.g. 0712345678 or +255712345678"
              :error-messages="errors.phone ? [errors.phone] : []"
              :error="!!errors.phone"
              required
              @input="validatePhone"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="phone" size="small" />
              </template>
            </VaInput>
          </div>
        </div>
          
        <div class="form-grid">
          <div v-if="formMode === 'add'" class="form-group">
            <VaInput
              v-model="form.password"
              :type="isPasswordVisible ? 'text' : 'password'"
              label="Password"
              placeholder="Enter secure password"
              :error-messages="errors.password ? [errors.password] : []"
              :error="!!errors.password"
              required
              @input="validatePassword"
              @clickAppendInner.stop="isPasswordVisible = !isPasswordVisible"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="lock" size="small" />
              </template>
              <template #appendInner>
                <VaIcon
                  :name="isPasswordVisible ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer hover-icon"
                  color="secondary"
                />
              </template>
            </VaInput>
          </div>

          <div v-if="formMode === 'add'" class="form-group">
            <VaInput
              v-model="form.repeatPassword"
              :type="isPasswordVisible ? 'text' : 'password'"
              label="Confirm Password"
              placeholder="Repeat password"
              :error-messages="errors.repeatPassword ? [errors.repeatPassword] : []"
              :error="!!errors.repeatPassword"
              required
              @input="validateRepeatPassword"
              @clickAppendInner.stop="isPasswordVisible = !isPasswordVisible"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="lock" size="small" />
              </template>
              <template #appendInner>
                <VaIcon
                  :name="isPasswordVisible ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer hover-icon"
                  color="secondary"
                />
              </template>
            </VaInput>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group pin-group">
            <VaInput
              v-model="form.pin"
              type="password"
              label="Security PIN"
              placeholder="Enter 4-digit PIN"
              :error-messages="errors.pin ? [errors.pin] : []"
              :error="!!errors.pin"
              required
              @input="validatePin"
              maxlength="4"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="security" size="small" />
              </template>
            </VaInput>
            <small class="pin-hint">Use a 4-digit PIN for secure access</small>
          </div>
        </div>
      </div>

      <!-- Step 2: Owner Details -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-header">
          <h3 class="step-title">Owner Details</h3>
          <p class="step-description">Specify owner type, location and business information</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <VaSelect
              v-model="form.owner_type"
              label="Owner Type"
              :options="ownerTypeOptions"
              value-by="value"
              text-by="text"
              :error-messages="errors.owner_type ? [errors.owner_type] : []"
              :error="!!errors.owner_type"
              required
              @update:modelValue="validateOwnerType"
              class="form-select"
            >
              <template #prependInner>
                <VaIcon name="business" size="small" />
              </template>
            </VaSelect>
          </div>

          <div class="form-group">
            <VaSelect
              v-model="form.location_id"
              label="Location"
              placeholder="Select location"
              :options="locations"
              value-by="value"
              text-by="text"
              :error-messages="errors.location_id ? [errors.location_id] : []"
              :error="!!errors.location_id"
              @update:modelValue="validateLocation"
              clearable
              class="form-select"
            >
              <template #prependInner>
                <VaIcon name="location_on" size="small" />
              </template>
            </VaSelect>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <VaSelect
              v-model="form.property_category_id"
              label="Property Category"
              placeholder="Select category"
              :options="categories"
              value-by="value"
              text-by="text"
              :error-messages="errors.property_category_id ? [errors.property_category_id] : []"
              :error="!!errors.property_category_id"
              @update:modelValue="validatePropertyCategory"
              clearable
              class="form-select"
            >
              <template #prependInner>
                <VaIcon name="home" size="small" />
              </template>
            </VaSelect>
          </div>

          <div class="form-group">
            <VaInput
              v-model="form.business_name"
              label="Business Name"
              placeholder="Enter business name (optional)"
              :error-messages="errors.business_name ? [errors.business_name] : []"
              :error="!!errors.business_name"
              @input="validateBusinessName"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="store" size="small" />
              </template>
            </VaInput>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <VaInput
              v-model="form.contact_phone"
              label="Contact Phone"
              placeholder="Alternative contact number"
              :error-messages="errors.contact_phone ? [errors.contact_phone] : []"
              :error="!!errors.contact_phone"
              @input="validateContactPhone"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="contact_phone" size="small" />
              </template>
            </VaInput>
          </div>

          <div class="form-group">
            <VaInput
              v-model="form.contact_email"
              type="email"
              label="Contact Email"
              placeholder="Alternative email address"
              :error-messages="errors.contact_email ? [errors.contact_email] : []"
              :error="!!errors.contact_email"
              @input="validateContactEmail"
              class="form-input"
            >
              <template #prependInner>
                <VaIcon name="alternate_email" size="small" />
              </template>
            </VaInput>
          </div>
        </div>
      </div>

      <!-- Step 3: Additional Information -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="step-header">
          <h3 class="step-title">Additional Information</h3>
          <p class="step-description">Configure additional settings and notes</p>
        </div>
        
        <div class="form-grid additional-info">
          <div class="checkbox-group">
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                v-model="form.shared_living_space" 
                id="sharedLivingSpace"
                :class="{ 'is-invalid': errors.shared_living_space }" 
                @change="validateSharedLivingSpace"
              >
              <label class="form-check-label p-2" for="sharedLivingSpace">Shared Living Space</label>
              <div v-if="errors.shared_living_space" class="invalid-feedback">
                {{ errors.shared_living_space }}
              </div>
            </div>
            <small class="checkbox-hint">Check if the property has shared living areas</small>
          </div>

          <div class="checkbox-group">
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                v-model="form.is_verified" 
                id="isVerified"
                :class="{ 'is-invalid': errors.is_verified }" 
                @change="validateIsVerified"
              >
              <label class="form-check-label p-2" for="isVerified">Verified Account</label>
              <div v-if="errors.is_verified" class="invalid-feedback">
                {{ errors.is_verified }}
              </div>
            </div>
            <small class="checkbox-hint">Mark as verified to skip email activation</small>
          </div>

          <div class="form-group notes-group">
            <VaTextarea
              v-model="form.notes"
              label="Additional Notes"
              placeholder="Enter any additional notes or comments..."
              :error-messages="errors.notes ? [errors.notes] : []"
              :error="!!errors.notes"
              @input="validateNotes"
              rows="4"
              class="form-textarea"
            />
          </div>
        </div>
      </div>

      <!-- Step 4: Review -->
      <div v-if="currentStep === 4" class="step-content">
        <div class="step-header">
          <h3 class="step-title">Review Information</h3>
          <p class="step-description">Please review all information before submitting</p>
        </div>
        
        <div class="review-section">
          <div class="review-card">
            <h4 class="review-card-title">Personal Information</h4>
            <div class="review-grid">
              <div class="review-item">
                <span class="review-label">Full Name:</span>
                <span class="review-value">{{ form.first_name }} {{ form.last_name }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Email:</span>
                <span class="review-value">{{ form.email }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Phone:</span>
                <span class="review-value">{{ form.phone || 'Not provided' }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">PIN:</span>
                <span class="review-value">{{ form.pin ? '••••' : 'Not provided' }}</span>
              </div>
            </div>
          </div>

          <div class="review-card">
            <h4 class="review-card-title">Owner Details</h4>
            <div class="review-grid">
              <div class="review-item">
                <span class="review-label">Owner Type:</span>
                <span class="review-value">{{ getOwnerTypeText(form.owner_type) }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Location:</span>
                <span class="review-value">{{ getLocationText(form.location_id) }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Property Category:</span>
                <span class="review-value">{{ getCategoryText(form.property_category_id) }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Business Name:</span>
                <span class="review-value">{{ form.business_name || 'Not provided' }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Contact Phone:</span>
                <span class="review-value">{{ form.contact_phone || 'Not provided' }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Contact Email:</span>
                <span class="review-value">{{ form.contact_email || 'Not provided' }}</span>
              </div>
            </div>
          </div>

          <div class="review-card">
            <h4 class="review-card-title">Additional Settings</h4>
            <div class="review-grid">
              <div class="review-item">
                <span class="review-label">Shared Living Space:</span>
                <VaBadge :color="form.shared_living_space ? 'success' : 'secondary'" :text="form.shared_living_space ? 'Yes' : 'No'" />
              </div>
              <div class="review-item">
                <span class="review-label">Account Verified:</span>
                <VaBadge :color="form.is_verified ? 'success' : 'warning'" :text="form.is_verified ? 'Verified' : 'Pending'" />
              </div>
              <div v-if="form.notes" class="review-item full-width">
                <span class="review-label">Notes:</span>
                <span class="review-value">{{ form.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="form-actions">
        <VaButton 
          v-if="currentStep > 1" 
          color="secondary" 
          @click="previousStep"
          class="action-button"
        >
          <VaIcon name="arrow_back" class="mr-2" />
          Previous
        </VaButton>
        
        <div class="spacer"></div>
        
        <VaButton 
          v-if="currentStep < steps.length" 
          color="primary" 
          @click="nextStep"
          class="action-button"
        >
          Next
          <VaIcon name="arrow_forward" class="ml-2" />
        </VaButton>
        
        <VaButton
          v-if="currentStep === steps.length"
          color="success"
          type="submit"
          :disabled="isSubmitting || !isFormValid"
          :loading="isSubmitting"
          class="action-button submit-button"
        >
          <VaIcon name="save" class="mr-2" />
          {{ formMode === 'add' ? 'Create Owner' : 'Update Owner' }}
        </VaButton>
      </div>
    </form>

    <!-- Success Message for Generated Username -->
    <div v-if="generatedUsername" class="success-message">
      <VaAlert color="success" icon="check_circle">
        <template #title>Account Created Successfully!</template>
        Generated username: <strong>{{ generatedUsername }}</strong>
      </VaAlert>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref } from 'vue';
import Swal from 'sweetalert2';
import { useRouter } from 'vue-router';
import makeRequest from '../../../../services/makeRequest';

interface PropertyOwner {
  id?: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    username?: string;
    pin: string | number;
    nida_number?: string | null;
  };
  owner_type: string;
  property_count: number;
  location?: {
    id: number;
    name: string;
    city: {
      id: number;
      name: string;
    };
  } | null;
  property_category?: { id: number; name: string } | null;
  shared_living_space: boolean;
  is_verified: boolean;
  business_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  repeatPassword: string;
  pin: string;
  owner_type: string;
  location_id: number | null;
  property_category_id: number | null;
  shared_living_space: boolean;
  is_verified: boolean;
  business_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
}

interface Errors {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  repeatPassword: string;
  pin: string;
  owner_type: string;
  location_id: string;
  property_category_id: string;
  shared_living_space: string;
  is_verified: string;
  business_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
}

export default defineComponent({
  name: 'PropertyOwnerForm',
  props: {
    propertyOwner: {
      type: Object as PropType<PropertyOwner | null>,
      default: null,
    },
    formMode: {
      type: String as PropType<'add' | 'edit'>,
      default: 'add',
    },
  },
  emits: {
    close: null,
    submit: (payload: Partial<PropertyOwner>, mode: 'add' | 'edit') => true,
  },
  setup() {
    const router = useRouter();
    const isPasswordVisible = ref(false);
    const generatedUsername = ref('');
    const globalError = ref('');

    return { router, isPasswordVisible, generatedUsername, globalError };
  },
  data() {
    return {
      currentStep: 1,
      steps: [
        { label: 'Personal Information' },
        { label: 'Owner Details' },
        { label: 'Additional Information' },
        { label: 'Review' },
      ],
      form: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        repeatPassword: '',
        pin: '',
        owner_type: 'landlord',
        location_id: null,
        property_category_id: null,
        shared_living_space: false,
        is_verified: false,
        business_name: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
      } as FormData,
      errors: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        repeatPassword: '',
        pin: '',
        owner_type: '',
        location_id: '',
        property_category_id: '',
        shared_living_space: '',
        is_verified: '',
        business_name: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
      } as Errors,
      isSubmitting: false,
      locations: [] as { value: number; text: string }[],
      categories: [] as { value: number; text: string }[],
      ownerTypeOptions: [
        { value: 'landlord', text: 'Landlord' },
        { value: 'property_manager', text: 'Property Manager' },
      ],
      originalEmail: '' as string,
    };
  },
  computed: {
    isFormValid(): boolean {
      const requiredFieldsValid = (
        !!this.form.first_name &&
        !this.errors.first_name &&
        !!this.form.last_name &&
        !this.errors.last_name &&
        !!this.form.email &&
        !this.errors.email &&
        !!this.form.phone &&
        !this.errors.phone &&
        !!this.form.pin &&
        !this.errors.pin &&
        !!this.form.owner_type &&
        !this.errors.owner_type
      );

      const passwordValid = this.formMode === 'add'
        ? !!this.form.password && !this.errors.password && !this.errors.repeatPassword
        : !this.form.password || (!this.errors.password && !this.errors.repeatPassword);

      return requiredFieldsValid && passwordValid;
    },
  },
  async mounted() {
    try {
      await Promise.all([
        this.fetchLocations(),
        this.fetchCategories(),
      ]);
      this.initializeForm();
    } catch (error) {
      console.error('Failed to load form data:', error);
      this.showErrorMessage('Failed to load form data.');
    }
  },
  methods: {
    async fetchLocations() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
          requiresAuth: true,
        });
        this.locations = response.data.data.map((location: any) => ({
          value: location.id,
          text: `${location.name}, ${location.city.name}`,
        }));
        console.log('Fetched locations:', this.locations);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        this.showErrorMessage('Failed to fetch locations.');
      }
    },

    async fetchCategories() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
          requiresAuth: true,
        });
        this.categories = response.data.data.map((category: any) => ({
          value: category.id,
          text: category.name,
        }));
        console.log('Fetched categories:', this.categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        this.showErrorMessage('Failed to fetch categories.');
      }
    },

    initializeForm() {
      if (this.formMode === 'edit' && this.propertyOwner) {
        console.log('Initializing form with propertyOwner:', this.propertyOwner);
        this.form = {
          first_name: this.propertyOwner.user.first_name || '',
          last_name: this.propertyOwner.user.last_name || '',
          email: this.propertyOwner.user.email || '',
          phone: this.propertyOwner.user.phone || '',
          password: '',
          repeatPassword: '',
          pin: String(this.propertyOwner.user.pin || ''), // Convert to string
          owner_type: this.propertyOwner.owner_type || 'landlord',
          location_id: this.propertyOwner.location?.id || null,
          property_category_id: this.propertyOwner.property_category?.id || null,
          shared_living_space: this.propertyOwner.shared_living_space || false,
          is_verified: this.propertyOwner.is_verified || false,
          business_name: this.propertyOwner.business_name || '',
          contact_phone: this.propertyOwner.contact_phone || '',
          contact_email: this.propertyOwner.contact_email || '',
          notes: this.propertyOwner.notes || '',
        };
        this.originalEmail = this.propertyOwner.user.email || '';
        console.log('Initialized form:', this.form);
      }
    },

    validateFirstName() {
      if (!this.form.first_name) {
        this.errors.first_name = 'First name is required';
      } else if (this.form.first_name.length > 255) {
        this.errors.first_name = 'First name must not exceed 255 characters';
      } else {
        this.errors.first_name = '';
      }
    },

    validateLastName() {
      if (!this.form.last_name) {
        this.errors.last_name = 'Last name is required';
      } else if (this.form.last_name.length > 255) {
        this.errors.last_name = 'Last name must not exceed 255 characters';
      } else {
        this.errors.last_name = '';
      }
    },

    validateEmail() {
      if (!this.form.email) {
        this.errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
        this.errors.email = 'Invalid email format';
      } else if (this.form.email.length > 255) {
        this.errors.email = 'Email must not exceed 255 characters';
      } else {
        this.errors.email = '';
      }
    },

    validatePhone() {
      if (!this.form.phone) {
        this.errors.phone = 'Phone number is required';
      } else if (!/^(0\d{9}|\+255\d{9})$/.test(this.form.phone)) {
        this.errors.phone = 'Phone must be 10 digits starting with 0 or 13 digits starting with +255';
      } else {
        this.errors.phone = '';
      }
    },

    validatePassword() {
      if (this.formMode === 'add') {
        if (!this.form.password) {
          this.errors.password = 'Password is required';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(this.form.password)) {
          this.errors.password = 'Password must be at least 8 characters, including uppercase, lowercase, number, and special character';
        } else {
          this.errors.password = '';
        }
      } else {
        if (this.form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(this.form.password)) {
          this.errors.password = 'Password must be at least 8 characters, including uppercase, lowercase, number, and special character';
        } else {
          this.errors.password = '';
        }
      }
    },

    validateRepeatPassword() {
      if (this.formMode === 'add') {
        if (!this.form.repeatPassword) {
          this.errors.repeatPassword = 'Confirm password is required';
        } else if (this.form.repeatPassword !== this.form.password) {
          this.errors.repeatPassword = 'Passwords do not match';
        } else {
          this.errors.repeatPassword = '';
        }
      } else {
        if (this.form.password && this.form.repeatPassword !== this.form.password) {
          this.errors.repeatPassword = 'Passwords do not match';
        } else {
          this.errors.repeatPassword = '';
        }
      }
    },

    validatePin() {
      if (!this.form.pin) {
        this.errors.pin = 'PIN is required';
      } else if (!/^\d{4}$/.test(this.form.pin)) {
        this.errors.pin = 'PIN must be exactly 4 digits';
      } else if (['1234', '0000', '1111', '2222', '1000', '2000', '4321'].includes(this.form.pin)) {
        this.errors.pin = 'Choose a stronger PIN';
      } else {
        this.errors.pin = '';
      }
    },

    validateOwnerType() {
      if (!this.form.owner_type) {
        this.errors.owner_type = 'Owner type is required';
      } else if (!['landlord', 'property_manager'].includes(this.form.owner_type)) {
        this.errors.owner_type = 'Invalid owner type';
      } else {
        this.errors.owner_type = '';
      }
    },

    validateLocation() {
      if (this.form.location_id !== null && !this.locations.some(loc => loc.value === this.form.location_id)) {
        this.errors.location_id = 'Invalid location selected';
      } else {
        this.errors.location_id = '';
      }
    },

    validatePropertyCategory() {
      if (this.form.property_category_id !== null && !this.categories.some(cat => cat.value === this.form.property_category_id)) {
        this.errors.property_category_id = 'Invalid property category selected';
      } else {
        this.errors.property_category_id = '';
      }
    },

    validateBusinessName() {
      if (this.form.business_name && this.form.business_name.length > 255) {
        this.errors.business_name = 'Business name must not exceed 255 characters';
      } else {
        this.errors.business_name = '';
      }
    },

    validateContactPhone() {
      if (this.form.contact_phone && !/^(0\d{9}|\+255\d{9})$/.test(this.form.contact_phone)) {
        this.errors.contact_phone = 'Invalid contact phone format';
      } else {
        this.errors.contact_phone = '';
      }
    },

    validateContactEmail() {
      if (this.form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.contact_email)) {
        this.errors.contact_email = 'Invalid contact email format';
      } else {
        this.errors.contact_email = '';
      }
    },

    validateSharedLivingSpace() {
      this.errors.shared_living_space = '';
    },

    validateIsVerified() {
      this.errors.is_verified = '';
    },

    validateNotes() {
      this.errors.notes = '';
    },

    previousStep() {
      if (this.currentStep > 1) this.currentStep--;
    },

    nextStep() {
      if (this.validateCurrentStep() && this.currentStep < this.steps.length) {
        this.currentStep++;
      }
    },

    validateCurrentStep() {
      switch (this.currentStep) {
        case 1:
          this.validateFirstName();
          this.validateLastName();
          this.validateEmail();
          this.validatePhone();
          this.validatePassword();
          this.validateRepeatPassword();
          this.validatePin();
          break;
        case 2:
          this.validateOwnerType();
          this.validateLocation();
          this.validatePropertyCategory();
          this.validateBusinessName();
          this.validateContactPhone();
          this.validateContactEmail();
          break;
        case 3:
          this.validateSharedLivingSpace();
          this.validateIsVerified();
          this.validateNotes();
          break;
      }

      const stepErrors = Object.values(this.errors).filter(error => error !== '');
      return stepErrors.length === 0;
    },

    getOwnerTypeText(value: string) {
      const option = this.ownerTypeOptions.find(opt => opt.value === value);
      return option ? option.text : value;
    },

    getLocationText(id: number | null) {
      console.log('Getting location text for id:', id, 'locations:', this.locations);
      const location = this.locations.find(l => l.value === id);
      return location ? location.text : 'Not selected';
    },

    getCategoryText(id: number | null) {
      console.log('Getting category text for id:', id, 'categories:', this.categories);
      const category = this.categories.find(c => c.value === id);
      return category ? category.text : 'Not selected';
    },

    async submitForm() {
      this.globalError = '';

      if (!this.validateCurrentStep() || !this.isFormValid) {
        console.log('Form validation failed:', this.errors);
        return;
      }

      this.isSubmitting = true;
      try {
        const payload = {
          first_name: this.form.first_name,
          last_name: this.form.last_name,
          email: this.form.email,
          phone: this.form.phone.startsWith('0')
            ? `+255${this.form.phone.slice(1)}`
            : this.form.phone,
          password: this.form.password || undefined,
          password_confirmation: this.form.repeatPassword || undefined,
          pin: this.form.pin,
          owner_type: this.form.owner_type,
          location_id: this.form.location_id || null,
          property_category_id: this.form.property_category_id || null,
          shared_living_space: this.form.shared_living_space,
          is_verified: this.form.is_verified,
          business_name: this.form.business_name || null,
          contact_phone: this.form.contact_phone || null,
          contact_email: this.form.contact_email || null,
          notes: this.form.notes || null,
        };

        console.log('Submitting form with payload:', payload);

        let response;
        if (this.formMode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/admin/property-owners`,
            method: 'post',
            data: payload,
            requiresAuth: true,
          });
          
          this.generatedUsername = response.data.data.user.username;
          
          if (!this.form.is_verified && this.form.owner_type === 'property_manager') {
            this.showSuccessMessage('Property owner registered successfully! Please check your email to activate your account.');
            this.router.push({
              name: 'activate-account',
              query: {
                email: this.form.email,
                user_id: response.data.data.user.id,
              },
            });
          } else {
            this.showSuccessMessage('Property owner added successfully.');
            this.$emit('submit', payload, this.formMode);
            this.$emit('close');
          }
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/admin/property-owners/${this.propertyOwner?.id}`,
            method: 'put',
            data: payload,
            requiresAuth: true,
          });
          this.showSuccessMessage('Property owner updated successfully.');
          this.$emit('submit', payload, this.formMode);
          this.$emit('close');
        }
      } catch (error: any) {
        console.error('Full error response:', error.response?.data);
        this.handleSubmitError(error);
      } finally {
        this.isSubmitting = false;
      }
    },

    handleSubmitError(error: any) {
      console.error('Handling error:', error);
      console.log('Full error object:', JSON.stringify(error, null, 2));
      console.log('Error response:', error.response);
      console.log('Error response data:', error.response?.data);

      if (error.response?.status === 422 && error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        const errorMessage = error.response.data.message || 'Validation failed';

        console.error('Validation errors from backend:', backendErrors);

        this.clearErrors();

        const backendToFrontendMapping: { [key: string]: string } = {
          'password_confirmation': 'repeatPassword',
          'email': 'email',
          'phone': 'phone',
          'pin': 'pin',
          'first_name': 'first_name',
          'last_name': 'last_name',
          'password': 'password',
          'owner_type': 'owner_type',
          'location_id': 'location_id',
          'property_category_id': 'property_category_id',
          'business_name': 'business_name',
          'contact_phone': 'contact_phone',
          'contact_email': 'contact_email',
          'shared_living_space': 'shared_living_space',
          'is_verified': 'is_verified',
          'notes': 'notes',
        };

        let errorDetails = '';
        for (const backendKey in backendErrors) {
          if (Object.prototype.hasOwnProperty.call(backendErrors, backendKey)) {
            let errorMessages = backendErrors[backendKey];
            if (!Array.isArray(errorMessages)) {
              errorMessages = [errorMessages];
            }

            const frontendKey = backendToFrontendMapping[backendKey] || backendKey;
            let displayMessage = errorMessages[0];
            
            // Provide user-friendly messages for common errors
            if (displayMessage.includes('already been taken')) {
              if (backendKey === 'email') {
                displayMessage = 'This email is already in use. Please choose a different email.';
              } else if (backendKey === 'phone') {
                displayMessage = 'This phone number is already in use. Please choose a different phone number.';
              } else if (backendKey === 'pin') {
                displayMessage = 'This PIN is already in use. Please choose a different PIN.';
              }
            }
            
            // Set the error message for inline display
            if (Object.prototype.hasOwnProperty.call(this.errors, frontendKey)) {
              this.errors[frontendKey as keyof Errors] = displayMessage;
            }

            // Build error details for popup
            const fieldLabels: { [key: string]: string } = {
              email: 'Email',
              first_name: 'First Name',
              last_name: 'Last Name',
              phone: 'Phone Number',
              pin: 'PIN',
              password: 'Password',
              password_confirmation: 'Confirm Password',
              repeatPassword: 'Confirm Password',
              owner_type: 'Owner Type',
              location_id: 'Location',
              property_category_id: 'Property Category',
              business_name: 'Business Name',
              contact_phone: 'Contact Phone',
              contact_email: 'Contact Email',
              shared_living_space: 'Shared Living Space',
              is_verified: 'Verified Account',
              notes: 'Notes',
            };

            const fieldName = fieldLabels[backendKey] || fieldLabels[frontendKey] || frontendKey;
            errorDetails += `<li><strong>${fieldName}:</strong> ${displayMessage}</li>`;
          }
        }

        // Debug logs
        console.log('Frontend errors after setting:', this.errors);
        console.log('Error details for popup:', errorDetails);

        // Show SweetAlert2 popup with formatted errors
        Swal.fire({
          title: errorMessage,
          html: `<ul style="text-align: left; padding-left: 20px; margin: 0; list-style-type: disc;">${errorDetails}</ul>`,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 10000,
          timerProgressBar: true,
          width: '400px',
        });

        // Navigate to the first step with errors
        this.goToStepWithErrors();
        
        return; // Important: return early to avoid generic error handling
      } else {
        // Handle non-validation errors
        const message = error.response?.data?.message || 'An unexpected error occurred. Please try again.';
        this.globalError = message;
        this.showErrorMessage(message);
      }
    },

    goToStepWithErrors() {
      const step1Fields = ['first_name', 'last_name', 'email', 'phone', 'password', 'repeatPassword', 'pin'];
      const step2Fields = ['owner_type', 'location_id', 'property_category_id', 'business_name', 'contact_phone', 'contact_email'];
      const step3Fields = ['shared_living_space', 'is_verified', 'notes'];

      if (step1Fields.some(field => this.errors[field as keyof Errors])) {
        this.currentStep = 1;
      } else if (step2Fields.some(field => this.errors[field as keyof Errors])) {
        this.currentStep = 2;
      } else if (step3Fields.some(field => this.errors[field as keyof Errors])) {
        this.currentStep = 3;
      }
    },
    
    clearErrors() {
      this.errors = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        repeatPassword: '',
        pin: '',
        owner_type: '',
        location_id: '',
        property_category_id: '',
        shared_living_space: '',
        is_verified: '',
        business_name: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
      };
      this.globalError = '';
    },
    
    showSuccessMessage(message: string) {
      Swal.fire({
        title: 'Success!',
        text: message,
        icon: 'success',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    },
    
    showErrorMessage(message: string) {
      Swal.fire({
        title: 'Error!',
        text: message,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 5000,
      });
    },
  },
});
</script>

<style scoped>
.form-container {
  margin: 0 auto;
  padding: 2rem;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.form-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

.steps-container {
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.global-error-alert {
  margin-bottom: 1.5rem;
}

.property-form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.step-content {
  min-height: 500px;
}

.step-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.step-description {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 20px;
  padding: 10px;
}

.form-grid.additional-info {
  grid-template-columns: 1fr;
  max-width: 600px;
}

.form-group {
  position: relative;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  transition: all 0.3s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.pin-group {
  grid-column: span 1;
}

.pin-hint {
  display: block;
  margin-top: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
}

.checkbox-group {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.checkbox-group:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.form-checkbox {
  margin-bottom: 0.5rem;
}

.checkbox-hint {
  color: #64748b;
  font-size: 0.85rem;
  margin-left: 1.5rem;
}

.notes-group {
  grid-column: 1 / -1;
  margin-top: 1rem;
}

.hover-icon {
  transition: all 0.2s ease;
}

.hover-icon:hover {
  color: #3b82f6 !important;
  transform: scale(1.1);
}

.review-section {
  display: grid;
  gap: 1.5rem;
}

.review-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.review-card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.review-item.full-width {
  grid-column: 1 / -1;
}

.review-label {
  font-weight: 500;
  color: #64748b;
  font-size: 0.9rem;
}

.review-value {
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.spacer {
  flex: 1;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.submit-button {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: white;
}

.submit-button:hover {
  background: linear-gradient(135deg, #059669, #047857);
}

.success-message {
  margin-top: 1.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .form-container {
    padding: 1rem;
    margin: 0.5rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .form-title {
    font-size: 1.5rem;
  }
  
  .property-form {
    padding: 1.5rem;
  }
  
  .steps-container {
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .action-button {
    width: 100%;
    justify-content: center;
  }
  
  .spacer {
    display: none;
  }
}

/* Animation for step transitions */
.step-content {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Enhanced focus styles */
.form-input:focus-within,
.form-select:focus-within,
.form-textarea:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Error state styling */
.form-input.va-input--error,
.form-select.va-select--error,
.form-textarea.va-textarea--error {
  border-color: #ef4444;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Loading state */
.action-button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Custom scrollbar for textarea */
.form-textarea::-webkit-scrollbar {
  width: 8px;
}

.form-textarea::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.form-textarea::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.form-textarea::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
