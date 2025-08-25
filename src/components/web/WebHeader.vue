<template>
  <VaNavbar
  class="va-header"
  :color="color"
  :text-color="textColor"
  :shadow="shadow"
>
    <template #left>
      <VaButton
        v-if="mobile"
        icon="va-hamburger-menu"
        preset="plain"
        size="small"
        class="hamburger-menu"
        @click="toggleSidebar"
      />
      <VaNavbarItem class="logo">
        <router-link :to="{ name: 'home' }">
          {{ t('AppName') || 'My App' }}
        </router-link>
      </VaNavbarItem>
    </template>
    <template #center>
      <div class="nav-links" :class="{ 'nav-links--mobile': mobile, 'nav-links--hidden': mobile && !mobileNavOpen }">
        <VaNavbarItem
          v-for="route in navigationRoutes"
          :key="route.name"
          :to="{ name: route.name }"
          :active="isActiveRoute(route)"
          :active-color="activeColor"
          :text-color="textColor"
          class="nav-item"
          @click="handleNavClick"
        >
          {{ t(route.displayName) || route.displayName }}
        </VaNavbarItem>
      </div>
    </template>
    <template #right>
      <VaNavbarItem v-if="isAuthenticated">
        <VaButton
          :to="{ name: 'my-account' }"
          preset="primary"
          size="small"
          :color="currentRouteName === 'my-account' ? 'primary' : 'secondary'"
          @click="handleNavClick"
        >
          {{ t('My Account') || 'My Account' }}
        </VaButton>
      </VaNavbarItem>
      <VaNavbarItem v-else>
        <VaButton
          :to="{ name: 'login' }"
          preset="primary"
          size="small"
          color="primary"
          @click="handleNavClick"
        >
          {{ t('Login') || 'Login' }}
        </VaButton>
      </VaNavbarItem>
    </template>
  </VaNavbar>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useColors } from 'vuestic-ui';
import { useAuth } from '../../composables/useAuth';
import webNavigation from '../../navigation/Web/webNavigation';

const props = defineProps<{
  mobile: boolean;
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

const { getColor, colorToRgba } = useColors();
const route = useRoute();
const { t } = useI18n();
const { isAuthenticated } = useAuth();

const navigationRoutes = computed(() => {
  return webNavigation.getRoutes().filter((route) => route.name !== 'my-account');
});

const currentRouteName = computed(() => route.name?.toString() || null);

const mobileNavOpen = ref(false);

const color = computed(() => '#e6e6e6');
const textColor = computed(() => '#495057');
const activeColor = computed(() => colorToRgba(getColor('primary'), 0.1));
const shadow = computed(() => 'sm');
const shape = computed(() => 'rounded');

const isActiveRoute = (route: { name: string }) => currentRouteName.value === route.name;

const toggleSidebar = () => {
  emit('update:visible', !props.visible);
  mobileNavOpen.value = false;
};

const handleNavClick = () => {
  if (props.mobile) {
    mobileNavOpen.value = false;
  }
};
</script>

<style lang="scss" scoped>
.va-header {
  border-bottom: 1px solid #e9ecef;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  height: 60px;

  .logo {
    font-size: 1.5rem;
    font-weight: bold;
    a {
      text-decoration: none;
      color: #495057;
    }
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;

    &.nav-links--mobile {
      display: none;
      position: absolute;
      top: 60px;
      left: 0;
      right: 0;
      background-color: #e6e6e6;
      flex-direction: column;
      padding: 1rem;
      border-bottom: 1px solid #e9ecef;
      z-index: 1000;
    }

    &.nav-links--hidden {
      display: none;
    }

    &.nav-links--mobile:not(.nav-links--hidden) {
      display: flex;
    }
  }

  .nav-item {
    font-size: 1rem;
    cursor: pointer;
    transition: color 0.3s ease;
    text-decoration: none;

    &:hover {
      color: var(--va-primary);
    }
  }

  .hamburger-menu {
    margin-right: 1rem;
  }

  @media screen and (max-width: 640px) {
    .nav-links {
      &.nav-links--mobile {
        display: none;
      }
    }
  }
}
</style>