<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <h2 class="text-lg font-bold mb-4">Edit Template</h2>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Name</label>
        <VaInput
          v-model="form.name"
          placeholder="Enter template name"
          class="mt-1"
          :error="!!errors.name"
          :error-messages="errors.name ? [errors.name] : []"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Content</label>
        <VaTextarea
          v-model="form.content"
          placeholder="Enter template content"
          class="mt-1"
          rows="5"
          :error="!!errors.content"
          :error-messages="errors.content ? [errors.content] : []"
        />
      </div>
      <div class="flex justify-end space-x-2">
        <VaButton color="secondary" @click="resetForm">Cancel</VaButton>
        <VaButton color="primary" :disabled="submitting" @click="handleSubmit">
          <div v-if="submitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'
import { mapActions } from 'pinia'
import { useTemplateStore } from '../../../../stores/templateStore'
import Swal from 'sweetalert2'
import { FormData, Errors, Payload, Template } from '../../../../types/template'

export default defineComponent({
  name: 'TemplateEdit',
  props: {
    template: {
      type: Object as () => Template,
      required: true,
    },
  },
  emits: ['submit', 'close'],
  setup(props) {
    const form = reactive<FormData>({
      id: props.template.id,
      name: props.template.name,
      content: props.template.content,
    })

    const errors = reactive<Errors>({
      name: '',
      content: '',
    })

    const submitting = ref<boolean>(false)

    return {
      form,
      errors,
      submitting,
    }
  },
  methods: {
    ...mapActions(useTemplateStore, ['updateTemplate']),
    async handleSubmit() {
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''))

      if (!this.form.name) this.errors.name = 'Name is required'
      if (!this.form.content) this.errors.content = 'Content is required'
      if (Object.values(this.errors).some((error) => error)) return

      this.submitting = true
      try {
        const payload: Payload = {
          id: this.form.id,
          name: this.form.name,
          content: this.form.content,
        }
        await this.updateTemplate(payload, this.form.id!)
        Swal.fire({
          title: 'Success!',
          text: 'Template updated successfully.',
          icon: 'success',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
        this.resetForm()
      } catch (error: unknown) {
        const err = error as any
        console.error('Submission error:', err.response?.data || err.message)
        let errorMessage = err.response?.data?.message || 'Failed to update template.'
        if (err.response?.status === 422 && err.response?.data?.errors) {
          Object.assign(
            this.errors,
            Object.fromEntries(
              Object.entries(err.response.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            ),
          )
          errorMessage = Object.values(this.errors).filter(Boolean).join('; ')
        } else if (err.response?.status === 404) {
          errorMessage = 'Template not found. It may have been deleted.'
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
        this.submitting = false
      }
    },
    resetForm() {
      Object.assign(this.form, {
        id: this.template.id,
        name: this.template.name,
        content: this.template.content,
      })
      Object.keys(this.errors).forEach((key) => (this.errors[key as keyof Errors] = ''))
      this.$emit('close')
    },
  },
})
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-6 {
  padding: 1.5rem;
}
.space-y-4 > :not(:last-child) {
  margin-bottom: 1rem;
}
.text-sm {
  font-size: 0.875rem;
}
.font-medium {
  font-weight: 500;
}
.text-gray-700 {
  color: #4b5563;
}
.mt-1 {
  margin-top: 0.25rem;
}
.w-full {
  width: 100%;
}
.flex {
  display: flex;
}
.justify-end {
  justify-content: flex-end;
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