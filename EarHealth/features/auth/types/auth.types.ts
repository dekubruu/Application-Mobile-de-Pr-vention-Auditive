export interface Profile {
  id: string;
  username: string;
  date_of_birth: string | null;
  gender: string | null;
  total_points: number;
  // Currently applied color tier. 'default' is always implicitly available
  // and never appears in theme_unlocks.
  active_theme: string;
  created_at: string;
  updated_at: string;
  // Embedded relation (public.user_theme_unlocks, one row per purchased
  // tier) — see profileService.getProfile. Ownership lives in its own table,
  // like a reward/badge, instead of an array column on the profile.
  theme_unlocks: { theme: string }[];
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
