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
              placeholder="Enter 20-digit NIDA number"
              :error-messages="errors.nida_number ? [errors.nida_number] : []"
              :disabled="isSubmitting"
              required
              type="text"
              pattern="[0-9]{20}"
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
import { defineComponent, PropType, reactive, ref, watch } from 'vue';
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
      status: 'pending',
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
  watch: {
    'application': {
      handler(newApplication) {
        if (newApplication) {
          this.initializeForm();
        }
      },
      immediate: true,
      deep: true,
    },
    'form.employment_status'(newVal) {
      if (newVal !== 'student') {
        this.form.student_registration_number = '';
        this.errors.student_registration_number = '';
      }
    },
    'form.user_id': {
      handler() {
        this.checkExistingApplication();
      },
      immediate: true,
    },
    'form.property_id': {
      handler() {
        this.checkExistingApplication();
      },
      immediate: true,
    },
  },
  mounted() {
    this.loadDropdowns();
  },
  methods: {
    initializeForm() {
      if (!this.application) return;
      this.form.property_id = this.application?.property_id ? Number(this.application.property_id) : null;
      this.form.user_id = this.application?.user_id ? Number(this.application.user_id) : null;
      this.form.branch_id = this.application?.branch_id ? Number(this.application.branch_id) : null;
      this.form.status = this.application?.status || 'pending';
      this.form.employment_status = this.application?.employment_status || '';
      this.form.nida_number = this.application?.nida_number || '';
      this.form.student_registration_number = this.application?.employment_status === 'student' ? this.application?.student_registration_number || '' : '';
      this.form.annual_income = this.application?.annual_income ? Number(this.application.annual_income) : null;
      this.form.background_check_status = this.application?.background_check_status || '';
      this.form.credit_report_status = this.application?.credit_report_status || '';
    },
    async loadDropdowns() {
      try {
        await Promise.all([this.fetchProperties(), this.fetchUsers(), this.fetchBranches()]);
        if (this.users.length === 0) {
          Swal.fire({
            title: 'Warning!',
            text: 'No users available. Please add users with role "Tenant" in the admin panel.',
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: true,
            confirmButtonText: 'Go to Users',
            timer: 5000,
          }).then((result) => {
            if (result.isConfirmed) {
              this.$router.push('/admin/users');
            }
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
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: Number(property.id),
            text: property.title && typeof property.title === 'string' && property.title.trim()
              ? property.title
              : `Unnamed Property (ID: ${property.id})`,
          }));
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
        if (response.status === 200) {
          this.users = response.data.data.map((user: any) => ({
            value: Number(user.id),
            text: user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`.trim()
              : `User ${user.id}`,
          }));
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
        if (response.status === 200) {
          this.branches = response.data.data.map((branch: any) => ({
            value: Number(branch.id),
            text: branch.name && typeof branch.name === 'string' && branch.name.trim()
              ? branch.name
              : `Branch ${branch.id}`,
          }));
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
    async checkExistingApplication() {
      if (!this.form.user_id || !this.form.property_id || !this.applicationId) return;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          params: {
            user_id: this.form.user_id,
            property_id: this.form.property_id,
            status: 'pending',
          },
        });
        if (response.status === 200 && response.data.data.length > 0) {
          const otherApplications = response.data.data.filter((app: any) => Number(app.id) !== this.applicationId);
          if (otherApplications.length > 0) {
            this.errors.user_id = 'A pending application already exists for this user and property.';
            Swal.fire({
              title: 'Warning!',
              text: 'A pending application already exists for this user and property.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          } else {
            this.errors.user_id = '';
          }
        } else {
          this.errors.user_id = '';
        }
      } catch (error: any) {
        console.error('checkExistingApplication error:', error.message, error.response?.data);
      }
    },
    async submitForm() {
      if (!this.applicationId) {
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
      if (!this.form.user_id || isNaN(this.form.user_id) || !this.users.some(user => user.value === this.form.user_id)) {
        this.errors.user_id = 'Please select a valid user';
      }
      if (!this.form.status) this.errors.status = 'Status is required';
      if (!['pending', 'approved', 'rejected'].includes(this.form.status)) {
        this.errors.status = 'Invalid status selected';
      }
      if (!this.form.employment_status) this.errors.employment_status = 'Employment status is required';
      if (!this.form.nida_number) {
        this.errors.nida_number = 'NIDA number is required';
      } else if (!/^\d{20}$/.test(this.form.nida_number)) {
        this.errors.nida_number = 'NIDA number must be exactly 20 digits';
      }
      if (this.form.employment_status === 'student' && !this.form.student_registration_number) {
        this.errors.student_registration_number = 'Student registration number is required for students';
      }
      if (this.form.annual_income === null || this.form.annual_income < 0) {
        this.errors.annual_income = 'Annual income must be a non-negative number';
      }

      if (Object.values(this.errors).some((error) => error)) {
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
          annual_income: Number(this.form.annual_income),
          background_check_status: this.form.background_check_status || null,
          credit_report_status: this.form.credit_report_status || null,
        };

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${this.applicationId}`,
          method: 'put',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          data: payload,
        });

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
            this.errors.user_id = errorMessage;
            Swal.fire({
              title: 'Error!',
              text: errorMessage,
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