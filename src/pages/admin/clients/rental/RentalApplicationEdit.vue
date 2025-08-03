<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Rental Application') }}</h2>
    <div v-if="application">
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
            <VaSelect
              v-model="form.branch_id"
              label="Branch (Optional)"
              placeholder="Select branch"
              :options="branches"
              :error-messages="errors.branch_id ? [errors.branch_id] : []"
              value-by="value"
              text-by="text"
              :disabled="isSubmitting || loadingBranches"
              :loading="loadingBranches"
              clearable
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
              required
            />
          </div>
          <div class="mb-4">
            <VaSelect
              v-model="form.employment_status"
              label="Employment Status"
              placeholder="Select employment status"
              :options="employmentStatusOptions"
              :error-messages="errors.employment_status ? [errors.employment_status] : []"
              value-by="value"
              text-by="text"
              :disabled="isSubmitting"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model="form.nida_number"
              label="NIDA Number"
              placeholder="Enter NIDA number"
              :error-messages="errors.nida_number ? [errors.nida_number] : []"
              :disabled="isSubmitting"
              required
            />
          </div>
          <div v-if="form.employment_status === 'student'" class="mb-4">
            <VaInput
              v-model="form.student_registration_number"
              label="Student Registration Number"
              placeholder="Enter student registration number"
              :error-messages="errors.student_registration_number ? [errors.student_registration_number] : []"
              :disabled="isSubmitting"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model.number="form.annual_income"
              type="number"
              label="Annual Income"
              placeholder="Enter annual income"
              :error-messages="errors.annual_income ? [errors.annual_income] : []"
              :disabled="isSubmitting"
              min="0"
              required
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model="form.background_check_status"
              label="Background Check Status (Optional)"
              placeholder="Enter background check status"
              :error-messages="errors.background_check_status ? [errors.background_check_status] : []"
              :disabled="isSubmitting"
            />
          </div>
          <div class="mb-4">
            <VaInput
              v-model="form.credit_report_status"
              label="Credit Report Status (Optional)"
              placeholder="Enter credit report status"
              :error-messages="errors.credit_report_status ? [errors.credit_report_status] : []"
              :disabled="isSubmitting"
            />
          </div>
        </div>
        <div class="flex justify-end space-x-2 mt-4">
          <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
          <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting || !applicationId">
            <div v-if="isSubmitting" class="spinner" />
            <span v-else>Update</span>
          </VaButton>
        </div>
      </form>
    </div>
    <div v-else class="text-red-500">No application selected</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, ref } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import type { RentalApplication, FormData, Errors, Payload, Option, StatusOption } from '../../../../types/rentalApplication';

export default defineComponent({
  name: 'RentalApplicationEdit',
  props: {
    application: {
      type: Object as PropType<RentalApplication | null>,
      required: true,
    },
  },
  emits: {
    close: () => true,
    submit: (payload: Payload, mode: 'edit') => true,
  },
  setup() {
    const form = reactive<FormData>({
      property_id: null,
      user_id: null,
      branch_id: null,
      status: '',
      employment_status: '',
      nida_number: '',
      student_registration_number: '',
      annual_income: null,
      background_check_status: '',
      credit_report_status: '',
    });

    const errors = reactive<Errors>({
      property_id: '',
      user_id: '',
      branch_id: '',
      status: '',
      employment_status: '',
      nida_number: '',
      student_registration_number: '',
      annual_income: '',
      background_check_status: '',
      credit_report_status: '',
    });

    const statusOptions = reactive<StatusOption[]>([
      { value: 'pending', text: 'Pending' },
      { value: 'approved', text: 'Approved' },
      { value: 'rejected', text: 'Rejected' },
    ]);

    const employmentStatusOptions = reactive([
      { value: 'employed', text: 'Employed' },
      { value: 'self-employed', text: 'Self-Employed' },
      { value: 'student', text: 'Student' },
    ]);

    const properties = ref<Option[]>([]);
    const users = ref<Option[]>([]);
    const branches = ref<Option[]>([]);
    const loadingProperties = ref<boolean>(false);
    const loadingUsers = ref<boolean>(false);
    const loadingBranches = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    return { form, errors, statusOptions, employmentStatusOptions, properties, users, branches, loadingProperties, loadingUsers, loadingBranches, isSubmitting };
  },
  computed: {
    applicationId(): number | null {
      return this.application?.id ?? null;
    },
  },
  mounted() {
    console.log('RentalApplicationEdit mounted, received application:', JSON.stringify(this.application, null, 2));
    this.initializeForm();
    this.loadDropdowns();
  },
  methods: {
    initializeForm() {
      this.form.property_id = this.application?.property_id ? Number(this.application.property_id) : null;
      this.form.user_id = this.application?.user_id ? Number(this.application.user_id) : null;
      this.form.branch_id = this.application?.branch_id ? Number(this.application.branch_id) : null;
      this.form.status = this.application?.status || 'pending';
      this.form.employment_status = this.application?.employment_status || '';
      this.form.nida_number = this.application?.nida_number || '';
      this.form.student_registration_number = this.application?.student_registration_number || '';
      this.form.annual_income = this.application?.annual_income ?? null;
      this.form.background_check_status = this.application?.background_check_status || '';
      this.form.credit_report_status = this.application?.credit_report_status || '';
      console.log('Initial form state:', JSON.stringify(this.form, null, 2));
    },
    async loadDropdowns() {
      try {
        await Promise.all([this.fetchProperties(), this.fetchUsers(), this.fetchBranches()]);
        console.log('Dropdown data loaded:', {
          properties: this.properties,
          users: this.users,
          branches: this.branches,
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
        });
        console.log('Properties response:', response);
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: Number(property.id),
            text: property.title && typeof property.title === 'string' && property.title.trim()
              ? property.title
              : `Unnamed Property (ID: ${property.id})`,
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
          params: { role_id: 3 }, // Assuming role_id 3 for tenants
        });
        console.log('Users response:', response);
        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: Number(user.id),
            text: user.name && typeof user.name === 'string' && user.name.trim()
              ? user.name
              : `User ${user.id}`,
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
    async fetchBranches() {
      this.loadingBranches = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/branches`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
        });
        console.log('Branches response:', response);
        if (response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            value: Number(branch.id),
            text: branch.name && typeof branch.name === 'string' && branch.name.trim()
              ? branch.name
              : `Branch ${branch.id}`,
          }));
          console.log('Branches fetched:', this.branches);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch branches.');
        }
      } catch (error: any) {
        console.error('fetchBranches error:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch branches.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingBranches = false;
      }
    },
    async submitForm() {
      if (!this.applicationId) {
        console.error('Invalid application ID:', this.applicationId);
        Swal.fire({
          title: 'Error!',
          text: 'Invalid application ID. Cannot update application.',
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
      if (!this.form.status) this.errors.status = 'Status is required';
      if (!this.form.employment_status) this.errors.employment_status = 'Employment status is required';
      if (!this.form.nida_number) this.errors.nida_number = 'NIDA number is required';
      else if (this.form.nida_number.length < 20) this.errors.nida_number = 'NIDA number must be at least 20 characters';
      if (this.form.employment_status === 'student' && !this.form.student_registration_number)
        this.errors.student_registration_number = 'Student registration number is required for students';
      if (this.form.annual_income === null || this.form.annual_income < 0)
        this.errors.annual_income = 'Annual income must be a non-negative number';

      if (Object.values(this.errors).some((error) => error)) {
        console.log('Validation errors:', this.errors);
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          property_id: this.form.property_id!,
          user_id: this.form.user_id!,
          branch_id: this.form.branch_id,
          status: this.form.status as 'pending' | 'approved' | 'rejected',
          employment_status: this.form.employment_status,
          nida_number: this.form.nida_number,
          student_registration_number: this.form.employment_status === 'student' ? this.form.student_registration_number : null,
          annual_income: this.form.annual_income!,
          background_check_status: this.form.background_check_status || null,
          credit_report_status: this.form.credit_report_status || null,
        };
        console.log('Submitting payload:', payload);

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${this.applicationId}`,
          method: 'put',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          data: payload,
        });

        console.log('Submit response:', response);
        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Rental application updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.$emit('submit', payload, 'edit');
          this.$emit('close');
        } else {
          throw new Error(response.data?.message || 'Failed to update rental application.');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to update rental application.';
        if (error.response?.status === 422) {
          if (errorMessage === 'A pending application already exists for this user and property') {
            Swal.fire({
              title: 'Error!',
              text: 'A pending application already exists for this user and property.',
              icon: 'error',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          } else if (error.response?.data?.errors) {
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
            Swal.fire({
              title: 'Error!',
              text: errorMessage,
              icon: 'error',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else if (error.response?.status === 404) {
          errorMessage = 'Rental application not found. It may have been deleted.';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } finally {
        this.isSubmitting = false;
      }
    },
    resetForm() {
      console.log('Resetting form to original application:', JSON.stringify(this.application, null, 2));
      this.initializeForm();
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