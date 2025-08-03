export interface Lease {
  id: number
  property_id: number | null
  property_title?: string
  property_location?: string | null
  room_details?: string | null
  user_id: number | null
  user_name?: string
  tenant_id_number?: string | null // Changed from number to string
  landlord_name?: string | null
  director_name?: string | null // Made optional
  start_date: string
  end_date: string
  duration?: string | null // Changed from number to string
  duration_months?: number | null // Made optional
  rent_amount: number | null
  formatted_rent?: string | null // Changed from number to string
  payment_due_day?: number | null // Changed from Date to number
  terms: string | null
  is_signed: boolean | null
  company_info?: any | null // Changed from string to any to match usage
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// Form structure used in add/edit lease forms
export interface FormData {
  property_id: number | null
  user_id: number | null
  start_date: string
  end_date: string
  rent_amount: number | null
  terms: string
  is_signed: boolean | null
}

// Error object returned from backend or used in validation
export interface Errors {
  property_id?: string
  user_id?: string
  start_date?: string
  end_date?: string
  rent_amount?: string
  terms?: string
  is_signed?: string
}

// Payload used when sending data to backend (edit/add)
export interface Payload {
  id?: number
  property_id: number | null
  user_id: number | null
  start_date: string
  end_date: string
  rent_amount: number | null
  terms: string | null
  is_signed: boolean | null
}

// Select options for dropdowns
export interface PropertyOption {
  value: number
  text: string
}

export interface UserOption {
  value: number
  text: string
}

export interface SignedOption {
  value: boolean
  text: string
}