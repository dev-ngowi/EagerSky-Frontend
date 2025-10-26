<template>
  <div class="card">
    <h2 class="title">All Leases</h2>
    <div class="controls-section">
      <div class="control-group">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property, tenant, or status"
          class="search-input"
          @input="onSearchInput"
        />
        <VaSelect
          v-model="pagination.per_page"
          :options="[10, 25, 50]"
          placeholder="Items per page"
          class="per-page-select"
          @update:modelValue="onPerPageChange"
        />
      </div>
    </div>
    <div class="table-container">
      <VaDataTable
        :items="leases"
        striped
        :columns="columns"
        :loading="loadingLeases"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        :total="pagination.total"
        :page-range="3"
        @update:currentPage="onPageChange"
        @update:perPage="onPerPageChange"
        
        hide-pagination
      >
        <template #cell(sn)="{ rowIndex }">
          {{ getSerialNumber(rowIndex) }}
        </template>
        
        <template #cell(property_title)="{ rowData }">
          <div class="property-cell">
            <span class="property-title">{{ rowData.property_title }}</span>
            <span v-if="rowData.property_location" class="property-location">
              {{ rowData.property_location }}
            </span>
          </div>
        </template>
        
        <template #cell(user_name)="{ rowData }">
          <div class="tenant-cell">
            <span class="tenant-name">{{ rowData.user_name }}</span>
            <span v-if="rowData.tenant_id_number" class="tenant-id">
              ID: {{ rowData.tenant_id_number }}
            </span>
          </div>
        </template>
        
        <template #cell(start_date)="{ rowData }">
          <span class="date">{{ rowData.start_date }}</span>
        </template>
        
        <template #cell(end_date)="{ rowData }">
          <span class="date">{{ rowData.end_date }}</span>
        </template>
        
        <template #cell(rent_amount)="{ rowData }">
          <span class="rent-amount">{{ formatCurrency(rowData.rent_amount) }}</span>
        </template>
        
        <template #cell(is_signed)="{ rowData }">
          <span :class="['status-badge', rowData.is_signed ? 'signed' : 'pending']">
            {{ rowData.is_signed ? 'Signed' : 'Pending' }}
          </span>
        </template>
        
        <template #cell(actions)="{ rowData }">
          <div class="actions-cell">
            <VaButton
              size="small"
              color="primary"
              icon="visibility"
              class="action-btn view-btn"
              @click="openPreview(rowData)"
              :aria-label="`View lease ${rowData.property_title}`"
            />
            
            <VaButton
              v-if="rowData.is_signed"
              size="small"
              color="info"
              class="action-btn download-btn"
              :disabled="downloading && downloadingId === rowData.id"
              @click="downloadPdf(rowData)"
              :aria-label="`Download lease ${rowData.property_title}`"
            >
              <template #prepend-inner>
                <div v-if="downloading && downloadingId === rowData.id" class="spinner" />
                <VaIcon v-else name="download" size="16" />
              </template>
              <span>Download</span>
            </VaButton>
            
            <VaButton
              v-if="rowData.is_signed && canRenewLease(rowData)"
              size="small"
              color="success"
              class="action-btn renew-btn"
              :disabled="renewing || !canRenewLease(rowData)"
              @click="requestRenewal(rowData)"
              :aria-label="`Renew lease ${rowData.property_title}`"
            >
              <template #prepend-inner>
                <div v-if="renewing && renewingId === rowData.id" class="spinner" />
                <VaIcon v-else name="refresh" size="16" />
              </template>
              <span>Renew</span>
            </VaButton>
          </div>
        </template>
      </VaDataTable>
    </div>
    <div v-if="!loadingLeases && pagination.total > pagination.per_page" class="custom-pagination">
      <div class="pagination-info">
        Showing {{ getPaginationInfo() }} of {{ formatNumber(pagination.total) }} leases
      </div>
      <div class="pagination-controls">
        <VaButton
          size="small"
          variant="outline"
          :disabled="pagination.current_page === 1 || loadingLeases"
          @click="onPageChange(pagination.current_page - 1)"
          class="pagination-btn prev-btn"
        >
          <template #prepend-inner>
            <VaIcon name="arrow_left" />
          </template>
          Previous
        </VaButton>
        
        <div class="page-numbers">
          <VaButton
            v-for="pageNum in getVisiblePages()"
            :key="pageNum"
            size="small"
            variant="outline"
            :color="pagination.current_page === pageNum ? 'primary' : 'gray'"
            @click="onPageChange(pageNum)"
            :disabled="loadingLeases"
            class="page-btn"
          >
            {{ pageNum }}
          </VaButton>
        </div>
        
        <VaButton
          size="small"
          variant="outline"
          :disabled="pagination.current_page === pagination.last_page || loadingLeases"
          @click="onPageChange(pagination.current_page + 1)"
          class="pagination-btn next-btn"
        >
          Next
          <template #append-inner>
            <VaIcon name="arrow_right" />
          </template>
        </VaButton>
      </div>
    </div>
    <VaModal
      v-model="showPreview"
      :size="isMobile ? 'full' : 'large'"
      layout="fullscreen"
      close-button
      hide-default-actions
      class="preview-modal"
      :class="{ 'mobile-modal': isMobile }"
    >
      <div v-if="selectedLease" class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Lease Agreement Preview</h2>
          <VaButton
            color="gray"
            class="close-btn"
            @click="showPreview = false"
          >
            <VaIcon name="close" />
          </VaButton>
        </div>
        <div class="modal-body">
          <div class="lease-details">
            <div class="detail-section">
              <h3 class="section-title">Property Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Property:</span>
                  <span class="detail-value">{{ selectedLease.property_title || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">{{ selectedLease.property_location || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Room:</span>
                  <span class="detail-value">{{ selectedLease.room_details || 'N/A' }}</span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h3 class="section-title">Parties</h3>
              <div class="detail-grid">
                <div class="detail-item full-width">
                  <span class="detail-label">Tenant:</span>
                  <span class="detail-value">{{ selectedLease.user_name || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tenant ID:</span>
                  <span class="detail-value">{{ selectedLease.tenant_id_number || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Landlord:</span>
                  <span class="detail-value">{{ selectedLease.landlord_name || 'N/A' }}</span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h3 class="section-title">Lease Terms</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Start Date:</span>
                  <span class="detail-value">{{ selectedLease.start_date || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">End Date:</span>
                  <span class="detail-value">{{ selectedLease.end_date || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">{{ selectedLease.duration || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Monthly Rent:</span>
                  <span class="detail-value rent-value">
                    {{ selectedLease.formatted_rent || selectedLease.rent_amount || 'N/A' }} TZS
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Payment Due:</span>
                  <span class="detail-value">
                    {{ selectedLease.payment_due_day || 'N/A' }}th of each month
                  </span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Status:</span>
                  <span :class="['detail-value', 'status-badge', selectedLease.is_signed ? 'signed' : 'pending']">
                    {{ selectedLease.is_signed ? 'Signed' : 'Pending' }}
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h3 class="section-title">Terms & Conditions</h3>
              <div class="terms-content">
                <p>{{ selectedLease.terms || 'N/A' }}</p>
              </div>
            </div>
            <div v-if="selectedLease.company_info && Object.keys(selectedLease.company_info).length" class="detail-section">
              <h3 class="section-title">Company Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">{{ selectedLease.company_info.name || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">{{ selectedLease.company_info.email || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">{{ selectedLease.company_info.phone || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Website:</span>
                  <span class="detail-value">{{ selectedLease.company_info.website || 'N/A' }}</span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">{{ selectedLease.company_info.address || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">P.O. Box:</span>
                  <span class="detail-value">{{ selectedLease.company_info.po_box || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <VaButton
            color="secondary"
            class="action-btn"
            @click="showPreview = false"
          >
            Close
          </VaButton>
         
          <VaButton
            v-if="selectedLease.is_signed"
            color="info"
            class="action-btn"
            :disabled="downloading && downloadingId === selectedLease.id"
            @click="downloadPdf(selectedLease)"
          >
            <template #prepend-inner>
              <div v-if="downloading && downloadingId === selectedLease.id" class="spinner" />
              <VaIcon v-else name="download" size="16" />
            </template>
            Download PDF
          </VaButton>
         
          <VaButton
            v-if="selectedLease.is_signed && canRenewLease(selectedLease)"
            color="success"
            class="action-btn"
            :disabled="renewing || !canRenewLease(selectedLease)"
            @click="requestRenewal(selectedLease)"
          >
            <template #prepend-inner>
              <div v-if="renewing && renewingId === selectedLease.id" class="spinner" />
              <VaIcon v-else name="refresh" size="16" />
            </template>
            Renew Lease
          </VaButton>
        </div>
      </div>
    </VaModal>
  </div>
</template>
<script lang="ts">
import { defineComponent, computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import { format, parse, isValid, isWithinInterval, subDays, addDays } from 'date-fns';
// Assuming the following imports are correctly set up in your project
import makeRequest from '../../../services/makeRequest';
import type { Lease } from '../../../types/lease';
export default defineComponent({
  name: 'ViewLeaseAgreement',
 
  setup() {
    const isMobile = computed(() => window.innerWidth < 768);
   
    // Define the debounced search function within setup to ensure it's reactive/accessible
    // and easily cleaned up.
    const debouncedSearchRef = ref<((query: string) => void) | null>(null);
    // Initial setup for the debounced function.
    onMounted(() => {
      // The debounce function must be created with the component's method reference,
      // which is only available on 'this' in the Options API part.
      // We'll manage debouncedSearch in data/methods for simplicity with the current structure.
    });
    onBeforeUnmount(() => {
      // Cleanup for resize listener is handled below.
    });
    return { isMobile };
  },
  data() {
    return {
      columns: [
        { key: 'sn', width: '60px', sortable: false },
        { key: 'property_title', sortable: true },
        { key: 'user_name', sortable: true },
        { key: 'start_date', width: '120px', sortable: true },
        { key: 'end_date', width: '120px', sortable: true },
        { key: 'rent_amount', width: '120px', sortable: true },
        { key: 'is_signed', width: '100px', sortable: true },
        { key: 'actions', width: '180px', sortable: false },
      ] as any[],
     
      leases: [] as Lease[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as {
        total: number;
        per_page: number;
        current_page: number;
        last_page: number;
      },
      loadingLeases: false,
      showPreview: false,
      selectedLease: null as Lease | null,
      downloading: false,
      downloadingId: null as number | null,
      renewing: false,
      renewingId: null as number | null,
      searchQuery: '',
     
      // Use this property to hold the debounced function instance
      debouncedSearch: null as ((query: string) => void) | null,
    };
  },
  computed: {
    hasMorePages(): boolean {
      return this.pagination.current_page < this.pagination.last_page;
    },
   
    hasPreviousPage(): boolean {
      return this.pagination.current_page > 1;
    },
  },
  async mounted() {
    // Initialize the debounced function, binding 'this.fetchLeases' to the component instance
    this.debouncedSearch = debounce(this.fetchLeases, 500);
   
    await this.fetchLeases();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    // Ensure the debounced function is cancelled to prevent memory leaks/unexpected calls
    if (this.debouncedSearch) {
      this.debouncedSearch.cancel();
    }
  },
  methods: {
    handleResize() {
      // Handle window resize if needed (e.g., to re-calculate isMobile if not using a setup hook reactive version)
    },
    /** PAGINATION METHODS */
    getSerialNumber(rowIndex: number): number {
      return (this.pagination.current_page - 1) * this.pagination.per_page + rowIndex + 1;
    },
    getPaginationInfo(): string {
      const start = (this.pagination.current_page - 1) * this.pagination.per_page + 1;
      const end = Math.min(this.pagination.current_page * this.pagination.per_page, this.pagination.total);
      return `${start} to ${end}`;
    },
    getVisiblePages(): number[] {
      const pages: number[] = [];
      const totalPages = this.pagination.last_page;
      const maxVisiblePages = 5; // e.g., show max 5 page buttons
      let startPage = Math.max(1, this.pagination.current_page - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      // Adjust startPage if we're near the end
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      return pages;
    },
    onPageChange(page: number) {
      console.log('Page change requested:', page);
      if (page < 1 || page > this.pagination.last_page || page === this.pagination.current_page) {
        return;
      }
      this.pagination.current_page = page;
      this.fetchLeases();
    },
    onPerPageChange(perPage: number) {
      console.log('Per page change:', perPage);
      // Ensure perPage is a number
      this.pagination.per_page = Number(perPage);
      this.pagination.current_page = 1;
      this.fetchLeases();
    },
    /** DATA FETCHING */
    async fetchLeases() {
      this.loadingLeases = true;
     
      try {
        const params = {
          page: this.pagination.current_page,
          per_page: this.pagination.per_page,
          search: this.searchQuery.trim() || undefined,
        };
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params,
        });
        if (response.status === 200 && response.data?.pagination) {
          // Map leases data
          this.leases = response.data.data.map((lease: any) => ({
            id: lease.id,
            property_id: lease.property_id,
            property_title: lease.property_title || 'N/A',
            property_location: lease.property_location || '',
            user_id: lease.user_id,
            user_name: lease.user_name || 'N/A',
            tenant_id_number: lease.tenant_id_number || '',
            start_date: this.parseDate(lease.start_date),
            end_date: this.parseDate(lease.end_date),
            rent_amount: lease.rent_amount || null,
            terms: lease.terms || 'N/A',
            is_signed: !!lease.is_signed,
            created_at: this.parseDate(lease.created_at),
          })) as Lease[];
          // Update pagination
          const paginationData = response.data.pagination;
          this.pagination = {
            total: paginationData.total || 0,
            per_page: Number(paginationData.per_page) || this.pagination.per_page, // Ensure per_page is a number
            current_page: paginationData.current_page || 1,
            last_page: paginationData.last_page || 1,
          };
        } else {
          throw new Error('Invalid response structure or missing pagination data');
        }
      } catch (error: any) {
        console.error('Fetch leases error:', error);
        this.leases = [];
        this.pagination = { ...this.pagination, total: 0, current_page: 1, last_page: 1 };
       
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch leases.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          timer: 4000,
        });
      } finally {
        this.loadingLeases = false;
      }
    },
    onSearchInput() {
      // Reset to page 1 for any new search
      this.pagination.current_page = 1;
      if (this.debouncedSearch) {
        this.debouncedSearch(this.searchQuery);
      }
    },
    /** UTILITY METHODS */
    formatNumber(num: number): string {
      return new Intl.NumberFormat().format(num);
    },
    formatCurrency(amount: any): string {
      if (!amount || amount === 'N/A') return 'N/A';
      try {
        return new Intl.NumberFormat('en-TZ', {
          style: 'currency',
          currency: 'TZS',
          minimumFractionDigits: 0,
        }).format(Number(amount));
      } catch {
        return amount.toString();
      }
    },
    parseDate(dateStr: string | null | undefined): string {
      if (!dateStr || dateStr === 'N/A') return 'N/A';
     
      try {
        // Try multiple date formats
        const formats = ['d MMMM yyyy', 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd HH:mm:ss', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
       
        for (const fmt of formats) {
          const parsed = parse(dateStr, fmt, new Date());
          if (isValid(parsed)) {
            return format(parsed, 'MMM dd, yyyy');
          }
        }
       
        // Try native Date constructor as fallback
        const nativeDate = new Date(dateStr);
        if (isValid(nativeDate) && !isNaN(nativeDate.getTime())) {
          return format(nativeDate, 'MMM dd, yyyy');
        }
       
        return 'N/A';
      } catch {
        return 'N/A';
      }
    },
    canRenewLease(lease: Lease): boolean {
      if (!lease.end_date || lease.end_date === 'N/A') return false;
     
      try {
        const endDate = parse(lease.end_date, 'MMM dd, yyyy', new Date());
        if (!isValid(endDate)) return false;
       
        const today = new Date();
        const thirtyDaysBeforeEnd = subDays(endDate, 30); // Allow renewal within 30 days of end
        const oneDayAfterEnd = addDays(endDate, 1);
       
        // Check if today is within 30 days before the end date, up to and including the end date
        return isWithinInterval(today, {
          start: thirtyDaysBeforeEnd,
          end: oneDayAfterEnd
        });
      } catch {
        return false;
      }
    },
    /** ACTIONS */
    async openPreview(lease: Lease) {
      try {
        this.loadingLeases = true; // Use this as modal loading indicator
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${lease.id}/preview`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          const apiData = response.data.data;
          this.selectedLease = {
            ...lease,
            ...apiData, // Merge the full data from the preview endpoint
            // Re-parse dates/format for display consistency
            start_date: this.parseDate(apiData.start_date || lease.start_date),
            end_date: this.parseDate(apiData.end_date || lease.end_date),
            formatted_rent: this.formatCurrency(apiData.rent_amount || lease.rent_amount),
            company_info: apiData.company_info || {},
          } as Lease;
          this.showPreview = true;
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch lease preview.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          timer: 3000,
        });
      } finally {
        this.loadingLeases = false;
      }
    },
    async downloadPdf(lease: Lease) {
      this.downloading = true;
      this.downloadingId = lease.id;
     
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/leases/${lease.id}/pdf`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        if (response.status === 200 && response.data.data.url) {
          window.open(response.data.data.url, '_blank');
          Swal.fire({
            title: 'Success!',
            text: 'PDF opened successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            timer: 2000,
          });
        } else {
           throw new Error('PDF download URL not received.');
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to download PDF.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          timer: 3000,
        });
      } finally {
        this.downloading = false;
        this.downloadingId = null;
      }
    },
    async requestRenewal(lease: Lease) {
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
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Lease renewal requested successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            timer: 3000,
          });
          // Refresh current page after renewal
          await this.fetchLeases();
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to request renewal.',
          icon: 'error',
          position: 'top-end',
          toast: true,
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
  @apply bg-white shadow-lg rounded-xl overflow-hidden;
}
.title {
  @apply text-2xl font-bold p-4 pb-0 text-gray-800;
}
/* --- Controls Section --- */
.controls-section {
  @apply p-4;
}
.control-group {
  @apply flex flex-col sm:flex-row gap-3 items-center;
}
.search-input {
  @apply flex-grow max-w-full sm:max-w-xs;
}
.per-page-select {
  @apply w-full sm:w-auto min-w-[150px];
}
/* --- Data Table Styling --- */
.table-container {
  @apply overflow-x-auto;
}
/* Cell Customizations */
.property-cell, .tenant-cell {
  @apply flex flex-col;
}
.property-title, .tenant-name {
  @apply font-semibold text-gray-800;
}
.property-location, .tenant-id {
  @apply text-sm text-gray-500;
}
.date {
  @apply text-sm font-medium text-gray-700 whitespace-nowrap;
}
.rent-amount {
  @apply font-bold text-base text-primary whitespace-nowrap;
}
.status-badge {
  @apply inline-block px-2 py-0.5 text-xs font-semibold rounded-full;
}
.status-badge.signed {
  @apply bg-green-100 text-green-800;
}
.status-badge.pending {
  @apply bg-yellow-100 text-yellow-800;
}
.actions-cell {
  @apply flex gap-2 items-center flex-wrap;
}
.action-btn {
  @apply min-w-0 !p-2 transition-transform duration-150;
}
.download-btn, .renew-btn {
  @apply !px-3 !py-1 flex items-center gap-1;
}
/* Spinner */
.spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid white;
  width: 1em;
  height: 1em;
  animation: spin 1s linear infinite;
  @apply mr-1;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
/* --- Custom Pagination --- */
.custom-pagination {
  @apply flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-6 pb-4 border-t border-gray-200 bg-gray-50 rounded-b-lg px-4;
}
.pagination-info {
  @apply text-sm text-gray-700 font-medium;
}
.pagination-controls {
  @apply flex items-center gap-2 flex-wrap justify-center sm:justify-end;
}
.page-numbers {
  @apply flex gap-1 flex-wrap justify-center;
}
.page-btn {
  @apply px-3 py-1.5 text-sm font-medium rounded transition-colors min-w-[40px];
}
.va-button--primary {
  /* Ensure primary styling overrides outline variant when active */
  @apply !bg-primary !text-white !shadow-sm;
}
.pagination-btn {
  @apply px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1;
}
.prev-btn:disabled,
.next-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}
@media (max-width: 640px) {
  .custom-pagination {
    @apply flex-col gap-3 px-2;
  }
 
  .pagination-controls {
    @apply w-full justify-center;
  }
 
  .page-numbers {
    @apply order-2 w-full justify-center;
  }
 
  .page-btn {
    @apply px-2 py-1 text-xs min-w-[36px];
  }
}
/* --- Modal Styling --- */
.preview-modal :deep(.va-modal__container) {
  @apply max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh];
}
.mobile-modal :deep(.va-modal__container) {
    @apply max-w-full !m-0 !rounded-none h-full;
}
.modal-content {
  @apply flex flex-col h-full;
}
.modal-header {
  @apply p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10;
}
.modal-title {
  @apply text-xl font-bold text-gray-800;
}
.modal-body {
  @apply p-4 overflow-y-auto flex-grow;
}
.lease-details {
  @apply space-y-6;
}
.detail-section {
  @apply border border-gray-200 rounded-lg p-4;
}
.section-title {
  @apply text-lg font-semibold mb-3 border-b pb-2 text-primary;
}
.detail-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}
.detail-item {
  @apply flex flex-col;
}
.detail-item.full-width {
  @apply md:col-span-2;
}
.detail-label {
  @apply text-sm font-medium text-gray-500;
}
.detail-value {
  @apply text-base font-semibold text-gray-800;
}
.rent-value {
  @apply text-lg text-green-600;
}
.terms-content {
  @apply text-gray-600 leading-relaxed;
}
.modal-actions {
  @apply p-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white z-10;
}
</style>