export interface FormData {
  name: string
  email: string
  phone: string | null
  type: string
}

export interface Errors {
  name: string
  email: string
  phone: string
  type: string
}

export interface Payload {
  name: string
  email: string
  phone: string | null
  type: string
}

export interface Client {
  id: number
  name: string
  email: string
  phone: string | null
  type: string | null
}
