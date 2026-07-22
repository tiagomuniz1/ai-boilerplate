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
# Task — Reformular formulário de profissional com seletor de conselho dinâmico (Frontend)

## Descrição

Rework funcional (não só rename) do `professional-form.tsx` (renomeado de `doctor-form.tsx` na task anterior): hoje o formulário assume CRM fixo (6 dígitos numéricos + UF). Esta task adiciona um seletor de `councilType` por linha de registro e torna a máscara/validação/placeholder dinâmicos por conselho, usando `COUNCIL_REGISTRATION_FORMATS` do `@app/shared`. Também atualiza `professional-signature-select.tsx` para exibir o rótulo de conselho correto.

Depende de `renomear-feature-doctors-para-professionals` (arquivo já movido/renomeado) e da task de backend `generalizar-modelo-de-profissionais-e-tipos-de-conselho` (para `CouncilType`, `COUNCIL_REGISTRATION_FORMATS`, `COUNCIL_TYPE_LABELS`).

---

## Contexto

- `professional-form.tsx` (ex-`doctor-form.tsx`) hoje:
  - Hardcoda `BRAZILIAN_STATES` (27 UFs) para o campo `state` — **isso não muda**, todos os conselhos brasileiros são organizados por estado.
  - `setNumber` força `.replace(/\D/g, '').slice(0, 6)` — só dígitos, máximo 6 caracteres, fixo para CRM.
  - Zod `crmsField` faz `.refine((crms) => crms.every((crm) => /^\d{1,6}$/.test(crm.number) && /^[A-Z]{2}$/.test(crm.state))...)` — regex único hardcoded.
  - `CrmListField` — label "CRM" fixo, placeholder fixo.
  - `changeRqe` força `.replace(/\D/g, '')` — só dígitos.
  - Copy: "Criar médico"→precisa virar "Criar profissional" (se ainda não feito na task anterior), "Médico ativo"→"Profissional ativo".
- `professional-signature-select.tsx` (ex-`doctor-signature-select.tsx`) — picker de registro/especialidade usado ao assinar receitas/atestados/pedidos de exame — hoje exibe "CRM {number}" fixo.
- Campo de RQE (`registryNumber`) só deve aparecer/habilitar quando o `councilType` selecionado para aquele registro é `CRM` (decisão confirmada — RQE continua exclusivo de CRM).

---

## Mudanças

### `professional-form.tsx`

1. **Seletor de conselho por linha de registro**: adicionar um `<select>` de `councilType` (opções do enum `CouncilType` + `COUNCIL_TYPE_LABELS` para o texto exibido) ao lado do seletor de UF existente, dentro de cada linha da lista de registros (renomeada de `CrmListField` para `RegistrationListField`).
2. **Máscara/validação dinâmica**: `setNumber` passa a consultar `COUNCIL_REGISTRATION_FORMATS[registration.councilType]` para `numberMaxLength` (no lugar do `6` fixo) e para o conjunto de caracteres permitido — não usar mais `.replace(/\D/g, '')` cego, já que CRP (`06/12345`) e CREFITO (`123456-F`) têm caracteres não numéricos no formato válido. Implementar o filtro de digitação a partir do `numberPattern`/caracteres esperados de cada conselho (ex.: permitir dígitos + `/` + letras maiúsculas + `-`, e deixar a validação final por `numberPattern` no submit).
3. **Zod dinâmico**: `registrationsField` (renomeado de `crmsField`) troca o `.refine()` de regex único fixo por uma validação por linha: `COUNCIL_REGISTRATION_FORMATS[row.councilType].numberPattern.test(row.number)`.
4. **`RegistrationListField`**: label e placeholder por linha passam a vir de `COUNCIL_REGISTRATION_FORMATS[row.councilType].label`/`.numberPlaceholder`, reagindo à troca de `councilType` na própria linha.
5. **Campo de RQE (`registryNumber`)**: só renderiza/habilita quando `councilType === CouncilType.CRM` no registro marcado como principal (ou conforme a UX já existente de "RQE por especialidade marcada" — preservar essa lógica, só condicionando a visibilidade ao conselho). Mantém `.replace(/\D/g, '')` (validação numérica inalterada, decisão confirmada).
6. **Copy**: "Criar profissional", "Profissional ativo", mensagem de conflito de registro generalizada.
7. **`data-testid`s**: `doctor-form-crm-group`/`doctor-form-crm-row-*` → `professional-form-registration-group`/`professional-form-registration-row-*` (e demais ids do formulário) — **estes renames são acoplados 1:1 com os seletores do Cypress**, tratados na task `atualizar-e2e-para-profissionais`; ambos devem ser considerados juntos ao revisar o PR para não quebrar a suíte, mesmo sendo tasks separadas.

### `professional-signature-select.tsx`

- Exibição "CRM {number}" → `${COUNCIL_TYPE_LABELS[registration.councilType]} ${registration.number}`, mesmo padrão usado no PDF (task de backend `generalizar-assinatura-de-documentos-e-pdfs`).

---

## Regras de negócio

- `state` continua limitado às 27 UFs brasileiras, independentemente do conselho — nenhuma mudança aqui.
- RQE (`registryNumber`) só é exibido/editável para registros `CRM` — para os demais conselhos, o campo de especialidade não mostra o input de RQE.
- Validação de formato de `number` é sempre dinâmica pelo `councilType` selecionado naquela linha — nunca um regex fixo global.

---

## Estrutura de arquivos

```
apps/frontend/components/features/professionals/components/
  professional-form.tsx              ← rework de validação/máscara/seletor de conselho
  professional-form.spec.tsx (ou equivalente de teste de integração)
  professional-signature-select.tsx  ← rótulo de conselho dinâmico
```

---

## Cenários de teste

- Criar profissional com registro CRM (`número 12345`, UF `SP`) → válido, RQE disponível na especialidade marcada.
- Criar profissional com registro CRN (`número 12345678`) → válido, campo de RQE não aparece.
- Criar profissional com registro CRP (`06/12345`) → aceita o formato com barra; formato inválido (`123456`) → erro de validação exibido.
- Trocar o `councilType` de uma linha já preenchida → placeholder/label/máscara atualizam imediatamente; valor de `number` fora do novo formato dispara erro no próximo submit.
- Múltiplos registros com conselhos diferentes no mesmo profissional (ex.: um CRM + um CREFITO, se aplicável ao caso de uso) → todos validados independentemente.
- `professional-signature-select.tsx` exibe o rótulo correto por conselho ao montar a lista de opções de assinatura.
- Testes de integração cobrindo loading/error/success do formulário, incluindo o novo fluxo de seleção de conselho.

---

## Definition of Done

- [ ] Seletor de `councilType` por linha de registro implementado
- [ ] Máscara/validação/placeholder dinâmicos via `COUNCIL_REGISTRATION_FORMATS`
- [ ] Zod `registrationsField` validando por linha conforme o conselho selecionado
- [ ] Campo de RQE restrito a `councilType === CRM`
- [ ] `professional-signature-select.tsx` exibindo rótulo de conselho dinâmico
- [ ] `data-testid`s do formulário renomeados (`professional-form-registration-*`)
- [ ] Testes unitários 100% + integração cobrindo múltiplos conselhos
- [ ] Build e lint sem erros
