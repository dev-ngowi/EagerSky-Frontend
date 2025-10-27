export interface Location {
  id: number;
  name: string;
  city_id: number | null;
  country_id: number | null;
  street_id: number | null;
  neighborhood_id: number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  country: string | null;
  city: string | null;
  street: string | null;
  neighborhood: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CountryOption {
  value: number | string;
  text: string;
}

export interface CityOption {
  value: number | string;
  text: string;
}

export interface StreetOption {
  value: number | string;
  text: string;
}

export interface NeighborhoodOption {
  value: number | string;
  text: string;
}

export interface FormData {
  id: number | null;
  name: string;
  country_id: number | string | null;
  city_id: number | string | null;
  street_id: number | string | null;
  neighborhood_id: number | string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Errors {
  name: string;
  country_id: string;
  city_id: string;
  street_id: string;
  neighborhood_id: string;
  latitude: string;
  longitude: string;
}

export interface Payload {
  id: number | null;
  name: string;
  country_id: number | null;
  city_id: number | null;
  street_id: number | null;
  neighborhood_id: number | null;
  latitude: number | null;
  longitude: number | null;
}