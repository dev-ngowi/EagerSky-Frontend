import { defineStore } from 'pinia';
import { ref } from 'vue';
import makeRequest from '../services/makeRequest';
import type {
  SignupPayload,
  LoginPayload,
  VerifyOtpPayload,
  ResendOtpPayload,
  ApiResponse,
  UserData,
  ErrorResponseData,
} from '../types/auth';
import { AuthMiddleware } from '../utils/authMiddleware';
/**
 * Utility for encoding paths (copied/extracted from router for use here).
 * NOTE: For production, this should be imported from a shared utility file.
 */
const encodePath = (path: string): string => {
  // Remove leading slash and encode
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return btoa(cleanPath);
};
export const useAuthStore = defineStore('auth', {
  state: () => {
    let initialUserProfile: UserData = {} as UserData;
    let initialToken: string | null = null;
    const parseStoredData = (
      data: string | null,
      storageType: 'sessionStorage' | 'localStorage'
    ): { userProfile: UserData; token: string | null } | null => {
      if (!data) return null;
      try {
        const parsedData = JSON.parse(data);
        // Check expiry. Extend session timeout slightly to allow for redirects.
        const expirationGracePeriod = 60 * 1000; // 1 minute grace
        if (parsedData.expiresAt && new Date().getTime() < parsedData.expiresAt + expirationGracePeriod) {
          const userProfile: UserData = {
            id: parsedData.id || parsedData.user?.id,
            username: parsedData.username || parsedData.user?.username || 'User',
            first_name: parsedData.first_name || parsedData.user?.first_name,
            last_name: parsedData.last_name || parsedData.user?.last_name,
            email: parsedData.email || parsedData.user?.email,
            phone: parsedData.phone || parsedData.user?.phone,
            role_id: Number(parsedData.role_id || parsedData.user?.role_id || 0),
            role: parsedData.role || parsedData.user?.role || 'tenant',
            branch: parsedData.branch || parsedData.user?.branch || null,
            client_type: parsedData.client_type || parsedData.user?.client_type || null,
            nida_number: parsedData.nida_number || parsedData.user?.nida_number || null,
            student_registration_number:
              parsedData.student_registration_number || parsedData.user?.student_registration_number || null,
            permissions: parsedData.permissions || parsedData.user?.permissions || [],
            token: parsedData.token || parsedData.user?.token || null,
            profile_picture: parsedData.profile_picture || parsedData.user?.profile_picture,
            pin: parsedData.pin || parsedData.user?.pin,
          };
          console.log(`Parsed ${storageType} data:`, { userProfile, token: parsedData.token });
          return { userProfile, token: parsedData.token || parsedData.user?.token || null };
        } else {
          console.log(`${storageType} session expired`);
          return null;
        }
      } catch (error) {
        console.error(`Failed to parse userData from ${storageType}:`, error);
        return null;
      }
    };
    const sessionData = parseStoredData(sessionStorage.getItem('userData'), 'sessionStorage');
    if (sessionData) {
      initialUserProfile = sessionData.userProfile;
      initialToken = sessionData.token;
    } else {
      const localData = parseStoredData(localStorage.getItem('userData'), 'localStorage');
      if (localData) {
        initialUserProfile = localData.userProfile;
        initialToken = localData.token;
        const sessionData = {
          ...initialUserProfile,
          user: initialUserProfile,
          username: initialUserProfile.username || 'User',
          expiresAt: new Date().getTime() + 60 * 60 * 1000,
        };
        sessionStorage.setItem('userData', JSON.stringify(sessionData));
        if (initialToken) {
          sessionStorage.setItem('authToken', initialToken);
        }
      }
    }
    if (initialToken) {
      sessionStorage.setItem('authToken', initialToken);
      localStorage.setItem('authToken', initialToken);
    }
    return {
      loggingIn: false,
      signingUp: false,
      activating: false,
      resending: false,
      token: initialToken,
      userProfile: initialUserProfile,
      permissions: initialUserProfile.permissions || [],
      isStudent: initialUserProfile.client_type === 'student' || false,
      sendingResetOtp: false,
      verifyingResetOtp: false,
      resettingPassword: false,
    };
  },
  getters: {
    userRole: (state) => {
      const role = state.userProfile?.role;
      if (!role) {
        console.warn('No role found in userProfile');
        return null;
      }
      return role.toLowerCase();
    },
    isAuthenticated: (state) => {
      const hasToken = !!state.token;
      const hasProfile = Object.keys(state.userProfile).length > 0;
      const sessionValid = state.userProfile?.id && state.token ? true : false;
      console.log('isAuthenticated check:', { hasToken, hasProfile, sessionValid });
      return hasToken && hasProfile && sessionValid;
    },
    userFullName: (state) => {
      if (state.userProfile?.first_name && state.userProfile?.last_name) {
        return `${state.userProfile.first_name} ${state.userProfile.last_name}`;
      }
      return state.userProfile?.username || 'User';
    },
    /**
     * Dashboard route getter updated to reflect the new structure.
     * NOTE: This is generally less useful than the getPostLoginRedirect action now,
     * but kept for compatibility, returning the path segment only.
     */
    dashboardRoute: (state) => {
      const role = state.userProfile?.role?.toLowerCase();
      if (!role) return 'login'; // Should not happen for authenticated users
      switch (role) {
        case 'admin':
        case 'administrator':
        case 'super_admin':
          return 'app/dashboard'; // Un-encoded path segment
        case 'landlord':
        case 'property_owner':
        case 'owner':
          return 'landlord/dashboard'; // Un-encoded path segment
        case 'tenant':
        case 'renter':
          return 'tenant/tenant-home'; // Un-encoded path segment
        default:
          return 'login';
      }
    },
  },
  actions: {
    getTokenExpiration(): number {
      return new Date().getTime() + 60 * 60 * 1000;
    },
    storeUserData(userData: UserData) {
      console.log('Attempting to store user data:', userData);
      
      const missingFields: string[] = [];
      if (!userData.id) missingFields.push('id');
      if (!userData.role) missingFields.push('role');
      if (missingFields.length > 0) {
        console.error('Invalid user data for storage. Missing fields:', missingFields);
        console.error('Received data:', userData);
        throw new Error(`User data missing required fields: ${missingFields.join(', ')}`);
      }
      const normalizedUserData: UserData = {
        id: userData.id,
        username: userData.username || 'User',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role_id: Number(userData.role_id || 3),
        role: userData.role || 'tenant',
        branch: userData.branch || null,
        client_type: userData.client_type || null,
        nida_number: userData.nida_number || null,
        student_registration_number: userData.student_registration_number || null,
        permissions: userData.permissions || [],
        token: userData.token || null,
        profile_picture: userData.profile_picture || null,
        pin: userData.pin || null,
      };
      this.token = normalizedUserData.token || null;
      this.userProfile = normalizedUserData;
      this.permissions = normalizedUserData.permissions || [];
      this.isStudent = normalizedUserData.client_type === 'student';
      const sessionData = {
        ...normalizedUserData,
        user: normalizedUserData,
        username: normalizedUserData.username,
        expiresAt: this.getTokenExpiration(),
      };
      console.log('Storing normalized session data:', sessionData);
      if (this.token) {
        sessionStorage.setItem('authToken', this.token);
        localStorage.setItem('authToken', this.token);
      }
      
      const stringifiedData = JSON.stringify(sessionData);
      sessionStorage.setItem('userData', stringifiedData);
      localStorage.setItem('userData', stringifiedData);
      
      console.log('User data stored successfully');
    },
    clearAuthData() {
      this.token = null;
      this.userProfile = {} as UserData;
      this.permissions = [];
      this.isStudent = false;
      AuthMiddleware.clearSession();
      console.log('Auth data cleared');
    },
    /**
     * @returns { path?: string, name?: string, query?: ... } The correct path object for Vue Router,
     * using the role prefix and the BASE64 encoded route segment.
     */
    getPostLoginRedirect(redirectPath?: string): { name?: string; path?: string } {
        // 1. Respect provided redirect path if valid
        if (redirectPath && redirectPath !== '/auth/login' && redirectPath !== '/') {
          console.log(`Using provided redirect path: ${redirectPath}`);
          return { path: redirectPath };
        }
        // 2. Determine role-based dashboard path
        const role = this.userRole;
        if (!role) {
          console.warn('No role found for redirect, defaulting to login');
          return { name: 'login' };
        }
        console.log(`Getting redirect for role: ${role}`);
        switch (role) {
          case 'admin':
          case 'administrator':
          case 'super_admin':
            return { path: '/app/dashboard' }; // Unencoded, matches route definition
          case 'landlord':
          case 'property_owner':
          case 'owner':
            return { path: '/landlord/dashboard' };
          case 'tenant':
          case 'renter':
            return { path: '/tenant/tenant-home' };
          default:
            console.warn(`Unknown role: ${role}, defaulting to login`);
            return { name: 'login' };
        }
      },
    async signup(payload: SignupPayload): Promise<ApiResponse<UserData> & { redirectTo?: { name?: string; path?: string } }> {
      this.signingUp = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_SIGNUP_URL}`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          data: payload,
          requiresAuth: false,
        }) as any;
        console.log('Signup response:', response);
        if ('id' in (response.data as any).data && response.status === 201) {
          const userData = (response.data as any).data as UserData;
          console.log('Registration successful. User data received:', userData);
         
          if (!userData.token) {
            console.log('No token provided, user needs account activation');
            return response as ApiResponse<UserData>;
          }
         
          console.log('Registration successful with token - storing user data');
          this.storeUserData(userData);
          const redirectTo = this.getPostLoginRedirect();
          console.log('Signup successful with token, redirecting to:', redirectTo);
          return { ...(response as ApiResponse<UserData>), redirectTo };
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          console.error('Signup failed with message:', errorData.message);
          throw new Error(errorData.message || 'Signup failed');
        }
      } catch (error: any) {
        console.error('Signup error:', error);
        throw error;
      } finally {
        this.signingUp = false;
      }
    },
    async login(payload: LoginPayload): Promise<ApiResponse<UserData> & { redirectTo?: { name?: string; path?: string; query?: { email?: string; user_id?: string } } }> {
        this.loggingIn = true;
        try {
          const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_LOGIN_URL}`;
          const response = await makeRequest({
            url,
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            data: payload,
            requiresAuth: false,
          }) as any;
          console.log('Raw login response:', response);
          if (response.status === 200 && 'id' in (response.data as any).data) {
            let userData = (response.data as any).data as UserData;
            if (Array.isArray(userData)) {
              const email = payload.email?.toLowerCase();
              const pin = payload.pin;
              userData = userData.find(
                (user: UserData) =>
                  (email && user.email?.toLowerCase() === email) ||
                  (pin && user.pin === pin)
              );
              if (!userData) {
                console.error('No matching user found in response:', (response.data as any).data);
                throw new Error('No matching user found in response');
              }
              userData.token = ((response.data as any).data as any).token || userData.token || null;
            }
            if (!userData.id || !userData.role) {
              console.error('Invalid user data in response:', userData);
              throw new Error('Invalid user data: id and role are required');
            }
            console.log('Login response user role:', userData.role);
            this.storeUserData(userData);
            const redirectTo = this.getPostLoginRedirect(payload.redirect); // Pass redirect from payload if available
            console.log(`Login successful. Role: ${this.userRole}, redirecting to:`, redirectTo);
            return { ...(response as ApiResponse<UserData>), redirectTo };
          } else if (response.status === 403 && 'requires_2fa' in response.data && response.data.requires_2fa && 'message' in response.data) {
            console.log('Email verification required, redirecting to OTP verification');
            const errorData = response.data as ErrorResponseData;
            if (!errorData.email || !errorData.user_id) {
              console.error('Missing email or user_id in 2FA response:', errorData);
              throw new Error('Missing required fields for 2FA redirect');
            }
            return {
              ...response,
              redirectTo: {
                name: 'activate-account',
                query: { email: errorData.email, user_id: errorData.user_id },
              },
            };
          } else if ('message' in response.data) {
            const errorData = response.data as ErrorResponseData;
            throw new Error(errorData.message || 'Login failed');
          } else {
            throw new Error('Login failed: Unexpected response format');
          }
        } catch (error: any) {
          console.error('Login failed:', error);
          throw error;
        } finally {
          this.loggingIn = false;
        }
      },
    async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResponse<UserData> & { redirectTo?: { name?: string; path?: string } }> {
      this.activating = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_ACTIVATE_ACCOUNT}`;
       
        // Ensure payload is properly formatted
        const requestPayload = {
          user_id: String(payload.user_id),
          otp: String(payload.otp).trim(),
        };
       
        console.log('Verifying OTP with payload:', requestPayload);
       
        const response = await makeRequest({
          url,
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          data: requestPayload,
          requiresAuth: false,
        }) as any;
        console.log('OTP verification successful:', response);
        if ('id' in (response.data as any).data) {
          this.storeUserData((response.data as any).data as UserData);
          const redirectTo = this.getPostLoginRedirect();
          return { ...(response as ApiResponse<UserData>), redirectTo };
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          throw new Error(errorData.message || 'OTP verification failed');
        }
      } catch (error: any) {
        console.error('OTP verification failed:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          payload,
        });
       
        const errorMessage = error.response?.data?.message ||
                            error.response?.data?.error ||
                            error.message ||
                            'Invalid or expired OTP';
       
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).response = error.response;
        throw enhancedError;
      } finally {
        this.activating = false;
      }
    },
    async resendOtp(payload: ResendOtpPayload): Promise<ApiResponse<{ user_id?: string; message: string }>> {
      this.resending = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_RESEND_OTP}`;
       
        // Validate email format before sending
        const email = String(payload.email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          console.error('Invalid email format:', email);
          throw new Error('Invalid email format');
        }
        const requestPayload = { email };
        console.log('Resending OTP with payload:', requestPayload);
       
        const response = await makeRequest({
          url,
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          data: requestPayload,
          requiresAuth: false,
        }) as ApiResponse<{ user_id?: string; message: string }>;
        console.log('OTP resent successfully:', response);
       
        return response;
      } catch (error: any) {
        console.error('Failed to resend OTP:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          payload,
        });
       
        const errorMessage = error.response?.data?.message ||
                            error.response?.data?.error ||
                            error.message ||
                            'Failed to resend OTP. Please ensure the email is registered.';
       
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).response = error.response;
        throw enhancedError;
      } finally {
        this.resending = false;
      }
    },
    async sendPasswordResetOtp(email: string): Promise<ApiResponse<{ user_id: string; email: string }>> {
      this.sendingResetOtp = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/password/forgot`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          data: { email },
          requiresAuth: false,
        }) as any;
        console.log('Password reset OTP sent successfully:', response);
        if (response.status === 200 && 'user_id' in (response.data as any).data) {
          return response as ApiResponse<{ user_id: string; email: string }>;
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          throw new Error(errorData.message || 'Failed to send password reset OTP');
        }
      } catch (error: any) {
        console.error('Failed to send password reset OTP:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Failed to send password reset OTP';
        throw new Error(errorMessage);
      } finally {
        this.sendingResetOtp = false;
      }
    },
    async verifyPasswordResetOtp(payload: { user_id: string; otp: string }): Promise<ApiResponse<{ user_id: string; email: string; reset_token: string }>> {
      this.verifyingResetOtp = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/password/verify-otp`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          data: payload,
          requiresAuth: false,
        }) as any;
        console.log('Password reset OTP verified successfully:', response);
        if (response.status === 200 && 'user_id' in (response.data as any).data && 'reset_token' in (response.data as any).data) {
          return response as ApiResponse<{ user_id: string; email: string; reset_token: string }>;
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          throw new Error(errorData.message || 'Failed to verify password reset OTP');
        }
      } catch (error: any) {
        console.error('Failed to verify password reset OTP:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Failed to verify password reset OTP';
        throw new Error(errorMessage);
      } finally {
        this.verifyingResetOtp = false;
      }
    },
    async resetPassword(payload: {
      user_id: string;
      reset_token: string;
      password: string;
      password_confirmation: string
    }): Promise<ApiResponse<{ user_id: string; email: string }>> {
      this.resettingPassword = true;
      try {
        if (!payload.user_id || !payload.reset_token || !payload.password || !payload.password_confirmation) {
          console.error('Invalid reset password payload:', {
            user_id: payload.user_id,
            reset_token: payload.reset_token ? 'provided' : 'missing',
            password: payload.password ? 'provided' : 'missing',
            password_confirmation: payload.password_confirmation ? 'provided' : 'missing',
          });
          throw new Error('Missing required fields for password reset');
        }
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/password/reset`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          data: payload,
          requiresAuth: false,
        }) as any;
        console.log('Password reset successfully:', {
          response,
          user_id: payload.user_id,
          email: 'email' in (response.data as any).data ? (response.data as any).data.email : undefined,
        });
        if (response.status === 200 && 'user_id' in (response.data as any).data) {
          return response as ApiResponse<{ user_id: string; email: string }>;
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          console.error('Password reset failed with message:', errorData.message);
          throw new Error(errorData.message || 'Failed to reset password');
        }
      } catch (error: any) {
        console.error('Failed to reset password:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          payload: {
            user_id: payload.user_id,
            reset_token: payload.reset_token ? 'provided' : 'missing',
          },
        });
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Failed to reset password';
        throw new Error(errorMessage);
      } finally {
        this.resettingPassword = false;
      }
    },
    async resendPasswordResetOtp(email: string): Promise<ApiResponse<{ user_id: string; email: string }>> {
      this.sendingResetOtp = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/password/resend-otp`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          data: { email },
          requiresAuth: false,
        }) as any;
        console.log('Password reset OTP resent successfully:', response);
        if (response.status === 200 && 'user_id' in (response.data as any).data) {
          return response as ApiResponse<{ user_id: string; email: string }>;
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          throw new Error(errorData.message || 'Failed to resend password reset OTP');
        }
      } catch (error: any) {
        console.error('Failed to resend password reset OTP:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Failed to resend password reset OTP';
        throw new Error(errorMessage);
      } finally {
        this.sendingResetOtp = false;
      }
    },
    async getUserProfile(): Promise<ApiResponse<UserData>> {
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_USER_URL}`;
        const response = await makeRequest({
          url,
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          requiresAuth: true,
        }) as any;
        if ('id' in (response.data as any).data) {
          this.storeUserData((response.data as any).data as UserData);
        } else {
          const errorData = (response.data as any).data as unknown as ErrorResponseData;
          throw new Error(errorData.message || 'Failed to fetch user profile');
        }
        return response as ApiResponse<UserData>;
      } catch (error: any) {
        console.error('Failed to get user profile:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        throw error;
      }
    },
    async logout() {
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/logout`;
        await makeRequest({
          url,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          requiresAuth: true,
        });
        console.log('Logout API call successful');
      } catch (error: any) {
        console.error('Logout API call failed:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      } finally {
        this.clearAuthData();
        console.log('Logout completed, session cleared');
      }
    },
    checkSessionExpiry(): boolean {
      const storages = [
        { name: 'sessionStorage', storage: sessionStorage },
        { name: 'localStorage', storage: localStorage },
      ];
      let isExpired = false;
      for (const { name, storage } of storages) {
        const userData = storage.getItem('userData');
        if (userData) {
          try {
            const parsedData = JSON.parse(userData);
            if (parsedData.expiresAt && new Date().getTime() >= parsedData.expiresAt) {
              console.log(`${name} expired, clearing auth data`);
              isExpired = true;
            }
          } catch (error) {
            console.error(`Error checking session expiry in ${name}:`, error);
            isExpired = true;
          }
        }
      }
      if (isExpired) {
        this.clearAuthData();
      }
      return isExpired;
    },
    hasPermission(permission: string): boolean {
      return this.permissions.includes(permission);
    },
    hasRole(roles: string | string[]): boolean {
      const userRole = this.userRole;
      if (!userRole) {
        console.warn('No user role found for hasRole check');
        return false;
      }
      if (Array.isArray(roles)) {
        return roles.some((role) => role.toLowerCase() === userRole);
      }
      return roles.toLowerCase() === userRole;
    },
    getRoleBasedNavigation(): string[] {
      const userRole = this.userRole;
      if (!userRole) {
        console.warn('No user role found for getRoleBasedNavigation');
        return [];
      }
      console.log('Generating navigation for role:', userRole);
      switch (userRole) {
        case 'admin':
        case 'administrator':
        case 'super_admin':
          return [
            'admin-dashboard',
            'users-management',
            'properties-management',
            'locations-management',
            'bookings-management',
            'clients-management',
            'leases-management',
            'transaction-management',
            'payment-master',
            'maintenance-management',
            'documents-management',
            'communication-management',
            'admin-settings',
            'category',
            'properties',
            'images',
            'property-features',
            'rooms',
            'room-images',
            'rooms-availability',
            'reviews',
            'locations',
            'neighborhoods',
            'branches',
            'maintenance-requests',
            'contractors',
            'document-category',
            'documents',
            'templates',
            'bookings',
            'pending-bookings',
            'appointment-types',
            'rental-applications',
            'pending_rental_application',
            'leases',
            'properties-term-period',
            'lease_agreement',
            'client-message',
            'alerts',
            'notifications',
            'admin-transactions',
            'admin-energy-consumption',
            'payment-method',
            'payment-type',
            'property-payments',
            'payment-master-main',
            'property-reports',
            'financial-reports',
          ];
        case 'landlord':
        case 'property_owner':
        case 'owner':
          return [
            'landlord-dashboard',
            'my-properties',
            'tenant-management',
            'bookings-viewing',
            'lease-management',
            'financial-management',
            'maintenance-management',
            'documents-management',
            'communication-management',
            'settings',
          ];
        case 'tenant':
        case 'renter':
          return [
            'tenant-dashboard',
            'my-rental',
            'rent-payments',
            'tenant-maintenance',
            'tenant-communication',
            'utilities',
            'tenant-documents',
            'tenant-profile',
            'settings',
          ];
        default:
          console.warn(`Unknown role: ${userRole}, returning empty navigation`);
          return [];
      }
    },
  },
});