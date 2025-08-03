export interface Location {
  id?: number;
  name: string;
  city_id: number | null;
  country_id: number | null;
  street_id: number | null;
  neighborhood_id: number | null;
  latitude: number | string | null;
  longitude: number | string | null;
  country?: string | null;
  city?: string | null;
  street?: string | null;
  neighborhood?: string | null;
  created_at?: string; // Added to match API response
  updated_at?: string; // Added to match API response
}

export interface FormData {
  id: number | null;
  name: string;
  city_id: string | number | null;
  country_id: string | number | null;
  street_id: string | number | null;
  neighborhood_id: string | number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Errors {
  name: string;
  city_id: string;
  country_id: string;
  street_id: string;
  neighborhood_id: string;
  latitude: string;
  longitude: string;
}

export interface Payload {
  id: number | null;
  name: string;
  city_id: number | null;
  country_id: number | null;
  street_id: number | null;
  neighborhood_id: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CountryOption {
  value: number | string; // Allow string for temporary IDs
  text: string;
}

export interface CityOption {
  value: number | string; // Allow string for temporary IDs
  text: string;
}

export interface StreetOption {
  value: number | string; // Allow string for temporary IDs
  text: string;
}

export interface NeighborhoodOption {
  value: number | string; // Allow string for temporary IDs
  text: string;
}