<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t(mode === 'add' ? 'Add New Energy Consumption Record' : 'Edit Energy Consumption Record') }}</h2>
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
          <VaInput
            v-model="form.consumption_date"
            type="date"
            label="Consumption Date"
            :error-messages="errors.consumption_date ? [errors.consumption_date] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.electricity_usage"
            type="number"
            label="Electricity Usage (kWh)"
            placeholder="Enter electricity usage"
            :error-messages="errors.electricity_usage ? [errors.electricity_usage] : []"
            :disabled="isSubmitting"
            min="0"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.gas_usage"
            type="number"
            label="Gas Usage (m³)"
            placeholder="Enter gas usage"
            :error-messages="errors.gas_usage ? [errors.gas_usage] : []"
            :disabled="isSubmitting"
            min="0"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.water_usage"
            type="number"
            label="Water Usage (m³)"
            placeholder="Enter water usage"
            :error-messages="errors.water_usage ? [errors.water_usage] : []"
            :disabled="isSubmitting"
            min="0"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.total_cost"
            type="number"
            label="Total Cost"
            placeholder="Enter total cost"
            :error-messages="errors.total_cost ? [errors.total_cost] : []"
            :disabled="isSubmitting"
            min="0"
            required
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
          <VaInput
            v-model="form.due_date"
            type="date"
            label="Due Date (Optional)"
            :error-messages="errors.due_date ? [errors.due_date] : []"
            :disabled="isSubmitting"
          />
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>{{ mode === 'add' ? 'Submit' : 'Update' }}</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useEnergyConsumptionStore } from '../../../../stores/energyConsumptionStore'
import Swal from 'sweetalert2'
import { FormData, Errors, Payload, EnergyConsumption } from '../../../../types/energyConsumption'

export default defineComponent({
  name: 'EnergyConsumptionForm',
  props: {
    energyConsumption: {
      type: Object as () => EnergyConsumption | null,
      default: null,
    },
    mode: {
      type: String as () => 'add' | 'edit',
      default: 'add',
    },
  },
  emits: {
    close: null,
    submit: null,
  },
  data() {
    // Function to convert "DD MMMM YYYY" or other formats to "YYYY-MM-DD"
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return ''
        return date.toISOString().split('T')[0] // Returns YYYY-MM-DD
      } catch {
        console.warn(`Failed to parse date: ${dateStr}`)
        return ''
      }
    }

    return {
      form: {
        property_id: this.energyConsumption ? Number(this.energyConsumption.property_id) : null,
        consumption_date: this.energyConsumption ? formatDate(this.energyConsumption.consumption_date) : '',
        electricity_usage: this.energyConsumption ? Number(this.energyConsumption.electricity_usage) : null,
        gas_usage: this.energyConsumption ? Number(this.energyConsumption.gas_usage) : null,
        water_usage: this.energyConsumption ? Number(this.energyConsumption.water_usage) : null,
        total_cost: this.energyConsumption ? Number(this.energyConsumption.total_cost) : null,
        status: this.energyConsumption ? this.energyConsumption.status : '',
        due_date: this.energyConsumption ? formatDate(this.energyConsumption.due_date) : '',
      } as FormData,
      errors: {
        property_id: '' as string,
        consumption_date: '' as string,
        electricity_usage: '' as string,
        gas_usage: '' as string,
        water_usage: '' as string,
        total_cost: '' as string,
        status: '' as string,
        due_date: '' as string,
      } as Errors,
      statusOptions: [
        { value: 'pending', text: 'Pending' },
        { value: 'paid', text: 'Paid' },
        { value: 'overdue', text: 'Overdue' },
      ],
      isSubmitting: false as boolean,
    }
  },
  computed: {
    ...mapState(useEnergyConsumptionStore, ['properties', 'loadingProperties']),
  },
  async mounted() {
    const energyConsumptionStore = useEnergyConsumptionStore()
    await energyConsumptionStore.getProperties()
    console.log('Form mounted, mode:', this.mode, 'Initial form state:', JSON.stringify(this.form, null, 2))
  },
  methods: {
    async submitForm() {
      // Reset errors
      this.errors = {
        property_id: '',
        consumption_date: '',
        electricity_usage: '',
        gas_usage: '',
        water_usage: '',
        total_cost: '',
        status: '',
        due_date: '',
      }

      // Client-side validation
      if (!this.form.property_id) this.errors.property_id = 'Property is required'
      if (!this.form.consumption_date) this.errors.consumption_date = 'Consumption date is required'
      else if (new Date(this.form.consumption_date) < new Date(new Date().setHours(0, 0, 0, 0)))
        this.errors.consumption_date = 'Consumption date must be today or later'
      if (this.form.electricity_usage === null || this.form.electricity_usage < 0)
        this.errors.electricity_usage = 'Electricity usage must be a non-negative number'
      if (this.form.gas_usage === null || this.form.gas_usage < 0)
        this.errors.gas_usage = 'Gas usage must be a non-negative number'
      if (this.form.water_usage === null || this.form.water_usage < 0)
        this.errors.water_usage = 'Water usage must be a non-negative number'
      if (this.form.total_cost === null || this.form.total_cost < 0)
        this.errors.total_cost = 'Total cost must be a non-negative number'
      if (!this.form.status) this.errors.status = 'Status is required'
      if (this.form.due_date && new Date(this.form.due_date) <= new Date(this.form.consumption_date)) {
        this.errors.due_date = 'Due date must be after consumption date'
      }

      // Check for validation errors and display SweetAlert2 toast
      const validationErrors = Object.values(this.errors).filter(Boolean)
      if (validationErrors.length > 0) {
        console.log('Validation errors:', this.errors)
        Swal.fire({
          title: 'Validation Error',
          text: validationErrors.join('; '),
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        })
        return
      }

      this.isSubmitting = true
      try {
        const payload: Payload = {
          property_id: this.form.property_id,
          consumption_date: this.form.consumption_date,
          electricity_usage: this.form.electricity_usage,
          gas_usage: this.form.gas_usage,
          water_usage: this.form.water_usage,
          total_cost: this.form.total_cost,
          status: this.form.status,
          due_date: this.form.due_date || null,
        }
        console.log('Submitting payload:', payload, 'Mode:', this.mode)
        this.$emit('submit', payload, this.mode)
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message)
        let errorMessage = error.response?.data?.message || `Failed to ${this.mode === 'add' ? 'add' : 'update'} energy consumption record.`
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
          Swal.fire({
            title: 'Validation Error',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 5000,
          })
        } else {
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          })
        }
      } finally {
        this.isSubmitting = false
      }
    },
    resetForm() {
      console.log('Resetting form, mode:', this.mode, 'energyConsumption:', this.energyConsumption)
      const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return ''
          return date.toISOString().split('T')[0]
        } catch {
          console.warn(`Failed to parse date: ${dateStr}`)
          return ''
        }
      }
      this.form = {
        property_id: this.energyConsumption ? Number(this.energyConsumption.property_id) : null,
        consumption_date: this.energyConsumption ? formatDate(this.energyConsumption.consumption_date) : '',
        electricity_usage: this.energyConsumption ? Number(this.energyConsumption.electricity_usage) : null,
        gas_usage: this.energyConsumption ? Number(this.energyConsumption.gas_usage) : null,
        water_usage: this.energyConsumption ? Number(this.energyConsumption.water_usage) : null,
        total_cost: this.energyConsumption ? Number(this.energyConsumption.total_cost) : null,
        status: this.energyConsumption ? this.energyConsumption.status : '',
        due_date: this.energyConsumption ? formatDate(this.energyConsumption.due_date) : '',
      }
      this.errors = {
        property_id: '',
        consumption_date: '',
        electricity_usage: '',
        gas_usage: '',
        water_usage: '',
        total_cost: '',
        status: '',
        due_date: '',
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