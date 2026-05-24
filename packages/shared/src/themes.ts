// Wheel colours mapped from the ionstudioapps brand palette
// Palette: Peach #EDB590 · Coral #E59880 · Honey #F0D29D · Sage #BCD4A5
//          Mint #9DC4BC · Lavender #ADA8CC · Lilac #D4A5C8 · Blush #EDBDAC
//          Ink #2A2520

export const PALETTE = {
  peach:   '#EDB590',
  coral:   '#E59880',
  honey:   '#F0D29D',
  sage:    '#BCD4A5',
  mint:    '#9DC4BC',
  lavender:'#ADA8CC',
  lilac:   '#D4A5C8',
  blush:   '#EDBDAC',
  ink:     '#2A2520',
} as const;

// Wheel slice colours per theme — 6 slots mapped to palette colours
const WHEEL_WARM    = ['#EDB590','#E59880','#9DC4BC','#F0D29D','#ADA8CC','#D4A5C8'] as const;
const WHEEL_SLOW    = ['#C8977A','#C07868','#7AADA6','#C4A87A','#8E8AAA','#A882A4'] as const; // muted for dark bg
const WHEEL_LIGHT_A = ['#C8640A','#B84A30','#2A8C82','#B89000','#5A5498','#A03882'] as const; // high contrast on white
const WHEEL_DARK_A  = ['#F5C4A0','#F0A898','#B4E0D8','#F5DFA0','#C8C4E8','#E8BCD8'] as const; // high contrast on dark

export type ThemeName = 'warm-start' | 'slow-down' | 'light-a11y' | 'dark-a11y';

export interface Theme {
  name: ThemeName;
  label: string;
  dark: boolean;
  colors: {
    bgScreen: string;
    bgCard: string;
    bgInput: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    primary: string;
    success: string;
    danger: string;
    rest: {
      physical: string;
      mental: string;
      social: string;
      nourishment: string;
      custom: string;
    };
    wheel: readonly string[];
    wheelLight: readonly string[];
  };
}

export const THEMES: Record<ThemeName, Theme> = {
  'warm-start': {
    name: 'warm-start',
    label: 'Warm Start',
    dark: false,
    colors: {
      bgScreen:      '#FAF7F2',
      bgCard:        '#FFFFFF',
      bgInput:       '#F5F0EB',
      textPrimary:   '#2A2520',
      textSecondary: '#8A7E7A',
      textMuted:     '#B0A8A4',
      accent:        '#E59880',
      primary:       '#ADA8CC',
      success:       '#BCD4A5',
      danger:        '#E59880',
      rest: {
        physical:    '#EDB590',
        mental:      '#ADA8CC',
        social:      '#9DC4BC',
        nourishment: '#F0D29D',
        custom:      '#EDBDAC',
      },
      wheel:      WHEEL_WARM,
      wheelLight: ['#F9E8DC','#F7DDD8','#DCF0EE','#FAF0DC','#EEEDF5','#F5E8F2'],
    },
  },

  'slow-down': {
    name: 'slow-down',
    label: 'Slow Down',
    dark: true,
    colors: {
      bgScreen:      '#1C1828',
      bgCard:        '#26223A',
      bgInput:       '#302C44',
      textPrimary:   '#EDE8E3',
      textSecondary: '#9B8FA0',
      textMuted:     '#6A6278',
      accent:        '#ADA8CC',
      primary:       '#9DC4BC',
      success:       '#8AAE82',
      danger:        '#C07868',
      rest: {
        physical:    '#C8977A',
        mental:      '#8E8AAA',
        social:      '#7AADA6',
        nourishment: '#C4A87A',
        custom:      '#A882A4',
      },
      wheel:      WHEEL_SLOW,
      wheelLight: ['#3A2E28','#382420','#1E3432','#3A3220','#2C2A38','#302430'],
    },
  },

  'light-a11y': {
    name: 'light-a11y',
    label: 'Gentle Boost',
    dark: false,
    colors: {
      bgScreen:      '#FFFFFF',
      bgCard:        '#F5F5F5',
      bgInput:       '#EBEBEB',
      textPrimary:   '#1A1210',
      textSecondary: '#4A4040',
      textMuted:     '#6A6060',
      accent:        '#B84A30',  // darker coral — passes 4.5:1 on white
      primary:       '#5A5498',  // darker lavender — passes 4.5:1 on white
      success:       '#3A7230',  // darker sage
      danger:        '#B84A30',
      rest: {
        physical:    '#C8640A',  // darker peach
        mental:      '#5A5498',  // darker lavender
        social:      '#2A8C82',  // darker mint
        nourishment: '#8A7200',  // darker honey
        custom:      '#8A4070',  // darker lilac
      },
      wheel:      WHEEL_LIGHT_A,
      wheelLight: ['#F9EEE8','#F7E4E0','#E0F2F0','#F5EDD0','#ECEAF7','#F5E4F0'],
    },
  },

  'dark-a11y': {
    name: 'dark-a11y',
    label: 'Grounding Mode',
    dark: true,
    colors: {
      bgScreen:      '#0F0D18',
      bgCard:        '#1A1830',
      bgInput:       '#242240',
      textPrimary:   '#FFFFFF',
      textSecondary: '#C8C0D8',
      textMuted:     '#A098B0',
      accent:        '#F5C4A0',  // light peach — passes 4.5:1 on dark bg
      primary:       '#C8C4E8',  // light lavender
      success:       '#A8D898',  // light sage
      danger:        '#F0A898',  // light coral
      rest: {
        physical:    '#F5C4A0',
        mental:      '#C8C4E8',
        social:      '#B4E0D8',
        nourishment: '#F5DFA0',
        custom:      '#E8BCD8',
      },
      wheel:      WHEEL_DARK_A,
      wheelLight: ['#3A2820','#382020','#183430','#382E10','#282438','#301820'],
    },
  },
};

export const DEFAULT_THEME: ThemeName = 'warm-start';
