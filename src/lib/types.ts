export type UserRole = "admin" | "reader";
export type ContractStatus = "active" | "terminated" | "renegotiated" | "expired";
export type Urgency = "red" | "yellow" | "green" | "none";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  cvr: string;
  address: string | null;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Contract {
  id: string;
  location_id: string;
  category_id: string;
  supplier: string;
  title: string;
  start_date: string | null;
  binding_months: number | null;
  expiry_date: string;
  notice_months: number;
  termination_deadline: string;
  auto_renews: boolean;
  renewal_months: number | null;
  status: ContractStatus;
  notes: string | null;
  needs_validation: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Række fra contract_overview-viewet */
export interface ContractOverview extends Contract {
  location_name: string;
  location_cvr: string;
  category_name: string;
  days_to_deadline: number;
  urgency: Urgency;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  contract_id: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
