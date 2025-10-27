<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <!-- Loading State -->
    <template v-if="loadingReviews">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading reviews...'" />
      </div>
    </template>
    <!-- Error State -->
    <template v-else-if="errorMessage">
      <div class="error-message">
        <div class="error-text">{{ errorMessage }}</div>
        <VaButton
          color="primary"
          @click="retryFetch"
          class="retry-button"
          aria-label="Retry loading reviews"
        >
          Retry
        </VaButton>
      </div>
    </template>
    <!-- Main Content -->
    <template v-else>
      <!-- Controls Container (Always visible) -->
      <div class="controls-container">
        <!-- Search Section -->
        <div class="search-section">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by property or comment..."
            class="search-input"
            :disabled="loadingReviews || addEditForm"
            @input="debouncedSearch"
            aria-label="Search reviews by property or comment"
          />
          <VaButton
            v-if="searchQuery && !addEditForm"
            color="warning"
            size="small"
            @click="clearSearch"
            class="clear-button"
            aria-label="Clear search"
          >
            Clear
          </VaButton>
        </div>
        <!-- Action Buttons -->
        <div class="action-buttons-container">
          <VaSelect
            v-model="pagination.per_page"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            :disabled="addEditForm"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
          <VaButton
            v-if="!addEditForm"
            icon="add"
            color="#00A3E0"
            size="small"
            class="add-button"
            @click="openForm(null, 'add')"
            aria-label="Add new review"
          >
            Add Review
          </VaButton>
          <VaButton
            v-if="addEditForm"
            icon="close"
            color="success"
            size="small"
            class="done-button"
            @click="cancelAdding"
            aria-label="Finish editing"
            :loading="submitting"
          >
            Done
          </VaButton>
        </div>
      </div>
      <!-- No Data Message (Only show when no forms and no data) -->
      <div
        v-if="!addEditForm && (!reviews || reviews.length === 0 && !loadingReviews)"
        class="no-data-message"
      >
        <div class="no-data-icon">📝</div>
        <h3 class="no-data-title">No reviews found</h3>
        <p class="no-data-subtitle">Add some reviews to get started</p>
        <VaButton
          color="primary"
          @click="openForm(null, 'add')"
          class="no-data-action"
          aria-label="Add first review"
        >
          Add First Review
        </VaButton>
      </div>
      <!-- Data Table (Hidden when forms are open) -->
      <div v-if="!addEditForm && reviews && reviews.length > 0" class="table-responsive">
        <VaDataTable
          :key="componentKey"
          :items="reviews"
          :columns="columns"
          :loading="loadingReviews"
          striped
          :hoverable="true"
        >
          <template #cell(sn)="{ rowIndex }">
            {{ ((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + rowIndex + 1 }}
          </template>
         
          <template #cell(property_title)="{ rowData }">
            <span class="property-title">{{ rowData.property_title || 'N/A' }}</span>
          </template>
         
          <template #cell(user_fullname)="{ rowData }">
            <span class="user-name">{{ rowData.user_fullname || 'Unknown' }}</span>
          </template>
         
          <template #cell(rating)="{ rowData }">
            <div class="rating-display">
              <div class="rating-stars" :style="{ '--rating': rowData.rating }"></div>
              <span class="rating-text">{{ rowData.rating }}/5</span>
            </div>
          </template>
         
          <template #cell(comment)="{ rowData }">
            <span class="comment-preview" :title="rowData.comment || 'No comment'">
              {{ (rowData.comment || 'No comment').length > 30 ? (rowData.comment || 'No comment').substring(0, 30) + '...' : (rowData.comment || 'No comment') }}
            </span>
          </template>
         
          <template #cell(review_date)="{ rowData }">
            <span class="date-cell">{{ rowData.review_date }}</span>
          </template>
         
          <template #cell(actions)="{ rowData }">
            <div class="action-buttons">
              <VaButton
                size="small"
                color="primary"
                icon="visibility"
                @click="openView(rowData)"
                class="view-btn"
                aria-label="View review details"
                :disabled="loadingReviews"
              />
              <VaButton
                size="small"
                color="warning"
                icon="edit"
                @click="openForm(rowData, 'edit')"
                class="edit-btn"
                aria-label="Edit review"
                :disabled="loadingReviews"
              />
              <VaButton
                size="small"
                color="danger"
                icon="delete"
                @click="confirmDelete(rowData)"
                class="delete-btn"
                aria-label="Delete review"
                :disabled="loadingReviews || deleting"
              />
            </div>
          </template>
        </VaDataTable>
      </div>
      <!-- Pagination (Hidden when forms are open) -->
      <div v-if="!addEditForm && reviews && reviews.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} reviews
        </div>
        <div class="pagination-controls">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1 || loadingReviews"
            @click="handlePageChange(pagination.current_page - 1)"
            aria-label="Previous page"
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
            :disabled="loadingReviews"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page || loadingReviews"
            @click="handlePageChange(pagination.current_page + 1)"
            aria-label="Next page"
          >
            Next
          </VaButton>
        </div>
      </div>
      <!-- Forms (Take full width when visible) -->
      <div v-if="addEditForm" class="forms-container">
        <ReviewForm
          v-if="formMode === 'add'"
          @close="closeForm"
          @submit="debouncedHandleSubmit"
          :disabled="submitting"
        />
        <ReviewEdit
          v-else-if="formMode === 'edit' && selectedReview"
          :review="selectedReview"
          @close="closeForm"
          @submit="debouncedHandleSubmit"
          :disabled="submitting"
        />
      </div>
      <!-- Review Details Modal -->
      <VaModal
        v-model="showView"
        :size="isMobile ? 'full' : 'medium'"
        layout="centered"
        close-button
        hide-default-actions
        class="modal-container"
      >
        <div class="modal-header">
          <h2 class="modal-title">Review Details</h2>
        </div>
       
        <div v-if="selectedReview" class="modal-content">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Property ID:</span>
              <span class="detail-value">{{ selectedReview.property_id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Property:</span>
              <span class="detail-value">{{ selectedReview.property_title || 'None' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">User ID:</span>
              <span class="detail-value">{{ selectedReview.user_id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">User:</span>
              <span class="detail-value">{{ selectedReview.user_fullname || 'Unknown' }}</span>
            </div>
            <div class="detail-item rating-item">
              <span class="detail-label">Rating:</span>
              <div class="detail-value">
                <div class="rating-display-large" :style="{ '--rating': selectedReview.rating }"></div>
                <span class="rating-text-large">{{ selectedReview.rating }}/5</span>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Comment:</span>
              <div class="detail-value comment-full">
                {{ selectedReview.comment || 'No comment' }}
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Review Date:</span>
              <span class="detail-value">{{ selectedReview.review_date || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Created:</span>
              <span class="detail-value">{{ selectedReview.created_at || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Updated:</span>
              <span class="detail-value">{{ selectedReview.updated_at || 'N/A' }}</span>
            </div>
            <div v-if="selectedReview.deleted_at" class="detail-item">
              <span class="detail-label">Deleted:</span>
              <span class="detail-value text-danger">{{ selectedReview.deleted_at }}</span>
            </div>
          </div>
        </div>
       
        <div class="modal-footer">
          <VaButton color="secondary" @click="closeView" aria-label="Close modal">
            Close
          </VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted, ref } from 'vue';
import type { DataTableColumnSource } from 'vuestic-ui';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';
import ReviewForm from './ReviewForm.vue';
import ReviewEdit from './ReviewEdit.vue';
import Loader from '../../../../components/Loader.vue';
interface Review {
  id: number;
  property_id: number;
  property_title: string;
  user_id: number;
  user_fullname: string;
  rating: number;
  comment: string | null;
  review_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}
export default defineComponent({
  name: 'ReviewList',
  components: {
    ReviewForm,
    ReviewEdit,
    Loader,
  },
 
  setup() {
    // Mobile responsiveness
    const windowWidth = ref(window.innerWidth);
    const onResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener('resize', onResize);
      retryFetch();
    });
    onUnmounted(() => {
      window.removeEventListener('resize', onResize);
    });
    const isMobile = computed(() => windowWidth.value < 768);
    // Reactive data
    const columns = ref<DataTableColumnSource<string>[]>([
      { key: 'sn', sortable: false, label: 'SN', width: '60px' },
      { key: 'property_title', sortable: true, label: 'Property' },
      { key: 'user_fullname', sortable: true, label: 'User' },
      { key: 'rating', sortable: true, label: 'Rating', width: '100px' },
      { key: 'comment', sortable: true, label: 'Comment' },
      { key: 'review_date', sortable: true, label: 'Date', width: '100px' },
      { key: 'actions', label: 'Actions', sortable: false, width: '140px' },
    ]);
    const reviews = ref<Review[]>([]);
    const loadingReviews = ref(false);
    const errorMessage = ref<string | null>(null);
    const pagination = ref<Pagination>({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    });
    const addEditForm = ref(false);
    const showView = ref(false);
    const selectedReview = ref<Review | null>(null);
    const formMode = ref<'add' | 'edit'>('add');
    const componentKey = ref(0);
    const deleting = ref(false);
    const submitting = ref(false);
    const searchQuery = ref('');
   
    const perPageOptions = ref([
      { value: 10, text: '10' },
      { value: 25, text: '25' },
      { value: 50, text: '50' },
    ]);
    // Computed pagination pages
    const paginationPages = computed(() => {
      const pages: number[] = [];
      const lastPage = pagination.value.last_page;
      const current = pagination.value.current_page || 1;
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
    });
    // Methods
    const fetchWithRetry = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            errorMessage.value = 'Failed to load reviews. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    };
    const retryFetch = async () => {
      errorMessage.value = null;
      await getReviews({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
    };
    const getReviews = async (params: { page?: number; per_page?: number; search?: string } = {}) => {
      if (addEditForm.value) return; // Don't fetch if forms are open
     
      loadingReviews.value = true;
      try {
        const requestParams = {
          page: params.page || pagination.value.current_page || 1,
          per_page: params.per_page || pagination.value.per_page || 10,
          search: params.search || searchQuery.value || '',
        };
        console.log('Fetching reviews...', requestParams);
        const response = await fetchWithRetry(() =>
          makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews`,
            method: 'get',
            requiresAuth: true,
            params: requestParams,
          })
        );
        if (response && response.status === 200) {
          let userFullname = 'Unknown';
          try {
            const userData = localStorage.getItem('userData');
            if (userData) {
              const parsedData = JSON.parse(userData);
              userFullname = `${parsedData.first_name || ''} ${parsedData.last_name || ''}`.trim() || 'Unknown';
            }
          } catch (error) {
            console.error('Failed to parse userData from localStorage:', error);
          }
          reviews.value = response.data.data.map((review: any) => ({
            id: review.id,
            property_id: Number(review.property_id),
            property_title: review.property_title || 'None',
            user_id: Number(review.user_id),
            user_fullname: review.user_fullname || (review.user ? `${review.user.first_name || ''} ${review.user.last_name || ''}`.trim() : userFullname),
            rating: Number(review.rating),
            comment: review.comment || null,
            review_date: review.review_date ? format(new Date(review.review_date), 'd MMMM yyyy') : 'N/A',
            created_at: review.created_at ? format(new Date(review.created_at), 'd MMMM yyyy') : 'N/A',
            updated_at: review.updated_at ? format(new Date(review.updated_at), 'd MMMM yyyy') : 'N/A',
            deleted_at: review.deleted_at ? format(new Date(review.deleted_at), 'd MMMM yyyy') : null,
          }));
          pagination.value = {
            total: response.data.pagination?.total || response.data.data.length || 0,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: Math.ceil((response.data.pagination?.total || response.data.data.length || 0) / (response.data.pagination?.per_page || params.per_page || 10)),
            from: (response.data.pagination?.total || response.data.data.length || 0) > 0 ? ((response.data.pagination?.current_page || params.page || 1) - 1) * (response.data.pagination?.per_page || params.per_page || 10) + 1 : 0,
            to: Math.min((response.data.pagination?.current_page || params.page || 1) * (response.data.pagination?.per_page || params.per_page || 10), response.data.pagination?.total || response.data.data.length || 0),
          };
          if (response.data.data.length === 0 && !addEditForm.value) {
            Swal.fire({
              title: 'Info',
              text: 'No reviews found. Add some reviews to get started.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        } else {
          throw new Error(response?.data?.message || 'Failed to fetch reviews.');
        }
      } catch (error: any) {
        console.error('getReviews error:', error);
        let errorMsg = error.response?.data?.message || 'Failed to fetch reviews.';
        if (error.message.includes('Network Error')) {
          errorMsg = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.message.includes('Invalid JSON response')) {
          errorMsg = 'Server returned an invalid response. Please check the server configuration.';
        }
        if (!addEditForm.value) { // Only show error if forms are not open
          errorMessage.value = errorMsg;
          Swal.fire({
            title: 'Error!',
            text: errorMsg,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } finally {
        loadingReviews.value = false;
      }
    };
    const debouncedSearch = debounce(() => {
      if (loadingReviews.value || addEditForm.value) return;
      pagination.value.current_page = 1;
      getReviews({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    }, 300);
    const clearSearch = () => {
      if (addEditForm.value) return;
      searchQuery.value = '';
      pagination.value.current_page = 1;
      getReviews({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };
    const handlePageChange = async (page: number) => {
      if (loadingReviews.value || addEditForm.value) return;
      pagination.value.current_page = page || 1;
      await getReviews({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };
    const handlePerPageChange = async (perPage: number) => {
      if (loadingReviews.value || addEditForm.value) return;
      pagination.value.per_page = perPage || 10;
      pagination.value.current_page = 1;
      await getReviews({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };
    const openForm = (review: Review | null = null, mode: 'add' | 'edit' = 'add') => {
      selectedReview.value = review;
      formMode.value = mode;
      addEditForm.value = true;
      componentKey.value += 1; // Force re-render
    };
    const closeForm = async () => {
      selectedReview.value = null;
      addEditForm.value = false;
      formMode.value = 'add';
     
      // Refresh data when closing form
      await getReviews({
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
        search: searchQuery.value,
      });
      componentKey.value += 1;
    };
    const cancelAdding = () => {
      closeForm();
    };
    const openView = (review: Review) => {
      if (addEditForm.value) return; // Prevent opening modal when forms are active
      selectedReview.value = review;
      showView.value = true;
    };
    const closeView = () => {
      selectedReview.value = null;
      showView.value = false;
    };
    const confirmDelete = (review: Review) => {
      if (addEditForm.value) return; // Prevent delete when forms are open
      selectedReview.value = review;
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the review for property "${review.property_title}" by "${review.user_fullname || 'Unknown'}". This action cannot be undone.`,
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
          handleDelete();
        }
      });
    };
    const handleDelete = async () => {
      if (!selectedReview.value?.id || deleting.value || addEditForm.value) return;
      deleting.value = true;
     
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews/${selectedReview.value.id}`,
          method: 'delete',
          requiresAuth: true,
        });
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Review has been deleted successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          selectedReview.value = null;
          componentKey.value += 1;
          await getReviews({
            page: pagination.value.current_page,
            per_page: pagination.value.per_page,
            search: searchQuery.value,
          });
        } else {
          throw new Error(response.data?.message || 'Failed to delete review.');
        }
      } catch (err: any) {
        console.error('Delete error:', err);
        let errorMessage = err.response?.data?.message || 'Failed to delete review.';
        if (err.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
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
        deleting.value = false;
      }
    };
    const debouncedHandleSubmit = debounce(async (payload: any, mode: 'add' | 'edit') => {
      if (submitting.value) return;
      submitting.value = true;
     
      try {
        let response;
        if (mode === 'add') {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews`,
            method: 'post',
            requiresAuth: true,
            data: payload,
          });
        } else {
          response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews/${selectedReview.value!.id}`,
            method: 'put',
            requiresAuth: true,
            data: { id: selectedReview.value!.id, ...payload },
          });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Review has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          closeForm();
        } else {
          let errorMessage = response.data?.message || (mode === 'add' ? 'Failed to create review.' : 'Failed to update review.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage = Object.values(response.data.errors).flat().join('; ');
            if (errorMessage.includes('already submitted a review')) {
              errorMessage = 'You have already submitted a review for this property. Please edit your existing review.';
            }
          }
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err);
        let errorMessage = err.response?.data?.message || (mode === 'add' ? 'Failed to create review.' : 'Failed to update review.');
        if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage = Object.values(err.response.data.errors).flat().join('; ');
          if (errorMessage.includes('already submitted a review')) {
            errorMessage = 'You have already submitted a review for this property. Please edit your existing review.';
          }
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 4000,
        });
      } finally {
        submitting.value = false;
      }
    }, 1000, { leading: true, trailing: false });
    return {
      // Reactive refs
      columns,
      reviews,
      loadingReviews,
      errorMessage,
      pagination,
      addEditForm,
      showView,
      selectedReview,
      formMode,
      componentKey,
      deleting,
      submitting,
      searchQuery,
      perPageOptions,
     
      // Computed
      paginationPages,
      isMobile,
     
      // Methods
      retryFetch,
      getReviews,
      debouncedSearch,
      clearSearch,
      handlePageChange,
      handlePerPageChange,
      openForm,
      closeForm,
      cancelAdding,
      openView,
      closeView,
      confirmDelete,
      handleDelete,
      debouncedHandleSubmit,
    };
  },
});
</script>
<style lang="scss" scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-4 {
  padding: 0.75rem;
  @media screen and (min-width: 768px) {
    padding: 1.5rem;
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
  gap: 1rem;
  padding: 1.5rem;
  text-align: center;
  @media screen and (min-width: 640px) {
    flex-direction: row;
    text-align: left;
  }
  .error-text {
    color: #ef4444;
    font-size: 0.875rem;
    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
  .retry-button {
    min-height: 40px;
    width: 100%;
    max-width: 120px;
    @media screen and (min-width: 640px) {
      width: auto;
    }
  }
}
.controls-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  // When forms are open, adjust controls layout
  &[data-forms-open="true"] {
    @media screen and (min-width: 768px) {
      justify-content: flex-end;
    }
  }
}
.search-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    flex: 1;
  }
  .search-input {
    width: 100%;
    @media screen and (min-width: 640px) {
      max-width: 20rem;
    }
  }
  .clear-button {
    min-height: 40px;
    flex-shrink: 0;
    @media screen and (min-width: 640px) {
      white-space: nowrap;
    }
  }
}
.action-buttons-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: stretch;
  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
  .per-page-select {
    width: 100%;
    max-width: 8rem;
    @media screen and (min-width: 640px) {
      width: auto;
    }
  }
  .add-button,
  .done-button {
    min-height: 40px;
    flex: 1;
    @media screen and (min-width: 640px) {
      flex: none;
      white-space: nowrap;
    }
    // Loading state for done button
    &.va-button--loading {
      opacity: 0.7;
    }
  }
}
.no-data-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
  @media screen and (min-width: 768px) {
    padding: 4rem 2rem;
    gap: 1.5rem;
  }
  .no-data-icon {
    font-size: 3rem;
  }
  .no-data-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    @media screen and (min-width: 768px) {
      font-size: 1.25rem;
    }
  }
  .no-data-subtitle {
    font-size: 0.875rem;
  }
  .no-data-action {
    min-height: 44px;
    width: 100%;
    max-width: 200px;
    @media screen and (min-width: 768px) {
      width: auto;
    }
  }
}
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 1rem;
  :deep(.va-data-table) {
    min-width: 800px;
  }
  :deep(.va-data-table__table) {
    table-layout: auto;
  }
  :deep(.va-data-table__table-th) {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.5rem 0.25rem;
    background-color: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    color: #374151;
    &[data-key="sn"] {
      width: 60px;
      min-width: 60px;
    }
    &[data-key="rating"] {
      min-width: 100px;
    }
    &[data-key="property_title"],
    &[data-key="user_fullname"] {
      min-width: 120px;
    }
    &[data-key="comment"] {
      min-width: 150px;
    }
    &[data-key="review_date"] {
      min-width: 100px;
    }
    &[data-key="actions"] {
      width: 140px;
      min-width: 140px;
    }
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem 0.25rem;
    vertical-align: middle;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.75rem 0.5rem;
    }
  }
  :deep(.va-data-table__table-tr:hover) {
    background-color: #f8fafc;
  }
  .property-title,
  .user-name {
    font-weight: 500;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
  .date-cell {
    font-size: 0.75rem;
    white-space: nowrap;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
  .rating-display {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    .rating-stars {
      display: flex;
      width: 60px;
      height: 12px;
      background: linear-gradient(90deg, #fbbf24 var(--rating, 0%), #d1d5db var(--rating, 0%));
      border-radius: 2px;
      overflow: hidden;
      &::before {
        content: '★★★★★';
        background: linear-gradient(90deg, #fbbf24 var(--rating, 0%), #9ca3af var(--rating, 0%));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 12px;
        line-height: 12px;
      }
    }
    .rating-text {
      font-weight: 600;
      font-size: 0.75rem;
      min-width: 30px;
      text-align: right;
      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
      }
    }
  }
  .comment-preview {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    font-size: 0.75rem;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      max-width: 200px;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
  .action-buttons {
    display: flex;
    gap: 0.25rem;
    justify-content: center;
    .view-btn,
    .edit-btn,
    .delete-btn {
      min-height: 36px;
      padding: 0.25rem;
      flex: 1;
      @media screen and (min-width: 768px) {
        flex: none;
        padding: 0.375rem 0.5rem;
      }
    }
  }
}
.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
.pagination-info {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
  @media screen and (min-width: 768px) {
    font-size: 0.875rem;
    text-align: left;
  }
}
.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
  @media screen and (min-width: 768px) {
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .va-button {
    min-height: 40px;
    font-size: 0.75rem;
    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
}
/* Forms Container - Takes full width when visible */
.forms-container {
  width: 100%;
  margin-top: 1rem;
 
  // Add visual separation when forms are open
  &::before {
    content: '';
    display: block;
    height: 1px;
    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
    margin: 1rem 0;
  }
  @media screen and (min-width: 768px) {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
}
/* Modal styles remain the same */
.modal-container {
  .modal-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .modal-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
    text-align: center;
    @media screen and (min-width: 768px) {
      font-size: 1.25rem;
      text-align: left;
    }
  }
  .modal-content {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
    @media screen and (min-width: 768px) {
      max-height: 70vh;
      padding-right: 1rem;
    }
  }
  .detail-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f5f9;
    &:last-child {
      border-bottom: none;
    }
    @media screen and (min-width: 768px) {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
      padding: 1rem 0;
    }
    &.rating-item {
      @media screen and (min-width: 768px) {
        align-items: flex-start;
      }
    }
  }
  .detail-label {
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
    @media screen and (min-width: 768px) {
      min-width: 100px;
      flex-shrink: 0;
    }
  }
  .detail-value {
    flex: 1;
    color: #4b5563;
    font-size: 0.875rem;
    word-break: break-word;
    &.comment-full {
      white-space: pre-wrap;
      line-height: 1.5;
    }
    &.text-danger {
      color: #dc2626;
    }
  }
  .rating-display-large {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-right: 0.5rem;
    &::before {
      content: '★★★★★';
      font-size: 1.25rem;
      background: linear-gradient(90deg, #fbbf24 var(--rating, 0%), #9ca3af var(--rating, 0%));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
  .rating-text-large {
    font-weight: 700;
    font-size: 1rem;
    color: #fbbf24;
  }
  .modal-footer {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    @media screen and (min-width: 768px) {
      justify-content: flex-end;
    }
    .va-button {
      min-height: 44px;
      width: 100%;
      max-width: 120px;
      @media screen and (min-width: 768px) {
        width: auto;
      }
    }
  }
}
// Mobile-specific adjustments
@media (max-width: 640px) {
  .p-4 {
    padding: 0.5rem;
  }
  .controls-container {
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .search-section {
    .search-input {
      font-size: 0.75rem;
    }
    .clear-button {
      font-size: 0.75rem;
    }
  }
  .action-buttons-container {
    .add-button,
    .done-button {
      font-size: 0.75rem;
    }
  }
  .table-responsive {
    :deep(.va-data-table) {
      min-width: 600px;
    }
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.625rem;
      padding: 0.375rem 0.125rem;
    }
    .property-title,
    .user-name {
      max-width: 100px;
      font-size: 0.625rem;
    }
    .comment-preview {
      max-width: 80px;
      font-size: 0.625rem;
    }
    .date-cell {
      font-size: 0.625rem;
    }
    .rating-display {
      .rating-stars {
        width: 50px;
        height: 10px;
        &::before {
          font-size: 10px;
          line-height: 10px;
        }
      }
      .rating-text {
        font-size: 0.625rem;
        min-width: 25px;
      }
    }
    .action-buttons {
      gap: 0.125rem;
      .view-btn,
      .edit-btn,
      .delete-btn {
        min-height: 32px;
        padding: 0.125rem;
      }
    }
  }
  .pagination-container {
    gap: 0.5rem;
    padding-top: 0.75rem;
    .pagination-info {
      font-size: 0.625rem;
    }
    .pagination-controls {
      .va-button {
        font-size: 0.625rem;
        min-height: 36px;
        padding: 0.25rem 0.5rem;
      }
    }
  }
  .forms-container {
    margin-top: 0.75rem;
  }
  .modal-container {
    .modal-title {
      font-size: 1rem;
    }
    .detail-grid {
      gap: 0.5rem;
    }
    .detail-item {
      padding: 0.5rem 0;
      gap: 0.125rem;
      .detail-label,
      .detail-value {
        font-size: 0.75rem;
      }
    }
    .rating-display-large::before {
      font-size: 1rem;
    }
    .rating-text-large {
      font-size: 0.875rem;
    }
  }
}
@media (max-width: 480px) {
  .table-responsive {
    :deep(.va-data-table) {
      min-width: 500px;
    }
    :deep(.va-data-table__table-th),
    :deep(.va-data-table__table-td) {
      font-size: 0.5rem;
      padding: 0.25rem 0.1rem;
    }
    .property-title,
    .user-name {
      max-width: 80px;
      font-size: 0.5rem;
    }
    .comment-preview {
      max-width: 60px;
      font-size: 0.5rem;
    }
    .date-cell {
      font-size: 0.5rem;
    }
    .rating-display {
      .rating-stars {
        width: 40px;
        height: 8px;
        &::before {
          font-size: 8px;
          line-height: 8px;
        }
      }
      .rating-text {
        font-size: 0.5rem;
        min-width: 20px;
      }
    }
    .action-buttons {
      .view-btn,
      .edit-btn,
      .delete-btn {
        min-height: 28px;
      }
    }
  }
  .pagination-controls .va-button {
    font-size: 0.5rem;
    min-height: 32px;
    padding: 0.2rem 0.4rem;
  }
  .modal-container {
    .detail-item {
      .detail-label,
      .detail-value {
        font-size: 0.625rem;
      }
    }
  }
}
</style>