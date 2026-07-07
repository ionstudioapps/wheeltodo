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

// Wheel slice colours per theme — 8 slots mapped to palette colours
const WHEEL_WARM    = ['#EDB590','#E59880','#9DC4BC','#F0D29D','#ADA8CC','#D4A5C8','#BCD4A5','#EDBDAC'] as const;
const WHEEL_SLOW    = ['#C8977A','#C07868','#7AADA6','#C4A87A','#8E8AAA','#A882A4','#98B888','#C8A098'] as const; // muted for dark bg
const WHEEL_LIGHT_A = ['#C8640A','#B84A30','#2A8C82','#B89000','#5A5498','#A03882','#3A7230','#943060'] as const; // high contrast on white
const WHEEL_DARK_A  = ['#F5C4A0','#F0A898','#B4E0D8','#F5DFA0','#C8C4E8','#E8BCD8','#A8D898','#F0C8D0'] as const; // high contrast on dark

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
    label: 'Gentle Boost',
    dark: false,
    colors: {
      bgScreen:      '#F3EEE5',
      bgCard:        '#FAF6EE',
      bgInput:       '#ECE5D8',
      textPrimary:   '#2A2520',
      textSecondary: '#8C8378',
      textMuted:     '#B4AB9D',
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
      wheelLight: ['#F9E8DC','#F7DDD8','#DCF0EE','#FAF0DC','#EEEDF5','#F5E8F2','#E8F5E0','#FAE8E4'],
    },
  },

  'slow-down': {
    name: 'slow-down',
    label: 'Grounding',
    dark: true,
    colors: {
      bgScreen:      '#272233',
      bgCard:        '#322C40',
      bgInput:       '#3A3349',
      textPrimary:   '#ECE4DB',
      textSecondary: '#9F96A8',
      textMuted:     '#6E6678',
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
      wheelLight: ['#3A2E28','#382420','#1E3432','#3A3220','#2C2A38','#302430','#1E3028','#382428'],
    },
  },

  'light-a11y': {
    name: 'light-a11y',
    label: 'High Noon',
    dark: false,
    colors: {
      bgScreen:      '#FFFFFF',
      bgCard:        '#F7F5F1',
      bgInput:       '#EDEAE4',
      textPrimary:   '#16130F',
      textSecondary: '#4A4238',
      textMuted:     '#6B6258',
      accent:        '#C0432D',  // darker coral — passes 4.5:1 on white
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
      wheelLight: ['#F9EEE8','#F7E4E0','#E0F2F0','#F5EDD0','#ECEAF7','#F5E4F0','#E4F5E0','#F5E0EC'],
    },
  },

  'dark-a11y': {
    name: 'dark-a11y',
    label: 'Eclipse',
    dark: true,
    colors: {
      bgScreen:      '#141019',
      bgCard:        '#211C2E',
      bgInput:       '#2C2640',
      textPrimary:   '#F6EFE3',
      textSecondary: '#C4BACA',
      textMuted:     '#A79DAE',
      accent:        '#EDB590',  // light peach — passes 4.5:1 on dark bg
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
      wheelLight: ['#3A2820','#382020','#183430','#382E10','#282438','#301820','#182C18','#381820'],
    },
  },
};

export const DEFAULT_THEME: ThemeName = 'warm-start';
