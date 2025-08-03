import { RouteRecordRaw } from 'vue-router'
import RouteViewComponent from '../../layouts/RouterBypass.vue'

// Tenant-specific routes focused on rental experience
export const tenantRoutes: RouteRecordRaw[] = [
  // Tenant Dashboard
  {
    name: 'tenant-dashboard',
    path: 'dashboard',
    component: () => import('../../pages/tenant/dashboard/TenantDashboard.vue'),
    meta: { requiresAuth: true, title: 'Tenant Dashboard', icon: 'dashboard', roles: ['tenant'] },
  },

  // My Rental Information
  {
    name: 'my-rental',
    path: 'my-rental',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'My Rental', icon: 'home', roles: ['tenant'] },
    children: [
      {
        name: 'property-details',
        path: 'details',
        component: () => import('../../pages/tenant/rental/TenantPropertyDetails.vue'),
        meta: { requiresAuth: true, title: 'Property Details', icon: 'house', roles: ['tenant'] },
      },
      {
        name: 'tenant-lease-agreement',
        path: 'lease-agreement',
        component: () => import('../../pages/tenant/rental/TenantLeaseAgreement.vue'),
        meta: { requiresAuth: true, title: 'My Lease Agreement', icon: 'description', roles: ['tenant'] },
      },
      {
        name: 'property-gallery',
        path: 'gallery',
        component: () => import('../../pages/tenant/rental/TenantPropertyGallery.vue'),
        meta: { requiresAuth: true, title: 'Property Gallery', icon: 'image', roles: ['tenant'] },
      },
      {
        name: 'neighborhood-info',
        path: 'neighborhood',
        component: () => import('../../pages/tenant/rental/TenantNeighborhoodInfo.vue'),
        meta: { requiresAuth: true, title: 'Neighborhood Info', icon: 'location_on', roles: ['tenant'] },
      },
    ],
  },

  // Rent & Payments
  {
    name: 'rent-payments',
    path: 'rent-payments',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Rent & Payments', icon: 'payments', roles: ['tenant'] },
    children: [
      {
        name: 'pay-rent',
        path: 'pay-rent',
        component: () => import('../../pages/tenant/payments/TenantPayRent.vue'),
        meta: { requiresAuth: true, title: 'Pay Rent', icon: 'payment', roles: ['tenant'] },
      },
      {
        name: 'payment-history',
        path: 'history',
        component: () => import('../../pages/tenant/payments/TenantPaymentHistory.vue'),
        meta: { requiresAuth: true, title: 'Payment History', icon: 'history', roles: ['tenant'] },
      },
      {
        name: 'payment-methods',
        path: 'methods',
        component: () => import('../../pages/tenant/payments/TenantPaymentMethods.vue'),
        meta: { requiresAuth: true, title: 'Payment Methods', icon: 'credit_card', roles: ['tenant'] },
      },
      {
        name: 'receipts',
        path: 'receipts',
        component: () => import('../../pages/tenant/payments/TenantReceipts.vue'),
        meta: { requiresAuth: true, title: 'Receipts', icon: 'receipt', roles: ['tenant'] },
      },
    ],
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
      {
        name: 'request-status',
        path: 'status',
        component: () => import('../../pages/tenant/maintenance/TenantRequestStatus.vue'),
        meta: { requiresAuth: true, title: 'Request Status', icon: 'track_changes', roles: ['tenant'] },
      },
    ],
  },

  // Communication
  {
    name: 'tenant-communication',
    path: 'communication',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Communication', icon: 'message', roles: ['tenant'] },
    children: [
      {
        name: 'landlord-messages',
        path: 'messages',
        component: () => import('../../pages/tenant/communication/TenantMessages.vue'),
        meta: { requiresAuth: true, title: 'Messages', icon: 'chat', roles: ['tenant'] },
      },
      {
        name: 'tenant-notifications',
        path: 'notifications',
        component: () => import('../../pages/tenant/communication/TenantNotifications.vue'),
        meta: { requiresAuth: true, title: 'Notifications', icon: 'notifications', roles: ['tenant'] },
      },
      {
        name: 'tenant-announcements',
        path: 'announcements',
        component: () => import('../../pages/tenant/communication/TenantAnnouncements.vue'),
        meta: { requiresAuth: true, title: 'Announcements', icon: 'campaign', roles: ['tenant'] },
      },
    ],
  },

  // Utilities & Services
  {
    name: 'utilities',
    path: 'utilities',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Utilities & Services', icon: 'electrical_services', roles: ['tenant'] },
    children: [
      {
        name: 'tenant-energy-consumption',
        path: 'energy',
        component: () => import('../../pages/tenant/utilities/TenantEnergyUsage.vue'),
        meta: { requiresAuth: true, title: 'Energy Usage', icon: 'battery_charging_full', roles: ['tenant'] },
      },
      {
        name: 'utility-bills',
        path: 'bills',
        component: () => import('../../pages/tenant/utilities/TenantUtilityBills.vue'),
        meta: { requiresAuth: true, title: 'Utility Bills', icon: 'receipt_long', roles: ['tenant'] },
      },
      {
        name: 'service-providers',
        path: 'services',
        component: () => import('../../pages/tenant/utilities/TenantServiceProviders.vue'),
        meta: { requiresAuth: true, title: 'Service Providers', icon: 'business', roles: ['tenant'] },
      },
    ],
  },

  // Documents
  {
    name: 'tenant-documents',
    path: 'documents',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Documents', icon: 'description', roles: ['tenant'] },
    children: [
      {
        name: 'tenant-lease-documents',
        path: 'lease',
        component: () => import('../../pages/tenant/documents/TenantLeaseDocuments.vue'),
        meta: { requiresAuth: true, title: 'Lease Documents', icon: 'insert_drive_file', roles: ['tenant'] },
      },
      {
        name: 'important-notices',
        path: 'notices',
        component: () => import('../../pages/tenant/documents/TenantImportantNotices.vue'),
        meta: { requiresAuth: true, title: 'Important Notices', icon: 'info', roles: ['tenant'] },
      },
      {
        name: 'move-in-documents',
        path: 'move-in',
        component: () => import('../../pages/tenant/documents/TenantMoveInDocuments.vue'),
        meta: { requiresAuth: true, title: 'Move-in Documents', icon: 'moving', roles: ['tenant'] },
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
      {
        name: 'tenant-lease-renewal',
        path: 'renewal',
        component: () => import('../../pages/tenant/profile/TenantLeaseRenewal.vue'),
        meta: { requiresAuth: true, title: 'Lease Renewal', icon: 'refresh', roles: ['tenant'] },
      },
    ],
  },

  // Settings (Tenant View)
  {
    name: 'tenant-settings',
    path: 'settings',
    component: () => import('../../pages/tenant/settings/TenantSettings.vue'),
    meta: { requiresAuth: true, title: 'Tenant Settings', icon: 'settings', roles: ['tenant'] },
  },
]