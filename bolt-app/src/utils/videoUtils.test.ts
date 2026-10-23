import test from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeUrl, saveVideoNavigation } from './videoUtils.ts';
import { LIBRARY_SAVE_EVENT } from './libraryProgress.ts';

const id = 'aBcDeFgHiJk';
const canonical = `https://www.youtube.com/watch?v=${id}`;
for (const link of [canonical, `https://youtu.be/${id}?si=tracking`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/live/${id}`]) {
  test(`lien HTTPS normalisé : ${link}`, () => assert.equal(getYouTubeUrl(link), canonical));
}
for (const link of ['javascript:alert(1)', `http://youtube.com/watch?v=${id}`, `https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/youtube.com/watch?v=${id}`, `https://user@youtube.com/watch?v=${id}`, 'https://youtube.com/playlist?list=123', 'https://youtube.com/watch?v=invalid', `youtube://watch?v=${id}`, 'invalid']) {
  test(`lien refusé : ${link}`, () => assert.equal(getYouTubeUrl(link), null));
}

test('la navigation explicite sauvegarde la position de lecture', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    dispatchEvent: (event: Event) => { events.push(event.type); },
  } });
  try {
    saveVideoNavigation();
    assert.deepEqual(events, [LIBRARY_SAVE_EVENT]);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window');
  }
});
