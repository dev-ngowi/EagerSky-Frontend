import { RouteRecordRaw } from 'vue-router';
import RouteViewComponent from '../../layouts/RouterBypass.vue';

export const landlordRoutes: RouteRecordRaw[] = [
  // Dashboard: Overview of landlord's properties, leases, payments, and maintenance requests
  {
    name: 'landlord-dashboard',
    path: 'dashboard',
    component: () => import('../../pages/landlord/dashboard/LandlordDashboard.vue'),
    meta: { requiresAuth: true, title: 'Dashboard', icon: 'dashboard', roles: ['landlord'] },
  },

  // My Properties: Manage owned properties, images, features, rooms, and availability
  {
    name: 'landlord-properties',
    path: 'properties',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'My Properties', icon: 'home', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-properties',
        path: '',
        component: () => import('../../pages/landlord/properties/LandlordProperties.vue'),
        meta: { requiresAuth: true, title: 'All Properties', icon: 'house', roles: ['landlord'] },
      },
      {
        name: 'landlord-property-images',
        path: 'images',
        component: () => import('../../pages/landlord/properties/LandlordPropertyImages.vue'),
        meta: { requiresAuth: true, title: 'Property Images', icon: 'image', roles: ['landlord'] },
      },
      {
        name: 'landlord-property-features',
        path: 'features',
        component: () => import('../../pages/landlord/properties/LandlordPropertyFeatures.vue'),
        meta: { requiresAuth: true, title: 'Property Features', icon: 'category', roles: ['landlord'] },
      },
      {
        name: 'landlord-rooms',
        path: 'rooms',
        component: () => import('../../pages/landlord/properties/LandlordRooms.vue'),
        meta: { requiresAuth: true, title: 'Rooms / Units', icon: 'meeting_room', roles: ['landlord'] },
      },
      {
        name: 'landlord-room-availability',
        path: 'room-availability',
        component: () => import('../../pages/landlord/properties/LandlordRoomAvailability.vue'),
        meta: { requiresAuth: true, title: 'Room Availability', icon: 'event_available', roles: ['landlord'] },
      },
    ],
  },

  // Tenants: Manage current tenants and rental applications
  {
    name: 'landlord-tenants',
    path: 'tenants',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Tenants', icon: 'people', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-tenants',
        path: '',
        component: () => import('../../pages/landlord/tenants/LandlordTenants.vue'),
        meta: { requiresAuth: true, title: 'Current Tenants', icon: 'person_outline', roles: ['landlord'] },
      },
      {
        name: 'landlord-rental-applications',
        path: 'applications',
        component: () => import('../../pages/landlord/tenants/LandlordRentalApplications.vue'),
        meta: { requiresAuth: true, title: 'Rental Applications', icon: 'assignment', roles: ['landlord'] },
      },
    ],
  },

  // Rental Management: Manage bookings and tenant interactions
  {
    name: 'landlord-rental-management',
    path: 'rental-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Rental Management', icon: 'calendar_month', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-bookings',
        path: 'bookings',
        component: () => import('../../pages/landlord/rental/LandlordBookings.vue'),
        meta: { requiresAuth: true, title: 'Bookings', icon: 'event', roles: ['landlord'] },
      },
    ],
  },

  // Leases & Contracts: Manage active and expired leases
  {
    name: 'landlord-leases',
    path: 'leases',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Leases & Contracts', icon: 'receipt', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-active-leases',
        path: '',
        component: () => import('../../pages/landlord/leases/LandlordActiveLeases.vue'),
        meta: { requiresAuth: true, title: 'Active Leases', icon: 'description', roles: ['landlord'] },
      },
      {
        name: 'landlord-expired-leases',
        path: 'expired',
        component: () => import('../../pages/landlord/leases/LandlordExpiredLeases.vue'),
        meta: { requiresAuth: true, title: 'Expired Leases', icon: 'history', roles: ['landlord'] },
      },
    ],
  },

  // Payments: Track rent payments and pending/overdue payments
  {
    name: 'landlord-payments',
    path: 'payments',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Payments', icon: 'attach_money', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-rent-payments',
        path: '',
        component: () => import('../../pages/landlord/financial/LandlordRentPayments.vue'),
        meta: { requiresAuth: true, title: 'Rent Payments', icon: 'payments', roles: ['landlord'] },
      },
      {
        name: 'landlord-pending-payments',
        path: 'pending',
        component: () => import('../../pages/landlord/financial/LandlordPendingPayments.vue'),
        meta: { requiresAuth: true, title: 'Pending / Overdue', icon: 'report_problem', roles: ['landlord'] },
      },
    ],
  },

  // Maintenance Requests: View and manage maintenance requests and history
  {
    name: 'landlord-maintenance',
    path: 'maintenance',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Maintenance Requests', icon: 'build', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-maintenance-requests',
        path: '',
        component: () => import('../../pages/landlord/maintenance/LandlordMaintenanceRequests.vue'),
        meta: { requiresAuth: true, title: 'Requests', icon: 'report_problem', roles: ['landlord'] },
      },
      {
        name: 'landlord-maintenance-history',
        path: 'history',
        component: () => import('../../pages/landlord/maintenance/LandlordMaintenanceHistory.vue'),
        meta: { requiresAuth: true, title: 'History', icon: 'history', roles: ['landlord'] },
      },
      {
        name: 'landlord-new-maintenance-request',
        path: 'new-request',
        component: () => import('../../pages/landlord/maintenance/LandlordNewMaintenanceRequest.vue'),
        meta: { requiresAuth: true, title: 'New Request', icon: 'add_circle', roles: ['landlord'] },
      },
    ],
  },

  // Communication: Manage messages and notifications with tenants
  {
    name: 'landlord-communication',
    path: 'communication',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Communication', icon: 'message', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-messages',
        path: '',
        component: () => import('../../pages/landlord/communication/LandlordTenantMessages.vue'),
        meta: { requiresAuth: true, title: 'Messages', icon: 'chat', roles: ['landlord'] },
      },
      {
        name: 'landlord-notifications',
        path: 'notifications',
        component: () => import('../../pages/landlord/communication/LandlordNotifications.vue'),
        meta: { requiresAuth: true, title: 'Notifications', icon: 'notifications', roles: ['landlord'] },
      },
    ],
  },

  // Reports: Generate reports for properties, payments, and occupancy
  {
    name: 'landlord-reports',
    path: 'reports',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Reports', icon: 'assessment', roles: ['landlord'] },
    children: [
      {
        name: 'landlord-property-reports',
        path: '',
        component: () => import('../../pages/landlord/reports/LandlordPropertyReports.vue'),
        meta: { requiresAuth: true, title: 'Property Reports', icon: 'home_work', roles: ['landlord'] },
      },
      {
        name: 'landlord-payments-reports',
        path: 'payments',
        component: () => import('../../pages/landlord/reports/LandlordPaymentsReports.vue'),
        meta: { requiresAuth: true, title: 'Payments Reports', icon: 'attach_money', roles: ['landlord'] },
      },
      {
        name: 'landlord-occupancy-reports',
        path: 'occupancy',
        component: () => import('../../pages/landlord/reports/LandlordOccupancyReports.vue'),
        meta: { requiresAuth: true, title: 'Occupancy Reports', icon: 'bar_chart', roles: ['landlord'] },
      },
    ],
  },
];