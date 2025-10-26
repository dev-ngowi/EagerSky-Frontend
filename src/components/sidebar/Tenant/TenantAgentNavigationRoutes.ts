import type { INavigationRoute } from '../navigation-types'

// Tenant navigation routes - Focused on specified features
const tenantRoutes: INavigationRoute[] = [
  {
    name: 'tenant-home',
    displayName: 'Dashboard',
    meta: { icon: 'dashboard' },
  },
  {
    name: 'booking-history',
    displayName: 'Booking History',
    meta: { icon: 'history' },
  },
  {
    name: 'rental-applications',
    displayName: 'Rental Applications',
    meta: { icon: 'assignment' },
    children: [
      { name: 'submit-application', displayName: 'Submit Application', meta: { icon: 'add_circle' } },
      { name: 'my-applications', displayName: 'My Applications', meta: { icon: 'list' } },
    ],
  },
  {
    name: 'leases',
    displayName: 'Leases',
    meta: { icon: 'description' },
    children: [
      { name: 'tenant-lease-agreement', displayName: 'My Lease Agreement', meta: { icon: 'description' } },
    ],
  },
  {
    name: 'payment-history',
    displayName: 'Payment History',
    meta: { icon: 'history' },
  },
  {
    name: 'maintenance-requests',
    displayName: 'Maintenance',
    meta: { icon: 'build' },
    children: [
      { name: 'submit-request', displayName: 'Submit Request', meta: { icon: 'add_task' } },
      { name: 'my-requests', displayName: 'My Requests', meta: { icon: 'list_alt' } },
    ],
  },
  {
    name: 'profile',
    displayName: 'My Profile',
    meta: { icon: 'person' },
    children: [
      { name: 'personal-info', displayName: 'Personal Information', meta: { icon: 'person_outline' } },
      // { name: 'emergency-contacts', displayName: 'Emergency Contacts', meta: { icon: 'contact_emergency' } },
    ],
  },
]

// Tenant navigation structure
const tenantNavigation = {
  root: {
    name: 'app',
    displayName: 'Home',
    meta: { icon: 'home' },
  },
  routes: tenantRoutes,
  getRoutes: (): INavigationRoute[] => tenantRoutes,
}

export default tenantNavigation