import { SORT_OPTIONS, type SortOptions } from '../../types/sort';
import { SORT_LABELS } from './labels';

export function getOptionValue(opt: SortOptions | null): string {
  if (!opt) return '';
  return `${opt.field}_${opt.direction}`;
}

export function getSelectedLabel(options: SortOptions | null): string {
  const value = getOptionValue(options);
  return SORT_LABELS[value] || SORT_LABELS[getOptionValue(null)];
}

export function getSortMenu(options: SortOptions | null, searching: boolean, playlistSelected: boolean) {
  const { PUBLISHED_DESC, PUBLISHED_ASC } = SORT_OPTIONS;
  const contextual = searching || playlistSelected;
  return {
    selectedValue: getOptionValue(options ?? (contextual ? null : PUBLISHED_DESC)),
    choices: [
      ...(contextual ? [{ options: null, label: searching ? 'Pertinence' : getSelectedLabel(null) }] : []),
      { options: PUBLISHED_DESC, label: contextual ? getSelectedLabel(PUBLISHED_DESC) : 'Plus récentes' },
      { options: PUBLISHED_ASC, label: getSelectedLabel(PUBLISHED_ASC) },
    ],
  };
}
