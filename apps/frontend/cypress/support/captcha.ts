// Stubs Cloudflare Turnstile for E2E — no test should depend on Cloudflare's
// real network/UI. `render()` never auto-fires; it stashes the widget's own
// callback on `window.__solveTurnstile` so a test can trigger it explicitly
// (`cy.window().then((win) => win.__solveTurnstile())`), letting tests assert
// the "not yet solved" state before simulating the user solving it.

export function interceptTurnstileScript() {
  cy.intercept('GET', 'https://challenges.cloudflare.com/turnstile/v0/api.js', { body: '' }).as('turnstileScript')
}

export function stubTurnstileWindow(win: Cypress.AUTWindow) {
  ;(win as unknown as { turnstile: unknown }).turnstile = {
    render: (_el: HTMLElement, opts: { callback: (token: string) => void }) => {
      ;(win as unknown as { __solveTurnstile: () => void }).__solveTurnstile = () =>
        opts.callback('e2e-test-captcha-token')
      return 'stub-widget-id'
    },
    remove: () => {},
  }
}

export function solveTurnstile() {
  cy.window().then((win) => (win as unknown as { __solveTurnstile: () => void }).__solveTurnstile())
}
