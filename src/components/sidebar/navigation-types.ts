export interface INavigationRoute {
  name: string | null;
  path?: string;
  displayName: string;
  meta?: {
    icon?: string;
  };
  children?: INavigationRoute[];
}