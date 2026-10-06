import { useWindowDimensions } from 'react-native';

import { PAD } from '@/theme';

/**
 * Equivalente a grid-template-columns: repeat(auto-fit, minmax(min, 1fr)) para una grilla que
 * ocupa todo el ancho de la pantalla: cuántas columnas entran y cuánto mide cada celda.
 */
export function useGridColumns(min: number, gap: number) {
  const { width } = useWindowDimensions();
  const available = width - PAD * 2;
  const columns = Math.max(1, Math.floor((available + gap) / (min + gap)));
  return { columns, itemWidth: Math.floor((available - gap * (columns - 1)) / columns) };
}
