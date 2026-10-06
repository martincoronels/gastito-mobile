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
  /** `error`: no se pudieron leer los datos; la app no guarda nada hasta reintentar */
  status: 'loading' | 'ready' | 'error';
  /** `recovered`: lo guardado estaba dañado; se guardó una copia y se arrancó de cero */
  issue: 'recovered' | null;
  data: AppData;
  ui: UiState;
}

export type AppAction =
  | { type: 'hydrated'; data: AppData; issue?: 'recovered' }
  | { type: 'loadFailed' }
  | { type: 'loadRetried' }
  | { type: 'issueSeen' }
  | {
      type: 'dataChanged';
      data: AppData;
      /** Redibujar la dona con animación */
      animate?: boolean;
      ui?: Partial<Pick<UiState, 'month' | 'selected' | 'filter'>>;
    }
  | {
      /** Como dataChanged, pero se calcula sobre los datos del momento (para deshacer más tarde) */
      type: 'dataUpdated';
      update: (data: AppData) => AppData;
      animate?: boolean;
    }
  | { type: 'viewChanged'; view: ViewId; month?: MonthKey }
  | { type: 'monthChanged'; month: MonthKey }
  | { type: 'selectionToggled'; id: string }
  | { type: 'filterChanged'; filter: string }
  | { type: 'queryChanged'; query: string };

export const createInitialState = (now: Date = new Date()): AppState => ({
  status: 'loading',
  issue: null,
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
      return { ...state, status: 'ready', data: action.data, issue: action.issue ?? null };
    case 'loadFailed':
      return { ...state, status: 'error' };
    case 'loadRetried':
      return { ...state, status: 'loading' };
    case 'issueSeen':
      return { ...state, issue: null };
    case 'dataChanged':
      return {
        ...state,
        data: action.data,
        ui: { ...ui, ...action.ui, donutKey: action.animate ? ui.donutKey + 1 : ui.donutKey },
      };
    case 'dataUpdated': {
      const data = action.update(state.data);
      if (data === state.data) return state;
      return { ...state, data, ui: { ...ui, donutKey: action.animate ? ui.donutKey + 1 : ui.donutKey } };
    }
    case 'viewChanged': {
      const month = action.month ?? ui.month;
      return {
        ...state,
        ui: {
          ...ui,
          view: action.view,
          month,
          selected: null,
          tabKey: ui.tabKey + 1,
          donutKey: action.view === 'resumen' || month !== ui.month ? ui.donutKey + 1 : ui.donutKey,
        },
      };
    }
    case 'monthChanged':
      if (action.month === ui.month) return state;
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
