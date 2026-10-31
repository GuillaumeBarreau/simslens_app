import type { SlimRow } from './utils';

export type State = {
  csvText: string;
  rowsAll: SlimRow[];
  status: string | null;
  detectedDelimiter: string;
  fileName: string;
  skippedPlayers: string[];
};

export const initialState: State = {
  csvText: '',
  rowsAll: [],
  status: null,
  detectedDelimiter: ',',
  fileName: '',
  skippedPlayers: [],
};

export type Action =
  | { type: 'SET_CSV_TEXT'; payload: string }
  | { type: 'SET_ROWS_ALL'; payload: SlimRow[] }
  | { type: 'SET_STATUS'; payload: string | null }
  | { type: 'SET_DETECTED_DELIMITER'; payload: string }
  | { type: 'SET_FILE_NAME'; payload: string }
  | { type: 'SET_SKIPPED_PLAYERS'; payload: string[] }
  | { type: 'UPDATE_ROW'; payload: { index: number; updated: Partial<SlimRow> } };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CSV_TEXT':
      return { ...state, csvText: action.payload };
    case 'SET_ROWS_ALL':
      return { ...state, rowsAll: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_DETECTED_DELIMITER':
      return { ...state, detectedDelimiter: action.payload };
    case 'SET_FILE_NAME':
      return { ...state, fileName: action.payload };
    case 'SET_SKIPPED_PLAYERS':
      return { ...state, skippedPlayers: action.payload };
    case 'UPDATE_ROW': {
      const copy = state.rowsAll.slice();
      copy[action.payload.index] = { ...copy[action.payload.index], ...action.payload.updated };
      return { ...state, rowsAll: copy };
    }
    default:
      return state;
  }
}
