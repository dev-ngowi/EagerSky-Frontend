<template>
  <template v-if="loadingProfile || loadingStats">
    <div class="loadingSpinner">
      <Loader :loading-text="'Loading dashboard...'" />
    </div>
  </template>
  <template v-else>
    <section class="flex flex-col gap-4">
      <DataSection />
    </section>
  </template>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth-store';
import Loader from '../../../components/Loader.vue';
import DataSection from './DataSection.vue';
import { useToast } from 'vuestic-ui';

export default defineComponent({
  components: {
    Loader,
    DataSection,
  },
  setup() {
    const authStore = useAuthStore();
    const { init } = useToast();
    const loadingProfile = ref(true);
    const loadingStats = ref(true);

    watch(loadingProfile, (value) => console.log('loadingProfile:', value));
    watch(loadingStats, (value) => console.log('loadingStats:', value));

    const fetchUserProfile = async () => {
      try {
        const response = JSON.parse(localStorage.getItem('userData') || '{}');
        console.log('User profile fetched successfully:', response);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        init({ message: 'Failed to load user profile. Displaying dashboard with available data.', color: 'warning' });
      } finally {
        loadingProfile.value = false;
      }
    };

    const fetchStats = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error fetching stats:', error);
        init({ message: 'Failed to load stats. Using default values.', color: 'warning' });
      } finally {
        loadingStats.value = false;
      }
    };

    onMounted(async () => {
      // Check if token exists before fetching profile
      if (!authStore.token) {
        console.warn('No auth token found, skipping profile fetch');
        init({ message: 'No authentication token found. Please log in again.', color: 'danger' });
        loadingProfile.value = false;
        await fetchStats();
      } else {
        await Promise.all([fetchUserProfile(), fetchStats()]);
      }
    });

    return {
      loadingProfile,
      loadingStats,
    };
  },
});
</script>

<style lang="scss" scoped>
.loadingSpinner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.nav-item {
  display: flex;
  flex-direction: column;
  padding: var(--va-collapse-padding);
  transition: all 0.2s ease-in;

  &:hover {
    background-color: var(--va-background-element);
  }
}
</style>