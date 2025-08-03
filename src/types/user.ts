export interface Booking {
  id: number;
  property_id: string;
  property_title: string | null;
  property_price: number | null;
  client_id: string;
  client_fullname: string | null;
  agent_id: string | null;
  agent_fullname: string | null;
  appointment_type_id: string;
  appointment_type_name: string;
  date: string;
  duration: string;
  time_slot: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  role_id: number | null;
  role?: string;
  branch_id?: string | null;
  client_type: string | null;
  student_registration_number: string | null;
  created_at: string;
  updated_at: string;
  bookings: Booking[];
}

export interface Role {
  value: string | number;
  text: string;
}

export interface Branch {
  value: string;
  text: string;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}