<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Client') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter client name"
            :error-messages="errors.name ? [errors.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.email"
            type="email"
            label="Email"
            placeholder="Enter client email"
            :error-messages="errors.email ? [errors.email] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.phone"
            type="tel"
            label="Phone (Optional)"
            placeholder="Enter client phone"
            :error-messages="errors.phone ? [errors.phone] : []"
            :disabled="isSubmitting"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.type"
            label="Type"
            placeholder="Select client type"
            :options="typeOptions"
            :error-messages="errors.type ? [errors.type] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
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
import { defineComponent } from 'vue'
import { FormData, Errors, Payload } from '../../../../types/client'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'ClientForm',
  emits: {
    close: null,
  },
  data() {
    return {
      form: {
        name: '',
        email: '',
        phone: '',
        type: '',
      } as FormData,
      errors: {
        name: '',
        email: '',
        phone: '',
        type: '',
      } as Errors,
      typeOptions: [
        { value: 'tenant', text: 'Tenant' },
        { value: 'buyer', text: 'Buyer' },
        { value: 'seller', text: 'Seller' },
      ],
      isSubmitting: false as boolean,
    }
  },
  methods: {
    async submitForm() {
      this.errors = {
        name: '',
        email: '',
        phone: '',
        type: '',
      }

      if (!this.form.name) this.errors.name = 'Name is required'
      else if (this.form.name.length > 255) this.errors.name = 'Name must not exceed 255 characters'
      if (!this.form.email) this.errors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) this.errors.email = 'Invalid email format'
      if (this.form.phone && !/^[+\d\s\-()]{0,20}$/.test(this.form.phone)) this.errors.phone = 'Invalid phone format'
      if (this.form.phone && this.form.phone.length > 20) this.errors.phone = 'Phone must not exceed 20 characters'
      if (!this.form.type) this.errors.type = 'Type is required'

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          name: this.form.name,
          email: this.form.email,
          phone: this.form.phone || null,
          type: this.form.type,
        }

        await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })

        Swal.fire({
          title: 'Success!',
          text: 'Client added successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        this.$emit('close')
        this.resetForm()
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message)
        let errorMessage = error.response?.data?.message || 'Failed to add client.'
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(
            this.errors,
            Object.fromEntries(
              Object.entries(error.response.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            ),
          )
          errorMessage = Object.values(this.errors).filter(Boolean).join('; ')
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.isSubmitting = false
      }
    },
    resetForm() {
      this.form = {
        name: '',
        email: '',
        phone: '',
        type: '',
      }
      this.errors = {
        name: '',
        email: '',
        phone: '',
        type: '',
      }
      this.$emit('close')
    },
  },
})
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
