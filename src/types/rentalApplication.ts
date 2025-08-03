export interface RentalApplication {
  id: number;
  property_id: number;
  property_title: string | null;
  user_id: number;
  user_name: string | null;
  first_name: string | null;
  last_name: string | null;
  branch_id: number | null;
  branch_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  employment_status: string;
  nida_number: string;
  student_registration_number: string | null;
  annual_income: number | null;
  background_check_status: string | null;
  credit_report_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormData {
  property_id: number | null;
  user_id: number | null;
  branch_id: number | null;
  status: string;
  employment_status: string;
  nida_number: string;
  student_registration_number: string;
  annual_income: number | null;
  background_check_status: string;
  credit_report_status: string;
}

export interface Errors {
  property_id: string;
  user_id: string;
  branch_id: string;
  status: string;
  employment_status: string;
  nida_number: string;
  student_registration_number: string;
  annual_income: string;
  background_check_status: string;
  credit_report_status: string;
}

export interface Payload {
  property_id: number;
  user_id: number;
  branch_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  employment_status: string;
  nida_number: string;
  student_registration_number: string | null;
  annual_income: number;
  background_check_status: string | null;
  credit_report_status: string | null;
}

export interface Option {
  value: number;
  text: string;
}

export interface StatusOption {
  value: 'pending' | 'approved' | 'rejected';
  text: string;
}