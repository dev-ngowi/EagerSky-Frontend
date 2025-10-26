<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingApplications">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading pending applications...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading pending applications"
        >
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-container">
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search pending applications by property or user name"
            class="search-input"
            :disabled="loadingApplications"
            @input="debouncedSearch"
            aria-label="Search pending applications by property or user name"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search query">
            Clear Search
          </VaButton>
        </div>
        <div class="per-page-container">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="loadingApplications"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
        </div>
      </div>
      <div
        v-if="!applications || (applications.length === 0 && !loadingApplications)"
        class="no-data-message"
      >
        No pending applications available
      </div>
      <div v-else-if="applications && applications.length > 0" class="table-responsive">
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
            <span class="status-badge">
              {{ rowData.status }}
            </span>
          </template>
          <template #cell(user_name)="{ rowData }">
            {{ rowData.first_name && rowData.last_name ? `${rowData.first_name} ${rowData.last_name}` : rowData.user_name || 'Unknown User' }}
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="action-buttons">
              <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" aria-label="View application details" />
              <VaButton
                size="small"
                color="success"
                icon="check"
                @click="confirmApprove(rowData)"
                v-if="rowData.status === 'pending'"
                aria-label="Approve application"
              />
              <VaButton
                size="small"
                color="danger"
                icon="close"
                @click="confirmReject(rowData)"
                v-if="rowData.status === 'pending'"
                aria-label="Reject application"
              />
            </div>
          </template>
        </VaDataTable>
      </div>
      <div v-if="applications && applications.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} pending applications
        </div>
        <div class="pagination-buttons">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingApplications"
            @click="handlePageChange(pagination.current_page - 1)"
            aria-label="Go to previous page"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="pagination.current_page === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
            :aria-label="`Go to page ${page}`"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingApplications"
            @click="handlePageChange(pagination.current_page + 1)"
            aria-label="Go to next page"
          >
            Next
          </VaButton>
        </div>
      </div>
      <VaModal v-model="showView" :size="isMobile ? 'full' : 'medium'" layout="centered" close-button hide-default-actions class="modal-container">
        <div class="modal-title">{{ $t('Pending Rental Application Details') }}</div>
        <div v-if="selectedApplication" class="modal-content">
          <p><strong>Property:</strong> {{ selectedApplication.property_title || 'None' }}</p>
          <p><strong>User:</strong> {{ selectedApplication.first_name && selectedApplication.last_name ? `${selectedApplication.first_name} ${selectedApplication.last_name}` : selectedApplication.user_name || 'Unknown User' }}</p>
          <p><strong>Branch:</strong> {{ selectedApplication.branch_name || 'None' }}</p>
          <p><strong>NIDA Number:</strong> {{ selectedApplication.nida_number || 'None' }}</p>
          <p><strong>Employment Status:</strong> {{ selectedApplication.employment_status || 'None' }}</p>
          <p><strong>Annual Income:</strong> {{ selectedApplication.annual_income || 'None' }}</p>
          <p><strong>Background Check Status:</strong> {{ selectedApplication.background_check_status || 'None' }}</p>
          <p><strong>Credit Report Status:</strong> {{ selectedApplication.credit_report_status || 'None' }}</p>
          <p><strong>Status:</strong> {{ selectedApplication.status || 'None' }}</p>
          <p><strong>Created At:</strong> {{ selectedApplication.created_at || 'None' }}</p>
          <p><strong>Updated At:</strong> {{ selectedApplication.updated_at || 'None' }}</p>
        </div>
        <div class="modal-footer">
          <VaButton
            color="success"
            @click="confirmApprove(selectedApplication)"
            v-if="selectedApplication?.status === 'pending'"
            aria-label="Approve application"
          >
            Approve
          </VaButton>
          <VaButton
            color="danger"
            @click="confirmReject(selectedApplication)"
            v-if="selectedApplication?.status === 'pending'"
            aria-label="Reject application"
          >
            Reject
          </VaButton>
          <VaButton color="secondary" @click="closeView" aria-label="Close application details modal">Close</VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
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
  setup() {
    const applications = ref<RentalApplication[]>([]);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const loadingApplications = ref<boolean>(false);
    const errorMessage = ref<string>('');
    const showView = ref<boolean>(false);
    const selectedApplication = ref<RentalApplication | null>(null);
    const componentKey = ref<number>(0);
    const searchQuery = ref<string>('');
    const perPageOptions = ref([
      { value: 10, text: '10' },
      { value: 20, text: '20' },
      { value: 50, text: '50' },
    ]);
    const columns = [
      { key: 'sn', sortable: false, label: 'SN' },
      { key: 'property_title', sortable: true, label: 'Property' },
      { key: 'user_name', sortable: true, label: 'User' },
      { key: 'nida_number', sortable: true, label: 'NIDA Number' },
      { key: 'employment_status', sortable: true, label: 'Employment Status' },
      { key: 'annual_income', sortable: true, label: 'Annual Income' },
      { key: 'status', sortable: true, label: 'Status' },
      { key: 'created_at', sortable: true, label: 'Created At' },
      { key: 'actions', label: 'Actions', sortable: false },
    ];
    const paginationPages = computed(() => {
      const pages: number[] = [];
      const lastPage = pagination.value.last_page;
      const current = pagination.value.current_page;
      const range = 2;
      pages.push(1);
      if (current - range > 2) {
        pages.push(current - range - 1);
      }
      for (let i = Math.max(2, current - range); i <= Math.min(lastPage - 1, current + range); i++) {
        pages.push(i);
      }
      if (current + range < lastPage - 1) {
        pages.push(current + range + 1);
      }
      if (lastPage > 1) {
        pages.push(lastPage);
      }
      return pages;
    });
    const isMobile = computed(() => window.innerWidth < 768);
    const debouncedSearch = debounce((value: string) => {
      searchQuery.value = value;
      handleSearch();
    }, 500);
    const retryFetch = () => {
      errorMessage.value = '';
      getApplications({ page: 1, per_page: pagination.value.per_page, status: 'pending' });
    };
    const clearSearch = () => {
      searchQuery.value = '';
      handleSearch();
    };
    const getApplications = async (params: GetApplicationsParams = {}) => {
      loadingApplications.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          params: {
            page: params.page || 1,
            per_page: params.per_page || pagination.value.per_page,
            search: params.search || '',
            status: 'pending',
          },
        });
        if (response.status === 200 && 'data' in response.data && 'pagination' in response.data) {
          applications.value = response.data.data
            .filter((application: any) => application && application.id && application.status === 'pending')
            .map((application: any) => {
              const validStatuses = ['pending', 'approved', 'rejected'] as const;
              const status: 'pending' | 'approved' | 'rejected' = validStatuses.includes(application.status)
                ? application.status
                : 'pending';
              return {
                id: Number(application.id),
                property_id: Number(application.property_id),
                property_title: application.property_title || 'None',
                user_id: Number(application.user_id),
                user_name: application.user_name || null,
                first_name: application.first_name || '',
                last_name: application.last_name || '',
                branch_id: application.branch_id ? Number(application.branch_id) : null,
                branch_name: application.branch_name || 'None',
                nida_number: application.nida_number || 'None',
                employment_status: application.employment_status || 'None',
                annual_income: application.annual_income ? Number(application.annual_income) : 'None',
                background_check_status: application.background_check_status || 'None',
                credit_report_status: application.credit_report_status || 'None',
                status,
                created_at: application.created_at ? format(new Date(application.created_at), 'd MMMM yyyy') : 'None',
                updated_at: application.updated_at ? format(new Date(application.updated_at), 'd MMMM yyyy') : 'None',
              };
            });
          pagination.value = {
            total: response.data.pagination?.total || applications.value.length,
            per_page: Number(response.data.pagination?.per_page) || params.per_page || 10,
            current_page: Number(response.data.pagination?.current_page) || params.page || 1,
            last_page: Number(response.data.pagination?.last_page) || Math.ceil(applications.value.length / pagination.value.per_page),
          };
          if (applications.value.length === 0) {
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
        errorMessage.value = error.response?.data?.message || 'Failed to fetch pending rental applications.';
        Swal.fire({
          title: 'Error!',
          text: errorMessage.value,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingApplications.value = false;
      }
    };
    const approveApplication = async (id: number) => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${id}`,
          method: 'patch',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          data: { status: 'approved' },
        });
        if (response.status === 200) {
          await getApplications({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
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
        const errMsg = error.response?.data?.message || 'Failed to approve rental application.';
        Swal.fire({
          title: 'Error!',
          text: errMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    };
    const rejectApplication = async (id: number) => {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/rental-applications/${id}`,
          method: 'patch',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`, Accept: 'application/json' },
          data: { status: 'rejected' },
        });
        if (response.status === 200) {
          await getApplications({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
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
        const errMsg = error.response?.data?.message || 'Failed to reject rental application.';
        Swal.fire({
          title: 'Error!',
          text: errMsg,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        throw error;
      }
    };
    const confirmApprove = (application: RentalApplication) => {
      selectedApplication.value = application;
      if (application.status !== 'pending') {
        Swal.fire({
          title: 'Error!',
          text: 'Only pending applications can be approved.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      Swal.fire({
        title: 'Approve Application?',
        text: `Are you sure you want to approve the application for "${application.property_title}" by ${application.first_name && application.last_name ? `${application.first_name} ${application.last_name}` : application.user_name || 'Unknown User'}?`,
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
          handleApprove();
        }
      });
    };
    const confirmReject = (application: RentalApplication) => {
      selectedApplication.value = application;
      if (application.status !== 'pending') {
        Swal.fire({
          title: 'Error!',
          text: 'Only pending applications can be rejected.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      Swal.fire({
        title: 'Reject Application?',
        text: `Are you sure you want to reject the application for "${application.property_title}" by ${application.first_name && application.last_name ? `${application.first_name} ${application.last_name}` : application.user_name || 'Unknown User'}?`,
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
          handleReject();
        }
      });
    };
    const handleApprove = async () => {
      if (!selectedApplication.value?.id) {
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
      await approveApplication(selectedApplication.value.id);
      closeView();
      componentKey.value += 1;
    };
    const handleReject = async () => {
      if (!selectedApplication.value?.id) {
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
      await rejectApplication(selectedApplication.value.id);
      closeView();
      componentKey.value += 1;
    };
    const openView = (application: RentalApplication) => {
      selectedApplication.value = application;
      showView.value = true;
    };
    const closeView = () => {
      selectedApplication.value = null;
      showView.value = false;
    };
    const handlePageChange = async (page: number) => {
      if (page < 1 || page > pagination.value.last_page || loadingApplications.value) return;
      pagination.value.current_page = page;
      await getApplications({
        page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
        status: 'pending',
      });
      componentKey.value += 1;
    };
    const handlePerPageChange = async () => {
      pagination.value.current_page = 1;
      await getApplications({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
        status: 'pending',
      });
      componentKey.value += 1;
    };
    const handleSearch = async () => {
      pagination.value.current_page = 1;
      await getApplications({
        page: 1,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
        status: 'pending',
      });
      componentKey.value += 1;
    };
    onMounted(() => {
      getApplications({ page: 1, per_page: pagination.value.per_page, status: 'pending' });
    });
    return {
      applications,
      pagination,
      loadingApplications,
      errorMessage,
      showView,
      selectedApplication,
      componentKey,
      searchQuery,
      perPageOptions,
      columns,
      paginationPages,
      isMobile,
      debouncedSearch,
      retryFetch,
      clearSearch,
      getApplications,
      approveApplication,
      rejectApplication,
      confirmApprove,
      confirmReject,
      handleApprove,
      handleReject,
      openView,
      closeView,
      handlePageChange,
      handlePerPageChange,
      handleSearch,
    };
  },
});
</script>

<style lang="scss" scoped>
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

.p-4 {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;

  @media screen and (min-width: 768px) {
    min-height: 400px;
  }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }

  .retry-button {
    margin-top: 0.5rem;
    color: #2563eb;
    text-decoration: underline;
    font-size: 0.875rem;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    min-height: 40px;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .search-input {
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;

    @media screen and (min-width: 640px) {
      max-width: 16rem;
    }

    @media screen and (min-width: 768px) {
      max-width: 20rem;
    }
  }

  .va-button {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}

.per-page-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .per-page-select {
    width: 100%;
    max-width: 6rem;
    font-size: 0.875rem;

    @media screen and (min-width: 768px) {
      max-width: 8rem;
      font-size: 1rem;
    }
  }
}

.no-data-message {
  text-align: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.875rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  :deep(.va-data-table) {
    min-width: 600px;
  }

  :deep(.va-data-table__table) {
    min-width: 100%;
    table-layout: auto;
  }

  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.5rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #374151;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.875rem 0.75rem;
    }
  }

  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.875rem 0.75rem;
    }
  }

  :deep(.va-data-table__table-tr:hover) {
    background-color: #f8fafc;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: #fef9c3;
    color: #854d0e;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }

  .action-buttons {
    display: flex;
    gap: 0.25rem;

    @media screen and (min-width: 768px) {
      gap: 0.5rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem;
      }
    }
  }
}

.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .pagination-info {
    font-size: 0.75rem;
    color: #6b7280;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }

  .pagination-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;

    @media screen and (min-width: 768px) {
      gap: 0.5rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }
    }
  }
}

.modal-container {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.75rem;

    @media screen and (min-width: 768px) {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
  }

  .modal-content {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
    font-size: 0.875rem;

    @media screen and (min-width: 768px) {
      max-height: 70vh;
      padding-right: 1rem;
      font-size: 1rem;
    }

    p {
      margin: 0.5rem 0;

      @media screen and (min-width: 768px) {
        margin: 1rem 0;
      }
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.75rem;

    @media screen and (min-width: 768px) {
      gap: 1rem;
      margin-top: 1rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }
    }
  }
}

@media (max-width: 640px) {
  .p-4 {
    padding: 0.5rem;
  }

  .controls-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .search-container {
    .search-input {
      font-size: 0.75rem;
      max-width: 100%;
    }

    .va-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }
  }

  .per-page-container {
    .per-page-select {
      font-size: 0.75rem;
      max-width: 5rem;
    }
  }

  .no-data-message {
    font-size: 0.75rem;
    padding: 0.75rem;
  }

  .table-responsive {
    :deep(.va-data-table) {
      min-width: 400px;
    }

    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.25rem;
    }

    :deep(.va-data-table__table-th[data-key="nida_number"]),
    :deep(.va-data-table__table-td[data-key="nida_number"]),
    :deep(.va-data-table__table-th[data-key="employment_status"]),
    :deep(.va-data-table__table-td[data-key="employment_status"]),
    :deep(.va-data-table__table-th[data-key="annual_income"]),
    :deep(.va-data-table__table-td[data-key="annual_income"]),
    :deep(.va-data-table__table-th[data-key="created_at"]),
    :deep(.va-data-table__table-td[data-key="created_at"]) {
      display: none; /* Hide less critical columns on mobile */
    }

    :deep(.va-data-table__table-th[data-key="sn"]),
    :deep(.va-data-table__table-td[data-key="sn"]) {
      min-width: 40px;
    }

    :deep(.va-data-table__table-th[data-key="property_title"]),
    :deep(.va-data-table__table-td[data-key="property_title"]) {
      min-width: 120px;
    }

    :deep(.va-data-table__table-th[data-key="user_name"]),
    :deep(.va-data-table__table-td[data-key="user_name"]) {
      min-width: 100px;
    }

    :deep(.va-data-table__table-th[data-key="status"]),
    :deep(.va-data-table__table-td[data-key="status"]) {
      min-width: 80px;
    }

    :deep(.va-data-table__table-th[data-key="actions"]),
    :deep(.va-data-table__table-td[data-key="actions"]) {
      min-width: 80px;
    }

    .status-badge {
      font-size: 0.625rem;
      padding: 0.2rem 0.4rem;
    }

    .action-buttons {
      gap: 0.2rem;

      .va-button {
        font-size: 0.625rem;
        padding: 0.2rem;
      }
    }
  }

  .pagination-container {
    gap: 0.25rem;

    .pagination-info {
      font-size: 0.625rem;
    }

    .pagination-buttons {
      .va-button {
        font-size: 0.625rem;
        padding: 0.25rem 0.5rem;
        min-width: 40px;
      }
    }
  }

  .modal-container {
    padding: 0.5rem;

    .modal-title {
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }

    .modal-content {
      max-height: 50vh;
      font-size: 0.75rem;

      p {
        margin: 0.25rem 0;
      }
    }

    .modal-footer {
      margin-top: 0.5rem;

      .va-button {
        font-size: 0.625rem;
        padding: 0.25rem 0.5rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .p-4 {
    padding: 0.25rem;
  }

  .controls-container {
    gap: 0.125rem;
  }

  .search-container {
    .search-input {
      font-size: 0.625rem;
    }

    .va-button {
      font-size: 0.5rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .per-page-container {
    .per-page-select {
      font-size: 0.625rem;
      max-width: 4rem;
    }
  }

  .no-data-message {
    font-size: 0.625rem;
    padding: 0.5rem;
  }

  .error-message {
    font-size: 0.75rem;
    padding: 0.75rem;

    .retry-button {
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .table-responsive {
    :deep(.va-data-table) {
      min-width: 300px;
    }

    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.2rem;
    }

    .status-badge {
      font-size: 0.5rem;
      padding: 0.15rem 0.3rem;
    }

    .action-buttons {
      .va-button {
        font-size: 0.5rem;
        padding: 0.15rem;
      }
    }
  }

  .pagination-container {
    .pagination-info {
      font-size: 0.5rem;
    }

    .pagination-buttons {
      .va-button {
        font-size: 0.5rem;
        padding: 0.2rem 0.4rem;
        min-width: 36px;
      }
    }
  }

  .modal-container {
    padding: 0.25rem;

    .modal-title {
      font-size: 0.875rem;
    }

    .modal-content {
      max-height: 40vh;
      font-size: 0.625rem;
    }
  }
}
</style>