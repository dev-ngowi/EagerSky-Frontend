export interface MaintenanceRequest {
  id: number;
  property_id: number | null;
  property_title: string;
  user_id: number | null;
  user_name: string;
  contractor_id: number | null;
  contractor_name: string;
  description: string;
  status: string;
  raw_updated_at: string | null;
  updated_at_formatted: string;
  raw_deleted_at: string | null;
  deleted_at_formatted: string;
}

export interface FormData {
  property_id: number | null;
  user_id: number | null;
  contractor_id: number | null;
  description: string;
  status: string;
}

export interface Errors {
  property_id: string;
  user_id: string;
  contractor_id: string;
  description: string;
  status: string;
}

export interface Payload {
  id?: number;
  property_id: number | null;
  user_id: number | null;
  contractor_id: number | null;
  description: string;
  status: string;
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}