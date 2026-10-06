import { ALL_FILTER } from '@/domain/catalog';
import { emptyData } from '@/domain/operations';
import type { AppData } from '@/domain/types';
import { currentMonth, type MonthKey } from '@/lib/dates';

export type ViewId = 'movimientos' | 'resumen' | 'fijos';

export interface UiState {
  view: ViewId;
  month: MonthKey;
  /** Categoría elegida en la dona (o la porción agrupada "__resto") */
  selected: string | null;
  /** Filtro de movimientos: "todas" o el id de una categoría */
  filter: string;
  query: string;
  /** Cambia cada vez que la dona tiene que volver a dibujarse con animación */
  donutKey: number;
  /** Cambia con cada toque en una pestaña (para volver arriba de todo) */
  tabKey: number;
}

export interface AppState {
  status: 'loading' | 'ready';
  data: AppData;
  ui: UiState;
}

export type AppAction =
  | { type: 'hydrated'; data: AppData }
  | {
      type: 'dataChanged';
      data: AppData;
      /** Redibujar la dona con animación */
      animate?: boolean;
      ui?: Partial<Pick<UiState, 'month' | 'selected' | 'filter'>>;
    }
  | { type: 'viewChanged'; view: ViewId }
  | { type: 'monthChanged'; month: MonthKey }
  | { type: 'selectionToggled'; id: string }
  | { type: 'filterChanged'; filter: string }
  | { type: 'queryChanged'; query: string };

export const createInitialState = (now: Date = new Date()): AppState => ({
  status: 'loading',
  data: emptyData(),
  ui: {
    view: 'resumen',
    month: currentMonth(now),
    selected: null,
    filter: ALL_FILTER,
    query: '',
    donutKey: 0,
    tabKey: 0,
  },
});

export function appReducer(state: AppState, action: AppAction): AppState {
  const { ui } = state;
  switch (action.type) {
    case 'hydrated':
      return { ...state, status: 'ready', data: action.data };
    case 'dataChanged':
      return {
        ...state,
        data: action.data,
        ui: { ...ui, ...action.ui, donutKey: action.animate ? ui.donutKey + 1 : ui.donutKey },
      };
    case 'viewChanged':
      return {
        ...state,
        ui: {
          ...ui,
          view: action.view,
          selected: null,
          tabKey: ui.tabKey + 1,
          donutKey: action.view === 'resumen' ? ui.donutKey + 1 : ui.donutKey,
        },
      };
    case 'monthChanged':
      return { ...state, ui: { ...ui, month: action.month, selected: null, donutKey: ui.donutKey + 1 } };
    case 'selectionToggled':
      return { ...state, ui: { ...ui, selected: ui.selected === action.id ? null : action.id } };
    case 'filterChanged':
      return { ...state, ui: { ...ui, filter: action.filter } };
    case 'queryChanged':
      return { ...state, ui: { ...ui, query: action.query } };
    default:
      return state;
  }
}
