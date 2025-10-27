export interface Room {
  id: number;
  property_id: number;
  property_title: string | null;
  room_category_id: number;
  room_category_name: string | null;
  room_number: string;
  size: number;
  rent: number;
  is_available: boolean;
  description: string; // Changed from `string | null` to `string`
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface FormData {
  property_id: number | null;
  room_category_id: number | null;
  room_number: string;
  size: number | null;
  rent: number | null;
  is_available: boolean | null;
  features: string[];
  description: string | null;
}

export interface Errors {
  property_id: string;
  room_category_id: string;
  room_number: string;
  size: string;
  rent: string;
  is_available: string;
  features: string;
  description: string;
}

export interface Payload {
  property_id: number;
  room_category_id: number;
  room_number: string;
  size: number;
  rent: number;
  is_available: boolean;
  features: string[];
  description: string | null;
}