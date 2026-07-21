import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockCreatedProfessional = {
  id: 'bbbbbbbb-2222-2222-2222-000000000001',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

// O form busca as especialidades da clínica via GET /clinics/{clinicId}/specialties
// e usa `specialtyId` como id do checkbox (professional-form-specialty-${specialtyId}).
const mockClinicSpecialties = [
  { id: 'link-1', clinicId: CLINIC_ID, specialtyId: SPEC_ID_1, name: 'Cardiologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
  { id: 'link-2', clinicId: CLINIC_ID, specialtyId: SPEC_ID_2, name: 'Neurologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
]
const specialtiesListResponse = { data: mockClinicSpecialties, total: 2, page: 1, limit: 100 }

// Preenche o form no modo "Novo usuário" (radio + nome + e-mail), evitando o
// autocomplete assíncrono de busca de usuário existente.
function fillNewUser(fullName = 'Dr. João Silva', email = 'joao@test.com') {
  cy.get('[data-testid="professional-form-user-mode-new"]').check()
  cy.get('[data-testid="professional-form-fullname"]').type(fullName)
  cy.get('[data-testid="professional-form-email"]').type(email)
}

// Preenche a primeira linha de registro (councilType default = CRM).
function fillFirstRegistration(number = '12345', state = 'SP') {
  cy.get('[data-testid="professional-form-registration-number-0"]').type(number)
  cy.get('[data-testid="professional-form-registration-state-0"]').select(state)
}

describe('Professionals Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}/specialties*`, {
      statusCode: 200,
      body: specialtiesListResponse,
    }).as('getSpecialties')
  })

  it('shows validation errors when submitting empty form', () => {
    visitClinic('/professionals/new', mockAuthUser)
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.contains('Selecione um usuário').should('be.visible')
    cy.contains('Preencha número e UF de todos os registros no formato esperado').should('be.visible')
  })

  it('shows validation error when the registration number does not match the CRM format', () => {
    visitClinic('/professionals/new', mockAuthUser)
    cy.get('[data-testid="professional-form-registration-number-0"]').type('INVALID')
    cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.contains('Preencha número e UF de todos os registros no formato esperado').should('be.visible')
  })

  it('renders specialty checkboxes after specialties load', () => {
    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_1}"]`).should('exist')
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_2}"]`).should('exist')
  })

  it('shows conflict error when registration already exists (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/professionals`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Registration number already in use' },
    }).as('createProfessional')

    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    fillFirstRegistration()
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@createProfessional')
    cy.get('[data-testid="professional-form-error"]').should('be.visible')
    cy.get('[data-testid="professional-form-error"]').should('contain', 'Registro já cadastrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/professionals`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedProfessional })
    }).as('createProfessional')

    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    fillFirstRegistration()
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.get('[data-testid="professional-form-submit"]').should('be.disabled')
    cy.wait('@createProfessional')
  })

  it('cancel button returns to /professionals without creating a professional', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getProfessionals')

    visitClinic('/professionals/new', mockAuthUser)
    cy.get('[data-testid="new-professional-back-button"]').click()
    expectClinicPath('/professionals')
  })

  it('creates professional and redirects to /professionals list', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/professionals`, {
      statusCode: 201,
      body: mockCreatedProfessional,
    }).as('createProfessional')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockCreatedProfessional], total: 1, page: 1, limit: 20 },
    }).as('getProfessionals')

    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    fillFirstRegistration()
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@createProfessional').then((interception) => {
      expect(interception.request.body.registrations).to.deep.equal([
        { councilType: 'crm', number: '12345', state: 'SP', isPrimary: true },
      ])
    })
    expectClinicPath('/professionals')
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-table-row-${mockCreatedProfessional.id}"]`).should('exist')
  })

  it('allows selecting multiple specialties', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/professionals`, (req) => {
      expect(req.body.specialties).to.have.length(2)
      req.reply({
        statusCode: 201,
        body: {
          ...mockCreatedProfessional,
          specialties: [
            { id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null },
            { id: SPEC_ID_2, name: 'Neurologia', registryNumber: null },
          ],
        },
      })
    }).as('createProfessional')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: emptyListResponse,
    })

    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')
    fillNewUser()
    fillFirstRegistration()
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_1}"]`).check()
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_2}"]`).check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@createProfessional')
  })
})

export {}
