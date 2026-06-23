import '@testing-library/jest-dom'

// Polyfill ResizeObserver for recharts in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
