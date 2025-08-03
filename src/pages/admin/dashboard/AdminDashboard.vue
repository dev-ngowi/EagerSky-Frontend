<template>
  <template v-if="loadingProfile || loadingStats">
    <div class="loadingSpiner">
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
import { defineComponent, ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../../../stores/auth-store'
import Loader from '../../../components/Loader.vue'
import DataSection from './DataSection.vue'

export default defineComponent({
  components: {
    Loader,
    DataSection,
  },
  setup() {
    const authStore = useAuthStore()
    const loadingProfile = ref(true)
    const loadingStats = ref(true)

    watch(loadingProfile, (value) => console.log('loadingProfile:', value))
    watch(loadingStats, (value) => console.log('loadingStats:', value))

    const fetchUserProfile = async () => {
      try {
        const response = await authStore.getUserProfile()
        console.log('User profile response:', response)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        loadingProfile.value = false
      }
    }

    const fetchStats = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        loadingStats.value = false
      }
    }

    onMounted(async () => {
      await Promise.all([fetchUserProfile(), fetchStats()])
    })

    return {
      loadingProfile,
      loadingStats,
    }
  },
})
</script>

<style lang="scss" scoped>
.loadingSpiner {
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
