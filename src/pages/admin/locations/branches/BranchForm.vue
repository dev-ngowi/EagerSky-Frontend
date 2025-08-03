<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Add New Branch') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter branch name"
            :error="!!errors.name"
            :error-messages="errors.name ? [errors.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.address"
            label="Address"
            placeholder="Enter branch address"
            :error="!!errors.address"
            :error-messages="errors.address ? [errors.address] : []"
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
import { defineComponent, reactive, ref } from 'vue'
import { FormData, Errors, Payload } from '../../../../types/branch'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'BranchForm',
  emits: ['submit', 'close'],
  setup() {
    const form = reactive<FormData>({
      name: '',
      address: '',
    })

    const errors = reactive<Errors>({
      name: '',
      address: '',
    })

    const isSubmitting = ref<boolean>(false)

    return {
      form,
      errors,
      isSubmitting,
    }
  },
  methods: {
    async submitForm() {
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''))

      if (!this.form.name) this.errors.name = 'Name is required'
      if (!this.form.address) this.errors.address = 'Address is required'
      if (this.form.name && this.form.name.length > 255) this.errors.name = 'Name must not exceed 255 characters'

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          name: this.form.name,
          address: this.form.address,
        }

        this.$emit('submit', payload, 'add')
      } catch (error: unknown) {
        const err = error as any
        console.error('Submission error:', err.message)
        if (err.response?.data?.errors) {
          Object.assign(this.errors, err.response.data.errors)
        } else {
          this.errors.name = err.response?.data?.message || 'An unexpected error occurred'
        }
        Swal.fire({
          title: 'Error!',
          text: this.errors.name,
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
      Object.assign(this.form, {
        name: '',
        address: '',
      })
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''))
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