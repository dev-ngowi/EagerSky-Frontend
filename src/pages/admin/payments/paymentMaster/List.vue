<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">All Payments</h2>
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by transaction ID or property..."
          class="w-64"
          :disabled="loadingPayments"
          @input="debouncedSearch"
        />
        <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch">Clear Search</VaButton>
      </div>
      <div class="flex items-center space-x-4">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-32"
          @update:modelValue="handlePerPageChange"
        />
      </div>
    </div>
    <div v-if="!payments || (payments.length === 0 && !loadingPayments)" class="text-center py-4">
      No payments found.
    </div>
    <VaDataTable
      v-else-if="payments && payments.length > 0"
      :key="componentKey"
      :items="payments"
      striped
      :columns="columns"
      :loading="loadingPayments"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(amount)="{ rowData }">
        {{ rowData.currency }} {{ rowData.amount }}
      </template>
      <template #cell(status)="{ rowData }">
        <VaSelect
          v-model="rowData.status"
          :options="statusOptions"
          :disabled="updatingStatus && updatingId === rowData.payment_id"
          @update:modelValue="updateStatus(rowData, $event)"
          class="w-32"
        />
      </template>
      <template #cell(payment_method)="{ rowData }">
        {{ rowData.paymentMethod?.method_name || 'N/A' }}
      </template>
      <template #cell(property)="{ rowData }">
        {{ rowData.propertyPayments[0]?.property?.title || 'N/A' }}
      </template>
      <template #cell(actions)="{ rowData }">
        <VaButton size="small" color="primary" icon="visibility" @click="openPreview(rowData)" />
      </template>
    </VaDataTable>
    <div v-if="payments && payments.length > 0" class="flex justify-between items-center mt-4">
      <div>
        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} payments
      </div>
      <div class="flex space-x-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1"
          @click="handlePageChange(pagination.current_page - 1)"
        >
          Previous
        </VaButton>
        <VaButton
          v-for="page in paginationPages"
          :key="page"
          size="small"
          :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </VaButton>
        <VaButton
          size="small"
          :disabled="pagination.current_page === pagination.last_page"
          @click="handlePageChange(pagination.current_page + 1)"
        >
          Next
        </VaButton>
      </div>
    </div>
    <VaModal v-model="showPreview" size="large" layout="centered" close-button hide-default-actions class="p-4">
      <div v-if="selectedPayment" class="space-y-4">
        <h2 class="text-lg font-bold">Payment Details</h2>
        <div class="border p-4 rounded bg-gray-50">
          <p><strong>Amount:</strong> {{ selectedPayment.currency }} {{ selectedPayment.amount }}</p>
          <p><strong>Date:</strong> {{ selectedPayment.date || 'N/A' }}</p>
          <p><strong>Status:</strong> {{ selectedPayment.status || 'N/A' }}</p>
          <p><strong>Transaction ID:</strong> {{ selectedPayment.transaction_id || 'N/A' }}</p>
          <p><strong>Payment Method:</strong> {{ selectedPayment.paymentMethod?.method_name || 'N/A' }}</p>
          <p><strong>Payment Type:</strong> {{ selectedPayment.paymentType?.name || 'N/A' }}</p>
          <p><strong>User:</strong> {{ selectedPayment.userPayments[0]?.user?.username || 'N/A' }}</p>
          <p><strong>Property:</strong> {{ selectedPayment.propertyPayments[0]?.property?.title || 'N/A' }}</p>
          <p><strong>Lease ID:</strong> {{ selectedPayment.propertyPayments[0]?.lease_id || 'N/A' }}</p>
          <div class="mt-4">
            <h3 class="font-bold">Billing Address</h3>
            <p><strong>Street:</strong> {{ selectedPayment.billingAddress?.street || 'N/A' }}</p>
            <p><strong>City:</strong> {{ selectedPayment.billingAddress?.city || 'N/A' }}</p>
            <p><strong>Country:</strong> {{ selectedPayment.billingAddress?.country || 'N/A' }}</p>
            <p><strong>Postal Code:</strong> {{ selectedPayment.billingAddress?.postal_code || 'N/A' }}</p>
          </div>
          <div v-if="selectedPayment.creditCardPayment" class="mt-4">
            <h3 class="font-bold">Credit Card Details</h3>
            <p><strong>Last 4 Digits:</strong> {{ selectedPayment.creditCardPayment.last_4_digits || 'N/A' }}</p>
            <p><strong>Brand:</strong> {{ selectedPayment.creditCardPayment.brand || 'N/A' }}</p>
            <p><strong>Expiration:</strong> {{ selectedPayment.creditCardPayment.expiration_date || 'N/A' }}</p>
          </div>
          <div v-else-if="selectedPayment.paypalPayment" class="mt-4">
            <h3 class="font-bold">PayPal Details</h3>
            <p><strong>Email:</strong> {{ selectedPayment.paypalPayment.paypal_email || 'N/A' }}</p>
          </div>
          <div v-else-if="selectedPayment.bankTransferPayment" class="mt-4">
            <h3 class="font-bold">Bank Transfer Details</h3>
            <p><strong>Bank Name:</strong> {{ selectedPayment.bankTransferPayment.bank_name || 'N/A' }}</p>
          </div>
          <div v-else-if="selectedPayment.mobilePayment" class="mt-4">
            <h3 class="font-bold">Mobile Payment Details</h3>
            <p><strong>Phone Number:</strong> {{ selectedPayment.mobilePayment.phone_number || 'N/A' }}</p>
          </div>
        </div>
        <div class="flex justify-end space-x-2">
          <VaButton color="secondary" @click="showPreview = false">Close</VaButton>
        </div>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid } from 'date-fns';
import makeRequest from '../../../../services/makeRequest';

interface Payment {
  payment_id: number;
  amount: string;
  currency: string;
  date: string;
  status: string;
  transaction_id: string;
  payment_method_id: number;
  payment_type_id: number;
  billing_address_id: number;
  paymentMethod?: { method_name: string };
  paymentType?: { name: string };
  billingAddress?: { street: string; city: string; country: string; postal_code: string };
  userPayments: Array<{ user: { username: string } }>;
  propertyPayments: Array<{ property: { title: string }; lease_id: number }>;
  creditCardPayment?: { last_4_digits: string; brand: string; expiration_date: string };
  paypalPayment?: { paypal_email: string };
  bankTransferPayment?: { bank_name: string };
  mobilePayment?: { phone_number: string };
}

export default defineComponent({
  name: 'Payments',
  props: {
    userId: {
      type: Number,
      default: null,
    },
    leaseId: {
      type: Number,
      default: null,
    },
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'amount', sortable: true, label: 'Amount' },
        { key: 'date', sortable: true, label: 'Date' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'transaction_id', sortable: true, label: 'Transaction ID' },
        { key: 'payment_method', sortable: true, label: 'Payment Method' },
        { key: 'property', sortable: true, label: 'Property' },
        { key: 'actions', sortable: false, label: 'Actions' },
      ],
      payments: [] as Payment[],
      pagination: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
      },
      loadingPayments: false,
      showPreview: false,
      selectedPayment: null as Payment | null,
      updatingStatus: false,
      updatingId: null as number | null,
      searchQuery: '' as string,
      componentKey: 0,
      statusOptions: ['pending', 'completed', 'received', 'failed', 'refunded'],
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ],
      debouncedSearch: debounce(
        function (this: any) {
          return this.handleSearch();
        },
        500
      ) as () => void,
    };
  },
  computed: {
    paginationPages() {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page;
      const range = 2;
      let start = Math.max(1, current - range);
      let end = Math.min(lastPage, current + range);

      if (end - start < 2 * range) {
        if (start === 1) {
          end = Math.min(lastPage, start + 2 * range);
        } else if (end === lastPage) {
          start = Math.max(1, end - 2 * range);
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },
  },
  async mounted() {
    console.log('Payments mounted, fetching payments for user_id:', this.userId, 'lease_id:', this.leaseId);
    await this.getPayments();
  },
  methods: {
    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) {
        console.warn(`${context}: Date string is null or undefined`);
        return 'N/A';
      }
      try {
        let parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        parsed = new Date(dateStr);
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        console.warn(`${context}: Invalid date format for "${dateStr}"`);
        return 'N/A';
      } catch (error) {
        console.error(`${context}: Error parsing date "${dateStr}"`, error);
        return 'N/A';
      }
    },
    async getPayments(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingPayments = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
          search: params.search || this.searchQuery,
        };

        if (this.userId) {
          requestParams.user_id = this.userId;
        }
        if (this.leaseId) {
          requestParams.lease_id = this.leaseId;
        }

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payments`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });
        console.log('getPayments response:', response);
        if (response.status === 200) {
          this.payments = response.data.data.map((payment: any, index: number) => {
            const context = `Payment ${payment.payment_id || index}`;
            return {
              payment_id: payment.payment_id,
              amount: payment.amount,
              currency: payment.currency,
              date: this.parseDate(payment.date, `${context} date`),
              status: payment.status,
              transaction_id: payment.transaction_id,
              payment_method_id: payment.payment_method_id,
              payment_type_id: payment.payment_type_id,
              billing_address_id: payment.billing_address_id,
              paymentMethod: payment.payment_method,
              paymentType: payment.payment_type,
              billingAddress: payment.billing_address,
              userPayments: payment.user_payments,
              propertyPayments: payment.property_payments,
              creditCardPayment: payment.credit_card_payment,
              paypalPayment: payment.paypal_payment,
              bankTransferPayment: payment.bank_transfer_payment,
              mobilePayment: payment.mobile_payment,
            };
          });
          this.pagination = {
            total: response.data.total || response.data.data.length,
            per_page: response.data.per_page || params.per_page || 15,
            current_page: response.data.current_page || params.page || 1,
            last_page: response.data.last_page || 1,
            from: response.data.from || (response.data.data.length > 0 ? (response.data.current_page - 1) * response.data.per_page + 1 : 0),
            to: response.data.to || Math.min(response.data.current_page * response.data.per_page, response.data.total),
          };
          this.searchQuery = params.search || this.searchQuery;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No payments found.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch payments.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getPayments error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch payments.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingPayments = false;
      }
    },
    async handleSearch() {
      console.log('Searching with query:', this.searchQuery);
      await this.getPayments({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    clearSearch() {
      this.searchQuery = '';
      this.getPayments({ page: 1, per_page: this.pagination.per_page });
      this.componentKey += 1;
    },
    async handlePageChange(page: number) {
      console.log('Changing page to:', page);
      await this.getPayments({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    async handlePerPageChange(perPage: number) {
      console.log('Changing per page to:', perPage);
      this.pagination.per_page = perPage;
      await this.getPayments({ page: 1, per_page: perPage, search: this.searchQuery });
      this.componentKey += 1;
    },
    async updateStatus(payment: Payment, newStatus: string) {
      console.log('Updating status for payment:', payment.payment_id, 'to:', newStatus);
      this.updatingStatus = true;
      this.updatingId = payment.payment_id;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/payments/${payment.payment_id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: {
            status: newStatus,
          },
        });
        if (response.status === 200) {
          payment.status = newStatus;
          Swal.fire({
            title: 'Success!',
            text: 'Payment status updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to update payment status.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Update status error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to update payment status.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.updatingStatus = false;
        this.updatingId = null;
      }
    },
    async openPreview(payment: Payment) {
      console.log('Opening preview for payment:', JSON.stringify(payment, null, 2));
      this.selectedPayment = payment;
      this.showPreview = true;
    },
  },
});
</script>

<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}

.flex {
  display: flex;
  flex-wrap: wrap;
}

.justify-between {
  justify-content: space-between;
}

.items-center {
  align-items: center;
}

.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}

.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}

.w-32 {
  width: 8rem;
}

.w-64 {
  width: 16rem;
}

.border {
  border: 1px solid #e5e7eb;
}

.rounded {
  border-radius: 0.5rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

/* Data Table Specific Styling */
:deep(.va-data-table) {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(.va-data-table__table) {
  min-width: 100%;
  table-layout: auto;
}

:deep(.va-data-table__table-th) {
  white-space: nowrap;
  font-size: 0.875rem;
  padding: 0.75rem;
}

:deep(.va-data-table__table-td) {
  font-size: 0.875rem;
  padding: 0.75rem;
  white-space: nowrap;
}

/* Modal Styling */
:deep(.va-modal__inner) {
  width: 100%;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

/* Media Queries for Responsive Design */
@media (max-width: 768px) {
  .card {
    padding: 1rem;
  }
  
  .w-64 {
    width: 100%;
    max-width: 100%;
  }
  
  .w-32 {
    width: 100%;
    max-width: 6rem;
  }
  
  .flex {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .justify-between {
    justify-content: flex-start;
  }
  
  .space-x-4 > :not(:last-child) {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  .space-x-2 > :not(:last-child) {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  :deep(.va-data-table__table-th),
  :deep(.va-data-table__table-td) {
    font-size: 0.8125rem;
    padding: 0.5rem;
  }
  
  :deep(.va-modal__inner) {
    max-width: 95vw;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 0.5rem;
  }
  
  :deep(.va-data-table__table-th),
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.4rem;
  }
  
  :deep(.va-button) {
    font-size: 0.75rem;
    padding: 19rem 0.5rem;
  }
  
  :deep(.va-select) {
    font-size: 0.75rem;
  }
  
  :deep(.va-input) {
    font-size: 0.75rem;
  }
  
  :deep(.va-modal__inner) {
    max-width: 98vw;
    padding: 0.5rem;
  }
}
</style>