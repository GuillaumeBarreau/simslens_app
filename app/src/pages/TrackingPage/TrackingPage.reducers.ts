import type { AnomalyFilter, SimMode, SimState, TrackingView } from './trackingStatus';

export type SortKey = 'name' | 'spec' | 'ilvl' | 'keys' | 'score' | 'report';

export type State = {
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  inputValue: string;
  inputError: string | null;
  view: TrackingView;
  stateFilter: SimState | null;
  todoOnly: boolean;
  search: string;
  anomalyFilter: AnomalyFilter;
  showGear: boolean;
};

export const initialState: State = {
  sortKey: 'ilvl',
  sortDir: 'desc',
  inputValue: '',
  inputError: null,
  view: 'overview',
  stateFilter: null,
  todoOnly: false,
  search: '',
  anomalyFilter: 'all',
  showGear: false,
};

export const initState = (view: TrackingView): State => ({ ...initialState, view });

export type Action =
  | { type: 'SORT_BY'; payload: SortKey }
  | { type: 'SET_INPUT_VALUE'; payload: string }
  | { type: 'SET_INPUT_ERROR'; payload: string | null }
  | { type: 'SET_VIEW'; payload: TrackingView }
  | { type: 'TOGGLE_STATE_FILTER'; payload: { mode: SimMode; state: SimState } }
  | { type: 'CLEAR_STATE_FILTER' }
  | { type: 'SET_TODO_ONLY'; payload: boolean }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_ANOMALY_FILTER'; payload: AnomalyFilter }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_SHOW_GEAR'; payload: boolean };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SORT_BY':
      if (state.sortKey === action.payload) {
        return { ...state, sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' };
      }
      return { ...state, sortKey: action.payload, sortDir: 'desc' };
    case 'SET_INPUT_VALUE':
      return { ...state, inputValue: action.payload };
    case 'SET_INPUT_ERROR':
      return { ...state, inputError: action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.payload, stateFilter: null };
    case 'TOGGLE_STATE_FILTER': {
      const { mode, state: simState } = action.payload;
      const isActive = state.view === mode && state.stateFilter === simState;
      return { ...state, view: mode, stateFilter: isActive ? null : simState };
    }
    case 'CLEAR_STATE_FILTER':
      return { ...state, stateFilter: null };
    case 'SET_TODO_ONLY':
      return { ...state, todoOnly: action.payload };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SET_ANOMALY_FILTER':
      return { ...state, anomalyFilter: action.payload };
    case 'RESET_FILTERS':
      return { ...state, stateFilter: null, todoOnly: false, search: '', anomalyFilter: 'all' };
    case 'SET_SHOW_GEAR':
      return { ...state, showGear: action.payload };
    default:
      return state;
  }
}
