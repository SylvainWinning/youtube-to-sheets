import test from 'node:test';
import assert from 'node:assert/strict';
import { filterByDurationSelection, getDurationLabel } from './durationSelection.ts';
import type { VideoData } from '../types/video.ts';

test('moins de vingt minutes réunit les plages courtes et respecte la borne à la seconde', () => {
  const videos = ['00:03:00', '00:08:00', '00:15:00', '00:19:59', '00:20:00', '00:20:01', 'Inconnue']
    .map(duration => ({ duration }) as VideoData);
  assert.deepEqual(filterByDurationSelection(videos, -20), videos.slice(0, 4));
  assert.deepEqual(filterByDurationSelection(videos, 2), videos.slice(2, 4));
  assert.equal(filterByDurationSelection(videos, -1), videos);
  assert.equal(getDurationLabel(-20), 'Moins de 20 min');
});
