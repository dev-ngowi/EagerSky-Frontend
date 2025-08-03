// Represents a single room image
export interface RoomImage {
  id: number;
  property_id: number;
  room_id: number;
  file_path: string;
  caption: string | null;
  uploader?: string;
  user_id?: string; // Aligned with auth-store.ts and API
  created_at?: string;
  updated_at?: string;
}

// Represents a group of images for a room
export interface RoomImageGroup {
  property_id: number | null;
  property_title: string | null;
  room_id: number | null;
  room_number: string | null;
  images: RoomImage[];
  uploader?: string;
  created_at?: string;
}

// Pagination metadata for API responses
export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// Filters for querying room images
export interface ImageFilters {
  property_id: number | null;
  room_id: number | null;
  search?: string;
}

// Form data for uploading new room images
export interface RoomImageFormData {
  property_id: number | null;
  room_id: number | null;
  caption: string;
  images: File[];
  user_id?: string; // Aligned with auth-store.ts and API
}

// Form validation errors
export interface FormErrors {
  property_id?: string;
  room_id?: string;
  caption?: string;
  images?: string; // Unified to 'images' for both components
  newImageCaption?: string;
  [key: `caption_${number}`]: string; // Dynamic caption errors for specific image IDs
}

// Upload requirements from API
export interface UploadRequirements {
  allowed_formats: string[];
  max_size: string;
  min_images_per_room: number;
  max_images_per_room: number;
  caption_max_length: number;
  notes: string[];
}

// Preview for uploaded images
export interface ImagePreview {
  url: string;
  file: File;
}

// Property dropdown option
export interface PropertyOption {
  value: number;
  text: string;
}

// Room dropdown option
export interface RoomOption {
  value: number;
  text: string;
}

// Payload for updating image captions
export interface CaptionUpdate {
  id: number;
  caption: string | null;
}

// API response for fetching room images
export interface RoomImageResponse {
  data: RoomImageGroup[];
  pagination: Pagination;
  status: number;
  message?: string;
}

// API response for uploading room images
export interface RoomImageUploadResponse {
  data: RoomImage | RoomImage[];
  status: number;
  message?: string;
}

// Payload for bulk deleting images
export interface BulkDeletePayload {
  ids: number[];
  user_id: string; // Aligned with auth-store.ts and API
}

// Payload for bulk updating captions
export interface BulkUpdatePayload {
  images: CaptionUpdate[];
  user_id: string; // Aligned with auth-store.ts and API
}

// User profile from auth store
export interface UserProfile {
  id: string; // Aligned with auth-store.ts
  username: string;
  role: string;
  token: string;
  expiresAt: number;
}