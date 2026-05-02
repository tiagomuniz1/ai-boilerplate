describe('Login', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.visit('/login')
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

  it('redirects to /dashboard on successful login', () => {
    cy.intercept('POST', '**/auth/login', (req) => {
      req.reply({
        statusCode: 200,
        body: { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' },
        headers: {
          'set-cookie': 'access_token=mock-token; Path=/; HttpOnly; SameSite=Strict',
        },
      })
    }).as('loginRequest')

    cy.get('[data-testid="login-email"]').type('alice@example.com')
    cy.get('[data-testid="login-password"]').type('password123')
    cy.get('[data-testid="login-submit"]').click()

    cy.wait('@loginRequest')
    cy.url().should('include', '/dashboard')
  })

  it('redirects authenticated user directly to /dashboard', () => {
    cy.setCookie('access_token', 'valid-token')
    cy.visit('/login')
    cy.url().should('include', '/dashboard')
  })
})
