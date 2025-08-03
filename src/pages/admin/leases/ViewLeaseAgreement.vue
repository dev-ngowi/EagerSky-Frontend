<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">All Leases</h2>
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, tenant, or status"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
    </div>
    <VaDataTable
      :key="componentKey"
      :items="leases"
      striped
      :columns="columns"
      :loading="loadingLeases"
      :per-page="pagination.per_page"
      :current-page="pagination.current_page"
      @update:currentPage="changePage"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
      </template>
      <template #cell(is_signed)="{ rowData }">
        {{ rowData.is_signed ? 'Yes' : 'No' }}
      </template>
      <template #cell(actions)="{ rowData }">
        <VaButton size="small" color="primary" icon="visibility" @click="openPreview(rowData)" />
        <VaButton
          v-if="rowData.is_signed"
          size="small"
          color="info"
          icon="download"
          class="ml-2"
          :disabled="downloading"
          @click="downloadPdf(rowData)"
        >
          <div v-if="downloading && downloadingId === rowData.id" class="spinner" />
          <span v-else>Download</span>
        </VaButton>
        <VaButton
          v-if="rowData.is_signed"
          size="small"
          color="success"
          icon="refresh"
          class="ml-2"
          :disabled="renewing || !canRenewLease(rowData)"
          @click="requestRenewal(rowData)"
        >
          <div v-if="renewing && renewingId === rowData.id" class="spinner" />
          <span v-else>Renew</span>
        </VaButton>
      </template>
    </VaDataTable>
    <div class="flex justify-between items-center mt-4">
      <div>
        Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
        {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
        {{ pagination.total }} leases
      </div>
      <div class="flex space-x-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1"
          @click="changePage(pagination.current_page - 1)"
        >
          Previous
        </VaButton>
        <VaButton
          size="small"
          :disabled="pagination.current_page === pagination.last_page"
          @click="changePage(pagination.current_page + 1)"
        >
          Next
        </VaButton>
      </div>
    </div>
    <VaModal v-model="showPreview" size="large" layout="centered" close-button hide-default-actions class="p-4">
      <div v-if="selectedLease" class="space-y-4">
        <h2 class="text-lg font-bold">Lease Agreement Preview</h2>
        <div class="border p-4 rounded bg-gray-50">
          <p><strong>Property:</strong> {{ selectedLease.property_title || 'N/A' }}</p>
          <p><strong>Location:</strong> {{ selectedLease.property_location || 'N/A' }}</p>
          <p><strong>Room:</strong> {{ selectedLease.room_details || 'N/A' }}</p>
          <p><strong>Tenant:</strong> {{ selectedLease.user_name || 'N/A' }}</p>
          <p><strong>Tenant ID:</strong> {{ selectedLease.tenant_id_number || 'N/A' }}</p>
          <p><strong>Landlord:</strong> {{ selectedLease.landlord_name || 'N/A' }}</p>
          <p><strong>Start Date:</strong> {{ selectedLease.start_date || 'N/A' }}</p>
          <p><strong>End Date:</strong> {{ selectedLease.end_date || 'N/A' }}</p>
          <p><strong>Duration:</strong> {{ selectedLease.duration || 'N/A' }}</p>
          <p><strong>Monthly Rent:</strong> {{ selectedLease.formatted_rent || 'N/A' }} TZS</p>
          <p><strong>Payment Due Day:</strong> {{ selectedLease.payment_due_day || 'N/A' }}th of each month</p>
          <p><strong>Terms:</strong> {{ selectedLease.terms || 'N/A' }}</p>
          <p><strong>Signed:</strong> {{ selectedLease.is_signed ? 'Yes' : 'No' }}</p>
          <div class="mt-4">
            <h3 class="font-bold">Company Information</h3>
            <p><strong>Name:</strong> {{ selectedLease.company_info?.name || 'N/A' }}</p>
            <p><strong>Email:</strong> {{ selectedLease.company_info?.email || 'N/A' }}</p>
            <p><strong>Website:</strong> {{ selectedLease.company_info?.website || 'N/A' }}</p>
            <p><strong>Phone:</strong> {{ selectedLease.company_info?.phone || 'N/A' }}</p>
            <p><strong>Address:</strong> {{ selectedLease.company_info?.address || 'N/A' }}</p>
            <p><strong>P.O. Box:</strong> {{ selectedLease.company_info?.po_box || 'N/A' }}</p>
          </div>
        </div>
        <div class="flex justify-end space-x-2">
          <VaButton color="secondary" @click="showPreview = false">Close</VaButton>
          <VaButton
            v-if="selectedLease.is_signed"
            color="info"
            :disabled="downloading"
            @click="downloadPdf(selectedLease)"
          >
            <div v-if="downloading && downloadingId === selectedLease.id" class="spinner" />
            <span v-else>Download PDF</span>
          </VaButton>
          <VaButton
            v-if="selectedLease.is_signed"
            color="success"
            :disabled="renewing || !canRenewLease(selectedLease)"
            @click="requestRenewal(selectedLease)"
          >
            <div v-if="renewing && renewingId === selectedLease.id" class="spinner" />
            <span v-else>Renew Lease</span>
          </VaButton>
        </div>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import { format, parse, isValid, isWithinInterval, subDays, addDays } from 'date-fns';
import makeRequest from '../../../services/makeRequest';
import type { Lease } from '../../../types/lease';

export default defineComponent({
  name: 'Leases',
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'user_name', sortable: true, label: 'Tenant' },
        { key: 'start_date', sortable: true, label: 'Start Date' },
        { key: 'end_date', sortable: true, label: 'End Date' },
        { key: 'rent_amount', sortable: true, label: 'Rent Amount (TZS)' },
        { key: 'is_signed', sortable: true, label: 'Signed' },
        { key: 'actions', sortable: false, label: 'Actions' },
      ],
      leases: [] as Lease[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
      loadingLeases: false,
      showPreview: false,
      selectedLease: null as Lease | null,
      downloading: false,
      downloadingId: null as number | null,
      renewing: false,
      renewingId: null as number | null,
      searchQuery: '' as string,
      componentKey: 0,
      isAdmin: true,
      debouncedSearch: debounce(
        function (this: any) {
          return this.handleSearch();
        },
        500
      ) as () => void,
    };
  },
  async mounted() {
    console.log('Leases mounted, fetching leases');
    await this.getLeases();
  },
  methods: {
    parseDate(dateStr: string | null | undefined, context: string): string {
      if (!dateStr) {
        console.warn(`${context}: Date string is null or undefined`);
        return 'N/A';
      }
      try {
        // Try parsing with expected format
        let parsed = parse(dateStr, 'd MMMM yyyy', new Date());
        if (isValid(parsed)) {
          return format(parsed, 'd MMMM yyyy');
        }
        // Fallback: try parsing as ISO date
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
    async getLeases(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingLeases = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases`,
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
        console.log('getLeases response:', response);
        if (response.status === 200) {
          this.leases = response.data.data.map((lease: any, index: number) => {
            const context = `Lease ${lease.id || index}`;
            return {
              id: lease.id,
              property_id: lease.property_id,
              property_title: lease.property_title || 'N/A',
              user_id: lease.user_id,
              user_name: lease.user_name || 'N/A',
              start_date: this.parseDate(lease.start_date, `${context} start_date`),
              end_date: this.parseDate(lease.end_date, `${context} end_date`),
              rent_amount: lease.rent_amount !== null ? lease.rent_amount : 'N/A',
              terms: lease.terms || 'N/A',
              is_signed: lease.is_signed !== null ? lease.is_signed : false,
              created_at: this.parseDate(lease.created_at, `${context} created_at`),
              updated_at: this.parseDate(lease.updated_at, `${context} updated_at`),
              deleted_at: this.parseDate(lease.deleted_at, `${context} deleted_at`),
            };
          });
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          this.searchQuery = params.search || this.searchQuery;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No leases found.',
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
            text: response.data?.message || 'Failed to fetch leases.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getLeases error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || error.message || 'Failed to fetch leases.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.loadingLeases = false;
      }
    },
    async handleSearch() {
      console.log('Searching with query:', this.searchQuery);
      await this.getLeases({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    async changePage(page: number) {
      console.log('Changing page to:', page);
      await this.getLeases({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    canRenewLease(lease: Lease): boolean {
      if (!lease.end_date || lease.end_date === 'N/A') {
        console.warn(`canRenewLease: No valid end_date for lease ${lease.id}`);
        return false;
      }
      try {
        const endDate = parse(lease.end_date, 'd MMMM yyyy', new Date());
        if (!isValid(endDate)) {
          console.warn(`canRenewLease: Invalid end_date "${lease.end_date}" for lease ${lease.id}`);
          return false;
        }
        const today = new Date();
        const fiveDaysBeforeEnd = subDays(endDate, 5);
        return isWithinInterval(today, { start: fiveDaysBeforeEnd, end: addDays(endDate, 1) }) || today >= endDate;
      } catch (error) {
        console.error(`canRenewLease: Error checking lease ${lease.id} renewal eligibility:`, error);
        return false;
      }
    },
    async openPreview(lease: Lease) {
      console.log('Opening preview for lease:', JSON.stringify(lease, null, 2));
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${lease.id}/preview`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          const parseDate = (dateStr: string | null | undefined, context: string): string => {
            if (!dateStr) {
              console.warn(`${context}: Date string is null or undefined`);
              return 'N/A';
            }
            try {
              let parsed = parse(dateStr, 'd MMMM yyyy', new Date());
              if (isValid(parsed)) {
                return format(parsed, 'd MMMM yyyy');
              }
              parsed = new Date(dateStr);
              if (isValid(parsed)) {
                return format(parsed, 'd MMMM yyyy');
              }
              console.warn(`${context}: Invalid date format for "${dateStr}"`);
              return 'N/A';
            } catch {
              console.warn(`${context}: Error parsing date "${dateStr}"`);
              return 'N/A';
            }
          };
          const context = `Lease ${response.data.data.id} preview`;
          this.selectedLease = {
            id: response.data.data.id,
            property_id: response.data.data.property_id,
            property_title: response.data.data.property_title || 'N/A',
            property_location: response.data.data.property_location || 'N/A',
            room_details: response.data.data.room_details || 'N/A',
            user_id: response.data.data.user_id,
            user_name: response.data.data.user_name || 'N/A',
            tenant_id_number: response.data.data.tenant_id_number || 'N/A',
            landlord_name: response.data.data.landlord_name || 'N/A',
            director_name: response.data.data.director_name || 'N/A',
            start_date: parseDate(response.data.data.start_date, `${context} start_date`),
            end_date: parseDate(response.data.data.end_date, `${context} end_date`),
            rent_amount: response.data.data.rent_amount !== null ? response.data.data.rent_amount : 'N/A',
            formatted_rent: response.data.data.formatted_rent || 'N/A',
            duration: response.data.data.duration || 'N/A',
            duration_months: response.data.data.duration_months || 0,
            payment_due_day: response.data.data.payment_due_day || 'N/A',
            terms: response.data.data.terms || 'N/A',
            is_signed: response.data.data.is_signed !== null ? response.data.data.is_signed : false,
            created_at: parseDate(response.data.data.created_at, `${context} created_at`),
            updated_at: parseDate(response.data.data.updated_at, `${context} updated_at`),
            company_info: response.data.data.company_info || {},
          };
          this.showPreview = true;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch lease preview.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Preview error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch lease preview.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    async downloadPdf(lease: Lease) {
      console.log('Downloading PDF for lease:', JSON.stringify(lease, null, 2));
      this.downloading = true;
      this.downloadingId = lease.id;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${lease.id}/pdf`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          const { url } = response.data.data;
          window.open(url, '_blank');
          Swal.fire({
            title: 'Success!',
            text: 'Lease PDF opened successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to download lease PDF.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Download error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to download lease PDF.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.downloading = false;
        this.downloadingId = null;
      }
    },
    async requestRenewal(lease: Lease) {
      console.log('Requesting renewal for lease:', JSON.stringify(lease, null, 2));
      this.renewing = true;
      this.renewingId = lease.id;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${lease.id}/renew`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 201) {
          Swal.fire({
            title: 'Success!',
            text: 'Lease renewal requested successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          await this.getLeases({ page: this.pagination.current_page, per_page: this.pagination.per_page, search: this.searchQuery });
          this.componentKey += 1;
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to request lease renewal.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('Renewal error:', error.response?.data || error.message);
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to request lease renewal.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        this.renewing = false;
        this.renewingId = null;
      }
    },
  },
});
</script>

<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;

  @media screen and (max-width: 768px) {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  @media screen and (max-width: 480px) {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
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

.border {
  border: 1px solid #e5e7eb;
}

.rounded {
  border-radius: 0.5rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}
</style>