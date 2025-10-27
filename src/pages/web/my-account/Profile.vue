<template>
  <div class="account-home min-h-screen bg-gray-100">
    <div class="activity-section max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <!-- Breadcrumb Navigation -->
      <nav class="breadcrumb mb-6" aria-label="breadcrumb">
        <ol class="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <router-link to="/" class="text-blue-600 hover:underline">Home</router-link>
          </li>
          <li class="text-gray-400">></li>
          <li>
            <router-link to="/account" class="text-blue-600 hover:underline">Account</router-link>
          </li>
          <li class="text-gray-400">></li>
          <li class="font-semibold text-gray-700" aria-current="page">Profile</li>
        </ol>
      </nav>

      <h2 class="text-2xl font-bold text-gray-900 mb-6">Profile</h2>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading text-center p-6">
        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600">Loading profile...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="showError" class="error-message text-center p-6">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="fetchProfile"
            aria-label="Retry loading profile"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- No Data State -->
      <div v-else-if="!profile" class="no-data text-center p-6">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <h3 class="text-2xl font-bold text-gray-900 mb-2">No Profile Data</h3>
          <p class="text-gray-600 mb-6">Unable to load profile information.</p>
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            @click="fetchProfile"
            aria-label="Retry loading profile"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Profile Card -->
      <div v-else class="profile-card bg-white rounded-2xl shadow-xl p-6 max-w-lg mx-auto">
        <div class="flex items-center space-x-4 mb-6">
          <!-- Avatar -->
          <div
            class="avatar w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          >
            {{ profile.first_name?.charAt(0) }}{{ profile.last_name?.charAt(0) }}
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              {{ profile.first_name }} {{ profile.last_name }}
            </h3>
            <p class="text-gray-500">{{ profile.role || 'N/A' }}</p>
          </div>
        </div>
        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <i class="bi bi-person text-gray-500"></i>
            <p><span class="font-semibold">Username:</span> {{ profile.username || 'N/A' }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <i class="bi bi-envelope text-gray-500"></i>
            <p><span class="font-semibold">Email:</span> {{ profile.email || 'N/A' }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <i class="bi bi-telephone text-gray-500"></i>
            <p><span class="font-semibold">Phone:</span> {{ profile.phone || 'N/A' }}</p>
          </div>
        </div>
        <button
          class="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          @click="fetchProfile"
          aria-label="Refresh profile"
        >
          Refresh Profile
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../stores/auth-store';
import { AuthMiddleware } from '../../../utils/authMiddleware';
import makeRequest from '../../../services/makeRequest';

// Define an interface for the Profile object for better type safety
interface Profile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
}

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(true);
const showError = ref(false);
const errorMessage = ref('');
const profile = ref<Profile | null>(null);

const fetchProfile = async () => {
  isLoading.value = true;
  showError.value = false;
  errorMessage.value = '';

  if (!authStore.isAuthenticated) {
    authStore.clearAuthData();
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/profile`,
      headers: { Authorization: `Bearer ${authStore.token}` },
      requiresAuth: true,
    });

    console.log('Profile API Response:', response);

    const userData = response.data?.data || null;

    if (userData) {
      profile.value = {
        username: userData.username || 'N/A',
        first_name: userData.first_name || 'N/A',
        last_name: userData.last_name || 'N/A',
        email: userData.email || 'N/A',
        phone: userData.phone || 'N/A',
        role: userData.role || 'N/A',
      };
    } else {
      console.warn('Profile data not found in response:', response.data);
      profile.value = null;
      showError.value = true;
      errorMessage.value = 'Could not find profile data in the server response.';
    }

    console.log('Processed profile:', profile.value);
  } catch (error: any) {
    console.error('Error fetching profile:', error.response || error);
    showError.value = true;
    errorMessage.value = error.response?.data?.error || error.response?.data?.message || 'Failed to fetch profile.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  console.log('Profile mounted, checking auth:', {
    isAuthenticated: authStore.isAuthenticated,
    userId: authStore.userProfile?.id,
    token: authStore.token,
  });
  if (!AuthMiddleware.isSessionValid()) {
    console.log('Session invalid on mount, redirecting to login');
    authStore.clearAuthData();
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  fetchProfile();
});
</script>

<style lang="css" scoped>
.account-home {
  @apply p-4 sm:p-6;
}

.activity-section {
  @apply bg-white p-6 rounded-2xl shadow-lg;
}

.breadcrumb {
  @apply mb-6;
}

.breadcrumb ol {
  @apply flex items-center space-x-2 text-sm text-gray-500;
}

.breadcrumb-link {
  @apply text-blue-600 hover:underline;
}

h2 {
  @apply text-2xl font-bold text-gray-900 mb-6;
}

.loading .spinner {
  @apply w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4;
}

.loading p {
  @apply text-gray-600;
}

.error-message .error-content i {
  @apply block;
}

.no-data .cta-button {
  @apply inline-flex items-center;
}

.profile-card {
  @apply bg-white rounded-2xl shadow-xl p-6 max-w-lg mx-auto;
}

.avatar {
  @apply w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>