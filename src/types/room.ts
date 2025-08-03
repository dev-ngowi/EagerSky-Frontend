export interface Room {
  id: number;
  property_id: number;
  property_title?: string;
  room_number: string;
  size: number;
  rent: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormData {
  property_id: number | null;
  room_number: string;
  size: number | null;
  rent: number | null;
  is_available: boolean | null;
}

export interface Payload {
  property_id: number;
  room_number: string;
  size: number;
  rent: number;
  is_available: boolean;
}

export interface Errors {
  property_id: string;
  room_number: string;
  size: string;
  rent: string;
  is_available: string;
}