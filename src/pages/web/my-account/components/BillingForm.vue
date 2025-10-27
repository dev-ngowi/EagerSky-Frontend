<template>
  <div class="billing-form">
    <div class="container">
      <div class="step-content">
        <h2 class="step-title">Billing Address Information</h2>
        <p class="step-description">Provide or update your billing address details for payment processing.</p>

        <!-- Existing Billing Address Selection -->
        <div v-if="existingBillingAddresses.length && !isEditing" class="info-card">
          <h3>📍 Select Your Billing Address</h3>
          <div class="form-group">
            <label for="selectedAddress">Your Addresses</label>
            <select
              v-model="selectedAddressId"
              @change="selectBillingAddress"
              :disabled="loading"
            >
              <option value="">Select an address...</option>
              <option
                v-for="address in existingBillingAddresses"
                :key="address.address_id"
                :value="address.address_id"
              >
                {{ address.country.name }}, {{ address.city.name }}, {{ address.street.name }}
              </option>
            </select>
          </div>
          <div v-if="existingBillingAddress" class="address-details">
            <p><strong>Country:</strong> {{ existingBillingAddress.country_name }}</p>
            <p><strong>City:</strong> {{ existingBillingAddress.city_name }}</p>
            <p><strong>Street:</strong> {{ existingBillingAddress.street_name }}</p>
            <p><strong>State/Region:</strong> {{ existingBillingAddress.state || 'N/A' }}</p>
            <p><strong>Zip/Postal Code:</strong> {{ existingBillingAddress.zip_code || 'N/A' }}</p>
            <div class="form-actions">
              <button class="btn btn-primary" @click="editAddress">Edit Address</button>
              <button class="btn btn-secondary" @click="startNewAddress">Create New Address</button>
            </div>
          </div>
        </div>

        <!-- Billing Address Form -->
        <div v-else>
          <div v-if="loading && loadingText" class="loading-indicator">
            <div class="spinner"></div>
            <span>{{ loadingText }}</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="country">Country</label>
              <select
                v-model="billing.country_id"
                @change="onCountryChange($event)"
                :disabled="loading"
                :class="{ 'error': errors.country_id }"
                required
              >
                <option value="">Select country...</option>
                <option
                  v-for="country in countries"
                  :key="country.id"
                  :value="country.id"
                >
                  {{ country.name }}
                </option>
              </select>
              <div v-if="errors.country_id" class="error-message">{{ errors.country_id }}</div>
            </div>
            <div class="form-group">
              <label for="city">City</label>
              <select
                v-model="billing.city_id"
                @change="onCityChange($event)"
                :disabled="loading || !billing.country_id || !cities.length"
                :class="{ 'error': errors.city_id }"
                required
              >
                <option value="">Select city...</option>
                <option
                  v-for="city in cities"
                  :key="city.id"
                  :value="city.id"
                >
                  {{ city.name }}
                </option>
              </select>
              <div v-if="errors.city_id" class="error-message">{{ errors.city_id }}</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="street">Street</label>
              <select
                v-model="billing.street_id"
                :disabled="loading || !billing.city_id || !streets.length"
                :class="{ 'error': errors.street_id }"
                required
              >
                <option value="">Select street...</option>
                <option
                  v-for="street in streets"
                  :key="street.id"
                  :value="street.id"
                >
                  {{ street.name }}
                </option>
              </select>
              <div v-if="errors.street_id" class="error-message">{{ errors.street_id }}</div>
            </div>
            <div class="form-group">
              <label for="state">State/Region</label>
              <input
                type="text"
                v-model="billing.state"
                placeholder="Enter state or region"
                :disabled="loading"
                :class="{ 'error': errors.state }"
              />
              <div v-if="errors.state" class="error-message">{{ errors.state }}</div>
            </div>
          </div>

          <div class="form-group">
            <label for="zipCode">Zip/Postal Code</label>
            <input
              type="text"
              v-model="billing.zip_code"
              placeholder="Enter zip or postal code"
              :disabled="loading"
              :class="{ 'error': errors.zip_code }"
            />
            <div v-if="errors.zip_code" class="error-message">{{ errors.zip_code }}</div>
          </div>

          <div class="form-actions">
            <button
              class="btn btn-primary"
              @click="saveBillingAddress"
              :disabled="loading || !billing.country_id || !billing.city_id || !billing.street_id || !billing.zip_code"
              type="button"
            >
              Save and Continue
            </button>
            <button
              v-if="existingBillingAddress"
              class="btn btn-secondary"
              @click="cancelEditing"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Swal from 'sweetalert2';
import { AxiosError } from 'axios';
import makeRequest from '../../../../services/makeRequest';
import { AuthMiddleware } from '../../../../utils/authMiddleware';

export default defineComponent({
  name: 'BillingForm',
  props: {
    billing: {
      type: Object as () => {
        country_id: number | null;
        city_id: number | null;
        street_id: number | null;
        state: string;
        zip_code: string;
        address_id: number | null;
      },
      required: true,
    },
    API_BASE_URL: {
      type: String,
      default: 'https://e1.japango.co.tz/api', // Added default to prevent undefined
      required: true,
    },
    authStore: {
      type: Object as () => {
        userProfile: { id: number } | null;
        token: string | null;
      },
      required: true,
    },
  },
  data() {
    return {
      loading: false,
      loadingText: '',
      errors: {} as Record<string, string | null>,
      countries: [] as Array<{ id: number; name: string }>,
      cities: [] as Array<{ id: number; name: string }>,
      streets: [] as Array<{ id: number; name: string }>,
      existingBillingAddresses: [] as Array<{
        address_id: number;
        country_id: number | null;
        country_name: string;
        city_id: number | null;
        city_name: string;
        street_id: number | null;
        street_name: string;
        state: string;
        zip_code: string;
        country: { id: number; name: string };
        city: { id: number; name: string };
        street: { id: number; name: string };
      }>,
      existingBillingAddress: null as {
        address_id: number;
        country_id: number | null;
        country_name: string;
        city_id: number | null;
        city_name: string;
        street_id: number | null;
        street_name: string;
        state: string;
        zip_code: string;
      } | null,
      selectedAddressId: '' as string | number,
      isEditing: false,
    };
  },
  computed: {
    isSessionValid(): boolean {
      return AuthMiddleware.isSessionValid();
    },
  },
  async mounted() {
    await this.fetchCountries();
    await this.fetchExistingBillingAddress();
  },
  methods: {
    showSwal(title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info') {
      return Swal.fire({
        title,
        text,
        icon,
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        background: icon === 'success' ? 'rgba(16, 185, 129, 0.95)' :
                    icon === 'error' ? 'rgba(239, 68, 68, 0.95)' :
                    icon === 'warning' ? 'rgba(245, 158, 11, 0.95)' :
                    'rgba(59, 130, 246, 0.95)',
        color: '#fff',
        didOpen: () => {
          const toast = Swal.getPopup();
          if (toast) {
            toast.style.borderLeft = `4px solid ${icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6'}`;
            toast.style.borderRadius = '12px';
            toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
            toast.style.backdropFilter = 'blur(10px)';
          }
        },
      });
    },
    onCountryChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      this.billing.country_id = target.value ? Number(target.value) : null;
      this.fetchCities();
    },
    onCityChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      this.billing.city_id = target.value ? Number(target.value) : null;
      this.fetchStreets();
    },
    async fetchExistingBillingAddress() {
      if (!this.isSessionValid) {
        this.showSwal('Session Expired', 'Please log in again.', 'error').then(() => {
          this.$emit('session-expired');
        });
        return;
      }
      this.loading = true;
      this.loadingText = 'Checking existing billing address...';
      try {
        const userId = this.authStore.userProfile?.id;
        if (!userId) {
          throw new Error('User ID not found. Please log in again.');
        }
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/billing-addresses?user_id=${userId}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        const billingData = response.data?.data || [];
        this.existingBillingAddresses = billingData.map((address: any) => ({
          address_id: address.address_id,
          country_id: address.country_id,
          country_name: address.country.name || 'Unknown',
          city_id: address.city_id,
          city_name: address.city.name || 'Unknown',
          street_id: address.street_id,
          street_name: address.street.name || 'Unknown',
          state: address.state || '',
          zip_code: address.zip_code || '',
          country: address.country,
          city: address.city,
          street: address.street,
        }));
        if (this.existingBillingAddresses.length > 0) {
          this.selectedAddressId = this.existingBillingAddresses[0].address_id;
          await this.selectBillingAddress();
          this.showSwal('Success', `${this.existingBillingAddresses.length} billing address(es) loaded successfully.`, 'success');
        } else {
          this.showSwal('No Addresses Found', 'No existing billing addresses found. Please create a new one.', 'info');
        }
      } catch (error) {
        console.error('Error fetching existing billing addresses:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        this.showSwal('Error', axiosError.response?.data?.message || 'Failed to fetch existing billing addresses.', 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    async selectBillingAddress() {
      const selectedAddress = this.existingBillingAddresses.find(
        addr => addr.address_id === this.selectedAddressId
      );
      if (selectedAddress) {
        this.existingBillingAddress = selectedAddress;
        Object.assign(this.billing, {
          country_id: selectedAddress.country_id,
          city_id: selectedAddress.city_id,
          street_id: selectedAddress.street_id,
          state: selectedAddress.state,
          zip_code: selectedAddress.zip_code,
          address_id: selectedAddress.address_id,
        });
        this.$emit('update-billing', this.billing);
        if (this.billing.country_id) {
          await this.fetchCities(true);
          if (this.billing.city_id) {
            await this.fetchStreets(true);
          }
        }
        this.$emit('continue', this.billing);
        this.showSwal('Address Selected', 'Billing address selected successfully.', 'success');
      }
    },
    async editAddress() {
      this.isEditing = true;
      if (this.existingBillingAddress) {
        Object.assign(this.billing, {
          country_id: this.existingBillingAddress.country_id,
          city_id: this.existingBillingAddress.city_id,
          street_id: this.existingBillingAddress.street_id,
          state: this.existingBillingAddress.state,
          zip_code: this.existingBillingAddress.zip_code,
        });
        this.$emit('update-billing', this.billing);
        if (this.billing.country_id) {
          await this.fetchCities(true);
          if (this.billing.city_id) {
            await this.fetchStreets(true);
          }
        }
        this.showSwal('Edit Address', 'Now editing the selected billing address.', 'info');
      }
    },
    async fetchCountries() {
      if (!this.isSessionValid) {
        this.showSwal('Session Expired', 'Please log in again.', 'error').then(() => {
          this.$emit('session-expired');
        });
        return;
      }
      this.loading = true;
      this.loadingText = 'Loading countries...';
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/country`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.countries = response.data?.data || [];
        if (!this.countries.length) {
          this.showSwal('No Countries Available', 'No countries found. Please try again or contact support.', 'warning');
        } else {
          this.showSwal('Success', `${this.countries.length} country(ies) loaded successfully.`, 'success');
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        this.showSwal('Error', axiosError.response?.data?.message || 'Failed to fetch countries.', 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    async fetchCities(preserveCityId = false) {
      if (!this.isSessionValid || !this.billing.country_id) {
        this.cities = [];
        this.streets = [];
        if (!preserveCityId) {
          this.billing.city_id = null;
          this.billing.street_id = null;
        }
        this.$emit('update-billing', this.billing);
        if (!this.billing.country_id) {
          this.showSwal('Validation Error', 'Please select a country first.', 'error');
        } else {
          this.showSwal('Session Expired', 'Please log in again.', 'error').then(() => {
            this.$emit('session-expired');
          });
        }
        return;
      }
      this.loading = true;
      this.loadingText = 'Loading cities...';
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/city?country_id=${this.billing.country_id}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.cities = response.data?.data || [];
        if (!preserveCityId) {
          this.streets = [];
          this.billing.city_id = null;
          this.billing.street_id = null;
        }
        this.$emit('update-billing', this.billing);
        if (!this.cities.length) {
          this.showSwal('No Cities Available', 'No cities found for the selected country.', 'warning');
        } else {
          this.showSwal('Success', `${this.cities.length} city(ies) loaded successfully.`, 'success');
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        this.showSwal('Error', axiosError.response?.data?.message || 'Failed to fetch cities.', 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    async fetchStreets(preserveStreetId = false) {
      if (!this.isSessionValid || !this.billing.city_id) {
        this.streets = [];
        if (!preserveStreetId) {
          this.billing.street_id = null;
        }
        this.$emit('update-billing', this.billing);
        if (!this.billing.city_id) {
          this.showSwal('Validation Error', 'Please select a city first.', 'error');
        } else {
          this.showSwal('Session Expired', 'Please log in again.', 'error').then(() => {
            this.$emit('session-expired');
          });
        }
        return;
      }
      this.loading = true;
      this.loadingText = 'Loading streets...';
      try {
        const response = await makeRequest({
          method: 'GET',
          url: `${this.API_BASE_URL}/v1/street?city_id=${this.billing.city_id}`,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });
        this.streets = response.data?.data || [];
        if (!preserveStreetId) {
          this.billing.street_id = null;
        }
        this.$emit('update-billing', this.billing);
        if (!this.streets.length) {
          this.showSwal('No Streets Available', 'No streets found for the selected city.', 'warning');
        } else {
          this.showSwal('Success', `${this.streets.length} street(s) loaded successfully.`, 'success');
        }
      } catch (error) {
        console.error('Error fetching streets:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        this.showSwal('Error', axiosError.response?.data?.message || 'Failed to fetch streets.', 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
    startNewAddress() {
      this.isEditing = true;
      this.billing.country_id = null;
      this.billing.city_id = null;
      this.billing.street_id = null;
      this.billing.state = '';
      this.billing.zip_code = '';
      this.cities = [];
      this.streets = [];
      this.$emit('update-billing', this.billing);
      this.showSwal('New Address', 'You are now creating a new billing address.', 'info');
    },
    cancelEditing() {
      this.isEditing = false;
      if (this.existingBillingAddress) {
        Object.assign(this.billing, {
          country_id: this.existingBillingAddress.country_id,
          city_id: this.existingBillingAddress.city_id,
          street_id: this.existingBillingAddress.street_id,
          state: this.existingBillingAddress.state,
          zip_code: this.existingBillingAddress.zip_code,
        });
        this.$emit('update-billing', this.billing);
        if (this.billing.country_id) {
          this.fetchCities(true);
          if (this.billing.city_id) {
            this.fetchStreets(true);
          }
        }
      }
      this.showSwal('Cancelled', 'Editing cancelled. Reverted to existing billing address.', 'info');
    },
    async saveBillingAddress() {
      this.errors = {};
      if (!this.billing.country_id) this.errors.country_id = 'Please select a country.';
      if (!this.billing.city_id) this.errors.city_id = 'Please select a city.';
      if (!this.billing.street_id) this.errors.street_id = 'Please select a street.';
      if (!this.billing.zip_code) this.errors.zip_code = 'Please enter a zip or postal code.';

      if (Object.keys(this.errors).length > 0) {
        this.showSwal('Validation Error', 'Please fill in all required fields correctly.', 'error');
        return;
      }

      this.loading = true;
      this.loadingText = 'Saving billing address...';
      try {
        const method = this.existingBillingAddress && this.isEditing ? 'PUT' : 'POST';
        const url = this.existingBillingAddress && this.isEditing
          ? `${this.API_BASE_URL}/v1/billing-addresses/${this.existingBillingAddress.address_id}`
          : `${this.API_BASE_URL}/v1/billing-addresses`;

        const data = {
          country_id: this.billing.country_id,
          city_id: this.billing.city_id,
          street_id: this.billing.street_id,
          state: this.billing.state,
          zip_code: this.billing.zip_code,
          user_id: method === 'POST' ? this.authStore.userProfile?.id : undefined,
        };

        const response = await makeRequest({
          method,
          url,
          data,
          headers: { Authorization: `Bearer ${this.authStore.token}` },
          requiresAuth: true,
        });

        if (response.status === 200 || response.status === 201) {
          const addressId = response.data?.data?.address_id || response.data?.data?.id;
          if (!addressId) {
            throw new Error('Billing address ID not found in response');
          }
          const newAddress = {
            address_id: addressId,
            country_id: this.billing.country_id,
            country_name: this.countries.find(c => c.id === this.billing.country_id)?.name || 'Unknown',
            city_id: this.billing.city_id,
            city_name: this.cities.find(c => c.id === this.billing.city_id)?.name || 'Unknown',
            street_id: this.billing.street_id,
            street_name: this.streets.find(s => s.id === this.billing.street_id)?.name || 'Unknown',
            state: this.billing.state,
            zip_code: this.billing.zip_code,
            country: this.countries.find(c => c.id === this.billing.country_id) || { id: this.billing.country_id!, name: 'Unknown' },
            city: this.cities.find(c => c.id === this.billing.city_id) || { id: this.billing.city_id!, name: 'Unknown' },
            street: this.streets.find(s => s.id === this.billing.street_id) || { id: this.billing.street_id!, name: 'Unknown' },
          };
          this.existingBillingAddresses = [newAddress, ...this.existingBillingAddresses.filter(addr => addr.address_id !== addressId)];
          this.existingBillingAddress = newAddress;
          this.selectedAddressId = addressId;
          this.isEditing = false;
          Object.assign(this.billing, { address_id: addressId });
          this.$emit('update-billing', this.billing);
          this.showSwal('Billing Address Saved', 'Your billing address has been successfully saved. Proceeding to payment...', 'success').then(() => {
            this.$emit('continue', this.billing);
          });
        } else {
          this.showSwal('Error', response.data?.message || 'Failed to save billing address.', 'error');
        }
      } catch (error) {
        console.error('Error saving billing address:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        this.showSwal('Error', axiosError.response?.data?.message || 'Failed to save billing address.', 'error');
      } finally {
        this.loading = false;
        this.loadingText = '';
      }
    },
  },
});
</script>

<style scoped>
.billing-form {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  padding: 20px;
  color: #334155;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.step-content {
  padding: 40px;
  animation: fadeInSlide 0.4s ease-out;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.step-description {
  color: #64748b;
  margin-bottom: 32px;
  font-size: 1.1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 24px;
}

label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

input, select {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  font-family: inherit;
}

input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

input:hover, select:hover {
  border-color: #cbd5e1;
}

input.error, select.error {
  border-color: #dc2626;
  background-color: #fff5f5;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  margin-top: 8px;
  font-size: 14px;
}

.address-details {
  margin-top: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: none;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.btn:hover:before {
  left: 100%;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(90, 98, 104, 0.4);
}

.info-card {
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  position: relative;
  overflow: hidden;
}

.info-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}

.info-card h3 {
  color: #1e40af;
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 1.2rem;
}

.info-card p {
  color: #1e40af;
  margin: 6px 0;
  font-size: 1rem;
  line-height: 1.5;
}

.info-card strong {
  font-weight: 600;
  color: #1e3a8a;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin: 24px 0;
  color: #64748b;
  font-weight: 500;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .billing-form {
    padding: 10px;
  }

  .container {
    border-radius: 16px;
    margin: 0;
  }

  .step-content {
    padding: 24px 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .step-title {
    font-size: 1.5rem;
  }

  .step-description {
    font-size: 1rem;
  }

  .btn {
    padding: 12px 20px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .step-title {
    font-size: 1.3rem;
  }

  .step-description {
    font-size: 0.9rem;
  }

  .info-card {
    padding: 16px;
  }
}

@media print {
  .billing-form {
    background: white;
    padding: 0;
  }

  .container {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }

  .btn {
    display: none;
  }
}
</style>