export interface MaintenanceRequest {
  id: number;
  property_id: number | null;
  property_title: string | null;
  user_id: number | null;
  user_name: string | null;
  description: string;
  status: string;
  contractor_assignment_id: number | null;
  contractor_name: string | null;
  updated_at: string | null;
  updated_at_formatted: string | null;
  raw_deleted_at: string | null;
  deleted_at_formatted: string | null;
}

export interface ContractorAssignment {
  id: number;
  maintenance_request_id: number;
  maintenance_request: {
    id: number;
    property_title: string | null;
    description: string;
    status: string;
  };
  contractor_id: number | null;
  contractor_name: string | null;
  assign_date: string | null;
  assigned_by: string | null;
  notes: string | undefined;
  status: string;
  progress_notes: string | undefined;
}

export interface FormData {
  property_id: number | null;
  user_id: number | null;
  description: string;
  status: string;
}

export interface Errors {
  property_id: string;
  user_id: string;
  description: string;
  status: string;
}

export interface Payload {
  id?: number;
  property_id: number | null;
  user_id: number | null;
  description: string;
  status: string;
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}