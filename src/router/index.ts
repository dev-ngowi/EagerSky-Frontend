import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  RouteMeta as VueRouteMeta,
  RouteLocationRaw,
} from 'vue-router';
import { useAuthStore } from '../stores/auth-store';
import AuthLayout from '../layouts/AuthLayout.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { adminRoutes } from './Admin/adminRoutes';
import { landlordRoutes } from './Landlord/landlordRoutes';
import { tenantRoutes } from './Tenant/tenantRoutes';
import { webRoutes } from './Web/WebRoutes';
import { AuthMiddleware } from '../utils/authMiddleware';

// Utility for encoding/decoding paths
export const encodePath = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return btoa(cleanPath);
};

export const decodePath = (encoded: string): string => {
  try {
    return '/' + atob(encoded); // Ensure leading slash
  } catch (e) {
    console.error('Failed to decode path:', encoded, e);
    return '';
  }
};

export interface RouteMeta extends VueRouteMeta {
  layout?: 'public' | 'private' | 'auth' | 'app';
  title?: string;
  roles?: string[];
  requiresAuth?: boolean;
  originalPath?: string;
}

export type CustomRouteRecordRaw = Omit<RouteRecordRaw, 'children' | 'meta'> & {
  meta?: RouteMeta;
  children?: CustomRouteRecordRaw[];
};

function asRoute(r: Partial<CustomRouteRecordRaw>): CustomRouteRecordRaw {
  return r as CustomRouteRecordRaw;
}

function normalizeMeta(meta?: Partial<RouteMeta>, defaults?: Partial<RouteMeta>): RouteMeta {
  const base: RouteMeta = {
    requiresAuth: false,
    layout: 'public',
    ...defaults,
    ...(meta ?? {}),
  };

  base.requiresAuth = Boolean(base.requiresAuth);
  if (!base.layout) base.layout = 'public';
  if (!base.roles) base.roles = undefined;

  return base;
}

// Map web routes (public, unencrypted)
const mappedWebRoutes: CustomRouteRecordRaw[] = webRoutes.map((route) => {
  const routeMeta = normalizeMeta(route.meta, { requiresAuth: false, layout: 'public' });
  const children = route.children?.map((child) => {
    const childMeta = normalizeMeta(child.meta, { requiresAuth: false, layout: routeMeta.layout });
    return asRoute({ ...child, meta: childMeta });
  });
  return asRoute({ ...route, meta: routeMeta, children });
});

// Map role-based routes with encrypted paths
const mapRoleRoutes = (routes: CustomRouteRecordRaw[], role: string): CustomRouteRecordRaw[] => {
  return routes.map((route) => {
    const encodedPath = encodePath(route.path);
    const meta = normalizeMeta(
      { ...route.meta, originalPath: route.path, roles: [role] },
      { requiresAuth: true, layout: 'app' }
    );
    const children = route.children?.map((child) => {
      const childEncodedPath = encodePath(child.path);
      const childMeta = normalizeMeta(
        { ...child.meta, originalPath: child.path, roles: [role] },
        { requiresAuth: true, layout: 'app' }
      );
      return asRoute({
        ...child,
        path: childEncodedPath,
        meta: childMeta,
      });
    });
    return asRoute({
      ...route,
      path: encodedPath,
      meta,
      children,
    });
  });
};

// === ROUTES DEFINITION ===
const routes: CustomRouteRecordRaw[] = [
  // 1. Web Routes (Public) — includes root "/"
  ...mappedWebRoutes,

  // 2. Auth Routes
  {
    path: '/auth',
    component: AuthLayout,
    meta: normalizeMeta({ layout: 'auth', requiresAuth: false }),
    children: [
      {
        name: 'login',
        path: 'login',
        component: () => import('../pages/auth/Login.vue'),
        meta: normalizeMeta({ title: 'Login', layout: 'auth' }),
      },
      {
        name: 'signup',
        path: 'signup',
        component: () => import('../pages/auth/Signup.vue'),
        meta: normalizeMeta({ title: 'Sign Up', layout: 'auth' }),
      },
      {
        name: 'recover-password',
        path: 'recover-password',
        component: () => import('../pages/auth/ForgotPassword.vue'),
        meta: normalizeMeta({ title: 'Recover Password', layout: 'auth' }),
      },
      {
        name: 'recover-password-otp',
        path: 'recover-password-otp',
        component: () => import('../pages/auth/ResetPassword.vue'),
        props: (route) => ({ email: route.query.email, user_id: route.query.user_id }),
        meta: normalizeMeta({ title: 'Reset Password', layout: 'auth' }),
      },
      {
        name: 'activate-account',
        path: 'activate-account',
        component: () => import('../pages/auth/ActivateAccount.vue'),
        props: (route) => ({ email: route.query.email, user_id: route.query.user_id }),
        meta: normalizeMeta({ title: 'Activate Account', layout: 'auth' }),
      },
      {
        name: 'resend-otp',
        path: 'resend-otp',
        component: () => import('../pages/auth/ActivateAccount.vue'),
        props: (route) => ({ email: route.query.email, user_id: route.query.user_id }),
        meta: normalizeMeta({ title: 'Resend OTP', layout: 'auth' }),
      },
      {
        name: 'recover-password-email',
        path: 'recover-password-email',
        component: () => import('../pages/auth/CheckTheEmail.vue'),
        meta: normalizeMeta({ title: 'Check Your Email', layout: 'auth' }),
      },
    ],
  },

  // Direct auth redirects
  { name: 'login-direct', path: '/login', redirect: { name: 'login' }, meta: normalizeMeta({ requiresAuth: false }) },
  { name: 'signup-direct', path: '/signup', redirect: { name: 'signup' }, meta: normalizeMeta({ requiresAuth: false }) },

  // 3. Role-Based Encrypted Routes
  {
    path: '/app/:encodedPath(.*)*',
    name: 'app',
    component: AppLayout,
    meta: normalizeMeta({ requiresAuth: true, layout: 'app', roles: ['admin'] }),
    children: mapRoleRoutes(adminRoutes, 'admin'),
    redirect: () => {
      const userRole = AuthMiddleware.getUserRole();
      return userRole === 'admin'
        ? { path: `/app/${encodePath('dashboard')}` }
        : { name: 'not-found' };
    },
  },
  {
    path: '/tenant/:encodedPath(.*)*',
    name: 'tenant',
    component: AppLayout,
    meta: normalizeMeta({ requiresAuth: true, layout: 'app', roles: ['tenant'] }),
    children: mapRoleRoutes(tenantRoutes, 'tenant'),
    redirect: () => {
      const userRole = AuthMiddleware.getUserRole();
      return userRole === 'tenant'
        ? { path: `/tenant/${encodePath('tenant-home')}` }
        : { name: 'not-found' };
    },
  },
  {
    path: '/landlord/:encodedPath(.*)*',
    name: 'landlord',
    component: AppLayout,
    meta: normalizeMeta({ requiresAuth: true, layout: 'app', roles: ['landlord'] }),
    children: mapRoleRoutes(landlordRoutes, 'landlord'),
    redirect: () => {
      const userRole = AuthMiddleware.getUserRole();
      return userRole === 'landlord'
        ? { path: `/landlord/${encodePath('dashboard')}` }
        : { name: 'not-found' };
    },
  },

  // 4. 404 Page
  {
    name: 'not-found',
    path: '/404',
    component: () => import('../layouts/PublicLayout.vue'),
    meta: normalizeMeta({ title: 'Page Not Found', layout: 'public' }),
    children: [
      {
        path: '',
        component: () => import('../pages/404.vue'),
        meta: normalizeMeta({ requiresAuth: false }),
      },
    ],
  },

  // 5. Catch-all (MUST BE LAST)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
];

// === CREATE ROUTER ===
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes as unknown as RouteRecordRaw[],
});

// === NAVIGATION GUARD ===
router.beforeEach((to, from, next) => {
  const toMeta = (to.meta ?? {}) as RouteMeta;
  const authStore = useAuthStore();

  // Set page title
  if (toMeta.title) {
    document.title = `${toMeta.title} - EagerSky`;
  }

  // === 1. Session Expired? Clear and redirect ===
  if (!AuthMiddleware.isSessionValid()) {
    authStore.clearAuthData();
    if (toMeta.requiresAuth || to.path.startsWith('/app') || to.path.startsWith('/tenant') || to.path.startsWith('/landlord')) {
      return next({ path: '/', query: { sessionExpired: 'true' } });
    }
    return next();
  }

  // === 2. Authenticated + on root → redirect to dashboard ===
  if (to.path === '/' && AuthMiddleware.isSessionValid()) {
    const userRole = AuthMiddleware.getUserRole();
    if (userRole === 'admin') return next(`/app/${encodePath('dashboard')}`);
    if (userRole === 'tenant') return next(`/tenant/${encodePath('tenant-home')}`);
    if (userRole === 'landlord') return next(`/landlord/${encodePath('dashboard')}`);
    return next(); // fallback: stay on web home
  }

  // === 3. Protected Route (requiresAuth) ===
  if (toMeta.requiresAuth) {
    const userRole = AuthMiddleware.getUserRole();
    if (!userRole) {
      authStore.clearAuthData();
      return next('/');
    }

    const routeRoles = (toMeta.roles ?? []) as string[];
    if (routeRoles.length > 0 && !routeRoles.includes(userRole)) {
      console.warn(`Access denied: ${userRole} not in [${routeRoles.join(', ')}]`);
      return next('/');
    }

    // Validate encoded path
    const encodedPath = Array.isArray(to.params.encodedPath)
      ? to.params.encodedPath.join('/')
      : to.params.encodedPath;

    if (encodedPath && (to.path.startsWith('/app') || to.path.startsWith('/tenant') || to.path.startsWith('/landlord'))) {
      const decodedPath = decodePath(encodedPath);
      const roleRoutes = userRole === 'admin' ? adminRoutes :
                         userRole === 'tenant' ? tenantRoutes :
                         landlordRoutes;

      const isValid = roleRoutes.some(r =>
        r.path === decodedPath || r.children?.some(c => c.path === decodedPath)
      );

      if (!isValid) {
        console.warn(`Invalid path for ${userRole}: ${decodedPath}`);
        return next({ name: 'not-found' });
      }
    }

    return next();
  }

  // === 4. Public/Auth Pages: Block if authenticated ===
  if (!toMeta.requiresAuth && AuthMiddleware.isSessionValid()) {
    const blockedRoutes = [
      'login', 'signup', 'login-direct', 'signup-direct',
      'recover-password', 'recover-password-otp',
      'activate-account', 'resend-otp', 'recover-password-email'
    ];

    if (typeof to.name === 'string' && blockedRoutes.includes(to.name)) {
      const userRole = AuthMiddleware.getUserRole();
      const redirectMap: Record<string, string> = {
        admin: `/app/${encodePath('dashboard')}`,
        tenant: `/tenant/${encodePath('tenant-home')}`,
        landlord: `/landlord/${encodePath('dashboard')}`,
      };
      return next(redirectMap[userRole] || '/');
    }
  }

  // === 5. Allow ===
  return next();
});

export default router;