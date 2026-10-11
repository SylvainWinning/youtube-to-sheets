import type { SheetTab } from '../types/sheets.ts';

/**
 * Tabs used to group videos by duration.
 * The first button (“Toutes durées”) is handled outside of this array.
 * Here we only define discrete ranges.
 */
export const SHEET_TABS: SheetTab[] = [
  {
    name: '0-5 min',
    range: "'0-5min'!A:Z",
    durationRange: { min: 0, max: 5 },
  },
  {
    name: '5-10 min',
    range: "'5-10min'!A:Z",
    durationRange: { min: 5, max: 10 },
  },
  {
    name: '10-20 min',
    range: "'10-20min'!A:Z",
    durationRange: { min: 10, max: 20 },
  },
  {
    name: '20-30 min',
    range: "'20-30min'!A:Z",
    durationRange: { min: 20, max: 30 },
  },
  {
    name: '30-40 min',
    range: "'30-40min'!A:Z",
    durationRange: { min: 30, max: 40 },
  },
  {
    name: '40-50 min',
    range: "'40-50min'!A:Z",
    durationRange: { min: 40, max: 50 },
  },
  {
    name: '50-60 min',
    range: "'50-60min'!A:Z",
    durationRange: { min: 50, max: 60 },
  },
  {
    name: '60+ min',
    range: "'60Plusmin'!A:Z",
    durationRange: { min: 60, max: null },
  },
];
