<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ formMode === 'add' ? 'Add New Category' : 'Edit Category' }}</h2>
    <form @submit.prevent="submitForm">
      <div class="mb-4">
        <VaInput
          v-model="form.name"
          label="Category Name"
          placeholder="Enter category name"
          :error-messages="errors.name ? [errors.name] : []"
          :disabled="isSubmitting"
          maxlength="255"
          required
        />
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton
          color="#00A3E0"
          :disabled="isSubmitting"
          @click="submitForm"
        >
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { FormData, Errors, Payload, Category } from '../../../../types/category'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'CategoryForm',
  props: {
    category: {
      type: Object as () => Category | null,
      default: null,
    },
    formMode: {
      type: String,
      default: 'add',
      validator: (value: string) => ['add', 'edit'].includes(value),
    },
  },
  emits: {
    close: null,
    submit: null,
  },
  data() {
    return {
      form: {
        name: this.category?.name || '',
      } as FormData,
      errors: {
        name: '',
      } as Errors,
      isSubmitting: false as boolean,
    }
  },
  methods: {
    async submitForm() {
      if (this.isSubmitting) {
        console.log('Submission blocked: Already submitting')
        return
      }
      this.errors = { name: '' }

      if (!this.form.name.trim()) {
        this.errors.name = 'Category name is required'
        console.log('Validation failed: Name is empty')
        return
      }
      if (this.form.name.length > 255) {
        this.errors.name = 'Category name must not exceed 255 characters'
        console.log('Validation failed: Name too long')
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = { name: this.form.name.trim() }
        const isEditMode = this.formMode === 'edit' && this.category?.id
        const apiUrl = isEditMode
          ? `/v1/property-categories/${this.category.id}`
          : '/v1/property-categories'

        console.log('Submitting request:', {
          url: `${import.meta.env.VITE_APP_API_BASE_URL}${apiUrl}`,
          payload,
          method: isEditMode ? 'PUT' : 'POST',
        })

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}${apiUrl}`,
          method: isEditMode ? 'put' : 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        })

        console.log('Submission response:', response)

        Swal.fire({
          title: 'Success!',
          text: `Category ${isEditMode ? 'updated' : 'added'} successfully.`,
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        this.$emit('submit', payload, this.formMode)
        this.resetForm()
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message)
        let errorMessage =
          error.response?.data?.message || `Failed to ${this.formMode === 'edit' ? 'update' : 'add'} category.`
        if (error.response?.status === 404) {
          errorMessage = 'API endpoint not found. Please check the server configuration or URL.'
        } else if (error.response?.status === 422 && error.response?.data?.errors) {
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
      this.form = { name: this.formMode === 'edit' && this.category ? this.category.name : '' }
      this.errors = { name: '' }
      this.$emit('close')
    },
  },
})
</script>

<style scoped>
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