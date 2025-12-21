import test from 'node:test';
import assert from 'node:assert/strict';
import { playVideo } from './videoUtils.ts';

type MockEnvOptions = {
  userAgent: string;
  matchMediaMatches?: boolean;
  platform?: string;
  uaPlatform?: string;
  maxTouchPoints?: number;
};

type MockEnv = {
  location: { href: string };
  timeoutScheduled: () => boolean;
  triggerFallback: () => void;
  restore: () => void;
};

function createMockEnvironment(options: MockEnvOptions): MockEnv {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;

  const listeners: Record<string, Array<() => void>> = {
    visibilitychange: [],
    pagehide: [],
    blur: []
  };

  const location = { href: '' };
  const navigatorMock = { userAgent: options.userAgent } as Navigator;

  if (options.platform) {
    (navigatorMock as any).platform = options.platform;
  }

  if (options.uaPlatform) {
    (navigatorMock as any).userAgentData = { platform: options.uaPlatform };
  }

  if (typeof options.maxTouchPoints === 'number') {
    (navigatorMock as any).maxTouchPoints = options.maxTouchPoints;
  }

  let scheduledCallback: (() => void) | undefined;
  let hasScheduledTimeout = false;

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
      scheduledCallback = fn;
      return 1;
    },
    clearTimeout: () => {
      scheduledCallback = undefined;
    }
  };

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
    timeoutScheduled: () => hasScheduledTimeout,
    triggerFallback: () => {
      scheduledCallback?.();
    },
    restore: () => {
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

test('playVideo redirige directement vers le web sur visionOS sans fallback différé', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (VisionOS) AppleWebKit/000.0 Safari/000.0'
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=vision123' } as any);

  assert.equal(env.location.href, 'https://www.youtube.com/watch?v=vision123');
  assert.equal(env.timeoutScheduled(), false);

  env.restore();
});

test('playVideo privilégie l’URL web sur Safari macOS tactile (cas visionOS)', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    platform: 'MacIntel',
    uaPlatform: 'macOS',
    maxTouchPoints: 5
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=visionMac' } as any);

  assert.equal(env.location.href, 'https://www.youtube.com/watch?v=visionMac');
  assert.equal(env.timeoutScheduled(), false);

  env.restore();
});

test('playVideo conserve le fallback web hors visionOS', () => {
  const env = createMockEnvironment({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/000.0 Safari/000.0',
    matchMediaMatches: false
  });

  playVideo({ link: 'https://www.youtube.com/watch?v=mobile456' } as any);

  assert.equal(env.location.href, 'youtube://mobile456');
  assert.equal(env.timeoutScheduled(), true);

  env.triggerFallback();
  assert.equal(env.location.href, 'https://www.youtube.com/watch?v=mobile456');

  env.restore();
});
