import { THEMES, type ThemeName } from '@todo/shared/themes';

export type { ThemeName };

// ─── Per-theme surface extras not covered by the shared THEMES colours ────────
// (Mirrors the CSS variables in apps/web/src/app/globals.css.)

interface ThemeExtras {
  sunk: string;
  overlay: string;
  hairline: string;
  ink: string;
  onInk: string;
  accentSoft: string;
  heat: [string, string, string, string];
  softs: Record<'peach' | 'coral' | 'honey' | 'sage' | 'mint' | 'lavender' | 'lilac' | 'blush', string>;
}

const LIGHT_SOFTS = {
  peach: '#F7E4D6', coral: '#F5DACF', honey: '#F8ECD3', sage: '#E4EDD6',
  mint: '#DCEAE6', lavender: '#E5E2EF', lilac: '#EFDDE9', blush: '#F7E5DC',
} as const;

const EXTRAS: Record<ThemeName, ThemeExtras> = {
  'warm-start': {
    sunk: '#EDE6D9', overlay: 'rgba(42,37,32,0.38)', hairline: '#E4DCCD',
    ink: '#2A2520', onInk: '#F6EFE3', accentSoft: '#F5DACF',
    heat: ['#F0CDB8', '#E9A98E', '#DD8B68', '#CD7350'],
    softs: LIGHT_SOFTS,
  },
  'slow-down': {
    sunk: '#221E2C', overlay: 'rgba(15,12,20,0.55)', hairline: '#3D3650',
    ink: '#ECE4DB', onInk: '#272233', accentSoft: '#463A43',
    heat: ['#4A3A3C', '#6E4A44', '#96604F', '#C07868'],
    softs: {
      peach: '#4E4340', coral: '#4C3E3C', honey: '#4E4838', sage: '#404838',
      mint: '#3A4644', lavender: '#403E50', lilac: '#483C48', blush: '#4C403C',
    },
  },
  'light-a11y': {
    sunk: '#EDEAE4', overlay: 'rgba(22,19,15,0.5)', hairline: '#C8C0B4',
    ink: '#16130F', onInk: '#FFFFFF', accentSoft: '#F5DAD2',
    heat: ['#EFC0AE', '#DE8B6C', '#C85F3E', '#A03818'],
    softs: LIGHT_SOFTS,
  },
  'dark-a11y': {
    sunk: '#0E0B12', overlay: 'rgba(0,0,0,0.65)', hairline: '#453D58',
    ink: '#F6EFE3', onInk: '#141019', accentSoft: '#4A3830',
    heat: ['#4E3A32', '#7A5644', '#B08058', '#EDB590'],
    softs: {
      peach: '#4E4038', coral: '#4C3A38', honey: '#4E4834', sage: '#384434',
      mint: '#344442', lavender: '#3E3C52', lilac: '#48384A', blush: '#4C3E3A',
    },
  },
};

// Plant illustration colours (Focus Mode)
export const PLANT = {
  pot: '#C08A5C', potRim: '#AE7048', soil: '#6A4828',
  stem: '#7CAA56', leafA: '#A5C87A', leafB: '#BCD4A5', seed: '#C8A248',
} as const;

// Font family names as registered by @expo-google-fonts packages
export const FONTS = {
  display: 'Ephesis_400Regular',
  sansLight: 'AlbertSans_300Light',
  sans: 'AlbertSans_400Regular',
  sansMedium: 'AlbertSans_500Medium',
  sansSemi: 'AlbertSans_600SemiBold',
  sansBold: 'AlbertSans_700Bold',
} as const;

export function getTokens(theme: ThemeName = 'warm-start') {
  const t = THEMES[theme].colors;
  const x = EXTRAS[theme];
  return {
    name: theme,
    dark: THEMES[theme].dark,
    colors: {
      bg: {
        screen: t.bgScreen, card: t.bgCard, input: t.bgInput,
        sunk: x.sunk, sheet: t.bgCard, overlay: x.overlay,
      },
      text: { primary: t.textPrimary, secondary: t.textSecondary, muted: t.textMuted, onInk: x.onInk },
      action: { primary: x.ink, onPrimary: x.onInk, streak: t.accent, success: t.success, danger: t.danger },
      accent: { main: t.accent, soft: x.accentSoft, heading: t.accent },
      ink: x.ink,
      hairline: x.hairline,
      heat: x.heat,
      softs: x.softs,
      lavender: t.primary,
      rest: t.rest,
      wheel: t.wheel,
      wheelLight: t.wheelLight,
    },
    radius: { card: 24, row: 18, pill: 100, sheet: 32, tag: 100 },
    spacing: { screenPad: 22, cardPad: 16, rowGap: 9 },
  } as const;
}

export type Tokens = ReturnType<typeof getTokens>;

// Default export for backwards compatibility
export const TOKENS = getTokens('warm-start');
