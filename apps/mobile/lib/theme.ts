import { BRAND_COLORS } from '@dekanat/shared';

/** Same tokens as apps/web (tailwind: ink / cream / copper ≈ surface / primary). */
export const colors = {
  ink: BRAND_COLORS.ink,
  cream: BRAND_COLORS.cream,
  copper: BRAND_COLORS.copper,
  copperDark: BRAND_COLORS.copperDark,
  inkMuted: BRAND_COLORS.inkMuted,
  creamDeep: BRAND_COLORS.creamDeep,
  accent: BRAND_COLORS.accent,
  link: BRAND_COLORS.link,
  white: '#FFFFFF',
} as const;
