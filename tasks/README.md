# Tasks — Generalização "médicos" → "profissionais de saúde"

Plano de referência: [`PROFISSIONAIS_PLAN.md`](./PROFISSIONAIS_PLAN.md) na raiz de `tasks/`.

Cada task é uma pasta com dois arquivos:
- `task-<area>.md` — a especificação completa (contratos, contexto, regras, testes, DoD).
- `prompt-<area>.md` — cabeçalho de execução + a especificação (arquivo a ser enviado ao agente de implementação).

Estrutura espelha `tasks/done/`: `tasks/backend/<task>` e `tasks/frontend/<task>`. Ao concluir uma task, mover a pasta para `tasks/done/<area>/`.

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend inteiro precede o frontend porque o rename de `UserRole.DOCTOR`, das entidades e dos DTOs no `@app/shared` atravessa os dois lados.

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `generalizar-modelo-de-profissionais-e-tipos-de-conselho` | — | Fundacional: `CouncilType`, entidades `Professional`/`ProfessionalRegistration`/`ProfessionalSpecialty`, migrations de rename, módulo/repository/use-cases. |
| 2 | backend | `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks` | #1 | `UserRole.PROFESSIONAL`, sweep de `@Roles(...)`, branches de auto-agendamento, FK `doctorId`→`professionalId` em 8 entidades dependentes. |
| 3 | backend | `generalizar-assinatura-de-documentos-e-pdfs` | #1, #2 | Snapshot `doctor`→`professional`, `resolveProfessionalSigningIdentity`, PDFs com rótulo de conselho dinâmico, título "Atestado" generalizado. |
| 4 | backend | `atualizar-seeds-e-documentacao-multi-profissao` | #1, #2, #3 | Seeds com profissionais não-médicos, reescrita de `ai/context/permissions.md`. |
| 5 | frontend | `renomear-feature-doctors-para-professionals` | #1, #2 | Feature/rota/navegação renomeadas; formulário só movido (sem rework ainda). |
| 6 | frontend | `reformular-formulario-de-profissional-com-conselho-dinamico` | #1, #5 | Seletor de `councilType`, máscara/validação dinâmica, RQE restrito a CRM. |
| 7 | frontend | `atualizar-campos-e-copy-de-doctor-nas-demais-features` | #2, #5 | `doctorId`/`doctorName`/`isDoctor` renomeados em 9 features + copy de agenda generalizada. |
| 8 | frontend | `atualizar-e2e-para-profissionais` | #6, #7 | Suíte Cypress renomeada + novo spec de conselho não-CRM + sweep dos specs restantes. |

### Grafo de dependências

```
backend#1 ─> backend#2 ─> backend#3 ─> backend#4
    │            │
    └────────────┴─> frontend#5 ─┬─> frontend#6 ─┐
                                   └─> frontend#7 ─┴─> frontend#8
```

### Flexibilidade de ordem
- **#3** depende de #1 e #2 (precisa de `professionalId` já renomeado nos módulos de documentos) — não pode ser adiantada.
- **#4** só faz sentido depois de #1+#2+#3, pois os seeds usam o shape final das entidades/DTOs.
- **#6** e **#7** podem ser feitas em qualquer ordem entre si (ambas dependem só de #5), mas **#8** precisa das duas.
- A sequência 1→8 da tabela é a recomendada (linear, sem surpresas de dependência).

---

## Migrations (ordem dos timestamps)

| Task | Migrations |
|---|---|
| #1 | `add-council-type-to-doctor-crms`, `rename-doctor-specialty-rqe-to-registry-number`, `rename-doctors-to-professionals`, `rename-doctor-crms-to-professional-registrations`, `rename-doctor-specialties-to-professional-specialties` |
| #2 | `rename-doctor-role-to-professional`, `rename-doctor-id-to-professional-id-on-{appointments,schedules,schedule-exceptions,exam-requests,medical-certificates,medical-records,prescription-templates,prescriptions}` (8 migrations, uma por tabela) |

Todas escritas à mão (SQL explícito, não `migration:generate`) seguindo o padrão de `1752700000000-create-doctor-crms-and-migrate-crm.ts`. Testar `migration:run` + `migration:revert` localmente antes de cada merge.

---

## Decisões-chave já fechadas (ver `PROFISSIONAIS_PLAN.md` para o racional)

- Role genérica única `UserRole.PROFESSIONAL` — profissão vira atributo (`CouncilType`), não role separada.
- Catálogo de conselhos: CRM, CRN, CREFITO, CRP, CRO, COREN, CREF, CRFA.
- Rename completo e coordenado, sem camada de compatibilidade — sem redirect da rota `/doctors` antiga.
- RQE continua exclusivo de `councilType = CRM`.
- Copy específica de medicina ("Atestado Médico", "clínica geral") generalizada nesta mesma leva.
- Risco de deploy: migrations de rename são metadata-only no Postgres, mas app e banco devem mudar no mesmo deploy — confirmar `migration:run` pré-deploy no pipeline.

---

## Definition of Done (transversal a todas as tasks)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend, task #8).
- Sem violação de arquitetura, sem `process.env` fora de `env.config.ts` (backend), sem axios fora do API Client (frontend).
- Ao finalizar a feature: `ai/context/permissions.md` já reescrito na task #4; `CHANGELOG.md` de cada app atualizado por task relevante.
