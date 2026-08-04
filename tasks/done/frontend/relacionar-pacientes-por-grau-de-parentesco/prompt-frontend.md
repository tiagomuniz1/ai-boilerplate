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
# Task — Relacionar pacientes por grau de parentesco: dependente sem CPF (Frontend)

## Descrição

Adicionar ao cadastro de paciente a possibilidade de marcá-lo como **dependente** de outro paciente já cadastrado (o **titular**), com um **grau de parentesco**. Quando marcado como dependente, o CPF deixa de ser obrigatório no formulário. A ficha do paciente passa a mostrar o vínculo em ambos os sentidos ("Vinculado a" / "Dependentes"). Também corrige um bug existente no formulário de edição que impede adicionar o CPF depois (necessário para a promoção de dependente a independente).

Depende da task de backend `relacionar-pacientes-por-grau-de-parentesco` (para `KinshipType`, `KINSHIP_TYPE_LABELS`, e os novos campos em `PatientResponseDto`/`CreatePatientDto`/`UpdatePatientDto`).

---

## Contexto

- `patient-form.tsx` (`apps/frontend/components/features/patients/components/patient-form.tsx`):
  - `documentNumber` hoje é sempre obrigatório no create, validado por `z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'Documento deve ter 11 dígitos numéricos')` (máscara aplicada em tempo real via `applyCpfMask`). No submit, a máscara é removida (`documentNumber.replace(/\D/g, '')`) antes de enviar à API.
  - No formulário de edição, `documentNumber` é renderizado mas **não é enviado no submit** — bug existente, não relacionado a esta feature, mas que precisa ser corrigido aqui porque a promoção "adicionar CPF depois" depende disso.
  - Já existe um padrão de alternância (`userMode: 'new' | 'existing'`, via radio buttons) que muda quais campos são obrigatórios — usar o mesmo espírito para o novo toggle "é dependente".
  - Componente `UserSearch` (busca de usuário para vincular ao paciente) já implementa exatamente o padrão de autocomplete que precisamos para buscar o titular: debounce de 300ms, `useQuery` com `enabled` a partir de um tamanho mínimo de termo, dropdown com fechamento ao clicar fora, e integração com React Hook Form via `useController`.
- Tipos (`apps/frontend/components/features/patients/types/`): `IPatientModel.documentNumber` é `string` obrigatório; `ICreatePatientInput.documentNumber` também obrigatório; `IUpdatePatientInput` não tem `documentNumber`. Nenhum campo de vínculo/parentesco existe hoje.
- `patient-details.tsx` (`apps/frontend/components/features/patients/components/patient-details.tsx`): grid de detalhes com `DetailRow` para Telefone/Nascimento/Documento (CPF, via `formatCpf`)/Gênero/Cadastrado em. `formatCpf('')` retorna string vazia — hoje, se o CPF fosse vazio, a linha ficaria em branco (nunca acontece hoje, mas vai acontecer com dependentes).
- `patient-list.tsx`: busca só por nome/CPF (dígitos), **sem coluna de CPF na tabela** — não quebra com CPF nulo, nada a mudar aqui além de eventualmente indicar "Dependente" (fora de escopo, não pedido).
- `professional-form.tsx` tem o precedente exato de seletor por catálogo de enum com labels (`Object.values(CouncilType)` + `COUNCIL_TYPE_LABELS[type]`) — mesmo padrão a usar para o seletor de `KinshipType`.
- `patients.service.ts` — wrapper fino sobre `apiClient`, sem lógica própria.
- Cypress: `apps/frontend/cypress/e2e/patients/` já tem `patients-create.cy.ts`, `patients-update.cy.ts`, `patients-detail.cy.ts`, `patients-delete.cy.ts`, `patients-list.cy.ts`, e variantes `-real.cy.ts` que rodam contra o backend real (mesmo padrão do split `userMode`).

**Decisões de shape (confirmadas com o usuário, já refletidas no backend):**
- Titular sempre é outro paciente cadastrado, selecionado por busca — nunca texto livre.
- CPF obrigatório por padrão; opcional só quando o paciente está marcado como dependente.
- Um único nível: ao editar, não é possível vincular um paciente que já tem dependentes próprios, nem vincular a um titular que já é dependente de outro (validado pelo backend — o frontend só precisa propagar o erro).

---

## Mudanças

### Tipos (`patients/types/patient-model.types.ts`, `patient-input.types.ts`)
```ts
export interface IPatientResponsibleRef { id: string; fullName: string; documentNumber: string | null }
export interface IPatientDependentRef { id: string; fullName: string; kinshipType: KinshipType }

export interface IPatientModel {
  // ...existentes...
  documentNumber: string | null            // era: string
  responsiblePatientId: string | null
  kinshipType: KinshipType | null
  responsiblePatient: IPatientResponsibleRef | null
  dependents: IPatientDependentRef[]
}

export interface ICreatePatientInput {
  // ...existentes...
  documentNumber?: string                  // era obrigatório
  responsiblePatientId?: string
  kinshipType?: KinshipType
}

export interface IUpdatePatientInput {
  // ...existentes...
  documentNumber?: string
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
}

export interface IPatientListParams {
  // ...existentes...
  excludeDependents?: boolean              // para a busca de titular
  excludeId?: string                       // para excluir o próprio paciente em edição
}
```

### Mappers (`mappers/to-patient-model.mapper.ts`, `to-create-patient-dto.mapper.ts`, `to-update-patient-dto.mapper.ts`)
Passthrough dos novos campos, mesmo estilo atual (funções puras, sem lógica condicional além do que já existe). Atualizar os `*.mapper.spec.ts` correspondentes com casos para os novos campos (cobertura 100%).

### `services/patients.service.ts`
`getAll` propaga `excludeDependents` e `excludeId` na querystring quando presentes, mesmo padrão do parâmetro `search` já existente.

### Novo componente — `components/titular-search.tsx`
Extraído/adaptado do `UserSearch` já existente em `patient-form.tsx`:
- Autocomplete debounced (300ms), `useQuery(['titular-search', debouncedTerm], () => patientsService.getAll({ search: debouncedTerm, excludeDependents: true, excludeId: currentPatientId, limit: 10 }))`, com `enabled: debouncedTerm.length >= 2`.
- Dropdown de resultados com fechamento ao clicar fora, integrado via `useController` do React Hook Form.
- `data-testid`s: `patient-form-titular-search`, `patient-form-titular-search-results`, `patient-form-titular-option`.
- Ao selecionar: `field.onChange(patient.id)`; exibir `${patient.fullName} (${formatCpf(patient.documentNumber) || 'sem CPF'})`.
- Prop `currentPatientId?: string` (só passada em modo edição) para excluir o próprio paciente dos resultados.

### `patient-form.tsx`
1. Novo campo de estado `isDependent: boolean` (checkbox), independente do `userMode` existente.
2. Zod: quando `isDependent === true`, `documentNumber` vira opcional (sem a regex obrigatória) e `responsiblePatientId` + `kinshipType` passam a ser obrigatórios; quando `false`, comportamento atual é preservado integralmente. Implementar via `superRefine` ou um branch condicional equivalente ao já usado para `userMode`.
3. Novo `KinshipSelect`: `Object.values(KinshipType).map(k => <option value={k}>{KINSHIP_TYPE_LABELS[k]}</option>)`, mesmo padrão do seletor de `CouncilType` em `professional-form.tsx`.
4. Quando `isDependent` está marcado, renderizar `TitularSearch` + `KinshipSelect`; o campo de CPF permanece visível mas sem asterisco de obrigatório e sem a validação de regex bloqueante.
5. **Corrigir o bug existente**: no formulário de edição, `documentNumber` (limpo da máscara) precisa ser incluído no objeto enviado ao `mutate`/`onSubmit` — hoje é omitido silenciosamente.
6. No formulário de edição, quando o paciente já é dependente, mostrar `TitularSearch`/`KinshipSelect` pré-preenchidos e uma opção explícita "Remover vínculo" que seta `responsiblePatientId: null` (distinto de não tocar no campo) — necessário exigir `documentNumber` preenchido nesse fluxo (o backend rejeita caso contrário, mas validar também no client para dar feedback imediato).

### `patient-details.tsx`
Inserir, como novo card no mesmo estilo visual do grid de detalhes existente (`rounded-xl border border-line bg-surface shadow-sm`), logo após ele:
- Se `patient.responsiblePatientId` setado: seção "Vinculado a" — nome do titular + rótulo de `KINSHIP_TYPE_LABELS[patient.kinshipType]` + link para `${basePath}/patients/${patient.responsiblePatientId}`.
- Se `patient.dependents.length > 0`: seção "Dependentes" — lista de nome + rótulo de parentesco por item, cada um linkando para `${basePath}/patients/${dependent.id}`.
- Linha "Documento (CPF)": quando `patient.documentNumber` for `null`, mostrar explicitamente "Não informado" em vez de deixar a linha em branco.

---

## Regras de negócio

- Sem mudança de permissão — só ADMIN vê os controles de criar/editar vínculo (já é assim para toda a tela de paciente).
- `isDependent` marcado exige `responsiblePatientId` + `kinshipType`; desmarcado exige `documentNumber` (comportamento atual inalterado).
- `TitularSearch` nunca deve listar o próprio paciente em edição, nem pacientes que já são dependentes de outra pessoa (backend filtra via `excludeDependents`/`excludeId`, frontend só consome).
- Erros de validação vindos do backend (409/422 sobre vínculo inválido) devem ser mapeados para os campos correspondentes via `setError`, seguindo o padrão já usado para outros erros de formulário no projeto.

---

## Estrutura de arquivos

```
apps/frontend/components/features/patients/
  types/patient-model.types.ts        ← + IPatientResponsibleRef, IPatientDependentRef, campos novos
  types/patient-input.types.ts        ← + campos novos, documentNumber opcional
  mappers/to-patient-model.mapper.ts       (+ .spec) ← passthrough dos campos novos
  mappers/to-create-patient-dto.mapper.ts  (+ .spec) ← idem
  mappers/to-update-patient-dto.mapper.ts  (+ .spec) ← idem
  services/patients.service.ts        ← + excludeDependents/excludeId na querystring
  components/
    titular-search.tsx (+ .spec)      ← NOVO, adaptado de UserSearch
    patient-form.tsx                  ← toggle isDependent, KinshipSelect, fix do bug de submit em edição
    patient-details.tsx               ← seções Vinculado a / Dependentes, CPF "Não informado"

apps/frontend/cypress/e2e/patients/
  patients-create-dependent.cy.ts     ← NOVO
  patients-titular-search.cy.ts       ← NOVO
  patients-promote-dependent.cy.ts    ← NOVO
  patients-detail.cy.ts               ← estender
  patients-list.cy.ts                 ← estender
```

---

## Cenários de teste

- `patient-form.tsx`: marcar "é dependente" torna CPF opcional e exige titular+parentesco; desmarcar volta ao comportamento atual (CPF obrigatório); submeter com dependente sem titular selecionado → erro de validação client-side antes de chamar a API.
- `TitularSearch`: digitar busca com debounce; resultados excluem dependentes e (em edição) o próprio paciente; selecionar preenche o campo; limpar reseta.
- Formulário de edição: adicionar `documentNumber` e enviar → `documentNumber` presente no payload (bug corrigido); marcar "Remover vínculo" sem CPF preenchido → bloqueado no client com mensagem clara.
- `patient-details.tsx`: paciente dependente mostra seção "Vinculado a" com nome/parentesco/link corretos; paciente titular com dependentes mostra a lista "Dependentes"; CPF nulo mostra "Não informado" em vez de branco.
- `patient-list.tsx`: lista renderiza normalmente numa mistura de pacientes com e sem CPF.
- Mappers: cobertura 100% incluindo os novos campos em todos os cenários (presentes/ausentes/nulos).
- Cypress:
  - `patients-create-dependent.cy.ts` — fluxo completo de criar um dependente sem CPF vinculado a um titular existente.
  - `patients-titular-search.cy.ts` — busca, exclusão de dependentes/self, seleção.
  - `patients-promote-dependent.cy.ts` — editar um dependente, adicionar CPF, remover vínculo, confirmar na ficha que a seção "Vinculado a" desaparece.
  - `patients-detail.cy.ts` (estendido) — seções de vínculo em ambos os sentidos.
  - `patients-list.cy.ts` (estendido) — lista mista sem quebrar.

---

## Definition of Done

- [ ] Tipos, mappers e service atualizados com os novos campos
- [ ] `TitularSearch` implementado e testado (unit + integração)
- [ ] `patient-form.tsx`: toggle "é dependente", `KinshipSelect`, validação condicional de CPF, fix do bug de submit em edição
- [ ] `patient-details.tsx`: seções "Vinculado a"/"Dependentes", CPF "Não informado" quando nulo
- [ ] Cobertura 100% (unit + integração) nos arquivos alterados/criados
- [ ] Todos os specs Cypress listados rodando e passando (`yarn workspace @app/frontend cypress:run`)
- [ ] Build e lint sem erros
- [ ] `apps/frontend/CHANGELOG.md` atualizado
