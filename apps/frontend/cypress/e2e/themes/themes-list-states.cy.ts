// Mocked — estados de loading/erro da listagem de temas e da edição nunca
// tinham teste algum (só o happy path e a validação reais).

import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@pulso.center',
  role: 'platform_admin',
  clinicId: null,
}

const THEME_ID = '40000000-0000-4000-8000-000000000001'

const mockTheme = {
  id: THEME_ID,
  name: 'Tema Mock',
  accentColor: '#2563eb',
  accentSoftColor: '#dbeafe',
  bgColor: null,
  bgDarkColor: null,
  borderRadius: 'default',
  isDefault: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('Themes — list/edit states (mocked)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows a loading state, then an error state on the list', () => {
    // /themes/page.tsx's own useThemes() call hits the same /themes* pattern
    // visitBackoffice defaults for the clinic-form theme selector — pass the
    // slow response through so this page's own list query reflects it.
    visitBackoffice('/themes', mockPlatformAdmin, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
      delay: 500,
    })
    cy.get('[data-testid="themes-loading"]').should('be.visible')
    cy.get('[data-testid="themes-loading"]', { timeout: 10000 }).should('not.exist')

    cy.intercept('GET', `${Cypress.env('API_URL')}/themes*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getThemesError')
    cy.reload()
    cy.wait('@getThemesError')
    cy.get('[data-testid="themes-load-error"]').should('be.visible')
  })

  it('shows a delete-error alert when deleting a theme fails', () => {
    visitBackoffice('/themes', mockPlatformAdmin, {
      statusCode: 200,
      body: { data: [mockTheme], total: 1, page: 1, limit: 20 },
    })
    cy.get(`[data-testid="theme-row-${THEME_ID}"]`).should('be.visible')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/themes/${THEME_ID}`, {
      statusCode: 409,
      body: { type: 'https://httpstatuses.com/409', title: 'CONFLICT', status: 409, detail: 'Theme is in use by a clinic' },
    }).as('deleteThemeError')

    cy.get(`[data-testid="theme-delete-${THEME_ID}"]`).click()
    cy.wait('@deleteThemeError')
    cy.get('[data-testid="themes-delete-error"]').should('be.visible')
  })

  it('shows a loading state on the edit page, and the back button works', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/themes/${THEME_ID}`, {
      statusCode: 200,
      body: mockTheme,
      delay: 500,
    }).as('getThemeSlow')

    visitBackoffice(`/themes/${THEME_ID}/edit`, mockPlatformAdmin)
    cy.get('[data-testid="edit-theme-loading"]').should('be.visible')
    cy.wait('@getThemeSlow')
    cy.get('[data-testid="edit-theme-loading"]').should('not.exist')
    cy.get('[data-testid="edit-theme-back-button"]').should('be.visible').click()
    expectBackofficePath('/themes')
  })

  it('shows an error state on the edit page when the theme fails to load', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/themes/${THEME_ID}`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getThemeError')

    visitBackoffice(`/themes/${THEME_ID}/edit`, mockPlatformAdmin)
    cy.wait('@getThemeError')
    cy.get('[data-testid="edit-theme-load-error"]').should('be.visible')
  })
})
