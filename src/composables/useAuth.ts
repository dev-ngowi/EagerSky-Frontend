import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth-store';
import { AuthMiddleware } from '../utils/authMiddleware';

// Define UserRole type
export type UserRole = 'admin' | 'landlord' | 'tenant';

export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();

  // Reactive state
  const isAuthenticated = ref(false);
  const userRole = ref<UserRole>('tenant'); // Use UserRole type
  const userPermissions = ref<string[]>([]);
  const sessionTimeLeft = ref(0);

  // Session check interval
  let sessionInterval: NodeJS.Timeout | null = null;

  // Computed properties
  const isAdmin = computed(() => userRole.value === 'admin');
  const isLandlord = computed(() => userRole.value === 'landlord');
  const isTenant = computed(() => userRole.value === 'tenant');

  const userFullName = computed(() => {
    const userData = AuthMiddleware.getUserData();
    if (userData?.first_name && userData?.last_name) {
      return `${userData.first_name} ${userData.last_name}`;
    }
    return userData?.username || 'User';
  });

  // Methods
  const checkSession = () => {
    isAuthenticated.value = AuthMiddleware.isSessionValid();
    const role = AuthMiddleware.getUserRole();
    userRole.value = ['admin', 'landlord', 'tenant'].includes(role ?? '') ? (role as UserRole) : 'tenant';

    const userData = AuthMiddleware.getUserData();
    userPermissions.value = userData?.permissions || [];
    sessionTimeLeft.value = AuthMiddleware.getTimeUntilExpiry();

    // Auto-refresh session if needed
    AuthMiddleware.autoRefreshSession();

    // If session is invalid, redirect to login
    if (!isAuthenticated.value && router.currentRoute.value.meta.requiresAuth) {
      console.log('Session invalid, redirecting to login');
      router.push({ name: 'login' });
    }
  };

  const hasRole = (roles: string | string[]): boolean => {
    return AuthMiddleware.hasRole(roles);
  };

  const hasPermission = (permission: string): boolean => {
    return AuthMiddleware.hasPermission(permission);
  };

  const logout = async () => {
    try {
      // Call store logout which handles API call and cleanup
      await authStore.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force cleanup even if API call fails
      AuthMiddleware.clearSession();
      router.push({ name: 'login' });
    }
  };

  const refreshSession = (): boolean => {
    const refreshed = AuthMiddleware.refreshSession();
    if (refreshed) {
      checkSession(); // Update reactive state
    }
    return refreshed;
  };

  const getDashboardRoute = (): string => {
    return AuthMiddleware.getDashboardRoute();
  };

  const redirectToDashboard = () => {
    const dashboardRoute = getDashboardRoute();
    router.push({ name: dashboardRoute });
  };

  // Route guards
  const canAccessRoute = (routeName: string): boolean => {
    // This would check if user can access a specific route
    // Implementation depends on your route configuration
    return true; // Placeholder
  };

  // Setup session monitoring
  const startSessionMonitoring = () => {
    // Check session every 30 seconds
    sessionInterval = setInterval(() => {
      checkSession();

      // Warn user when session is about to expire (5 minutes)
      if (sessionTimeLeft.value <= 5 && sessionTimeLeft.value > 0) {
        console.warn(`Session expiring in ${sessionTimeLeft.value} minutes`);
        // You could show a toast notification here
      }
    }, 30000);
  };

  const stopSessionMonitoring = () => {
    if (sessionInterval) {
      clearInterval(sessionInterval);
      sessionInterval = null;
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    checkSession();
    startSessionMonitoring();
  });

  onUnmounted(() => {
    stopSessionMonitoring();
  });

  // Return reactive state and methods
  return {
    // State
    isAuthenticated,
    userRole,
    userPermissions,
    sessionTimeLeft,

    // Computed
    isAdmin,
    isLandlord,
    isTenant,
    userFullName,

    // Methods
    checkSession,
    hasRole,
    hasPermission,
    logout,
    refreshSession,
    getDashboardRoute,
    redirectToDashboard,
    canAccessRoute,

    // Session monitoring
    startSessionMonitoring,
    stopSessionMonitoring,
  };
}