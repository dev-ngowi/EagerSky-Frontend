export interface ImageFormData {
  property_id: number | null;
  caption: string | null;
  images?: File[]; // For ImageForm.vue
  image?: File | null; // For ImageEdit.vue
}

export interface Errors {
  property_id: string;
  caption: string;
  image: string;
}

export interface Payload {
  property_id: number | null;
  caption: string | null;
  images?: File[]; // For ImageForm.vue
  image?: File | null; // For ImageEdit.vue
  user_id: number | null;
}

interface Image {
  id: number;
  property_id: number;
  file_path: string;
  caption: string | null;
  uploader?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number | string;
}

export interface ImageGroup {
  property_id: number; 
  property_title: string; 
  images: Image[];
  uploader?: string;
  created_at?: string;
}

export interface Requirements {
  allowed_formats: string[];
  max_size: string;
  min_images_per_property: number;
  max_images_per_property: number;
  caption_max_length: number;
  notes: string[];
}