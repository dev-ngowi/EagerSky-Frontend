import { RouteRecordRaw } from 'vue-router'
import RouteViewComponent from '../../layouts/RouterBypass.vue'

// Tenant-specific routes focused on specified features
export const tenantRoutes: RouteRecordRaw[] = [
  // Tenant Dashboard
  {
  name: 'tenant-home',
  path: 'tenant-home',
  component: () => import('../../pages/tenant/dashboard/TenantDashboard.vue'),
  meta: { requiresAuth: true, title: 'Tenant Dashboard', icon: 'dashboard', roles: ['tenant'] },
},

  // Booking History
  {
    name: 'booking-history',
    path: 'booking-history',
    component: () => import('../../pages/tenant/bookings/TenantBookingHistory.vue'),
    meta: { requiresAuth: true, title: 'Booking History', icon: 'history', roles: ['tenant'] },
  },

  // Rental Applications
  {
    name: 'rental-applications',
    path: 'rental-applications',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Rental Applications', icon: 'assignment', roles: ['tenant'] },
    children: [
      {
        name: 'submit-application',
        path: 'submit',
        component: () => import('../../pages/tenant/applications/TenantSubmitApplication.vue'),
        meta: { requiresAuth: true, title: 'Submit Application', icon: 'add_circle', roles: ['tenant'] },
      },
      {
        name: 'my-applications',
        path: 'my-applications',
        component: () => import('../../pages/tenant/applications/TenantMyApplications.vue'),
        meta: { requiresAuth: true, title: 'My Applications', icon: 'list', roles: ['tenant'] },
      },
    ],
  },

  // Leases
  {
    name: 'leases',
    path: 'leases',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Leases', icon: 'description', roles: ['tenant'] },
    children: [
      {
        name: 'tenant-lease-agreement',
        path: 'lease-agreement',
        component: () => import('../../pages/tenant/rental/TenantLeaseAgreement.vue'),
        meta: { requiresAuth: true, title: 'My Lease Agreement', icon: 'description', roles: ['tenant'] },
      },
    ],
  },

  // Payment History
  {
    name: 'payment-history',
    path: 'payment-history',
    component: () => import('../../pages/tenant/payments/TenantPaymentHistory.vue'),
    meta: { requiresAuth: true, title: 'Payment History', icon: 'history', roles: ['tenant'] },
  },

  // Maintenance Requests
  {
    name: 'tenant-maintenance',
    path: 'maintenance',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Maintenance', icon: 'build', roles: ['tenant'] },
    children: [
      {
        name: 'submit-request',
        path: 'submit',
        component: () => import('../../pages/tenant/maintenance/TenantSubmitRequest.vue'),
        meta: { requiresAuth: true, title: 'Submit Request', icon: 'add_task', roles: ['tenant'] },
      },
      {
        name: 'my-requests',
        path: 'requests',
        component: () => import('../../pages/tenant/maintenance/TenantMyRequests.vue'),
        meta: { requiresAuth: true, title: 'My Requests', icon: 'list_alt', roles: ['tenant'] },
      },
    ],
  },

  // My Profile
  {
    name: 'tenant-profile',
    path: 'profile',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'My Profile', icon: 'person', roles: ['tenant'] },
    children: [
      {
        name: 'personal-info',
        path: 'info',
        component: () => import('../../pages/tenant/profile/TenantPersonalInfo.vue'),
        meta: { requiresAuth: true, title: 'Personal Information', icon: 'person_outline', roles: ['tenant'] },
      },
      {
        name: 'emergency-contacts',
        path: 'emergency',
        component: () => import('../../pages/tenant/profile/TenantEmergencyContacts.vue'),
        meta: { requiresAuth: true, title: 'Emergency Contacts', icon: 'contact_emergency', roles: ['tenant'] },
      },
    ],
  },
]