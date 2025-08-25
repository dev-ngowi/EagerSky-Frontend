<template>
  <header id="header" class="header d-flex align-items-center fixed-top">
    <div class="container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
      <router-link to="/home" class="logo d-flex align-items-center">
        <EagerLogo :width="isMobile ? '36px' : '50px'" :height="isMobile ? '32px' : '50px'" />
        <h1 class="sitename">Eager<span>Sky</span></h1>
      </router-link>

      <nav id="navmenu" class="navmenu">
        <ul :class="{ show: mobileNavOpen }">
          <li v-for="route in publicRoutes" :key="route.name">
            <router-link
              :to="getRoutePath(route)"
              :class="{ active: $route.name === route.name || isChildRouteActive(route) }"
              @click="closeNavAndSearch"
            >
              {{ route.displayName }}
            </router-link>
          </li>
          <li>
            <router-link
              v-if="isAuthenticated"
              to="/my-account"
              class="btn btn-primary my-account-btn"
              :class="{ active: isMyAccountActive }"
              @click="closeNavAndSearch"
            >
              My Account
            </router-link>
            <router-link
              v-else
              :to="{ name: 'login' }"
              class="btn btn-primary my-account-btn"
              @click="closeNavAndSearch"
            >
              Log In
            </router-link>
          </li>
          <!-- <li v-if="isAuthenticated">
            <button
              class="btn btn-secondary logout-btn"
              @click="logout"
            >
              Log Out
            </button>
          </li> -->
        </ul>
        <div class="search-container" :class="{ active: searchOpen }">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="search-input"
            @keyup.enter="performSearch"
          />
          <button class="search-toggle" @click="toggleSearch" aria-label="Toggle search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <button 
          class="mobile-nav-toggle d-xl-none"
          @click="toggleMobileNav"
          aria-label="Toggle mobile navigation"
        >
          <svg v-if="!mobileNavOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </nav>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth-store'; // Adjust path to match your store location
import EagerLogo from './EagerLogo.vue';
import webNavigation from '../navigation/Web/webNavigation';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const mobileNavOpen = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const isMobile = ref(window.innerWidth <= 768);

// Remove the emit to parent layout as it's not being used in the parent
// const emit = defineEmits(['mobile-nav-toggle', 'close-mobile-nav']);

const isAuthenticated = computed(() => {
  return authStore.isAuthenticated;
});

const publicRoutes = computed(() => {
  return webNavigation.routes.filter((route) => !route.meta.requiresAuth);
});

const isMyAccountActive = computed(() => {
  return route.path.startsWith('/my-account');
});

const getRoutePath = (navRoute: { name: string }) => {
  return navRoute.name === 'home' ? '/home' : `/${navRoute.name}`;
};

const isChildRouteActive = (navRoute: { name: string; children?: any[] }) => {
  return navRoute.children?.some((child) => route.name === child.name) || false;
};

const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const toggleMobileNav = () => {
  mobileNavOpen.value = !mobileNavOpen.value;
  searchOpen.value = false; // Ensure search is closed
  document.body.style.overflow = mobileNavOpen.value ? 'hidden' : '';
};

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value;
  mobileNavOpen.value = false; // Ensure mobile nav is closed
  document.body.style.overflow = searchOpen.value ? 'hidden' : '';
};

const closeNavAndSearch = () => {
  mobileNavOpen.value = false;
  searchOpen.value = false;
  document.body.style.overflow = '';
};

const performSearch = () => {
  if (searchQuery.value.trim()) {
    // Example: router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`);
    searchQuery.value = '';
    closeNavAndSearch();
  }
};

const logout = async () => {
  try {
    await authStore.logout();
    closeNavAndSearch();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

onMounted(() => {
  window.addEventListener('resize', updateIsMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile);
  document.body.style.overflow = '';
});
</script>

<style lang="scss" scoped>
$primary-color: #007bff;
$accent-color: #fe0000;
$dark-color: #2c3e50;
$white: #ffffff;
$secondary-color: #6c757d;
$light-color: #e9ecef;

.header {
  background: $dark-color;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: clamp(0.5rem, 2vw, 0.75rem) 0;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  transition: all 0.3s ease;

  .container-fluid {
    max-width: 1320px;
    width: 90%;
    margin: 0 auto;
    padding: 0 clamp(0.5rem, 2vw, 1rem);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    text-decoration: none;
    display: flex;
    align-items: center;
    flex-shrink: 0;

    img {
      margin-right: clamp(0.3rem, 1vw, 0.5rem);
      border-radius: 48%;
      transition: transform 0.3s ease;

      &:hover {
        transform: scale(1.05);
      }
    }

    .sitename {
      font-size: clamp(1rem, 4vw, 1.8rem);
      font-weight: 800;
      color: $white;
      margin: 0;
      white-space: nowrap;

      span {
        color: $accent-color;
        font-weight: 900;
      }
    }
  }

  .navmenu {
    display: flex;
    align-items: center;
    gap: clamp(10px, 2vw, 15px);

    ul {
      display: flex;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;

      &.show {
        transform: translateX(0);
      }

      li {
        margin-left: clamp(15px, 3vw, 25px);

        &:first-child {
          margin-left: 0;
        }

        a, button {
          color: $white;
          text-decoration: none;
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          font-weight: 500;
          padding: clamp(6px, 2vw, 8px) clamp(8px, 2vw, 12px);
          border-radius: 4px;
          transition: all 0.3s ease;
          white-space: nowrap;
          border: none;
          background: none;
          cursor: pointer;

          &:hover,
          &.active {
            color: $white;
            font-weight: 600;
            background-color: rgba($primary-color, 0.2);
          }
        }

        .my-account-btn {
          background: $primary-color;
          color: $white !important;
          border: 2px solid $primary-color;
          padding: clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px);
          font-weight: 700;
          border-radius: 25px;
          transition: all 0.3s ease;

          &:hover {
            background: darken($primary-color, 10%);
            border-color: darken($primary-color, 10%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba($primary-color, 0.3);
          }

          &.active {
            background: darken($primary-color, 10%);
            border-color: darken($primary-color, 10%);
          }
        }

        .logout-btn {
          background: $secondary-color;
          color: $white !important;
          border: 2px solid $secondary-color;
          padding: clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px);
          font-weight: 700;
          border-radius: 25px;
          transition: all 0.3s ease;

          &:hover {
            background: darken($secondary-color, 10%);
            border-color: darken($secondary-color, 10%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba($secondary-color, 0.3);
          }
        }
      }
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;

      &.active {
        .search-input {
          width: clamp(150px, 40vw, 200px);
          opacity: 1;
          pointer-events: auto;
        }

        .search-toggle {
          color: $accent-color;
          
          svg {
            stroke: $accent-color;
          }
        }
      }

      .search-input {
        width: 0;
        opacity: 0;
        pointer-events: none;
        padding: clamp(6px, 2vw, 8px) clamp(10px, 3vw, 12px);
        border: 1px solid $light-color;
        border-radius: 20px;
        background: $white;
        color: $dark-color;
        font-size: clamp(0.8rem, 2vw, 0.9rem);
        transition: all 0.3s ease;
        margin-right: clamp(8px, 2vw, 10px);

        &:focus {
          outline: none;
          border-color: $primary-color;
          box-shadow: 0 0 5px rgba($primary-color, 0.3);
        }
      }

      .search-toggle {
        background: none;
        border: none;
        font-size: clamp(1.1rem, 3vw, 1.4rem);
        cursor: pointer;
        color: $white;
        transition: all 0.3s ease;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          stroke: $white;
          transition: stroke 0.3s ease;
        }

        &:hover {
          color: $accent-color;
          background: rgba($white, 0.1);
          
          svg {
            stroke: $accent-color;
          }
        }
      }
    }

    .mobile-nav-toggle {
      background: none;
      border: none;
      font-size: clamp(1.3rem, 4vw, 1.8rem);
      cursor: pointer;
      color: $white;
      transition: all 0.3s ease;
      margin-left: clamp(10px, 2vw, 15px);
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;

      svg {
        stroke: $white !important;
        transition: all 0.3s ease;
      }

      &:hover {
        color: $accent-color;
        background: rgba($white, 0.1);
        transform: scale(1.05);
        
        svg {
          stroke: $accent-color !important;
        }
      }

      &:active {
        transform: scale(0.95);
      }
    }

    @media (max-width: 1199px) {
      ul {
        display: none;
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        width: 100%;
        max-width: 300px;
        background: $dark-color;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.2);
        padding: clamp(3rem, 10vw, 4rem) clamp(1rem, 3vw, 1.5rem);
        flex-direction: column;
        align-items: center;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1001;

        &.show {
          display: flex;
          transform: translateX(0);
        }

        li {
          margin: 0 0 clamp(1rem, 3vw, 1.5rem);
          width: 100%;
          display: flex;
          justify-content: center;

          &:last-child {
            margin-bottom: 0;
          }

          a, button {
            display: block;
            width: 100%;
            max-width: 250px;
            padding: clamp(10px, 3vw, 12px) clamp(12px, 3vw, 15px);
            font-size: clamp(1rem, 3vw, 1.1rem);
            text-align: center;
            border-radius: 6px;
            color: $white;

            &:hover,
            &.active {
              background: rgba($primary-color, 0.2);
              color: $white;
            }
          }

          .my-account-btn, .logout-btn {
            width: 100%;
            max-width: 250px;
            text-align: center;
            margin-top: clamp(0.5rem, 2vw, 1rem);
            padding: clamp(10px, 3vw, 12px) clamp(20px, 4vw, 25px);
            font-size: clamp(0.9rem, 2.5vw, 1rem);

            &:hover {
              color: $white !important;
            }
          }

          .my-account-btn:hover {
            background: darken($primary-color, 10%);
          }

          .logout-btn:hover {
            background: darken($secondary-color, 10%);
          }
        }
      }

      .search-container {
        &.active {
          position: fixed;
          top: clamp(3rem, 10vw, 4rem);
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 300px;
          z-index: 1002;

          .search-input {
            width: 100%;
            border-radius: 20px;
            padding: clamp(8px, 2vw, 10px);
          }

          .search-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
          }
        }
      }

      .mobile-nav-toggle {
        display: block;
      }
    }

    @media (max-width: 768px) {
      .header {
        padding: clamp(0.4rem, 2vw, 0.5rem) 0;
      }

      .logo {
        .sitename {
          font-size: clamp(1rem, 3.5vw, 1.2rem);
        }
      }

      .mobile-nav-toggle {
        font-size: clamp(1.2rem, 3.5vw, 1.5rem);
        min-width: 40px;
        min-height: 40px;
        
        svg {
          width: 20px;
          height: 20px;
        }
      }

      .search-container {
        .search-toggle {
          font-size: clamp(1rem, 3vw, 1.3rem);
          
          svg {
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    @media (max-width: 480px) {
      .container-fluid {
        padding: 0 clamp(0.3rem, 1.5vw, 0.5rem);
      }

      .logo {
        .sitename {
          font-size: clamp(0.9rem, 3vw, 1rem);
        }
      }

      .mobile-nav-toggle {
        font-size: clamp(1.1rem, 3vw, 1.3rem);
        min-width: 36px;
        min-height: 36px;
        
        svg {
          width: 18px;
          height: 18px;
        }
      }

      .search-container {
        .search-toggle {
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          
          svg {
            width: 16px;
            height: 16px;
          }
        }
      }
    }
  }
}
</style>