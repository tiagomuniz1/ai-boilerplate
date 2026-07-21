// Helpers compartilhados para E2E de páginas dentro de uma clínica (rotas [slug]).
//
// O slug `pulso` existe no dev seed (SEED_CLINIC_ID), então o fetch server-side
// feito por app/[slug]/layout.tsx (validação da clínica) resolve contra o backend
// real — o Cypress não intercepta fetch server-side do Next, apenas chamadas do
// browser. As demais chamadas (client-side) continuam mockadas via cy.intercept.

export const CLINIC_SLUG = 'pulso'
export const CLINIC_ID = '10000000-0000-4000-8000-000000000000'

const MOCK_TOKEN = 'mock-access-token'

interface MockAuthUser {
  id: string
  fullName: string
  email: string
  role: string
  clinicId?: string | null
  [key: string]: unknown
}

const mockClinicResponse = {
  id: CLINIC_ID,
  name: 'Pulso',
  slug: CLINIC_SLUG,
  isActive: true,
  themeId: null,
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  address: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

// Tema retornado por GET /themes/active. O layout autenticado dispara essa chamada
// (useApplyClinicTheme) sempre que o usuário tem clinicId. Sem este intercept ela
// bate no backend real com o token mock → 401 → o interceptor do api-client
// redireciona para /login → loop infinito de redirect.
const mockActiveThemeResponse = {
  id: '20000000-0000-4000-8000-000000000000',
  name: 'Default',
  slug: 'default',
  isDefault: true,
  accentColor: '#2563eb',
  accentSoftColor: '#dbeafe',
  borderRadius: 'default',
  bgColor: null,
  bgDarkColor: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

// Registra os intercepts que o layout autenticado da clínica dispara
// (auth/me, clinic-by-slug, theme ativo). Use em testes que aterrissam numa
// página autenticada sem passar por visitClinic (ex.: redirect pós-login).
export function stubClinicLayout(authUser: MockAuthUser = {} as MockAuthUser) {
  const user: MockAuthUser = {
    id: 'mock-auth-user-id',
    fullName: 'Mock User',
    email: 'mock@user.com',
    role: 'admin',
    clinicId: CLINIC_ID,
    ...authUser,
  }

  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: user,
  })

  cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/slug/${CLINIC_SLUG}`, {
    statusCode: 200,
    body: mockClinicResponse,
  })

  cy.intercept('GET', `${Cypress.env('API_URL')}/themes/active`, {
    statusCode: 200,
    body: mockActiveThemeResponse,
  })
}

// Visita uma página dentro da clínica `pulso`. `path` é o caminho SEM o slug
// (ex: '/professionals/123/edit'); o slug é prefixado internamente.
export function visitClinic(path: string, authUser: MockAuthUser) {
  const user: MockAuthUser = { clinicId: CLINIC_ID, ...authUser }

  stubClinicLayout(user)

  cy.setCookie(`access_token_${CLINIC_SLUG}`, MOCK_TOKEN, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    domain: 'localhost',
  })

  cy.visit(`/${CLINIC_SLUG}${path}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'auth-user',
        JSON.stringify({ state: { user }, version: 0 }),
      )
    },
  })
}

// Asserção exata de pathname dentro da clínica. `path` é SEM o slug.
// Mais estrito que should('include', ...) — pega regressão de prefixo de slug.
export function expectClinicPath(path: string) {
  cy.location('pathname').should('eq', `/${CLINIC_SLUG}${path}`)
}

// ----- Backoffice (PLATFORM_ADMIN, rotas /backoffice/*) -----
//
// O backoffice NÃO é multi-tenant: usa o cookie `access_token` (sem sufixo) e o
// usuário PLATFORM_ADMIN tem clinicId null. O layout não dispara /themes/active
// (enabled só com clinicId) nem /clinics/slug (slug === 'backoffice' desabilita),
// então não há loop de redirect e não precisa interceptar essas rotas.

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@e2e.test',
  role: 'platform_admin',
  clinicId: null,
}

// Visita uma página do backoffice. `path` é SEM o prefixo /backoffice
// (ex: '/clinics/123/edit'); o prefixo é adicionado internamente.
export function visitBackoffice(path: string, authUser = mockPlatformAdmin) {
  const user = { clinicId: null, ...authUser }

  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: user,
  })

  // A listagem de clínicas (ClinicList) busca os temas via GET /themes?page&limit
  // para o seletor de tema. Sem este intercept a chamada bate no backend real com
  // o token mock → 401 → loop de redirect (login do backoffice → /backoffice/clinics).
  cy.intercept('GET', `${Cypress.env('API_URL')}/themes*`, {
    statusCode: 200,
    body: { data: [mockActiveThemeResponse], total: 1, page: 1, limit: 50 },
  })

  cy.setCookie('access_token', MOCK_TOKEN, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    domain: 'localhost',
  })

  cy.visit(`/backoffice${path}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'auth-user',
        JSON.stringify({ state: { user }, version: 0 }),
      )
    },
  })
}

// Asserção exata de pathname dentro do backoffice. `path` é SEM o prefixo.
export function expectBackofficePath(path: string) {
  cy.location('pathname').should('eq', `/backoffice${path}`)
}

export { mockPlatformAdmin }
