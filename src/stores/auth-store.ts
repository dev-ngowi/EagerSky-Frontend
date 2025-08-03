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
} from '../types/auth';
import { AuthMiddleware } from '../utils/authMiddleware';

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
        if (parsedData.expiresAt && new Date().getTime() < parsedData.expiresAt) {
          const userProfile = {
            username: parsedData.username || parsedData.user?.username || 'User',
            id: parsedData.id || parsedData.user?.id,
            first_name: parsedData.first_name || parsedData.user?.first_name,
            last_name: parsedData.last_name || parsedData.user?.last_name,
            email: parsedData.email || parsedData.user?.email,
            phone: parsedData.phone || parsedData.user?.phone,
            role_id: Number(parsedData.role_id || parsedData.user?.role_id || 0),
            role: parsedData.role || parsedData.user?.role || 'tenant',
            branch: parsedData.branch || parsedData.user?.branch,
            client_type: parsedData.client_type || parsedData.user?.client_type || null,
            nida_number: parsedData.nida_number || parsedData.user?.nida_number || null,
            student_registration_number:
              parsedData.student_registration_number || parsedData.user?.student_registration_number || null,
            permissions: parsedData.permissions || parsedData.user?.permissions || [],
            token: parsedData.token || parsedData.user?.token,
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
    };
  },

  getters: {
    userRole: (state) => {
      const role = state.userProfile?.role;
      if (role) {
        return role.toLowerCase();
      }
      return null;
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

    dashboardRoute: (state) => {
      const role = state.userProfile?.role?.toLowerCase();
      if (!role) return 'login';

      switch (role) {
        case 'admin':
        case 'administrator':
        case 'super_admin':
          return 'admin-dashboard';
        case 'landlord':
        case 'property_owner':
        case 'owner':
          return 'landlord-dashboard';
        case 'tenant':
        case 'renter':
          return 'tenant-dashboard';
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
      if (!userData.id || !userData.token || !userData.role) {
        console.error('Invalid user data for storage:', userData);
        throw new Error('User data missing required fields: id, token, and role');
      }

      const normalizedUserData: UserData = {
        id: userData.id,
        username: userData.username || 'User',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role_id: Number(userData.role_id || 0),
        role: userData.role || 'tenant',
        branch: userData.branch || null,
        client_type: userData.client_type || null,
        nida_number: userData.nida_number || null,
        student_registration_number: userData.student_registration_number || null,
        permissions: userData.permissions || [],
        token: userData.token,
      };

      this.token = normalizedUserData.token || null;
      this.userProfile = normalizedUserData;
      this.permissions = normalizedUserData.permissions;
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
    },

    clearAuthData() {
      this.token = null;
      this.userProfile = {} as UserData;
      this.permissions = [];
      this.isStudent = false;
      AuthMiddleware.clearSession();
      console.log('Auth data cleared');
    },

    getPostLoginRedirect(redirectPath?: string): { name?: string; path?: string } {
      if (redirectPath && redirectPath !== '/auth/login' && redirectPath !== '/') {
        return { path: redirectPath };
      }

      const role = this.userRole;
      console.log(`Getting redirect for role: ${role}`);

      if (!role) return { name: 'login' };

      switch (role) {
        case 'admin':
        case 'administrator':
        case 'super_admin':
          return { name: 'admin-dashboard' };
        case 'landlord':
        case 'property_owner':
        case 'owner':
          return { name: 'landlord-dashboard' };
        case 'tenant':
        case 'renter':
          return { name: 'tenant-dashboard' };
        default:
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
        }) as ApiResponse<UserData>;

        if ('data' in response.data) {
          this.storeUserData(response.data.data);
          const redirectTo = this.getPostLoginRedirect();
          console.log('Signup successful, redirecting to:', redirectTo);
          return { ...response, redirectTo };
        }
        return response;
      } catch (error: any) {
        throw error;
      } finally {
        this.signingUp = false;
      }
    },

    async login(payload: LoginPayload): Promise<ApiResponse<UserData> & { redirectTo?: { name?: string; path?: string } }> {
      this.loggingIn = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_LOGIN_URL}`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          data: payload,
          requiresAuth: false,
        }) as ApiResponse<UserData>;

        console.log('Raw login response:', response);

        if ('data' in response.data) {
          let userData = response.data.data;
          if (Array.isArray(userData)) {
            const email = payload.email?.toLowerCase();
            const pin = payload.pin;
            userData = userData.find(
              (user: UserData) => 
                (email && user.email.toLowerCase() === email) || 
                (pin && user.pin === pin)
            );
            if (!userData) {
              console.error('No matching user found in response:', response.data.data);
              throw new Error('No matching user found in response');
            }
            userData.token = response.data.data.token || userData.token;
          }

          if (!userData.id || !userData.token || !userData.role) {
            console.error('Invalid user data in response:', userData);
            throw new Error('Invalid user data: id, token, and role are required');
          }

          this.storeUserData(userData);
          const redirectTo = this.getPostLoginRedirect();
          console.log(`Login successful. Role: ${this.userRole}, redirecting to:`, redirectTo);
          return { ...response, redirectTo };
        } else {
          throw new Error(response.data.message || 'Login failed');
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
        const response = await makeRequest({
          url,
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          data: payload,
          requiresAuth: false,
        }) as ApiResponse<UserData>;

        if ('data' in response.data) {
          this.storeUserData(response.data.data);
          const redirectTo = this.getPostLoginRedirect();
          return { ...response, redirectTo };
        } else {
          throw new Error(response.data.message || 'OTP verification failed');
        }
      } catch (error: any) {
        throw error;
      } finally {
        this.activating = false;
      }
    },

    async resendOtp(payload: ResendOtpPayload): Promise<ApiResponse<{ user_id: string }>> {
      this.resending = true;
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_RESEND_OTP}`;
        const response = await makeRequest({
          url,
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          data: payload,
          requiresAuth: false,
        }) as ApiResponse<{ user_id: string }>;

        return response;
      } catch (error: any) {
        throw error;
      } finally {
        this.resending = false;
      }
    },

    async getUserProfile(): Promise<ApiResponse<UserData>> {
      try {
        const url = `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_AUTH_USER_URL}`;
        const response = await makeRequest({
          url,
          method: 'get',
          headers: { 'Content-Type': 'application/json' },
          requiresAuth: true,
        }) as ApiResponse<UserData>;

        if ('data' in response.data) {
          this.storeUserData(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch user profile');
        }
        return response;
      } catch (error: any) {
        console.error('Failed to get user profile:', error);
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
            Authorization: `Bearer ${this.token}`,
          },
          requiresAuth: true,
        });
        console.log('Logout API call successful');
      } catch (error: any) {
        console.error('Logout API call failed:', error.response?.data || error.message);
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
      if (!userRole) return false;
      if (Array.isArray(roles)) {
        return roles.some((role) => role.toLowerCase() === userRole);
      }
      return roles.toLowerCase() === userRole;
    },

    getRoleBasedNavigation(): string[] {
      const userRole = this.userRole;
      if (!userRole) return [];

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
          return [];
      }
    },
  },
});