import type { INavigationRoute } from '../navigation-types';

const adminRoutes: INavigationRoute[] = [
  {
    name: 'admin-dashboard',
    displayName: 'Dashboard',
    meta: { icon: 'dashboard' },
  },
  {
    name: 'users-management',
    displayName: 'Users Master',
    meta: { icon: 'group' },
    children: [
      { name: 'users', displayName: 'All Users', meta: { icon: 'person' } },
      { name: 'roles', displayName: 'Roles', meta: { icon: 'admin_panel_settings' } },
      { name: 'assign-roles', displayName: 'Assign Roles', meta: { icon: 'manage_accounts' } },
     { name: 'assign-approvers', displayName: 'Assign Approvers', meta: { icon: 'manage_accounts' } },
    ],
  },
{
    "name": "quick-menu",
    "displayName": "Quick Menu",
    "meta": { "icon": "dashboard" },
    "children": [
      { "name": "pending-bookings", "displayName": "Pending Bookings", "meta": { "icon": "event" } },
      { "name": "pending_rental_application", "displayName": "Pending Rental Application", "meta": { "icon": "description" } },
      { "name": "pending-payments", "displayName": "Pending Payments", "meta": { "icon": "payment" } },
     
    ]
},
  {
    name: 'property-management',
    displayName: 'Property Master',
    meta: { icon: 'business' },
    children: [
      {
        name: 'properties-management',
        displayName: 'Properties Master',
        meta: { icon: 'home' },
        children: [
          
          { name: 'owner-management', displayName: 'Property Owner', meta: { icon: 'real_estate_agent' } },
          { name: 'category', displayName: 'Categories', meta: { icon: 'category' } },
          { name: 'properties', displayName: 'All Properties', meta: { icon: 'house' } },
          { name: 'images', displayName: 'Properties Images', meta: { icon: 'image' } },
          { name: 'property-features', displayName: 'Property Features', meta: { icon: 'category' } },
          { name: 'rooms', displayName: 'Rooms', meta: { icon: 'meeting_room' } },
          { name: 'room-images', displayName: 'Room Images', meta: { icon: 'image' } },
          { name: 'rooms-availability', displayName: 'Room Availability', meta: { icon: 'meeting_room' } },
          { name: 'reviews', displayName: 'Reviews', meta: { icon: 'star' } },
        ],
      },
      {
        name: 'locations-management',
        displayName: 'Locations Management',
        meta: { icon: 'location_on' },
        children: [
          { name: 'locations', displayName: 'All Locations', meta: { icon: 'location_on' } },
          { name: 'neighborhoods', displayName: 'Neighborhoods', meta: { icon: 'domain' } },
          { name: 'branches', displayName: 'Branches', meta: { icon: 'apartment' } },
        ],
      },
      {
        name: 'maintenance-management',
        displayName: 'Maintenance',
        meta: { icon: 'build' },
        children: [
          { name: 'maintenance-requests', displayName: 'Requests', meta: { icon: 'report_problem' } },
          { name: 'contractors', displayName: 'Contractors', meta: { icon: 'engineering' } },
        ],
      },
     {
        name: 'documents-management',
        displayName: 'Documents',
        meta: { icon: 'description' },
        children: [
          // { name: 'document-category', displayName: 'Categories', meta: { icon: 'category' } },
          // { name: 'documents', displayName: 'Documents', meta: { icon: 'insert_drive_file' } },
          { name: 'templates', displayName: 'Templates', meta: { icon: 'article' } },
         ],
      },
    ],
  },
  {
    name: 'rental-management',
    displayName: 'Rental Master',
    meta: { icon: 'calendar_month' },
    children: [
      {
        name: 'bookings-management',
        displayName: 'Bookings Master',
        meta: { icon: 'calendar_today' },
        children: [
          { name: 'bookings', displayName: 'Booking Calendar', meta: { icon: 'event' } },
          { name: 'pending-bookings', displayName: 'Pending Bookings', meta: { icon: 'event' } },
          { name: 'appointment-types', displayName: 'Appointment Types', meta: { icon: 'event_note' } },
        ],
      },
      {
        name: 'clients-management',
        displayName: 'Rental & Leads',
        meta: { icon: 'people' },
        children: [
          { name: 'admin-rental-applications', displayName: 'Rental Applications', meta: { icon: 'assignment' } },
          { name: 'pending_rental_application', displayName: 'Pending Rental Applications', meta: { icon: 'assignment' } },
        ],
      },
      {
        name: 'leases-management',
        displayName: 'Leases Master',
        meta: { icon: 'receipt' },
        children: [
          // { name: 'leases', displayName: 'Leases', meta: { icon: 'description' } },
          { name: 'properties-term-period', displayName: 'Term Period', meta: { icon: 'description' } },
          { name: 'lease_agreement', displayName: 'View Lease Agreement', meta: { icon: 'description' } },
        ],
      },
      {
        name: 'communication-management',
        displayName: 'Communication',
        meta: { icon: 'notifications_active' },
        children: [
          { name: 'client-message', displayName: 'Client Messages', meta: { icon: 'message' } },
          // { name: 'alerts', displayName: 'Alerts', meta: { icon: 'warning' } },
          { name: 'notifications', displayName: 'Notifications', meta: { icon: 'notifications' } },
        ],
      },
    ],
  },
  {
    name: 'financial-management-main',
    displayName: 'Financial Master',
    meta: { icon: 'account_balance' },
    children: [
      // {
      //   name: 'transaction-master',
      //   displayName: 'Transaction Master',
      //   meta: { icon: 'receipt' },
      //   children: [
      //     { name: 'admin-transactions', displayName: 'Transactions', meta: { icon: 'payments' } },
      //     { name: 'admin-energy-consumption', displayName: 'Energy Consumption', meta: { icon: 'battery_charging_full' } },
      //   ],
      // },
      {
        name: 'payment-master-main',
        displayName: 'Payment Master',
        meta: { icon: 'receipt' },
        children: [
          { name: 'payment-method', displayName: 'Payment Method', meta: { icon: 'description' } },
          { name: 'payment-type', displayName: 'Payment Type', meta: { icon: 'payments' } },
          { name: 'property-payments', displayName: 'Properties Payments', meta: { icon: 'battery_charging_full' } },
          { name: 'payment-master', displayName: 'Payment Master', meta: { icon: 'description' } },
        ],
      },
    ],
  },
 {
  name: 'report-master',
  displayName: 'Report Master',
  meta: { icon: 'bar_chart' }, 
  children: [
    { name: 'property-reports', displayName: 'Property Reports', meta: { icon: 'home' } }, // Updated to 'home' for clarity
    { name: 'booking-reports', displayName: 'Bookings Reports', meta: { icon: 'event' } }, // Changed to 'event' for booking-related context
    { name: 'rental-reports', displayName: 'Rentals Reports', meta: { icon: 'store' } }, // Changed to 'store' to reflect rental properties
    { name: 'lease-reports', displayName: 'Leases Reports', meta: { icon: 'description' } }, // Changed to 'description' for lease documents
    { name: 'payments-reports', displayName: 'Payments Reports', meta: { icon: 'payments' } }, // Updated to 'payments' for clarity
  ],
 }
];

const adminNavigation = {
  root: {
    name: 'app',
    displayName: 'Home',
    meta: { icon: 'home' },
  },
  routes: adminRoutes,
  getRoutes: (): INavigationRoute[] => adminRoutes,
};

console.log('Navigation routes:', adminNavigation.routes);

export default adminNavigation;