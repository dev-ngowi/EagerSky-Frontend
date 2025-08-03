export interface FormData {
  property_id: number | null
  feature_name: string
  value: string
}

export interface Errors {
  property_id: string
  feature_name: string
  value: string
}

export interface Payload {
  property_id: number | null
  feature_name: string
  value: string
}

export interface Feature {
  id: number
  property_id: number | null
  feature_name: string
  value: string
}
