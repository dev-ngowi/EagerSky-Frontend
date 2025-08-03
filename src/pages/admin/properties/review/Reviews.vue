<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property or comment"
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
          Add
        </VaButton>
      </div>
    </div>
    <template v-if="!addEditForm">
      <VaDataTable
        :key="componentKey"
        :items="reviews"
        striped
        :columns="columns"
        :loading="loadingReviews"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:currentPage="handlePageChange"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(rating)="{ rowData }"> {{ rowData.rating }} / 5 </template>
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
          {{ pagination.total }} reviews
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
      <ReviewForm v-if="formMode === 'add'" @close="closeForm" @submit="handleSubmit" />
      <ReviewEdit
        v-if="formMode === 'edit'"
        :review="selectedReview"
        @close="closeForm"
        @submit="handleSubmit"
      />
    </template>

    <!-- View Modal -->
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Review Details') }}</div>
      <div v-if="selectedReview" class="space-y-2">
        <p><strong>Property ID:</strong> {{ selectedReview.property_id }}</p>
        <p><strong>Property Title:</strong> {{ selectedReview.property_title || 'None' }}</p>
        <p><strong>User ID:</strong> {{ selectedReview.user_id }}</p>
        <p><strong>User:</strong> {{ selectedReview.user_fullname || 'Unknown' }}</p>
        <p><strong>Rating:</strong> {{ selectedReview.rating }} / 5</p>
        <p><strong>Comment:</strong> {{ selectedReview.comment || 'None' }}</p>
        <p><strong>Review Date:</strong> {{ selectedReview.review_date }}</p>
        <p><strong>Created At:</strong> {{ selectedReview.created_at }}</p>
        <p><strong>Updated At:</strong> {{ selectedReview.updated_at }}</p>
        <p v-if="selectedReview.deleted_at"><strong>Deleted At:</strong> {{ selectedReview.deleted_at }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ReviewForm from './ReviewForm.vue';
import ReviewEdit from './ReviewEdit.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';
import { format } from 'date-fns';

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
}

export default defineComponent({
  name: 'ReviewList',
  components: {
    ReviewForm,
    ReviewEdit,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'user_fullname', sortable: true, label: 'User' },
        { key: 'rating', sortable: true, label: 'Rating' },
        { key: 'comment', sortable: true, label: 'Comment' },
        { key: 'review_date', sortable: true, label: 'Review Date' },
        { key: 'created_at', sortable: true, label: 'Created At' },
        { key: 'actions', label: 'Actions', sortable: false },
      ],
      reviews: [] as Review[],
      loadingReviews: false,
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      } as Pagination,
      addEditForm: false,
      showView: false,
      selectedReview: null as Review | null,
      formMode: 'add' as 'add' | 'edit' | 'view',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedHandleSubmit: undefined as ((...args: any[]) => void) | undefined,
      debouncedSearch: undefined as ((...args: any[]) => void) | undefined,
    };
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
    this.debouncedSearch = debounce(this.handleSearch, 500);
  },
  methods: {
    async getReviews(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingReviews = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || 1,
            per_page: params.per_page || this.pagination.per_page,
            search: params.search || '',
          },
        });
        console.log('getReviews response:', response);
        if (response.status === 200) {
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

          this.reviews = response.data.data.map((review: any) => ({
            id: review.id,
            property_id: Number(review.property_id),
            property_title: review.property_title || 'None',
            user_id: Number(review.user_id),
            user_fullname: review.user_fullname || (review.user ? `${review.user.first_name || ''} ${review.user.last_name || ''}`.trim() : userFullname),
            rating: Number(review.rating),
            comment: review.comment || 'None',
            review_date: review.review_date
              ? format(new Date(review.review_date), 'd MMMM yyyy')
              : 'None',
            created_at: format(new Date(review.created_at), 'd MMMM yyyy'),
            updated_at: format(new Date(review.updated_at), 'd MMMM yyyy'),
            deleted_at: review.deleted_at ? format(new Date(review.deleted_at), 'd MMMM yyyy') : null,
          }));
          this.pagination = {
            total: response.data.pagination?.total || response.data.data.length,
            per_page: response.data.pagination?.per_page || params.per_page || 10,
            current_page: response.data.pagination?.current_page || params.page || 1,
            last_page: response.data.pagination?.last_page || 1,
          };
          if (response.data.data.length === 0) {
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
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to fetch reviews.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (error: any) {
        console.error('getReviews error:', error.message, error.response?.data);
        Swal.fire({
          title: 'Error!',
          text:
            error.message.includes('Invalid JSON response')
              ? 'Server returned an invalid response. Please check the server configuration.'
              : error.response?.data?.message || 'Failed to fetch reviews.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 5000,
        });
      } finally {
        this.loadingReviews = false;
      }
    },

    async addReview(payload: any) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        console.log('addReview response:', response);
        return response;
      } catch (error: any) {
        console.error('addReview error:', error.response?.data || error.message);
        throw error;
      }
    },

    async updateReview(payload: any) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews/${payload.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: payload,
        });
        console.log('updateReview response:', response);
        return response;
      } catch (error: any) {
        console.error('updateReview error:', error.response?.data || error.message);
        throw error;
      }
    },

    async deleteReview(id: number) {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews/${id}`,
          method: 'delete',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        console.log('deleteReview response:', response);
        return response;
      } catch (error: any) {
        console.error('deleteReview error:', error.response?.data || error.message);
        throw error;
      }
    },

    openForm(review: Review | null = null, mode: 'add' | 'edit' = 'add') {
      this.selectedReview = review;
      this.formMode = mode;
      this.addEditForm = true;
    },

    closeForm() {
      this.selectedReview = null;
      this.addEditForm = false;
      this.formMode = 'add';
      this.getReviews({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
      this.componentKey += 1;
    },

    openView(review: Review) {
      this.selectedReview = review;
      this.showView = true;
    },

    closeView() {
      this.selectedReview = null;
      this.showView = false;
    },

    confirmDelete(review: Review) {
      this.selectedReview = review;
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
        timer: undefined,
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
      if (!this.selectedReview?.id) return;
      this.deleting = true;
      try {
        const response = await this.deleteReview(this.selectedReview.id);
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Review has been deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedReview = null;
          this.componentKey += 1;
          await this.getReviews({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.data?.message || 'Failed to delete review.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      } catch (err: any) {
        console.error('Delete error:', err.response?.data || err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to delete review.',
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

    async handleSubmit(payload: any, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response;
        if (mode === 'add') {
          response = await this.addReview(payload);
        } else {
          response = await this.updateReview({ id: this.selectedReview!.id, ...payload });
        }
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Review has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.closeForm();
          // Cancel debounce to allow immediate subsequent submissions
          if (this.debouncedHandleSubmit) {
            (this.debouncedHandleSubmit as any).cancel();
            this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false });
          }
        } else {
          let errorMessage =
            response.data?.message || (mode === 'add' ? 'Failed to create review.' : 'Failed to update review.');
          if (response.status === 422 && response.data?.errors) {
            errorMessage = Object.values(response.data.errors).flat().join('; ');
            if (errorMessage.includes('already submitted a review')) {
              errorMessage = 'You have already submitted a review for this property. Please edit your existing review.';
            }
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
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response?.data || err);
        let errorMessage =
          err.response?.data?.message || (mode === 'add' ? 'Failed to create review.' : 'Failed to update review.');
        if (err.response?.status === 422 && err.response?.data?.errors) {
          errorMessage = Object.values(err.response.data.errors).flat().join('; ');
          if (errorMessage.includes('already submitted a review')) {
            errorMessage = 'You have already submitted a review for this property. Please edit your existing review.';
          }
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
        this.submitting = false;
      }
    },

    async handlePageChange(page: number) {
      await this.getReviews({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },

    async handleSearch() {
      await this.getReviews({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
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