import { SortOptions } from '../../types/sort';
import { SORT_LABELS } from './labels';

export function getOptionValue(opt: SortOptions | null): string {
  if (!opt) return '';
  return `${opt.field}_${opt.direction}`;
}

export function getSelectedLabel(options: SortOptions | null): string {
  const value = getOptionValue(options);
  return SORT_LABELS[value] || SORT_LABELS[getOptionValue(null)];
}