<template>
  <VaNavbar class="app-layout-navbar py-2 px-0" style="background-color: rgb(10, 37, 64); color: #ffffff">
    <template #left>
      <div class="left">
        <!-- Mobile Menu Icon -->
        <div v-if="isMobile" class="mobile-menu-toggle">
          <VaButton
            preset="plain"
            color="#ffffff"
            :icon="sidebarOpen ? 'close' : 'menu'"
            size="medium"
            class="mobile-menu-btn"
            @click="$emit('toggle-sidebar')"
          />
        </div>

        <!-- Logo and Title -->
        <div class="brand-section">
          <EagerLogo :width="isMobile ? '32px' : '40px'" :height="isMobile ? '28px' : '40px'" class="admin_logo" />
          <h3 v-if="!isMobile" class="app-title">Eager<span style="color: #2563eb;">Sky</span></h3>
        </div>

        <!-- Desktop Menu Collapse Icon -->
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

defineProps({
  isMobile: { type: Boolean, default: false },
  sidebarOpen: Boolean,
  isSidebarMinimized: Boolean,
});

const emit = defineEmits(['toggle-sidebar']);
const collapseIconColor = computed(() => '#FFFFFF');
</script>

<style lang="scss" scoped>
.va-navbar {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: padding 0.3s ease;

  @media screen and (max-width: 640px) {
    padding: 0.5rem 0.75rem;
  }

  @media screen and (max-width: 480px) {
    padding: 0.5rem 0.5rem;
  }
}

.left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;

  @media screen and (max-width: 640px) {
    gap: 0.5rem;
    justify-content: flex-start;
  }

  @media screen and (max-width: 480px) {
    gap: 0.25rem;
  }
}

.mobile-menu-toggle {
  display: none;
  align-items: center;
  margin-right: 0.5rem;

  @media screen and (max-width: 640px) {
    display: flex;
  }

  @media screen and (max-width: 480px) {
    margin-right: 0.25rem;
  }
}

:deep(.mobile-menu-btn) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  padding: 8px !important;
  min-width: 40px !important;
  height: 40px !important;
  transition: all 0.3s ease !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;

  &:hover {
    background-color: rgba(30, 136, 229, 0.3) !important;
    transform: scale(1.05) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
  }

  &:active {
    transform: scale(0.95) !important;
    background-color: rgba(255, 255, 255, 0.25) !important;
  }

  .va-icon {
    color: #ffffff !important;
    font-size: 22px !important;
    width: 22px !important;
    height: 22px !important;
  }

  @media screen and (max-width: 480px) {
    min-width: 36px !important;
    height: 36px !important;
    padding: 6px !important;

    .va-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }
  }
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media screen and (max-width: 640px) {
    gap: 0.25rem;
  }

  @media screen and (max-width: 480px) {
    gap: 0.15rem;
  }
}

.admin_logo {
  font-weight: 700;
  color: white;
  border-radius: 48%;
  transition: all 0.3s ease;
  flex-shrink: 0;

  @media screen and (max-width: 640px) {
    width: 32px;
    height: 28px;
  }

  @media screen and (max-width: 480px) {
    width: 28px;
    height: 24px;
  }
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  white-space: nowrap;

  @media screen and (max-width: 768px) {
    font-size: 1.2rem;
  }
}

.MenuCollapsed {
  margin-left: 1rem;
  transition: transform 0.3s ease;
  flex-shrink: 0;

  @media screen and (max-width: 768px) {
    margin-left: 0.5rem;
  }
}

.app-navbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  @media screen and (max-width: 640px) {
    gap: 0.25rem;
  }

  @media screen and (max-width: 480px) {
    gap: 0.15rem;

    & > * {
      padding: 0.15rem;
    }
  }
}

@media screen and (max-width: 640px) {
  .left {
    position: relative;
    z-index: 10;
    gap: 0.5rem;
  }

  .app-title {
    display: none !important;
  }

  .admin_logo {
    width: 32px;
    height: 28px;
  }

  .mobile-menu-toggle {
    position: relative;
    z-index: 11;
    margin-right: 0.5rem;
  }
}

@media screen and (max-width: 320px) {
  .left {
    gap: 0.2rem;
  }

  .mobile-menu-toggle {
    margin-right: 0.15rem;
  }

  .admin_logo {
    width: 24px;
    height: 20px;
  }
}
</style>