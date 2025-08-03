export interface FormData {
  title: string
  description: string | null
  category_id: number | null
  location_id: number | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  year_built: number | null
  status: string | null
  list_date: string | null
  branch_id: number | null
  is_featured: boolean
}

export interface Image {
  id: number;
  url: string;
  alt?: string;
}

export interface Errors {
  title: string
  description: string
  category_id: string
  location_id: string
  price: string
  bedrooms: string
  bathrooms: string
  area_sqft: string
  year_built: string
  status: string
  list_date: string
  branch_id: string
  is_featured: string
}

export interface Payload {
  title: string
  description: string | null
  category_id: number | null
  location_id: number | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  year_built: number | null
  status: string | null
  list_date: string | null
  branch_id: number | null
  is_featured: boolean
}

export interface Property {
  id: number
  title: string
  description: string | null
  category_id: number | null
  location_id: number | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  year_built: number | null
  status: string | null
  list_date: string | null
  user: string | null
  branch_id: number | null
  is_featured: boolean
  created_at: string | null
}

export interface Filters {
  category_id: number | null
  location_id: number | null
  status: string
  min_price: number | null
  max_price: number | null
}

export interface Pagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}