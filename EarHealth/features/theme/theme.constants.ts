export type ThemeTier = 'default' | 'bronze' | 'argent' | 'or';

export interface TierPalette {
  primary:      string;
  primaryDark:  string;
  primaryLight: string;
  primaryMid:   string;
  // Same 3-stop shape as the HERO_GRADIENT constant duplicated across the
  // dashboard/profile/quiz hero screens.
  gradient:     [string, string, string];
}

// Purchase order: each tier must be owned before the next becomes buyable.
export const TIER_ORDER: ThemeTier[] = ['default', 'bronze', 'argent', 'or'];

export const TIER_LABEL: Record<ThemeTier, string> = {
  default: 'Par défaut',
  bronze:  'Bronze',
  argent:  'Argent',
  or:      'Or',
};

export const TIER_COST: Record<ThemeTier, number> = {
  default: 0,
  bronze:  200,
  argent:  400,
  or:      600,
};

// `default` matches the app's original blue exactly (HERO_GRADIENT and the
// Colors.primary* constants), so nothing visually changes until a tier is
// purchased and selected.
export const TIER_PALETTES: Record<ThemeTier, TierPalette> = {
  default: {
    primary:      '#0B7285',
    primaryDark:  '#155E75',
    primaryLight: '#E0F2F7',
    primaryMid:   '#0D8FA5',
    gradient:     ['#0D8FA5', '#0B7285', '#064E5F'],
  },
  bronze: {
    primary:      '#A85C2E',
    primaryDark:  '#2E1710',
    primaryLight: '#F7E8D8',
    primaryMid:   '#F2C48F',
    gradient:     ['#F2C48F', '#A85C2E', '#2E1710'],
  },
  argent: {
    primary:      '#69727D',
    primaryDark:  '#1C2026',
    primaryLight: '#EDEFF2',
    primaryMid:   '#F5F6F8',
    gradient:     ['#F5F6F8', '#69727D', '#1C2026'],
  },
  or: {
    primary:      '#C0900F',
    primaryDark:  '#332205',
    primaryLight: '#FBF0D4',
    primaryMid:   '#F8E3A3',
    gradient:     ['#F8E3A3', '#C0900F', '#332205'],
  },
};
