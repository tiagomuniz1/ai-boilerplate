import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockCreatedDoctor = {
  id: 'bbbbbbbb-2222-2222-2222-000000000001',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
  crmNumber: '12345/SP',
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia' }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

// O form busca as especialidades da clínica via GET /clinics/{clinicId}/specialties
// e usa `specialtyId` como id do checkbox (doctor-form-specialty-${specialtyId}).
const mockClinicSpecialties = [
  { id: 'link-1', clinicId: CLINIC_ID, specialtyId: SPEC_ID_1, name: 'Cardiologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
  { id: 'link-2', clinicId: CLINIC_ID, specialtyId: SPEC_ID_2, name: 'Neurologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
]
const specialtiesListResponse = { data: mockClinicSpecialties, total: 2, page: 1, limit: 100 }

// Preenche o form no modo "Novo usuário" (radio + nome + e-mail), evitando o
// autocomplete assíncrono de busca de usuário existente.
function fillNewUser(fullName = 'Dr. João Silva', email = 'joao@test.com') {
  cy.get('[data-testid="doctor-form-user-mode-new"]').check()
  cy.get('[data-testid="doctor-form-fullname"]').type(fullName)
  cy.get('[data-testid="doctor-form-email"]').type(email)
}

describe('Doctors Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}/specialties*`, {
      statusCode: 200,
      body: specialtiesListResponse,
    }).as('getSpecialties')
  })

  it('shows validation errors when submitting empty form', () => {
    visitClinic('/doctors/new', mockAuthUser)
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.contains('Selecione um usuário').should('be.visible')
    cy.contains('CRM obrigatório').should('be.visible')
  })

  it('shows validation error when CRM format is invalid', () => {
    visitClinic('/doctors/new', mockAuthUser)
    cy.get('[data-testid="doctor-form-crm"]').type('INVALID')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.contains('CRM inválido').should('be.visible')
  })

  it('shows validation error when no specialty is selected', () => {
    visitClinic('/doctors/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.contains('Selecione ao menos uma especialidade').should('be.visible')
  })

  it('renders specialty checkboxes after specialties load', () => {
    visitClinic('/doctors/new', mockAuthUser)
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_1}"]`).should('exist')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_2}"]`).should('exist')
  })

  it('shows conflict error when CRM already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'CRM number already in use' },
    }).as('createDoctor')

    visitClinic('/doctors/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@createDoctor')
    cy.get('[data-testid="doctor-form-error"]').should('be.visible')
    cy.get('[data-testid="doctor-form-error"]').should('contain', 'CRM já cadastrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedDoctor })
    }).as('createDoctor')

    visitClinic('/doctors/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.get('[data-testid="doctor-form-submit"]').should('be.disabled')
    cy.wait('@createDoctor')
  })

  it('cancel button returns to /doctors without creating doctor', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getDoctors')

    visitClinic('/doctors/new', mockAuthUser)
    cy.get('[data-testid="new-doctor-back-button"]').click()
    expectClinicPath('/doctors')
  })

  it('creates doctor and redirects to /doctors list', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, {
      statusCode: 201,
      body: mockCreatedDoctor,
    }).as('createDoctor')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: { data: [mockCreatedDoctor], total: 1, page: 1, limit: 20 },
    }).as('getDoctors')

    visitClinic('/doctors/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@createDoctor')
    expectClinicPath('/doctors')
    cy.wait('@getDoctors')
    cy.get(`[data-testid="doctor-table-row-${mockCreatedDoctor.id}"]`).should('exist')
  })

  it('allows selecting multiple specialties', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/doctors`, (req) => {
      expect(req.body.specialtyIds).to.have.length(2)
      req.reply({ statusCode: 201, body: { ...mockCreatedDoctor, specialties: [{ id: SPEC_ID_1, name: 'Cardiologia' }, { id: SPEC_ID_2, name: 'Neurologia' }] } })
    }).as('createDoctor')
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, {
      statusCode: 200,
      body: emptyListResponse,
    })

    visitClinic('/doctors/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    cy.get('[data-testid="doctor-form-crm"]').type('12345/SP')
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get(`[data-testid="doctor-form-specialty-${SPEC_ID_2}"]`).check()
    cy.get('[data-testid="doctor-form-submit"]').click()
    cy.wait('@createDoctor')
  })
})

export {}
