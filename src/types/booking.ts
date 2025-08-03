export interface Booking {
  id: number;
  property_id: number;
  property_title: string;
  client_id: number;
  client_fullname: string;
  appointment_type_id: number;
  appointment_type_name: string;
  date: string;
  duration: number;
  time_slot: string;
  recurrence: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FormData {
  property_id: number | null;
  client_id: number | null;
  appointment_type_id: number | null;
  date: string;
  duration: number | null;
  time_slot: string;
  recurrence: string;
  status: string;
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface GetBookingsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface AddBookingPayload extends FormData {}

export interface UpdateBookingPayload extends FormData {
  id: number;
}

export interface ErrorResponseData {
  message: string;
  errors?: Record<string, string[]>;
}

// Added missing type: Errors
export interface Errors {
  property_id: boolean;
  client_id: boolean;
  appointment_type_id: boolean;
  date: boolean;
  duration: boolean;
  time_slot: boolean;
  recurrence: boolean;
  status: boolean;
}

// Added missing type: ErrorMessages
export interface ErrorMessages {
  property_id: string;
  client_id: string;
  appointment_type_id: string;
  date: string;
  duration: string;
  time_slot: string;
  recurrence: string;
  status: string;
}

// Added missing type: Option
export interface Option {
  value: number | string;
  text: string;
}

// Added missing type: ApiResponse
export type ApiResponse<T> =
  | { status: 200 | 201 | 204; data: T }
  | { status: 422 | number; data: ErrorResponseData };