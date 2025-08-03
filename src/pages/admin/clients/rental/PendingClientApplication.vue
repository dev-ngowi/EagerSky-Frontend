<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search pending applications by property or user name"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
    </div>
    <VaDataTable
      :key="componentKey"
      :items="applications"
      striped
      :columns="columns"
      :loading="loadingApplications"
      :per-page="pagination.per_page"
      :current-page="pagination.current_page"
      @update:currentPage="handlePageChange"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(status)="{ rowData }">
        <span class="px-2 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-800">
          {{ rowData.status }}
        </span>
      </template>
      <template #cell(actions)="{ rowData }">
        <div class="flex space-x-2">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton
            size="small"
            color="success"
            icon="check"
            @click="confirmApprove(rowData)"
            v-if="rowData.status === 'pending'"
          />
          <VaButton
            size="small"
            color="danger"
            icon="close"
            @click="confirmReject(rowData)"
            v-if="rowData.status === 'pending'"
          />
        </div>
      </template>
    </VaDataTable>
    <div class="flex justify-between items-center mt-4">
      <div>
        Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
        {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
        {{ pagination.total }} pending applications
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

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Pending Rental Application Details') }}</div>
      <div v-if="selectedApplication" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedApplication.property_title || 'None' }}</p>
        <p><strong>User:</strong> {{ selectedApplication.user_name || 'None' }}</p>
        <p><strong>Branch:</strong> {{ selectedApplication.branch_name || 'None' }}</p>
        <p><strong>Employment Status:</strong> {{ selectedApplication.employment_status || 'None' }}</p>
        <p><strong>Annual Income:</strong> {{ selectedApplication.annual_income || 'None' }}</p>
        <p><strong>Background Check Status:</strong> {{ selectedApplication.background_check_status || 'None' }}</p>
        <p><strong>Credit Report Status:</strong> {{ selectedApplication.credit_report_status || 'None' }}</p>
        <p><strong>Status:</strong> {{ selectedApplication.status || 'None' }}</p>
        <p><strong>Created At:</strong> {{ selectedApplication.created_at || 'None' }}</p>
        <p><strong>Updated At:</strong> {{ selectedApplication.updated_at || 'None' }}</p>
      </div>
      <div class="flex justify-end mt-4 space-x-2">
        <VaButton
          color="success"
          @click="confirmApprove(selectedApplication)"
          v-if="selectedApplication?.status === 'pending'"
        >
          Approve
        </VaButton>
        <VaButton
          color="danger"
          @click="confirmReject(selectedApplication)"
          v-if="selectedApplication?.status === 'pending'"
        >
          Reject
        </VaButton>
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import type { RentalApplication } from '../../../../types/rentalApplication';

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

interface GetApplicationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

export default defineComponent({
  name: 'PendingRentalApplicationList',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'user_name', sortable: true, label: 'User' },
        { key: 'employment_status', sortable: true, label: 'Employment Status' },
        { key: 'annual_income', sortable: true, label: 'Annual Income' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      applications: [] as RentalApplication[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as Pagination,
      loadingApplications: false,
      showView: false,
      selectedApplication: null as RentalApplication | null,
      componentKey: 0,
      searchQuery: '' as string,
      debouncedSearch: Function as () => void,
    };
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  mounted() {
    this.getApplications({ page: 1, per_page: 10, status: 'pending' });
  },
  methods: {
    async getApplications(params: GetApplicationsParams = {}) {
      this.loadingApplications = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          params: {
            page: params.page || 1,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || '',
            status: params.status || 'pending',
          },
        });
        console.log('Applications response:', response);
        if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          this.applications = response.data.data
            .filter((application: any) => application && application.id)
            .map((application: any) => ({
              id: application.id,
              property_id: application.property_id,
              property_title: application.property_title || 'None',
              user_id: application.user_id,
              user_name: application.user_name || 'None',
              branch_id: application.branch_id,
              branch_name: application.branch_name || 'None',
              employment_status: application.employment_status || 'None',
              annual_income: application.annual_income ?? 'None',
              background_check_status: application.background_check_status || 'None',
              credit_report_status: application.credit_report_status || 'None',
              status: application.status || 'None',
              created_at: application.created_at ? format(new Date(application.created_at), 'd MMMM yyyy') : 'None',
              updated_at: application.updated_at ? format(new Date(application.updated_at), 'd MMMM yyyy') : 'None',
            }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          console.log('Applications fetched:', this.applications);
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No pending rental applications found.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response.data?.message || 'Failed to fetch pending rental applications.');
        }
      } catch (error: any) {
        console.error('getApplications error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to fetch pending rental applications.';
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
        this.loadingApplications = false;
      }
    },
    async approveApplication(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${id}/approve`,
          method: 'post',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
        });
        console.log('Approve response:', response);
        if (response.status === 200) {
          await this.getApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
            status: 'pending',
          });
          Swal.fire({
            title: 'Approved!',
            text: 'Rental application has been approved successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to approve rental application.');
        }
      } catch (error: any) {
        console.error('approveApplication error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to approve rental application.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    },
    async rejectApplication(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${id}/reject`,
          method: 'post',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
        });
        console.log('Reject response:', response);
        if (response.status === 200) {
          await this.getApplications({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
            status: 'pending',
          });
          Swal.fire({
            title: 'Rejected!',
            text: 'Rental application has been rejected successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to reject rental application.');
        }
      } catch (error: any) {
        console.error('rejectApplication error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'Failed to reject rental application.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    },
    confirmApprove(application: RentalApplication) {
      this.selectedApplication = application;
      Swal.fire({
        title: 'Approve Application?',
        text: `Are you sure you want to approve the application for "${application.property_title}" by ${application.user_name}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, approve it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleApprove();
        }
      });
    },
    confirmReject(application: RentalApplication) {
      this.selectedApplication = application;
      Swal.fire({
        title: 'Reject Application?',
        text: `Are you sure you want to reject the application for "${application.property_title}" by ${application.user_name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, reject it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          this.handleReject();
        }
      });
    },
    async handleApprove() {
      if (!this.selectedApplication?.id) {
        Swal.fire({
          title: 'Error!',
          text: 'No application selected for approval.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      await this.approveApplication(this.selectedApplication.id);
      this.closeView();
      this.componentKey += 1;
    },
    async handleReject() {
      if (!this.selectedApplication?.id) {
        Swal.fire({
          title: 'Error!',
          text: 'No application selected for rejection.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      await this.rejectApplication(this.selectedApplication.id);
      this.closeView();
      this.componentKey += 1;
    },
    openView(application: RentalApplication) {
      this.selectedApplication = application;
      this.showView = true;
    },
    closeView() {
      this.selectedApplication = null;
      this.showView = false;
    },
    async handlePageChange(page: number) {
      await this.getApplications({
        page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: 'pending',
      });
      this.componentKey += 1;
    },
    async handleSearch() {
      await this.getApplications({
        page: 1,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
        status: 'pending',
      });
      this.componentKey += 1;
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