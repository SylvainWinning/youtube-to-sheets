import test from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeUrl, generateYouTubeThumbnail, playVideo } from './videoUtils.ts';
import type { VideoData } from '../types/video.ts';
import { LIBRARY_SAVE_EVENT } from './libraryProgress.ts';

const id = 'aBcDeFgHiJk';
const canonical = `https://www.youtube.com/watch?v=${id}`;
for (const link of [canonical, `https://youtu.be/${id}?si=tracking`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/live/${id}`]) {
  test(`lien HTTPS normalisé : ${link}`, () => assert.equal(getYouTubeUrl(link), canonical));
}
for (const link of ['javascript:alert(1)', `http://youtube.com/watch?v=${id}`, `https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/youtube.com/watch?v=${id}`, `https://user@youtube.com/watch?v=${id}`, 'https://youtube.com/playlist?list=123', 'https://youtube.com/watch?v=invalid', `youtube://watch?v=${id}`, 'invalid']) {
  test(`lien refusé : ${link}`, () => assert.equal(getYouTubeUrl(link), null));
}

test('miniature et casse de l’identifiant préservées', () => {
  assert.equal(generateYouTubeThumbnail(canonical), `https://img.youtube.com/vi/${id}/maxresdefault.jpg`);
  assert.equal(generateYouTubeThumbnail('invalid'), '');
});

test('aléatoire : une seule ouverture HTTPS immédiate, sauvegarde avant navigation, sans timer ni détection appareil', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events: unknown[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    dispatchEvent: (event: Event) => { events.push(event.type); },
    open: (...args: string[]) => { events.push(args); return null; },
    setTimeout: () => assert.fail('no retry'),
    location: { set href(_value: string) { assert.fail('no current-tab navigation'); } },
  } });
  try {
    playVideo({ link: canonical } as VideoData);
    assert.deepEqual(events, [LIBRARY_SAVE_EVENT, [canonical, '_blank', 'noopener,noreferrer']]);
    playVideo(null); playVideo({ link: 'javascript:alert(1)' } as VideoData);
    assert.equal(events.length, 2);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window');
  }
});
