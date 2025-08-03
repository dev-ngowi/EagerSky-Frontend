// types/review.ts
export interface FormData {
  property_id: number | null;
  rating: number | null;
  comment: string;
  review_date: Date | null;
}

export interface Errors {
  property_id: string;
  rating: string;
  comment: string;
  review_date: string;
  user_id?: string;
}

export interface Payload {
  property_id: number;
  rating: number;
  comment: string | null;
  review_date: string | null;
  user_id: number;
}

export interface Review {
  id: number;
  property_id: number;
  property_title: string;
  user_id: number;
  user_fullname: string;
  rating: number;
  comment: string | null;
  review_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}