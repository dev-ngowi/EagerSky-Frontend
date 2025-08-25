import { RouteRecordRaw } from 'vue-router';

export const webRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('../../layouts/PublicLayout.vue'),
    children: [
      { name: 'home', path: 'home', component: () => import('../../pages/web/Home.vue'), meta: { title: 'Home' } },
      { name: 'all-properties', path: 'all-properties', component: () => import('../../pages/web/AllListing.vue'), meta: { title: 'Properties' } },
      { name: 'my-property-details', path: 'all-properties/:id', component: () => import('../../pages/web/PropertyDetails.vue'), meta: { title: 'Property Details' } },
      { name: 'room-details', path: 'all-properties/:propertyId/room/:roomNumber', component: () => import('../../pages/web/RoomDetails.vue'), meta: { title: 'Room Details' } },
      { name: 'book-property', path: 'book/property/:id', component: () => import('../../pages/web/BookProperty.vue'), meta: { title: 'Book Property', requiresAuth: true } },
      { name: 'book-room', path: 'book/room/:propertyId/:roomNumber', component: () => import('../../pages/web/BookRoom.vue'), meta: { title: 'Book Room', requiresAuth: true } },
      { name: 'services', path: 'services', component: () => import('../../pages/web/Services.vue'), meta: { title: 'Services' } },
      { name: 'service-details', path: 'service-details', component: () => import('../../pages/web/ServiceDetails.vue'), meta: { title: 'Service Details' } },
      { name: 'about', path: 'about', component: () => import('../../pages/web/About.vue'), meta: { title: 'About' } },
      { name: 'contact', path: 'contact', component: () => import('../../pages/web/Contact.vue'), meta: { title: 'Contact' } },
    ],
  },
  {
    path: '/my-account',
    component: () => import('../../layouts/PrivateLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { name: 'my-account', path: '', component: () => import('../../pages/web/my-account/AccountHome.vue'), meta: { title: 'My Account' } },
      { name: 'booking-history', path: 'booking-history', component: () => import('../../pages/web/my-account/MyBookings.vue'), meta: { title: 'My Bookings' } },
      { name: 'my-rental-applications', path: 'my-rental-applications', component: () => import('../../pages/web/my-account/RentalApplications.vue'), meta: { title: 'Rental Applications', requiresAuth: true } },
      { name: 'my-leases', path: 'leases', component: () => import('../../pages/web/my-account/MyLeases.vue'), meta: { title: 'My Leases', requiresAuth: true } },
      { name: 'my-payment-history', path: 'my-payment-history', component: () => import('../../pages/web/my-account/PaymentHistory.vue'), meta: { title: 'Payment History', requiresAuth: true } },
      { name: 'maintance-request', path: 'maintance-request', component: () => import('../../pages/web/my-account/MaintananceRequest.vue'), meta: { title: 'Maintanance Request', requiresAuth: true } },
      { name: 'profile', path: 'profile', component: () => import('../../pages/web/my-account/Profile.vue'), meta: { title: 'Profile', requiresAuth: true } },
    ],
  },
];