<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Contractor', 'Add New Contractor') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter contractor name"
            :error-messages="errors.name ? [errors.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.contact"
            label="Contact"
            placeholder="Enter contact details"
            :error-messages="errors.contact ? [errors.contact] : []"
            :disabled="isSubmitting"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.specialty"
            label="Specialty"
            placeholder="Select specialty"
            :options="specialtyOptions"
            :error-messages="errors.specialty ? [errors.specialty] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.is_certified"
            label="Certified"
            placeholder="Select certification status"
            :options="certifiedOptions"
            :error-messages="errors.is_certified ? [errors.is_certified] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
            @update:modelValue="handleCertifiedChange"
          />
        </div>

        <!-- Certificate File Input (Conditional) -->
        <div v-if="form.is_certified" class="mb-4 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Certificate File (PDF, max 10MB)</label>
          <input
            type="file"
            accept="application/pdf"
            :disabled="isSubmitting"
            class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            @change="handleFileChange"
            required
          />
          <p v-if="errors.certificate_file" class="text-red-500 text-sm mt-1">{{ errors.certificate_file }}</p>

          <div v-if="filePreview" class="mt-2">
            <p class="text-sm text-gray-600">Preview:</p>
            <a :href="filePreview" target="_blank" class="text-blue-600 hover:underline">
              View PDF
            </a>
            <button
              v-if="form.certificate_file"
              type="button"
              class="ml-2 text-red-600 hover:underline text-sm"
              @click="clearFile"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.license_number"
            label="License Number"
            placeholder="Enter license number"
            :error-messages="errors.license_number ? [errors.license_number] : []"
            :disabled="isSubmitting"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.contract_time_limit"
            type="date"
            label="Contract Time Limit"
            :error-messages="errors.contract_time_limit ? [errors.contract_time_limit] : []"
            :disabled="isSubmitting"
          />
        </div>

        <div class="mb-4">
          <VaSelect
            v-model="form.construction_status"
            label="Construction Status"
            placeholder="Select construction status"
            :options="constructionStatusOptions"
            :error-messages="errors.construction_status ? [errors.construction_status] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model.number="form.years_experience"
            type="number"
            label="Years of Experience"
            placeholder="Enter years of experience"
            :error-messages="errors.years_experience ? [errors.years_experience] : []"
            :disabled="isSubmitting"
            min="0"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner inline-block mr-2"></div>
          <span>{{ isSubmitting ? 'Submitting...' : 'Submit' }}</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
import { ContractorFormData, Errors } from '../../../../types/contractor';
import Swal from 'sweetalert2';
import { isValid, parseISO } from 'date-fns';

export default defineComponent({
  name: 'ContractorForm',
  emits: ['submit', 'close'],
  setup() {
    const form = reactive<ContractorFormData>({
      name: '',
      contact: '',
      specialty: '',
      is_certified: null,
      certificate_file: null,
      certificate_path: '',
      license_number: '',
      contract_time_limit: '',
      construction_status: '',
      years_experience: null,
    });

    const errors = reactive<Errors>({
      name: '',
      contact: '',
      specialty: '',
      is_certified: '',
      certificate_file: '',
      license_number: '',
      contract_time_limit: '',
      construction_status: '',
      years_experience: '',
    });

    const filePreview = ref<string>('');
    const isPdf = ref<boolean>(false);
    const isSubmitting = ref<boolean>(false);

    const specialtyOptions = [
      { value: 'electrician', text: 'Electrician' },
      { value: 'plumber', text: 'Plumber' },
      { value: 'carpenter', text: 'Carpenter' },
      { value: 'general', text: 'General' },
    ];

    const certifiedOptions = [
      { value: true, text: 'Yes' },
      { value: false, text: 'No' },
    ];

    const constructionStatusOptions = [
      { value: 'active', text: 'Active' },
      { value: 'inactive', text: 'Inactive' },
      { value: 'pending', text: 'Pending' },
      { value: 'suspended', text: 'Suspended' },
    ];

    return {
      form,
      errors,
      filePreview,
      isPdf,
      specialtyOptions,
      certifiedOptions,
      constructionStatusOptions,
      isSubmitting,
    };
  },
  beforeUnmount() {
    if (this.filePreview) {
      URL.revokeObjectURL(this.filePreview);
    }
  },
  methods: {
    handleCertifiedChange(value: boolean | null) {
      if (value === false) {
        this.clearFile();
        this.errors.certificate_file = '';
      }
    },
    handleFileChange(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        this.form.certificate_file = file;
        this.isPdf = file.type === 'application/pdf';
        if (this.isPdf) {
          this.filePreview = URL.createObjectURL(file);
          this.errors.certificate_file = '';
        } else {
          this.filePreview = '';
          this.form.certificate_file = null;
          this.errors.certificate_file = 'File must be a PDF';
        }
      } else {
        this.clearFile();
      }
    },
    clearFile() {
      this.form.certificate_file = null;
      this.filePreview = '';
      this.isPdf = false;
      this.errors.certificate_file = '';
    },
    async submitForm() {
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''));

      if (!this.form.name || this.form.name.length < 3) {
        this.errors.name = 'Name must be at least 3 characters';
      }
      if (this.form.is_certified === null) {
        this.errors.is_certified = 'Certification status is required';
      }
      if (this.form.is_certified && !this.form.certificate_file) {
        this.errors.certificate_file = 'Certificate file is required for certified contractors';
      }
      if (this.form.certificate_file) {
        const file = this.form.certificate_file;
        if (file.type !== 'application/pdf') {
          this.errors.certificate_file = 'File must be a PDF';
        } else if (file.size > 10 * 1024 * 1024) {
          this.errors.certificate_file = 'File must not exceed 10MB';
        }
      }
      if (this.form.years_experience !== null && this.form.years_experience < 0) {
        this.errors.years_experience = 'Experience must be 0 or more';
      }
      if (this.form.contract_time_limit && !isValid(parseISO(this.form.contract_time_limit))) {
        this.errors.contract_time_limit = 'Invalid date format';
      }

      if (Object.values(this.errors).some(Boolean)) return;

      this.isSubmitting = true;
      try {
        const formData = new FormData();
        Object.entries(this.form).forEach(([key, value]) => {
          if (value !== null && value !== '') {
            if (key === 'certificate_file' && value instanceof File) {
              formData.append(key, value);
            } else if (key === 'is_certified') {
              formData.append(key, value ? '1' : '0'); // Ensure boolean compatibility
            } else {
              formData.append(key, String(value));
            }
          }
        });
        this.$emit('submit', formData, 'add');
      } catch (error: any) {
        console.error('Submission error:', error);
        const message = error?.response?.data?.message || 'Failed to submit';
        Swal.fire({ title: 'Error', text: message, icon: 'error', toast: true, timer: 3000 });
      } finally {
        this.isSubmitting = false;
      }
    },
    resetForm() {
      Object.assign(this.form, {
        name: '',
        contact: '',
        specialty: '',
        is_certified: null,
        certificate_file: null,
        certificate_path: '',
        license_number: '',
        contract_time_limit: '',
        construction_status: '',
        years_experience: null,
      });
      this.clearFile();
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
.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 3px solid #fff;
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.text-sm {
  font-size: 0.875rem;
}
.text-gray-600 {
  color: #4b5563;
}
.text-red-500 {
  color: #ef4444;
}
.text-blue-600 {
  color: #2563eb;
}
</style>