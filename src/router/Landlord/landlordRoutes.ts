import { RouteRecordRaw } from 'vue-router'
import RouteViewComponent from '../../layouts/RouterBypass.vue'

// Landlord-specific routes focused on property management
export const landlordRoutes: RouteRecordRaw[] = [
  // Landlord Dashboard
  {
    name: 'landlord-dashboard',
    path: 'dashboard',
    component: () => import('../../pages/landlord/dashboard/LandlordDashboard.vue'),
    meta: { requiresAuth: true, title: 'Landlord Dashboard', icon: 'dashboard', roles: ['landlord'] },
  },

  // My Properties Management
  {
    name: 'my-properties',
    path: 'my-properties',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'My Properties', icon: 'home', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-properties',
        path: 'properties',
        component: () => import('../../pages/landlord/properties/LandlordProperties.vue'),
        meta: { requiresAuth: true, title: 'All Properties', icon: 'house', roles: ['landlord'] },
      },
      {
        name: 'landlord-property-features',
        path: 'property-features',
        component: () => import('../../pages/landlord/properties/LandlordPropertyFeatures.vue'),
        meta: { requiresAuth: true, title: 'Property Features', icon: 'category', roles: ['landlord'] },
      },
      {
        name: 'landlord-rooms',
        path: 'rooms',
        component: () => import('../../pages/landlord/properties/LandlordRooms.vue'),
        meta: { requiresAuth: true, title: 'Rooms', icon: 'meeting_room', roles: ['landlord'] },
      },
      {
        name: 'landlord-images',
        path: 'images',
        component: () => import('../../pages/landlord/properties/LandlordImages.vue'),
        meta: { requiresAuth: true, title: 'Images', icon: 'image', roles: ['landlord'] },
      },
      {
        name: 'landlord-property-reviews',
        path: 'reviews',
        component: () => import('../../pages/landlord/properties/LandlordReviews.vue'),
        meta: { requiresAuth: true, title: 'Property Reviews', icon: 'star', roles: ['landlord'] },
      },
    ],
  },

  // Tenant Management
  {
    name: 'tenant-management',
    path: 'tenant-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Tenant Management', icon: 'people', roles: ['landlord'] },
    children: [
      {
        name: 'tenants',
        path: 'tenants',
        component: () => import('../../pages/landlord/tenants/LandlordTenants.vue'),
        meta: { requiresAuth: true, title: 'Current Tenants', icon: 'person_outline', roles: ['landlord'] },
      },
      {
        name: 'landlord-rental-applications',
        path: 'rental-applications',
        component: () => import('../../pages/landlord/tenants/LandlordRentalApplications.vue'),
        meta: { requiresAuth: true, title: 'Rental Applications', icon: 'assignment', roles: ['landlord'] },
      },
      {
        name: 'pending-rental-application',
        path: 'pending-applications',
        component: () => import('../../pages/landlord/tenants/LandlordPendingApplications.vue'),
        meta: { requiresAuth: true, title: 'Pending Applications', icon: 'assignment', roles: ['landlord'] },
      },
    ],
  },

  // Bookings & Viewings
  {
    name: 'bookings-viewing',
    path: 'bookings-viewing',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Bookings & Viewings', icon: 'calendar_today', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-bookings',
        path: 'bookings',
        component: () => import('../../pages/landlord/bookings/LandlordBookings.vue'),
        meta: { requiresAuth: true, title: 'Booking Calendar', icon: 'event', roles: ['landlord'] },
      },
      {
        name: 'landlord-pending-bookings',
        path: 'pending-bookings',
        component: () => import('../../pages/landlord/bookings/LandlordPendingBookings.vue'),
        meta: { requiresAuth: true, title: 'Pending Bookings', icon: 'event', roles: ['landlord'] },
      },
      {
        name: 'landlord-schedules',
        path: 'schedules',
        component: () => import('../../pages/landlord/bookings/LandlordSchedules.vue'),
        meta: { requiresAuth: true, title: 'My Schedule', icon: 'access_time', roles: ['landlord'] },
      },
    ],
  },

  // Lease Management
  {
    name: 'lease-management',
    path: 'lease-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Lease Management', icon: 'receipt', roles: ['landlord'] },
    children: [
      {
        name: 'active-leases',
        path: 'leases',
        component: () => import('../../pages/landlord/leases/LandlordActiveLeases.vue'),
        meta: { requiresAuth: true, title: 'Active Leases', icon: 'description', roles: ['landlord'] },
      },
      {
        name: 'lease-agreements',
        path: 'agreements',
        component: () => import('../../pages/landlord/leases/LandlordLeaseAgreements.vue'),
        meta: { requiresAuth: true, title: 'Lease Agreements', icon: 'description', roles: ['landlord'] },
      },
      {
        name: 'lease-renewals',
        path: 'renewals',
        component: () => import('../../pages/landlord/leases/LandlordLeaseRenewals.vue'),
        meta: { requiresAuth: true, title: 'Lease Renewals', icon: 'refresh', roles: ['landlord'] },
      },
    ],
  },

  // Financial Management
  {
    name: 'financial-management',
    path: 'financial-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Financial Management', icon: 'attach_money', roles: ['landlord'] },
    children: [
      {
        name: 'rent-collection',
        path: 'rent-collection',
        component: () => import('../../pages/landlord/financial/LandlordRentCollection.vue'),
        meta: { requiresAuth: true, title: 'Rent Collection', icon: 'payments', roles: ['landlord'] },
      },
      {
        name: 'landlord-transactions',
        path: 'transactions',
        component: () => import('../../pages/landlord/financial/LandlordTransactions.vue'),
        meta: { requiresAuth: true, title: 'Transactions', icon: 'receipt', roles: ['landlord'] },
      },
      {
        name: 'property-expenses',
        path: 'expenses',
        component: () => import('../../pages/landlord/financial/LandlordPropertyExpenses.vue'),
        meta: { requiresAuth: true, title: 'Property Expenses', icon: 'money_off', roles: ['landlord'] },
      },
      {
        name: 'financial-reports',
        path: 'reports',
        component: () => import('../../pages/landlord/financial/LandlordFinancialReports.vue'),
        meta: { requiresAuth: true, title: 'Financial Reports', icon: 'assessment', roles: ['landlord'] },
      },
    ],
  },

  // Maintenance Management
  {
    name: 'landlord-maintenance',
    path: 'maintenance',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Maintenance', icon: 'build', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-maintenance-requests',
        path: 'requests',
        component: () => import('../../pages/landlord/maintenance/LandlordMaintenanceRequests.vue'),
        meta: { requiresAuth: true, title: 'Maintenance Requests', icon: 'report_problem', roles: ['landlord'] },
      },
      {
        name: 'landlord-contractors',
        path: 'contractors',
        component: () => import('../../pages/landlord/maintenance/LandlordContractors.vue'),
        meta: { requiresAuth: true, title: 'My Contractors', icon: 'engineering', roles: ['landlord'] },
      },
      {
        name: 'maintenance-history',
        path: 'history',
        component: () => import('../../pages/landlord/maintenance/LandlordMaintenanceHistory.vue'),
        meta: { requiresAuth: true, title: 'Maintenance History', icon: 'history', roles: ['landlord'] },
      },
    ],
  },

  // Communication
  {
    name: 'landlord-communication',
    path: 'communication',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Communication', icon: 'message', roles: ['landlord'] },
    children: [
      {
        name: 'tenant-messages',
        path: 'tenant-messages',
        component: () => import('../../pages/landlord/communication/LandlordTenantMessages.vue'),
        meta: { requiresAuth: true, title: 'Tenant Messages', icon: 'chat', roles: ['landlord'] },
      },
      {
        name: 'landlord-notifications',
        path: 'notifications',
        component: () => import('../../pages/landlord/communication/LandlordNotifications.vue'),
        meta: { requiresAuth: true, title: 'Notifications', icon: 'notifications', roles: ['landlord'] },
      },
      {
        name: 'send-announcements',
        path: 'announcements',
        component: () => import('../../pages/landlord/communication/LandlordAnnouncements.vue'),
        meta: { requiresAuth: true, title: 'Send Announcements', icon: 'campaign', roles: ['landlord'] },
      },
    ],
  },

  // Documents Management
  {
    name: 'landlord-documents',
    path: 'documents',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Documents', icon: 'description', roles: ['landlord'] },
    children: [
      {
        name: 'lease-documents',
        path: 'lease-documents',
        component: () => import('../../pages/landlord/documents/LandlordLeaseDocuments.vue'),
        meta: { requiresAuth: true, title: 'Lease Documents', icon: 'insert_drive_file', roles: ['landlord'] },
      },
      {
        name: 'property-documents',
        path: 'property-documents',
        component: () => import('../../pages/landlord/documents/LandlordPropertyDocuments.vue'),
        meta: { requiresAuth: true, title: 'Property Documents', icon: 'folder', roles: ['landlord'] },
      },
      {
        name: 'document-templates',
        path: 'templates',
        component: () => import('../../pages/landlord/documents/LandlordDocumentTemplates.vue'),
        meta: { requiresAuth: true, title: 'Document Templates', icon: 'article', roles: ['landlord'] },
      },
    ],
  },

  // Settings (Landlord View)
  {
    name: 'landlord-settings',
    path: 'settings',
    component: () => import('../../pages/landlord/settings/LandlordSettings.vue'),
    meta: { requiresAuth: true, title: 'Landlord Settings', icon: 'settings', roles: ['landlord'] },
  },
]