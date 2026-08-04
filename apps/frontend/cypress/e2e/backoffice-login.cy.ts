import { expectBackofficePath } from '../support/clinic'
import { interceptTurnstileScript, solveTurnstile, stubTurnstileWindow } from '../support/captcha'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@pulso.center',
  role: 'platform_admin',
  clinicId: null,
}

function stubBackofficeLayout() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: mockPlatformAdmin,
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/themes*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 50 },
  })
}

describe('Backoffice Login', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/backoffice/login')
  })

  it('shows email validation error for invalid format', () => {
    cy.get('[data-testid="login-email"]').type('not-an-email')
    cy.get('[data-testid="login-submit"]').click()
    cy.contains('Email inválido').should('be.visible')
  })

  it('shows password validation error for short password', () => {
    cy.get('[data-testid="login-email"]').type('platform@pulso.center')
    cy.get('[data-testid="login-password"]').type('short')
    cy.get('[data-testid="login-submit"]').click()
    cy.contains('Mínimo 8 caracteres').should('be.visible')
  })

  it('shows "Email ou senha inválidos" on 401 response', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { status: 401, title: 'Unauthorized', detail: 'Invalid credentials' },
    }).as('loginRequest')

    cy.get('[data-testid="login-email"]').type('wrong@pulso.center')
    cy.get('[data-testid="login-password"]').type('wrongpassword')
    cy.get('[data-testid="login-submit"]').click()

    cy.wait('@loginRequest')
    cy.get('[data-testid="login-error"]').should('contain', 'Email ou senha inválidos')
  })

  it('redirects to /backoffice/clinics on successful login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: mockPlatformAdmin,
      headers: {
        'set-cookie': 'access_token=mock-token; Path=/; HttpOnly; SameSite=Strict',
      },
    }).as('loginRequest')
    stubBackofficeLayout()

    cy.get('[data-testid="login-email"]').type('platform@pulso.center')
    cy.get('[data-testid="login-password"]').type('password123')
    cy.get('[data-testid="login-submit"]').click()

    cy.wait('@loginRequest')
    expectBackofficePath('/clinics')
  })

  it('redirects already-authenticated user to /backoffice/clinics', () => {
    stubBackofficeLayout()
    cy.setCookie('access_token', 'valid-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      domain: 'localhost',
    })
    cy.visit('/backoffice/login')
    expectBackofficePath('/clinics')
  })

  describe('captcha (3rd failed attempt onward)', () => {
    it('does not show the captcha widget before the 2nd failed attempt', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 401,
        body: { status: 401, detail: 'Invalid credentials' },
      }).as('loginRequest')

      cy.get('[data-testid="login-captcha"]').should('not.exist')
      cy.get('[data-testid="login-email"]').type('wrong@pulso.center')
      cy.get('[data-testid="login-password"]').type('wrongpassword')
      cy.get('[data-testid="login-submit"]').click()

      cy.wait('@loginRequest')
      cy.get('[data-testid="login-captcha"]').should('not.exist')
    })

    it('shows the captcha widget once the 2nd failed attempt crosses the threshold', () => {
      interceptTurnstileScript()
      let attempt = 0
      cy.intercept('POST', '**/auth/login', (req) => {
        attempt++
        req.reply({
          statusCode: 401,
          body: {
            status: 401,
            detail: 'Invalid credentials',
            ...(attempt >= 2 ? { requiresCaptcha: true } : {}),
          },
        })
      }).as('loginRequest')

      cy.visit('/backoffice/login', { onBeforeLoad: stubTurnstileWindow })
      cy.get('[data-testid="login-email"]').type('wrong@pulso.center')
      cy.get('[data-testid="login-password"]').type('wrongpassword')
      cy.get('[data-testid="login-submit"]').click()
      cy.wait('@loginRequest')

      cy.get('[data-testid="login-submit"]').click()
      cy.wait('@loginRequest')
      cy.get('[data-testid="login-captcha"]').should('exist')
    })

    it('succeeds on the 3rd attempt once the captcha is solved and credentials are correct', () => {
      interceptTurnstileScript()
      let attempt = 0
      cy.intercept('POST', '**/auth/login', (req) => {
        attempt++
        if (attempt <= 2) {
          req.reply({
            statusCode: 401,
            body: { status: 401, detail: 'Invalid credentials', ...(attempt === 2 ? { requiresCaptcha: true } : {}) },
          })
        } else {
          req.reply({
            statusCode: 200,
            body: mockPlatformAdmin,
            headers: { 'set-cookie': 'access_token=mock-token; Path=/; HttpOnly; SameSite=Strict' },
          })
        }
      }).as('loginRequest')
      stubBackofficeLayout()

      cy.visit('/backoffice/login', { onBeforeLoad: stubTurnstileWindow })
      cy.get('[data-testid="login-email"]').type('platform@pulso.center')
      cy.get('[data-testid="login-password"]').type('wrongpassword')
      cy.get('[data-testid="login-submit"]').click()
      cy.wait('@loginRequest')
      cy.get('[data-testid="login-submit"]').click()
      cy.wait('@loginRequest')

      cy.get('[data-testid="login-captcha"]').should('exist')
      cy.get('[data-testid="login-submit"]').should('be.disabled')

      solveTurnstile()
      cy.get('[data-testid="login-password"]').clear()
      cy.get('[data-testid="login-password"]').type('password123')
      cy.get('[data-testid="login-submit"]').click()
      cy.wait('@loginRequest')

      expectBackofficePath('/clinics')
    })
  })
})

export {}
