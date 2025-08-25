export interface INavigationRoute {
  name: string;
  displayName: string;
  meta: {
    icon: string | null;
    requiresAuth?: boolean;
  };
  children?: INavigationRoute[];
}

const webRoutes: INavigationRoute[] = [
  {
    name: 'home',
    displayName: 'Home',
    meta: { icon: 'bi bi-house', requiresAuth: false },
  },
  {
    name: 'all-properties',
    displayName: 'Properties',
    meta: { icon: 'bi bi-building', requiresAuth: false },
    children: [
      {
        name: 'my-property-details',
        displayName: 'Property Details',
        meta: { icon: null, requiresAuth: false },
      },
      {
        name: 'room-details',
        displayName: 'Room Details',
        meta: { icon: null, requiresAuth: false },
      },
      {
        name: 'book-property',
        displayName: 'Book Property',
        meta: { icon: null, requiresAuth: true },
      },
      {
        name: 'book-room',
        displayName: 'Book Room',
        meta: { icon: null, requiresAuth: true },
      },
    ],
  },
  {
    name: 'services',
    displayName: 'Services',
    meta: { icon: 'bi bi-gear', requiresAuth: false },
    children: [
      {
        name: 'service-details',
        displayName: 'Service Details',
        meta: { icon: null, requiresAuth: false },
      },
    ],
  },
  {
    name: 'about',
    displayName: 'About',
    meta: { icon: 'bi bi-info-circle', requiresAuth: false },
  },
  {
    name: 'contact',
    displayName: 'Contact',
    meta: { icon: 'bi bi-envelope', requiresAuth: false },
  },
  {
    name: 'my-account',
    displayName: 'My Account',
    meta: { icon: 'bi bi-person', requiresAuth: true },
    children: [
      {
        name: 'my-account',
        displayName: 'Home',
        meta: { icon: 'bi bi-bookmark-check'},
      },
      {
        name: 'booking-history',
        displayName: 'My Bookings',
        meta: { icon: 'bi bi-bookmark-check'},
      },
      {
        name: 'my-rental-applications',
        displayName: 'Rental Applications',
        meta: { icon: 'bi bi-file-earmark-text', requiresAuth: true },
      },
      {
        name: 'my-leases',
        displayName: 'My Leases',
        meta: { icon: 'bi bi-file-contract', requiresAuth: true },
      },
      {
        name: 'my-payment-history',
        displayName: 'Payment History',
        meta: { icon: 'bi bi-credit-card', requiresAuth: true },
      },
      {
        name: 'maintance-request',
        displayName: 'Maintanance Request',
        meta: { icon: 'bi bi-credit-card', requiresAuth: true },
      },
      {
        name: 'profile',
        displayName: 'Profile',
        meta: { icon: 'bi bi-person-circle', requiresAuth: true },
      },
    ],
  },
];

const webNavigation = {
  root: {
    name: 'app',
    displayName: 'Home',
    meta: { icon: 'bi bi-house', requiresAuth: false },
  },
  routes: webRoutes,
  getRoutes: (): INavigationRoute[] => webRoutes,
};

export default webNavigation;