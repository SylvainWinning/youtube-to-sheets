import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from './AudioManager.ts';
import { SOUND_KEY } from '../preferences.ts';

function setup(context: import('node:test').TestContext, initial = 'on') {
  const values = new Map([[SOUND_KEY, initial]]);
  let storage: ((event: { key: string | null }) => void) | undefined;
  const players: FakeAudio[] = [];
  class FakeAudio {
    preload = ''; volume = 0; src = ''; muted = false; currentTime = 0;
    plays = 0; pauses = 0;
    constructor() { players.push(this); }
    play() { this.plays++; return Promise.resolve(); }
    pause() { this.pauses++; }
  }
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const audioDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) },
    addEventListener: (_: string, callback: typeof storage) => { storage = callback; },
  } });
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });
  context.after(() => {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
    if (audioDescriptor) Object.defineProperty(globalThis, 'Audio', audioDescriptor); else Reflect.deleteProperty(globalThis, 'Audio');
  });
  return { manager: new AudioManager(), values, players, storage: (key: string | null) => storage?.({ key }) };
}

test('aucun lecteur au chargement ; seuls les sons demandés sont chargés et réutilisés', async context => {
  const { manager, players } = setup(context);
  assert.equal(players.length, 0);
  await manager.play('CLICK'); await manager.play('CLICK');
  assert.equal(players.length, 1); assert.equal(players[0].plays, 2);
  assert.equal(players[0].preload, 'none');
});

test('couper le son arrête la lecture et persiste le choix pour le prochain chargement', async context => {
  const { manager, players, values } = setup(context);
  await manager.play('CLICK');
  manager.toggle();
  assert.equal(values.get(SOUND_KEY), 'off');
  assert.equal(players[0].muted, true); assert.equal(players[0].pauses, 1);
  await manager.play('CLICK'); await manager.play('HOVER');
  assert.equal(players.length, 1); assert.equal(players[0].plays, 1);
  const next = new AudioManager(); assert.equal(next.getSnapshot(), false);
  await next.play('CLICK'); assert.equal(players.length, 1);
});

test('synchronisation entre onglets et réactivation sans préchargement', async context => {
  const { manager, players, values, storage } = setup(context, 'off');
  let changes = 0; manager.subscribe(() => changes++);
  manager.toggle(); assert.equal(players.length, 0);
  await manager.play('CLICK');
  values.set(SOUND_KEY, 'off'); storage(SOUND_KEY);
  assert.equal(manager.getSnapshot(), false); assert.equal(players[0].muted, true);
  await manager.play('CLICK'); assert.equal(players[0].plays, 1);
  values.delete(SOUND_KEY); storage(null); assert.equal(manager.getSnapshot(), true);
  await manager.play('CLICK'); assert.equal(players[0].muted, false);
  assert.equal(changes, 3);
});

test('un rejet de lecture ne remonte pas et couper pendant une lecture en attente reste muet', async context => {
  const { manager, players } = setup(context);
  await manager.play('CLICK');
  let finish: (() => void) | undefined;
  players[0].play = () => new Promise<void>(resolve => { finish = resolve; });
  const pending = manager.play('CLICK'); manager.toggle(); finish?.(); await pending;
  assert.equal(players[0].muted, true);
  manager.toggle(); players[0].play = () => Promise.reject(new Error('blocked'));
  await assert.doesNotReject(manager.play('CLICK'));
});
