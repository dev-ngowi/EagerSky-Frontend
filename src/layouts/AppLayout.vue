<template>
  <VaLayout
    :top="{ fixed: true, order: 2 }"
    :left="{ fixed: true, absolute: isMobile, order: 1, overlay: isMobile && isSidebarOpen }"
    @leftOverlayClick="isSidebarOpen = false"
  >
    <!-- Navbar -->
    <template #top>
      <AppNavbar
        :is-mobile="isMobile"
        :sidebar-open="isSidebarOpen"
        :is-sidebar-minimized="!isSidebarOpen && !isMobile"
        @toggle-sidebar="toggleSidebar"
      />
    </template>

    <!-- Sidebar -->
    <template #left>
      <AppSidebar
        :visible="isSidebarOpen"
        :minimized="!isSidebarOpen || isMobile" 
        :mobile="isMobile"
        @update:visible="isSidebarOpen = $event"
      />
    </template>

    <!-- Page Content -->
    <template #content>
      <div :class="{ minimized: !isSidebarOpen && !isMobile }" class="app-layout__sidebar-wrapper">
        <AppLayoutNavigation v-if="!isMobile" class="p-6" />
        <main class="content">
          <RouterView />
        </main>
      </div>
    </template>
  </VaLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBreakpoint } from 'vuestic-ui'
import AppNavbar from '../components/navbar/AppNavbar.vue'
import AppSidebar from '../components/sidebar/AppSidebar.vue'
import AppLayoutNavigation from '../components/app-layout-navigation/AppLayoutNavigation.vue'
import { useGlobalStore } from '../stores/global-store'

const globalStore = useGlobalStore()
const { mdDown } = useBreakpoint()
const isMobile = computed(() => mdDown.value)
const isSidebarOpen = ref(!isMobile.value) // Default to closed on mobile, open on desktop

const toggleSidebar = () => {
  if (isMobile.value) {
    isSidebarOpen.value = !isSidebarOpen.value
  } else {
    globalStore.toggleSidebar()
  }
}

// Watch for mobile changes to reset sidebar state
watch(isMobile, (newIsMobile) => {
  isSidebarOpen.value = !newIsMobile
})
</script>