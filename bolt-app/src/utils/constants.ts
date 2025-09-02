import { SheetTab } from '../types/sheets';

/**
 * Tabs used to group videos by duration.
 * The first button (“Toutes durées”) is handled outside of this array.
 * Here we only define discrete ranges and an “Inconnue” category.
 */
export const SHEET_TABS: SheetTab[] = [
  {
    name: '0-5 min',
    range: 'A:Z',
    durationRange: { min: 0, max: 5 },
  },
  {
    name: '5-10 min',
    range: 'A:Z',
    durationRange: { min: 5, max: 10 },
  },
  {
    name: '10-20 min',
    range: 'A:Z',
    durationRange: { min: 10, max: 20 },
  },
  {
    name: '20-30 min',
    range: 'A:Z',
    durationRange: { min: 20, max: 30 },
  },
  {
    name: '30-40 min',
    range: 'A:Z',
    durationRange: { min: 30, max: 40 },
  },
  {
    name: '40-50 min',
    range: 'A:Z',
    durationRange: { min: 40, max: 50 },
  },
  {
    name: '50-60 min',
    range: 'A:Z',
    durationRange: { min: 50, max: 60 },
  },
  {
    name: '60+ min',
    range: 'A:Z',
    durationRange: { min: 60, max: null },
  },
  {
    name: 'Inconnue',
    range: 'A:Z',
    durationRange: { min: null, max: null },
  },
];
