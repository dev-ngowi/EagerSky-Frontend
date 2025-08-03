/**
 * Interface for contractor data
 */
export interface Contractor {
  /** Unique identifier for the contractor */
  id: number | string;
  /** Contractor name */
  name: string | null;
  /** Contact details */
  contact: string | null;
  /** Contractor specialty */
  specialty: string | null;
  /** Certification status */
  is_certified: boolean | null;
  /** Path to certificate file */
  certificate_path: string | null;
  /** License number */
  license_number: string | null;
  /** Raw contract time limit */
  raw_contract_time_limit: string | null;
  /** Formatted contract time limit for display */
  contract_time_limit_formatted: string | null;
  /** Construction status */
  construction_status: string | null;
  /** Years of experience */
  years_experience: number | null;
  /** Number of associated maintenance requests */
  maintenance_request_count: number;
  /** Raw creation timestamp */
  raw_created_at: string | null;
  /** Formatted creation timestamp for display */
  created_at_formatted: string | null;
  /** Raw last update timestamp */
  raw_updated_at: string | null;
  /** Formatted last update timestamp for display */
  updated_at_formatted: string | null;
  /** Raw deletion timestamp (if applicable) */
  raw_deleted_at: string | null;
  /** Formatted deletion timestamp for display */
  deleted_at_formatted: string | null;
}

/**
 * Interface for contractor form data
 */
export interface ContractorFormData {
  /** Contractor name */
  name: string;
  /** Contact details */
  contact: string;
  /** Contractor specialty */
  specialty: string;
  /** Certification status */
  is_certified: boolean | null;
  /** Certificate file (required) */
  certificate_file: File | null;
  /** Path to existing certificate file */
  certificate_path: string;
  /** License number */
  license_number: string;
  /** Contract time limit (ISO date string) */
  contract_time_limit: string;
  /** Construction status */
  construction_status: string;
  /** Years of experience */
  years_experience: number | null;
}

/**
 * Interface for form validation errors
 */
export interface Errors {
  /** Error message for name field */
  name: string;
  /** Error message for contact field */
  contact: string;
  /** Error message for specialty field */
  specialty: string;
  /** Error message for is_certified field */
  is_certified: string;
  /** Error message for certificate_file field */
  certificate_file: string;
  /** Error message for license_number field */
  license_number: string;
  /** Error message for contract_time_limit field */
  contract_time_limit: string;
  /** Error message for construction_status field */
  construction_status: string;
  /** Error message for years_experience field */
  years_experience: string;
}

/**
 * Interface for pagination data
 */
export interface Pagination {
  /** Total number of contractors */
  total: number;
  /** Number of items per page */
  per_page: number;
  /** Current page number */
  current_page: number;
  /** Last page number */
  last_page: number;
}