# Task — Permitir cadastro e agendamento de médico generalista (Frontend)

## Descrição

Adaptar o frontend para **médicos generalistas** — sem especialidade — em clínicas sem especialidades atribuídas. Três telas hoje **bloqueiam** o fluxo assumindo que todo médico tem ≥1 especialidade: cadastro de médico, agendamento de consulta e modelos de prontuário. Esta task relaxa esses bloqueios, pareando com a task de backend `permitir-medicos-e-consultas-sem-especialidade`.

> **Escopo:** apenas a Parte A (habilitar generalista). Exibição/entrada de **valores/preço** é a Parte B e **não** entra aqui.

Depende do backend já aceitar: `POST /doctors` com `specialties: []`, `POST /appointments` sem `specialtyId` (grava `null`) e template de prontuário com `specialtyId` nulo (generalista).

---

## Contexto
- **Cadastro do médico** — `apps/frontend/components/features/doctors/components/doctor-form.tsx`:
  - `specialtiesField` (linha ~38) termina com `.min(1, 'Selecione ao menos uma especialidade')` (linha 49) e é usado nos schemas de **create** (linha 60) e **update** (linha 79).
  - Já existe empty-state "Nenhuma especialidade cadastrada." (linha ~580) para clínicas sem especialidades — mas o `.min(1)` impede submeter.
- **Agendamento** — `apps/frontend/components/features/appointments/components/book-appointment-dialog.tsx`:
  - `specialtyCount === 0` hoje **bloqueia o submit** (`isSubmitBlocked`, linha 121) e exibe alerta de erro "Este médico não possui especialidade cadastrada." (linhas 150-154).
  - Schema já trata `specialtyId` como obrigatório só quando `specialtyCount > 1` (linhas 52-55); auto-seleção quando 1 (linhas 76-82); payload já envia `specialtyId: values.specialtyId || undefined` (linha 93). Tratamento de `422` de especialidade já existe (linhas 106-119).
- **Modelos de prontuário** — `apps/frontend/components/features/medical-record-templates/components/template-form.tsx`:
  - `specialtyId: z.string().optional()` já é opcional no schema (linha 78); opções vêm de `useSpecialties`. Falta uma opção explícita "Generalista (sem especialidade)" e garantir que o submit envie `specialtyId` **omitido** nesse caso.

---

## PARTE 1 — Cadastro de médico sem especialidade
`doctor-form.tsx`
- Remover `.min(1, 'Selecione ao menos uma especialidade')` de `specialtiesField` (linha 49) → array vazio válido. **Manter** o `.min(1)` de CRMs (linha 32).
- Garantir que, com `specialties.length === 0` (empty-state, linha 580), o formulário **submeta** normalmente (sem especialidades no payload). Nenhuma mudança no service/mapper (já enviam a lista como está).
- Ajustar textos/rótulos: especialidade passa a ser opcional (remover asterisco de obrigatório, se houver).

## PARTE 2 — Agendar médico generalista
`book-appointment-dialog.tsx`
- **Deixar de bloquear** o submit quando `specialtyCount === 0`: remover `(doctorLoaded && specialtyCount === 0)` de `isSubmitBlocked` (linha 121).
- Trocar o alerta de **erro** (linhas 150-154) por uma nota informativa neutra (ex.: "Médico sem especialidade — consulta será registrada como generalista"), sem impedir o agendamento. Não usar `variant="error"`.
- Manter: auto-seleção quando 1 especialidade; `<select>` obrigatório quando >1; payload já envia `specialtyId` omitido quando vazio (linha 93); tratamento de `409`/`422` inalterado.

## PARTE 3 — Modelo de prontuário de generalista
`template-form.tsx`
- Adicionar ao select de especialidade a opção **"Generalista (sem especialidade)"** (valor vazio) além das especialidades de `useSpecialties`.
- `specialtyId` já é opcional no schema; garantir que o submit envie `specialtyId` **omitido/undefined** quando "Generalista" for escolhido (não string vazia). Ajustar o mapper/serviço de criação/edição de template se necessário para não enviar `specialtyId: ''`.
- Refletir na exibição (`template-details`/`template-list`): quando `specialtyId` é nulo, rotular como "Generalista".

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar dados de API em Zustand — React Query como está.
- NÃO usar `useState` para campos de formulário — react-hook-form/zod.
- NÃO introduzir campos de preço/valor (Parte B).
- NÃO quebrar os fluxos existentes (médico com 1/N especialidades, agendamento, criação de template por especialidade).

---

## Estrutura esperada (arquivos tocados)
```
components/features/doctors/components/
  doctor-form.tsx                                   (remover .min(1) de especialidades)
  doctor-form.integration.spec.tsx                  (caso: submeter sem especialidade)
components/features/appointments/components/
  book-appointment-dialog.tsx                       (não bloquear 0 especialidade; nota neutra)
  book-appointment-dialog.integration.spec.tsx      (caso: agendar generalista)
components/features/medical-record-templates/components/
  template-form.tsx                                 (opção "Generalista"; submit sem specialtyId)
  template-form.integration.spec.tsx                (caso: criar template generalista)
  template-details.tsx / template-list.tsx          (rótulo "Generalista" quando null)
cypress/e2e/                                         (fluxo generalista, se houver e2e de doctors/appointments)
```

---

## Cenários de teste
### Integração
- **Doctor form:** clínica sem especialidades → formulário submete sem especialidade (payload `specialties: []`); com especialidades → continua funcionando (1/N).
- **Booking dialog:** médico com 0 especialidades → sem alerta de erro, submit habilitado, `mutate` chamado sem `specialtyId`; 1 → auto-selecionado; >1 → obrigatório; `422` de especialidade → mensagem exibida.
- **Template form:** escolher "Generalista" → submit sem `specialtyId`; escolher especialidade → envia `specialtyId`; detalhes/listagem mostram "Generalista" quando nulo.
### E2E (se aplicável)
- ADMIN cadastra médico só com CRM (sem especialidade) → salvo.
- ADMIN agenda esse médico → consulta criada (generalista).

---

## Definition of Done
- [ ] `doctor-form`: `.min(1)` de especialidades removido; submete sem especialidade; CRM continua obrigatório
- [ ] `book-appointment-dialog`: 0 especialidade não bloqueia submit; nota neutra em vez de erro; envia `specialtyId` omitido
- [ ] `template-form`: opção "Generalista" (sem especialidade); submit sem `specialtyId`; rótulo "Generalista" na exibição
- [ ] Fluxos existentes preservados (1/N especialidades, 409/422)
- [ ] Sem axios fora do API Client; nada de API em Zustand; sem campos de preço
- [ ] Testes de integração cobrindo generalista nas três telas; e2e se aplicável
- [ ] Naming convention seguida; build e lint sem erros
```
