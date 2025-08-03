<template>
  <VaSidebar
    v-model:visible="visibleSidebar"
    :width="sidebarWidth"
    :color="color"
    :minimized-width="minimizedWidth"
    :minimized="isSidebarMinimized"
    :mobile="mobile"
    :overlay="mobile"
    :overlay-opacity="0.6"
    class="va-sidebar transition-sidebar"
    :class="{ 'va-sidebar--visible': visibleSidebar }"
    @overlay-click="closeSidebar"
  >
    <div v-if="mobile" class="sidebar-close-button">
      <VaButton icon="va-close" size="small" preset="plain" @click="closeSidebar" />
    </div>

    <VaAccordion v-model="value" multiple>
      <VaCollapse v-for="(route, index) in navigationRoutes" :key="route.name || index">
        <template #header="{ value: isCollapsed }">
          <VaSidebarItem
            :to="route.children ? undefined : (route.name ? { name: route.name } : undefined)"
            :active="routeHasActiveChild(route)"
            :active-color="activeColor"
            :text-color="textColor(route)"
            role="button"
            hover-opacity="0.10"
            @click="handleItemClick"
          >
            <VaSidebarItemContent class="py-2 pl-4 pr-2 flex items-center">
              <VaIcon
                v-if="route.meta?.icon"
                :name="route.meta.icon"
                :color="iconColor(route)"
                class="mr-3"
                size="20px"
              />
              <VaSidebarItemTitle class="text-sm">
                {{ t(route.displayName) || route.displayName }}
                <VaIcon v-if="route.children" :name="arrowDirection(isCollapsed)" size="16px" class="ml-2" />
              </VaSidebarItemTitle>
            </VaSidebarItemContent>
          </VaSidebarItem>
        </template>

        <template #body>
          <div v-for="(childRoute, index2) in route.children" :key="childRoute.name || index2">
            <VaCollapse v-if="childRoute.children">
              <template #header="{ value: isChildCollapsed }">
                <VaSidebarItem
                  :active="routeHasActiveChild(childRoute)"
                  :active-color="activeColor"
                  :text-color="textColor(childRoute)"
                  hover-opacity="0.10"
                >
                  <VaSidebarItemContent class="py-2 pl-10 pr-2 flex items-center">
                    <VaIcon
                      v-if="childRoute.meta?.icon"
                      :name="childRoute.meta.icon"
                      size="16px"
                      :color="iconColor(childRoute)"
                      class="mr-3"
                    />
                    <VaSidebarItemTitle class="text-sm">
                      {{ t(childRoute.displayName) || childRoute.displayName }}
                      <VaIcon :name="arrowDirection(isChildCollapsed)" size="16px" class="ml-2" />
                    </VaSidebarItemTitle>
                  </VaSidebarItemContent>
                </VaSidebarItem>
              </template>
              <template #body>
                <div v-for="(grandchildRoute, index3) in childRoute.children" :key="grandchildRoute.name || index3">
                  <VaSidebarItem
                    :to="grandchildRoute.name ? { name: grandchildRoute.name } : undefined"
                    :active="isActiveChildRoute(grandchildRoute)"
                    :active-color="activeColor"
                    :text-color="textColor(grandchildRoute)"
                    hover-opacity="0.10"
                    @click="handleItemClick"
                  >
                    <VaSidebarItemContent class="py-2 pl-14 pr-2 flex items-center">
                      <VaIcon
                        v-if="grandchildRoute.meta?.icon"
                        :name="grandchildRoute.meta.icon"
                        size="16px"
                        :color="iconColor(grandchildRoute)"
                        class="mr-3"
                      />
                      <VaSidebarItemTitle class="text-sm">
                        {{ t(grandchildRoute.displayName) || grandchildRoute.displayName }}
                      </VaSidebarItemTitle>
                    </VaSidebarItemContent>
                  </VaSidebarItem>
                </div>
              </template>
            </VaCollapse>
            <VaSidebarItem
              v-else
              :to="childRoute.name ? { name: childRoute.name } : undefined"
              :active="isActiveChildRoute(childRoute)"
              :active-color="activeColor"
              :text-color="textColor(childRoute)"
              hover-opacity="0.10"
              @click="handleItemClick"
            >
              <VaSidebarItemContent class="py-2 pl-10 pr-2 flex items-center">
                <VaIcon
                  v-if="childRoute.meta?.icon"
                  :name="childRoute.meta.icon"
                  size="16px"
                  :color="iconColor(childRoute)"
                  class="mr-3"
                />
                <VaSidebarItemTitle class="text-sm">
                  {{ t(childRoute.displayName) || childRoute.displayName }}
                </VaSidebarItemTitle>
              </VaSidebarItemContent>
            </VaSidebarItem>
          </div>
        </template>
      </VaCollapse>
    </VaAccordion>

    <VaSpacer />

    <VaSidebarItem
      v-if="hasSettingsAccess"
      :to="{ name: settingsRouteName }"
      :active="currentRouteName === settingsRouteName"
      :active-color="activeColor"
      :text-color="currentRouteName === settingsRouteName ? 'primary' : '#495057'"
      @click="handleItemClick"
    >
      <VaSidebarItemContent class="py-2 pl-4 pr-2 flex items-center">
        <VaIcon name="settings" size="20px" :color="currentRouteName === settingsRouteName ? 'primary' : '#495057'" class="mr-3" />
        <VaSidebarItemTitle class="text-sm">
          {{ t('Settings') || 'Settings' }}
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
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
  visible: Boolean,
  mobile: Boolean,
  minimized: Boolean,
});

const emit = defineEmits(['update:visible']);

const { getColor, colorToRgba } = useColors();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const globalStore = useGlobalStore();
const { userRole, isAuthenticated } = useAuth(); // Import isAuthenticated

const value = ref<boolean[]>([]);

const navigationRoutes = computed(() => {
  const navigation = getNavigationByRole(userRole.value);
  return navigation.getRoutes() || [];
});

const hasSettingsAccess = computed(() => {
  return ['admin', 'landlord', 'tenant'].includes(userRole.value);
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
      return null; // This case is unreachable due to UserRole type
  }
});

const currentRouteName = computed(() => route.name?.toString() || null);

const visibleSidebar = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const isSidebarMinimized = computed({
  get: () => globalStore.isSidebarMinimized || (props.mobile && !props.visible),
  set: (val) => { globalStore.isSidebarMinimized = val },
});

const isActiveChildRoute = (child: INavigationRoute) => currentRouteName.value === child.name;

const routeHasActiveChild = (section: INavigationRoute): boolean => {
  if (!section.children) return currentRouteName.value === section.name;
  return section.children.some(child =>
    child.children
      ? child.children.some(grand => currentRouteName.value === grand.name)
      : currentRouteName.value === child.name
  );
};

const setActiveExpand = () => {
  value.value = navigationRoutes.value.map(route => routeHasActiveChild(route));
};

const sidebarWidth = computed(() => (props.mobile ? '80vw' : '240px'));
const minimizedWidth = computed(() => '0');
const color = computed(() => '#e6e6e6');
const activeColor = computed(() => colorToRgba(getColor('primary'), 0.1));
const iconColor = (route: INavigationRoute) => (routeHasActiveChild(route) ? 'primary' : '#495057');
const textColor = (route: INavigationRoute) => (routeHasActiveChild(route) ? 'primary' : '#495057');
const arrowDirection = (state: boolean) => (state ? 'va-arrow-up' : 'va-arrow-down');

const handleItemClick = () => {
  if (props.mobile) {
    visibleSidebar.value = false;
  }
};

const closeSidebar = () => {
  visibleSidebar.value = false;
};

watch(
  () => route.name,
  () => {
    setActiveExpand();
  },
  { immediate: true }
);

watch(
  () => userRole.value,
  () => {
    setActiveExpand();
  },
  { immediate: true }
);

watch(
  () => visibleSidebar.value,
  (newVal) => {
    const overlay = document.querySelector('.va-layout__area--overlay');
    if (overlay) {
      if (!newVal) {
        overlay.classList.add('hide-overlay');
      } else {
        overlay.classList.remove('hide-overlay');
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (!isAuthenticated.value) {
    visibleSidebar.value = false;
    router.push({ name: 'login' });
  }
  setActiveExpand();
});
</script>

<style lang="scss" scoped>
.va-sidebar {
  transition: all 0.3s ease !important;
  width: 265px !important;
  background-color: #e6e6e6 !important;
  border-right: 1px solid #e9ecef !important;
  z-index: 2000 !important;
  &.va-sidebar--minimized {
    width: 0 !important;
    background-color: transparent !important;
    border-right: none !important;
    overflow: hidden !important;
  }
  @media screen and (max-width: 640px) {
    position: fixed !important;
    top: 5%;
    left: 0;
    height: 100vh;
    transform: translateX(-100%) !important;
    width: 0 !important;
    background-color: transparent !important;
    &.va-sidebar--visible {
      transform: translateX(0) !important;
      width: 80vw !important;
      max-width: 280px !important;
      background-color: #e6e6e6 !important;
      border-right: 1px solid #e9ecef !important;
    }
  }
}

.va-layout__area--overlay {
  background-color: rgba(0, 0, 0, 0.5) !important;
  z-index: 1999 !important;
  &.hide-overlay {
    display: none !important;
  }
}
</style>