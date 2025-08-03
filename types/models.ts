export default interface IRequestParams {
  url: string
  method: string
  headers?: any
  data?: any
}

export interface Language {
  value: string
  text?: string
  version?: string
}
