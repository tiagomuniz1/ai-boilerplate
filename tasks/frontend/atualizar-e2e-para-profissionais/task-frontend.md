# Task — Atualizar testes E2E para profissionais (Frontend/Cypress)

## Descrição

Última task da migração "médico → profissional de saúde": renomear a suíte Cypress `cypress/e2e/doctors/` para `professionals/`, adicionar cobertura do novo fluxo de seleção de conselho (`councilType`), e varrer os ~30 specs restantes que referenciam `doctorId`/fixtures/copy de "médico". Depende de `reformular-formulario-de-profissional-com-conselho-dinamico` e `atualizar-campos-e-copy-de-doctor-nas-demais-features` já estarem concluídas — os seletores `data-testid` e a copy precisam estar no shape final antes de ajustar os specs.

---

## Contexto

- `cypress/e2e/doctors/` — 5 specs: `doctors-create.cy.ts`, `doctors-delete.cy.ts`, `doctors-detail.cy.ts`, `doctors-list.cy.ts`, `doctors-update.cy.ts`.
- Hoje a suíte só exercita o caminho CRM — não há cobertura do formulário com outro `councilType`.
- ~30 outros specs em `appointments/`, `schedules/`, `exames/`, `medical-records/`, `users/`, `clinics/`, `mobile/` referenciam `doctorId` em fixtures, seletores `[data-testid*="doctor"]` e asserções de texto "médico"/"Médico" (ex.: teste de badge de perfil em `users/`).

---

## Mudanças

### Suíte de profissionais
`cypress/e2e/doctors/` → `cypress/e2e/professionals/`:
- `doctors-create.cy.ts` → `professionals-create.cy.ts`
- `doctors-delete.cy.ts` → `professionals-delete.cy.ts`
- `doctors-detail.cy.ts` → `professionals-detail.cy.ts`
- `doctors-list.cy.ts` → `professionals-list.cy.ts`
- `doctors-update.cy.ts` → `professionals-update.cy.ts`

Atualizar todos os seletores `data-testid` para os novos nomes (`professional-form`, `professional-list`, `professional-form-registration-group`, etc., conforme definido nas tasks de frontend anteriores) e a copy esperada nas asserções ("Novo profissional", "Profissional ativo", etc.).

### Novo spec — fluxo de conselho não-CRM
Adicionar um novo teste (em `professionals-create.cy.ts` ou um spec dedicado `professionals-create-non-crm.cy.ts`) cobrindo: criar um profissional com `councilType = CRN`, preenchendo o número no formato correto (`12345678`), sem RQE disponível na especialidade — valida ponta a ponta o rework do formulário feito na task de frontend dedicada.

### Sweep dos ~30 specs restantes
Para cada spec em `appointments/`, `schedules/`, `exames/`, `medical-records/`, `users/`, `clinics/`, `mobile/`:
- Fixtures/mocks com campo `doctorId` → `professionalId`.
- Seletores `[data-testid*="doctor"]` → `[data-testid*="professional"]`.
- Asserções de texto literal "médico"/"Médico" → "profissional"/"Profissional".
- `users/` — teste de badge de perfil que hoje afirma "shows Médico profile badge when isDoctor is true" → "shows Profissional profile badge when isProfessional is true", ajustando fixture e asserção.

---

## Regras de negócio

- Nenhuma mudança de comportamento de produto — só ajuste de testes para acompanhar o rename feito nas tasks anteriores.
- O novo spec de `councilType` não-CRM é cobertura nova (não existia antes), não um rename.

---

## Estrutura de arquivos

```
cypress/e2e/professionals/          ← renomeado de doctors/
  professionals-create.cy.ts
  professionals-delete.cy.ts
  professionals-detail.cy.ts
  professionals-list.cy.ts
  professionals-update.cy.ts
  professionals-create-non-crm.cy.ts  ← NOVO (ou inline em professionals-create.cy.ts)

cypress/e2e/appointments/*.cy.ts
cypress/e2e/schedules/*.cy.ts
cypress/e2e/exames/*.cy.ts
cypress/e2e/medical-records/*.cy.ts
cypress/e2e/users/*.cy.ts
cypress/e2e/clinics/*.cy.ts
cypress/e2e/mobile/*.cy.ts

cypress/fixtures/*                  ← campos doctorId → professionalId onde aplicável
```

---

## Cenários de teste (a própria task é sobre testes — critérios de aceite da suíte)

- Suíte `professionals/` completa passa em modo headless (`yarn workspace @app/frontend cypress:run`).
- Novo teste de criação com `councilType = CRN` passa, validando máscara/placeholder/validação dinâmicos.
- Todos os specs de `appointments`, `schedules`, `exames`, `medical-records`, `users`, `clinics`, `mobile` continuam passando após o sweep de fixtures/seletores/copy.
- Nenhum seletor `[data-testid*="doctor"]` ou fixture com campo `doctorId` remanescente em toda a suíte Cypress.

---

## Definition of Done

- [ ] `cypress/e2e/professionals/` criada, `cypress/e2e/doctors/` removida
- [ ] Novo spec de criação com `councilType` não-CRM
- [ ] ~30 specs restantes ajustados (fixtures, seletores, copy)
- [ ] `yarn workspace @app/frontend cypress:run` verde de ponta a ponta
- [ ] Grep de `doctor` (case-insensitive) em `cypress/` retorna zero resultados fora de eventuais comentários históricos justificados
- [ ] `CHANGELOG.md` do frontend atualizado encerrando a migração "médico → profissional de saúde"
