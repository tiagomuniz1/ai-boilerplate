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
# Task — Renomear feature `doctors` para `professionals` (Frontend)

## Descrição

Renomear a feature `components/features/doctors/` para `professionals/` (tipos, service, use-cases, hooks, mappers, listagem/detalhes/delete-dialog), a rota `/doctors` para `/professionals` e o item de navegação correspondente. Depende das tasks de backend `generalizar-modelo-de-profissionais-e-tipos-de-conselho` e `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks` já estarem concluídas (consome `@app/shared` com `CreateProfessionalDto`, `UserRole.PROFESSIONAL`, `CouncilType`).

**Fora de escopo desta task**: o rework do formulário (`doctor-form.tsx` → seletor dinâmico de conselho) fica na task `reformular-formulario-de-profissional-com-conselho-dinamico` — aqui o formulário é só renomeado/religado aos novos tipos, sem mudança de comportamento de validação ainda (isso evita misturar rename mecânico com rework funcional no mesmo diff).

Sem redirect da rota antiga `/doctors` (decisão confirmada) — a URL antiga simplesmente deixa de existir (404).

---

## Contexto

- Feature atual: `apps/frontend/components/features/doctors/{types,services,use-cases,mappers,hooks,components}`.
- Tipos (`doctor-model.types.ts`): `IDoctorModel { id, user, crms: IDoctorCrmModel[], specialties, bio, createdAt, updatedAt }`, `IDoctorCrmModel { id, number, state, isPrimary }`, `IDoctorSpecialtyModel { id, name, rqe }`.
- Rota: `apps/frontend/app/[slug]/(authenticated)/doctors/{page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx}`.
- Navegação: `apps/frontend/lib/constants.tsx` — `NAVIGATION_ITEMS` tem `{ id: 'doctors', label: 'Médicos', href: '/doctors', requiredRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER] }`; mais 4 outras ocorrências de `UserRole.DOCTOR` no mesmo arquivo (confirmadas nas linhas 58/130/133/252/276/303 antes do rename de role).
- `specialties` feature (não renomeada, já é genérica): mensagem de erro "...está vinculada a médicos ativos" em `app/backoffice/(authenticated)/specialties/[id]/page.tsx` e `components/features/specialties/components/specialty-list.tsx` — trocar para "...está vinculada a profissionais ativos".

---

## Mudanças

### Rename da feature (kebab-case + sufixo, `frontend.md`)

| Antigo | Novo |
|---|---|
| `types/doctor-model.types.ts` — `IDoctorModel`, `IDoctorCrmModel{id,number,state,isPrimary}`, `IDoctorSpecialtyModel{id,name,rqe}` | `types/professional-model.types.ts` — `IProfessionalModel`, `IProfessionalRegistrationModel{id,councilType,number,state,isPrimary}`, `IProfessionalSpecialtyModel{id,name,registryNumber}` |
| `types/doctor-input.types.ts` — `ICreateDoctorInput`, `IUpdateDoctorInput`, `IDoctorCrmInput` | `types/professional-input.types.ts` — `ICreateProfessionalInput`, `IUpdateProfessionalInput`, `IProfessionalRegistrationInput{+councilType}` |
| `services/doctors.service.ts` | `services/professionals.service.ts` |
| `use-cases/create-doctor.use-case.ts`, `delete-doctor.use-case.ts`, `get-doctor.use-case.ts`, `list-doctors.use-case.ts`, `update-doctor.use-case.ts` (+ specs) | `create-professional.use-case.ts`, `delete-professional.use-case.ts`, `get-professional.use-case.ts`, `list-professionals.use-case.ts`, `update-professional.use-case.ts` |
| `hooks/use-create-doctor.hook.ts`, `use-delete-doctor.hook.ts`, `use-doctor.hook.ts`, `use-doctors.hook.ts`, `use-update-doctor.hook.ts` (+ specs) | `use-create-professional.hook.ts`, `use-delete-professional.hook.ts`, `use-professional.hook.ts`, `use-professionals.hook.ts`, `use-update-professional.hook.ts` |
| `mappers/to-create-doctor-dto.mapper.ts`, `to-doctor-model.mapper.ts`, `to-update-doctor-dto.mapper.ts` (+ specs) | `to-create-professional-dto.mapper.ts`, `to-professional-model.mapper.ts`, `to-update-professional-dto.mapper.ts` |
| `components/doctor-list.tsx`, `doctor-list-skeleton.tsx` | `components/professional-list.tsx`, `professional-list-skeleton.tsx` |
| `components/doctor-details.tsx` | `components/professional-details.tsx` |
| `components/doctor-delete-dialog.tsx` | `components/professional-delete-dialog.tsx` |
| `components/doctor-form.tsx` (movido, sem rework de validação ainda — ver task dedicada) | `components/professional-form.tsx` |
| `components/doctor-signature-select.tsx` (movido, exibição de "CRM" vira lookup em `COUNCIL_TYPE_LABELS` — ver task de PDFs/assinatura equivalente no frontend, tratada na task `atualizar-campos-e-copy-de-doctor-nas-demais-features`) | `components/professional-signature-select.tsx` |

Todos os `data-testid` (`doctor-list`, `doctor-details`, etc. — exceto os internos do formulário, tratados na task de rework) renomeados para `professional-*`.

### Rota
`apps/frontend/app/[slug]/(authenticated)/doctors/` → `.../professionals/` (4 arquivos). Copy: "Novo médico"→"Novo profissional", "Editar médico"→"Editar profissional", "Excluir médico"→"Excluir profissional", "Médico não encontrado"→"Profissional não encontrado", mensagem de conflito de registro generalizada (ex.: "Registro já cadastrado para outro perfil de profissional" no lugar de "CRM já cadastrado...perfil de médico").

### Navegação
`lib/constants.tsx`: item `{ id: 'doctors', label: 'Médicos', href: '/doctors' }` → `{ id: 'professionals', label: 'Profissionais', href: '/professionals' }`; demais `UserRole.DOCTOR` no arquivo → `UserRole.PROFESSIONAL`.

### `specialties`
Mensagem de erro "...está vinculada a médicos ativos" → "...está vinculada a profissionais ativos" em `app/backoffice/(authenticated)/specialties/[id]/page.tsx` e `components/features/specialties/components/specialty-list.tsx` — única mudança necessária nessa feature (modelo de dados já é genérico).

---

## Estrutura de arquivos

```
apps/frontend/components/features/professionals/   ← renomeado de doctors/
  types/professional-model.types.ts
  types/professional-input.types.ts
  services/professionals.service.ts
  use-cases/{create,delete,get,list,update}-professional.use-case.ts (+ specs)
  hooks/use-{create,delete,update}-professional.hook.ts, use-professional.hook.ts, use-professionals.hook.ts (+ specs)
  mappers/to-{create,update}-professional-dto.mapper.ts, to-professional-model.mapper.ts (+ specs)
  components/professional-{list,list-skeleton,details,delete-dialog,form,signature-select}.tsx

apps/frontend/app/[slug]/(authenticated)/professionals/  ← renomeado de doctors/
  page.tsx
  new/page.tsx
  [id]/page.tsx
  [id]/edit/page.tsx

apps/frontend/lib/constants.tsx                     ← NAVIGATION_ITEMS + UserRole.PROFESSIONAL
apps/frontend/components/features/specialties/components/specialty-list.tsx  ← copy
apps/frontend/app/backoffice/(authenticated)/specialties/[id]/page.tsx        ← copy
```

---

## Cenários de teste

- Rota `/[slug]/professionals` lista, cria, edita e exclui profissionais (fluxo básico, sem testar ainda o seletor de conselho — isso é da task de rework).
- Rota antiga `/[slug]/doctors` retorna 404 (sem redirect).
- Item de navegação "Profissionais" aparece para ADMIN/PROFESSIONAL/USER, com o `href` correto.
- Mensagem de erro ao excluir especialidade vinculada a profissionais ativos usa a nova copy.
- Testes de integração (React Testing Library) cobrindo loading/error/success da listagem e do form (sem alterar comportamento de validação).

---

## Definition of Done

- [ ] Feature `professionals/` completa, renomeada de `doctors/`
- [ ] Rota `/[slug]/professionals` funcional, rota antiga 404
- [ ] Navegação atualizada (label, href, roles)
- [ ] Copy de `specialties` generalizada
- [ ] `data-testid`s renomeados (exceto internos do form, que serão renomeados na task de rework)
- [ ] Testes unitários 100% + integração (loading/error/success)
- [ ] Build e lint sem erros
- [ ] Nenhuma referência residual a `doctor`/`Doctor`/`/doctors` fora do form (tratado na próxima task) e do sweep de campos (tratado em `atualizar-campos-e-copy-de-doctor-nas-demais-features`)
