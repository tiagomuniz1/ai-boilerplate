# Dependentes de Pacientes — Grau de Parentesco (Dependente sem CPF)

> **Status: planejado, não iniciado.** Levantado em 2026-07-31 a partir de um pedido do usuário: precisamos relacionar pacientes por grau de parentesco, permitindo que um dependente (ex.: recém-nascido, menor) seja cadastrado sem CPF, já que em muitos casos o documento ainda não foi emitido. Ver ordem de execução ao final.

## Contexto

Hoje `documentNumber` (CPF) é obrigatório para todo paciente, ponta a ponta: schema (`char(11) NOT NULL`), DTO (`@Matches(/^\d{11}$/)` sem `@IsOptional`), formulário (regex obrigatória) e tipos do frontend. Isso não reflete a realidade: recém-nascidos e alguns menores ainda não têm CPF emitido, mas precisam ser cadastrados como pacientes (para agendar consulta, ter prontuário, etc.) vinculados a um responsável.

**Decisões confirmadas com o usuário:**
1. O titular responsável por um dependente é sempre **outro paciente já cadastrado** na mesma clínica (selecionado por busca) — não um campo de texto livre.
2. CPF continua **obrigatório por padrão**. Só fica opcional quando o paciente tem um `responsiblePatientId` setado (está vinculado como dependente de um titular).
3. **Um único nível de vínculo**: um paciente é titular (padrão, sem vínculo) ou dependente de exatamente um titular; um dependente não pode ter dependentes próprios (sem árvore/ciclos). Quando o dependente obtém CPF (ex.: atinge a maioridade ou o documento sai), o ADMIN edita o cadastro, informa o CPF e remove o vínculo — passando a ser titular.
4. Só **ADMIN** cria/edita/exclui paciente (`ai/context/permissions.md`) — logo só ADMIN cria ou altera o vínculo de parentesco. Nenhuma mudança de RBAC é necessária.

A investigação (3 exploradores + 1 agente de planejamento, todos convergentes) identificou um risco crítico não óbvio: **os geradores de PDF de receita, atestado e pedido de exame, e o endpoint público de verificação de receita, assumem `documentNumber` como string não-nula** e vão lançar `TypeError` em `.replace()` se o valor virar `null`. Isso precisa ser corrigido junto — senão a emissão de receita para um paciente dependente sem CPF derruba o backend.

Também é a **primeira relação auto-referenciada** (entidade apontando para outra linha da mesma entidade) do backend — não existe precedente direto no código para copiar, mas o TypeORM suporta via `@ManyToOne(() => Patient, ...)` com a mesma sintaxe já usada para relações entre entidades diferentes.

## Backend

Task completa em `tasks/backend/relacionar-pacientes-por-grau-de-parentesco/`. Resumo:
- Novo enum `KinshipType` + `KINSHIP_TYPE_LABELS` em `packages/shared` (mesmo padrão de `CouncilType`/`COUNCIL_TYPE_LABELS`).
- `documentNumber` vira opcional em `CreatePatientDto` (condicionado a `!responsiblePatientId`, mesmo padrão de `@ValidateIf` já usado em `fullName`/`email` no mesmo DTO) e ganha suporte em `UpdatePatientDto` (hoje não existe lá — CPF é imutável após criação).
- Entidade `Patient` ganha `responsiblePatientId`/`responsiblePatient` (self-relation nullable) e `kinshipType`; `documentNumber` vira `string | null`.
- Uma migration nova: `document_number` perde `NOT NULL`, novas colunas `responsible_patient_id`/`kinship_type`, índice e `CHECK` constraint garantindo que os dois campos vêm juntos ou nenhum dos dois.
- Use-cases de criar/editar/excluir paciente ganham as regras de negócio do vínculo (titular precisa existir, não pode ser ele mesmo um dependente, não pode ter dependentes ativos ao virar dependente, não pode ser excluído com dependentes ativos).
- Correção de null-safety em `prescription-mask.util.ts`, nos 3 PDF builders (receita/exame/atestado) e nos tipos de snapshot correspondentes.

## Frontend

Task completa em `tasks/frontend/relacionar-pacientes-por-grau-de-parentesco/`. Resumo:
- Tipos/mapper/service do paciente ganham os novos campos (`documentNumber` nullable, `responsiblePatientId`, `kinshipType`, `responsiblePatient`, `dependents`).
- Novo componente `titular-search.tsx`, extraído/adaptado do `UserSearch` já existente em `patient-form.tsx` (mesma busca debounced, trocando usuários por pacientes elegíveis a titular).
- `patient-form.tsx` ganha um toggle "é dependente" que torna o CPF opcional e exige titular + grau de parentesco (seletor no mesmo padrão do `CouncilType` em `professional-form.tsx`).
- Correção de um bug existente: o formulário de edição hoje renderiza `documentNumber` mas não o envia no submit — precisa ser corrigido para viabilizar "adicionar CPF depois".
- `patient-details.tsx` ganha seções "Vinculado a" (quando o paciente é dependente) e "Dependentes" (quando é titular), e mostra "Não informado" quando o CPF é nulo.
- Cobertura completa de Cypress para os novos fluxos.

## Testes

- **Backend**: unitário 100% nos use-cases e nos guards de null-safety; integração cobrindo criação/edição/exclusão com e sem vínculo; migration testada com `migration:run` + `migration:revert`; teste de integração confirmando que um dependente sem CPF passa por consulta → receita/atestado/exame → verificação pública sem erro 500.
- **Frontend**: unit/integração nas 4 camadas + componentes (loading/error/success); Cypress cobrindo criação de dependente, busca de titular, promoção a independente, e renderização da ficha em ambos os sentidos do vínculo.

## Ordem de execução

1. Shared: `KinshipType` + `KINSHIP_TYPE_LABELS` + DTOs (`CreatePatientDto`/`UpdatePatientDto`/`PatientResponseDto`) + tipos de snapshot + `AppointmentPatientDto`
2. Backend: entidade + migration + repository (incl. `findActiveDependents`, batch-load de refs, filtro `excludeDependents`)
3. Backend: use-cases (criar/editar/excluir/buscar/listar paciente) + testes unitários
4. Backend: null-safety em `prescription-mask.util.ts` + 3 PDF builders + testes
5. Backend: testes de integração (incl. fluxo ponta a ponta consulta → documento → verificação pública)
6. Frontend: tipos/mapper/service
7. Frontend: `titular-search.tsx`
8. Frontend: `patient-form.tsx` (toggle dependente + fix do bug de submit em edição)
9. Frontend: `patient-details.tsx` (seções Vinculado a / Dependentes)
10. Frontend: Cypress E2E
11. Atualizar `ai/context/permissions.md` (nota de que o vínculo segue a regra ADMIN-only já existente) e os `CHANGELOG.md` dos dois apps

## Verificação

- `yarn workspace @app/backend migration:run` local antes de testar manualmente
- `yarn workspace @app/backend test:unit --coverage` — 100% nos arquivos alterados
- `yarn workspace @app/backend test:integration` — cria dependente sem CPF, promove a independente, bloqueia exclusão de titular com dependentes, confirma emissão de documentos sem crash
- `yarn workspace @app/frontend test` — unit + integration
- `yarn workspace @app/frontend cypress:run` — specs novos de `patients`
- Teste manual: cadastrar um paciente titular, cadastrar um dependente sem CPF vinculado a ele, verificar a ficha de ambos (seções "Vinculado a"/"Dependentes"), depois editar o dependente adicionando CPF e removendo o vínculo, confirmando que ele passa a aparecer como independente.
