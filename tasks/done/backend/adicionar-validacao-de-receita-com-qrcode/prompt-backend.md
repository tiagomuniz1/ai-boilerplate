Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Validação de Receita com QR Code (Backend)

## Descrição

Adicionar um QR Code ao rodapé de todo PDF de receita, apontando para uma página pública de verificação. O QR codifica uma URL contendo um **token opaco** vinculado à receita. Um endpoint **público** (`GET /prescriptions/verify/:token`) devolve os dados autoritativos da receita (a partir do `snapshot` no banco), com **nome e CPF do paciente mascarados**. Objetivo: impedir que um PDF adulterado seja usado para comprar medicamentos — a farmácia bipa o QR e confere o conteúdo real contra o papel.

---

## Contexto

- O módulo `prescriptions` já emite receitas reais. `Prescription` (`entities/prescription.entity.ts`) tem `id`, `clinicId`, `appointmentId`, `patientId`, `doctorId`, `snapshot: PrescriptionSnapshot` (jsonb), `issuedAt`, timestamps e `deletedAt` (soft delete).
- `PrescriptionSnapshot` (`packages/shared/src/types/prescription-snapshot.type.ts`) é denormalizado e imutável: clínica (name/address/logoUrl), doctor (name/crmNumber/specialtyName), patient (name/documentNumber = CPF), `items[]` e `notes`.
- PDF é gerado **sob demanda** por `PrescriptionPdfBuilderService.build(snapshot, logoBase64)` (`services/prescription-pdf-builder.service.ts`), usando **pdfmake 0.3.x**. O rodapé é montado em `buildFooter()`. pdfmake suporta o nó nativo `{ qr: '<texto>', fit: <n> }` — **não adicionar** nenhuma dependência de QR.
- `GET /prescriptions/:id/pdf` (`controllers/prescriptions.controller.ts`) protegido por `@Roles(ADMIN, DOCTOR)` e serve os bytes do PDF via `GeneratePrescriptionPdfUseCase`.
- Padrão de rota pública existente: `@Public()` (`modules/auth/decorators/public.decorator.ts`), usado em `health`, `auth` e `GET /clinics/slug/:slug`.
- `FRONTEND_URL` disponível via `getEnvConfig()` (`config/env.config.ts`). Referência de construção de URL clínica: `send-set-password-email.use-case.ts` (`${env.FRONTEND_URL}${path}...`).
- Idioma de token aleatório: `randomBytes(32).toString('hex')` (`crypto`), como em `send-set-password-email.use-case.ts`.

---

## Alterações

### 1. Migration — `verification_token` em `prescriptions`

`database/migrations/1753000000000-add-verification-token-to-prescriptions.ts`:

1. `ALTER TABLE prescriptions ADD COLUMN verification_token varchar(64) NULL;`
2. **Backfill**: para cada linha existente (inclusive soft-deleted, para manter unicidade), gerar um token único e preencher. Pode ser feito em loop no `up()` gerando `randomBytes(32).toString('hex')` por linha, ou via SQL com `encode(gen_random_bytes(32), 'hex')`.
3. `ALTER TABLE prescriptions ALTER COLUMN verification_token SET NOT NULL;`
4. `CREATE UNIQUE INDEX uq_prescriptions_verification_token ON prescriptions (verification_token);`

`down()`: dropar o índice e a coluna.

### 2. Entity

`entities/prescription.entity.ts` — adicionar:
```ts
@Column({ name: 'verification_token', type: 'varchar', length: 64, unique: true })
verificationToken: string
```

### 3. Repository

`repositories/prescriptions.repository.interface.ts`:
- Adicionar `verificationToken: string` em `CreatePrescriptionData`.
- Novo método: `abstract findByVerificationToken(token: string): Promise<Prescription | null>`.

`repositories/prescriptions.repository.ts`:
- `create()` persiste o novo campo.
- `findByVerificationToken(token)` — busca **sem escopo de `clinicId`** e **sem `withDeleted`** (soft-deleted → `null`).

### 4. Geração do token na criação

`use-cases/create-prescription.use-case.ts`:
- Gerar `const verificationToken = randomBytes(32).toString('hex')` (import de `crypto`).
- Passar no `prescriptionsRepository.create({ ...restante, verificationToken })`.
- `toPrescriptionResponse` **não** expõe o token (é dado do PDF/URL, não do response administrativo). Mantê-lo fora do `PrescriptionResponseDto`.

### 5. Use-case de verificação (público)

Novo `use-cases/verify-prescription.use-case.ts`:
```ts
async execute(token: string): Promise<VerifyPrescriptionResponseDto>
```
- `findByVerificationToken(token)` → se `null`, lançar `NotFoundException('Prescription not found')`.
- Montar `VerifyPrescriptionResponseDto` a partir do `snapshot`, **mascarando** nome e CPF do paciente. Read-only (sem transação, sem cache).

**Helpers de máscara** (funções puras — no próprio use-case ou em `services/prescription-mask.util.ts`):
- `maskCpf(cpf)`: mantém só os dígitos 7–9 → `***.***.789-**` (se não tiver 11 dígitos, retornar `***`).
- `maskName(fullName)`: primeiro nome + inicial do último sobrenome + `.` → `Maria S.` (nome único → primeiro nome + `.`).

### 6. Endpoint público

`controllers/prescriptions.controller.ts` — adicionar (importar `@Public()` de `../../auth/decorators/public.decorator`):
```ts
@Get('verify/:token')
@Public()
@Throttle({ default: { limit: 60, ttl: 60000 } })
verify(@Param('token') token: string): Promise<VerifyPrescriptionResponseDto> {
  return this.verifyPrescriptionUseCase.execute(token)
}
```
Sem conflito com `@Get(':id')` — `verify/:token` tem 2 segmentos. Registrar `VerifyPrescriptionUseCase` no `prescriptions.module.ts`.

### 7. QR no rodapé do PDF

`services/prescription-pdf-builder.service.ts`:
- `build(snapshot, logoBase64, verificationUrl: string)` — novo parâmetro.
- `buildFooter(snapshot, verificationUrl)` — acrescentar ao stack do rodapé:
```ts
{ qr: verificationUrl, fit: 90, margin: [0, 16, 0, 4] },
{ text: 'Verifique a autenticidade desta receita', fontSize: 8, color: '#555555' },
```

`use-cases/generate-prescription-pdf.use-case.ts`:
- Buscar a receita (já busca) e obter o `clinicSlug` (via `FindClinicByIdUseCase`, que retorna o `slug`, como em `create-prescription`).
- Montar a URL com `getEnvConfig()`, espelhando o `link` do set-password:
```ts
const url = `${env.FRONTEND_URL}/${clinicSlug}/verify/prescriptions/${prescription.verificationToken}`
```
- Chamar `prescriptionPdfBuilderService.build(snapshot, logoBase64, url)`.

### 8. Shared — DTO de verificação

`packages/shared/src/dtos/verify-prescription-response.dto.ts` (novo) — **sem IDs internos**:
```ts
export class VerifyPrescriptionResponseDto {
  clinicName: string
  doctorName: string
  doctorCrmNumber: string
  specialtyName: string | null
  patientNameMasked: string
  patientDocumentMasked: string
  issuedAt: string
  items: Array<{
    name: string
    activeIngredient: string | null
    dosage: string | null
    quantity: string | null
  }>
}
```
Exportar via `packages/shared/src/index.ts` (barrel — nunca importar de subpasta).

> **Escopo do que é exposto:** apenas a identificação das medicações (nome, princípio ativo, dosagem, quantidade). **Não** expor `instructions` (observação do médico por medicamento) nem `notes` (observações gerais) — esses campos podem revelar posologia/como o medicamento deve ser ministrado, e o objetivo da página é somente confirmar quais medicações foram receitadas e validar a autenticidade da receita.

---

## Regras de negócio

- Token gerado uma vez na criação da receita; imutável; único no banco.
- Receita soft-deleted → `GET /prescriptions/verify/:token` retorna `404` (= inválida).
- O endpoint público **nunca** retorna nome ou CPF completos, nem IDs internos (`id`, `patientId`, `doctorId`, `appointmentId`, `clinicId`).
- O endpoint público **não** retorna `instructions` (por item) nem `notes` — apenas a identificação das medicações. A página serve para confirmar as medicações e validar a receita, não para reproduzir a posologia.
- A URL do QR é clínica-escopada: `${FRONTEND_URL}/${clinicSlug}/verify/prescriptions/${token}`.
- Máscara de CPF exibe apenas os dígitos 7–9; nome exibe primeiro nome + inicial do sobrenome.
- Nenhuma alteração no `snapshot` — o token vive na coluna da entidade, não no snapshot.

---

## Estrutura de arquivos

```
packages/shared/src/
  dtos/
    verify-prescription-response.dto.ts        → novo
  index.ts                                     → exportar o DTO novo

apps/backend/src/modules/prescriptions/
  entities/prescription.entity.ts              → + verificationToken
  repositories/
    prescriptions.repository.interface.ts       → + findByVerificationToken, + verificationToken em CreatePrescriptionData
    prescriptions.repository.ts                 → implementar
  use-cases/
    create-prescription.use-case.ts            → gerar e persistir o token
    verify-prescription.use-case.ts            → novo (público)
    generate-prescription-pdf.use-case.ts      → montar URL e passar ao builder
  services/
    prescription-pdf-builder.service.ts        → QR no rodapé (nó nativo pdfmake)
    prescription-mask.util.ts                  → novo (maskCpf, maskName) [opcional]
  controllers/prescriptions.controller.ts      → + GET verify/:token (@Public)
  prescriptions.module.ts                      → registrar VerifyPrescriptionUseCase

apps/backend/src/database/migrations/
  1753000000000-add-verification-token-to-prescriptions.ts   → novo
```

---

## Cenários de teste

### `PrescriptionsRepository`
- `findByVerificationToken` retorna a receita quando o token existe.
- Token inexistente → `null`.
- Receita soft-deleted → `null`.
- `create` persiste o `verificationToken`.

### `CreatePrescriptionUseCase`
- Gera `verificationToken` e passa ao repositório na criação.
- Token não aparece no `PrescriptionResponseDto` retornado.

### `VerifyPrescriptionUseCase`
- Token válido → DTO com dados mascarados corretos (`Maria S.`, `***.***.789-**`).
- Token inexistente → `NotFoundException`.
- CPF sem 11 dígitos → máscara degradada (`***`), sem crash.
- Nome com um único termo → `Primeiro.`.
- DTO retornado não contém IDs internos, PII completo, `instructions` (por item) nem `notes`.

### `GeneratePrescriptionPdfUseCase`
- Monta a URL `${FRONTEND_URL}/${clinicSlug}/verify/prescriptions/${token}` e a repassa ao builder.

### `PrescriptionPdfBuilderService`
- `buildFooter` inclui um nó `qr` com a URL recebida.
- Comportamento atual do rodapé (cidade/data/médico/CRM) preservado.

### Integração — `GET /prescriptions/verify/:token`
- Token válido → `200` com dados mascarados; corpo **não** contém CPF/nome completos, IDs internos, `instructions` nem `notes`.
- Token inexistente → `404`.
- Receita soft-deleted → `404`.
- Endpoint acessível **sem autenticação** (sem cookie/JWT).
- Rate limit configurado.

---

## Definition of Done

- [ ] Migration adiciona `verification_token` com backfill único + índice único; `down()` reverte
- [ ] `Prescription` entity com `verificationToken`
- [ ] `create` persiste o token; `findByVerificationToken` implementado (sem clinicId, sem withDeleted)
- [ ] `CreatePrescriptionUseCase` gera o token via `randomBytes(32).toString('hex')`
- [ ] `VerifyPrescriptionUseCase` retorna DTO mascarado (sem `instructions`/`notes`); 404 quando não encontrado
- [ ] `GET /prescriptions/verify/:token` público, com rate limit, sem vazar PII/IDs
- [ ] QR nativo do pdfmake no rodapé de todo PDF (sem dependência nova)
- [ ] `VerifyPrescriptionResponseDto` no shared, exportado via `index.ts`
- [ ] Testes unitários 100% + integração cobrindo os cenários acima
- [ ] Build e lint sem erros; sem `process.env` fora de `env.config.ts`
