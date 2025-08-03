import type { INavigationRoute } from '../navigation-types'

// Tenant navigation routes - Tenant-focused features
const tenantRoutes: INavigationRoute[] = [
  {
    name: 'dashboard',
    displayName: 'Dashboard',
    meta: { icon: 'dashboard' },
  },
  {
    name: 'my-rental',
    displayName: 'My Rental',
    meta: { icon: 'home' },
    children: [
      { name: 'property-details', displayName: 'Property Details', meta: { icon: 'house' } },
      { name: 'tenant-lease-agreement', displayName: 'My Lease Agreement', meta: { icon: 'description' } }, // Changed from 'lease-agreement'
      { name: 'property-gallery', displayName: 'Property Gallery', meta: { icon: 'image' } }, // Changed from 'property-images'
      { name: 'neighborhood-info', displayName: 'Neighborhood Info', meta: { icon: 'location_on' } },
    ],
  },
  {
    name: 'rent-payments',
    displayName: 'Rent & Payments',
    meta: { icon: 'payments' },
    children: [
      { name: 'pay-rent', displayName: 'Pay Rent', meta: { icon: 'payment' } },
      { name: 'payment-history', displayName: 'Payment History', meta: { icon: 'history' } },
      { name: 'payment-methods', displayName: 'Payment Methods', meta: { icon: 'credit_card' } },
      { name: 'receipts', displayName: 'Receipts', meta: { icon: 'receipt' } },
    ],
  },
  {
    name: 'maintenance-requests', // Changed from 'maintenance' to match tenantRoutes
    displayName: 'Maintenance',
    meta: { icon: 'build' },
    children: [
      { name: 'submit-request', displayName: 'Submit Request', meta: { icon: 'add_task' } },
      { name: 'my-requests', displayName: 'My Requests', meta: { icon: 'list_alt' } },
      { name: 'request-status', displayName: 'Request Status', meta: { icon: 'track_changes' } },
    ],
  },
  {
    name: 'communication', // Changed from 'tenant-communication' to match tenantRoutes
    displayName: 'Communication',
    meta: { icon: 'message' },
    children: [
      { name: 'landlord-messages', displayName: 'Messages', meta: { icon: 'chat' } },
      { name: 'tenant-notifications', displayName: 'Notifications', meta: { icon: 'notifications' } }, // Changed from 'notifications'
      { name: 'tenant-announcements', displayName: 'Announcements', meta: { icon: 'campaign' } }, // Changed from 'announcements'
    ],
  },
  {
    name: 'utilities',
    displayName: 'Utilities & Services',
    meta: { icon: 'electrical_services' },
    children: [
      { name: 'tenant-energy-consumption', displayName: 'Energy Usage', meta: { icon: 'battery_charging_full' } }, // Changed from 'energy-consumption'
      { name: 'utility-bills', displayName: 'Utility Bills', meta: { icon: 'receipt_long' } },
      { name: 'service-providers', displayName: 'Service Providers', meta: { icon: 'business' } },
    ],
  },
  {
    name: 'documents', // Changed from 'tenant-documents' to match tenantRoutes
    displayName: 'Documents',
    meta: { icon: 'description' },
    children: [
      { name: 'tenant-lease-documents', displayName: 'Lease Documents', meta: { icon: 'insert_drive_file' } }, // Changed from 'lease-documents'
      { name: 'important-notices', displayName: 'Important Notices', meta: { icon: 'info' } },
      { name: 'move-in-documents', displayName: 'Move-in Documents', meta: { icon: 'moving' } },
    ],
  },
  {
    name: 'profile', // Changed from 'tenant-profile' to match tenantRoutes
    displayName: 'My Profile',
    meta: { icon: 'person' },
    children: [
      { name: 'personal-info', displayName: 'Personal Information', meta: { icon: 'person_outline' } },
      { name: 'emergency-contacts', displayName: 'Emergency Contacts', meta: { icon: 'contact_emergency' } },
      { name: 'tenant-lease-renewal', displayName: 'Lease Renewal', meta: { icon: 'refresh' } }, // Changed from 'lease-renewal'
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