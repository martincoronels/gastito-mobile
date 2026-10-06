/** Texto sin caracteres de control, recortado al mismo largo máximo que permite la interfaz. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const visible = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  return Array.from(visible).slice(0, max).join('').trim();
}

const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
const extendsGrapheme = (cp: number) =>
  (cp >= 0xfe00 && cp <= 0xfe0f) || // selectores de variación (🏷️)
  (cp >= 0x1f3fb && cp <= 0x1f3ff) || // tonos de piel (👍🏽)
  (cp >= 0x0300 && cp <= 0x036f) || // tildes combinadas
  cp === 0x20e3 || // keycap (1️⃣)
  (cp >= 0xe0020 && cp <= 0xe007f); // etiquetas (banderas regionales)

/** Versión manual para cuando no hay Intl.Segmenter (Hermes no lo trae). */
export function firstGraphemeManual(s: string): string {
  const cps = Array.from(s);
  if (!cps.length) return '';
  let out = cps[0];
  const cp0 = out.codePointAt(0) ?? 0;
  if (isRegionalIndicator(cp0) && cps[1] && isRegionalIndicator(cps[1].codePointAt(0) ?? 0)) {
    return out + cps[1]; // bandera: dos indicadores regionales
  }
  let i = 1;
  while (i < cps.length) {
    const cp = cps[i].codePointAt(0) ?? 0;
    if (cp === 0x200d && i + 1 < cps.length) {
      out += cps[i] + cps[i + 1]; // unión de emojis (👨‍👩‍👧)
      i += 2;
    } else if (extendsGrapheme(cp)) {
      out += cps[i];
      i += 1;
    } else break;
  }
  return out;
}

/** El primer carácter visible de lo tipeado, respetando emojis compuestos. */
export function firstGrapheme(input: unknown): string {
  const s = String(input ?? '').trim();
  if (!s) return '';
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const first = new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next();
      if (!first.done) return first.value.segment;
    } catch {
      // sigue con la versión manual
    }
  }
  return firstGraphemeManual(s);
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
