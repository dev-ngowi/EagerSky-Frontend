<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, client, buyer, seller, or type"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
      <div class="flex space-x-2">
        <VaButton v-if="addEditForm" icon="close" color="success" size="small" class="px-4" @click="cancelAdding">
          Done
        </VaButton>
        <VaButton
          v-if="!addEditForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          @click="openForm(null, 'add')"
        >
          Add Transaction
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="transactions"
        striped
        :columns="columns"
        :loading="loadingTransactions"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(transaction_date)="{ rowData }">
          {{ rowData.transaction_date_formatted || 'N/A' }}
        </template>
        <template #cell(created_at)="{ rowData }">
          {{ rowData.created_at_formatted || 'N/A' }}
        </template>
        <template #cell(updated_at)="{ rowData }">
          {{ rowData.updated_at_formatted || 'N/A' }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm(rowData, 'edit')" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} transactions
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
            size="small"
            :disabled="pagination.current_page === pagination.last_page"
            @click="handlePageChange(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <TransactionForm v-if="formMode === 'add'" @close="closeForm" @submit="handleSubmit" />
      <TransactionEdit
        v-if="formMode === 'edit'"
        :transaction="selectedTransaction"
        @close="closeForm"
        @submit="handleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Transaction Details', 'Transaction Details') }}</div>
      <div v-if="selectedTransaction" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedTransaction.property_title }}</p>
        <p><strong>Client:</strong> {{ selectedTransaction.client_name }}</p>
        <p><strong>Buyer:</strong> {{ selectedTransaction.buyer_fullname }}</p>
        <p><strong>Seller:</strong> {{ selectedTransaction.seller_fullname }}</p>
        <p><strong>Type:</strong> {{ selectedTransaction.type }}</p>
        <p><strong>Amount:</strong> {{ selectedTransaction.amount }}</p>
        <p><strong>Transaction Date:</strong> {{ selectedTransaction.transaction_date_formatted || 'N/A' }}</p>
        <p><strong>Created At:</strong> {{ selectedTransaction.created_at_formatted || 'N/A' }}</p>
        <p><strong>Updated At:</strong> {{ selectedTransaction.updated_at_formatted || 'N/A' }}</p>
        <p v-if="selectedTransaction.deleted_at"><strong>Deleted At:</strong> {{ selectedTransaction.deleted_at_formatted || 'N/A' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import makeRequest from '../../../../services/makeRequest';
import TransactionForm from './TransactionForm.vue';
import TransactionEdit from './TransactionEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parseISO, isValid } from 'date-fns';
import type { Transaction, FormData, Errors, Payload } from '../../../../types/transaction';

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from?: number;
  to?: number;
}

export default defineComponent({
  name: 'TransactionList',
  components: {
    TransactionForm,
    TransactionEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'client_name', sortable: true, label: 'Client' },
        { key: 'buyer_fullname', sortable: true, label: 'Buyer' },
        { key: 'seller_fullname', sortable: true, label: 'Seller' },
        { key: 'type', sortable: true, label: 'Type' },
        { key: 'amount', sortable: true, label: 'Amount' },
        { key: 'transaction_date', sortable: true, label: 'Transaction Date' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      transactions: [] as Transaction[],
      loadingTransactions: false,
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as Pagination,
      addEditForm: false,
      showView: false,
      selectedTransaction: null as Transaction | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedSearch: null as any,
    };
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.fetchTransactions();
  },
  methods: {
    async fetchTransactions(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingTransactions = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || this.pagination.current_page,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || this.searchQuery,
          },
        });
        if (response.status === 200) {
          this.transactions = response.data.data.map((transaction: any) => ({
            id: transaction.id,
            property_id: transaction.property_id || null,
            property_title: transaction.property_title || 'N/A',
            client_id: transaction.client_id || null,
            client_name: transaction.client_name || 'Restricted',
            buyer_id: transaction.buyer_id || null,
            buyer_fullname: transaction.buyer_fullname || 'N/A',
            seller_id: transaction.seller_id || null,
            seller_fullname: transaction.seller_fullname || 'N/A',
            type: transaction.type || 'N/A',
            amount: transaction.amount !== null ? Number(transaction.amount) : null,
            raw_transaction_date: transaction.transaction_date || null,
            transaction_date_formatted: transaction.transaction_date
              ? isValid(parseISO(transaction.transaction_date))
                ? format(parseISO(transaction.transaction_date), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            created_at_formatted: transaction.created_at
              ? isValid(parseISO(transaction.created_at))
                ? format(parseISO(transaction.created_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            updated_at_formatted: transaction.updated_at
              ? isValid(parseISO(transaction.updated_at))
                ? format(parseISO(transaction.updated_at), 'd MMMM yyyy')
                : 'N/A'
              : 'N/A',
            deleted_at: transaction.deleted_at || null,
            deleted_at_formatted: transaction.deleted_at
              ? isValid(parseISO(transaction.deleted_at))
                ? format(parseISO(transaction.deleted_at), 'd MMMM yyyy')
                : 'N/A'
              : null,
          }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
            from: response.data.pagination?.from || 1,
            to: response.data.pagination?.to || response.data.data.length,
          };
          if (this.transactions.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No transactions found. Add some transactions to get started.',
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
            text: response.data?.message || 'Failed to fetch transactions.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch transactions.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingTransactions = false;
      }
    },
    openForm(transaction: Transaction | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedTransaction = transaction;
      this.formMode = mode;
      this.addEditForm = true;
    },
    closeForm() {
      this.selectedTransaction = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.fetchTransactions();
    },
    openView(transaction: Transaction) {
      this.selectedTransaction = transaction;
      this.showView = true;
    },
    closeView() {
      this.selectedTransaction = null;
      this.showView = false;
    },
    confirmDelete(transaction: Transaction) {
      this.selectedTransaction = transaction;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the transaction for "${transaction.property_title}" by "${transaction.client_name}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleDelete();
        }
      });
    },
    cancelAdding() {
      this.closeForm();
    },
    async handleDelete() {
      if (!this.selectedTransaction?.id) return;
      this.deleting = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions/${this.selectedTransaction.id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Transaction has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedTransaction = null;
          await this.fetchTransactions();
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete transaction.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete transaction.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.deleting = false;
      }
    },
    async handleSubmit(payload: Payload, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response;
        if (mode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions`,
            method: 'post',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: payload,
          });
        } else {
          if (!this.selectedTransaction?.id) throw new Error('No transaction ID provided for update');
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions/${this.selectedTransaction.id}`,
            method: 'put',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: payload,
          });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Transaction has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.closeForm();
        } else {
          let errorMessage = response.data?.message || (mode === 'add' ? 'Failed to add transaction.' : 'Failed to update transaction.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage = Object.values(response.data.errors).flat().join('; ');
          }
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
      } catch (error: any) {
        let errorMessage = error.response?.data?.message || (mode === 'add' ? 'Failed to add transaction.' : 'Failed to update transaction.');
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).flat().join('; ');
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.submitting = false;
      }
    },
    async handlePageChange(page: number) {
      await this.fetchTransactions({ page, per_page: this.pagination.per_page, search: this.searchQuery });
    },
    async handleSearch() {
      await this.fetchTransactions({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
    },
  },
});
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
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.flex {
  display: flex;
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
.w-64 {
  width: 16rem;
}
</style>