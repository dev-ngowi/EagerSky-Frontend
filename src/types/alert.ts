import { AxiosResponse } from 'axios';

export interface FormData {
  id?: number;
  user_id: number | null;
  property_category_id: number | null;
  min_price: number | null;
  max_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  location_id: number | null;
  notification_frequency: string;
}

export interface Errors {
  user_id: boolean;
  property_category_id: boolean;
  min_price: boolean;
  max_price: boolean;
  min_bedrooms: boolean;
  max_bedrooms: boolean;
  location_id: boolean;
  notification_frequency: boolean;
}

export interface ErrorMessages {
  user_id: string;
  property_category_id: string;
  min_price: string;
  max_price: string;
  min_bedrooms: string;
  max_bedrooms: string;
  location_id: string;
  notification_frequency: string;
}

export interface Payload {
  id?: number;
  user_id: number;
  property_category_id: number;
  min_price: number | null;
  max_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  location_id: number;
  notification_frequency: string;
}

export interface Alert {
  id: number;
  user_id: number;
  username: string;
  property_category_id: number;
  property_category_name: string;
  min_price: number | 'N/A';
  max_price: number | 'N/A';
  min_bedrooms: number | 'N/A';
  max_bedrooms: number | 'N/A';
  location_id: number;
  location_name: string;
  notification_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface UserOption {
  value: number;
  text: string;
}

export interface LocationOption {
  value: number;
  text: string;
}

export interface PropertyCategoryOption {
  value: number;
  text: string;
}

export interface NotificationFrequencyOption {
  value: string;
  text: string;
}

export type ApiResponse<T> = AxiosResponse<
  | { data: T; message?: string; pagination?: { total: number; per_page: number; current_page: number; last_page: number } }
  | { message: string; errors?: Record<string, string[]> }
>;