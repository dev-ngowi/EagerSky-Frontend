// src/router/Web/WebRoutes.ts
import { RouteRecordRaw } from 'vue-router';
import { AuthMiddleware } from '../../utils/authMiddleware';
import { encodePath } from '../index';

export const webRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('../../layouts/PublicLayout.vue'),
    children: [
      // ROOT: Show Home.vue at "/"
      {
        path: '', // ← Empty path = root of parent
        name: 'web-home',
        component: () => import('../../pages/web/Home.vue'),
        meta: { title: 'Home', requiresAuth: false },
      },

      // Other public pages
      {
        name: 'all-properties',
        path: 'all-properties',
        component: () => import('../../pages/web/AllListing.vue'),
        meta: { title: 'Properties', requiresAuth: false },
      },
      {
        name: 'my-property-details',
        path: 'all-properties/:id',
        component: () => import('../../pages/web/PropertyDetails.vue'),
        meta: { title: 'Property Details', requiresAuth: false },
      },
      {
        name: 'room-details',
        path: 'all-properties/:propertyId/room/:roomNumber',
        component: () => import('../../pages/web/RoomDetails.vue'),
        meta: { title: 'Room Details', requiresAuth: false },
      },
      {
        name: 'book-property',
        path: 'book/property/:id回避',
        component: () => import('../../pages/web/BookProperty.vue'),
        meta: { title: 'Book Property', requiresAuth: false },
      },
      {
        name: 'book-room',
        path: 'book/room/:propertyId/:roomNumber',
        component: () => import('../../pages/web/BookRoom.vue'),
        meta: { title: 'Book Room', requiresAuth: false },
      },
      {
        name: 'services',
        path: 'services',
        component: () => import('../../pages/web/Services.vue'),
        meta: { title: 'Services', requiresAuth: false },
      },
      {
        name: 'service-details',
        path: 'service-details',
        component: () => import('../../pages/web/ServiceDetails.vue'),
        meta: { title: 'Service Details', requiresAuth: false },
      },
      {
        name: 'about',
        path: 'about',
        component: () => import('../../pages/web/About.vue'),
        meta: { title: 'About', requiresAuth: false },
      },
      {
        name: 'contact',
        path: 'contact',
        component: () => import('../../pages/web/Contact.vue'),
        meta: { title: 'Contact', requiresAuth: false },
      },
    ],
  },

  // PURE REDIRECT: /my-account → role-based dashboard
  {
    name: 'my-account',
    path: '/my-account',
    redirect: () => {
      if (!AuthMiddleware.isSessionValid()) return '/auth/login';

      const userRole = AuthMiddleware.getUserRole();
      if (userRole === 'tenant') return `/tenant/${encodePath('tenant-home')}`;
      if (userRole === 'landlord') return `/landlord/${encodePath('dashboard')}`;
      if (userRole === 'admin') return `/app/${encodePath('dashboard')}`;

      return '/auth/login';
    },
    meta: { requiresAuth: true },
  },

  // Shared profile (optional, outside role dashboards)
  {
    path: '/profile',
    component: () => import('../../layouts/PrivateLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'profile',
        component: () => import('../../pages/web/my-account/Profile.vue'),
        meta: { title: 'Profile', requiresAuth: true },
      },
    ],
  },
];