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
// caminho/do/arquivo.tsx

---
## TASK
# Task — Gestão de Medicamentos (Frontend / PLATFORM_ADMIN)

## Descrição
Implementar as telas de gestão da **base de medicamentos**, exclusivas do `PLATFORM_ADMIN`, dentro da área de backoffice. A base é reference data global da plataforma (sem clínica) e será a fonte do futuro módulo de receitas. O PLATFORM_ADMIN pode **listar (com busca e paginação)**, **criar**, **editar**, **ativar/desativar** e **excluir** medicamentos. A maior parte dos registros vem do import da ANVISA; entradas criadas na tela têm `source = MANUAL`.

---

## Contexto
- Backend (task "Módulo de Medicamentos") expõe:
  - `GET /medications` (paginado: `page`, `limit`, `search`, `includeInactive`) — `includeInactive=true` só PLATFORM_ADMIN.
  - `GET /medications/:id`
  - `POST /medications` (PLATFORM_ADMIN) — cria `MANUAL`
  - `PATCH /medications/:id` (PLATFORM_ADMIN) — editar / ativar-desativar
  - `DELETE /medications/:id` (PLATFORM_ADMIN) — soft delete
- Resposta da listagem: `{ data: MedicationResponseDto[]; total; page; limit }` (mesmo shape de pacientes).
- Roteamento: PLATFORM_ADMIN opera no backoffice (`app/backoffice/(authenticated)/...`). Seguir o padrão das telas existentes de `canonical-fields`/`clinics` (rota e proteção por role).
- Base é global — **não** tem `clinicId`.
- DTOs do `@app/shared`: `MedicationResponseDto`, `CreateMedicationDto`, `UpdateMedicationDto`, `MedicationSource`, `UserRole`.

---

## Contratos (types locais)
```ts
export interface IMedicationModel {
  id: string
  name: string
  activeIngredient: string | null
  regulatoryCategory: string | null
  therapeuticClass: string | null
  holderCompany: string | null
  registrationNumber: string | null
  registrationStatus: string | null
  source: MedicationSource
  isActive: boolean
  createdAt: Date
}
export interface IMedicationListParams {
  page?: number
  limit?: number
  search?: string
  includeInactive?: boolean
}
export interface IPaginatedMedications {
  data: IMedicationModel[]
  total: number
  page: number
  limit: number
}
export interface ICreateMedicationInput {
  name: string
  activeIngredient?: string
  regulatoryCategory?: string
  therapeuticClass?: string
  holderCompany?: string
  registrationNumber?: string
  registrationStatus?: string
}
export interface IUpdateMedicationInput {
  name?: string
  activeIngredient?: string
  regulatoryCategory?: string
  therapeuticClass?: string
  holderCompany?: string
  registrationNumber?: string
  registrationStatus?: string
  isActive?: boolean
}
```

---

## Assinaturas esperadas
```ts
// Hooks
useMedications(params: IMedicationListParams): UseQueryResult<IPaginatedMedications>
useMedication(id: string): UseQueryResult<IMedicationModel>
useCreateMedication(): UseMutationResult<IMedicationModel, IApiError, ICreateMedicationInput>
useUpdateMedication(): UseMutationResult<IMedicationModel, IApiError, { id: string; data: IUpdateMedicationInput }>
useDeleteMedication(): UseMutationResult<void, IApiError, string>

// Use-cases
listMedicationsUseCase(params): Promise<IPaginatedMedications>
getMedicationUseCase(id): Promise<IMedicationModel>
createMedicationUseCase(input): Promise<IMedicationModel>
updateMedicationUseCase(id, input): Promise<IMedicationModel>
deleteMedicationUseCase(id): Promise<void>

// Service
medicationsService.{ getAll(params), getById(id), create(dto), update(id, dto), remove(id) }
```

---

## Fluxo principal por tela

### Listagem (`backoffice → /medications`)
1. `useMedications({ page, limit, search, includeInactive: true })`.
2. **Campo de busca** (debounced) por nome / princípio ativo → reinicia para `page = 1`.
3. Toggle "Mostrar inativos".
4. Tabela: `name`, `activeIngredient`, `therapeuticClass`, `holderCompany`, `registrationNumber`, origem (`source`: ANVISA/Manual), status (Ativo/Inativo), ações (editar, ativar/desativar, excluir).
5. **Paginação** (anterior/próxima + indicador de total/página) — a base é grande.
6. Botão "Novo medicamento" → `/medications/new`.

### Criação (`/medications/new`)
1. `MedicationForm` (modo create) com `react-hook-form` + zod.
2. Campos: `name` (obrigatório), `activeIngredient?`, `regulatoryCategory?`, `therapeuticClass?`, `holderCompany?`, `registrationNumber?`, `registrationStatus?`.
3. Submit → `useCreateMedication` → invalida `['medications']`, toast, redireciona.

### Edição (`/medications/[id]/edit`)
1. Form populado via `useMedication(id)`.
2. Permitir alterar `isActive` (também via toggle direto na listagem).
3. Submit → `useUpdateMedication`.
4. Exibir `source` como informação readonly (Manual/ANVISA) — não editável.

### Ativar/Desativar
- Ação na listagem dispara `useUpdateMedication({ id, data: { isActive } })` (confirmação ao desativar).

### Excluir
- `MedicationDeleteDialog` de confirmação → `useDeleteMedication(id)` → invalida `['medications']`, toast.

---

## Validação (Zod)
- `name`: min 2, max 250 (obrigatório).
- `activeIngredient`: max 500.
- `regulatoryCategory`: max 120.
- `therapeuticClass`: max 250.
- `holderCompany`: max 250.
- `registrationNumber`: max 40.
- `registrationStatus`: max 40.

---

## Navegação
Adicionar item "Medicamentos" na navegação do **backoffice**, com `requiredRoles: [UserRole.PLATFORM_ADMIN]`, junto dos demais itens exclusivos do PLATFORM_ADMIN (clínicas, especialidades, campos canônicos, temas). Seguir o mesmo mecanismo de visibilidade por role já usado.

---

## Estados e feedbacks
- Loading: skeleton de lista (linhas de tabela) e de form.
- Erro: `ErrorMessage` amigável (nunca `detail` técnico).
- Vazio (busca sem resultado): mensagem dedicada.
- Sucesso create/update/toggle/delete: toast + invalidação de `['medications']`.
- Submit desabilitado enquanto `isPending`.
- Confirmação obrigatória ao desativar e ao excluir.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form | react-hook-form + zod |
| Busca | input debounced; reseta página |
| Paginação | server-side (`page`/`limit` na query) |
| "Desativar" vs "Excluir" | `isActive=false` (some das listas de leitura) vs `DELETE` (soft delete) |
| Acesso | exclusivo PLATFORM_ADMIN (backoffice) |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar a base em Zustand.
- NÃO mapear DTO em componentes/hooks — usar mappers.
- NÃO usar `useState` para campos do form (somente para busca/paginação de UI).
- NÃO renderizar estas telas para roles ≠ PLATFORM_ADMIN.
- NÃO reutilizar DTOs do shared como tipo do formulário.
- NÃO permitir editar `source` (origem do registro).

---

## Estrutura esperada
```
app/backoffice/(authenticated)/medications/
  page.tsx                  → listagem (busca + paginação)
  new/page.tsx              → criação
  [id]/edit/page.tsx        → edição

components/features/medications/
  types/medication-model.types.ts, medication-input.types.ts
  services/medications.service.ts (+ .spec)
  mappers/ to-medication-model, to-create-medication-dto, to-update-medication-dto (+ .spec)
  use-cases/ list-medications, get-medication, create-medication, update-medication, delete-medication (+ .spec)
  hooks/ use-medications, use-medication, use-create-medication, use-update-medication, use-delete-medication (+ .spec)
  components/
    medication-list.tsx (+ integration.spec)
    medication-list-skeleton.tsx
    medication-form.tsx (+ integration.spec)
    medication-toggle-dialog.tsx
    medication-delete-dialog.tsx

cypress/e2e/medications/
  medications-list.cy.ts, medications-create.cy.ts, medications-update.cy.ts, medications-delete.cy.ts
cypress/fixtures/medications.json
```

---

## Cenários de teste adicionais
### Unitários
- mappers DTO↔Model (campos null, `source`, `createdAt → Date`).
- `to-create-medication-dto` / `to-update-medication-dto` omitem campos vazios/indefinidos.
- use-cases chamam service + mapper; hooks invalidam `['medications']`.
### Integração
- `MedicationList`: busca filtra; toggle "mostrar inativos"; paginação avança/retrocede.
- `MedicationForm`: validação de `name`; submit chama mutation; `409`/`422` exibem mensagem.
- toggle desativar e excluir pedem confirmação.
- loading→skeleton; error→alerta; vazio→mensagem.
### E2E
- PLATFORM_ADMIN busca por nome → resultados filtrados.
- PLATFORM_ADMIN cria medicamento manual → aparece na listagem.
- PLATFORM_ADMIN edita e desativa → some das listas de leitura.
- PLATFORM_ADMIN exclui medicamento → removido da listagem.
- Usuário não-PLATFORM_ADMIN não acessa a rota.

---

## Definition of Done
- [ ] Item de navegação no backoffice com `requiredRoles: [PLATFORM_ADMIN]`
- [ ] Listagem com busca (debounced) + paginação server-side + toggle de inativos
- [ ] Criação, edição, ativar/desativar e excluir (com confirmação)
- [ ] `source` exibido como readonly (não editável)
- [ ] Estados loading/error/empty/success + skeletons
- [ ] Acesso restrito a PLATFORM_ADMIN (rota e navegação)
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente (loading/error/success)
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Naming convention e estrutura seguidas
