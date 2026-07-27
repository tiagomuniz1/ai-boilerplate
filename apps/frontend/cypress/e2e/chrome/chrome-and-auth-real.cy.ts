// Cobre o "chrome" global e auth que nunca tiveram teste algum: redirecionamento
// raiz, a própria tela de login do backoffice (só era exercitada via API em
// smoke.cy.ts), toggle de tema, menu do usuário ("Meu perfil" + logout) e o
// drawer mobile do sidebar. Tudo real — stack local, sem mocks.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Chrome global e auth — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects the root path to the backoffice login screen', () => {
    cy.visit('/')
    cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/login')
  })

  it('logs a platform admin in through the real backoffice login screen', () => {
    cy.visit('/backoffice/login')
    cy.get('[data-testid="login-form"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="login-email"]').type(PLATFORM_EMAIL)
    cy.get('[data-testid="login-password"]').type(PLATFORM_PASSWORD)
    cy.get('[data-testid="login-submit"]').click()

    cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/clinics')
    cy.getCookie('access_token').should('exist')
  })

  it('toggles the theme and persists the preference across a reload', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG)
    cy.visit(`/${CLINIC_SLUG}/dashboard`, {
      // getSystemTheme() seeds the store from the OS/browser color-scheme preference, which
      // varies by environment — pin a known starting point instead of guessing it.
      onBeforeLoad(win) {
        win.localStorage.setItem('theme-preference', JSON.stringify({ state: { theme: 'light' }, version: 0 }))
      },
    })
    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="theme-toggle-icon-moon"]', { timeout: 10000 }).should('exist')

    cy.get('[data-testid="theme-toggle"]').click()
    cy.get('[data-testid="theme-toggle-icon-sun"]').should('exist')

    cy.window().should((win) => {
      const after = JSON.parse(win.localStorage.getItem('theme-preference') ?? '{}')
      expect(after?.state?.theme).to.eq('dark')
    })

    cy.reload()
    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="theme-toggle-icon-sun"]').should('exist')
  })

  it('opens the user menu, navigates to "Meu perfil", then logs out for real', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG)
    cy.visit(`/${CLINIC_SLUG}/dashboard`)
    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="header-avatar-button"]').click()
    cy.get('[data-testid="header-user-dropdown"]').should('be.visible')
    cy.get('[data-testid="header-profile-link"]').should('have.attr', 'href').and('match', new RegExp(`^/${CLINIC_SLUG}/users/.+/edit$`))
    cy.get('[data-testid="header-profile-link"]').click()

    cy.location('pathname', { timeout: 10000 }).should('match', new RegExp(`^/${CLINIC_SLUG}/users/.+/edit$`))
    cy.get('[data-testid="user-form"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="user-form-email"]').should('have.value', ADMIN_EMAIL)

    cy.visit(`/${CLINIC_SLUG}/dashboard`)
    cy.get('[data-testid="header-avatar-button"]', { timeout: 10000 }).click()
    cy.get('[data-testid="header-logout-button"]').click()

    cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/login`)
    cy.getCookie(`access_token_${CLINIC_SLUG}`).should('not.exist')
  })

  it('opens and closes the mobile sidebar drawer, auto-closing on navigation', () => {
    cy.viewport('iphone-x')
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG)
    cy.visit(`/${CLINIC_SLUG}/dashboard`)
    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="sidebar"]').should('have.class', '-translate-x-full')

    cy.get('[data-testid="header-mobile-menu"]').click()
    cy.get('[data-testid="sidebar"]').should('have.class', 'translate-x-0')
    // Backdrop only dims the viewport beside the drawer — by design the drawer
    // panel itself (higher z-index) sits on top of it and covers the backdrop's
    // center point once the slide-in transition settles. Assert presence, not
    // "be.visible" (a center-point occlusion check that's inherently racy here).
    cy.get('[data-testid="sidebar-backdrop"]').should('exist')

    cy.get('[data-testid="sidebar-backdrop"]').click({ force: true })
    cy.get('[data-testid="sidebar"]').should('have.class', '-translate-x-full')

    cy.get('[data-testid="header-mobile-menu"]').click()
    cy.get('[data-testid="sidebar-item-patients"]').click({ force: true })

    cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/patients`)
    cy.get('[data-testid="sidebar"]').should('have.class', '-translate-x-full')
  })

  it('shows an error in the user menu when logout fails (mocked)', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG)
    cy.visit(`/${CLINIC_SLUG}/dashboard`)
    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible')

    cy.intercept('POST', `${Cypress.env('API_URL')}/auth/logout`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('logoutError')

    cy.get('[data-testid="header-avatar-button"]').click()
    cy.get('[data-testid="header-logout-button"]').click()
    cy.wait('@logoutError')
    cy.get('[data-testid="header-logout-error"]').should('be.visible')
    cy.get('[data-testid="dashboard"]').should('be.visible')
  })
})
