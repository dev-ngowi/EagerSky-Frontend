import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import AuthLayout from '../layouts/AuthLayout.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { adminRoutes } from './Admin/adminRoutes';
import { landlordRoutes } from './Landlord/landlordRoutes';
import { tenantRoutes } from './Tenant/tenantRoutes';
import { AuthMiddleware } from '../utils/authMiddleware';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: { name: 'login' },
  },
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        name: 'login',
        path: 'login',
        component: () => import('../pages/auth/Login.vue'),
        meta: { title: 'Login' },
      },
      {
        name: 'signup',
        path: 'signup',
        component: () => import('../pages/auth/Signup.vue'),
        meta: { title: 'Sign Up' },
      },
      {
        name: 'recover-password',
        path: 'recover-password',
        component: () => import('../pages/auth/RecoverPassword.vue'),
        meta: { title: 'Recover Password' },
      },
      {
        path: '/activate-account',
        name: 'activate-account',
        component: () => import('../pages/auth/ActivateAccount.vue'),
        props: (route) => ({
          email: route.query.email,
          user_id: route.query.user_id,
        }),
        meta: { title: 'Activate Account' },
      },
      {
        name: 'resend-otp',
        path: 'resend-otp',
        component: () => import('../pages/auth/ActivateAccount.vue'),
        props: (route) => ({
          email: route.query.email,
          user_id: route.query.user_id,
        }),
        meta: { title: 'Resend OTP' },
      },
      {
        name: 'recover-password-email',
        path: 'recover-password-email',
        component: () => import('../pages/auth/CheckTheEmail.vue'),
        meta: { title: 'Check Your Email' },
      },
    ],
  },
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    redirect: () => {
      const userRole = AuthMiddleware.getUserRole();
      console.log('App redirect - User role:', userRole);
      return AuthMiddleware.getDashboardRoute();
    },
    meta: { requiresAuth: true },
    children: [
      ...adminRoutes,
      ...landlordRoutes,
      ...tenantRoutes,
      {
        name: 'dashboard',
        path: 'dashboard',
        redirect: () => {
          const userRole = AuthMiddleware.getUserRole();
          console.log('Dashboard redirect - User role:', userRole);
          return AuthMiddleware.getDashboardRoute();
        },
        meta: { requiresAuth: true, roles: ['admin', 'landlord', 'tenant'] },
      },
    ],
  },
  {
    name: '404',
    path: '/404',
    component: () => import('../pages/404.vue'),
    meta: { title: 'Page Not Found' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: '404' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  console.log('Navigation Guard:', {
    to: { name: to.name, path: to.path, meta: to.meta },
    from: { name: from.name, path: from.path },
  });

  if (!to.meta.requiresAuth) {
    return next();
  }

  if (!AuthMiddleware.isSessionValid()) {
    console.log('User not authenticated, redirecting to login');
    return next({
      name: 'login',
      query: { redirect: to.fullPath },
    });
  }

  const userRole = AuthMiddleware.getUserRole();
  const routeRoles = to.meta.roles as string[] | undefined;

  console.log('Role check:', { userRole, routeRoles });

  if (routeRoles && routeRoles.length > 0 && !AuthMiddleware.hasRole(routeRoles)) {
    console.warn(`Access denied. User role: ${userRole}, Required roles: ${routeRoles.join(', ')}`);
    return next({ name: AuthMiddleware.getDashboardRoute() });
  }

  return next();
});

export function hasRouteAccess(routeName: string | null | undefined, userRole?: string | null): boolean {
  if (!routeName) {
    console.log('hasRouteAccess: routeName is null or undefined');
    return true;
  }

  const role = userRole ?? AuthMiddleware.getUserRole() ?? 'guest';
  const route = router.getRoutes().find((r) => r.name === routeName);

  if (!route || !route.meta?.roles) {
    return true;
  }

  const routeRoles = route.meta.roles as string[];
  return AuthMiddleware.hasRole(routeRoles);
}

export function getRoutesForRole(userRole?: string | null) {
  const role = userRole ?? AuthMiddleware.getUserRole() ?? 'guest';
  return router.getRoutes().filter((route) => {
    if (!route.meta?.roles) return true;
    if (typeof route.name === 'string') {
      return hasRouteAccess(route.name, role);
    }
    console.log('getRoutesForRole: route.name is not a string', route.name);
    return true;
  });
}

export { getUserRole, getDashboardRoute } from '../utils/authMiddleware';

export default router;