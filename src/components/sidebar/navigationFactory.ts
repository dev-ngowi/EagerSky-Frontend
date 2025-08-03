import type { INavigationRoute } from './navigation-types';
import adminNavigation from './Admin/NavigationRoutes';
import landlordNavigation from './Landlord/LandlordNavigationRoutes';
import tenantNavigation from './Tenant/TenantAgentNavigationRoutes';

export const getNavigationByRole = (userRole: 'admin' | 'landlord' | 'tenant') => {
  switch (userRole) {
    case 'admin':
      return adminNavigation;
    case 'landlord':
      return landlordNavigation;
    case 'tenant':
      return tenantNavigation;
    default:
      return tenantNavigation;
  }
};

export const getRoutesForRole = (userRole: 'admin' | 'landlord' | 'tenant'): INavigationRoute[] => {
  const navigation = getNavigationByRole(userRole);
  return navigation.getRoutes();
};

export const hasRouteAccess = (routeName: string, userRole: 'admin' | 'landlord' | 'tenant'): boolean => {
  const routes = getRoutesForRole(userRole);
  
  const checkRouteAccess = (routes: INavigationRoute[]): boolean => {
    return routes.some(route => {
      if (route.name === routeName) return true;
      if (route.children) return checkRouteAccess(route.children);
      return false;
    });
  };
  
  return checkRouteAccess(routes);
};

export { adminNavigation, landlordNavigation, tenantNavigation };

export default getNavigationByRole;