/**
 * Paletas de Gastito. La clara son los tokens CSS de la web; la oscura mantiene el mismo verde de
 * fondo, llevado a casi negro, con superficies apenas más claras (como las de iOS).
 *
 * Contraste de texto (WCAG) sobre la superficie: principal ≥ 14:1, secundario ≥ 5:1 y terciario
 * ≥ 4:1 en claro (más que el secondaryLabel de iOS) y ≥ 4,3:1 en oscuro. Con "Aumentar
 * contraste" de iOS, todo el texto supera 4,5:1. Lo verifica src/theme/__tests__/colors.test.ts.
 */
export interface Palette {
  canvas: string;
  surface: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineSoft: string;
  ok: string;
  warn: string;
  /** Blanco de verdad: íconos sobre los colores de categoría */
  white: string;
  /** Fondo de lo más importante (botón principal, +, elegido) y el texto que va encima */
  accent: string;
  onAccent: string;

  // tintes que usaba cada componente en la web
  ghost: string;
  ghostPressed: string;
  soft: string;
  softer: string;
  softPressed: string;
  navActive: string;
  chipAdd: string;
  dangerBg: string;
  dangerInk: string;
  /** Fondo de la acción "Eliminar" al deslizar una fila */
  destructive: string;
  bannerBg: string;
  trendIdle: string;
  donutEmpty: string;
  amountPlaceholder: string;
  checkbox: string;
  scrim: string;
  navGlass: string;
  shadow: string;
}

export const lightColors: Palette = {
  canvas: '#E9EDE8',
  surface: '#FFFFFF',
  ink: '#152220',
  ink2: '#5E6D67',
  ink3: '#75827C',
  line: '#DBE2DB',
  lineSoft: '#EAEFE9',
  ok: '#1F7A4C',
  warn: '#C4531A',
  white: '#FFFFFF',
  accent: '#152220',
  onAccent: '#FFFFFF',

  ghost: '#DFE5DE',
  ghostPressed: '#D4DDD3',
  soft: '#F5F8F4',
  softer: '#F0F4EF',
  softPressed: '#E2E9E1',
  navActive: '#E7EDE6',
  chipAdd: '#EDF2EC',
  dangerBg: '#F6E2DC',
  dangerInk: '#A93412',
  destructive: '#D13F1F',
  bannerBg: '#FFF6E4',
  trendIdle: '#DDE5DC',
  donutEmpty: '#E4EAE3',
  amountPlaceholder: '#D3DBD3',
  checkbox: '#8B9690',
  scrim: 'rgba(21,34,32,0.42)',
  navGlass: 'rgba(255,255,255,0.92)',
  shadow: 'rgba(21,34,32,0.28)',
};

export const darkColors: Palette = {
  canvas: '#0C1311',
  surface: '#17201E',
  ink: '#EBF0EB',
  ink2: '#A9B6B0',
  ink3: '#7D8B84',
  line: '#2A3532',
  lineSoft: '#212B28',
  ok: '#5BC291',
  warn: '#F08A52',
  white: '#FFFFFF',
  accent: '#EBF0EB',
  onAccent: '#0C1311',

  ghost: '#232E2B',
  ghostPressed: '#2D3936',
  soft: '#1D2724',
  softer: '#1A2421',
  softPressed: '#283330',
  navActive: '#26312E',
  chipAdd: '#26312E',
  dangerBg: '#3A211A',
  dangerInk: '#FF9A7A',
  destructive: '#C2391B',
  bannerBg: '#33291A',
  trendIdle: '#2A3532',
  donutEmpty: '#222C29',
  amountPlaceholder: '#34403C',
  checkbox: '#6B7972',
  scrim: 'rgba(0,0,0,0.6)',
  navGlass: 'rgba(23,32,30,0.88)',
  shadow: 'rgba(0,0,0,0.5)',
};

/** Lo que cambia con Ajustes de iOS → Accesibilidad → Aumentar contraste. */
const highContrast: Record<'light' | 'dark', Partial<Palette>> = {
  light: {
    ink: '#0B1412',
    ink2: '#45534D',
    ink3: '#5E6C66',
    line: '#B9C5BB',
    ok: '#17643E',
    warn: '#A9440F',
    dangerInk: '#8E2A0C',
    accent: '#0B1412',
    checkbox: '#5E6C66',
  },
  dark: {
    ink: '#FFFFFF',
    ink2: '#C7D2CC',
    ink3: '#A3B0AA',
    line: '#45524E',
    ok: '#7BD6A9',
    warn: '#FFA172',
    dangerInk: '#FFB59C',
    accent: '#FFFFFF',
    checkbox: '#A3B0AA',
  },
};

export type ColorScheme = 'light' | 'dark';

export function paletteFor(scheme: ColorScheme, increaseContrast = false): Palette {
  const base = scheme === 'dark' ? darkColors : lightColors;
  return increaseContrast ? { ...base, ...highContrast[scheme] } : base;
}
