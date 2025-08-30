import { SortOptions } from '../../types/sort';
import { getOptionValue } from './utils';

export const SORT_LABELS: Record<string, string> = {
  [getOptionValue(null)]: 'Sans tri',
  [getOptionValue({ field: 'publishedAt', direction: 'desc' })]: 'Plus récentes',
  [getOptionValue({ field: 'publishedAt', direction: 'asc' })]: 'Plus anciennes',
};
