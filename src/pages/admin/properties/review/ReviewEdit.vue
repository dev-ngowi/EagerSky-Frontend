<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ $t('Edit Review') }}</h2>
    <form v-if="review" @submit.prevent="submitForm">
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
            :loading="loadingProperties"
            :disabled="true"
            required
          />
        </div>
        <div class="mb-4">
          <VaSelect
            v-model="form.rating"
            label="Rating"
            placeholder="Select rating"
            :options="ratingOptions"
            :error-messages="errors.rating ? [errors.rating] : []"
            value-by="value"
            text-by="text"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.comment"
            label="Comment"
            placeholder="Enter comment (optional)"
            :error-messages="errors.comment ? [errors.comment] : []"
            :disabled="isSubmitting"
            type="textarea"
            autosize
            :min-rows="3"
            :max-rows="6"
          />
        </div>
        <div class="mb-4">
          <label for="review_date" class="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
          <input
            id="review_date"
            v-model="reviewDateString"
            type="date"
            class="w-full p-2 border rounded-md focus:ring focus:ring-blue-300 disabled:bg-gray-100"
            :disabled="isSubmitting"
            :class="{ 'border-red-500': errors.review_date }"
          />
          <p v-if="errors.review_date" class="text-red-500 text-sm mt-1">{{ errors.review_date }}</p>
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
    <div v-else class="text-red-500">No review data available.</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { FormData, Errors, Payload, Review } from '../../../../types/review';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

export default defineComponent({
  name: 'ReviewEdit',
  props: {
    review: {
      type: Object as () => Review | null,
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
      form: {
        property_id: this.review ? Number(this.review.property_id) : null,
        rating: this.review ? Number(this.review.rating) : null,
        comment: this.review ? this.review.comment || '' : '',
        review_date: this.review && this.review.review_date ? new Date(this.review.review_date) : null,
      } as FormData,
      errors: {
        property_id: '',
        rating: '',
        comment: '',
        review_date: '',
        user_id: '',
      } as Errors,
      properties: [] as { value: number; text: string }[],
      ratingOptions: [
        { value: 1, text: '1' },
        { value: 2, text: '2' },
        { value: 3, text: '3' },
        { value: 4, text: '4' },
        { value: 5, text: '5' },
      ],
      loadingProperties: false,
      isSubmitting: false,
    };
  },
  computed: {
    reviewDateString: {
      get(): string {
        return this.form.review_date ? this.form.review_date.toISOString().split('T')[0] : '';
      },
      set(value: string) {
        this.form.review_date = value ? new Date(value) : null;
      },
    },
  },
  async mounted() {
    if (!this.review) {
      Swal.fire({
        title: 'Error!',
        text: 'No review data provided for editing.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      this.$emit('close');
      return;
    }
    try {
      await this.fetchProperties();
      this.validatePropertyId();
    } catch (error) {
      console.error('Mounted error:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to load properties.',
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  },
  methods: {
    async fetchProperties() {
      this.loadingProperties = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          this.properties = response.data.data.map((property: any) => {
            const title = property.title && typeof property.title === 'string' && property.title.trim()
              ? property.title
              : `Unnamed Property (ID: ${property.id})`;
            return {
              value: Number(property.id),
              text: title,
            };
          });
          this.validatePropertyId();
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
        console.error('fetchProperties error:', error.message, error.response?.data);
        this.errors.property_id = 'Failed to load properties';
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to fetch properties.',
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
    validatePropertyId() {
      if (this.form.property_id && !this.properties.some(p => p.value === this.form.property_id)) {
        this.form.property_id = null;
        this.errors.property_id = 'Selected property is invalid';
      }
    },
    async submitForm() {
      if (this.isSubmitting || !this.review) return;
      this.errors = {
        property_id: '',
        rating: '',
        comment: '',
        review_date: '',
        user_id: '',
      };

      let userId: number | null = null;
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          userId = Number(parsedData.id) || null;
        }
      } catch (error) {
        console.error('Failed to parse userData from localStorage:', error);
      }

      if (!userId) {
        this.errors.user_id = 'User ID is required. Please log in again.';
        Swal.fire({
          title: 'Error!',
          text: 'User ID is missing. Please log in again.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      if (!this.form.property_id) this.errors.property_id = 'Property is required';
      if (!this.form.rating) this.errors.rating = 'Rating is required';
      if (this.form.comment && this.form.comment.length > 1000)
        this.errors.comment = 'Comment must not exceed 1000 characters';
      if (!this.form.review_date) this.errors.review_date = 'Review date is required';
      if (this.form.review_date && isNaN(this.form.review_date.getTime()))
        this.errors.review_date = 'Invalid date';
      if (this.form.review_date && this.form.review_date > new Date())
        this.errors.review_date = 'Review date cannot be in the future';

      if (Object.values(this.errors).some((error) => error)) {
        return;
      }

      this.isSubmitting = true;
      try {
        const payload: Payload = {
          property_id: this.form.property_id!,
          rating: this.form.rating!,
          comment: this.form.comment || null,
          review_date: this.form.review_date ? this.form.review_date.toISOString().split('T')[0] : null,
          user_id: userId,
        };

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/reviews/${this.review.id}`,
          method: 'put',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: payload,
        });

        if (response.status === 200) {
          Swal.fire({
            title: 'Success!',
            text: 'Review updated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          this.resetForm();
          this.$emit('submit', payload, 'edit');
          this.$emit('close');
        }
      } catch (error: any) {
        console.error('Submission error:', error.response?.data || error.message);
        let errorMessage = error.response?.data?.message || 'Failed to update review.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).flat().join('; ');
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
        this.isSubmitting = false;
      }
    },
    resetForm() {
      this.form = {
        property_id: this.review ? Number(this.review.property_id) : null,
        rating: this.review ? Number(this.review.rating) : null,
        comment: this.review ? this.review.comment || '' : '',
        review_date: this.review && this.review.review_date ? new Date(this.review.review_date) : null,
      };
      this.errors = {
        property_id: '',
        rating: '',
        comment: '',
        review_date: '',
        user_id: '',
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