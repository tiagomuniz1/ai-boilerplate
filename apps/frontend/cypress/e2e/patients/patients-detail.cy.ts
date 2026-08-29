import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const MOCK_PATIENT_ID = 'eeeeeeee-1111-1111-1111-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockPatient = {
  id: MOCK_PATIENT_ID,
  user: { id: 'user-uuid-1', fullName: 'Paciente Detalhe', email: 'detalhe@test.com', isActive: true },
  phoneNumber: '11987654321',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: 'male',
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Patients Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // History and photo gallery both mount with the page — an un-stubbed 401 on
    // either sends the app to /login and the spec dies in a redirect loop.
    cy.stubPatientDetailWidgets()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/${CLINIC_SLUG}/patients/${MOCK_PATIENT_ID}`)
    expectClinicPath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockPatient })
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.get('[data-testid="patient-details-skeleton"]').should('be.visible')
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-skeleton"]').should('not.exist')
  })

  it('shows error state when patient does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Patient not found' },
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-error"]').should('be.visible')
    cy.get('[data-testid="patient-details"]').should('not.exist')
  })

  it('shows patient details with name, email, phone, document, gender and birthdate', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')

    cy.get('[data-testid="patient-details"]').should('be.visible')
    cy.get('[data-testid="patient-details-name"]').should('contain', mockPatient.user.fullName)
    cy.get('[data-testid="patient-details-email"]').should('contain', mockPatient.user.email)
    cy.get('[data-testid="patient-details-phone"]').should('contain', '(11) 98765-4321')
    cy.get('[data-testid="patient-details-document"]').should('contain', '123.456.789-01')
    cy.get('[data-testid="patient-details-gender"]').should('contain', 'Masculino')
    cy.get('[data-testid="patient-details-birthdate"]').should('be.visible')
    cy.get('[data-testid="patient-details-created-at"]').should('be.visible')
  })

  it('back button navigates to /patients', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-back-button"]').click()
    expectClinicPath('/patients')
  })

  it('edit button navigates to /patients/[id]/edit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-edit-button"]').click()
    expectClinicPath(`/patients/${MOCK_PATIENT_ID}/edit`)
  })

  it('delete button opens dialog with patient name', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-patient-dialog-message"]').should('contain', mockPatient.user.fullName)
  })

  it('cancel button on dialog closes dialog without deleting', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-patient-dialog-cancel"]').click()
    cy.get('[data-testid="delete-patient-dialog"]').should('not.exist')
    cy.get('[data-testid="patient-details"]').should('be.visible')
  })

  it('delete failure closes dialog and keeps patient on details page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('deletePatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    cy.get('[data-testid="delete-patient-dialog"]').should('not.exist')
    expectClinicPath(`/patients/${MOCK_PATIENT_ID}`)
  })

  it('delete success navigates to /patients', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: mockPatient,
    }).as('getPatient')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deletePatient')
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-delete-button"]').click()
    cy.get('[data-testid="delete-patient-dialog-confirm"]').click()
    cy.wait('@deletePatient')
    expectClinicPath('/patients')
  })

  it('shows "Não informado" when the patient has no documentNumber (dependent)', () => {
    const dependentPatient = {
      ...mockPatient,
      documentNumber: null,
      responsiblePatientId: 'titular-uuid',
      kinshipType: 'filho',
      responsiblePatient: { id: 'titular-uuid', fullName: 'Maria Silva', documentNumber: '11122233344' },
    }
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: dependentPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-document"]').should('contain', 'Não informado')
  })

  it('shows "Vinculado a" section with a link to the titular when the patient is a dependent', () => {
    const dependentPatient = {
      ...mockPatient,
      documentNumber: null,
      responsiblePatientId: 'titular-uuid',
      kinshipType: 'filho',
      responsiblePatient: { id: 'titular-uuid', fullName: 'Maria Silva', documentNumber: '11122233344' },
    }
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: dependentPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-responsible"]').should('contain', 'Maria Silva')
    cy.get('[data-testid="patient-details-responsible"]').should('contain', 'Filho(a)')
    cy.get('[data-testid="patient-details-responsible-link"]').click()
    expectClinicPath('/patients/titular-uuid')
  })

  it('shows "Dependentes" section listing each dependent when the patient is a titular', () => {
    const titularPatient = {
      ...mockPatient,
      dependents: [{ id: 'dependent-uuid', fullName: 'Bebê Silva', kinshipType: 'filho' }],
    }
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients/${MOCK_PATIENT_ID}`, {
      statusCode: 200,
      body: titularPatient,
    }).as('getPatient')

    visitClinic(`/patients/${MOCK_PATIENT_ID}`, mockAuthUser)
    cy.wait('@getPatient')
    cy.get('[data-testid="patient-details-dependents"]').should('contain', 'Bebê Silva')
    cy.get('[data-testid="patient-details-dependents"]').should('contain', 'Filho(a)')
    cy.get('[data-testid="patient-details-dependent-link"]').click()
    expectClinicPath('/patients/dependent-uuid')
  })
})

export {}
