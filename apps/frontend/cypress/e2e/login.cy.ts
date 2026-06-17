import { CLINIC_SLUG, expectClinicPath, stubClinicLayout } from '../support/clinic'

describe('Login', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit(`/${CLINIC_SLUG}/login`)
  })

  it('shows email validation error for invalid format', () => {
    cy.get('[data-testid="login-email"]').type('not-an-email')
    cy.get('[data-testid="login-submit"]').click()
    cy.contains('Email inválido').should('be.visible')
  })

  it('shows password validation error for short password', () => {
    cy.get('[data-testid="login-email"]').type('user@example.com')
    cy.get('[data-testid="login-password"]').type('short')
    cy.get('[data-testid="login-submit"]').click()
    cy.contains('Mínimo 8 caracteres').should('be.visible')
  })

  it('shows "Email ou senha inválidos" on 401 response', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { status: 401, title: 'Unauthorized', detail: 'Invalid credentials' },
    }).as('loginRequest')

    cy.get('[data-testid="login-email"]').type('wrong@example.com')
    cy.get('[data-testid="login-password"]').type('wrongpassword')
    cy.get('[data-testid="login-submit"]').click()

    cy.wait('@loginRequest')
    cy.get('[data-testid="login-error"]').should('contain', 'Email ou senha inválidos')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', '**/auth/login', (req) => {
      req.reply({ delay: 1000, statusCode: 200, body: { id: '1', fullName: 'Alice', email: 'alice@example.com' } })
    }).as('loginRequest')

    cy.get('[data-testid="login-email"]').type('alice@example.com')
    cy.get('[data-testid="login-password"]').type('password123')
    cy.get('[data-testid="login-submit"]').click()

    cy.get('[data-testid="login-submit"]').should('be.disabled')
  })

  it('redirects to clinic dashboard on successful login', () => {
    cy.intercept('POST', '**/auth/login', (req) => {
      req.reply({
        statusCode: 200,
        body: { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com', role: 'admin', clinicId: 'clinic-1' },
        headers: {
          // Login dentro da clínica cria o cookie sufixado pelo slug.
          'set-cookie': `access_token_${CLINIC_SLUG}=mock-token; Path=/; HttpOnly; SameSite=Strict`,
        },
      })
    }).as('loginRequest')
    // A dashboard carrega o layout autenticado (auth/me, clinic, theme).
    stubClinicLayout({ fullName: 'Alice Costa', email: 'alice@example.com' } as never)

    cy.get('[data-testid="login-email"]').type('alice@example.com')
    cy.get('[data-testid="login-password"]').type('password123')
    cy.get('[data-testid="login-submit"]').click()

    cy.wait('@loginRequest')
    expectClinicPath('/dashboard')
  })

  it('redirects already-authenticated user to clinic dashboard', () => {
    stubClinicLayout()
    cy.setCookie(`access_token_${CLINIC_SLUG}`, 'valid-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      domain: 'localhost',
    })
    cy.visit(`/${CLINIC_SLUG}/login`)
    expectClinicPath('/dashboard')
  })
})
