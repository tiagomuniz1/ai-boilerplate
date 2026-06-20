# Tasks — Feature de Prontuários (Medical Records)

Plano de referência: [`MEDICAL_RECORDS_PLAN.md`](../MEDICAL_RECORDS_PLAN.md) na raiz do projeto.

Cada task é uma pasta com dois arquivos:
- `task-<area>.md` — a especificação completa (contratos, fluxos, regras, testes, DoD).
- `prompt-<area>.md` — cabeçalho de execução + a especificação (arquivo a ser enviado ao agente de implementação).

Estrutura espelha `tasks/done/`: `tasks/backend/<task>` e `tasks/frontend/<task>`. Ao concluir uma task, mover a pasta para `tasks/done/<area>/`.

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend inteiro precede o frontend porque mudanças de DTO no `@app/shared` (consulta com `specialtyId`) atravessam os dois lados.

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `criar-modulo-de-campos-canonicos-de-prontuario` | — | Catálogo canônico da plataforma. Cria o enum `MedicalRecordFieldType` e os DTOs de campo/opção usados pelas demais. |
| 2 | backend | `criar-modulo-de-templates-de-prontuario` | #1 | Templates por `clinic + specialty` (fields JSONB, key gerada, validação de `canonicalKey`). |
| 3 | backend | `vincular-especialidade-a-consulta-e-regra-de-exclusao-de-especialidade` | — (precede #4) | Adiciona `specialty_id` à consulta (auto-resolve quando o médico tem 1) + bloqueia delete de especialidade com clínica/consulta vinculada. |
| 4 | backend | `criar-modulo-de-prontuarios` | #2, #3 | Prontuário 1:1 com a consulta: herança de especialidade, snapshot do template, validação `data`×schema, guard + FK composta. |
| 5 | frontend | `criar-telas-de-gestao-do-catalogo-de-campos-canonicos` | #1 | Gestão do catálogo pelo PLATFORM_ADMIN (backoffice): listar/criar/editar/ativar-desativar. |
| 6 | frontend | `criar-telas-de-modelos-de-prontuario` | #1, #2 | Builder de templates (ADMIN) + `CanonicalFieldPicker` consumindo o catálogo. |
| 7 | frontend | `adicionar-selecao-de-especialidade-no-agendamento` | #3 | Seletor de especialidade no `book-appointment-dialog` (auto-seleção quando única). |
| 8 | frontend | `criar-telas-de-prontuarios` | #4, #6, #7 | Form dinâmico (render por `type`), visualização, histórico do paciente e integração na consulta. |

### Grafo de dependências

```
#1 ─┬─> #2 ─────────────┐
    │                    ├─> #4 ─┐
    │     #3 ────────────┘       │
    │      │                     │
    ├─> #5  │                     │
    └─> #6 ─┼─────────────────────┼─> #8
            └─> #7 ───────────────┘
```

### Flexibilidade de ordem
- **#5** depende apenas do backend **#1** — pode ser executada logo após #1, se preferir adiantar a área de backoffice.
- **#3** é independente de #1/#2 — pode ser feita em paralelo no backend, desde que antes de #4 e #7.
- **#7** depende só de #3 — pode vir antes de #5/#6 se o foco for o fluxo de agendamento.
- A sequência 1→8 da tabela é a recomendada (linear, sem surpresas de dependência).

---

## Migrations (ordem dos timestamps)

| Task | Migration |
|---|---|
| #1 | `1750600000000-create-medical-record-canonical-fields-table` |
| #2 | `1750700000000-create-medical-record-templates-table` |
| #3 | `1750800000000-add-specialty-id-to-appointments` |
| #4 | `1750900000000-create-medical-records-table` |

---

## Decisões-chave já fechadas (ver plano para o racional)

- Template por `clinic + specialty` — **sem** customização por médico.
- Especialidade escolhida no **agendamento** e **herdada** pelo prontuário (sem override).
- Estrutura dos campos em **JSONB**; `key` gerada pelo backend e imutável; `options` no formato `{ value, label }`.
- `template_schema_snapshot` por prontuário (imutabilidade clínica/legal).
- Invariante `template.specialty == record.specialty` reforçada em **duas camadas** (guard no use-case + FK composta no banco).
- Catálogo canônico **sugere** campos (não trava) para aumentar aderência e relatabilidade cross-clínica. MongoDB descartado (ver D9).
- Relatórios analíticos sobre conteúdo clínico (camada 4 / colunas tipadas / BI) ficam para quando houver demanda.

---

## Definition of Done (transversal a todas as tasks)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura, sem `process.env` fora de `env.config.ts` (backend), sem axios fora do API Client (frontend).
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (matriz de templates/prontuários/catálogo) e o `CHANGELOG.md` de cada app.
