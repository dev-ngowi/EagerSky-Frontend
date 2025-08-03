export interface Document {
  id?: number;
  title: string;
  category_id: number | null;
  category_name?: string;
  file_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FormData {
  id?: number;
  title: string;
  category_id: number | null;
  file: File | null;
}

export interface Errors {
  title: string;
  category_id: string;
  file: string;
}

export interface Payload {
  id?: number;
  title: string;
  category_id: number | null;
  file: File | null;
}

export interface CategoryOption {
  id: number;
  name: string;
}