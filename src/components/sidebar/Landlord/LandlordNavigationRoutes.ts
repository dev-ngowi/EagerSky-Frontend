import type { INavigationRoute } from '../navigation-types'

// Landlord navigation routes - Property management focused
const landlordRoutes: INavigationRoute[] = [
  {
    name: 'dashboard',
    displayName: 'Dashboard',
    meta: { icon: 'dashboard' },
  },
  {
    name: 'my-properties',
    displayName: 'My Properties',
    meta: { icon: 'home' },
    children: [
      { name: 'properties', displayName: 'All Properties', meta: { icon: 'house' } },
      { name: 'property-features', displayName: 'Property Features', meta: { icon: 'category' } },
      { name: 'rooms', displayName: 'Rooms', meta: { icon: 'meeting_room' } },
      { name: 'images', displayName: 'Images', meta: { icon: 'image' } },
      { name: 'reviews', displayName: 'Property Reviews', meta: { icon: 'star' } },
    ],
  },
  {
    name: 'tenant-management',
    displayName: 'Tenant Management',
    meta: { icon: 'people' },
    children: [
      { name: 'tenants', displayName: 'Current Tenants', meta: { icon: 'person_outline' } },
      { name: 'rental-applications', displayName: 'Rental Applications', meta: { icon: 'assignment' } },
      { name: 'pending-rental-application', displayName: 'Pending Applications', meta: { icon: 'assignment' } },
    ],
  },
  {
    name: 'bookings-viewing',
    displayName: 'Bookings & Viewings',
    meta: { icon: 'calendar_today' },
    children: [
      { name: 'bookings', displayName: 'Booking Calendar', meta: { icon: 'event' } },
      { name: 'pending-bookings', displayName: 'Pending Bookings', meta: { icon: 'event' } },
      { name: 'schedules', displayName: 'My Schedule', meta: { icon: 'access_time' } },
    ],
  },
  {
    name: 'lease-management',
    displayName: 'Lease Management',
    meta: { icon: 'receipt' },
    children: [
      { name: 'leases', displayName: 'Active Leases', meta: { icon: 'description' } },
      { name: 'lease_agreement', displayName: 'Lease Agreements', meta: { icon: 'description' } },
      { name: 'lease-renewals', displayName: 'Lease Renewals', meta: { icon: 'refresh' } },
    ],
  },
  {
    name: 'financial-management',
    displayName: 'Financial Management',
    meta: { icon: 'attach_money' },
    children: [
      { name: 'rent-collection', displayName: 'Rent Collection', meta: { icon: 'payments' } },
      { name: 'transactions', displayName: 'Transactions', meta: { icon: 'receipt' } },
      { name: 'property-payments', displayName: 'Property Expenses', meta: { icon: 'money_off' } },
      { name: 'financial-reports', displayName: 'Financial Reports', meta: { icon: 'assessment' } },
    ],
  },
  {
    name: 'maintenance-requests',
    displayName: 'Maintenance',
    meta: { icon: 'build' },
    children: [
      { name: 'maintenance-requests', displayName: 'Maintenance Requests', meta: { icon: 'report_problem' } },
      { name: 'contractors', displayName: 'My Contractors', meta: { icon: 'engineering' } },
      { name: 'maintenance-history', displayName: 'Maintenance History', meta: { icon: 'history' } },
    ],
  },
  {
    name: 'communication',
    displayName: 'Communication',
    meta: { icon: 'message' },
    children: [
      { name: 'tenant-messages', displayName: 'Tenant Messages', meta: { icon: 'chat' } },
      { name: 'notifications', displayName: 'Notifications', meta: { icon: 'notifications' } },
      { name: 'announcements', displayName: 'Send Announcements', meta: { icon: 'campaign' } },
    ],
  },
  {
    name: 'documents',
    displayName: 'Documents',
    meta: { icon: 'description' },
    children: [
      { name: 'lease-documents', displayName: 'Lease Documents', meta: { icon: 'insert_drive_file' } },
      { name: 'property-documents', displayName: 'Property Documents', meta: { icon: 'folder' } },
      { name: 'templates', displayName: 'Document Templates', meta: { icon: 'article' } },
    ],
  },
]

// Landlord navigation structure
const landlordNavigation = {
  root: {
    name: 'app',
    displayName: 'Home',
    meta: { icon: 'home' },
  },
  routes: landlordRoutes,
  getRoutes: (): INavigationRoute[] => landlordRoutes,
}

export default landlordNavigation