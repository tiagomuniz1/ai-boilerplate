interface CreateClinicAddressInput {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

interface CreateClinicInput {
  name: string
  slug: string
  address?: CreateClinicAddressInput
}

const DEFAULT_CLINIC_ADDRESS: CreateClinicAddressInput = {
  street: 'Rua das Flores',
  number: '123',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
}

interface CreateUserInput {
  fullName: string
  email: string
  password: string
  role: string
  clinicId?: string
}

interface CreateSpecialtyInput {
  name: string
  description?: string | null
}

interface CreateProfessionalInput {
  userId: string
  registrations: { councilType: string; number: string; state: string; isPrimary: boolean }[]
  specialties: { specialtyId: string; registryNumber?: string }[]
  bio?: string
}

import { CLINIC_SLUG } from './clinic'

interface SeededProfessional {
  professionalId: string
  userId: string
  specialtyId: string
  specialtyName: string
  email: string
  password: string
  fullName: string
  registrationNumber: string
  accessToken: string
  platformAdminToken: string
}

interface CreateScheduleInput {
  professionalId?: string
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  validFrom?: string
  validUntil?: string
}

interface CreateAppointmentInput {
  professionalId?: string
  specialtyId?: string
  patientId: string
  date: string
  startTime: string
  reason?: string
}

interface CreatePrescriptionItemInput {
  medicationId?: string
  activeIngredientName?: string
  dosage?: string
  quantity?: string
  instructions: string
}

interface CreatePrescriptionInput {
  appointmentId: string
  registrationId?: string
  specialtyId?: string
  items: CreatePrescriptionItemInput[]
  notes?: string
}

interface CreateMedicalCertificateInput {
  appointmentId: string
  registrationId?: string
  specialtyId?: string
  type: 'leave' | 'attendance'
  daysOff?: number
  startDate?: string
  cidCode?: string
  attendanceDate?: string
  checkInTime?: string
  checkOutTime?: string
  observations?: string
}

interface CreateScheduleExceptionInput {
  professionalId?: string
  date: string
  startTime?: string | null
  endTime?: string | null
  reason?: string | null
}

interface MedicalRecordTemplateFieldInput {
  label: string
  type: string
  required: boolean
  order: number
  canonical: boolean
  sectionKey?: string
}

interface MedicalRecordTemplateSectionInput {
  key?: string
  title: string
  order: number
}

interface CreateMedicalRecordTemplateInput {
  specialtyId?: string
  councilType?: string
  name: string
  fields: MedicalRecordTemplateFieldInput[]
  sections?: MedicalRecordTemplateSectionInput[]
}

interface CreateMedicalRecordInput {
  appointmentId: string
  data: Record<string, unknown>
  notes?: string
}

interface CreateMedicationInput {
  name: string
  activeIngredient?: string
}

interface CreateCanonicalFieldInput {
  canonicalKey: string
  label: string
  type: string
  unit?: string
}

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      loginAsClinicUser(email: string, password: string, slug: string): Chainable<string>
      createUserViaApi(input: CreateUserInput, accessToken?: string): Chainable<{ id: string }>
      deleteUserViaApi(id: string, accessToken?: string): Chainable<void>
      seedUser(): Chainable<{ id: string; email: string; fullName: string }>
      createProfessionalViaApi(input: CreateProfessionalInput, accessToken: string): Chainable<{ id: string }>
      deleteProfessionalViaApi(id: string, accessToken?: string): Chainable<void>
      deleteSpecialtyViaApi(id: string, accessToken?: string): Chainable<void>
      createSpecialtyViaApi(input: CreateSpecialtyInput, accessToken: string): Chainable<{ id: string; name: string }>
      seedSpecialty(): Chainable<{ id: string; name: string; description: string; platformAdminToken: string }>
      seedPatient(): Chainable<{ patientId: string; userId: string; fullName: string }>
      deletePatientViaApi(id: string, accessToken?: string): Chainable<void>
      seedProfessional(): Chainable<SeededProfessional>
      createClinicViaApi(input: CreateClinicInput, accessToken: string): Chainable<{ id: string; name: string; slug: string }>
      deleteClinicViaApi(id: string, accessToken?: string): Chainable<void>
      seedClinic(): Chainable<{ id: string; name: string; slug: string; platformAdminToken: string }>
      createScheduleViaApi(input: CreateScheduleInput, accessToken: string): Chainable<{ id: string }>
      deleteScheduleViaApi(id: string, accessToken?: string): Chainable<void>
      createAppointmentViaApi(input: CreateAppointmentInput, accessToken: string): Chainable<{ id: string }>
      createPrescriptionViaApi(input: CreatePrescriptionInput, accessToken: string): Chainable<{ id: string }>
      deletePrescriptionViaApi(id: string, accessToken?: string): Chainable<void>
      createMedicalCertificateViaApi(input: CreateMedicalCertificateInput, accessToken: string): Chainable<{ id: string }>
      deleteMedicalCertificateViaApi(id: string, accessToken?: string): Chainable<void>
      createScheduleExceptionViaApi(input: CreateScheduleExceptionInput, accessToken: string): Chainable<{ id: string }>
      deleteScheduleExceptionViaApi(id: string, accessToken?: string): Chainable<void>
      linkSpecialtyToClinicViaApi(clinicId: string, specialtyId: string, accessToken: string): Chainable<void>
      unlinkSpecialtyFromClinicViaApi(clinicId: string, specialtyId: string, accessToken?: string): Chainable<void>
      createMedicalRecordTemplateViaApi(input: CreateMedicalRecordTemplateInput, accessToken: string): Chainable<{ id: string; fields: { key: string; label: string }[] }>
      deleteMedicalRecordTemplateViaApi(id: string, accessToken?: string): Chainable<void>
      deletePrescriptionTemplateViaApi(id: string, accessToken?: string): Chainable<void>
      createMedicalRecordViaApi(input: CreateMedicalRecordInput, accessToken: string): Chainable<{ id: string }>
      createMedicationViaApi(input: CreateMedicationInput, accessToken: string): Chainable<{ id: string; name: string }>
      deleteMedicationViaApi(id: string, accessToken?: string): Chainable<void>
      createCanonicalFieldViaApi(input: CreateCanonicalFieldInput, accessToken: string): Chainable<{ id: string; canonicalKey: string; label: string }>
      stubAppointmentDetailWidgets(overrides?: AppointmentDetailWidgetStubs): Chainable<void>
      stubPatientDetailWidgets(overrides?: PatientDetailWidgetStubs): Chainable<void>
    }
  }
}

function extractAndSetCookies(response: Cypress.Response<unknown>): void {
  const setCookieHeader = response.headers['set-cookie'] as string | string[] | undefined
  if (!setCookieHeader) return
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  cookieStrings.forEach((cookieStr) => {
    const nameValue = cookieStr.split(';')[0].trim()
    const eqIdx = nameValue.indexOf('=')
    if (eqIdx === -1) return
    const name = nameValue.slice(0, eqIdx)
    const value = nameValue.slice(eqIdx + 1)
    cy.setCookie(name, value, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      domain: 'localhost',
    })
  })
}

function extractTokenFromCookies(response: Cypress.Response<unknown>, cookiePrefix: string): string {
  const setCookieHeader = response.headers['set-cookie'] as string | string[] | undefined
  if (!setCookieHeader) return ''
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  const tokenCookie = cookies.find((c) => c.startsWith(cookiePrefix))
  return tokenCookie ? tokenCookie.split(';')[0].replace(cookiePrefix, '') : ''
}

// Real login for seed helpers that just need a bearer token, without leaving the
// browser authenticated as that user. cy.request() stores any Set-Cookie it
// receives in the real cookie jar just like a browser would — so without the
// cleanup below, a clinic-admin login followed by a platform-admin login (e.g.
// seedProfessional needs both) would leave BOTH session cookies present, and
// the backend would pick one up alongside the Authorization header, resolving
// the wrong actor. Seed helpers are expected to run before the test's own
// login, so it's safe to always leave the jar clean afterwards.
function fetchClinicAdminToken(): Cypress.Chainable<string> {
  return cy.fixture('users').then((fixture) => {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/auth/login`,
      body: { email: fixture.admin.email, password: fixture.admin.password, slug: CLINIC_SLUG },
    }).then((response) => {
      const token = extractTokenFromCookies(response, `access_token_${CLINIC_SLUG}=`)
      return cy.clearCookies().then(() => token)
    })
  })
}

function fetchPlatformAdminToken(): Cypress.Chainable<string> {
  return cy.fixture('clinics').then((fixture) => {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/auth/login`,
      body: { email: fixture.platformAdmin.email, password: fixture.platformAdmin.password },
    }).then((response) => {
      const token = extractTokenFromCookies(response, 'access_token=')
      return cy.clearCookies().then(() => token)
    })
  })
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/auth/login`,
    body: { email, password },
  }).then(extractAndSetCookies)
})

// Slug-aware login: passes `slug` in the request body so the backend sets the
// `access_token_{slug}` cookie (multi-tenant convention). Yields the raw token
// string for use in cy.request Authorization headers.
//
// Token extraction is stored in a closure var so the second .then() can return
// it — Cypress forbids returning a value from a .then() that also enqueues cy.*
// commands (mixing sync return with async cy queue).
Cypress.Commands.add('loginAsClinicUser', (email: string, password: string, slug: string) => {
  let token = ''

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/auth/login`,
    body: { email, password, slug },
  }).then((response) => {
    const setCookieHeader = response.headers['set-cookie'] as string | string[] | undefined
    const cookieStrings = setCookieHeader
      ? (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader])
      : []

    const tokenCookieName = `access_token_${slug}=`
    const tokenCookie = cookieStrings.find((c) => c.startsWith(tokenCookieName))
    token = tokenCookie ? tokenCookie.split(';')[0].replace(tokenCookieName, '') : ''

    cookieStrings.forEach((cookieStr) => {
      const nameValue = cookieStr.split(';')[0].trim()
      const eqIdx = nameValue.indexOf('=')
      if (eqIdx === -1) return
      const name = nameValue.slice(0, eqIdx)
      const value = nameValue.slice(eqIdx + 1)
      cy.setCookie(name, value, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        domain: 'localhost',
      })
    })
  }).then(() => token)
})

Cypress.Commands.add('createUserViaApi', (input: CreateUserInput, accessToken?: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/users`,
    body: input,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteUserViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/users/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('seedUser', () => {
  const ts = Date.now()
  const input: CreateUserInput = {
    fullName: `Test User ${ts}`,
    email: `test.${ts}@e2e.test`,
    password: 'Password123!',
    role: 'user',
  }
  return fetchClinicAdminToken().then((adminToken) =>
    cy.createUserViaApi(input, adminToken).then(({ id }) => ({
      id,
      email: input.email,
      fullName: input.fullName,
    })),
  )
})

Cypress.Commands.add('createProfessionalViaApi', (input: CreateProfessionalInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/professionals`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteProfessionalViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/professionals/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createSpecialtyViaApi', (input: CreateSpecialtyInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/specialties`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string, name: response.body.name as string }))
})

// Specialties are a PLATFORM_ADMIN-only catalog (see specialties.controller.ts) —
// a clinic ADMIN token is not enough here.
Cypress.Commands.add('seedSpecialty', () => {
  const ts = Date.now()
  const name = `Especialidade Teste ${ts}`
  const description = `Descrição de teste ${ts}`
  return fetchPlatformAdminToken().then((platformAdminToken) =>
    cy.createSpecialtyViaApi({ name, description }, platformAdminToken).then(({ id }) => ({
      id,
      name,
      description,
      platformAdminToken,
    })),
  )
})

Cypress.Commands.add('seedPatient', () => {
  const ts = Date.now()
  return fetchClinicAdminToken().then((adminToken) => cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/patients`,
    body: {
      fullName: `Paciente Teste ${ts}`,
      email: `patient.${ts}@e2e.test`,
      phoneNumber: '(11) 99999-9999',
      birthDate: '1990-05-15',
      documentNumber: String(ts).slice(-11).padStart(11, '0'),
      gender: 'male',
    },
    headers: { Authorization: `Bearer ${adminToken}` },
  })).then((response) => ({
    patientId: response.body.id as string,
    userId: response.body.user.id as string,
    fullName: response.body.user.fullName as string,
  }))
})

Cypress.Commands.add('deletePatientViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/patients/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('deleteSpecialtyViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/specialties/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('seedProfessional', () => {
  const ts = Date.now()
  const password = 'Password123!'
  const userInput: CreateUserInput = {
    fullName: `Dr. Test ${ts}`,
    email: `professional.${ts}@e2e.test`,
    password,
    role: 'professional',
  }
  // CRM numbers are digits-only (see COUNCIL_REGISTRATION_FORMATS in packages/shared) — no "/SP" suffix.
  const registrationNumber = String(ts).slice(-6)

  return fetchClinicAdminToken().then((adminToken) => {
    // Specialties are a PLATFORM_ADMIN-only catalog — a clinic ADMIN token
    // can't create one, so this needs its own login.
    return fetchPlatformAdminToken().then((platformAdminToken) => {
      return cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/specialties`,
        body: { name: `Especialidade Test ${ts}`, description: null },
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      }).then((specialtyResponse) => {
        const specialtyId = specialtyResponse.body.id as string
        const specialtyName = specialtyResponse.body.name as string

        return cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/users`,
          body: userInput,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((userResponse) => {
          const userId = userResponse.body.id as string

          return cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/professionals`,
            body: {
              userId,
              registrations: [{ councilType: 'crm', number: registrationNumber, state: 'SP', isPrimary: true }],
              specialties: [{ specialtyId }],
            },
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((professionalResponse) => {
            const professionalId = professionalResponse.body.id as string

            return ({
              professionalId,
              userId,
              specialtyId,
              specialtyName,
              email: userInput.email,
              password,
              fullName: userInput.fullName,
              registrationNumber,
              accessToken: adminToken,
              platformAdminToken,
            })
          })
        })
      })
    })
  })
})

Cypress.Commands.add('createClinicViaApi', (input: CreateClinicInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/clinics`,
    body: { address: DEFAULT_CLINIC_ADDRESS, ...input },
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({
    id: response.body.id as string,
    name: response.body.name as string,
    slug: response.body.slug as string,
  }))
})

// There is no DELETE /clinics/:id route — the backend never grew one (clinics
// only ever get deactivated via isActive). Real DELETE calls here silently 404
// forever (failOnStatusCode: false swallowed it), leaking a test clinic on
// every run — hard-delete straight from the DB instead, test data only.
Cypress.Commands.add('deleteClinicViaApi', (id: string) => {
  cy.task('dbQuery', { sql: 'DELETE FROM clinics WHERE id = $1', params: [id] })
})

Cypress.Commands.add('seedClinic', () => {
  const ts = Date.now()

  return fetchPlatformAdminToken().then((platformAdminToken) => {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/clinics`,
      body: { name: `Clínica Seed ${ts}`, slug: `clinica-seed-${ts}`, address: DEFAULT_CLINIC_ADDRESS },
      headers: { Authorization: `Bearer ${platformAdminToken}` },
    }).then((clinicResponse) => ({
      id: clinicResponse.body.id as string,
      name: clinicResponse.body.name as string,
      slug: clinicResponse.body.slug as string,
      platformAdminToken,
    }))
  })
})

Cypress.Commands.add('createScheduleViaApi', (input: CreateScheduleInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/schedules`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteScheduleViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/schedules/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createAppointmentViaApi', (input: CreateAppointmentInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/appointments`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('createPrescriptionViaApi', (input: CreatePrescriptionInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/prescriptions`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deletePrescriptionViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/prescriptions/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createMedicalCertificateViaApi', (input: CreateMedicalCertificateInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/medical-certificates`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteMedicalCertificateViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/medical-certificates/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createScheduleExceptionViaApi', (input: CreateScheduleExceptionInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/schedule-exceptions`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

Cypress.Commands.add('deleteScheduleExceptionViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/schedule-exceptions/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

// Linking a specialty to a clinic is PLATFORM_ADMIN-only — pass a token from
// fetchPlatformAdminToken()/seedSpecialty()'s platformAdminToken.
Cypress.Commands.add('linkSpecialtyToClinicViaApi', (clinicId: string, specialtyId: string, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/clinics/${clinicId}/specialties/${specialtyId}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
})

Cypress.Commands.add('unlinkSpecialtyFromClinicViaApi', (clinicId: string, specialtyId: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/clinics/${clinicId}/specialties/${specialtyId}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createMedicalRecordTemplateViaApi', (input: CreateMedicalRecordTemplateInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/medical-record-templates`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string, fields: response.body.fields }))
})

Cypress.Commands.add('deleteMedicalRecordTemplateViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/medical-record-templates/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('deletePrescriptionTemplateViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/prescription-templates/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createMedicalRecordViaApi', (input: CreateMedicalRecordInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/medical-records`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string }))
})

// Medications catalog is PLATFORM_ADMIN-only — pass a platformAdminToken.
Cypress.Commands.add('createMedicationViaApi', (input: CreateMedicationInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/medications`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({ id: response.body.id as string, name: response.body.name as string }))
})

Cypress.Commands.add('deleteMedicationViaApi', (id: string, accessToken?: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('API_URL')}/medications/${id}`,
    failOnStatusCode: false,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
})

Cypress.Commands.add('createCanonicalFieldViaApi', (input: CreateCanonicalFieldInput, accessToken: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/medical-record-canonical-fields`,
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => ({
    id: response.body.id as string,
    canonicalKey: response.body.canonicalKey as string,
    label: response.body.label as string,
  }))
})

/**
 * Every widget the appointment detail page mounts fires its own GET as soon as
 * the page renders — including tabs the test never opens. An un-stubbed one
 * answers 401, the api-client tries to refresh, fails, and sends the app to
 * /login: the spec then dies in a login/dashboard redirect loop with an error
 * that says nothing about the missing stub.
 *
 * Stubbing them here instead of in each spec means adding a widget tomorrow is a
 * one-line change, not a hunt through a dozen files. Pass `overrides` to give a
 * specific endpoint a real body; everything else answers empty.
 */
export interface AppointmentDetailWidgetStubs {
  medicalRecord?: unknown
  templates?: unknown
  prescriptions?: unknown
  atestados?: unknown
  examRequests?: unknown
  consultationPhotos?: unknown
}

Cypress.Commands.add('stubAppointmentDetailWidgets', (overrides: AppointmentDetailWidgetStubs = {}) => {
  const api = Cypress.env('API_URL')
  const emptyPage = { data: [], total: 0, page: 1, limit: 20 }

  cy.intercept('GET', `${api}/medical-records/by-appointment/*`, {
    statusCode: 200,
    body: overrides.medicalRecord ?? null,
  }).as('getMedicalRecord')

  cy.intercept('GET', `${api}/medical-record-templates*`, {
    statusCode: 200,
    body: overrides.templates ?? { data: [], total: 0, page: 1, limit: 1 },
  }).as('getTemplates')

  cy.intercept('GET', `${api}/prescriptions*`, {
    statusCode: 200,
    body: overrides.prescriptions ?? emptyPage,
  }).as('getPrescriptions')

  cy.intercept('GET', `${api}/medical-certificates*`, {
    statusCode: 200,
    body: overrides.atestados ?? [],
  }).as('getAtestados')

  cy.intercept('GET', `${api}/exam-requests*`, {
    statusCode: 200,
    body: overrides.examRequests ?? [],
  }).as('getExamRequests')

  cy.intercept('GET', `${api}/consultation-photos*`, {
    statusCode: 200,
    body: overrides.consultationPhotos ?? [],
  }).as('getConsultationPhotos')
})

/**
 * The patient detail page mounts the medical history and the evolution photo
 * gallery on load. Same trap as the appointment page: an un-stubbed 401 sends the
 * app to /login and the spec dies in a redirect loop.
 */
export interface PatientDetailWidgetStubs {
  medicalHistory?: unknown
  photoGallery?: unknown
}

Cypress.Commands.add('stubPatientDetailWidgets', (overrides: PatientDetailWidgetStubs = {}) => {
  const api = Cypress.env('API_URL')

  cy.intercept('GET', `${api}/medical-records*`, {
    statusCode: 200,
    body: overrides.medicalHistory ?? { data: [], total: 0, page: 1, limit: 10 },
  }).as('getPatientHistory')

  cy.intercept('GET', `${api}/consultation-photos/by-patient/*`, {
    statusCode: 200,
    body: overrides.photoGallery ?? { data: [], total: 0, page: 1, limit: 20 },
  }).as('getPatientPhotos')
})

export {}
