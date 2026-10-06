import { darkColors, lightColors, paletteFor, type Palette } from '../colors';

/** Contraste WCAG 2.1 entre dos colores hexadecimales. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const backgrounds = (p: Palette) => [p.canvas, p.surface, p.soft];

describe('paletas', () => {
  it('tienen las mismas claves', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it.each([
    ['clara', lightColors, 3.3],
    ['oscura', darkColors, 4.3],
  ])('la %s se lee bien sobre todos los fondos', (_name, p, tertiary) => {
    for (const bg of backgrounds(p)) {
      expect(contrast(p.ink, bg)).toBeGreaterThanOrEqual(12);
      expect(contrast(p.ink2, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.ink3, bg)).toBeGreaterThanOrEqual(tertiary);
    }
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(12);
    expect(contrast(p.dangerInk, p.dangerBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.ink, p.bannerBg)).toBeGreaterThanOrEqual(7);
  });

  it.each(['light', 'dark'] as const)('con "Aumentar contraste" todo el texto supera 4,5:1 (%s)', (scheme) => {
    const p = paletteFor(scheme, true);
    for (const bg of backgrounds(p)) {
      for (const fg of [p.ink, p.ink2, p.ink3, p.ok, p.warn, p.dangerInk]) {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('el texto blanco del botón destructivo se lee', () => {
    expect(contrast('#FFFFFF', lightColors.destructive)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', darkColors.destructive)).toBeGreaterThanOrEqual(4.5);
  });
});
