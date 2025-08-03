<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Transaction', 'Edit Transaction') }}</h2>
    <form v-if="transaction" @submit.prevent="submitForm">
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
            v-model="form.client_id"
            label="Client"
            placeholder="Select client"
            :options="clients"
            :error-messages="errors.client_id ? [errors.client_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingClients"
            :loading="loadingClients"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.buyer_id"
            label="Buyer (Optional)"
            placeholder="Select buyer"
            :options="buyersAndSellers"
            :error-messages="errors.buyer_id ? [errors.buyer_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingBuyersAndSellers"
            :loading="loadingBuyersAndSellers"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.seller_id"
            label="Seller (Optional)"
            placeholder="Select seller"
            :options="buyersAndSellers"
            :error-messages="errors.seller_id ? [errors.seller_id] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting || loadingBuyersAndSellers"
            :loading="loadingBuyersAndSellers"
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.type"
            label="Type"
            placeholder="Select transaction type"
            :options="typeOptions"
            :error-messages="errors.type ? [errors.type] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model.number="form.amount"
            type="number"
            label="Amount"
            placeholder="Enter amount"
            :error-messages="errors.amount ? [errors.amount] : []"
            :disabled="isSubmitting"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.transaction_date"
            type="date"
            label="Transaction Date"
            :error-messages="errors.transaction_date ? [errors.transaction_date] : []"
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
    <div v-else class="text-red-500">No transaction data available.</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, reactive } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';
import { format, parseISO, isValid } from 'date-fns';
import type { Transaction, FormData, Errors, Payload } from '../../../../types/transaction';

export default defineComponent({
  name: 'TransactionEdit',
  props: {
    transaction: {
      type: Object as PropType<Transaction | null>,
      required: false,
      default: null,
    },
  },
  emits: {
    close: null,
    submit: (payload: Payload, mode: 'edit') => true,
  },
  data() {
    return {
      form: reactive<FormData>({
        property_id: null,
        client_id: null,
        buyer_id: null,
        seller_id: null,
        type: '',
        amount: null,
        transaction_date: '',
      }),
      errors: reactive<Errors>({
        property_id: '',
        client_id: '',
        buyer_id: '',
        seller_id: '',
        type: '',
        amount: '',
        transaction_date: '',
        duplicate: '',
      }),
      typeOptions: [
        { value: 'rent', text: 'Rent' },
        { value: 'purchase', text: 'Purchase' },
        { value: 'utility', text: 'Utility' },
        { value: 'commission', text: 'Commission' },
      ],
      properties: ref<{ value: number; text: string }[]>([]),
      clients: ref<{ value: number; text: string }[]>([]),
      buyersAndSellers: ref<{ value: number; text: string }[]>([]),
      loadingProperties: ref<boolean>(false),
      loadingClients: ref<boolean>(false),
      loadingBuyersAndSellers: ref<boolean>(false),
      isSubmitting: ref<boolean>(false),
    };
  },
  mounted() {
    if (this.transaction) {
      this.initializeForm();
      this.loadDropdowns();
    }
  },
  methods: {
    initializeForm() {
      if (!this.transaction) return;
      // Initialize all form fields with transaction data
      this.form.property_id = this.transaction.property_id !== null ? Number(this.transaction.property_id) : null;
      this.form.client_id = this.transaction.client_id !== null ? Number(this.transaction.client_id) : null;
      this.form.buyer_id = this.transaction.buyer_id !== null ? Number(this.transaction.buyer_id) : null;
      this.form.seller_id = this.transaction.seller_id !== null ? Number(this.transaction.seller_id) : null;
      this.form.type = this.transaction.type || '';
      this.form.amount = this.transaction.amount !== null ? Number(this.transaction.amount) : null;

      // Handle transaction_date with validation
      let transactionDate = '';
      if (this.transaction.raw_transaction_date && this.transaction.raw_transaction_date !== 'N/A') {
        try {
          const parsedDate = parseISO(this.transaction.raw_transaction_date);
          if (isValid(parsedDate)) {
            transactionDate = format(parsedDate, 'yyyy-MM-dd');
          } else {
            console.warn('Invalid date format for raw_transaction_date:', this.transaction.raw_transaction_date);
            transactionDate = '';
          }
        } catch (e) {
          console.warn('Error parsing raw_transaction_date:', this.transaction.raw_transaction_date, e);
          transactionDate = '';
        }
      }
      this.form.transaction_date = transactionDate;
    },
    async loadDropdowns() {
      try {
        await Promise.all([
          this.fetchProperties(),
          this.fetchClients(),
          this.fetchBuyersAndSellers(),
        ]);
      } catch (error: any) {
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
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => ({
            value: property.id,
            text: property.title || `Property ${property.id}`,
          }));
          if (this.properties.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No properties found. Please add properties first.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch properties.');
        }
      } catch (error: any) {
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
    async fetchClients() {
      this.loadingClients = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });
        if (response.status === 200) {
          this.clients = response.data.data.map((client: any) => ({
            value: client.id,
            text: client.name || `Client ${client.id}`,
          }));
          if (this.clients.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No clients found. Please add clients first.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch clients.');
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch clients.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingClients = false;
      }
    },
    async fetchBuyersAndSellers() {
      this.loadingBuyersAndSellers = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
          params: {
            per_page: 1000,
            type: 'buyer,seller,tenant,student',
          },
        });
        if (response.status === 200) {
          this.buyersAndSellers = response.data.data
            .filter((client: any) =>
              ['buyer', 'seller', 'tenant', 'student'].includes(client.type?.toLowerCase())
            )
            .map((client: any) => ({
              value: client.id,
              text: client.name || `Client ${client.id}`,
            }));
          if (this.buyersAndSellers.length === 0) {
            Swal.fire({
              title: 'Warning!',
              text: 'No buyers or sellers found. Please add clients with type buyer, seller, tenant, or student.',
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch buyers and sellers.');
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch buyers and sellers.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingBuyersAndSellers = false;
      }
    },
    async submitForm() {
      if (this.isSubmitting || !this.transaction) return;
      this.isSubmitting = true;
      this.errors = {
        property_id: '',
        client_id: '',
        buyer_id: '',
        seller_id: '',
        type: '',
        amount: '',
        transaction_date: '',
        duplicate: '',
      };

      if (!this.form.property_id) this.errors.property_id = 'Property is required';
      if (!this.form.client_id) this.errors.client_id = 'Client is required';
      if (!this.form.type) this.errors.type = 'Transaction type is required';
      if (this.form.amount === null || this.form.amount < 0) this.errors.amount = 'Amount must be a non-negative number';
      if (!this.form.transaction_date) this.errors.transaction_date = 'Transaction date is required';

      if (Object.values(this.errors).some((error) => error)) {
        this.isSubmitting = false;
        return;
      }

      try {
        const payload: Payload = {
          property_id: this.form.property_id,
          client_id: this.form.client_id,
          buyer_id: this.form.buyer_id || null,
          seller_id: this.form.seller_id || null,
          type: this.form.type,
          amount: this.form.amount,
          transaction_date: this.form.transaction_date,
        };

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions/${this.transaction.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });

        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Transaction updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.$emit('submit', payload, 'edit');
          this.$emit('close');
        } else {
          throw new Error(response.data?.message || 'Failed to update transaction.');
        }
      } catch (error: any) {
        let errorMessage = error.response?.data?.message || 'Failed to update transaction.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          Object.assign(
            this.errors,
            Object.fromEntries(
              Object.entries(error.response.data.errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            ),
          );
          if (this.errors.duplicate) {
            Swal.fire({
              title: 'Duplicate Transaction',
              text: this.errors.duplicate,
              icon: 'warning',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 5000,
            });
          } else {
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
      this.errors = {
        property_id: '',
        client_id: '',
        buyer_id: '',
        seller_id: '',
        type: '',
        amount: '',
        transaction_date: '',
        duplicate: '',
      };
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
</style>