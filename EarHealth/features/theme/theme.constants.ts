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
    primary:      '#8C5A2B',
    primaryDark:  '#5C3A1C',
    primaryLight: '#F3E4D4',
    primaryMid:   '#B87333',
    gradient:     ['#B87333', '#8C5A2B', '#5C3A1C'],
  },
  argent: {
    primary:      '#5B6B7A',
    primaryDark:  '#3E4A56',
    primaryLight: '#E7ECEF',
    primaryMid:   '#8494A3',
    gradient:     ['#8494A3', '#5B6B7A', '#3E4A56'],
  },
  or: {
    primary:      '#B8860B',
    primaryDark:  '#7A5C0A',
    primaryLight: '#FBF0D9',
    primaryMid:   '#D4AF37',
    gradient:     ['#D4AF37', '#B8860B', '#7A5C0A'],
  },
};
