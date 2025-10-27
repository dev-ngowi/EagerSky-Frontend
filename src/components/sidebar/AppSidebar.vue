<template>
  <VaSidebar
    v-model:visible="visibleSidebar"
    :width="sidebarWidth"
    :color="color"
    :minimized-width="minimizedWidth"
    :minimized="isSidebarMinimized"
    :mobile="mobile"
    :overlay="mobile"
    :overlay-opacity="0.7"
    class="va-sidebar compact"
    :class="{ 'va-sidebar--visible': visibleSidebar, 'va-sidebar--expanded': isAnySubmenuOpen }"
    @overlay-click="closeSidebar"
  >
    <!-- Compact Sidebar Header -->
    <div class="sidebar-header">
      <h2 v-if="hasAdminAccess">{{ t('adminPanel') }}</h2>
      <h2 v-if="hasLandlordAccess">{{ t('landlordPanel') }}</h2>
      
      <div v-if="mobile" class="sidebar-close-button">
        <VaButton icon="va-close" size="small" preset="plain" color="white" @click="closeSidebar" />
      </div>
    </div>

    <!-- Navigation Content -->
    <div class="sidebar-nav">
      <div v-if="isLoading" class="loading text-center">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
      <div v-else-if="!navigationRoutes || navigationRoutes.length === 0" class="no-routes text-center">
        <p>No items available.</p>
      </div>
      <div v-else class="nav-items">
        <div v-for="(route, index) in navigationRoutes" :key="getRouteKey(route, index)" class="parent-collapse">
          <div class="parent-item">
            <VaSidebarItem
              :to="route.children ? undefined : (route.name ? { name: route.name } : undefined)"
              :active="routeHasActiveChild(route)"
              :active-color="activeColor"
              :text-color="textColor(route)"
              role="button"
              @click="handleItemClick(route, index, $event)"
              class="parent-content"
            >
              <div class="nav-item-wrapper">
                <div class="nav-item-left">
                  <VaIcon
                    v-if="route.meta?.icon"
                    :name="route.meta.icon"
                    :color="iconColor(route)"
                    class="nav-icon parent-icon"
                    size="20px"
                  />
                  <VaSidebarItemTitle class="nav-title parent-title">
                    {{ t(route.displayName) || route.displayName }}
                  </VaSidebarItemTitle>
                </div>
                <VaIcon 
                  v-if="route.children" 
                  :name="isOpen(getRouteKey(route, index)) ? 'va-arrow-up' : 'va-arrow-down'" 
                  size="16px" 
                  class="nav-arrow"
                  :color="iconColor(route)"
                />
              </div>
            </VaSidebarItem>
          </div>
          <div v-if="route.children && isOpen(getRouteKey(route, index))" class="children-container">
            <div v-for="(childRoute, childIndex) in route.children" :key="getRouteKey(childRoute, childIndex)" class="child-item-wrapper">
              <div v-if="childRoute.children" class="child-collapse">
                <VaSidebarItem
                  :active="routeHasActiveChild(childRoute)"
                  :active-color="activeColor"
                  :text-color="textColor(childRoute)"
                  class="child-item"
                  @click="handleItemClick(childRoute, childIndex, $event)"
                >
                  <div class="nav-item-wrapper">
                    <div class="nav-item-left">
                      <div class="child-connector"></div>
                      <VaIcon
                        v-if="childRoute.meta?.icon"
                        :name="childRoute.meta.icon"
                        size="16px"
                        :color="iconColor(childRoute)"
                        class="nav-icon child-icon"
                      />
                      <VaSidebarItemTitle class="nav-title child-title">
                        {{ t(childRoute.displayName) || childRoute.displayName }}
                      </VaSidebarItemTitle>
                    </div>
                    <VaIcon 
                      :name="isOpen(getRouteKey(childRoute, childIndex)) ? 'va-arrow-up' : 'va-arrow-down'" 
                      size="14px" 
                      class="nav-arrow child-arrow"
                      :color="iconColor(childRoute)"
                    />
                  </div>
                </VaSidebarItem>
                <div v-if="isOpen(getRouteKey(childRoute, childIndex))" class="grandchildren-container">
                  <div v-for="(grandchildRoute, grandchildIndex) in childRoute.children" 
                    :key="getRouteKey(grandchildRoute, grandchildIndex)" 
                    class="grandchild-item-wrapper"
                  >
                    <VaSidebarItem
                      :to="grandchildRoute.name ? { name: grandchildRoute.name } : undefined"
                      :active="isActiveChildRoute(grandchildRoute)"
                      :active-color="activeColor"
                      :text-color="textColor(grandchildRoute)"
                      @click="handleItemClick(grandchildRoute, grandchildIndex, $event)"
                      class="grandchild-item"
                    >
                      <div class="nav-item-wrapper">
                        <div class="nav-item-left">
                          <div class="grandchild-connector">
                            <div class="connector-line"></div>
                            <div class="connector-dot"></div>
                          </div>
                          <VaIcon
                            v-if="grandchildRoute.meta?.icon"
                            :name="grandchildRoute.meta.icon"
                            size="14px"
                            :color="iconColor(grandchildRoute)"
                            class="nav-icon grandchild-icon"
                          />
                          <VaSidebarItemTitle class="nav-title grandchild-title">
                            {{ t(grandchildRoute.displayName) || grandchildRoute.displayName }}
                          </VaSidebarItemTitle>
                        </div>
                      </div>
                    </VaSidebarItem>
                  </div>
                </div>
              </div>
              <VaSidebarItem
                v-else
                :to="childRoute.name ? { name: childRoute.name } : undefined"
                :active="isActiveChildRoute(childRoute)"
                :active-color="activeColor"
                :text-color="textColor(childRoute)"
                @click="handleItemClick(childRoute, childIndex, $event)"
                class="child-item single-child"
              >
                <div class="nav-item-wrapper">
                  <div class="nav-item-left">
                    <div class="child-connector single"></div>
                    <VaIcon
                      v-if="childRoute.meta?.icon"
                      :name="childRoute.meta.icon"
                      size="16px"
                      :color="iconColor(childRoute)"
                      class="nav-icon child-icon"
                    />
                    <VaSidebarItemTitle class="nav-title child-title">
                      {{ t(childRoute.displayName) || childRoute.displayName }}
                    </VaSidebarItemTitle>
                  </div>
                </div>
              </VaSidebarItem>
            </div>
          </div>
        </div>

        <VaSpacer />

        <!-- Settings Item -->
        <VaSidebarItem
          v-if="hasSettingsAccess"
          :to="{ name: settingsRouteName }"
          :active="currentRouteName === settingsRouteName"
          :active-color="activeColor"
          :text-color="textColor(settingsRoute)"
          @click="handleItemClick(settingsRoute, null, $event)"
          class="settings-item"
        >
          <div class="nav-item-wrapper">
            <div class="nav-item-left">
              <VaIcon 
                name="settings" 
                size="20px" 
                :color="currentRouteName === settingsRouteName ? '#1e88e5' : '#e0e0e0'" 
                class="nav-icon settings-icon"
              />
              <VaSidebarItemTitle class="nav-title settings-title">
                {{ t('Settings') || 'Settings' }}
              </VaSidebarItemTitle>
            </div>
          </div>
        </VaSidebarItem>
      </div>
    </div>
  </VaSidebar>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useColors } from 'vuestic-ui';
import { useGlobalStore } from '../../stores/global-store';
import { getNavigationByRole } from './navigationFactory';
import { useAuth } from '../../composables/useAuth';
import type { INavigationRoute } from './navigation-types';
import type { UserRole } from '../../composables/useAuth';

const props = defineProps({
  visible: { type: Boolean, default: false },
  mobile: { type: Boolean, default: false },
  minimized: { type: Boolean, default: false },
});

const emit = defineEmits(['update:visible']);

const { getColor, colorToRgba } = useColors();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const globalStore = useGlobalStore();
const { userRole, isAuthenticated } = useAuth();

const openItems = ref<string[]>([]);
const isLoading = ref(true);

const settingsRoute = computed<INavigationRoute>(() => ({
  name: settingsRouteName.value,
  displayName: t('Settings') || 'Settings',
  meta: { icon: 'settings' },
}));

const getRouteKey = (route: INavigationRoute, index: number): string => {
  if (route.name) return `route-${route.name}`;
  if (route.path) return `route-${route.path}`;
  return `route-${index}`;
};

const isOpen = (key: string) => openItems.value.includes(key);
const isAnySubmenuOpen = computed(() => openItems.value.length > 0);

const isNavigationRoute = (route: INavigationRoute | { name: string | null }): route is INavigationRoute => {
  return (route as INavigationRoute).displayName !== undefined;
};

const handleItemClick = (route: INavigationRoute, index: number | null, event: Event) => {
  const isParent = isNavigationRoute(route) && route.children && route.children.length > 0;
  
  if (isParent && index !== null) {
    // Only toggle accordion, don't close sidebar
    toggleAccordion(route, index);
  } else {
    // Leaf node clicked - close sidebar on mobile
    if (props.mobile) {
      // Small delay to allow navigation to complete
      setTimeout(() => {
        closeSidebar();
      }, 150);
    }
  }
};

const toggleAccordion = (route: INavigationRoute, index: number) => {
  if (!route.children) return;
  const routeKey = getRouteKey(route, index);
  if (openItems.value.includes(routeKey)) {
    openItems.value = openItems.value.filter(item => item !== routeKey);
  } else {
    openItems.value = [...openItems.value, routeKey];
  }
  localStorage.setItem('sidebarOpenState', JSON.stringify(openItems.value));
};

const routeHasActiveChild = (section: INavigationRoute): boolean => {
  if (currentRouteName.value === section.name) return true;
  if (!section.children) return false;
  const hasActiveNestedChild = (routes: INavigationRoute[]): boolean => {
    return routes.some(route => {
      if (currentRouteName.value === route.name) return true;
      if (route.children && route.children.length > 0) {
        return hasActiveNestedChild(route.children);
      }
      return false;
    });
  };
  return hasActiveNestedChild(section.children);
};

const initializeOpenState = () => {
  const savedState = localStorage.getItem('sidebarOpenState');
  const persistedKeys: string[] = savedState ? JSON.parse(savedState) : [];
  const activeKeys: string[] = [];

  const findActiveRoutePaths = (routes: INavigationRoute[], parentPath: string = '') => {
    routes.forEach((route, index) => {
      const routeKey = getRouteKey(route, index);
      if (routeHasActiveChild(route)) {
        activeKeys.push(routeKey);
        if (route.children) {
          findActiveRoutePaths(route.children, routeKey);
        }
      }
    });
  };

  findActiveRoutePaths(navigationRoutes.value);
  openItems.value = [...new Set([...activeKeys, ...persistedKeys])];
};

const navigationRoutes = computed(() => {
  const navigation = getNavigationByRole(userRole.value);
  return navigation.getRoutes() || [];
});

const hasSettingsAccess = computed(() => {
  return ['admin', 'landlord', 'tenant'].includes(userRole.value);
});

const hasAdminAccess = computed(() => {
  return ['admin'].includes(userRole.value);
});

const hasLandlordAccess = computed(() => {
  return ['landlord'].includes(userRole.value);
});

const settingsRouteName = computed(() => {
  switch (userRole.value) {
    case 'admin':
      return 'admin-settings';
    case 'landlord':
      return 'landlord-settings';
    case 'tenant':
      return 'tenant-settings';
    default:
      return null;
  }
});

const currentRouteName = computed(() => route.name?.toString() || null);

const visibleSidebar = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const isSidebarMinimized = computed({
  get: () => props.minimized,
  set: (val) => { globalStore.isSidebarMinimized = val },
});

const isActiveChildRoute = (child: INavigationRoute) => currentRouteName.value === child.name;

const sidebarWidth = computed(() => {
  if (props.mobile) return '80vw';
  return isAnySubmenuOpen.value ? '280px' : '240px';
});
const minimizedWidth = computed(() => '0');
const color = computed(() => 'rgb(10, 37, 64)');
const activeColor = computed(() => colorToRgba('#1e88e5', 0.2));
const iconColor = (route: INavigationRoute) => (routeHasActiveChild(route) ? '#1e88e5' : '#e0e0e0');
const textColor = (route: INavigationRoute) => (routeHasActiveChild(route) ? '#ffffff' : '#e0e0e0');

const closeSidebar = () => {
  visibleSidebar.value = false;
};

// Close sidebar automatically when route changes on mobile
watch(
  () => route.path,
  () => {
    if (props.mobile && visibleSidebar.value) {
      closeSidebar();
    }
  }
);

// Ensure sidebar is closed when switching to mobile view
watch(
  () => props.mobile,
  (newMobile) => {
    if (newMobile) {
      closeSidebar();
    }
  },
  { immediate: true }
);

watch(
  () => route.name,
  (newRouteName) => {
    initializeOpenState();
  },
  { immediate: true }
);

watch(
  () => userRole.value,
  () => {
    initializeOpenState();
  },
  { immediate: true }
);

watch(
  navigationRoutes,
  (newRoutes) => {
    if (newRoutes.length > 0) {
      initializeOpenState();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  try {
    if (!isAuthenticated.value) {
      visibleSidebar.value = false;
      router.push({ name: 'login' });
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    initializeOpenState();
  } catch (error) {
    console.error('Sidebar initialization error:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.va-sidebar.compact {
  background: rgb(10, 37, 64);
  color: #ffffff;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2000;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
  transition: width 0.3s ease;

  &.va-sidebar--expanded {
    .nav-title {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
    }
  }

  .sidebar-header {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgb(10, 37, 64);
    box-sizing: border-box;
    min-height: 48px;

    h2 {
      margin: 0;
      padding: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
      letter-spacing: 0.02em;
    }

    .sidebar-close-button {
      display: none;

      @media (max-width: 640px) {
        display: flex;
      }

      :deep(.va-button) {
        color: #ffffff;
        background-color: rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        padding: 6px;
        min-width: 32px;
        height: 32px;
        border: none;

        &:hover {
          background-color: rgba(30, 136, 229, 0.3);
        }
      }
    }
  }

  .sidebar-nav {
    padding: 0;
    height: calc(100% - 48px);
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;

      &:hover {
        background: rgba(30, 136, 229, 0.5);
      }
    }

    .nav-items {
      padding: 8px 0;
    }

    .loading {
      padding: 20px 16px;
      text-align: center;

      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #1e88e5;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 8px;
      }

      p {
        color: #b0bec5;
        font-size: 0.8rem;
        margin: 0;
        font-weight: 400;
        line-height: 1.4;
      }
    }

    .no-routes {
      padding: 20px 16px;
      text-align: center;

      p {
        color: #b0bec5;
        font-size: 0.8rem;
        margin: 0;
        line-height: 1.5;
        font-weight: 400;
      }
    }
  }

  .nav-item-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 36px;
    padding: 6px 12px;
    transition: background 0.2s ease;
  }

  .nav-item-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 10px;
  }

  .nav-icon {
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }

  .nav-title {
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.3;
    margin: 0;
    padding: 0;
    letter-spacing: 0.01em;
    color: #e0e0e0;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .nav-arrow {
    flex-shrink: 0;
    margin-left: auto;
    transition: transform 0.2s ease;
    width: 16px;
    text-align: center;
  }

  .parent-collapse {
    margin: 2px 8px;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .parent-item {
    background: transparent;
    border: none;
    margin: 0;
    border-radius: 8px;

    &:hover {
      background: rgba(30, 136, 229, 0.15);
    }
  }

  .parent-content {
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .parent-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #ffffff;
  }

  .children-container {
    background: rgba(255, 255, 255, 0.03);
    border-left: 2px solid rgba(30, 136, 229, 0.2);
    margin-left: 16px;
    padding: 4px 0;
    transition: all 0.3s ease;
  }

  .child-item-wrapper {
    position: relative;
    margin: 1px 0;
  }

  .child-collapse {
    margin: 0;
    transition: all 0.3s ease;
  }

  .child-item {
    background: transparent;
    border: none;
    margin: 0 8px;
    border-radius: 6px;

    &:hover {
      background: rgba(30, 136, 229, 0.1);
    }
  }

  .child-content {
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .child-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: #e0e0e0;
  }

  .child-icon {
    font-size: 16px;
    color: #b0bec5;
  }

  .child-connector {
    width: 14px;
    height: 2px;
    background: rgba(30, 136, 229, 0.3);
    border-radius: 1px;
    flex-shrink: 0;
    margin-right: 8px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: -8px;
      top: -10px;
      width: 2px;
      height: 20px;
      background: rgba(30, 136, 229, 0.2);
    }

    &.single {
      background: rgba(30, 136, 229, 0.4);
    }
  }

  .grandchildren-container {
    background: rgba(255, 255, 255, 0.04);
    border-left: 2px solid rgba(100, 181, 246, 0.25);
    margin-left: 20px;
    padding: 2px 0;
    transition: all 0.3s ease;
  }

  .grandchild-item-wrapper {
    position: relative;
    margin: 1px 0;
  }

  .grandchild-item {
    background: transparent;
    border: none;
    margin: 0 8px;
    border-radius: 6px;

    &:hover {
      background: rgba(100, 181, 246, 0.1);
    }
  }

  .grandchild-content {
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .grandchild-title {
    font-size: 0.75rem;
    font-weight: 400;
    color: #cfd8dc;
  }

  .grandchild-icon {
    font-size: 14px;
    color: #b0bec5;
  }

  .grandchild-connector {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-right: 8px;
    position: relative;

    .connector-line {
      width: 10px;
      height: 1px;
      background: rgba(100, 181, 246, 0.4);
    }

    .connector-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(100, 181, 246, 0.6);
      margin-left: 2px;
    }

    &::before {
      content: '';
      position: absolute;
      left: -10px;
      top: -8px;
      width: 1px;
      height: 16px;
      background: rgba(100, 181, 246, 0.3);
    }
  }

  :deep(.va-sidebar-item--active) {
    .nav-item-wrapper {
      background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
      border-radius: 8px;
      
      .nav-icon,
      .nav-title {
        color: #ffffff;
      }
    }
  }

  .settings-item {
    margin: 8px 12px;
    border-radius: 8px;
    border-top: 1px solid rgba(30, 136, 229, 0.2);
    padding-top: 8px;

    &:hover {
      background: rgba(30, 136, 229, 0.15);
    }
  }

  .settings-content {
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .settings-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #ffffff;
  }

  :deep(.va-spacer) {
    height: 16px;
    margin: 12px 16px;
    border-top: 1px solid rgba(30, 136, 229, 0.15);
    background: none;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: -1px;
      left: 50%;
      width: 32px;
      height: 1px;
      background: linear-gradient(90deg, transparent, #1e88e5, transparent);
      transform: translateX(-50%);
    }
  }

  :deep(.va-sidebar-item) {
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    box-shadow: none;
  }

  :deep(.va-sidebar-item__content) {
    color: #ffffff;
    margin: 0;
    border-radius: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
  }

  :deep(.va-sidebar-item-content) {
    padding: 0;
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  :deep(.va-sidebar-item-title) {
    color: #e0e0e0;
    margin: 0;
    padding: 0;
    font-family: inherit;
  }

  @media screen and (max-width: 640px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-100%);
    width: 0;
    background-color: transparent;
    box-shadow: none;

    &.va-sidebar--visible {
      transform: translateX(0);
      width: min(280px, 80vw);
      background: rgb(10, 37, 64);
      border-right: 2px solid rgba(30, 136, 229, 0.25);
    }

    .sidebar-header {
      padding: 16px 20px;
      min-height: 56px;

      h2 {
        font-size: 1.4rem;
      }
    }

    .sidebar-nav {
      height: calc(100% - 56px);

      .nav-items {
        padding: 12px 0;
      }

      .nav-item-wrapper {
        padding: 8px 16px;
        gap: 12px;
      }

      .nav-icon {
        font-size: 1.1rem;
        width: 20px;
      }

      .nav-title {
        font-size: 0.9rem;
      }
    }
  }

  @media (max-width: 480px) {
    &.va-sidebar--visible {
      width: min(100vw, 260px);
    }

    .children-container {
      margin-left: 12px;
    }

    .grandchildren-container {
      margin-left: 16px;
    }

    .nav-item-wrapper {
      padding: 6px 12px;
      gap: 8px;
    }
  }

  &.va-sidebar--minimized {
    width: 0;
    background-color: transparent;
    border-right: none;
    overflow: hidden;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.va-sidebar * {
  box-sizing: border-box;
}

.va-sidebar button {
  border: none;
  outline: none;
}

.va-sidebar a {
  text-decoration: none;
}
</style>