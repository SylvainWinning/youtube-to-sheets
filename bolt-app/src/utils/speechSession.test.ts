import test from 'node:test';
import assert from 'node:assert/strict';
import { startSpeechSession } from './speechSession.ts';
import type { VoiceState } from './speechSession.ts';
import type { BrowserSpeechRecognition } from '../types/speech.ts';

class Recognition implements BrowserSpeechRecognition {
  static current: Recognition;
  lang = ''; continuous = false; interimResults = false;
  onstart: BrowserSpeechRecognition['onstart'] = null;
  onresult: BrowserSpeechRecognition['onresult'] = null;
  onerror: BrowserSpeechRecognition['onerror'] = null;
  onend: BrowserSpeechRecognition['onend'] = null;
  stopped = 0;
  constructor() { Recognition.current = this; }
  start() {}
  stop() { this.stopped++; this.onend?.(); }
}

test('démarrage, écoute, résultat et fin ne perdent pas le résultat', () => {
  const states: VoiceState[] = []; const texts: string[] = [];
  startSpeechSession(Recognition, state => states.push(state), text => texts.push(text));
  const r = Recognition.current;
  assert.match(states.at(-1)!.message, /Démarrage/);
  r.onstart?.(); assert.match(states.at(-1)!.message, /Écoute/);
  const lateEnd = r.onend;
  r.onresult?.({ results: [[{ transcript: '  OpenAI  ' }]] }); lateEnd?.();
  assert.deepEqual(texts, ['OpenAI']);
  assert.match(states.at(-1)!.message, /terminée/);
  assert.equal(states.at(-1)!.active, false);
});

for (const [error, expected] of [['not-allowed', /refusé/], ['audio-capture', /micro accessible/], ['network', /réseau/], ['no-speech', /Aucune parole/], ['unknown', /échoué/]] as const) {
  test(`erreur ${error} visible et persistante après onend`, () => {
    const states: VoiceState[] = [];
    startSpeechSession(Recognition, state => states.push(state), () => assert.fail('no result'));
    const end = Recognition.current.onend;
    Recognition.current.onerror?.({ error }); end?.();
    assert.match(states.at(-1)!.message, expected);
    assert.equal(states.at(-1)!.active, false);
  });
}

test('timeout borné et nettoyage sans callback tardif', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const states: VoiceState[] = [];
  startSpeechSession(Recognition, state => states.push(state), () => assert.fail());
  context.mock.timers.tick(10_000);
  assert.match(states.at(-1)!.message, /Délai/);
  const count = states.length;
  const cancel = startSpeechSession(Recognition, state => states.push(state), () => assert.fail());
  const late = Recognition.current.onresult;
  cancel(); late?.({ results: [[{ transcript: 'late' }]] }); context.mock.timers.tick(10_000);
  assert.equal(states.length, count + 1);
});

test('un démarrage qui lève une exception reste récupérable', () => {
  class Broken extends Recognition { start() { throw new Error('blocked'); } }
  const states: VoiceState[] = [];
  startSpeechSession(Broken, state => states.push(state), () => assert.fail());
  assert.equal(states.at(-1)!.active, false);
  assert.match(states.at(-1)!.message, /Impossible de démarrer/);
});
