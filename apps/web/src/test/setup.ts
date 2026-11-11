import '@testing-library/jest-dom/vitest';

/**
 * jsdom n'implémente ni matchMedia ni ResizeObserver, dont dépendent Radix et
 * Recharts. On fournit des doublures minimales plutôt que de renoncer à tester
 * les composants qui les utilisent.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;
