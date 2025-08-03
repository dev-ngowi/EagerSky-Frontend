export interface Schedule {
  id: number;
  agent_id: number;
  property_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  agent_name?: string;
  property_title?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FormData {
  agent_id: number | null;
  property_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string; // Changed to string to match VaTextarea
}

export interface Payload {
  agent_id: number;
  property_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null; // Keep null for backend
}

export interface Errors {
  agent_id: string;
  property_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

export interface Option {
  value: number | string;
  text: string;
}