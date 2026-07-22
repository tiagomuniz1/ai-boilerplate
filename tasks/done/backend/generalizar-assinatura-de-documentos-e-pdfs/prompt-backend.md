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
# Task — Generalizar assinatura de documentos e PDFs (Backend)

## Descrição

Os três geradores de PDF (receita, atestado, pedido de exame) hoje imprimem `CRM {number}` fixo no rodapé, lido de um snapshot com chave `doctor`. Esta task generaliza a identidade de assinatura para qualquer `councilType` (não só CRM), renomeando `doctor` → `professional` nos tipos de snapshot e trocando o texto fixo `"CRM"` por um rótulo dinâmico vindo de `COUNCIL_TYPE_LABELS`. Também generaliza o título hardcoded `"Atestado Médico"` para `"Atestado"`.

Depende da task `generalizar-modelo-de-profissionais-e-tipos-de-conselho` (para `CouncilType`, `COUNCIL_TYPE_LABELS`, `ProfessionalRegistration`) e da task `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks` (para os módulos `prescriptions`/`medical-certificates`/`exams` já usarem `professionalId`).

---

## Contexto

- `apps/backend/src/modules/professionals/utils/resolve-doctor-signing-identity.ts` (`resolveDoctorSigningIdentity`) computa `{ crmNumber, rqe, specialtyName }` a partir do profissional + especialidade da consulta, consumido pelos três use-cases de criação de documento (`create-prescription`, `create-medical-certificate`, `create-exam-request`) para montar o snapshot.
- Tipos de snapshot (`packages/shared/src/types/prescription-snapshot.type.ts`, `medical-certificate-snapshot.type.ts`, `exam-request-snapshot.type.ts`) têm hoje `doctor: { name, crmNumber, rqe, specialtyName }` — shape idêntico nos três.
- PDF builders (`prescriptions/services/prescription-pdf-builder.service.ts`, `medical-certificates/services/medical-certificate-pdf-builder.service.ts`, `exams/services/exam-request-pdf-builder.service.ts`) renderizam:
  ```ts
  { text: `CRM ${snapshot.doctor.crmNumber}${snapshot.doctor.rqe ? ` · RQE ${snapshot.doctor.rqe}` : ''}`, fontSize: 9 }
  ```
- `medical-certificate-pdf-builder.service.ts` também hardcoda o título do documento como `'Atestado Médico'` — generalizar para `'Atestado'` (decisão confirmada: generalizar copy específica de medicina nesta leva, já que um atestado emitido por um nutricionista não deveria se chamar "Atestado Médico").
- A verificação pública de receita (`GET /prescriptions/verify/:token`, endpoint `@Public`) também expõe dados do profissional (nome/CRM mascarado/especialidade) — usa o mesmo snapshot, então o rename propaga automaticamente.

---

## Mudanças

### 1. Tipos de snapshot (shared)
Nos três arquivos `*-snapshot.type.ts`: renomear chave `doctor` → `professional`, shape novo:
```ts
professional: {
  name: string
  councilType: CouncilType
  registrationNumber: string   // antes: crmNumber
  registryNumber: string | null // antes: rqe
  specialtyName: string | null
}
```

### 2. `resolveProfessionalSigningIdentity` (renomeado de `resolveDoctorSigningIdentity`)
`apps/backend/src/modules/professionals/utils/resolve-professional-signing-identity.ts`:
- Busca o registro principal (`professional.registrations.find(r => r.isPrimary)`).
- Retorna `{ councilType: primaryRegistration.councilType, registrationNumber: primaryRegistration.number, registryNumber: <registryNumber da especialidade da consulta, se houver>, specialtyName }` — mesma lógica de resolução de especialidade de hoje, só nomes trocados.
- Tipo de retorno `ProfessionalSigningIdentity` (renomeado de `DoctorSigningIdentity`).

### 3. Use-cases consumidores
`create-prescription.use-case.ts`, `create-medical-certificate.use-case.ts`, `create-exam-request.use-case.ts`: ao montar o snapshot, usar `resolveProfessionalSigningIdentity` e mapear o resultado para a chave `professional` (era `doctor`) no snapshot persistido.

### 4. PDF builders
Trocar o texto fixo `CRM ${...}` por lookup dinâmico:
```ts
const label = COUNCIL_TYPE_LABELS[snapshot.professional.councilType]
{ text: `${label} ${snapshot.professional.registrationNumber}${snapshot.professional.registryNumber ? ` · RQE ${snapshot.professional.registryNumber}` : ''}`, fontSize: 9 }
```
O segmento `· RQE ...` continua condicional à presença de `registryNumber` (que só é populado quando o profissional é CRM, por regra da task de domínio) — não trocar o rótulo "RQE" por algo dinâmico, é um termo específico de CRM mesmo quando presente.

`medical-certificate-pdf-builder.service.ts`: título do documento `'Atestado Médico'` → `'Atestado'`.

### 5. Verificação pública de receita
`prescriptions` — endpoint `verify/:token` e seu use-case: ajustar leitura do snapshot para a chave `professional` (rename mecânico, sem mudança de dados expostos — nome, registro mascarado, especialidade continuam os mesmos campos, só renomeados).

---

## Regras de negócio

- Nenhuma mudança na regra de mascaramento de CPF/dados do paciente na verificação pública — fora de escopo desta task.
- O segmento de RQE no PDF só aparece quando há dado (`registryNumber` truthy) — comportamento idêntico ao atual, agora condicionado à presença do dado em vez de a uma checagem implícita de profissão.
- Snapshot é imutável após emissão do documento (regra já existente) — esta task só muda o *shape* de novos documentos emitidos após o deploy; documentos já emitidos mantêm o shape antigo persistido (não há migração de dado de snapshots existentes, são JSON histórico).

---

## Estrutura de arquivos

```
packages/shared/src/types/
  prescription-snapshot.type.ts           ← doctor → professional
  medical-certificate-snapshot.type.ts    ← idem
  exam-request-snapshot.type.ts           ← idem

apps/backend/src/modules/professionals/utils/
  resolve-professional-signing-identity.ts ← renomeado de resolve-doctor-signing-identity.ts

apps/backend/src/modules/prescriptions/
  use-cases/create-prescription.use-case.ts
  services/prescription-pdf-builder.service.ts
  use-cases/verify-prescription.use-case.ts (ou equivalente do endpoint público)

apps/backend/src/modules/medical-certificates/
  use-cases/create-medical-certificate.use-case.ts
  services/medical-certificate-pdf-builder.service.ts   ← + título 'Atestado' (era 'Atestado Médico')

apps/backend/src/modules/exams/
  use-cases/create-exam-request.use-case.ts
  services/exam-request-pdf-builder.service.ts
```

---

## Cenários de teste

- `resolveProfessionalSigningIdentity`: profissional CRM com especialidade que tem `registryNumber` → retorna os 3 campos preenchidos; profissional CRN (sem `registryNumber` nunca preenchido por regra de domínio) → `registryNumber: null`.
- PDF de receita/atestado/pedido de exame emitido por profissional CRM → rodapé mostra `"CRM 12345 · RQE 123"` (quando há RQE) ou só `"CRM 12345"`.
- PDF emitido por profissional CRN/CREFITO/CRP → rodapé mostra o rótulo correto (`"CRN 12345678"`, etc.), sem segmento de RQE.
- Atestado emitido por qualquer profissional → título do documento é `"Atestado"` (não mais `"Atestado Médico"`).
- Verificação pública de receita: resposta expõe `professional.name`/registro mascarado/`specialtyName` corretamente, independentemente do `councilType`.
- Snapshots já persistidos antes do deploy (shape antigo `doctor.crmNumber`) — confirmar que nenhum código novo tenta ler a chave antiga (não há necessidade de migrar dado histórico, mas não deve haver crash ao exibir/verificar documentos antigos se algum fluxo de leitura ainda existir; se não houver tal fluxo, apenas documentar essa limitação nos comentários de PR).

---

## Definition of Done

- [ ] Tipos de snapshot renomeados (`professional` no lugar de `doctor`, `registrationNumber`/`registryNumber` no lugar de `crmNumber`/`rqe`) nos 3 arquivos
- [ ] `resolveProfessionalSigningIdentity` renomeada e retornando `councilType`
- [ ] 3 use-cases de criação de documento atualizados
- [ ] 3 PDF builders renderizando rótulo de conselho dinâmico via `COUNCIL_TYPE_LABELS`
- [ ] Título do atestado generalizado para `'Atestado'`
- [ ] Verificação pública de receita ajustada para o novo shape de snapshot
- [ ] Testes unitários 100% + integração cobrindo os cenários acima (incluindo geração de PDF com múltiplos `councilType`)
- [ ] Build e lint sem erros
