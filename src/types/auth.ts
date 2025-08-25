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
  data?: { id?: string; user_id?: string };
  requires_2fa?: boolean; // Added for 2FA check
  email?: string; // Added for email in 403 response
  user_id?: string; // Added for user_id in 403 response
}

// User data returned from API
export interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  role: string;
  branch?: string | null;
  client_type?: string | null;
  nida_number?: string | null;
  student_registration_number?: string | null;
  permissions?: string[];
  token?: string | null;
  profile_picture?: string | null | undefined;
  pin?: string | null | undefined;
  requires_2fa?: boolean;
}

// API response type for success and error cases
export type ApiResponse<T> = AxiosResponse<{
  data: T | ErrorResponseData;
  status: number;
}> & {
  redirectTo?: {
    name?: string;
    path?: string;
    query?: { email?: string; user_id?: string }; // Added query for redirectTo
  };
};