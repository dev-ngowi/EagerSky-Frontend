export interface FormData {
  property_id: number | null;
  consumption_date: string;
  electricity_usage: number | null;
  gas_usage: number | null;
  water_usage: number | null;
  total_cost: number | null;
  status: string;
  due_date: string | null;
}

export interface Errors {
  property_id: string;
  consumption_date: string;
  electricity_usage: string;
  gas_usage: string;
  water_usage: string;
  total_cost: string;
  status: string;
  due_date: string;
}

export interface Payload {
  property_id: number | null;
  consumption_date: string;
  electricity_usage: number | null;
  gas_usage: number | null;
  water_usage: number | null;
  total_cost: number | null;
  status: string;
  due_date: string | null;
}

export interface EnergyConsumption {
  id: number;
  property_id: number | null;
  property_title: string | null; // Added to match store mapping
  consumption_date: string;
  electricity_usage: number | null;
  gas_usage: number | null;
  water_usage: number | null;
  total_cost: number | null;
  status: string;
  due_date: string | null;
  created_at: string | null; // Added to match store mapping
  updated_at: string | null; // Added to match store mapping
}