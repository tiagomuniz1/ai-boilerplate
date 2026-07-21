import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const MOCK_PROFESSIONAL_ID = 'cccccccc-2222-2222-2222-000000000001'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

// O form busca as especialidades da clínica via GET /clinics/{clinicId}/specialties
// e usa `specialtyId` como id do checkbox (professional-form-specialty-${specialtyId}).
const mockClinicSpecialties = [
  { id: 'link-1', clinicId: CLINIC_ID, specialtyId: SPEC_ID_1, name: 'Cardiologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
  { id: 'link-2', clinicId: CLINIC_ID, specialtyId: SPEC_ID_2, name: 'Neurologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
]

const mockProfessional = {
  id: MOCK_PROFESSIONAL_ID,
  user: { id: 'user-uuid-1', fullName: 'Dr. Original Silva', email: 'original@test.com', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '11111', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockUpdatedProfessional = {
  ...mockProfessional,
  specialties: [
    { id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null },
    { id: SPEC_ID_2, name: 'Neurologia', registryNumber: null },
  ],
}

const specialtiesListResponse = { data: mockClinicSpecialties, total: 2, page: 1, limit: 100 }

describe('Professionals Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}/specialties*`, {
      statusCode: 200,
      body: specialtiesListResponse,
    }).as('getSpecialties')
  })

  it('shows skeleton while loading professional data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockProfessional })
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.get('[data-testid="edit-professional-skeleton"]').should('be.visible')
    cy.wait('@getProfessional')
    cy.get('[data-testid="edit-professional-skeleton"]').should('not.exist')
  })

  it('shows pre-filled form with current professional data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.wait('@getSpecialties')

    cy.get('[data-testid="professional-form-registration-number-0"]').should('have.value', '11111')
    cy.get('[data-testid="professional-form-registration-state-0"]').should('have.value', 'SP')
    cy.get('[data-testid="professional-form-registration-council-type-0"]').should('have.value', 'crm')
    cy.get('[data-testid="professional-form-user-readonly"]').should('contain', mockProfessional.user.fullName)
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_1}"]`).should('be.checked')
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_2}"]`).should('not.be.checked')
  })

  it('shows user as readonly and not a select', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')

    cy.get('[data-testid="professional-form-user-readonly"]').should('exist')
    cy.get('[data-testid="professional-form-user"]').should('not.exist')
  })

  it('shows load error when professional does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Professional not found' },
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="edit-professional-load-error"]').should('be.visible')
    cy.get('[data-testid="professional-form"]').should('not.exist')
  })

  it('shows conflict error when registration is already in use', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Registration already in use' },
    }).as('updateProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-form-registration-number-0"]').clear().type('99999')
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@updateProfessional')
    cy.get('[data-testid="professional-form-error"]').should('be.visible')
  })

  it('cancel button returns without saving changes', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="edit-professional-back-button"]').click()
    expectClinicPath(`/professionals/${MOCK_PROFESSIONAL_ID}`)
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: mockUpdatedProfessional })
    }).as('updateProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.wait('@getSpecialties')
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_2}"]`).check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.get('[data-testid="professional-form-submit"]').should('be.disabled')
    cy.wait('@updateProfessional')
  })

  it('updates professional and redirects to details page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockUpdatedProfessional,
    }).as('updateProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.wait('@getSpecialties')

    cy.fixture('professionals').then((fixture) => {
      cy.get('[data-testid="professional-form-registration-number-0"]').clear().type(fixture.updatedProfessional.number)
    })
    cy.get(`[data-testid="professional-form-specialty-${SPEC_ID_2}"]`).check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@updateProfessional')
    expectClinicPath(`/professionals/${MOCK_PROFESSIONAL_ID}`)
  })

  it('shows isActive checkbox checked when professional is active (ADMIN)', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-form-isactive"]').should('be.checked')
  })

  it('shows isActive checkbox unchecked when professional is inactive (ADMIN)', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: { ...mockProfessional, user: { ...mockProfessional.user, isActive: false } },
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-form-isactive"]').should('not.be.checked')
  })

  it('deactivates professional by unchecking isActive and saving', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: { ...mockProfessional, user: { ...mockProfessional.user, isActive: false } },
    }).as('updateProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-form-isactive"]').should('be.checked')
    cy.get('[data-testid="professional-form-isactive"]').uncheck()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@updateProfessional').then((interception) => {
      expect(interception.request.body.isActive).to.equal(false)
    })
    expectClinicPath(`/professionals/${MOCK_PROFESSIONAL_ID}`)
  })

  it('activates professional by checking isActive and saving', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: { ...mockProfessional, user: { ...mockProfessional.user, isActive: false } },
    }).as('getProfessional')
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('updateProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-form-isactive"]').should('not.be.checked')
    cy.get('[data-testid="professional-form-isactive"]').check()
    cy.get('[data-testid="professional-form-submit"]').click()
    cy.wait('@updateProfessional').then((interception) => {
      expect(interception.request.body.isActive).to.equal(true)
    })
    expectClinicPath(`/professionals/${MOCK_PROFESSIONAL_ID}`)
  })

  it('shows details page correctly after navigating from list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockProfessional], total: 1, page: 1, limit: 20 },
    }).as('getProfessionals')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic('/professionals', mockAuthUser)
    cy.wait('@getProfessionals')
    cy.get(`[data-testid="professional-view-link-${MOCK_PROFESSIONAL_ID}"]`).click()
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details"]').should('be.visible')
    cy.get('[data-testid="professional-details-name"]').should('contain', mockProfessional.user.fullName)
  })
})

export {}
