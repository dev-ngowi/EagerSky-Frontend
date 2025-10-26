<template>
  <div class="app-navbar-actions">
    <!-- RouterLink now uses responsive classes to switch between text and icon. -->
    <RouterLink
      v-if="!isMobile || isLargeScreen"
      :to="{ name: 'home', query: { skipRedirect: 'true' } }"
      class="go_to_front rounded-full font-medium py-1 px-2 sm:px-3 sm:py-1.5"
      aria-label="Go to Web"
    >
      <!-- Text (visible from 'sm' breakpoint and up) -->
      <span class="hidden sm:inline">Go to Web</span>
      
      <!-- World Icon (visible only on small devices, hidden from 'sm' breakpoint) -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-6 h-6 inline sm:hidden"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
        <path d="M3.6 9h16.8"></path>
        <path d="M3.6 15h16.8"></path>
        <path d="M11.5 3a17 17 0 0 0 0 18"></path>
        <path d="M12.5 3a17 17 0 0 1 0 18"></path>
      </svg>
    </RouterLink>
    <NotificationDropdown class="app-navbar-actions__item" />
    <ProfileDropdown class="app-navbar-actions__item app-navbar-actions__item--profile" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import ProfileDropdown from './dropdowns/ProfileDropdown.vue';
import NotificationDropdown from './dropdowns/NotificationDropdown.vue';
const props = defineProps({
  isMobile: { type: Boolean, default: false },
});
// Hide "Go to Web" if screen is very small, even if isMobile prop is false
// Note: This computed property is still needed to respect the v-if logic wrapping the whole link.
const isLargeScreen = computed(() => window.innerWidth > 640);
</script>
<style lang="scss">
// Define responsive breakpoints consistently
$breakpoint-mobile: 768px;
$breakpoint-small: 480px;
.app-navbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem; // Slightly increased desktop gap
  @media screen and (max-width: $breakpoint-mobile) {
    gap: 0.5rem;
  }
  @media screen and (max-width: $breakpoint-small) {
    gap: 0.25rem;
  }
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
      // Ensure icons are white on the dark background
      color: #ffffff;
      fill: #ffffff;
    }
    &--profile {
      display: flex;
      justify-content: center;
      min-width: 110px; // Slightly reduced min-width for mobile space
    }
    .va-dropdown-content {
      background-color: var(--va-white);
    }
    @media screen and (max-width: $breakpoint-mobile) {
      margin: 0 0.15rem;
      padding: 0.2rem;
    }
    @media screen and (max-width: $breakpoint-small) {
      margin: 0 0.1rem;
      padding: 0.15rem;
      &:first-of-type {
        margin-left: 0;
      }
      &--profile {
        min-width: 90px;
      }
    }
  }
}
/* Custom color definitions to match the theme */
.go_to_front {
  // Styling the RouterLink for the "Go to Web" button
  background-color: transparent;
  border: 2px solid #ffffff;
  color: #ffffff;
  text-decoration: none;
  font-size: 0.875rem; /* text-sm equivalent */
  transition: all 200ms ease-in-out;
  // The link's size is now controlled by the responsive Tailwind classes (px-2/py-1 for mobile, sm:px-3/sm:py-1.5 for desktop)
  @media screen and (max-width: $breakpoint-mobile) {
    // Remove the 2px white border when the device is smaller than 768px (mobile breakpoint)
    border: none;
  }
}
.go_to_front:visited,
.go_to_front:active,
.go_to_front:focus {
  color: #ffffff;
  text-decoration: none;
}
.go_to_front:hover {
  background-color: #2563eb; /* bg-blue-600 equivalent for hover */
  border-color: #2563eb;
  color: #ffffff;
}
</style>