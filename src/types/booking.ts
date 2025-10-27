export interface Booking {
  id: number;
  booking_property_type_id: number;
  booking_property_type_name?: string;
  properties?: { id: number; title: string }[];
  // FIX: Added 'id' to the room object to match component logic (r.id)
  rooms?: { id: number; room_id: number; room_number: string; property_id?: number; }[];
  client_id: number;
  client_fullname: string;
  appointment_type_id: number;
  appointment_type_name: string;
  date: string;
  duration: number;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface FormData {
  id?: number;
  booking_property_type_id: number | null;
  property_ids: number[];
  room_ids: number[];
  client_id: number | null;
  appointment_type_id: number | null;
  date: string;
  duration: number | null;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
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
  status?: string;
}

export interface ErrorResponseData {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface Option {
  value: number | string;
  text: string;
}

export type Errors = {
  booking_property_type_id: boolean;
  property_ids: boolean;
  room_ids: boolean;
  selected_property: boolean;
  client_id: boolean;
  appointment_type_id: boolean;
  date: boolean;
  duration: boolean;
  time_slot: boolean;
  recurrence: boolean;
  status: boolean;
  notes: boolean;
};

export type ErrorMessages = {
  booking_property_type_id: string;
  property_ids: string;
  room_ids: string;
  selected_property: string;
  client_id: string;
  appointment_type_id: string;
  date: string;
  duration: string;
  time_slot: string;
  recurrence: string;
  status: string;
  notes: string;
};