export const colors = {
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  border: '#E5E7EB',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  primary: '#0F172A',
  onPrimary: '#FFFFFF',
  accent: '#6366F1',
  accentSoft: '#EEF2FF',
  cyan: '#22D3EE',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
} as const;

// Brand gradient: indigo → violet → cyan.
export const gradients = {
  brand: ['#4F46E5', '#7C3AED', '#06B6D4'] as const,
  dark: ['#0F172A', '#1E1B4B'] as const,
  user: ['#4F46E5', '#7C3AED'] as const,
  price: ['#0F172A', '#312E81'] as const,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const shadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;
