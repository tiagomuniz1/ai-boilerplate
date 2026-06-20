# Task — Gestão do Catálogo de Campos Canônicos (Frontend / PLATFORM_ADMIN)

## Descrição
Implementar as telas de gestão do **catálogo de campos canônicos de prontuário**, exclusivas do `PLATFORM_ADMIN`, dentro da área de backoffice. O catálogo é reference data global da plataforma (sem clínica) que padroniza campos sugeridos aos templates de prontuário das clínicas — aumentando a aderência e a comparabilidade dos relatórios. O PLATFORM_ADMIN pode listar, criar, editar e ativar/desativar campos. Não há exclusão física: a desativação (`isActive=false`) é o "remover".

---

## Contexto
- Backend (task "Catálogo de Campos Canônicos") expõe: `GET /medical-record-canonical-fields` (lista/sugere; `includeInactive=true` só PLATFORM_ADMIN), `POST` e `PATCH` (PLATFORM_ADMIN).
- Roteamento multi-tenant: PLATFORM_ADMIN opera sob o slug reservado `backoffice` (ver telas existentes de `clinics`, que são exclusivas do PLATFORM_ADMIN). Seguir o mesmo padrão de rota/proteção.
- Catálogo é global — **não** tem `clinicId`.
- Campos podem ser gerais (`specialtyId = null`) ou específicos de uma especialidade.
- DTOs do `@app/shared`: `CanonicalFieldResponseDto`, `CreateCanonicalFieldDto`, `UpdateCanonicalFieldDto`, `MedicalRecordFieldOptionDto`, `MedicalRecordFieldType`, `UserRole`.
- Especialidades para o seletor vêm de `/specialties` (catálogo global de especialidades já existente).

---

## Contratos (types locais)
```ts
export interface ICanonicalFieldModel {
  id: string
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  options: { value: string; label: string }[] | null
  unit: string | null
  specialtyId: string | null
  specialtyName?: string | null   // se o response trouxer; senão resolver na exibição
  description: string | null
  isActive: boolean
}
export interface ICreateCanonicalFieldInput {
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  options?: { value: string; label: string }[]
  unit?: string
  specialtyId?: string
  description?: string
}
export interface IUpdateCanonicalFieldInput {
  label?: string
  type?: MedicalRecordFieldType
  options?: { value: string; label: string }[]
  unit?: string
  specialtyId?: string
  description?: string
  isActive?: boolean
}
export interface ICanonicalFieldListParams { specialtyId?: string; includeInactive?: boolean }
```

---

## Assinaturas esperadas
```ts
// Hooks
useCanonicalFieldsAdmin(params?: ICanonicalFieldListParams): UseQueryResult<ICanonicalFieldModel[]>
useCreateCanonicalField(): UseMutationResult<ICanonicalFieldModel, IApiError, ICreateCanonicalFieldInput>
useUpdateCanonicalField(): UseMutationResult<ICanonicalFieldModel, IApiError, { id: string; data: IUpdateCanonicalFieldInput }>

// Use-cases
listCanonicalFieldsAdminUseCase(params?): Promise<ICanonicalFieldModel[]>
createCanonicalFieldUseCase(input): Promise<ICanonicalFieldModel>
updateCanonicalFieldUseCase(id, input): Promise<ICanonicalFieldModel>

// Service
canonicalFieldsAdminService.{ getAll(params?), create(dto), update(id, dto) }
```
> Reaproveitar o `canonicalFieldsService` criado na task de templates se já existir; esta task adiciona as operações de escrita e o suporte a `includeInactive`. Evitar duplicar o GET.

---

## Fluxo principal por tela

### Listagem (`backoffice → /canonical-fields`)
1. `useCanonicalFieldsAdmin({ includeInactive: true })` lista todos (ativos e inativos).
2. Filtro por especialidade (`<select>` com "Todas" + lista de especialidades; "Gerais" para `specialtyId = null`).
3. Toggle "Mostrar inativos".
4. Tabela: `canonicalKey`, `label`, `type`, escopo (Geral / nome da especialidade), `unit`, status (Ativo/Inativo), ações (editar, ativar/desativar).
5. Botão "Novo campo" → `/canonical-fields/new`.

### Criação (`/canonical-fields/new`)
1. `CanonicalFieldForm` (modo create) com `react-hook-form` + zod.
2. Campos: `canonicalKey`, `label`, `type`, `unit?`, `specialtyId?` (com opção "Geral"), `description?`, e **editor de `options`** (`useFieldArray`) habilitado apenas quando `type ∈ {select, multiselect}`.
3. Submit → `useCreateCanonicalField`.
4. Sucesso → invalida `['canonical-fields']`, toast, redireciona.
5. Erros: `409` (canonicalKey em uso) → alerta global; `422` (options inválidas, specialty inexistente) → mapear/alertar.

### Edição (`/canonical-fields/[id]/edit`)
1. Form populado com os dados atuais.
2. Mesma validação `type`×`options`.
3. Permitir alterar `isActive` (também via toggle direto na listagem).
4. Submit → `useUpdateCanonicalField`.

### Ativar/Desativar
- Ação na listagem dispara `useUpdateCanonicalField({ id, data: { isActive } })` (com confirmação ao desativar). Não há exclusão física.

---

## Validação (Zod)
- `canonicalKey`: `^[a-z][a-z0-9_]*$`, min 2, max 60 (somente create; em edição é exibida como readonly — recomendado não permitir troca).
- `label`: min 2, max 120.
- `type`: enum válido.
- `options`: obrigatório com ≥1 item e `value` único quando `type ∈ {select, multiselect}`; proibido caso contrário.
- `unit`: max 20.
- `description`: max 500.

---

## Navegação
Adicionar item "Campos de prontuário" (ou "Catálogo canônico") na navegação do **backoffice**, com `requiredRoles: [UserRole.PLATFORM_ADMIN]`, junto dos demais itens exclusivos do PLATFORM_ADMIN (ex.: clínicas). Seguir o mesmo mecanismo de visibilidade por role já usado.

---

## Estados e feedbacks
- Loading: skeleton de lista e de form.
- Erro: `ErrorMessage` amigável (nunca `detail` técnico).
- `409`: "Já existe um campo com esta chave canônica".
- `422`: mensagens de options/especialidade inválidas.
- Sucesso create/update/toggle: toast + invalidação.
- Submit desabilitado enquanto `isPending`.
- Confirmação obrigatória ao desativar.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form e options | react-hook-form + `useFieldArray` + zod |
| "Remover" | desativação via `isActive=false` — sem DELETE |
| Escopo do campo | `specialtyId = null` = Geral; senão por especialidade |
| Acesso | exclusivo PLATFORM_ADMIN (backoffice) |
| Reuso | reaproveitar o service de leitura do catálogo já criado |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar o catálogo em Zustand.
- NÃO mapear DTO em componentes/hooks — usar mappers.
- NÃO usar `useState` para campos do form.
- NÃO permitir DELETE — apenas ativar/desativar.
- NÃO renderizar estas telas para roles ≠ PLATFORM_ADMIN.
- NÃO reutilizar DTOs do shared como tipo do formulário.

---

## Estrutura esperada
```
app/[slug]/(authenticated)/canonical-fields/        (área backoffice / PLATFORM_ADMIN)
  page.tsx                  → listagem
  new/page.tsx              → criação
  [id]/edit/page.tsx        → edição

components/features/canonical-fields/
  types/canonical-field-model.types.ts, canonical-field-input.types.ts
  services/canonical-fields-admin.service.ts (+ .spec)   # ou estender o service existente
  mappers/ to-canonical-field-model, to-create-canonical-field-dto, to-update-canonical-field-dto (+ .spec)
  use-cases/ list-canonical-fields-admin, create-canonical-field, update-canonical-field (+ .spec)
  hooks/ use-canonical-fields-admin, use-create-canonical-field, use-update-canonical-field (+ .spec)
  components/
    canonical-field-list.tsx (+ integration.spec)
    canonical-field-list-skeleton.tsx
    canonical-field-form.tsx (+ integration.spec)
    canonical-field-options-editor.tsx (+ integration.spec)
    canonical-field-toggle-dialog.tsx

cypress/e2e/canonical-fields/
  canonical-fields-list.cy.ts, canonical-fields-create.cy.ts, canonical-fields-update.cy.ts, canonical-fields-toggle.cy.ts
cypress/fixtures/canonical-fields-admin.json
```

---

## Cenários de teste adicionais
### Unitários
- mappers DTO↔Model (options, specialtyId null → "Geral").
- `to-create-canonical-field-dto` omite `options` quando type não-select.
- use-cases chamam service + mapper; hooks invalidam `['canonical-fields']`.
### Integração
- `CanonicalFieldForm`: editor de options aparece só para select/multiselect; exige value único.
- erro `409` → alerta global; `422` → mensagem.
- `CanonicalFieldList`: filtro por especialidade e toggle "mostrar inativos" funcionam.
- toggle desativar pede confirmação e atualiza status.
- loading→skeleton; error→alerta; vazio→mensagem.
### E2E
- PLATFORM_ADMIN cria campo geral → aparece na listagem e como sugestão no builder de template.
- PLATFORM_ADMIN cria campo select com options → persistido.
- PLATFORM_ADMIN desativa campo → some das sugestões dos templates (ativos apenas).
- PLATFORM_ADMIN cria campo com canonicalKey duplicada → 409 visível.
- Usuário não-PLATFORM_ADMIN não acessa a rota.

---

## Definition of Done
- [ ] Item de navegação no backoffice com `requiredRoles: [PLATFORM_ADMIN]`
- [ ] Listagem com filtro por especialidade e toggle de inativos (`includeInactive`)
- [ ] Criação, edição e ativar/desativar (sem DELETE)
- [ ] Editor de `options` (`useFieldArray`) condicional a select/multiselect, com value único
- [ ] `canonicalKey` validada (slug) e readonly em edição
- [ ] Estados loading/error/success + skeletons + confirmação ao desativar
- [ ] Acesso restrito a PLATFORM_ADMIN (rota e navegação)
- [ ] Mappers DTO→Model; service só via apiClient; reuso do GET existente
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Sem axios fora do API Client; nada de catálogo em Zustand
- [ ] Naming convention e estrutura seguidas
