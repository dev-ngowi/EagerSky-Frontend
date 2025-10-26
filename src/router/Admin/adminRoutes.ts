import { RouteRecordRaw } from 'vue-router';
import RouteViewComponent from '../../layouts/RouterBypass.vue';

export const adminRoutes: RouteRecordRaw[] = [
  {
    name: 'admin-dashboard',
    path: 'dashboard',
    component: () => import('../../pages/admin/dashboard/AdminDashboard.vue'),
    meta: { requiresAuth: true, title: 'Admin Dashboard', icon: 'dashboard', roles: ['admin'] },
  },
  {
    name: 'users-management',
    path: 'users-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Users Management', roles: ['admin'] },
    children: [
      {
        name: 'users',
        path: 'users',
        component: () => import('../../pages/admin/user-management/users/UserList.vue'),
        meta: { requiresAuth: true, title: 'All Users', icon: 'person', roles: ['admin'] },
      },
      {
        name: 'roles',
        path: 'roles',
        component: () => import('../../pages/admin/user-management/roles/RoleList.vue'),
        meta: { requiresAuth: true, title: 'Roles', icon: 'admin_panel_settings', roles: ['admin'] },
      },
      {
        name: 'assign-roles',
        path: 'assign-roles',
        component: () => import('../../pages/admin/user-management/roles/RoleAssignment.vue'),
        meta: { requiresAuth: true, title: 'Assign Roles', icon: 'user-check', roles: ['admin'] },
      },
      {
        name: 'assign-approvers',
        path: 'assign-approvers',
        component: () => import('../../pages/admin/user-management/approval/assignApprovers.vue'),
        meta: { requiresAuth: true, title: 'Assign Approvers', icon: 'user-check', roles: ['admin'] },
      },

      
    ],
  },

  {
    name: 'property-management',
    path: 'property-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Property Management', icon: 'business', roles: ['admin'] },
    children: [
      {
        name: 'properties-management',
        path: 'properties-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Properties Master', icon: 'home', roles: ['admin'] },
        children: [
          {
              name: 'owner-management',
              path: 'owner-management',
              component: () => import('../../pages/admin/properties/owner/PropertyOwnerList.vue'),
              meta: { 
                requiresAuth: true, 
                title: 'Property Owner', 
                icon: 'real_estate_agent', // updated icon
                roles: ['admin'] 
              },
            },

          {
            name: 'category',
            path: 'category',
            component: () => import('../../pages/admin/properties/category/CategoryList.vue'),
            meta: { requiresAuth: true, title: 'Categories', icon: 'category', roles: ['admin'] },
          },
          {
            name: 'properties',
            path: 'properties',
            component: () => import('../../pages/admin/properties/all-properties/Properties.vue'),
            meta: { requiresAuth: true, title: 'All Properties', icon: 'house', roles: ['admin'] },
          },
          {
            name: 'images',
            path: 'images',
            component: () => import('../../pages/admin/properties/image/Images.vue'),
            meta: { requiresAuth: true, title: 'Properties Images', icon: 'image', roles: ['admin'] },
          },
          {
            name: 'property-features',
            path: 'property-features',
            component: () => import('../../pages/admin/properties/feature/Features.vue'),
            meta: { requiresAuth: true, title: 'Property Features', icon: 'category', roles: ['admin'] },
          },
          {
            name: 'rooms',
            path: 'rooms',
            component: () => import('../../pages/admin/properties/rooms/Rooms.vue'),
            meta: { requiresAuth: true, title: 'Rooms', icon: 'meeting_room', roles: ['admin'] },
          },
          {
            name: 'room-images',
            path: 'room-images',
            component: () => import('../../pages/admin/properties/room-image/RoomImage.vue'),
            meta: { requiresAuth: true, title: 'Room Images', icon: 'image', roles: ['admin'] },
          },
          {
            name: 'rooms-availability',
            path: 'rooms-availability',
            component: () => import('../../pages/admin/properties/rooms/RoomAvailability.vue'),
            meta: { requiresAuth: true, title: 'Room Availability', icon: 'meeting_room', roles: ['admin'] },
          },
          {
            name: 'reviews',
            path: 'reviews',
            component: () => import('../../pages/admin/properties/review/Reviews.vue'),
            meta: { requiresAuth: true, title: 'Reviews', icon: 'star', roles: ['admin'] },
          },
        ],
      },
      {
        name: 'locations-management',
        path: 'locations-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Locations Management', icon: 'location_on', roles: ['admin'] },
        children: [
          {
            name: 'locations',
            path: 'locations',
            component: () => import('../../pages/admin/locations/location/Locations.vue'),
            meta: { requiresAuth: true, title: 'All Locations', icon: 'location_on', roles: ['admin'] },
          },
          {
            name: 'neighborhoods',
            path: 'neighborhoods',
            component: () => import('../../pages/admin/locations/neighborhood/Neighborhoods.vue'),
            meta: { requiresAuth: true, title: 'Neighborhoods', icon: 'domain', roles: ['admin'] },
          },
          {
            name: 'branches',
            path: 'branches',
            component: () => import('../../pages/admin/locations/branches/Branches.vue'),
            meta: { requiresAuth: true, title: 'Branches', icon: 'apartment', roles: ['admin'] },
          },
        ],
      },
      {
        name: 'maintenance-management',
        path: 'maintenance-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Maintenance', icon: 'build', roles: ['admin'] },
        children: [
          {
            name: 'maintenance-requests',
            path: 'maintenance-requests',
            component: () => import('../../pages/admin/maintenance/request/Requests.vue'),
            meta: { requiresAuth: true, title: 'Requests', icon: 'report_problem', roles: ['admin'] },
          },
          {
            name: 'contractors',
            path: 'contractors',
            component: () => import('../../pages/admin/maintenance/contractor/Contractors.vue'),
            meta: { requiresAuth: true, title: 'Contractors', icon: 'engineering', roles: ['admin'] },
          },       
        ],
      },
     {
    name: 'documents-management',
    path: 'documents-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Documents', icon: 'description', roles: ['admin'] },
    children: [
      {
        name: 'document-category',
        path: 'document-category',
        component: () => import('../../pages/admin/documents/categories/DocumentCategoryList.vue'),
        meta: { requiresAuth: true, title: 'Categories', icon: 'category', roles: ['admin'] },
      },
      {
        name: 'documents',
        path: 'documents',
        component: () => import('../../pages/admin/documents/documents/DocumentList.vue'),
        meta: { requiresAuth: true, title: 'Documents', icon: 'insert_drive_file', roles: ['admin'] },
      },
      {
        name: 'templates',
        path: 'templates',
        component: () => import('../../pages/admin/documents/templates/TemplateList.vue'),
        meta: { requiresAuth: true, title: 'Templates', icon: 'article', roles: ['admin'] },
      },
      
    ],
  },
    ],
  },
  {
    name: 'rental-management',
    path: 'rental-management',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Rental Management', icon: 'calendar_month', roles: ['admin'] },
    children: [
      {
        name: 'bookings-management',
        path: 'bookings-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Bookings Master', icon: 'calendar_today', roles: ['admin'] },
        children: [
          {
            name: 'bookings',
            path: 'bookings',
            component: () => import('../../pages/admin/bookings/bookings/Bookings.vue'),
            meta: { requiresAuth: true, title: 'Booking Calendar', icon: 'event', roles: ['admin'] },
          },
          {
            name: 'pending-bookings',
            path: 'pending-bookings',
            component: () => import('../../pages/admin/bookings/bookings/PendingBookings.vue'),
            meta: { requiresAuth: true, title: 'Pending Bookings', icon: 'event', roles: ['admin'] },
          },
          {
            name: 'appointment-types',
            path: 'appointment-types',
            component: () => import('../../pages/admin/bookings/appointment-types/AppointmentTypes.vue'),
            meta: { requiresAuth: true, title: 'Appointment Types', icon: 'event_note', roles: ['admin'] },
          },
        ],
      },
      {
        name: 'clients-management',
        path: 'clients-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Rental & Leads', icon: 'people', roles: ['admin'] },
        children: [
          {
            name: 'admin-rental-applications',
            path: 'admin-rental-applications',
            component: () => import('../../pages/admin/clients/rental/RentalApplications.vue'),
            meta: { requiresAuth: true, title: 'Rental Applications', icon: 'assignment', roles: ['admin'] },
          },
          {
            name: 'pending_rental_application',
            path: 'pending-rental-application',
            component: () => import('../../pages/admin/clients/rental/PendingClientApplication.vue'),
            meta: { requiresAuth: true, title: 'Pending Rental Applications', icon: 'assignment', roles: ['admin'] },
          },
        ],
      },
      {
        name: 'leases-management',
        path: 'leases-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Leases Master', icon: 'receipt', roles: ['admin'] },
        children: [
          {
            name: 'leases',
            path: 'leases',
            component: () => import('../../pages/admin/leases/Leases.vue'),
            meta: { requiresAuth: true, title: 'Leases', icon: 'description', roles: ['admin'] },
          },
          {
            name: 'properties-term-period',
            path: 'properties-term-period',
            component: () => import('../../pages/admin/leases/PropertiesTermPeriod.vue'),
            meta: { requiresAuth: true, title: 'Term Period', icon: 'description', roles: ['admin'] },
          },
          {
            name: 'lease_agreement',
            path: 'lease-agreement',
            component: () => import('../../pages/admin/leases/ViewLeaseAgreement.vue'),
            meta: { requiresAuth: true, title: 'View Lease Agreement', icon: 'description', roles: ['admin'] },
          },
        ],
      },
      {
        name: 'communication-management',
        path: 'communication-management',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Communication', icon: 'notifications_active', roles: ['admin'] },
        children: [
          {
            name: 'client-message',
            path: 'client-message',
            component: () => import('../../pages/admin/communication/message/Message.vue'),
            meta: { requiresAuth: true, title: 'Client Messages', icon: 'message', roles: ['admin'] },
          },
          {
            name: 'alerts',
            path: 'alerts',
            component: () => import('../../pages/admin/communication/alter/Alerts.vue'),
            meta: { requiresAuth: true, title: 'Alerts', icon: 'warning', roles: ['admin'] },
          },
          {
            name: 'notifications',
            path: 'notifications',
            component: () => import('../../pages/admin/communication/notification/Notifications.vue'),
            meta: { requiresAuth: true, title: 'Notifications', icon: 'notifications', roles: ['admin'] },
          },
        ],
      },
    ],
  },
  {
    name: 'financial-management-main',
    path: 'financial-management-main',
    component: RouteViewComponent,
    meta: { requiresAuth: true, title: 'Financial Management', icon: 'account_balance', roles: ['admin'] },
    children: [
      {
        name: 'transaction-master',
        path: 'transaction-master',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Transaction Master', icon: 'receipt', roles: ['admin'] },
        children: [
          {
            name: 'admin-transactions',
            path: 'transactions',
            component: () => import('../../pages/admin/transactions/transaction/Transactions.vue'),
            meta: { requiresAuth: true, title: 'Transactions', icon: 'payments', roles: ['admin'] },
          },
          {
            name: 'admin-energy-consumption',
            path: 'energy-consumption',
            component: () => import('../../pages/admin/transactions/energies/EnergyConsumption.vue'),
            meta: { requiresAuth: true, title: 'Energy Consumption', icon: 'battery_charging_full', roles: ['admin'] },
          },
        ],
      },
      {
        name: 'payment-master-main',
        path: 'payment-master-main',
        component: RouteViewComponent,
        meta: { requiresAuth: true, title: 'Payment Master', icon: 'receipt', roles: ['admin'] },
        children: [
          {
            name: 'payment-method',
            path: 'payment-method',
            component: () => import('../../pages/admin/payments/paymentUtility/PaymentMethod.vue'),
            meta: { requiresAuth: true, title: 'Payment Method', icon: 'description', roles: ['admin'] },
          },
          {
            name: 'payment-type',
            path: 'payment-type',
            component: () => import('../../pages/admin/payments/paymentUtility/paymentType.vue'),
            meta: { requiresAuth: true, title: 'Payment Type', icon: 'payments', roles: ['admin'] },
          },
          {
            name: 'property-payments',
            path: 'property-payments',
            component: () => import('../../pages/admin/payments/propertyPayment/List.vue'),
            meta: { requiresAuth: true, title: 'Properties Payments', icon: 'battery_charging_full', roles: ['admin'] },
          },
          {
            name: 'payment-master',
            path: 'payment-master',
            component: () => import('../../pages/admin/payments/paymentMaster/List.vue'),
            meta: { requiresAuth: true, title: 'Payment Master', icon: 'description', roles: ['admin'] },
          },
          {
            name: 'pending-payments',
            path: 'pending-payments',
            component: () => import('../../pages/admin/payments/paymentMaster/Pending.vue'),
            meta: { requiresAuth: true, title: 'Pending Payments', icon: 'description', roles: ['admin'] },
          },
        ],
      },
    ],
  },
  
{
  name: 'report-master',
  path: 'report-master',
  component: RouteViewComponent,
  meta: { requiresAuth: true, title: 'Report Master', icon: 'bar_chart', roles: ['admin'] }, // Updated icon to match menu
  children: [
    {
      name: 'property-reports',
      path: 'property-reports',
      component: () => import('../../pages/admin/reports/property/PropertyReports.vue'),
      meta: { requiresAuth: true, title: 'Property Reports', icon: 'home', roles: ['admin'] }, // Updated icon to match menu
    },
    {
      name: 'booking-reports',
      path: 'booking-reports',
      component: () => import('../../pages/admin/reports/booking/BookingReports.vue'),
      meta: { requiresAuth: true, title: 'Bookings Reports', icon: 'event', roles: ['admin'] }, // Added route with matching icon
    },
    {
      name: 'rental-reports',
      path: 'rental-reports',
      component: () => import('../../pages/admin/reports/rental/RentalReports.vue'),
      meta: { requiresAuth: true, title: 'Rentals Reports', icon: 'store', roles: ['admin'] }, // Added route with matching icon
    },
    {
      name: 'lease-reports',
      path: 'lease-reports',
      component: () => import('../../pages/admin/reports/lease/LeaseReports.vue'),
      meta: { requiresAuth: true, title: 'Leases Reports', icon: 'description', roles: ['admin'] }, // Added route with matching icon
    },
    {
      name: 'payments-reports',
      path: 'payments-reports',
      component: () => import('../../pages/admin/reports/payments/PaymentsReports.vue'),
      meta: { requiresAuth: true, title: 'Payments Reports', icon: 'payments', roles: ['admin'] }, // Added route with matching icon
    },
  ],
}

];