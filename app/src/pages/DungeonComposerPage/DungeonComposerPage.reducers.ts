export type State = {
  selectedGroupId: number | null;
  isCreating: boolean;
  newStartTime: string;
  newEndTime: string;
  newType: string;
  startDropdownOpened: boolean;
  endDropdownOpened: boolean;
};

export const initialState: State = {
  selectedGroupId: null,
  isCreating: false,
  newStartTime: '20:00:00',
  newEndTime: '23:00:00',
  newType: 'M+',
  startDropdownOpened: false,
  endDropdownOpened: false,
};

export type Action =
  | { type: 'SET_SELECTED_GROUP_ID'; payload: number | null }
  | { type: 'SET_IS_CREATING'; payload: boolean }
  | { type: 'TOGGLE_IS_CREATING' }
  | { type: 'SET_NEW_START_TIME'; payload: string }
  | { type: 'SET_NEW_END_TIME'; payload: string }
  | { type: 'SET_NEW_TYPE'; payload: string }
  | { type: 'SET_START_DROPDOWN_OPENED'; payload: boolean }
  | { type: 'SET_END_DROPDOWN_OPENED'; payload: boolean }
  | { type: 'SET_START_AND_END_TIME'; payload: { startTime: string; endTime: string } };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SELECTED_GROUP_ID':
      return { ...state, selectedGroupId: action.payload };
    case 'SET_IS_CREATING':
      return { ...state, isCreating: action.payload };
    case 'TOGGLE_IS_CREATING':
      return { ...state, isCreating: !state.isCreating };
    case 'SET_NEW_START_TIME':
      return { ...state, newStartTime: action.payload };
    case 'SET_NEW_END_TIME':
      return { ...state, newEndTime: action.payload };
    case 'SET_NEW_TYPE':
      return { ...state, newType: action.payload };
    case 'SET_START_DROPDOWN_OPENED':
      return { ...state, startDropdownOpened: action.payload };
    case 'SET_END_DROPDOWN_OPENED':
      return { ...state, endDropdownOpened: action.payload };
    case 'SET_START_AND_END_TIME':
      return {
        ...state,
        newStartTime: action.payload.startTime,
        newEndTime: action.payload.endTime,
      };
    default:
      return state;
  }
}
