import type { Character } from 'types/character.types';

import type { CompletenessFilter, RoleFilter, RosterSortKey, StatusFilter } from './rosterView';

export type State = {
  drawerOpened: boolean;
  editingCharacter: Character | null;
  adminDrawerOpened: boolean;
  sortKey: RosterSortKey;
  sortDir: 'asc' | 'desc';
  searchQuery: string;
  classFilter: string;
  roleFilter: RoleFilter;
  completenessFilter: CompletenessFilter;
  statusFilter: StatusFilter;
  importDrawerOpened: boolean;
  clearModalOpened: boolean;
  deleteModalOpened: boolean;
  characterToDelete: Character | null;
};

export const initialState: State = {
  drawerOpened: false,
  editingCharacter: null,
  adminDrawerOpened: false,
  sortKey: 'name',
  sortDir: 'asc',
  searchQuery: '',
  classFilter: 'all',
  roleFilter: 'all',
  completenessFilter: 'all',
  statusFilter: 'all',
  importDrawerOpened: false,
  clearModalOpened: false,
  deleteModalOpened: false,
  characterToDelete: null,
};

export type Action =
  | { type: 'SET_DRAWER_OPENED'; payload: boolean }
  | { type: 'SET_EDITING_CHARACTER'; payload: Character | null }
  | { type: 'SET_ADMIN_DRAWER_OPENED'; payload: boolean }
  | { type: 'SORT_BY'; payload: RosterSortKey }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_CLASS_FILTER'; payload: string }
  | { type: 'SET_ROLE_FILTER'; payload: RoleFilter }
  | { type: 'SET_COMPLETENESS_FILTER'; payload: CompletenessFilter }
  | { type: 'SET_STATUS_FILTER'; payload: StatusFilter }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_IMPORT_DRAWER_OPENED'; payload: boolean }
  | { type: 'SET_CLEAR_MODAL_OPENED'; payload: boolean }
  | { type: 'SET_DELETE_MODAL_OPENED'; payload: boolean }
  | { type: 'SET_CHARACTER_TO_DELETE'; payload: Character | null };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DRAWER_OPENED':
      return { ...state, drawerOpened: action.payload };
    case 'SET_EDITING_CHARACTER':
      return { ...state, editingCharacter: action.payload };
    case 'SET_ADMIN_DRAWER_OPENED':
      return { ...state, adminDrawerOpened: action.payload };
    case 'SORT_BY':
      if (state.sortKey === action.payload) {
        return { ...state, sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' };
      }
      return {
        ...state,
        sortKey: action.payload,
        sortDir: action.payload === 'wishlist' ? 'desc' : 'asc',
      };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_CLASS_FILTER':
      return { ...state, classFilter: action.payload };
    case 'SET_ROLE_FILTER':
      return { ...state, roleFilter: action.payload };
    case 'SET_COMPLETENESS_FILTER':
      return { ...state, completenessFilter: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'RESET_FILTERS':
      return {
        ...state,
        searchQuery: '',
        classFilter: 'all',
        roleFilter: 'all',
        completenessFilter: 'all',
      };
    case 'SET_IMPORT_DRAWER_OPENED':
      return { ...state, importDrawerOpened: action.payload };
    case 'SET_CLEAR_MODAL_OPENED':
      return { ...state, clearModalOpened: action.payload };
    case 'SET_DELETE_MODAL_OPENED':
      return { ...state, deleteModalOpened: action.payload };
    case 'SET_CHARACTER_TO_DELETE':
      return { ...state, characterToDelete: action.payload };
    default:
      return state;
  }
}
