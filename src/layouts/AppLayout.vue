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
        :is-sidebar-minimized="isSidebarMinimized"
        @toggle-sidebar="toggleSidebar"
      />
    </template>
   
    <!-- Sidebar -->
    <template #left>
      <AppSidebar
        :visible="isSidebarOpen"
        :minimized="isSidebarMinimized"
        :mobile="isMobile"
        @update:visible="isSidebarOpen = $event"
      />
    </template>
   
    <!-- Page Content -->
    <template #content>
      <div :class="{ minimized: isSidebarMinimized && !isMobile }" class="app-layout__sidebar-wrapper">
        <!-- Use existing navigation if available, otherwise show our breadcrumb -->
        <AppLayoutNavigation 
          v-if="!isMobile && !useCustomBreadcrumb" 
          class="navigation-wrapper" 
        />
        
        <!-- Content Container -->
        <div class="content-container">
          <!-- Custom Breadcrumb Section (only when AppLayoutNavigation is not used) -->
          <div v-if="useCustomBreadcrumb" class="breadcrumb-section">
            <div class="breadcrumb-wrapper">
              <VaBreadcrumbs
                :items="breadcrumbItems"
                separator="/"
                class="custom-breadcrumb"
              >
                <template #separator>
                  <VaIcon name="chevron_right" size="small" color="secondary" />
                </template>
                <template #item="{ item, isLast }">
                  <router-link 
                    v-if="item.to && !isLast" 
                    :to="item.to" 
                    class="breadcrumb-link"
                  >
                    <div class="breadcrumb-item">
                      <VaIcon 
                        v-if="item.icon" 
                        :name="item.icon" 
                        size="small" 
                        color="secondary"
                        class="breadcrumb-icon"
                      />
                      <span class="text-secondary">{{ item.label }}</span>
                    </div>
                  </router-link>
                  <div v-else class="breadcrumb-item breadcrumb-item--active">
                    <VaIcon 
                      v-if="item.icon" 
                      :name="item.icon" 
                      size="small" 
                      color="primary"
                      class="breadcrumb-icon"
                    />
                     <div class="page-header">
            <div class="page-title-wrapper">
              <h1 class="page-title">{{ currentPageTitle }}</h1>
              <p class="page-subtitle" v-if="currentPageSubtitle">{{ currentPageSubtitle }}</p>
            </div>
            <div class="page-actions" v-if="hasPageActions">
              <slot name="page-actions"></slot>
            </div>
          </div>
                    <span class="text-primary font-semibold">{{ item.label }}</span>
                  </div>
                </template>
              </VaBreadcrumbs>
            </div>
          </div>
         
          <!-- Main Content -->
          <main class="main-content">
            <div class="content-wrapper">
              <router-view />
            </div>
          </main>
        </div>
      </div>
    </template>
  </VaLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useBreakpoint } from 'vuestic-ui';
import AppNavbar from '../components/navbar/AppNavbar.vue';
import AppSidebar from '../components/sidebar/AppSidebar.vue';
import AppLayoutNavigation from '../components/app-layout-navigation/AppLayoutNavigation.vue';
import { useGlobalStore } from '../stores/global-store';

const globalStore = useGlobalStore();
const route = useRoute();
const { mdDown, smDown } = useBreakpoint();

const isMobile = computed(() => mdDown.value);
const isSmallScreen = computed(() => smDown.value);
const isSidebarOpen = ref(!isMobile.value);
const isSidebarMinimized = computed(() => globalStore.isSidebarMinimized);

// Props for page customization
const props = defineProps({
  hasPageActions: {
    type: Boolean,
    default: false
  },
  useCustomBreadcrumb: {
    type: Boolean,
    default: false // Set to true to use custom breadcrumb instead of AppLayoutNavigation
  }
});

// Computed properties for page info
const currentPageTitle = computed(() => {
  return route.meta?.title || 'Dashboard';
});

const currentPageSubtitle = computed(() => {
  return route.meta?.subtitle || '';
});

// Dynamic breadcrumb generation
const breadcrumbItems = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean);
  const items = [
    { label: 'Home', to: '/', icon: 'home' }
  ];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Format segment name (capitalize and replace dashes with spaces)
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    items.push({
      label,
      to: isLast ? undefined : currentPath,
      icon: isLast ? route.meta?.icon : undefined
    });
  });

  return items;
});

const toggleSidebar = () => {
  if (isMobile.value) {
    isSidebarOpen.value = !isSidebarOpen.value;
  } else {
    globalStore.toggleSidebar();
    isSidebarOpen.value = !globalStore.isSidebarMinimized;
  }
};

// Watch for mobile changes to reset sidebar state
watch(isMobile, (newIsMobile) => {
  isSidebarOpen.value = !newIsMobile;
  if (!newIsMobile) {
    globalStore.isSidebarMinimized = false;
  }
});
</script>

<style lang="scss" scoped>
.app-layout__sidebar-wrapper {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  
  &.minimized {
    margin-left: 0;
  }
}

.navigation-wrapper {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--va-background-border);
  width: 100%;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--va-background-secondary);
  width: 100%;
  max-width: 100%;
}

.breadcrumb-section {
  background: var(--va-background-primary);
  border-bottom: 1px solid var(--va-background-border);
  padding: 0.5rem 1.5rem;
  width: 100%;
}

.breadcrumb-wrapper {
  max-width: 100%;
  margin: 0;
  width: 100%;
}

.custom-breadcrumb {
  width: 100%;
  
  :deep(.va-breadcrumbs) {
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    white-space: nowrap;
    width: 100%;
  }
  
  :deep(.va-breadcrumbs__item) {
    margin-right: 0.25rem;
  }
  
  :deep(.va-breadcrumbs__separator) {
    margin: 0 0.25rem;
  }
}

.breadcrumb-link {
  text-decoration: none;
  display: inline-flex;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--va-background-secondary);
    
    .breadcrumb-item {
      color: var(--va-primary);
    }
  }
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  
  &--active {
    background: linear-gradient(135deg, var(--va-primary), var(--va-primary-dark));
    color: var(--va-white);
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(var(--va-primary-rgb), 0.3);
    
    .breadcrumb-icon {
      color: var(--va-white) !important;
    }
    
    span {
      color: var(--va-white) !important;
    }
  }
}

.breadcrumb-icon {
  flex-shrink: 0;
}

.page-header {
  background: var(--va-background-primary);
  padding: 1.5rem 1.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}

.page-title-wrapper {
  max-width: 100%;
  flex: 1;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--va-text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--va-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.page-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

.content-wrapper {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  
  :deep(.va-card) {
    margin-bottom: 0.75rem;
    width: 100%;
    max-width: 100%;
  }
  
  :deep(.bg-white),
  :deep(.shadow-md),
  :deep(.rounded-lg) {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  :deep(.row) {
    margin-left: 0;
    margin-right: 0;
    width: 100%;
    max-width: 100%;
    
    .flex {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
  }
  
  :deep(.va-table-wrapper),
  :deep(.va-data-table) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    max-width: 100%;
  }
  
  :deep(.va-form) {
    width: 100%;
    
    .va-input-wrapper {
      margin-bottom: 0.5rem;
      width: 100%;
    }
  }
  
  :deep(.maintenance-request-container) {
    width: 100%;
    max-width: 100%;
  }
}

:deep(.va-layout__area--content) {
  width: 100%;
  max-width: 100%;
}

.main-content {
  scroll-behavior: smooth;
}

.content-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  width: 100%;
}

.content-enter-active,
.content-leave-active {
  transition: all 0.3s ease;
}

.content-enter-from,
.content-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

* {
  box-sizing: border-box;
}

.app-layout__sidebar-wrapper,
.content-container,
.main-content,
.content-wrapper {
  max-width: 100% !important;
  width: 100% !important;
}

/* Media Queries for Responsive Design */
@media (max-width: 768px) {
  .navigation-wrapper {
    padding: 0.75rem 1rem;
  }
  
  .breadcrumb-section {
    padding: 0.5rem 1rem;
  }
  
  .page-header {
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-actions {
    justify-content: flex-end;
    width: 100%;
    margin-top: 0.5rem;
  }
  
  .main-content {
    padding: 0.75rem;
  }
  
  :deep(.va-table-wrapper),
  :deep(.va-data-table) {
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  :deep(.va-card) {
    margin-bottom: 0.5rem;
  }
}

@media (max-width: 480px) {
  .breadcrumb-section {
    padding: 0.5rem 0.75rem;
  }
  
  .custom-breadcrumb {
    :deep(.va-breadcrumbs) {
      font-size: 0.8125rem;
    }
  }
  
  .breadcrumb-item {
    padding: 0.2rem 0.4rem;
    font-size: 0.8125rem;
    gap: 0.2rem;
  }
  
  .page-header {
    padding: 0.75rem;
  }
  
  .page-title {
    font-size: 1.25rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }
  
  .page-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .main-content {
    padding: 0.5rem;
  }
  
  :deep(.row) {
    .flex {
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }
  }
  
  :deep(.va-form) {
    .va-input-wrapper {
      margin-bottom: 0.25rem;
    }
  }
}
</style>