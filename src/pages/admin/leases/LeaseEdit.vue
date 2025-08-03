<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Lease', 'Edit Lease') }}</h2>
    <div v-if="lease">
      <form @submit.prevent="submitForm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-4">
            <VaSelect
              v-model="form.property_id"
              label="Property"
              placeholder="Select property"
              :options="properties"
              :error-messages="errors.property_id ? [errors.property_id] : []"
              value-by="value"
              text-by="text"
              :disabled="isSubmitting || loadingProperties"
              :loading="loadingProperties"
              required
            />
          </div>
          <div class="mb-4">
            <VaSelect
              v-model="form.user_id"
              label="User"
              placeholder="Select user"
              :options="users"
              :error-messages="errors.user_id ? [errors.user_id] : []"
              value-by="value"
              text-by="text"
              :disabled="isSubmitting || loadingUsers"
              :loading="loadingUsers"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model="form.start_date"
              type="date"
              label="Start Date"
              :error-messages="errors.start_date ? [errors.start_date] : []"
              :disabled="isSubmitting"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model="form.end_date"
              type="date"
              label="End Date"
              :error-messages="errors.end_date ? [errors.end_date] : []"
              :disabled="isSubmitting"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model.number="form.rent_amount"
              type="number"
              label="Rent Amount"
              placeholder="Enter rent amount"
              :error-messages="errors.rent_amount ? [errors.rent_amount] : []"
              :disabled="isSubmitting"
              min="0"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model="form.terms"
              label="Terms (Optional)"
              placeholder="Enter lease terms"
              :error-messages="errors.terms ? [errors.terms] : []"
              :disabled="isSubmitting"
            />
          </div>
          <div class="mb-4">
            <VaSelect
              v-model="form.is_signed"
              label="Signed"
              placeholder="Select signed status"
              :options="signedOptions"
              :error-messages="errors.is_signed ? [errors.is_signed] : []"
              value-by="value"
              text-by="text"
              :disabled="isSubmitting"
              required
            />
          </div>
        </div>
        <div class="flex justify-end space-x-2 mt-4">
          <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
          <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting || !leaseId">
            <div v-if="isSubmitting" class="spinner" />
            <span v-else>Update</span>
          </VaButton>
        </div>
      </form>
    </div>
    <div v-else class="text-red-500">No lease selected</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, ref } from 'vue';
import makeRequest from '../../../services/makeRequest';
import Swal from 'sweetalert2';
import type { Lease, FormData, Errors, Payload, PropertyOption, UserOption, SignedOption } from '../../../types/lease';

export default defineComponent({
  name: 'LeaseEdit',
  props: {
    lease: {
      type: Object as PropType<Lease | null>,
      required: true,
    },
  },
  emits: {
    submit: (payload: Payload, mode: 'edit') => true,
    close: () => true,
  },
  setup() {
    const form = reactive<FormData>({
      property_id: null,
      user_id: null,
      start_date: '',
      end_date: '',
      rent_amount: null,
      terms: '',
      is_signed: null,
    });

    const errors = reactive<Errors>({
      property_id: '',
      user_id: '',
      start_date: '',
      end_date: '',
      rent_amount: '',
      terms: '',
      is_signed: '',
    });

    const signedOptions = reactive<SignedOption[]>([
      { value: true, text: 'Yes' },
      { value: false, text: 'No' },
    ]);

    const properties = ref<PropertyOption[]>([]);
    const users = ref<UserOption[]>([]);
    const loadingProperties = ref<boolean>(false);
    const loadingUsers = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    return { form, errors, signedOptions, properties, users, loadingProperties, loadingUsers, isSubmitting };
  },
  computed: {
    leaseId(): number | null {
      return this.lease?.id ?? null;
    },
  },
  mounted() {
    console.log('LeaseEdit mounted, received lease:', JSON.stringify(this.lease, null, 2));
    this.form.property_id = this.lease?.property_id ? Number(this.lease.property_id) : null;
    this.form.user_id = this.lease?.user_id ? Number(this.lease.user_id) : null;
    this.form.start_date = this.lease?.start_date || '';
    this.form.end_date = this.lease?.end_date || '';
    this.form.rent_amount = this.lease?.rent_amount ?? null;
    this.form.terms = this.lease?.terms || '';
    this.form.is_signed = this.lease?.is_signed ?? null;
    console.log('Initial form state:', JSON.stringify(this.form, null, 2));
    this.loadDropdowns();
  },
  methods: {
    async loadDropdowns() {
      try {
        await Promise.all([this.fetchProperties(), this.fetchUsers()]);
        console.log('Dropdown data loaded:', {
          properties: this.properties,
          users: this.users,
        });
        if (this.users.length === 0) {
          Swal.fire({
            title: 'Warning!',
            text: 'No users available. Please add users first.',
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        if (this.properties.length === 0) {
          Swal.fire({
            title: 'Warning!',
            text: 'No properties available. Please add properties first.',
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Error loading dropdown data:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to load form data. Please try again.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: Number(property.id),
            text: property.title && typeof property.title === 'string' && property.title.trim()
              ? property.title
              : `Property ${property.id}`,
          }));
          console.log('Properties fetched:', this.properties);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch properties.');
        }
      } catch (error: any) {
        console.error('fetchProperties error:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingProperties = false;
      }
    },
    async fetchUsers() {
      this.loadingUsers = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: Number(user.id),
            text: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || `User ${user.id}`,
          }));
          console.log('Users fetched:', this.users);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch users.');
        }
      } catch (error: any) {
        console.error('fetchUsers error:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch users.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingUsers = false;
      }
    },
    async submitForm() {
      if (!this.leaseId) {
        console.error('Invalid lease ID:', this.leaseId);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid lease ID. Cannot update lease.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        this.$emit('close');
        return;
      }

      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      if (!this.form.property_id) this.errors.property_id = 'Property is required';
      if (!this.form.user_id) this.errors.user_id = 'User is required';
      if (!this.form.start_date) this.errors.start_date = 'Start date is required';
      else if (new Date(this.form.start_date) < new Date(new Date().setHours(0, 0, 0, 0)))
        this.errors.start_date = 'Start date must be today or later';
      if (!this.form.end_date) this.errors.end_date = 'End date is required';
      else if (this.form.start_date && new Date(this.form.end_date) <= new Date(this.form.start_date))
        this.errors.end_date = 'End date must be after start date';
      if (this.form.rent_amount === null || this.form.rent_amount < 0)
        this.errors.rent_amount = 'Rent amount must be a non-negative number';
      if (this.form.is_signed === null) this.errors.is_signed = 'Signed status is required';

      if (Object.values(this.errors).some((error) => error)) {
        console.log('Validation errors:', this.errors);
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          property_id: this.form.property_id,
          user_id: this.form.user_id,
          start_date: this.form.start_date,
          end_date: this.form.end_date,
          rent_amount: this.form.rent_amount,
          terms: this.form.terms || null,
          is_signed: this.form.is_signed,
        };
        console.log('Submitting payload:', payload);

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${this.leaseId}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });

        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Lease updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.$emit('submit', payload, 'edit');
          this.$emit('close');
        } else {
          throw new Error(response.data?.message || 'Failed to update lease.');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to update lease.';
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
        } else if (error.response?.status === 404) {
          errorMessage = 'Lease not found. It may have been deleted.';
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
    resetForm() {
      console.log('Resetting form to original lease:', this.lease);
      this.form = {
        property_id: this.lease?.property_id ? Number(this.lease.property_id) : null,
        user_id: this.lease?.user_id ? Number(this.lease.user_id) : null,
        start_date: this.lease?.start_date || '',
        end_date: this.lease?.end_date || '',
        rent_amount: this.lease?.rent_amount ?? null,
        terms: this.lease?.terms || '',
        is_signed: this.lease?.is_signed ?? null,
      };
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));
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
.text-red-500 {
  color: #ef4444;
}
</style>