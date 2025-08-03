// Core Booking interface
export interface Booking {
  id: number
  property_id: number
  property_title: string
  client_id: number
  client_fullname: string
  appointment_type_id: number
  appointment_type_name: string
  date: string
  duration: number
  time_slot: string
  recurrence: string
  status: BookingStatus
  created_at: string
  updated_at: string
  isProcessing?: boolean
  action?: BookingAction | null
}

// Booking status enum
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

// Booking action types for UI state
export type BookingAction = 'approve' | 'reject'

// Data table column configuration
export interface DataTableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
}

// API Response interfaces
export interface PaginationMeta {
  current_page: number
  total: number
  per_page: number
  last_page: number
  from: number
  to: number
}

export interface BookingsApiResponse {
  data: Booking[]
  pagination: PaginationMeta
  message?: string
}

export interface ApiResponse<T = any> {
  status: number
  data: T
  message?: string
}

// API Request interfaces
export interface FetchBookingsParams {
  status?: BookingStatus
  page?: number
  per_page?: number
}

export interface MakeRequestOptions {
  url: string
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  requiresAuth?: boolean
  params?: Record<string, any>
  data?: any
}

// Toast notification types
export interface ToastOptions {
  message: string
  color: 'success' | 'danger' | 'warning' | 'info'
  duration?: number
}

// Component state interfaces
export interface BookingListState {
  bookings: Booking[]
  loading: boolean
  errorMessage: string
  currentPage: number
  totalBookings: number
}

// Vue Composition API return types
export interface UseBookingActions {
  approveBooking: (bookingId: number) => Promise<void>
  rejectBooking: (bookingId: number) => Promise<void>
  fetchBookings: (page?: number) => Promise<void>
}

// Error response interface
export interface ApiErrorResponse {
  message: string
  errors?: Record<string, string[]>
  status?: number
}

// Extended error type for axios responses
export interface ApiError extends Error {
  response?: {
    data?: ApiErrorResponse
    status?: number
  }
}

// Environment variables type
export interface ImportMetaEnv {
  readonly VITE_APP_API_BASE_URL: string
}

export interface ImportMeta {
  readonly env: ImportMetaEnv
}