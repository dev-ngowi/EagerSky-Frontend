import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import { format } from 'date-fns'
import Swal from 'sweetalert2'

export const useTransactionStore = defineStore('transaction', {
  state: () => ({
    loadingTransactions: false,
    transactions: [] as any[],
    addingTransaction: false,
    editingTransaction: false,
    addedTransaction: null as any,
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
    searchQuery: '' as string,
    properties: [] as { value: number; text: string }[],
    clients: [] as { value: number; text: string }[],
    buyersAndSellers: [] as { value: number; text: string }[],
    loadingProperties: false,
    loadingClients: false,
    loadingBuyersAndSellers: false,
    _fetchingTransactions: false,
  }),

  actions: {
    async getTransactions(params: { page?: number; per_page?: number; search?: string } = {}) {
      if (this._fetchingTransactions) {
        console.log('Skipping getTransactions: another fetch is in progress');
        return { status: 'skipped', message: 'Fetch in progress' };
      }
      this._fetchingTransactions = true;
      this.loadingTransactions = true;
      this.transactions = [];
      try {
        console.log('Fetching transactions with params:', params);
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || this.pagination.current_page,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || this.searchQuery,
          },
        });
        console.log('API response:', response);
        if (response.status === 200) {
          if (!response.data?.data) {
            console.warn('No data array in API response');
            this.transactions = [];
            Swal.fire({
              title: 'Info',
              text: 'No transactions found. Add some transactions to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
            return response;
          }
          const newTransactions = response.data.data.map((transaction: any) => ({
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
            amount: transaction.amount !== null ? transaction.amount : 'N/A',
            transaction_date: transaction.transaction_date
              ? format(new Date(transaction.transaction_date), 'd MMMM yyyy')
              : 'N/A',
            created_at: transaction.created_at
              ? format(new Date(transaction.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: transaction.updated_at
              ? format(new Date(transaction.updated_at), 'd MMMM yyyy')
              : 'N/A',
            deleted_at: transaction.deleted_at
              ? format(new Date(transaction.deleted_at), 'd MMMM yyyy')
              : null,
          }));
          const uniqueTransactions = Array.from(
            new Map(newTransactions.map((item) => [item.id, item])).values()
          );
          this.transactions = uniqueTransactions;
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length || 0,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          this.searchQuery = params.search || this.searchQuery;
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
          console.warn('Non-200 response:', response.status, response.data);
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
        return response;
      } catch (error: any) {
        console.error('getTransactions error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch transactions.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
        return { status: 'error', message: error.response?.data?.message || error.message };
      } finally {
        this.loadingTransactions = false;
        this._fetchingTransactions = false;
      }
    },

    async getProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
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
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch properties.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getProperties error:', error.response?.data || error.message);
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

    async getClients() {
      this.loadingClients = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
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
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch clients.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getClients error:', error.response?.data || error.message);
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

    async getBuyersAndSellers() {
      this.loadingBuyersAndSellers = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/clients`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
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
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch buyers and sellers.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getBuyersAndSellers error:', error.response?.data || error.message);
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

    async addTransaction(payload: any) {
      if (this.addingTransaction) return { status: 'error', message: 'Transaction submission in progress' };
      this.addingTransaction = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        if (response.status === 201) {
          this.addedTransaction = {
            ...response.data.data,
            transaction_date: response.data.data.transaction_date
              ? format(new Date(response.data.data.transaction_date), 'd MMMM yyyy')
              : 'N/A',
            created_at: response.data.data.created_at
              ? format(new Date(response.data.data.created_at), 'd MMMM yyyy')
              : 'N/A',
            updated_at: response.data.data.updated_at
              ? format(new Date(response.data.data.updated_at), 'd MMMM yyyy')
              : 'N/A',
          };
          await this.getTransactions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Transaction added successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('addTransaction error:', error.response?.data || error.message);
        if (error.response?.status === 422 && error.response?.data?.errors?.duplicate) {
          Swal.fire({
            title: 'Duplicate Transaction',
            text: error.response.data.errors.duplicate || 'A transaction with the same details was created within the last 2 minutes.',
            icon: 'warning',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 5000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || error.message || 'Failed to add transaction.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        throw error;
      } finally {
        this.addingTransaction = false;
      }
    },

    async updateTransaction(payload: any, id: number) {
      if (this.editingTransaction) return { status: 'error', message: 'Transaction update in progress' };
      this.editingTransaction = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions/${id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });
        if (response.status === 200) {
          await this.getTransactions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Transaction updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('updateTransaction error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to update transaction.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      } finally {
        this.editingTransaction = false;
      }
    },

    async deleteTransaction(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/transactions/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          await this.getTransactions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          Swal.fire({
            title: 'Success!',
            text: 'Transaction deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
        return response;
      } catch (error: any) {
        console.error('deleteTransaction error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to delete transaction.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    },
  },
});