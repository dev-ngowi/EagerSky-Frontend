<template>
  <div class="app-navbar-actions">
    <NotificationDropdown class="app-navbar-actions__item" />
    <ProfileDropdown class="app-navbar-actions__item app-navbar-actions__item--profile" />
  </div>
</template>

<script lang="ts" setup>
import ProfileDropdown from './dropdowns/ProfileDropdown.vue';
import NotificationDropdown from './dropdowns/NotificationDropdown.vue';

defineProps({
  isMobile: { type: Boolean, default: false },
});
</script>

<style lang="scss">
.app-navbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .va-dropdown__anchor {
    color: var(--va-primary);
    fill: var(--va-primary);
    touch-action: manipulation;
  }

  &__item {
    padding: 0.25rem;
    margin: 0 0.25rem;

    svg {
      height: 20px;
    }

    &--profile {
      display: flex;
      justify-content: center;
      min-width: 120px;
    }

    .va-dropdown-content {
      background-color: var(--va-white);
    }

    @media screen and (max-width: 768px) {
      margin: 0 0.15rem;
      padding: 0.2rem;
    }

    @media screen and (max-width: 480px) {
      margin: 0 0.1rem;
      padding: 0.15rem;

      &:first-of-type {
        margin-left: 0;
      }

      &--profile {
        min-width: 100px;
      }
    }
  }
}

/* Custom color definitions to match the theme */
.bg-blue-900 {
  background-color: #061941;
  color: #ffffff;
}

.bg-blue-800 {
  background-color: transparent;
  color: #ffffff;
  border: 2px solid #1a4cd6;
}

.go_to_front {
  border: 2px solid #ffffff;
  color: #ffffff;
  text-decoration: none;
}

.go_to_front:visited,
.go_to_front:hover,
.go_to_front:active,
.go_to_front:focus {
  color: #ffffff;
  text-decoration: none;
}

.bg-blue-600 {
  background-color: #2563eb;
  color: #ffffff;
}

.transition-all {
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;
}
</style>