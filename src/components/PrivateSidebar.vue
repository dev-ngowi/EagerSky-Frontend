<template>
  <aside class="sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }">
    <div class="sidebar-header">
      <h2>My Account</h2>
      <button class="close-btn" @click.stop="$emit('close-sidebar')" aria-label="Close sidebar" v-if="isMobile">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <nav class="sidebar-nav">
      <div v-if="isLoading" class="loading text-center p-4">
        <div class="spinner"></div>
        <p>Loading navigation...</p>
      </div>
      <div v-else-if="!filteredRoutes || filteredRoutes.length === 0" class="no-routes text-center p-4">
        <p class="text-gray-400">Please log in to view account options.</p>
        <router-link
          to="/login"
          class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          aria-label="Log in"
        >
          Log In
        </router-link>
      </div>
      <div v-else class="nav-items">
        <router-link
          v-for="route in filteredRoutes"
          :key="route.name"
          :to="routePaths[route.name]"
          class="nav-item"
          active-class="active"
          :aria-label="`Navigate to ${route.displayName}`"
          @click="handleNavClick"
        >
          <div class="nav-item-content">
            <div class="nav-item-icon">
              <i :class="route.meta.icon" v-if="route.meta.icon"></i>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <span class="nav-item-text">{{ route.displayName }}</span>
          </div>
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth-store';
import webNavigation from '../navigation/Web/webNavigation';
import { useSidebarState } from '../composables/useSidebarState';

defineProps<{
  isSidebarOpen: boolean;
}>();
const emit = defineEmits(['close-sidebar']);

const router = useRouter();
const authStore = useAuthStore();
const { isMobile } = useSidebarState();
const isLoading = ref(true);
const isNavigationHandled = ref(false);

const isAuthenticated = computed(() => {
  const isAuth = authStore.isAuthenticated;
  console.log('PrivateSidebar isAuthenticated:', isAuth, {
    userId: authStore.userProfile?.id,
    token: authStore.token,
    userRole: authStore.userRole,
  });
  return isAuth;
});

const accountRoutes = computed(() => {
  const routes = (webNavigation?.routes || []).find((route) => route.name === 'tenant-dashboard')?.children || [];
  console.log('Account routes from webNavigation:', routes);
  return routes;
});

const filteredRoutes = computed(() => {
  if (!webNavigation?.routes) {
    console.warn('webNavigation.routes is undefined');
    return [];
  }
  const routes = accountRoutes.value.filter((route) => !route.meta?.requiresAuth || isAuthenticated.value);
  console.log('Filtered routes on render:', routes.map(r => r.name));
  return routes;
});

const routePaths = computed(() => {
  const paths: { [key: string]: string } = {};
  filteredRoutes.value.forEach(route => {
    const path = router.resolve({ name: route.name }).href;
    paths[route.name] = path;
    console.log(`Resolved path for ${route.name}: ${path}`);
  });
  return paths;
});

const handleNavClick = () => {
  console.log('Nav click triggered:', { isMobile: isMobile.value, currentRoute: router.currentRoute.value.name });
  if (isMobile.value && !isNavigationHandled.value) {
    isNavigationHandled.value = true;
    const unsubscribe = router.afterEach(() => {
      console.log('Navigation complete, emitting close-sidebar');
      emit('close-sidebar');
      isNavigationHandled.value = false;
      unsubscribe();
    });
  }
};

watch(isAuthenticated, (isAuth, oldIsAuth) => {
  if (!isAuth && oldIsAuth && accountRoutes.value.some((route) => route.meta?.requiresAuth)) {
    console.log('Unauthenticated access detected, redirecting to login');
    router.push('/login');
  }
});

onMounted(async () => {
  console.log('PrivateSidebar mounted, checking session');
  try {
    await authStore.checkSessionExpiry();
    console.log('Session check complete, setting isLoading to false');
  } catch (error) {
    console.warn('Session check failed or is not a Promise:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.sidebar {
  width: 280px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 0;
  position: fixed;
  top: 60px;
  left: 0;
  height: calc(100vh - 60px);
  overflow-y: auto;
  z-index: 1002;
  transition: transform 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(-100%);

  &.sidebar-closed {
    transform: translateX(-100%);
  }

  &:not(.sidebar-closed) {
    transform: translateX(0);
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);

    h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: white;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.3s ease;
      display: none;
      align-items: center;
      justify-content: center;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: rotate(90deg);
      }

      svg {
        stroke: white;
      }
    }
  }

  .sidebar-nav {
    padding: 0;

    .nav-items {
      padding: 16px 0;
    }

    .nav-item {
      display: block;
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      transition: all 0.3s ease;
      border: none;
      position: relative;
      margin: 4px 16px;
      border-radius: 8px;
      overflow: hidden;

      .nav-item-content {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        gap: 16px;
        position: relative;
      }

      .nav-item-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        flex-shrink: 0;

        i, svg {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.8);
          transition: color 0.3s ease;
        }

        svg {
          stroke: rgba(255, 255, 255, 0.8);
        }
      }

      .nav-item-text {
        font-size: 0.95rem;
        font-weight: 500;
        flex: 1;
      }

      &:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        color: white;
        transform: translateX(4px);

        .nav-item-icon {
          i, svg {
            color: white;
            transform: scale(1.1);
          }
          
          svg {
            stroke: white;
          }
        }
      }

      &.active {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, #ffffff 0%, #ecf0f1 100%);
        }

        .nav-item-icon {
          i, svg {
            color: white;
          }
          
          svg {
            stroke: white;
          }
        }
      }
    }

    .loading {
      padding: 32px 20px;
      text-align: center;

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      }

      p {
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9rem;
        margin: 0;
      }
    }

    .no-routes {
      padding: 32px 20px;
      text-align: center;

      p {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.9rem;
        margin-bottom: 16px;
        line-height: 1.5;
      }

      .cta-button {
        display: inline-flex;
        align-items: center;
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        font-weight: 600;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        }
      }
    }
  }
}

@media (min-width: 489px) {
  .sidebar {
    transform: translateX(0);
    
    &.sidebar-closed {
      transform: translateX(-100%);
    }
  }
}

@media (max-width: 488px) {
  .sidebar {
    width: 320px;
    top: 0;
    height: 100vh;
    z-index: 1002;
    transform: translateX(-100%);
    
    &.sidebar-closed {
      transform: translateX(-100%);
    }
    
    &:not(.sidebar-closed) {
      transform: translateX(0);
      box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
    }
    
    .sidebar-header {
      padding-top: 80px;
      
      .close-btn {
        display: flex;
      }

      h2 {
        font-size: 1.5rem;
      }
    }

    .sidebar-nav {
      .nav-items {
        padding: 20px 0;
      }

      .nav-item {
        margin: 6px 20px;

        .nav-item-content {
          padding: 18px 24px;
          gap: 18px;
        }

        .nav-item-icon {
          width: 28px;
          height: 28px;

          i, svg {
            font-size: 1.3rem;
          }
        }

        .nav-item-text {
          font-size: 1rem;
          font-weight: 500;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 100%;
    
    .sidebar-nav {
      .nav-items {
        padding: 16px 0;
      }

      .nav-item {
        margin: 4px 16px;

        .nav-item-content {
          padding: 16px 20px;
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>