import { useAuthStore } from '../stores/auth-store';

export interface SessionData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  role_id: string;
  branch?: any;
  client_type?: string;
  nida_number?: string;
  student_registration_number?: string;
  permissions: string[];
  token: string;
  user?: any;
  expiresAt: number;
  keepLoggedIn?: boolean;
  // ✨ FIX: Add missing properties to the interface
  profile_picture?: string; // Assuming it's a string URL/path
  pin?: string;             // Assuming it's a string
}

export class AuthMiddleware {
  private static readonly TOKEN_EXPIRY_HOURS = 24;
  private static readonly SESSION_KEY = 'userData';
  private static readonly TOKEN_KEY = 'authToken';

  private static getStorage(): Storage {
    const localData = localStorage.getItem(this.SESSION_KEY);
    try {
      if (localData && JSON.parse(localData).keepLoggedIn) {
        return localStorage;
      }
    } catch (e) {
      console.error("Error parsing localStorage session data, falling back to sessionStorage.", e);
    }
    return sessionStorage;
  }

  static getTokenExpiration(): number {
    const now = new Date();
    const expiryTime = now.getTime() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
    return expiryTime;
  }

  // ⭐ UPDATED: Clear auth store when session invalid
  static isSessionValid(): boolean {
    const storage = this.getStorage();
    try {
      const sessionData = storage.getItem(this.SESSION_KEY);
      const token = storage.getItem(this.TOKEN_KEY);

      console.log('🔍 Checking session validity:', {
        storage: storage === localStorage ? 'localStorage (Persistent)' : 'sessionStorage (Temporary)',
        hasSessionData: !!sessionData,
        hasToken: !!token,
      });

      if (!sessionData || !token) {
        console.log('❌ Missing session data or token');
        this.clearSession();
        return false;
      }

      const parsedData: SessionData = JSON.parse(sessionData);

      if (!parsedData.id || !parsedData.token || !parsedData.expiresAt || !parsedData.role) {
        console.log('❌ Invalid session data structure');
        this.clearSession();
        return false;
      }

      // ⭐ CRITICAL: Check expiry with grace period
      const gracePeriod = 5 * 60 * 1000; // 5 minutes grace
      if (new Date().getTime() >= parsedData.expiresAt + gracePeriod) {
        console.log('⏰ Session expired (with grace period)');
        this.clearSession();
        return false;
      }

      // Sync localStorage session to sessionStorage for current tab
      if (storage === localStorage) {
        sessionStorage.setItem(this.SESSION_KEY, sessionData);
        sessionStorage.setItem(this.TOKEN_KEY, token);
      }

      console.log('✅ Session valid, expires at:', new Date(parsedData.expiresAt).toLocaleString());
      return true;
    } catch (error) {
      console.error('❌ Error validating session:', error);
      this.clearSession();
      return false;
    }
  }

  static getUserRole(): string | null {
    const storage = this.getStorage();
    try {
      if (!this.isSessionValid()) {
        return null;
      }

      const sessionData = storage.getItem(this.SESSION_KEY);
      if (!sessionData) {
        console.log('❌ No session data found');
        return null;
      }

      const parsedData: SessionData = JSON.parse(sessionData);
      const role = parsedData.role || parsedData.user?.role;

      if (!role) {
        console.log('❌ No role found in session data');
        return null;
      }

      const normalizedRole = role.toLowerCase();
      const roleMap: { [key: string]: string } = {
        'admin': 'admin',
        'administrator': 'admin',
        'super_admin': 'admin',
        'landlord': 'landlord',
        'property_owner': 'landlord',
        'owner': 'landlord',
        'tenant': 'tenant',
        'renter': 'tenant'
      };

      const mappedRole = roleMap[normalizedRole] || null;
      if (!mappedRole) {
        console.warn('⚠️ Unknown role:', normalizedRole);
      }
      
      return mappedRole;
    } catch (error) {
      console.error('❌ Error getting user role:', error);
      return null;
    }
  }

  static getUserData(): Partial<SessionData> | null {
    const storage = this.getStorage();
    try {
      if (!this.isSessionValid()) {
        return null;
      }

      const sessionData = storage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const parsedData: SessionData = JSON.parse(sessionData);

      return {
        id: parsedData.id || parsedData.user?.id,
        username: parsedData.username || parsedData.user?.username || 'User',
        first_name: parsedData.first_name || parsedData.user?.first_name,
        last_name: parsedData.last_name || parsedData.user?.last_name,
        email: parsedData.email || parsedData.user?.email,
        phone: parsedData.phone || parsedData.user?.phone,
        role: parsedData.role || parsedData.user?.role,
        role_id: parsedData.role_id || parsedData.user?.role_id,
        branch: parsedData.branch || parsedData.user?.branch,
        client_type: parsedData.client_type || parsedData.user?.client_type,
        nida_number: parsedData.nida_number || parsedData.user?.nida_number,
        student_registration_number: parsedData.student_registration_number || parsedData.user?.student_registration_number,
        permissions: parsedData.permissions || parsedData.user?.permissions || [],
        token: parsedData.token || parsedData.user?.token,
        expiresAt: parsedData.expiresAt,
        keepLoggedIn: parsedData.keepLoggedIn,
        // Include new optional fields here as well
        profile_picture: parsedData.profile_picture || parsedData.user?.profile_picture,
        pin: parsedData.pin || parsedData.user?.pin,
      };
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  static storeSession(userData: Partial<SessionData>): void {
    try {
      if (!userData.id || !userData.token || !userData.role) {
        throw new Error('Invalid user data: id, token, and role are required');
      }

      const sessionData: SessionData = {
        id: userData.id,
        username: userData.username || 'User',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'tenant',
        role_id: userData.role_id || '',
        branch: userData.branch,
        client_type: userData.client_type,
        nida_number: userData.nida_number,
        student_registration_number: userData.student_registration_number,
        permissions: userData.permissions || [],
        token: userData.token,
        user: userData,
        expiresAt: this.getTokenExpiration(),
        keepLoggedIn: userData.keepLoggedIn || false,
        // ✨ FIX: Include new optional fields in SessionData construction
        profile_picture: userData.profile_picture,
        pin: userData.pin,
      };

      console.log('💾 Storing session:', {
        id: sessionData.id,
        role: sessionData.role,
        expiresAt: new Date(sessionData.expiresAt).toLocaleString(),
        keepLoggedIn: sessionData.keepLoggedIn
      });

      // Always store in sessionStorage
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(this.TOKEN_KEY, userData.token);

      // Store in localStorage if "keep logged in"
      if (userData.keepLoggedIn) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(this.TOKEN_KEY, userData.token);
      } else {
        // Clear localStorage if not keeping logged in
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
      }

      // Sync with auth store
      const authStore = useAuthStore();
      authStore.storeUserData({
        id: sessionData.id,
        username: sessionData.username,
        first_name: sessionData.first_name,
        last_name: sessionData.last_name,
        email: sessionData.email,
        phone: sessionData.phone,
        // Ensure role_id is Number for the store if required, assuming userData.role_id is string/number
        role_id: sessionData.role_id ? Number(sessionData.role_id) : undefined, 
        role: sessionData.role,
        branch: sessionData.branch,
        client_type: sessionData.client_type,
        nida_number: sessionData.nida_number,
        student_registration_number: sessionData.student_registration_number,
        permissions: sessionData.permissions,
        token: sessionData.token,
        // These lines now work because profile_picture and pin are defined on SessionData (and Partial<SessionData>)
        profile_picture: userData.profile_picture || null, 
        pin: userData.pin || null,
      });
    } catch (error) {
      console.error('❌ Error storing session:', error);
      throw error;
    }
  }

  // ⭐ UPDATED: Comprehensive clearing
  static clearSession(): void {
    try {
      console.log('🧹 Clearing ALL session and local storage');
      
      // Clear both storages completely
      sessionStorage.clear();
      localStorage.clear();
      
      // Remove any legacy/individual keys
      const legacyKeys = [
        'userProfile', 'auth_token', 'token', 'access_token', 
        'jwt', 'userData', 'authToken'
      ];
      
      legacyKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Sync with auth store
      const authStore = useAuthStore();
      authStore.clearAuthData();
      
      console.log('✅ Session completely cleared');
    } catch (error) {
      console.error('❌ Error clearing session:', error);
    }
  }

  static hasRole(requiredRoles: string | string[]): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.some(role => {
      const normalizedRequired = role.toLowerCase();
      const normalizedUser = userRole.toLowerCase();
      
      return normalizedRequired === normalizedUser;
    });
  }

  static hasPermission(permission: string): boolean {
    const userData = this.getUserData();
    if (!userData || !userData.permissions) return false;
    return userData.permissions.includes(permission);
  }

  static getDashboardRoute(): string {
    const role = this.getUserRole();
    if (!role) return '/';

    switch (role) {
      case 'admin': return 'dashboard';
      case 'landlord': return 'dashboard';
      case 'tenant': return 'tenant-home';
      default: return '/';
    }
  }

  static refreshSession(): boolean {
    const storage = this.getStorage();
    try {
      const sessionData = storage.getItem(this.SESSION_KEY);
      if (!sessionData) return false;

      const parsedData: SessionData = JSON.parse(sessionData);
      parsedData.expiresAt = this.getTokenExpiration();

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(parsedData));
      if (parsedData.keepLoggedIn) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(parsedData));
      }

      console.log('🔄 Session refreshed, new expiry:', new Date(parsedData.expiresAt).toISOString());
      return true;
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      return false;
    }
  }

  static getTimeUntilExpiry(): number {
    const storage = this.getStorage();
    try {
      const sessionData = storage.getItem(this.SESSION_KEY);
      if (!sessionData) return 0;

      const parsedData: SessionData = JSON.parse(sessionData);
      if (!parsedData.expiresAt) return 0;

      const now = new Date().getTime();
      const timeLeft = parsedData.expiresAt - now;
      return Math.max(0, Math.floor(timeLeft / (1000 * 60)));
    } catch (error) {
      console.error('❌ Error getting time until expiry:', error);
      return 0;
    }
  }

  static autoRefreshSession(): void {
    const timeLeft = this.getTimeUntilExpiry();
    if (timeLeft > 0 && timeLeft <= 10) { // 10 minutes warning
      console.log(`⚠️ Session expiring in ${timeLeft} minutes, auto-refreshing...`);
      this.refreshSession();
    }
  }
}

// Export functions
export const isSessionValid = AuthMiddleware.isSessionValid;
export const getUserRole = AuthMiddleware.getUserRole;
export const getUserData = AuthMiddleware.getUserData;
export const storeSession = AuthMiddleware.storeSession;
export const clearSession = AuthMiddleware.clearSession;
export const hasRole = AuthMiddleware.hasRole;
export const hasPermission = AuthMiddleware.hasPermission;
export const getDashboardRoute = AuthMiddleware.getDashboardRoute;
export const refreshSession = AuthMiddleware.refreshSession;
export const autoRefreshSession = AuthMiddleware.autoRefreshSession;
export const getTimeUntilExpiry = AuthMiddleware.getTimeUntilExpiry;

export default AuthMiddleware;