# Task — Página Pública de Verificação de Receita (Frontend)

## Descrição

Criar a página **pública** que abre quando alguém bipa o QR Code do rodapé de uma receita. A página consome o endpoint público `GET /prescriptions/verify/:token` e exibe os dados autoritativos da receita (clínica, médico, paciente mascarado, itens, data). Trata claramente o caso de **receita inválida/inexistente** — o sinal anti-fraude quando o PDF foi adulterado ou a URL forjada.

Depende da task de backend `adicionar-validacao-de-receita-com-qrcode` (endpoint + `VerifyPrescriptionResponseDto` no `@app/shared`).

---

## Contexto

- Rotas públicas existem como grupo `(public)` dentro de `app/[slug]/(public)/{login,register,set-password}`. O `middleware.ts` trata o **1º segmento do path como slug da clínica** e só libera sem auth os paths listados em `PUBLIC_SEGMENTS` (`['/login', '/register', '/set-password']`).
- A URL codificada no QR é clínica-escopada: `${FRONTEND_URL}/${slug}/verify/prescriptions/${token}`. Portanto a página vive em `app/[slug]/(public)/verify/prescriptions/[token]/page.tsx` e ganha a tematização da clínica de graça.
- Arquitetura frontend (ver `ai/context/frontend.md` e `ai/context/examples.md`): `UI → hooks (React Query) → use-cases (funções) → services (apiClient) → API Client`. Nunca importar axios fora de `lib/api-client.ts`. Dados de API sempre via React Query.
- O backend já mascara nome/CPF do paciente — o frontend apenas renderiza o que recebe.

---

## Alterações

### 1. Liberar `/verify` no middleware

`apps/frontend/middleware.ts`:
- Adicionar `'/verify'` ao array `PUBLIC_SEGMENTS`. `isPublicPath` já cobre `path === s || path.startsWith(s + '/')`, então `/verify/prescriptions/<token>` (após remover o slug) passa a ser público.

### 2. Rota / página

`app/[slug]/(public)/verify/prescriptions/[token]/page.tsx`:
- Server/Client component que lê `params.token` e renderiza `<PrescriptionVerification token={token} />`.

### 3. Feature `prescription-verification`

`components/features/prescription-verification/`:

- `types/prescription-verification.types.ts`:
  ```ts
  export interface IPrescriptionVerificationModel {
    clinicName: string
    doctorName: string
    doctorCrmNumber: string
    specialtyName: string | null
    patientNameMasked: string
    patientDocumentMasked: string
    issuedAt: Date
    items: Array<{ name: string; activeIngredient: string | null; dosage: string | null; quantity: string | null }>
  }
  ```
  > A página expõe **apenas a identificação das medicações** — sem `instructions` (observação por medicamento) nem `notes` (observações gerais). O objetivo é confirmar quais medicações foram receitadas e validar a receita, não reproduzir a posologia. O backend já não envia esses campos.
- `services/prescription-verification.service.ts`:
  ```ts
  export const prescriptionVerificationService = {
    getByToken: (token: string) =>
      apiClient.get<VerifyPrescriptionResponseDto>(`/prescriptions/verify/${token}`),
  }
  ```
- `mappers/prescription-verification.mapper.ts`: `toPrescriptionVerificationModel(dto)` — converte `issuedAt` string → `Date`.
- `use-cases/verify-prescription.use-case.ts` (função):
  ```ts
  export async function verifyPrescriptionUseCase(token: string) {
    const dto = await prescriptionVerificationService.getByToken(token)
    return toPrescriptionVerificationModel(dto)
  }
  ```
- `hooks/use-prescription-verification.hook.ts`:
  ```ts
  export function usePrescriptionVerification(token: string) {
    return useQuery({
      queryKey: ['prescription-verification', token],
      queryFn: () => verifyPrescriptionUseCase(token),
      retry: 0, // 404 = inválida, não re-tentar
    })
  }
  ```
- `components/PrescriptionVerification.tsx` — trata os 3 estados:
  - **loading:** skeleton (`data-testid="verification-loading"`).
  - **error/404:** estado claro **"Receita não encontrada ou inválida"** (`data-testid="verification-invalid"`) — sem `detail` técnico. Este é o sinal anti-fraude.
  - **success:** card com nome da clínica, médico (nome + CRM + especialidade), paciente mascarado, data de emissão formatada e a lista de medicações (nome/princípio ativo/dosagem/quantidade). **Sem** observações do médico nem observações gerais. `data-testid="verification-success"`.

---

## Regras de negócio / UX

- Página **não** exige login (rota pública liberada no middleware).
- Nunca exibir detalhe técnico de erro ao usuário — 404 e erros de rede caem no mesmo estado amigável "receita inválida".
- Renderizar exatamente o que o backend envia (dados já mascarados) — sem tentar reconstruir PII.
- Layout responsivo e legível em mobile (a maioria dos acessos vem de leitura de QR pelo celular).

---

## Estrutura de arquivos

```
apps/frontend/
  middleware.ts                                              → + '/verify' em PUBLIC_SEGMENTS
  app/[slug]/(public)/verify/prescriptions/[token]/
    page.tsx                                                 → novo
  components/features/prescription-verification/
    types/prescription-verification.types.ts                → novo
    services/prescription-verification.service.ts           → novo
    mappers/prescription-verification.mapper.ts             → novo
    use-cases/verify-prescription.use-case.ts               → novo
    hooks/use-prescription-verification.hook.ts             → novo
    components/PrescriptionVerification.tsx                  → novo
    components/PrescriptionVerification.integration.spec.tsx → novo
```

---

## Cenários de teste

### Integração (`PrescriptionVerification.integration.spec.tsx`) — service mockado via `jest.mock`, `renderWithProviders`
- Estado inicial → renderiza loading.
- Sucesso → renderiza clínica, médico + CRM, paciente mascarado, medicações e data.
- 404 / erro → renderiza o estado "Receita não encontrada ou inválida".
- Garante que nenhum dado sensível não-mascarado é inventado no client, e que observações do médico/gerais não são exibidas (não vêm no DTO).

### E2E (Cypress) — opcional, fluxo crítico
- Emitir receita (fluxo DOCTOR) → abrir a URL de verificação → conferir dados exibidos.
- Abrir URL com token inexistente → estado inválido.

---

## Definition of Done

- [ ] `/verify` liberado no `middleware.ts`
- [ ] Rota `app/[slug]/(public)/verify/prescriptions/[token]/page.tsx` acessível sem login
- [ ] Feature completa: service → mapper → use-case → hook → component (arquitetura respeitada)
- [ ] Três estados tratados: loading, inválida (404/erro), sucesso
- [ ] Nenhum axios fora do API Client; dados via React Query
- [ ] Layout responsivo (mobile-first)
- [ ] Testes de integração cobrindo loading/sucesso/inválida (100% cobertura)
- [ ] Build e lint sem erros
