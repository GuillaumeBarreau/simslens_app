import type { RaidEvent } from '../../services/event.service';

export type State = {
  selectedEvent: RaidEvent | null;
  createModalOpen: boolean;
  editingEvent: RaidEvent | null;
  selectedDate: Date | null;
  currentMonth: Date;
  eventSelectionModalOpen: boolean;
  eventsToSelect: RaidEvent[];
  selectionMode: 'view' | 'roster' | 'summary';
  absenceModalOpen: boolean;
  showAllAbsences: boolean;
};

export const initialState: State = {
  selectedEvent: null,
  createModalOpen: false,
  editingEvent: null,
  selectedDate: null,
  currentMonth: new Date(),
  eventSelectionModalOpen: false,
  eventsToSelect: [],
  selectionMode: 'view',
  absenceModalOpen: false,
  showAllAbsences: false,
};

export type Action =
  | { type: 'SET_SELECTED_EVENT'; payload: RaidEvent | null }
  | { type: 'SET_CREATE_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_EDITING_EVENT'; payload: RaidEvent | null }
  | { type: 'SET_SELECTED_DATE'; payload: Date | null }
  | { type: 'SET_CURRENT_MONTH'; payload: Date }
  | { type: 'SET_EVENT_SELECTION_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_EVENTS_TO_SELECT'; payload: RaidEvent[] }
  | { type: 'SET_SELECTION_MODE'; payload: 'view' | 'roster' | 'summary' }
  | { type: 'SET_ABSENCE_MODAL_OPEN'; payload: boolean }
  | { type: 'TOGGLE_SHOW_ALL_ABSENCES' };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SELECTED_EVENT':
      return { ...state, selectedEvent: action.payload };
    case 'SET_CREATE_MODAL_OPEN':
      return { ...state, createModalOpen: action.payload };
    case 'SET_EDITING_EVENT':
      return { ...state, editingEvent: action.payload };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_CURRENT_MONTH':
      return { ...state, currentMonth: action.payload };
    case 'SET_EVENT_SELECTION_MODAL_OPEN':
      return { ...state, eventSelectionModalOpen: action.payload };
    case 'SET_EVENTS_TO_SELECT':
      return { ...state, eventsToSelect: action.payload };
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.payload };
    case 'SET_ABSENCE_MODAL_OPEN':
      return { ...state, absenceModalOpen: action.payload };
    case 'TOGGLE_SHOW_ALL_ABSENCES':
      return { ...state, showAllAbsences: !state.showAllAbsences };
    default:
      return state;
  }
}
