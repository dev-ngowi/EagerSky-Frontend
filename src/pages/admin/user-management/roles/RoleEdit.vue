<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Role') }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Role Name"
            placeholder="Enter role name"
            :error="!!errors.name"
            :error-messages="errors.name ? [errors.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>

        <div class="mb-4">
          <VaInput
            v-model="form.description"
            label="Description"
            placeholder="Enter description (optional)"
            :error="!!errors.description"
            :error-messages="errors.description ? [errors.description] : []"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="$emit('close')">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { FormData, Errors, Payload } from '../../../../types/role'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

interface Role {
  id: number
  name: string
  description: string | 'N/A'
}

export default defineComponent({
  name: 'RoleEdit',
  props: {
    role: {
      type: Object as () => Role,
      required: true,
    },
  },
  emits: {
    close: null,
  },
  setup() {
    const isAdmin = computed(() => {
      return true // Mock admin status; replace with actual auth logic
    })

    return { isAdmin }
  },
  data() {
    return {
      form: {
        name: this.role.name as string,
        description: this.role.description !== 'N/A' ? this.role.description : '',
      } as FormData,
      errors: {
        name: '',
        description: '',
      } as Errors,
      isSubmitting: false,
    }
  },
  methods: {
    async submitForm() {
      // Reset errors
      this.errors = {
        name: '',
        description: '',
      }

      // Client-side validation
      if (!this.form.name) this.errors.name = 'Role name is required'

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          name: this.form.name,
          description: this.form.description || null,
        }

        await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles/${this.role.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })

        Swal.fire({
          title: 'Success!',
          text: 'Role updated successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        this.$emit('close')
      } catch (error: any) {
        console.error('Submission error:', error.message)
        if (error.response?.data?.errors) {
          Object.assign(this.errors, error.response.data.errors)
        } else {
          this.errors.name = error.response?.data?.message || 'An unexpected error occurred'
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