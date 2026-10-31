import dayjs from 'dayjs';

export type State = {
  currentMonth: Date;
  availabilityModalOpen: boolean;
  selectedDate: Date | null;
  showAllAvailabilities: boolean;
  ganttDate: dayjs.Dayjs | null;
  currentWeekStart: dayjs.Dayjs;
};

const today = dayjs();
const dow = today.day();

export const initialState: State = {
  currentMonth: new Date(),
  availabilityModalOpen: false,
  selectedDate: null,
  showAllAvailabilities: false,
  ganttDate: null,
  currentWeekStart: today.subtract(dow === 0 ? 6 : dow - 1, 'day').startOf('day'),
};

export type Action =
  | { type: 'SET_CURRENT_MONTH'; payload: Date }
  | { type: 'SET_AVAILABILITY_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_DATE'; payload: Date | null }
  | { type: 'SET_SHOW_ALL_AVAILABILITIES'; payload: boolean }
  | { type: 'SET_GANTT_DATE'; payload: dayjs.Dayjs | null }
  | { type: 'SET_CURRENT_WEEK_START'; payload: dayjs.Dayjs };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CURRENT_MONTH':
      return { ...state, currentMonth: action.payload };
    case 'SET_AVAILABILITY_MODAL_OPEN':
      return { ...state, availabilityModalOpen: action.payload };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_SHOW_ALL_AVAILABILITIES':
      return { ...state, showAllAvailabilities: action.payload };
    case 'SET_GANTT_DATE':
      return { ...state, ganttDate: action.payload };
    case 'SET_CURRENT_WEEK_START':
      return { ...state, currentWeekStart: action.payload };
    default:
      return state;
  }
}
