export type FilterType = 'all' | 'WISHLIST_UPDATE' | 'SIM_REPORT_UPLOAD' | 'EVENT_SIGNUP';

export const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'filter.all' },
  { key: 'WISHLIST_UPDATE', label: 'filter.wishlist' },
  { key: 'SIM_REPORT_UPLOAD', label: 'filter.sim' },
  { key: 'EVENT_SIGNUP', label: 'filter.event' },
];
