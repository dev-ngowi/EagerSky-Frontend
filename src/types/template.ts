export interface Template {
  id?: number
  name: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface FormData {
  id?: number
  name: string
  content: string
}

export interface Errors {
  name: string
  content: string
}

export interface Payload {
  id?: number
  name: string
  content: string
}

// In your types/template.ts or create a new types file
export interface ApiResponse<T> { 
  status: number
  data: T
  message?: string
}
