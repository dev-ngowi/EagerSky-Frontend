import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  RouteMeta as VueRouteMeta,
  RouteLocationRaw,
} from 'vue-router';
import AuthLayout from '../layouts/AuthLayout.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { adminRoutes } from './Admin/adminRoutes';
import { landlordRoutes } from './Landlord/landlordRoutes';
import { tenantRoutes } from './Tenant/tenantRoutes';
import { webRoutes } from './Web/WebRoutes';
import { AuthMiddleware } from '../utils/authMiddleware';

/**
 * Strongly-typed RouteMeta used in our app.
 * includes requiresAuth so we can rely on boolean values (no `{}`).
 */
export interface RouteMeta extends VueRouteMeta {
  layout?: 'public' | 'private' | 'auth' | 'app';
  title?: string;
  roles?: string[];
  requiresAuth?: boolean;
}

/**
 * Recursive custom route type so children are typed correctly.
 * We omit the builtin 'children' to replace with our recursive one.
 */
export type CustomRouteRecordRaw = Omit<RouteRecordRaw, 'children' | 'meta'> & {
  meta?: RouteMeta;
  children?: CustomRouteRecordRaw[];
};

function asRoute(r: Partial<CustomRouteRecordRaw>): CustomRouteRecordRaw {
  return r as CustomRouteRecordRaw;
}

/**
 * Helpers to normalise meta fields (ensures booleans & strings, not objects)
 */
function normalizeMeta(meta?: Partial<RouteMeta>, defaults?: Partial<RouteMeta>): RouteMeta {
  const base: RouteMeta = {
    requiresAuth: false,
    ...defaults,
    ...(meta ?? {}),
  };

  // Ensure requiresAuth is boolean
  base.requiresAuth = Boolean(base.requiresAuth);

  // Ensure layout is one of allowed strings or fallback to 'public'
  if (!base.layout) base.layout = (defaults && defaults.layout) ?? 'public';

  // roles should be string[] if present
  if (!base.roles) base.roles = undefined;

  return base;
}

/**
 * Build web routes mapping while ensuring types are correct
 */
const mappedWebRoutes: CustomRouteRecordRaw[] = webRoutes.map((route) => {
  const routeMeta = normalizeMeta(route.meta, { requiresAuth: false, layout: 'public' });

  const children = route.children?.map((child) => {
    const childMeta = normalizeMeta(child.meta, { requiresAuth: routeMeta.requiresAuth, layout: routeMeta.layout });
    return asRoute({
      ...child,
      meta: childMeta,
    });
  });

  return asRoute({
    ...route,
    meta: routeMeta,
    children,
  });
});

/**
 * Main routes array
 */
const routes: CustomRouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'home' } as RouteLocationRaw,
  },

  // Web routes (typed)
  ...mappedWebRoutes,

  // Auth layout & children
  {
    path: '/auth',
    component: AuthLayout,
    meta: normalizeMeta({ layout: 'auth', requiresAuth: false }),
    children: [
      {
        name: 'login',
        path: 'login',
        component: () => import('../pages/auth/Login.vue'),
        meta: normalizeMeta({ title: 'Login', layout: 'auth', requiresAuth: false }),
      },
      {
        name: 'signup',
        path: 'signup',
        component: () => import('../pages/auth/Signup.vue'),
        meta: normalizeMeta({ title: 'Sign Up', layout: 'auth', requiresAuth: false }),
      },
      {
        name: 'recover-password',
        path: 'recover-password',
        component: () => import('../pages/auth/ForgotPassword.vue'),
        meta: normalizeMeta({ title: 'Recover Password', layout: 'auth', requiresAuth: false }),
      },
      {
        name: 'recover-password-otp',
        path: 'recover-password-otp',
        component: () => import('../pages/auth/ResetPassword.vue'),
        props: (route) => ({
          email: route.query.email,
          user_id: route.query.user_id,
        }),
        meta: normalizeMeta({ title: 'Reset Password', layout: 'auth', requiresAuth: false }),
      },
      {
        name: 'activate-account',
        path: 'activate-account',
        component: () => import('../pages/auth/ActivateAccount.vue'),
        props: (route) => ({
          email: route.query.email,
          user_id: route.query.user_id,
        }),
        meta: normalizeMeta({ title: 'Activate Account', layout: 'auth', requiresAuth: false }),
      },
      {
        name: 'resend-otp',
        path: 'resend-otp',
        component: () => import('../pages/auth/ActivateAccount.vue'),
        props: (route) => ({
          email: route.query.email,
          user_id: route.query.user_id,
        }),
        meta: normalizeMeta({ title: 'Resend OTP', layout: 'auth', requiresAuth: false }),
      },
      {
        name: 'recover-password-email',
        path: 'recover-password-email',
        component: () => import('../pages/auth/CheckTheEmail.vue'),
        meta: normalizeMeta({ title: 'Check Your Email', layout: 'auth', requiresAuth: false }),
      },
    ],
  },

  // Direct auth routes (redirects to children above)
  {
    name: 'login-direct',
    path: '/login',
    redirect: { name: 'login' } as RouteLocationRaw,
    meta: normalizeMeta({ requiresAuth: false }),
  },
  {
    name: 'signup-direct',
    path: '/signup',
    redirect: { name: 'signup' } as RouteLocationRaw,
    meta: normalizeMeta({ requiresAuth: false }),
  },

  // App area with sub-routes (admin/landlord/tenant)
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    meta: normalizeMeta({ requiresAuth: true, layout: 'app' }),
    redirect: () => {
      const userRole = AuthMiddleware.getUserRole();
      console.log('App redirect - User role:', userRole);
      if (userRole === 'tenant') {
        return { name: 'my-account' } as RouteLocationRaw;
      }
      return AuthMiddleware.getDashboardRoute();
    },
    children: [
      // spread lists and ensure meta normalization for all children
      ...adminRoutes.map((r) =>
        asRoute({
          ...r,
          meta: normalizeMeta(r.meta, { requiresAuth: true, layout: 'app' }),
        })
      ),
      ...landlordRoutes.map((r) =>
        asRoute({
          ...r,
          meta: normalizeMeta(r.meta, { requiresAuth: true, layout: 'app' }),
        })
      ),
      ...tenantRoutes.map((r) =>
        asRoute({
          ...r,
          meta: normalizeMeta(r.meta, { requiresAuth: true, layout: 'app' }),
        })
      ),
      {
        name: 'dashboard',
        path: 'dashboard',
        redirect: () => {
          const userRole = AuthMiddleware.getUserRole();
          console.log('Dashboard redirect - User role:', userRole);
          if (userRole === 'tenant') {
            return { name: 'my-account' } as RouteLocationRaw;
          }
          return AuthMiddleware.getDashboardRoute();
        },
        meta: normalizeMeta({
          requiresAuth: true,
          roles: ['admin', 'landlord', 'tenant'],
          layout: 'app',
        }),
      },
    ],
  },

  // 404
  {
    name: 'not-found',
    path: '/404',
    component: () => import('../layouts/PublicLayout.vue'),
    meta: normalizeMeta({ title: 'Page Not Found', layout: 'public', requiresAuth: false }),
    children: [
      {
        path: '',
        component: () => import('../pages/404.vue'),
        meta: normalizeMeta({ requiresAuth: false }),
      },
    ],
  },

  // catch all
  {
    name: 'catch-all',
    path: '/:pathMatch(.*)*',
    redirect: { name: 'not-found' } as RouteLocationRaw,
    meta: normalizeMeta({ requiresAuth: false }),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // cast to RouteRecordRaw[] to satisfy createRouter signature while preserving our strong typing
  routes: routes as unknown as RouteRecordRaw[],
});

/**
 * Navigation guard with strongly-typed role handling.
 * routeRoles is always treated as string[] (or empty array).
 */
router.beforeEach((to, from, next) => {
  console.log('Navigation Guard:', {
    to: { name: to.name, path: to.path, meta: to.meta },
    from: { name: from.name, path: from.path },
  });

  const toMeta = (to.meta ?? {}) as RouteMeta;

  if (toMeta.title) {
    document.title = `${toMeta.title} - EagerSky`;
  }

  if (!toMeta.requiresAuth) {
    return next();
  }

  if (!AuthMiddleware.isSessionValid()) {
    console.log('User not authenticated, redirecting to login');
    return next({
      name: 'login',
      query: { redirect: to.fullPath },
    });
  }

  if (to.path.startsWith('/my-account')) {
    return next();
  }

  const userRole = AuthMiddleware.getUserRole();
  // ensure routeRoles is a string[] (never an object)
  const routeRoles = (toMeta.roles ?? []) as string[];

  console.log('Role check:', { userRole, routeRoles });

  if (userRole === 'tenant' && to.path.startsWith('/app')) {
    console.log('Tenant redirecting to my-account');
    return next({ name: 'my-account' });
  }

  if (routeRoles.length > 0 && !AuthMiddleware.hasRole(routeRoles)) {
    console.warn(`Access denied. User role: ${userRole}, Required roles: ${routeRoles.join(', ')}`);
    return next({ name: 'my-account' });
  }

  return next();
});

/**
 * Utility helpers (type-safely cast meta.roles when used)
 */
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

  const routeRoles = (route.meta.roles ?? []) as string[];
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