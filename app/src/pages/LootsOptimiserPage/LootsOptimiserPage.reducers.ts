import type { Character as Characters } from 'types/character.types';
import type { items as Items } from 'types/shared';

export type RoleFilter = 'dps' | 'heals' | 'tanks' | 'all';

export type State = {
  players: Characters[];
  items: Items[];
  instancePanelOpen: boolean;
  viewMode: 'standard' | 'wishlist';
  groupBy: 'player' | 'item';
  roleFilter: RoleFilter;
};

export const initialState: State = {
  players: [],
  items: [],
  instancePanelOpen: false,
  viewMode: 'standard',
  groupBy: 'item',
  roleFilter: 'all',
};

export type Action =
  | { type: 'SET_PLAYERS'; payload: Characters[] }
  | { type: 'SET_ITEMS'; payload: Items[] }
  | { type: 'SET_INSTANCE_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'standard' | 'wishlist' }
  | { type: 'SET_GROUP_BY'; payload: 'player' | 'item' }
  | { type: 'SET_ROLE_FILTER'; payload: RoleFilter };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'SET_INSTANCE_PANEL_OPEN':
      return { ...state, instancePanelOpen: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_GROUP_BY':
      return { ...state, groupBy: action.payload };
    case 'SET_ROLE_FILTER':
      return { ...state, roleFilter: action.payload };
    default:
      return state;
  }
}
