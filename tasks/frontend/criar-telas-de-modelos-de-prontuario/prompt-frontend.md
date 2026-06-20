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
# Task — Telas de Modelos de Prontuário (Frontend)

## Descrição
Implementar as telas de gestão dos **modelos de prontuário** (templates) por especialidade, restritas ao ADMIN. A tela principal é um **builder de campos dinâmico**: a clínica monta a estrutura do prontuário de uma especialidade adicionando/removendo/reordenando campos. O builder **sugere campos do catálogo canônico** da plataforma para aumentar a aderência. Leitura também disponível ao DOCTOR (para conhecer a estrutura), escrita só ADMIN.

---

## Contexto
- Backend: `/medical-record-templates` (CRUD) e `/medical-record-canonical-fields` (catálogo, leitura).
- Um template por `clinic + specialty`.
- `fields` é uma lista flexível; cada campo tem `label`, `type`, `required`, `order`, `options` (select/multiselect), `canonical`/`canonicalKey`. A `key` é gerada no backend — o frontend não a define ao criar.
- DTOs do `@app/shared`: `MedicalRecordTemplateResponseDto`, `CreateMedicalRecordTemplateDto`, `UpdateMedicalRecordTemplateDto`, `PaginatedMedicalRecordTemplatesResponseDto`, `MedicalRecordTemplateFieldDto`, `MedicalRecordFieldOptionDto`, `CanonicalFieldResponseDto`, `MedicalRecordFieldType`, `UserRole`.
- Especialidades disponíveis vêm das vinculadas à clínica (`/clinic-specialties` ou `/specialties` conforme já usado nas telas existentes).

---

## Contratos (types locais)
```ts
export interface ITemplateFieldModel {
  key?: string                 // presente só em edição (gerada pelo backend)
  label: string
  type: MedicalRecordFieldType
  required: boolean
  order: number
  options: { value: string; label: string }[] | null
  placeholder: string | null
  helpText: string | null
  canonical: boolean
  canonicalKey: string | null
}
export interface ITemplateModel {
  id: string
  specialtyId: string
  specialtyName: string
  name: string
  fields: ITemplateFieldModel[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
export interface ICreateTemplateInput { specialtyId: string; name: string; fields: ITemplateFieldModel[] }
export interface IUpdateTemplateInput { name?: string; fields?: ITemplateFieldModel[]; isActive?: boolean }
export interface ICanonicalFieldModel {
  id: string; canonicalKey: string; label: string; type: MedicalRecordFieldType
  options: { value: string; label: string }[] | null; unit: string | null
  specialtyId: string | null; description: string | null
}
```

---

## Assinaturas esperadas
```ts
// Hooks
useTemplates(params?): UseQueryResult<IPaginatedTemplatesModel>
useTemplate(id): UseQueryResult<ITemplateModel>
useCanonicalFields(specialtyId?): UseQueryResult<ICanonicalFieldModel[]>
useCreateTemplate(): UseMutationResult<ITemplateModel, IApiError, ICreateTemplateInput>
useUpdateTemplate(): UseMutationResult<ITemplateModel, IApiError, { id: string; data: IUpdateTemplateInput }>
useDeleteTemplate(): UseMutationResult<void, IApiError, string>

// Use-cases
listTemplatesUseCase / getTemplateUseCase / listCanonicalFieldsUseCase
createTemplateUseCase / updateTemplateUseCase / deleteTemplateUseCase

// Services
medicalRecordTemplatesService.{getAll,getById,create,update,remove}
canonicalFieldsService.getAll(specialtyId?)
```

---

## Fluxo principal por tela

### Listagem (`/medical-record-templates`)
1. `useTemplates()` lista os templates da clínica (nome, especialidade, nº de campos, ativo).
2. Botão "Novo modelo" (ADMIN) → `/medical-record-templates/new`.
3. Ações editar/excluir só ADMIN. DOCTOR vê em modo leitura.

### Criação / Edição (builder)
1. `TemplateForm` com `react-hook-form` + `useFieldArray` para `fields`.
2. Selecionar especialidade (apenas na criação; na edição é fixa). Ao escolher, chamar `useCanonicalFields(specialtyId)`.
3. **`CanonicalFieldPicker`**: lista campos sugeridos (gerais + da especialidade). Ao adotar, adiciona ao `useFieldArray` já com `type`/`options`/label e `canonical: true`, `canonicalKey` preenchida. Label permanece editável.
4. **`FieldEditor`** por campo: label, type, required, options (quando select/multiselect), placeholder, helpText; reordenar (mover acima/abaixo) e remover. Campos canônicos visualmente destacados ("sugerido").
5. Submit → `useCreateTemplate`/`useUpdateTemplate`.
6. Sucesso → invalida `['medical-record-templates']`, toast, redireciona.
7. Erros: `409` (template já existe p/ especialidade) → alerta global; `422` (specialty fora da clínica, canonicalKey inválida, options inválidas) → mensagem amigável / mapear ao campo quando possível.

### Exclusão
Modal de confirmação → `useDeleteTemplate` → invalida lista.

---

## Validação (Zod)
- `name`: min 2, max 120.
- `fields`: `@ArrayMinSize(1)` (pelo menos 1 campo).
- por campo: `label` obrigatório; quando `type ∈ {select, multiselect}` exigir `options` com ≥1 item e `value` único; `order` numérico.

---

## Navegação
Adicionar item "Modelos de prontuário" em `lib/constants.tsx` (`NAVIGATION_ITEMS`) com `requiredRoles: [UserRole.ADMIN, UserRole.DOCTOR]` (escrita condicional a ADMIN dentro das telas).

---

## Estados e feedbacks
- Loading: skeleton de lista e de form.
- Erro: `ErrorMessage` amigável (nunca `detail` técnico).
- `409`: "Já existe um modelo para esta especialidade".
- Sucesso create/update/delete: toast + redirect.
- Submit desabilitado enquanto `isPending`.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form e fields dinâmicos | react-hook-form + `useFieldArray` + zod |
| Geração de `key` | responsabilidade do backend — frontend não envia `key` no create |
| Catálogo | leitura via React Query; adotar campo copia tipo/options/label |
| Role | `useAuthStore().user.role` para esconder escrita de não-ADMIN |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar dados de template/catálogo em Zustand.
- NÃO mapear DTO em componentes/hooks — usar mappers.
- NÃO usar `useState` para campos do form.
- NÃO reutilizar DTOs do shared como tipo de formulário.
- NÃO enviar `key` ao criar campos (backend gera).
- NÃO renderizar ações de escrita para não-ADMIN.

---

## Estrutura esperada
```
app/[slug]/(authenticated)/medical-record-templates/
  page.tsx                  → listagem
  new/page.tsx              → criação (ADMIN)
  [id]/page.tsx             → detalhes/visualização
  [id]/edit/page.tsx        → edição (ADMIN)

components/features/medical-record-templates/
  types/template-model.types.ts, template-input.types.ts, canonical-field-model.types.ts
  services/medical-record-templates.service.ts (+ .spec)
           canonical-fields.service.ts (+ .spec)
  mappers/ to-template-model, to-create-template-dto, to-update-template-dto, to-canonical-field-model (+ .spec)
  use-cases/ list-templates, get-template, list-canonical-fields, create-template, update-template, delete-template (+ .spec)
  hooks/ use-templates, use-template, use-canonical-fields, use-create-template, use-update-template, use-delete-template (+ .spec)
  components/
    template-list.tsx (+ integration.spec)
    template-list-skeleton.tsx
    template-form.tsx (+ integration.spec)
    field-editor.tsx (+ integration.spec)
    canonical-field-picker.tsx (+ integration.spec)
    template-details.tsx (+ integration.spec)
    template-delete-dialog.tsx

cypress/e2e/medical-record-templates/
  templates-list.cy.ts, templates-create.cy.ts, templates-update.cy.ts, templates-delete.cy.ts
cypress/fixtures/medical-record-templates.json, canonical-fields.json
```

---

## Cenários de teste adicionais
### Unitários
- mappers convertem datas; `to-create-template-dto` não envia `key`.
- `listCanonicalFieldsUseCase` chama service com specialtyId.
- hooks invalidam queries corretas após mutation.
### Integração
- `TemplateForm`: adicionar/remover/reordenar campos via `useFieldArray`.
- `CanonicalFieldPicker`: adotar campo adiciona com type/options corretos e `canonical:true`.
- `FieldEditor`: select exige options; alternar `required`.
- `TemplateForm`: erro 409 → alerta global; 422 → mensagem.
- `TemplateList` ADMIN vê ações de escrita; DOCTOR não.
- Loading → skeleton; error → alerta; vazio → mensagem.
### E2E
- ADMIN cria template usando 1 campo canônico + 1 livre → aparece na listagem.
- ADMIN edita template (adiciona campo) → persistido.
- ADMIN tenta criar 2º template para a mesma especialidade → 409 visível.
- DOCTOR acessa em leitura → sem botões de escrita.

---

## Definition of Done
- [ ] Item "Modelos de prontuário" no `NAVIGATION_ITEMS` (`[ADMIN, DOCTOR]`)
- [ ] Listagem, detalhes, criação, edição, remoção
- [ ] Builder com `useFieldArray` (add/remove/reorder) + `CanonicalFieldPicker`
- [ ] Catálogo consumido via React Query; adoção copia type/options/label
- [ ] `key` não enviada no create (backend gera)
- [ ] Validação zod (incl. options de select)
- [ ] Estados loading/error/success + skeletons
- [ ] Escrita condicional a ADMIN
- [ ] Mappers DTO→Model; services só via apiClient
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Sem axios fora do API Client; nada de template em Zustand
- [ ] Naming convention e estrutura seguidas
