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
- Reaproveitar `primaryProfessionLabel`/`primaryRegistrationLabel`/`COUNCIL_TYPE_PROFESSION_LABELS` já existentes em `professional-list.tsx` — não duplicar
- Texto das descrições de perfil deve ser fiel a `ai/context/permissions.md` (seção "Resumo por perfil")
- É uma task de apresentação/UX — não alterar backend, DTOs ou modelo de permissões

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Esclarecer Perfil de Acesso vs. Profissão nas Telas de Usuários (Frontend)

## Descrição
Corrigir a confusão entre **perfil de acesso** (`UserRole`: ADMIN/PROFESSIONAL/USER/PATIENT) e **profissão** (councilType do `Professional`: CRM/CRN/CREFITO/CRP/CRO/CRFA, ex. Nutricionista) nas telas de Usuários. Hoje aparecem com nomes genéricos sobrepostos ("Role" → "Profissional"/"Usuário"), sem ligação com a profissão real nem explicação do que cada perfil permite.

## Contexto
Após a generalização do modelo de profissionais, `PROFESSIONAL` é um único role de acesso compartilhado por qualquer profissão — correto no modelo, nunca refletido na UI. Achados no código: dois mapas de label duplicados e desalinhados — `ROLE_LABELS` em `apps/frontend/components/features/users/components/user-form.tsx` e `roleLabel` em `apps/frontend/components/features/users/components/user-details.tsx` (linha 88-90), ambos com campo rotulado "Role". O role `USER` representa a **Recepcionista** (`ai/context/permissions.md`), mas o label mostra só "Usuário", colidindo com o nome da própria tela "Usuários". A profissão real já é resolvida em `apps/frontend/components/features/professionals/components/professional-list.tsx` (`primaryProfessionLabel`, `primaryRegistrationLabel`, `COUNCIL_TYPE_PROFESSION_LABELS`), mas não é reaproveitada em nenhuma tela de Usuários.

## Contratos — labels centralizados (novo)
`apps/frontend/lib/user-role-labels.ts`:
```ts
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.PROFESSIONAL]: 'Profissional',
  [UserRole.USER]: 'Recepcionista',
  [UserRole.PATIENT]: 'Paciente',
  [UserRole.PLATFORM_ADMIN]: 'Platform Admin',
}
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Acesso total: gerencia usuários, profissionais, pacientes, agendas e todas as consultas.',
  [UserRole.PROFESSIONAL]: 'Gerencia a própria agenda e consultas. Não vê dados de outros profissionais.',
  [UserRole.USER]: 'Consulta pacientes, profissionais e consultas (leitura). Não cria nem cancela consultas.',
  [UserRole.PATIENT]: 'Não acessa o sistema — apenas vinculado a consultas.',
  [UserRole.PLATFORM_ADMIN]: 'Gerencia o backoffice da plataforma (catálogos, medicamentos).',
}
```

## Assinaturas esperadas
`USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS` importados por `user-form.tsx` e `user-details.tsx`, removendo os mapas locais duplicados. Extrair `primaryProfessionLabel`/`primaryRegistrationLabel`/`COUNCIL_TYPE_PROFESSION_LABELS` de `professional-list.tsx` para um util compartilhado (`components/features/professionals/utils/profession-label.ts`) se ainda acopladas ao componente, e importar em `users`. Novo hook leve para buscar o `Professional` vinculado a um `userId` (reaproveitando serviço/hook já existente de professionals com filtro), usado só quando `role === PROFESSIONAL`.

## Fluxo principal

### `user-form.tsx`
1. Label do campo: `"Role"` → `"Perfil de acesso"`.
2. Usa `USER_ROLE_LABELS` importado, remove `ROLE_LABELS` local.
3. Abaixo do select, texto de apoio com `USER_ROLE_DESCRIPTIONS[selectedRole]`, atualizando via `watch('role')` do react-hook-form.
4. Em modo edit com `defaultValues.role === PROFESSIONAL`: nota read-only "Profissão e registro (CRM/CRN/etc.) são gerenciados na tela de Profissionais", com link pra `/[slug]/professionals/[professionalId]` (buscar o professional vinculado ao userId).

### `user-details.tsx`
1. `label="Role"` (linha 88) → `label="Perfil de acesso"`.
2. Usa `USER_ROLE_LABELS` importado, remove `roleLabel` local.
3. Texto de apoio com `USER_ROLE_DESCRIPTIONS[user.role]`.
4. Se `user.role === PROFESSIONAL`: busca o `Professional` vinculado, exibe `label="Profissão"` `value="${primaryProfessionLabel} (${primaryRegistrationLabel})"` (ex.: "Nutricionista (CRN 12345/SP)"). Loading discreto; se não encontrar o registro, omite a linha silenciosamente.

## Fluxos alternativos
Roles diferentes de `PROFESSIONAL` não buscam/exibem profissão. Falha ao buscar o professional vinculado não bloqueia a tela — só omite a seção.

## Regras de negócio
Sem mudança de permissão/modelo — só apresentação. "Perfil de acesso" e "Profissão" continuam independentes no modelo; a task só torna isso visível.

## Restrições
NÃO alterar backend/DTOs/modelo de permissões. NÃO duplicar `USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS`. NÃO duplicar a lógica de profissão de `professionals`. NÃO quebrar a tela se o professional vinculado não existir. NÃO exibir profissão para roles que não são `PROFESSIONAL`. NÃO usar `useState` pro texto dinâmico — usar `watch()`.

## Estrutura esperada
```
apps/frontend/
  lib/ user-role-labels.ts (novo) (+ .spec)
  components/features/professionals/
    utils/ profession-label.ts (novo, se necessário extrair) (+ .spec)
    components/professional-list.tsx → MODIFICAR (se extraído)
  components/features/users/
    components/user-form.tsx → MODIFICAR
    components/user-details.tsx → MODIFICAR
    hooks/ use-professional-by-user-id.hook.ts (novo ou reaproveitado) (+ .spec)

cypress/e2e/users/ users-role-clarity.cy.ts (novo)
```

## Cenários de teste
- `USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS`: todos os 5 valores de `UserRole` cobertos.
- Hook do professional vinculado: retorna registro quando existe; trata ausência/erro.
- `UserForm`: label "Perfil de acesso"; descrição muda com a seleção; modo edit com PROFESSIONAL mostra nota+link.
- `UserDetails`: label "Perfil de acesso" + descrição; PROFESSIONAL mostra "Profissão" corretamente; demais roles não mostram; falha na busca não quebra a tela.
- E2E: ADMIN cadastra nutricionista (CRN) via Profissionais; acessa Usuários e vê "Perfil de acesso: Profissional" com descrição **e** "Profissão: Nutricionista (CRN.../SP)" separados; cria usuário com perfil "Recepcionista" sem colisão de nome com a tela.

## Definition of Done
- [ ] Labels/descrições centralizados, sem duplicação entre os dois componentes
- [ ] Label do role `USER` trocado para "Recepcionista"
- [ ] Campo renomeado para "Perfil de acesso" nas duas telas
- [ ] Descrição textual fiel a `ai/context/permissions.md`
- [ ] Profissão real exibida em `user-details.tsx` quando `role === PROFESSIONAL`, sem duplicar lógica de `professionals`
- [ ] `user-form.tsx` em modo edit mostra nota+link para Profissionais quando `role === PROFESSIONAL`
- [ ] Nenhuma mudança de backend/DTO/permissões
- [ ] Degradação graciosa se o professional vinculado não existir
- [ ] Testes unitários 100%
- [ ] Testes de integração (loading/error/success)
- [ ] E2E cobrindo cadastro de profissional não-médico e visualização clara na tela de Usuários
- [ ] Naming convention e estrutura seguidas
