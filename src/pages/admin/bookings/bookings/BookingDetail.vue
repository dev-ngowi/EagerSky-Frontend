<template>
  <div class="p-4">
    <h1 class="text-xl font-bold">Booking Details</h1>
    <div v-if="loading" class="text-center py-2 text-sm text-gray-500">
      Loading booking details...
    </div>
    <div v-else-if="booking" class="mt-4">
      <p><strong>ID:</strong> {{ booking.id }}</p>
      <p><strong>Property:</strong> {{ booking.property_title || 'N/A' }}</p>
      <p><strong>Client:</strong> {{ booking.client_fullname || 'Anonymous' }}</p>
      <p><strong>Agent:</strong> {{ booking.agent_fullname || 'N/A' }}</p>
      <p><strong>Appointment Type:</strong> {{ booking.appointment_type_name || 'N/A' }}</p>
      <p><strong>Date:</strong> {{ booking.date }}</p>
      <p><strong>Time Slot:</strong> {{ booking.time_slot }}</p>
      <p><strong>Duration:</strong> {{ booking.duration }} minutes</p>
      <p><strong>Status:</strong> {{ booking.status }}</p>
      <p><strong>Created At:</strong> {{ booking.created_at }}</p>
    </div>
    <div v-else class="text-center py-2 text-sm text-gray-500">
      Booking not found
    </div>
    <VaButton
      preset="primary"
      class="mt-4"
      :to="{ name: 'bookings' }"
    >
      Back to Bookings
    </VaButton>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import makeRequest from '../../../../services/makeRequest';
import Swal from 'sweetalert2';

const route = useRoute();
const booking = ref<any>(null);
const loading = ref<boolean>(true);
const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'https://e1.japango.co.tz';

onMounted(async () => {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/api/v1/bookings/${route.params.id}`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        Accept: 'application/json',
      },
    });
    if (response.status === 200) {
      booking.value = response.data.data;
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: response.data?.message || 'Failed to fetch booking details',
      });
    }
  } catch (error: any) {
    console.error('Failed to fetch booking:', error.response?.data || error.message);
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      icon: 'error',
      title: error.response?.data?.message || 'Failed to fetch booking details',
    });
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.p-4 {
  padding: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.text-xl {
  font-size: 1.25rem;
}
.font-bold {
  font-weight: 700;
}
.text-sm {
  font-size: 0.875rem;
}
.text-gray-500 {
  color: #6b7280;
}
</style>