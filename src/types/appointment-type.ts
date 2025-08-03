export interface AppointmentType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FormData {
  name: string;
}

export interface Errors {
  name: boolean;
}

export interface ErrorMessages {
  name: string;
}

export type ApiResponse<T> =
  | { status: 200 | 201; data: T }
  | { status: 422 | number; data: { message: string; errors?: Record<string, string[]> } };