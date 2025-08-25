// config/apiConfig.js
export const API_CONFIG = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_APP_API_BASE_URL || 'https://e1.japango.co.tz/api',
  
  // Auth endpoints
  AUTH: {
    LOGIN: import.meta.env.VITE_APP_AUTH_LOGIN_URL || 'v1/login',
    SIGNUP: import.meta.env.VITE_APP_AUTH_SIGNUP_URL || 'v1/users',
    ACTIVATE: import.meta.env.VITE_APP_AUTH_ACTIVATE_ACCOUNT || 'v1/verify-otp',
    RESEND_OTP: import.meta.env.VITE_APP_AUTH_RESEND_OTP || 'v1/resend-otp',
    USER_PROFILE: import.meta.env.VITE_APP_AUTH_USER_URL || 'v1/users',
  },

  // Property endpoints
  PROPERTIES: {
    LIST: import.meta.env.VITE_APP_PROPERTIES_URL || 'v1/properties',
    FEATURES: import.meta.env.VITE_APP_PROPERTY_FEATURES_URL || 'v1/property-features',
    CATEGORIES: import.meta.env.VITE_APP_PROPERTY_CATEGORIES_URL || 'v1/property-categories',
    LIST_PROPERTIES: import.meta.env.VITE_APP_LIST_PROPERTIES_URL || 'v1/list-properties',
    ALL_PROPERTIES: import.meta.env.VITE_APP_ALL_PROPERTIES_URL || 'v1/all-properties',
    DETAILS: import.meta.env.VITE_APP_PROPERTY_DETAILS_URL || 'v1/properties-details',
  },

  // Booking endpoints
  BOOKINGS: {
    CONFIRMED: 'v1/bookings/confirmed',
    ALL: 'v1/bookings',
    CREATE: 'v1/bookings',
    UPDATE: 'v1/bookings',
    DELETE: 'v1/bookings',
    APPOINTMENT_TYPES: import.meta.env.VITE_APP_APPOINTMENT_TYPES_URL || 'v1/appointment-types',
  },

  // Location endpoints
  LOCATIONS: {
    COUNTRIES: 'v1/countries',
    CITIES: 'v1/cities',
    STREETS: 'v1/streets',
    BRANCHES: 'v1/branches',
  },

  // Payment endpoints
  PAYMENTS: {
    METHODS: 'v1/payment-methods',
    TYPES: 'v1/payment-types',
    PROCESS: 'v1/payments',
    VERIFY: 'v1/payments/verify',
  },

  // Application endpoints
  APPLICATIONS: {
    CREATE: 'v1/applications',
    UPDATE: 'v1/applications',
    STATUS: 'v1/applications/status',
    APPROVE: 'v1/applications/approve',
    REJECT: 'v1/applications/reject',
  },

  // Lease endpoints
  LEASES: {
    CREATE: 'v1/leases',
    UPDATE: 'v1/leases',
    SIGN: 'v1/leases/sign',
    DOWNLOAD: 'v1/leases/download',
    TERMS: 'v1/lease-terms',
  },
};

// Helper function to build full URLs
export function buildApiUrl(endpoint) {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return `${baseUrl}/${cleanEndpoint}`;
}

// Helper function to get nested endpoint
export function getEndpoint(category, endpoint) {
  try {
    return API_CONFIG[category][endpoint];
  } catch (error) {
    console.warn(`Endpoint not found: ${category}.${endpoint}`);
    return null;
  }
}

// Common request headers
export const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

// Request timeout configuration
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// Retry configuration
export const RETRY_CONFIG = {
  attempts: 3,
  delay: 1000, // 1 second
  backoff: 2, // Exponential backoff multiplier
};

// API response status codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Error messages for different status codes
export const ERROR_MESSAGES = {
  [STATUS_CODES.BAD_REQUEST]: 'Invalid request. Please check your input.',
  [STATUS_CODES.UNAUTHORIZED]: 'Authentication required. Please log in.',
  [STATUS_CODES.FORBIDDEN]: 'Access denied. You don\'t have permission.',
  [STATUS_CODES.NOT_FOUND]: 'Resource not found.',
  [STATUS_CODES.CONFLICT]: 'Conflict detected. Resource already exists.',
  [STATUS_CODES.UNPROCESSABLE_ENTITY]: 'Validation failed. Please check your input.',
  [STATUS_CODES.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
  [STATUS_CODES.INTERNAL_SERVER_ERROR]: 'Server error. Please try again later.',
  [STATUS_CODES.BAD_GATEWAY]: 'Service temporarily unavailable.',
  [STATUS_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
  [STATUS_CODES.GATEWAY_TIMEOUT]: 'Request timeout. Please try again.',
};

// Development/debugging helpers
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// API versioning
export const API_VERSION = 'v1';

// Export default configuration
export default API_CONFIG;