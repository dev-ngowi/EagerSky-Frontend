export interface FormData {
  name: string;
  description: string;
  schools: number[]; // Flat array of school_option IDs
  amenities: number[]; // Flat array of amenity_option IDs
  crime_rate: number | null;
  median_income: number | null;
  population: number | null;
  walk_score: number | null;
  transit_score: number | null;
  last_updated: string;
}

export interface Errors {
  name: string;
  description: string;
  schools: string;
  amenities: string;
  crime_rate: string;
  median_income: string;
  population: string;
  walk_score: string;
  transit_score: string;
  last_updated: string;
}

export interface Payload {
  id?: number; // Included only in NeighborhoodEdit
  name: string;
  description: string | null;
  schools: { [category: string]: number[] } | null; // Category-keyed ID arrays for backend
  amenities: { [category: string]: number[] } | null; // Category-keyed ID arrays for backend
  crime_rate: number | null;
  median_income: number | null;
  population: number | null;
  walk_score: number | null;
  transit_score: number | null;
  last_updated: string | null;
}

export interface Neighborhood {
  id: number;
  name: string;
  description: string;
  schools: { [category: string]: string[] }; // Names grouped by category (resolved from IDs)
  amenities: { [category: string]: string[] }; // Names grouped by category (resolved from IDs)
  crime_rate: number | null;
  median_income: number | null;
  population: number | null;
  walk_score: number | null;
  transit_score: number | null;
  last_updated: string;
  locations_count: number;
  created_at: string;
  updated_at: string;
  locations: any[];
}

export interface Option {
  id: number;
  name: string;
}

export interface GroupedOptions {
  [category: string]: Option[];
}