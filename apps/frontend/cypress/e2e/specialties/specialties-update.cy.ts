import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const MOCK_SPECIALTY_ID = '44440000-0000-0000-0000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'platform_admin',
}

const mockSpecialty = {
  id: MOCK_SPECIALTY_ID,
  name: 'Cardiologia',
  description: 'Especialidade focada em doenças do coração',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockSpecialtyNoDescription = {
  ...mockSpecialty,
  description: null,
}

const mockUpdatedSpecialty = {
  ...mockSpecialty,
  name: 'Cardiologia Avançada',
  description: 'Descrição atualizada via E2E',
}

describe('Specialties Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows skeleton while loading specialty data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockSpecialty })
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.get('[data-testid="edit-specialty-skeleton"]').should('be.visible')
    cy.wait('@getSpecialty')
    cy.get('[data-testid="edit-specialty-skeleton"]').should('not.exist')
  })

  it('shows load error when specialty does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Specialty not found' },
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="edit-specialty-load-error"]').should('be.visible')
    cy.get('[data-testid="specialty-form"]').should('not.exist')
  })

  it('shows pre-filled form with current specialty data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')

    cy.get('[data-testid="specialty-form-name"]').should('have.value', mockSpecialty.name)
    cy.get('[data-testid="specialty-form-description"]').should('have.value', mockSpecialty.description)
  })

  it('shows conflict error when name already exists (409)', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Specialty with this name already exists' },
    }).as('updateSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-form-name"]').clear().type('Neurologia')
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.wait('@updateSpecialty')
    cy.get('[data-testid="specialty-form-error"]').should('be.visible')
    cy.get('[data-testid="specialty-form-error"]').should('contain', 'Já existe uma especialidade com este nome')
  })

  it('shows 404 error message when specialty not found during update', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Specialty not found' },
    }).as('updateSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-form-name"]').clear().type('Nome Atualizado')
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.wait('@updateSpecialty')
    cy.get('[data-testid="specialty-form-error"]').should('be.visible')
    cy.get('[data-testid="specialty-form-error"]').should('contain', 'Especialidade não encontrada')
  })

  it('cancel button returns to specialty detail page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="edit-specialty-back-button"]').click()
    expectBackofficePath(`/specialties/${MOCK_SPECIALTY_ID}`)
    cy.url().should('not.include', '/edit')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockUpdatedSpecialty })
    }).as('updateSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-form-name"]').clear().type('Nome Novo')
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.get('[data-testid="specialty-form-submit"]').should('be.disabled')
    cy.wait('@updateSpecialty')
  })

  it('updates specialty and redirects to /specialties/[id]', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockUpdatedSpecialty,
    }).as('updateSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')

    // Re-register for the detail page GET after redirect
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockUpdatedSpecialty,
    })

    cy.fixture('specialties').then((fixture) => {
      cy.get('[data-testid="specialty-form-name"]').clear().type(fixture.updatedSpecialty.name)
      cy.get('[data-testid="specialty-form-description"]').clear().type(fixture.updatedSpecialty.description)
    })
    cy.get('[data-testid="specialty-form-submit"]').click()
    cy.wait('@updateSpecialty')
    expectBackofficePath(`/specialties/${MOCK_SPECIALTY_ID}`)
    cy.url().should('not.include', '/edit')
  })

  it('shows "Remover descrição" checkbox when specialty has description', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-form-clear-description"]').should('exist')
  })

  it('does not show "Remover descrição" checkbox when specialty has no description', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialtyNoDescription,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-form-clear-description"]').should('not.exist')
  })

  it('checking "Remover descrição" disables the description textarea', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/specialties/${MOCK_SPECIALTY_ID}`, {
      statusCode: 200,
      body: mockSpecialty,
    }).as('getSpecialty')

    visitBackoffice(`/specialties/${MOCK_SPECIALTY_ID}/edit`, mockAuthUser)
    cy.wait('@getSpecialty')
    cy.get('[data-testid="specialty-form-description"]').should('not.be.disabled')
    cy.get('[data-testid="specialty-form-clear-description"]').check()
    cy.get('[data-testid="specialty-form-description"]').should('be.disabled')
  })

})

export {}
