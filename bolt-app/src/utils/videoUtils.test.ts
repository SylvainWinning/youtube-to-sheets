import test from 'node:test';
import assert from 'node:assert/strict';
import { playVideo } from './videoUtils.ts';

type MockEnvOptions = {
  userAgent: string;
  matchMediaMatches?: boolean;
  vendor?: string;
  supportsWindowOpen?: boolean;
  windowOpenReturnsNull?: boolean;
  platform?: string;
  uaPlatform?: string;
  maxTouchPoints?: number;
};

type MockEnv = {
  location: { href: string };
  openedWindows: Array<{ url: string; target: string; features?: string }>;
  timeoutScheduled: () => boolean;
  triggerNextTimeout: () => void;
  triggerAllTimeouts: () => void;
  setNow: (value: number) => void;
  restore: () => void;
};

function createMockEnvironment(options: MockEnvOptions): MockEnv {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  const originalDateNow = Date.now;

  const listeners: Record<string, Array<() => void>> = {
    visibilitychange: [],
    pagehide: [],
    blur: []
  };

  const location = { href: '' };
  const navigatorMock = { userAgent: options.userAgent } as Navigator;

  if (options.vendor) {
    (navigatorMock as any).vendor = options.vendor;
  }

  if (options.platform) {
    (navigatorMock as any).platform = options.platform;
  }

  if (options.uaPlatform) {
    (navigatorMock as any).userAgentData = { platform: options.uaPlatform };
  }

  if (typeof options.maxTouchPoints === 'number') {
    (navigatorMock as any).maxTouchPoints = options.maxTouchPoints;
  }

  const scheduledCallbacks: Array<{ id: number; fn: () => void; active: boolean }> = [];
  const openedWindows: Array<{ url: string; target: string; features?: string }> = [];
  let hasScheduledTimeout = false;
  let nowValue = 0;
  let nextTimeoutId = 1;

  Date.now = () => nowValue;

  const windowMock: any = {
    location,
    navigator: navigatorMock,
    matchMedia: () => ({ matches: options.matchMediaMatches ?? false }),
    addEventListener: (event: keyof typeof listeners, handler: () => void) => {
      listeners[event]?.push(handler);
    },
    removeEventListener: (event: keyof typeof listeners, handler: () => void) => {
      const handlers = listeners[event];
      const index = handlers?.indexOf(handler);
      if (index !== undefined && index >= 0) {
        handlers.splice(index, 1);
      }
    },
    setTimeout: (fn: () => void) => {
      hasScheduledTimeout = true;
      const id = nextTimeoutId++;
      scheduledCallbacks.push({ id, fn, active: true });
      return id;
    },
    clearTimeout: (timeoutId: number) => {
      const scheduledCallback = scheduledCallbacks.find(callback => callback.id === timeoutId);
      if (scheduledCallback) {
        scheduledCallback.active = false;
      }
    }
  };

  if (options.supportsWindowOpen) {
    windowMock.open = (url: string, target: string, features?: string) => {
      openedWindows.push({ url, target, features });
      return options.windowOpenReturnsNull ? null : { opener: null };
    };
  }

  const documentMock: any = {
    visibilityState: 'visible',
    addEventListener: (event: keyof typeof listeners, handler: () => void) => {
      listeners[event]?.push(handler);
    },
    removeEventListener: (event: keyof typeof listeners, handler: () => void) => {
      const handlers = listeners[event];
      const index = handlers?.indexOf(handler);
      if (index !== undefined && index >= 0) {
        handlers.splice(index, 1);
      }
    }
  };
  const hadWindow = 'window' in globalThis;
  const hadDocument = 'document' in globalThis;
  const hadNavigator = 'navigator' in globalThis;

  Object.defineProperty(globalThis, 'window', {
    value: windowMock as unknown as Window & typeof globalThis,
    writable: true,
    configurable: true
  });

  Object.defineProperty(globalThis, 'document', {
    value: documentMock as unknown as Document,
    writable: true,
    configurable: true
  });

  Object.defineProperty(globalThis, 'navigator', {
    value: navigatorMock as Navigator,
    writable: true,
    configurable: true
  });

  return {
    location,
    openedWindows,
    timeoutScheduled: () => hasScheduledTimeout,
    triggerNextTimeout: () => {
      const callback = scheduledCallbacks.shift();
      if (callback?.active) {
        callback.fn();
      }
    },
    triggerAllTimeouts: () => {
      while (scheduledCallbacks.length > 0) {
        const callback = scheduledCallbacks.shift();
        if (callback?.active) {
          callback.fn();
        }
      }
    },
    setNow: (value: number) => {
      nowValue = value;
    },
    restore: () => {
      Date.now = originalDateNow;

      if (hadWindow) {
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
          configurable: true
        });
      } else {
        delete (globalThis as any).window;
      }

      if (hadDocument) {
        Object.defineProperty(globalThis, 'document', {
          value: originalDocument,
          writable: true,
          configurable: true
        });
      } else {
        delete (globalThis as any).document;
      }

      if (hadNavigator) {
        Object.defineProperty(globalThis, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true
        });
      } else {
        delete (globalThis as any).navigator;
      }
    }
  };
}

test('playVideo tente d’ouvrir l’app sur visionOS avec fallback différé', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (VisionOS) AppleWebKit/000.0 Safari/000.0',
    maxTouchPoints: 5
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=vision123' } as any);

  assert.equal(env.location.href, 'youtube://watch?v=vision123');
  assert.equal(env.timeoutScheduled(), true);

  env.triggerAllTimeouts();
  assert.equal(env.location.href, 'https://www.youtube.com/watch?v=vision123');

  env.restore();
});

test('playVideo tente d’ouvrir l’app sur Safari macOS tactile (cas visionOS)', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    platform: 'MacIntel',
    uaPlatform: 'macOS',
    maxTouchPoints: 5
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=visionMac' } as any);

  assert.equal(env.location.href, 'youtube://watch?v=visionMac');
  assert.equal(env.timeoutScheduled(), true);

  env.triggerAllTimeouts();
  assert.equal(env.location.href, 'https://www.youtube.com/watch?v=visionMac');

  env.restore();
});

test('playVideo conserve le fallback web hors visionOS', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/000.0 Safari/000.0',
    matchMediaMatches: false
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=mobile456' } as any);

  assert.equal(env.location.href, 'youtube://www.youtube.com/watch?v=mobile456');
  assert.equal(env.timeoutScheduled(), true);

  env.triggerAllTimeouts();
  assert.equal(env.location.href, 'https://www.youtube.com/watch?v=mobile456');

  env.restore();
});

test('playVideo ouvre YouTube web dans un nouvel onglet sur Safari Mac', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    vendor: 'Apple Computer, Inc.',
    supportsWindowOpen: true,
    platform: 'MacIntel',
    uaPlatform: 'macOS',
    maxTouchPoints: 0
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=macTab123' } as any);

  assert.equal(env.location.href, '');
  assert.deepEqual(env.openedWindows, [
    {
      url: 'https://www.youtube.com/watch?v=macTab123',
      target: '_blank',
      features: 'noopener,noreferrer'
    }
  ]);
  assert.equal(env.timeoutScheduled(), false);

  env.restore();
});

test('playVideo ouvre YouTube web dans un nouvel onglet sur Atlas Mac', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    vendor: 'Google Inc.',
    supportsWindowOpen: true,
    platform: 'MacIntel',
    uaPlatform: 'macOS',
    maxTouchPoints: 0
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=atlasTab123' } as any);

  assert.equal(env.location.href, '');
  assert.deepEqual(env.openedWindows, [
    {
      url: 'https://www.youtube.com/watch?v=atlasTab123',
      target: '_blank',
      features: 'noopener,noreferrer'
    }
  ]);
  assert.equal(env.timeoutScheduled(), false);

  env.restore();
});

test('playVideo ne navigue pas l’onglet courant quand window.open renvoie null sur Mac', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    vendor: 'Google Inc.',
    supportsWindowOpen: true,
    windowOpenReturnsNull: true,
    platform: 'MacIntel',
    uaPlatform: 'macOS',
    maxTouchPoints: 0
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=nullOpen123' } as any);

  assert.equal(env.location.href, '');
  assert.deepEqual(env.openedWindows, [
    {
      url: 'https://www.youtube.com/watch?v=nullOpen123',
      target: '_blank',
      features: 'noopener,noreferrer'
    }
  ]);
  assert.equal(env.timeoutScheduled(), false);

  env.restore();
});

test('playVideo ignore un second clic rapproché vers la même vidéo', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (VisionOS) AppleWebKit/000.0 Safari/000.0',
    maxTouchPoints: 5
  });

  env.setNow(1000);
  playVideo({ link: 'https://www.youtube.com/watch?v=vision123' } as any);
  assert.equal(env.location.href, 'youtube://watch?v=vision123');

  env.location.href = '';
  env.setNow(1500);
  playVideo({ link: 'https://www.youtube.com/watch?v=vision123' } as any);

  assert.equal(env.location.href, '');

  env.restore();
});

test('playVideo respecte l’ordre des schémas visionOS avant le fallback web', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (VisionOS) AppleWebKit/000.0 Safari/000.0',
    maxTouchPoints: 5
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=ordered001' } as any);
  assert.equal(env.location.href, 'youtube://watch?v=ordered001');

  env.triggerNextTimeout();
  assert.equal(env.location.href, 'vnd.youtube://watch?v=ordered001');

  env.restore();
});
