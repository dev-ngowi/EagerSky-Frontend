<template>
  <VaNavbar class="app-layout-navbar py-2 px-0">
    <template #left>
      <div class="left">
        <div v-if="isMobile" class="mobile-menu-toggle">
          <VaButton
            preset="plain"
            color="secondary"
            :icon="sidebarOpen ? 'close' : 'menu'"
            size="medium"
            class="mobile-menu-btn"
            @click="$emit('toggle-sidebar')"
            aria-label="Toggle sidebar"
          />
        </div>

        <div class="brand-section">
          <EagerLogo class="admin_logo" />
          <h3 v-if="!isMobile || isMediumMobile" class="app-title">
            Eager<span class="accent-color">Sky</span>
          </h3>
        </div>

        <VaIconMenuCollapsed
          v-if="!isMobile"
          class="cursor-pointer MenuCollapsed"
          :class="{ 'x-flip': !isSidebarMinimized }"
          :color="collapseIconColor"
          @click="$emit('toggle-sidebar')"
        />
      </div>
    </template>

    <template #right>
      <AppNavbarActions class="app-navbar__actions" :is-mobile="isMobile" />
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';
import AppNavbarActions from './components/AppNavbarActions.vue';
import VaIconMenuCollapsed from '../icons/VaIconMenuCollapsed.vue';
import EagerLogo from '../EagerLogo.vue';

const props = defineProps({
  isMobile: { type: Boolean, default: false },
  sidebarOpen: { type: Boolean, default: false },
  isSidebarMinimized: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle-sidebar']);

const collapseIconColor = computed(() => '#FFFFFF');
const isMediumMobile = computed(() => window.innerWidth > 1024);
</script>

<style lang="scss" scoped>
$navbar-bg: #0a2540;
$accent-color: #2563eb;
$white: #ffffff;
$breakpoint-mobile: 768px;
$breakpoint-small: 480px;
$breakpoint-x-small: 360px;

.app-layout-navbar {
  background-color: $navbar-bg !important;
  color: $white;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  min-height: 60px;
  padding: 0.75rem 1.5rem !important;
  width: 100%;

  @media screen and (max-width: $breakpoint-mobile) {
    padding: 0.5rem 0.75rem !important;
  }
}

.left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;

  @media screen and (max-width: $breakpoint-mobile) {
    gap: 0.75rem;
  }

  @media screen and (max-width: $breakpoint-small) {
    gap: 0.25rem;
  }
}

.accent-color {
  color: $accent-color;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.app-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: $white;
  margin: 0;
  white-space: nowrap;
  line-height: 1;

  @media screen and (max-width: 1024px) {
    display: none !important;
  }
}

.admin_logo {
  flex-shrink: 0;
  overflow: hidden; 
  border-radius: 50%;
  transition: all 0.3s ease;
  width: 58px;
  height: 48px;

  @media screen and (max-width: $breakpoint-mobile) {
    width: 100px !important;
    height: 40px !important;
  }

  @media screen and (max-width: $breakpoint-x-small) {
    width: 36px !important;
    height: 36px !important;
  }
}

.MenuCollapsed {
  margin-left: 1rem;
  font-size: 24px;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  color: $white;
  cursor: pointer;
}

.mobile-menu-toggle {
  display: none;

  @media screen and (max-width: $breakpoint-mobile) {
    display: flex;
  }
}

:deep(.mobile-menu-btn) {
  min-width: 44px !important;
  height: 44px !important;

  @media screen and (max-width: $breakpoint-small) {
    min-width: 40px !important;
    height: 40px !important;
    padding: 6px !important;

    .va-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }
  }
}

.app-navbar__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;

  @media screen and (max-width: $breakpoint-mobile) {
    gap: 0.5rem;
  }

  @media screen and (max-width: $breakpoint-small) {
    gap: 0.15rem;
  }
}
</style>