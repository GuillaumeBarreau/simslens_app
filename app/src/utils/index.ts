export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ');
}

export { formatTimestamp, getTimeDifference, isValidDate } from './dateUtils';
export { formatNumberWithLocale } from './formatNumberWithLocale';
export { getQuerySlot } from './getQuerySlot';
export { getReportUrl, isHealerSpec } from './getReportUrl';
export { getThumbnailUrl } from './getThumbnailUrl';
export { normalizeClass } from './normalizeClass';
