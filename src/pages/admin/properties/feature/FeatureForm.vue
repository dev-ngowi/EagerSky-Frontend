<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Add New Property Feature</h2>
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
            :loading="loadingProperties"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.feature_name"
            label="Feature Name"
            placeholder="Enter feature name"
            :error-messages="errors.feature_name ? [errors.feature_name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.value"
            label="Value"
            placeholder="Enter feature value"
            :error-messages="errors.value ? [errors.value] : []"
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
import { FormData, Errors, Payload } from '../../../../types/feature'
import makeRequest from '../../../../services/makeRequest'
import Swal from 'sweetalert2'

export default defineComponent({
  name: 'PropertyFeatureForm',
  emits: {
    close: null,
  },
  data() {
    return {
      form: {
        property_id: null as number | null,
        feature_name: '' as string,
        value: '' as string,
      } as FormData,
      errors: {
        property_id: '' as string,
        feature_name: '' as string,
        value: '' as string,
      } as Errors,
      properties: [] as { value: number; text: string }[],
      loadingProperties: false as boolean,
      isSubmitting: false as boolean,
    }
  },
  mounted() {
    this.fetchProperties()
  },
  methods: {
    async fetchProperties() {
      this.loadingProperties = true
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        })
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }))
        } else {
          this.errors.property_id = 'Failed to load properties'
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch properties.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } catch (error: any) {
        console.error('fetchProperties error:', error.message)
        this.errors.property_id = 'Failed to load properties'
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch properties.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        })
      } finally {
        this.loadingProperties = false
      }
    },
    async submitForm() {
      this.errors = {
        property_id: '',
        feature_name: '',
        value: '',
      }

      if (!this.form.property_id) this.errors.property_id = 'Property is required'
      if (!this.form.feature_name) this.errors.feature_name = 'Feature name is required'
      if (!this.form.value) this.errors.value = 'Value is required'
      if (this.form.feature_name && this.form.feature_name.length > 255)
        this.errors.feature_name = 'Feature name must not exceed 255 characters'
      if (this.form.value && this.form.value.length > 255) this.errors.value = 'Value must not exceed 255 characters'

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          property_id: this.form.property_id,
          feature_name: this.form.feature_name,
          value: this.form.value,
        }

        await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-features`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        })

        Swal.fire({
          title: 'Success!',
          text: 'Feature added successfully.',
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
        let errorMessage = error.response?.data?.message || 'Failed to add feature.'
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
        property_id: null,
        feature_name: '',
        value: '',
      }
      this.errors = {
        property_id: '',
        feature_name: '',
        value: '',
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
