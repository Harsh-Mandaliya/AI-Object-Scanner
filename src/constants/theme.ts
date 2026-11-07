export const colors = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  primary: '#111827',
  onPrimary: '#FFFFFF',
  accent: '#2563EB',
  accentSoft: '#EFF6FF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
} as const;

export const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;
