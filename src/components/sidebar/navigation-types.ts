export interface INavigationRoute {
  name: string
  displayName: string
  meta: {
    icon: string
  }
  children?: INavigationRoute[]
}