import { AxiosResponse } from 'axios';

// Form data interface for signup form
export interface SignupFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  repeatPassword: string;
  pin: string;
  role_id: number;
}

// Payload interface for signup API request
export interface SignupPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  pin: string;
  role_id: number;
}

// Payload interface for login API request
export interface LoginPayload {
  login_method: 'email' | 'pin';
  email?: string;
  password?: string;
  pin?: string;
}

// Payload interface for OTP verification
export interface VerifyOtpPayload {
  user_id: string;
  otp: string;
}

// Payload interface for resending OTP
export interface ResendOtpPayload {
  email: string;
}

// Error response data from API
export interface ErrorResponseData {
  message: string;
  errors?: Record<string, string[]>;
}

// User data returned from API
export interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  role_id: number;
  role: string;
  branch: string | null;
  client_type: string | null;
  nida_number: string | null;
  student_registration_number: string | null;
  permissions: string[];
  token?: string;
  profile_picture?: string;
  pin?: string; // A
}

// API response type for success and error cases
export type ApiResponse<T> = AxiosResponse<
  | { data: T }
  | ErrorResponseData
>;