import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockCreatedPatient = {
  id: 'bbbbbbbb-1111-1111-1111-000000000001',
  user: {
    id: 'user-uuid-created',
    fullName: 'Paciente E2E Criado',
    email: 'paciente.criado@test.com',
    isActive: true,
  },
  phoneNumber: '11999999999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: 'male',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

describe('Patients Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation errors when submitting empty form', () => {
    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
    cy.contains('E-mail inválido').should('be.visible')
  })

  it('shows validation error when phone format is invalid', () => {
    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="patient-form-phone"]').type('123')
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.contains('Telefone inválido').should('be.visible')
  })

  it('shows validation error when document number is invalid', () => {
    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="patient-form-document"]').type('123')
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.contains('Documento deve ter 11 dígitos numéricos').should('be.visible')
  })

  it('shows conflict error when email already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/patients`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Email already in use' },
    }).as('createPatient')

    visitClinic('/patients/new', mockAuthUser)
    cy.fixture('patients').then((fixture) => {
      cy.get('[data-testid="patient-form-fullname"]').type(fixture.newPatient.fullName)
      cy.get('[data-testid="patient-form-email"]').type(fixture.newPatient.email)
      cy.get('[data-testid="patient-form-phone"]').type(fixture.newPatient.phone)
      cy.get('[data-testid="patient-form-document"]').type(fixture.newPatient.documentNumber)
      cy.get('[data-testid="patient-form-birthdate"]').type(fixture.newPatient.birthDate)
      cy.get('[data-testid="patient-form-gender"]').select(fixture.newPatient.gender)
    })
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.wait('@createPatient')
    cy.get('[data-testid="patient-form-error"]').should('be.visible')
    cy.get('[data-testid="patient-form-error"]').should('contain', 'E-mail ou documento já cadastrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/patients`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedPatient })
    }).as('createPatient')

    visitClinic('/patients/new', mockAuthUser)
    cy.fixture('patients').then((fixture) => {
      cy.get('[data-testid="patient-form-fullname"]').type(fixture.newPatient.fullName)
      cy.get('[data-testid="patient-form-email"]').type(fixture.newPatient.email)
      cy.get('[data-testid="patient-form-phone"]').type(fixture.newPatient.phone)
      cy.get('[data-testid="patient-form-document"]').type(fixture.newPatient.documentNumber)
      cy.get('[data-testid="patient-form-birthdate"]').type(fixture.newPatient.birthDate)
      cy.get('[data-testid="patient-form-gender"]').select(fixture.newPatient.gender)
    })
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.get('[data-testid="patient-form-submit"]').should('be.disabled')
    cy.wait('@createPatient')
  })

  it('cancel button returns to /patients without creating patient', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getPatients')

    visitClinic('/patients/new', mockAuthUser)
    cy.get('[data-testid="new-patient-back-button"]').click()
    expectClinicPath('/patients')
  })

  it('creates patient and redirects to /patients list', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/patients`, {
      statusCode: 201,
      body: mockCreatedPatient,
    }).as('createPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [mockCreatedPatient], total: 1, page: 1, limit: 20 },
    }).as('getPatients')

    visitClinic('/patients/new', mockAuthUser)
    cy.fixture('patients').then((fixture) => {
      cy.get('[data-testid="patient-form-fullname"]').type(fixture.newPatient.fullName)
      cy.get('[data-testid="patient-form-email"]').type(fixture.newPatient.email)
      cy.get('[data-testid="patient-form-phone"]').type(fixture.newPatient.phone)
      cy.get('[data-testid="patient-form-document"]').type(fixture.newPatient.documentNumber)
      cy.get('[data-testid="patient-form-birthdate"]').type(fixture.newPatient.birthDate)
      cy.get('[data-testid="patient-form-gender"]').select(fixture.newPatient.gender)
    })
    cy.get('[data-testid="patient-form-submit"]').click()
    cy.wait('@createPatient')
    expectClinicPath('/patients')
    cy.wait('@getPatients')
    cy.get(`[data-testid="patient-table-row-${mockCreatedPatient.id}"]`).should('exist')
  })
})

export {}
