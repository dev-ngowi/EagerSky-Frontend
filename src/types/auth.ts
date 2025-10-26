import { AxiosResponse } from 'axios';

// ================= FORM & PAYLOAD INTERFACES =================

// Form data interface for signup form (used in Vue forms)
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
  redirect?: string;
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

// ================= RESPONSE DATA INTERFACES =================

// Error response data from API (base structure for failed requests)
export interface ErrorResponseData {
  message: string; // Required for type narrowing (TS2430 error fix)
  errors?: Record<string, string[]>;
  data?: { id?: string; user_id?: string };
  requires_2fa?: boolean;
  email?: string;
  user_id?: string;
  debug?: any; // For debug information in error responses
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

// Data structure for successful resend OTP response
export interface ResendOtpSuccessData {
  user_id?: string; // Direct user ID
  user?: { // Nested user object for user ID
    id: string;
  };
  id?: string; // Root level ID
  message: string;
  email?: string;
}

// Union type for resend OTP data
export type ResendOtpData = ResendOtpSuccessData | ErrorResponseData;

// Data structure for successful verify OTP response
export interface VerifyOtpResponseData {
  redirectTo?:
    | string
    | {
        name?: string;
        path?: string;
        query?: { email?: string; user_id?: string };
      };
  token?: string;
  user?: UserData;
  message: string;
}

// ================= API RESPONSE INTERFACES (AXIOS) =================

// Helper type for route objects used in redirects
export type RedirectRoute =
  | string
  | {
      name?: string;
      path?: string;
      query?: { email?: string; user_id?: string };
    };

// API response type specifically for resend OTP
// FIX: Correctly uses the generic type parameter T for AxiosResponse
export interface ResendOtpApiResponse extends AxiosResponse<ResendOtpData> {
  // Inherits 'data: ResendOtpData' and 'status: number'
}

// API response type specifically for verify OTP
// FIX: Correctly uses the generic type parameter T for AxiosResponse (TS2430 fix)
export interface VerifyOtpApiResponse extends AxiosResponse<VerifyOtpResponseData | ErrorResponseData> {
  // Direct property for backward compatibility, although data.redirectTo is preferred
  redirectTo?: RedirectRoute;
}

// Generic API response type for other endpoints
export type ApiResponse<T> = AxiosResponse<T | ErrorResponseData> & {
  // Add direct redirectTo for convenience outside the data payload
  redirectTo?: RedirectRoute;
};