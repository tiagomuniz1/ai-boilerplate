import '@testing-library/jest-dom'
import { installZodErrorMap } from '@/lib/zod-error-map'

// The app installs this in app/providers.tsx, which renderWithProviders does not
// go through. Without it here, form specs would assert the English defaults the
// map exists to replace — and pass while the app shows something else.
installZodErrorMap()

// Polyfill ResizeObserver for recharts in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
