export interface Profile {
  id: string;
  username: string;
  date_of_birth: string | null;
  gender: string | null;
  total_points: number;
  // Purchased color tiers (e.g. ['bronze', 'argent']) and the one currently
  // applied. 'default' is always implicitly owned and is never stored here.
  owned_tiers: string[];
  active_theme: string;
  created_at: string;
  updated_at: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
