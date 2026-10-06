import { useMemo } from 'react';

import { createCategoryLookup, type CategoryLookup } from '@/domain/catalog';
import { useAppState } from './AppStateProvider';

/** Todas las categorías (de fábrica + propias) y cómo buscar una por id. */
export function useCategories(): CategoryLookup {
  const { data } = useAppState();
  return useMemo(() => createCategoryLookup(data.categories), [data.categories]);
}
