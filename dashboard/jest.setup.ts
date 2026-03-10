import '@testing-library/jest-dom'

// Required for createRoot + act() to work correctly in jsdom
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Mock ResizeObserver to prevent act() deprecation warnings
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as typeof ResizeObserver
