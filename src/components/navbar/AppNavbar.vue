<template>
  <VaNavbar class="app-layout-navbar py-2 px-0" style="background-color: #0a2540; color: #ffffff">
    <template #left>
      <div class="left">
        <EagerLogo :width="isMobile ? '32px' : '50px'" :height="isMobile ? '28px' : '50px'" class="admin_logo" />
        <h3 class="app-title">Eager<span style="color: #2563eb;">Sky</span></h3>
        <VaIconMenuCollapsed
          v-if="!isMobile"
          class="cursor-pointer MenuCollapsed"
          :class="{ 'x-flip': !isSidebarMinimized }"
          :color="collapseIconColor"
          @click="$emit('toggle-sidebar')"
        />
        <Transition v-if="isMobile" name="icon-fade" mode="out-in">
          <VaIcon
            v-if="isMobile"
            color="primary"
            :name="sidebarOpen ? 'close' : 'menu'"
            size="24px"
            style="margin-top: 3px"
            @click="$emit('toggle-sidebar')"
          />
        </Transition>
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
  isMobile: Boolean,
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: padding 0.3s ease;

  @media screen and (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }

  @media screen and (max-width: 480px) {
    padding: 0.5rem 0.5rem;
  }
}

.left {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media screen and (max-width: 768px) {
    flex: 1;
    justify-content: space-between;
    gap: 0.25rem;
  }
}

.admin_logo {
  font-weight: 700;
  color: white;
  border-radius: 48%;
  transition: all 0.3s ease;

  @media screen and (max-width: 768px) {
    width: 36px;
    height: 32px;
  }

  @media screen and (max-width: 480px) {
    width: 32px;
    height: 28px;
  }
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0.5rem;

  @media screen and (max-width: 768px) {
    font-size: 1.2rem;
    margin: 0 0.25rem;
  }

  @media screen and (max-width: 480px) {
    font-size: 1rem;
    margin: 0 0.15rem;
  }
}

.MenuCollapsed {
  margin-left: 0.5rem;
  transition: transform 0.3s ease;

  @media screen and (max-width: 768px) {
    margin-left: 0.25rem;
  }
}

.app-navbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media screen and (max-width: 768px) {
    gap: 0.25rem;
  }

  @media screen and (max-width: 480px) {
    gap: 0.15rem;
    & > * {
      padding: 0.15rem;
    }
  }
}

.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.icon-fade-enter,
.icon-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>