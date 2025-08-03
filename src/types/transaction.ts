export interface Transaction {
  /** Unique identifier for the transaction */
  id: number;
  /** The ID of the associated property */
  property_id: number | null;
  /** The title of the associated property */
  property_title: string | null;
  /** The ID of the associated client */
  client_id: number | null;
  /** The name of the associated client */
  client_name: string | null;
  /** The ID of the buyer (optional) */
  buyer_id: number | null;
  /** The full name of the buyer */
  buyer_fullname: string | null;
  /** The ID of the seller (optional) */
  seller_id: number | null;
  /** The full name of the seller */
  seller_fullname: string | null;
  /** The type of transaction */
  type: string;
  /** The transaction amount */
  amount: number | null;
  /** The raw transaction date from the API */
  raw_transaction_date: string | null;
  /** Formatted transaction date for display */
  transaction_date_formatted: string | null;
  /** Formatted creation timestamp */
  created_at_formatted: string | null;
  /** Formatted last update timestamp */
  updated_at_formatted: string | null;
  /** Raw deletion timestamp (if applicable) */
  deleted_at: string | null; // Added to match API response
  /** Formatted deletion timestamp (if applicable) */
  deleted_at_formatted: string | null;
}

/**
 * Interface for transaction form data
 */
export interface FormData {
  /** The ID of the associated property */
  property_id: number | null;
  /** The ID of the associated client */
  client_id: number | null;
  /** The ID of the buyer (optional) */
  buyer_id: number | null;
  /** The ID of the seller (optional) */
  seller_id: number | null;
  /** The type of transaction (e.g., 'rent', 'purchase', 'utility', 'commission') */
  type: string;
  /** The transaction amount */
  amount: number | null;
  /** The date of the transaction in YYYY-MM-DD format */
  transaction_date: string;
}

/**
 * Interface for form validation errors
 */
export interface Errors {
  /** Error message for property_id field */
  property_id: string;
  /** Error message for client_id field */
  client_id: string;
  /** Error message for buyer_id field */
  buyer_id: string;
  /** Error message for seller_id field */
  seller_id: string;
  /** Error message for type field */
  type: string;
  /** Error message for amount field */
  amount: string;
  /** Error message for transaction_date field */
  transaction_date: string;
  /** Error message for duplicate transactions */
  duplicate: string;
}

/**
 * Interface for transaction payload sent to API
 */
export interface Payload {
  /** The ID of the associated property */
  property_id: number | null;
  /** The ID of the associated client */
  client_id: number | null;
  /** The ID of the buyer (optional) */
  buyer_id: number | null;
  /** The ID of the seller (optional) */
  seller_id: number | null;
  /** The type of transaction */
  type: string;
  /** The transaction amount */
  amount: number | null;
  /** The date of the transaction in YYYY-MM-DD format */
  transaction_date: string;
}