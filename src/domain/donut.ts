import { REST_SLICE_COLOR, REST_SLICE_ID } from './catalog';
import type { CategoryTotal } from './selectors';
import type { Category } from './types';

/** Geometría de la dona, en el mismo sistema de coordenadas que el SVG de la web (256×256). */
export const DONUT = { R: 104, W: 30, CX: 128, CY: 128, VIEWBOX: 256 } as const;

const TAU = Math.PI * 2;
/** Lo que necesita un arco con puntas redondeadas para leerse como arco y no como punto */
const MIN_SPAN = 0.36;
/** El ancho angular que ocupa un punto (grosor / radio) */
const DOT_SPAN = DONUT.W / DONUT.R;

export interface DonutSlice extends CategoryTotal {
  category: Category;
  /** Solo en la porción agrupada: las categorías que junta */
  members?: string[];
}

/**
 * Las porciones que no llegan a leerse como arco se juntan en una sola, "Otras N cat.", pero solo
 * si sus puntos se van a pisar entre sí. No se esconde nada: el detalle completo sigue en la lista.
 */
export function buildSlices(
  totals: readonly CategoryTotal[],
  sum: number,
  resolve: (id: string) => Category,
): DonutSlice[] {
  if (!sum) return [];
  const withCategory = (t: CategoryTotal): DonutSlice => ({ ...t, category: resolve(t.id) });
  const span = (t: CategoryTotal) => (t.sum / sum) * TAU;
  let i = totals.findIndex((t) => span(t) < MIN_SPAN); // vienen de mayor a menor
  if (i < 0) return totals.map(withCategory);
  i = Math.max(i, 2); // nunca menos de 2 porciones propias
  const small = totals.slice(i);
  const overlap = small.some((t, k) => k > 0 && (span(small[k - 1]) + span(t)) / 2 < DOT_SPAN);
  if (!overlap) return totals.map(withCategory);
  return [
    ...totals.slice(0, i).map(withCategory),
    {
      id: REST_SLICE_ID,
      members: small.map((t) => t.id),
      sum: small.reduce((a, t) => a + t.sum, 0),
      n: small.reduce((a, t) => a + t.n, 0),
      category: { id: REST_SLICE_ID, name: `Otras ${small.length} cat.`, color: REST_SLICE_COLOR, icon: 'dots' },
    },
  ];
}

interface SegmentBase {
  /** Dónde va el ícono (centro angular de la porción, sobre el anillo) */
  iconX: number;
  iconY: number;
  /** Ángulo de arranque y amplitud de la porción, en radianes */
  start: number;
  span: number;
}
export interface ArcSegment extends SegmentBase {
  kind: 'arc';
  d: string;
  length: number;
}
export interface DotSegment extends SegmentBase {
  kind: 'dot';
  cx: number;
  cy: number;
}
export type DonutSegment = ArcSegment | DotSegment;

const fixed2 = (n: number) => n.toFixed(2);

/**
 * Calcula cada porción. Un punto mide lo mismo que el grosor del arco: si su porción es más
 * angosta, invadiría a las vecinas. A esas se les da el lugar justo para el punto más el espacio
 * de siempre, y ese ángulo se descuenta proporcionalmente de las demás.
 */
export function layoutDonut(slices: readonly { sum: number }[], sum: number): DonutSegment[] {
  const { R, W, CX, CY } = DONUT;
  const PAD = 7 / R;
  const CAP = W / 2 / R;
  const MIN_VIS = W / R + PAD;
  const polar = (a: number, r: number): [number, number] => [CX + r * Math.cos(a), CY + r * Math.sin(a)];

  const spans = slices.map((s) => (s.sum / sum) * TAU);
  const pinned = spans.map(() => false);
  for (let changed = true; changed;) {
    changed = false;
    const nPinned = pinned.filter(Boolean).length;
    const freeSum = slices.reduce((t, s, i) => (pinned[i] ? t : t + s.sum), 0);
    const room = TAU - nPinned * MIN_VIS;
    if (room <= 0 || !freeSum) break;
    slices.forEach((s, i) => {
      if (pinned[i]) return;
      spans[i] = (s.sum / freeSum) * room;
      if (spans[i] < MIN_VIS) {
        pinned[i] = true;
        spans[i] = MIN_VIS;
        changed = true;
      }
    });
  }
  if (spans.reduce((t, sp) => t + sp, 0) > TAU + 1e-6) {
    slices.forEach((s, i) => (spans[i] = (s.sum / sum) * TAU));
  }

  let a = -Math.PI / 2;
  return slices.map((_, idx): DonutSegment => {
    const span = spans[idx];
    const start = a;
    const a0 = a + PAD / 2 + CAP;
    const a1 = a + span - PAD / 2 - CAP;
    const [iconX, iconY] = polar(a + span / 2, R);
    a += span;
    if (a1 <= a0 + 1e-6) return { kind: 'dot', cx: iconX, cy: iconY, iconX, iconY, start, span };
    const [x0, y0] = polar(a0, R);
    const [x1, y1] = polar(a1, R);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return {
      kind: 'arc',
      d: `M ${fixed2(x0)} ${fixed2(y0)} A ${R} ${R} 0 ${large} 1 ${fixed2(x1)} ${fixed2(y1)}`,
      length: R * (a1 - a0),
      iconX,
      iconY,
      start,
      span,
    };
  });
}

/** Qué porción se tocó (índice) a partir de un punto en coordenadas del viewBox; -1 si ninguna. */
export function hitTestDonut(segments: readonly DonutSegment[], x: number, y: number): number {
  const { R, W, CX, CY } = DONUT;
  const r = Math.hypot(x - CX, y - CY);
  if (r < R - W / 2 - 8 || r > R + W / 2 + 8) return -1;
  const origin = -Math.PI / 2;
  const angle = (((Math.atan2(y - CY, x - CX) - origin) % TAU) + TAU) % TAU;
  return segments.findIndex((s) => angle >= s.start - origin && angle < s.start - origin + s.span);
}

/** La porción se enciende si es la elegida o si junta a la categoría elegida. */
export const isSliceOn = (slice: DonutSlice, selected: string | null): boolean =>
  selected != null && (slice.id === selected || !!slice.members?.includes(selected));

/** Si una fila de la lista de categorías se ve elegida (también cuando se eligió "Otras"). */
export function isCategoryHighlighted(id: string, selected: string | null, slices: readonly DonutSlice[]): boolean {
  if (!selected) return false;
  if (selected === id) return true;
  const rest = slices.find((s) => s.id === REST_SLICE_ID);
  return selected === REST_SLICE_ID && !!rest?.members?.includes(id);
}
