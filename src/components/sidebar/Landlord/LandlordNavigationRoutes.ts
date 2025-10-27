import type { INavigationRoute } from '../navigation-types'

// Landlord navigation routes - simplified, grouped structure
const landlordRoutes: INavigationRoute[] = [
  {
    name: 'landlord-dashboard',
    displayName: 'Dashboard',
    meta: { icon: 'dashboard' },
  },
  {
    name: 'landlord-properties',
    displayName: 'My Properties',
    meta: { icon: 'home' },
    children: [
      { name: 'landlord-properties', displayName: 'All Properties', meta: { icon: 'house' } },
      { name: 'landlord-property-images', displayName: 'Property Images', meta: { icon: 'image' } },
      { name: 'landlord-property-features', displayName: 'Property Features', meta: { icon: 'category' } },
      { name: 'landlord-rooms', displayName: 'Rooms / Units', meta: { icon: 'meeting_room' } },
      { name: 'landlord-room-availability', displayName: 'Room Availability', meta: { icon: 'event_available' } },
    ],
  },
  {
    name: 'landlord-tenants',
    displayName: 'Tenants',
    meta: { icon: 'people' },
    children: [
      { name: 'landlord-tenants', displayName: 'Current Tenants', meta: { icon: 'person_outline' } },
      { name: 'landlord-rental-applications', displayName: 'Rental Applications', meta: { icon: 'assignment' } },
    ],
  },
  {
    name: 'landlord-rental-management',
    displayName: 'Rental Management',
    meta: { icon: 'calendar_month' },
    children: [
      { name: 'landlord-bookings', displayName: 'Bookings', meta: { icon: 'event' } },
    ],
  },
  {
    name: 'landlord-leases',
    displayName: 'Leases & Contracts',
    meta: { icon: 'receipt' },
    children: [
      { name: 'landlord-active-leases', displayName: 'Active Leases', meta: { icon: 'description' } },
      { name: 'landlord-expired-leases', displayName: 'Expired Leases', meta: { icon: 'history' } },
    ],
  },
  {
    name: 'landlord-payments',
    displayName: 'Payments',
    meta: { icon: 'attach_money' },
    children: [
      { name: 'landlord-rent-payments', displayName: 'Rent Payments', meta: { icon: 'payments' } },
      { name: 'landlord-pending-payments', displayName: 'Pending / Overdue', meta: { icon: 'report_problem' } },
    ],
  },
  {
    name: 'landlord-maintenance',
    displayName: 'Maintenance Requests',
    meta: { icon: 'build' },
    children: [
      { name: 'landlord-maintenance-requests', displayName: 'Requests', meta: { icon: 'report_problem' } },
      { name: 'landlord-maintenance-history', displayName: 'History', meta: { icon: 'history' } },
      { name: 'landlord-new-maintenance-request', displayName: 'New Request', meta: { icon: 'add_circle' } },
    ],
  },
  {
    name: 'landlord-communication',
    displayName: 'Communication',
    meta: { icon: 'message' },
    children: [
      { name: 'landlord-messages', displayName: 'Messages', meta: { icon: 'chat' } },
      { name: 'landlord-notifications', displayName: 'Notifications', meta: { icon: 'notifications' } },
    ],
  },
  {
    name: 'landlord-reports',
    displayName: 'Reports',
    meta: { icon: 'assessment' },
    children: [
      { name: 'landlord-property-reports', displayName: 'Property Reports', meta: { icon: 'home_work' } },
      { name: 'landlord-payments-reports', displayName: 'Payments Reports', meta: { icon: 'attach_money' } },
      { name: 'landlord-occupancy-reports', displayName: 'Occupancy Reports', meta: { icon: 'bar_chart' } },
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