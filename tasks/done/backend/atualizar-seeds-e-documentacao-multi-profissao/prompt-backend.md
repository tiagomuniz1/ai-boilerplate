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
# Task — Atualizar seeds e documentação para múltiplas profissões (Backend/Docs)

## Descrição

Última task do backend na migração "médico → profissional de saúde": atualizar os seeds de desenvolvimento/carga para semear profissionais de conselhos variados (não só CRM) e reescrever `ai/context/permissions.md` — hoje inteiramente centrado em DOCTOR/médico — para refletir o novo modelo de role/profissão genérica.

Depende de todas as tasks anteriores de backend (`generalizar-modelo-de-profissionais-e-tipos-de-conselho`, `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks`, `generalizar-assinatura-de-documentos-e-pdfs`) já estarem concluídas — os seeds usam o shape final das entidades/DTOs.

---

## Contexto

- `apps/backend/src/database/seeds/carga/carga.seed.ts`: `SPECIALTIES = [Cardiologia, Ortopedia, Neurologia, Pediatria, Dermatologia]` (100% médicas); semeia 200 registros de profissional com CRM fake e nomes `'Dr. Médico Carga ${idx}'`.
- `apps/backend/src/database/seeds/dev/dev.seed.ts`: mesmo padrão em menor escala — profissionais/registros/vínculos de especialidade/campos canônicos para ambiente de dev.
- `apps/backend/src/database/seeds/canonical-fields/canonical-fields.ts`: catálogo de campos canônicos de prontuário indexado por `specialtyName` — hoje só especialidades médicas.
- `ai/context/permissions.md`: documento de referência (carregado via `CLAUDE.md`) descrevendo a matriz de permissões por role — toda a prosa e as tabelas usam "DOCTOR"/"médico" (cabeçalho de roles, seção `## Médicos (/doctors)`, resumo por perfil, seção de verificação pública de receita).

---

## Parte A — Seeds

### `carga.seed.ts`
- Renomear variáveis/funções que referenciam `Doctor`/`doctors` para `Professional`/`professionals` (mecânico, seguindo o rename já feito no domínio).
- `SPECIALTIES`: adicionar pelo menos "Nutrição Clínica" e "Fisioterapia Ortopédica" à lista existente, cada uma com `titleName` apropriado (campo já existente em `Specialty`).
- Dos 200 registros de profissional semeados, variar `councilType` (~70% CRM, ~30% distribuído entre CRN/CREFITO/CRP) em vez de só CRM — cada um com `registrations` no `councilType` correspondente e número gerado no formato válido daquele conselho (usar `COUNCIL_REGISTRATION_FORMATS` para gerar valores plausíveis). Nomes deixam de assumir "Dr." fixo — usar um prefixo neutro por conselho (ex.: `Dr(a).` para CRM, sem prefixo ou `Prof.`/nome próprio para os demais, a critério de quem implementar, desde que não force "médico" para todos).

### `dev.seed.ts`
- Mesmo tratamento em escala menor — garantir **pelo menos um profissional não-médico** (ex.: nutricionista com CRN) com sua especialidade/registro, servindo de fixture manual de QA para o formulário novo do frontend.

### `canonical-fields.ts`
- Adicionar exemplos de campos canônicos não-médicos ligados às novas especialidades (ex.: "IMC", "circunferência abdominal" para nutrição), mantendo o padrão de chave (`canonicalKey` slug) e tipo (`MedicalRecordFieldType`) já usados.

---

## Parte B — `ai/context/permissions.md`

Reescrita completa (não é find/replace mecânico — a prosa descreve conceitos específicos de médico em vários pontos):

- Tabela de roles no topo: `DOCTOR` → `PROFESSIONAL`, descrição "Médico — gerencia a própria agenda e dados" → "Profissional de saúde — gerencia a própria agenda e dados".
- Seção `## Médicos (/doctors)` → `## Profissionais (/professionals)`, com todas as referências internas a "DOCTOR"/"médico" trocadas por "PROFESSIONAL"/"profissional" nas tabelas de permissão de: Usuários, Médicos→Profissionais, Pacientes, Agendas, Consultas, Catálogo de Campos Canônicos, Medicamentos, Templates de Prontuário, Prontuários, Sidebar.
- Seção "Resumo por perfil" — `### DOCTOR` → `### PROFESSIONAL`, prosa generalizada (ex.: "Não vê dados de outros médicos" → "Não vê dados de outros profissionais"; "Acessa o sistema para gerenciar a própria agenda, criar e acompanhar as próprias consultas" mantém o sentido, só sem menção a "médico" onde for role, não profissão).
- Seção "Verificação Pública de Receita": "a resposta traz clínica, médico (nome/CRM/especialidade)..." → "clínica, profissional (nome/registro profissional/especialidade)...".
- Revisar a tabela "Sidebar — Itens visíveis por role" (item "Médicos" → "Profissionais").

---

## Parte C — `CLAUDE.md` / `ai/context/architecture.md`

Confirmar que o diagrama de `packages/shared/src/` já foi atualizado com `config/` pela task `generalizar-modelo-de-profissionais-e-tipos-de-conselho` — se não, incluir aqui.

---

## Regras de negócio

- Seeds continuam idempotentes onde já eram (catálogo de campos canônicos "não sobrescrever se já existir, casar por `canonical_key`") — não introduzir duplicação ao rodar `seed:run` mais de uma vez.
- Seeds de `carga` continuam gerando volume de teste de carga (200 registros) — só a composição por `councilType` muda, não a quantidade.

---

## Estrutura de arquivos

```
apps/backend/src/database/seeds/
  carga/carga.seed.ts             ← especialidades + mix de councilType
  dev/dev.seed.ts                  ← + 1 profissional não-médico
  canonical-fields/canonical-fields.ts ← + campos de nutrição/fisioterapia

ai/context/permissions.md          ← reescrita completa
CLAUDE.md, ai/context/architecture.md ← confirmar diagrama shared/src/config/
```

---

## Cenários de teste

- `yarn workspace @app/backend seed:run` (dev) roda sem erro, cria pelo menos 1 profissional CRN além dos CRM.
- Seed de carga gera profissionais com `councilType` variado, cada um com `registrations` válidas para seu conselho (formato aceito pelas regras da task de domínio).
- Catálogo de campos canônicos inclui os novos campos de nutrição/fisioterapia, acessíveis via listagem existente.
- `ai/context/permissions.md` não contém mais nenhuma ocorrência de "DOCTOR" ou "médico" como termo de role (verificar manualmente, já que é documentação, não código testável automaticamente).

---

## Definition of Done

- [ ] `carga.seed.ts` com especialidades não-médicas + mix de `councilType`
- [ ] `dev.seed.ts` com pelo menos um profissional não-médico
- [ ] `canonical-fields.ts` com campos de nutrição/fisioterapia
- [ ] `ai/context/permissions.md` totalmente reescrito (zero menções a DOCTOR/médico como role)
- [ ] `CLAUDE.md`/`ai/context/architecture.md` com diagrama do shared atualizado (se ainda pendente)
- [ ] Seeds rodam sem erro em dev e test
- [ ] `CHANGELOG.md` do backend atualizado
