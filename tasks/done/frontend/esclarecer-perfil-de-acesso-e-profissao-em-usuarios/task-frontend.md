# Task — Esclarecer Perfil de Acesso vs. Profissão nas Telas de Usuários (Frontend)

## Descrição
Corrigir a confusão de nomenclatura entre **perfil de acesso** (`UserRole`: ADMIN/PROFESSIONAL/USER/PATIENT — o que a conta pode fazer no sistema) e **profissão** (councilType do registro de `Professional`: CRM/CRN/CREFITO/CRP/CRO/CRFA — quem a pessoa é, ex.: Nutricionista) nas telas de Usuários. Hoje as duas coisas aparecem com nomes genéricos e sobrepostos ("Role" → "Profissional" / "Usuário"), sem nenhuma ligação visual com a profissão real (que já é resolvida corretamente em `professionals`), e sem nenhuma explicação do que cada perfil de acesso pode fazer.

---

## Contexto
- Depois da generalização do modelo de profissionais (suporte a múltiplas profissões além de médico — CRM, CRN, CREFITO, CRP, CRO, CRFA), o role de acesso `PROFESSIONAL` passou a ser compartilhado por **qualquer** profissão. Isso é correto no modelo de dados (`ai/context/permissions.md`: "`PROFESSIONAL` é um único role genérico — a profissão em si... não é um role separado, é um atributo do cadastro de profissional"), mas a UI nunca foi ajustada para deixar essa distinção clara.
- **Achado concreto (grep no código):** dois mapeamentos de label **duplicados e desalinhados** do `UserRole`:
  - `apps/frontend/components/features/users/components/user-form.tsx` → `ROLE_LABELS`: `{ USER: 'Usuário', ADMIN: 'Administrador', PLATFORM_ADMIN: 'Platform Admin', PROFESSIONAL: 'Profissional', PATIENT: 'Paciente' }`, campo rotulado **"Role"**.
  - `apps/frontend/components/features/users/components/user-details.tsx` → `roleLabel`: `{ ADMIN: 'Admin', PROFESSIONAL: 'Profissional', USER: 'Usuário', PATIENT: 'Paciente', PLATFORM_ADMIN: 'Platform Admin' }`, campo também rotulado **"Role"** (linha 88-90).
- **O role `USER` representa a Recepcionista** (`ai/context/permissions.md`: "`USER` | `user` | Recepcionista"), mas em nenhuma das duas telas o label reflete isso — aparece só "Usuário", que colide com o nome da própria tela ("Usuários"), e não diz nada sobre a função real da pessoa (recepção).
- **A profissão já é resolvida corretamente em outro lugar** — `apps/frontend/components/features/professionals/components/professional-list.tsx` tem `primaryProfessionLabel(registrations)` (usa `COUNCIL_TYPE_PROFESSION_LABELS[councilType]`, ex.: retorna "Nutricionista") e `primaryRegistrationLabel(registrations)` (ex.: "CRN 12345/SP"). Essa lógica não é reaproveitada em nenhuma tela de Usuários.
- Resultado prático: um ADMIN que cadastra uma nutricionista e depois olha o registro dela em "Usuários" só vê "Role: Profissional" — nada indica que ela é nutricionista, nem CRN, nem o que "Profissional" permite fazer no sistema.

---

## Contratos

### Tipos/constantes centralizados (novos)
`apps/frontend/lib/user-role-labels.ts` (ou local mais apropriado em `components/features/users/`, mas **um único arquivo**, não duplicar):
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
Conteúdo das descrições deve refletir fielmente `ai/context/permissions.md` (seção "Resumo por perfil") — não inventar texto novo.

---

## Assinaturas esperadas
- `USER_ROLE_LABELS`, `USER_ROLE_DESCRIPTIONS` (acima) — importados por `user-form.tsx` e `user-details.tsx`, substituindo os mapas locais duplicados (`ROLE_LABELS` e `roleLabel` são **removidos**).
- Reaproveitar (importar, não duplicar) `primaryProfessionLabel`/`primaryRegistrationLabel`/`COUNCIL_TYPE_PROFESSION_LABELS` de `professionals` — exportar essas funções/constante de `professional-list.tsx` (ou extrair para um local compartilhado, ex. `components/features/professionals/utils/profession-label.ts`, se ainda não existir um lugar não-acoplado ao componente de lista) para poderem ser importadas por `users`.
- Novo hook/use-case leve (reaproveitando o já existente `useProfessionals`/serviço de professionals) para buscar o registro de `Professional` vinculado a um `userId`, usado apenas quando `user.role === UserRole.PROFESSIONAL`, para exibir a profissão real.

---

## Fluxo principal

### `user-form.tsx` (criar/editar usuário)
1. Trocar o `<label>` do campo de `"Role"` para `"Perfil de acesso"`.
2. Usar `USER_ROLE_LABELS` (importado) no lugar do `ROLE_LABELS` local — remover a constante duplicada.
3. Abaixo do `<select>`, exibir a descrição do perfil selecionado (`USER_ROLE_DESCRIPTIONS[selectedRole]`) como texto de apoio (`text-xs text-text-dim`), atualizando dinamicamente conforme a opção muda (`watch('role')` do `react-hook-form`).
4. Quando `mode === 'edit'` e `defaultValues.role === UserRole.PROFESSIONAL`, exibir uma nota informativa read-only abaixo do campo: "Profissão e registro (CRM/CRN/etc.) são gerenciados na tela de Profissionais" com link para `/[slug]/professionals/[professionalId]` (buscar o `professionalId` vinculado ao `userId`, se existir) — deixando claro que perfil de acesso (aqui) e profissão (lá) são coisas diferentes, editadas em lugares diferentes.

### `user-details.tsx` (visualização/"Meu perfil")
1. Trocar o `label="Role"` (linha 88) para `label="Perfil de acesso"`.
2. Usar `USER_ROLE_LABELS` importado no lugar do `roleLabel` local — remover a constante duplicada.
3. Adicionar a descrição do perfil (`USER_ROLE_DESCRIPTIONS[user.role]`) como texto de apoio abaixo do valor, mesmo padrão do form.
4. Quando `user.role === UserRole.PROFESSIONAL`: buscar o registro de `Professional` vinculado (via hook reaproveitado) e exibir um segundo par label/valor: `label="Profissão"`, `value={primaryProfessionLabel(registrations)} (${primaryRegistrationLabel(registrations)})` (ex.: "Nutricionista (CRN 12345/SP)"). Estado de loading discreto (skeleton curto) enquanto busca; se não encontrar registro de profissional vinculado (inconsistência de dados), omitir a linha silenciosamente (não quebrar a tela).

---

## Fluxos alternativos
- Usuário com role `ADMIN`/`USER`/`PATIENT`/`PLATFORM_ADMIN`: não busca nem exibe nada de profissão (só ocorre para `PROFESSIONAL`).
- Falha ao buscar o `Professional` vinculado: não bloquear a tela, apenas omitir a seção de profissão (mesma postura de "erro não crítico → degrada graciosamente" usada em outras partes do frontend).

---

## Regras de negócio
- Nenhuma mudança de permissão ou de modelo de dados — é puramente uma correção de clareza/apresentação. O backend não muda.
- "Perfil de acesso" (role) e "Profissão" (councilType) continuam sendo dois conceitos independentes no modelo — esta task só torna essa independência visível e compreensível na UI, sem fundir os dois em um campo só.

---

## Permissões na UI
Sem mudança de permissões — mesma visibilidade de campos já existente hoje (quem vê o formulário/detalhes de um usuário continua vendo, agora com mais clareza).

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Fonte única do label de role | `USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS` centralizados, importados por `user-form.tsx` e `user-details.tsx` |
| Texto das descrições | Fiel ao resumo por perfil de `ai/context/permissions.md`, não inventar |
| Exibição de profissão | Reaproveita `primaryProfessionLabel`/`primaryRegistrationLabel` de `professionals`, sem duplicar lógica |
| Vínculo user↔professional | Buscar via hook/serviço já existente de `professionals` (filtrar por `userId`), não criar endpoint novo |

---

## Restrições
- NÃO alterar o backend, DTOs do `@app/shared`, nem o modelo de permissões — só apresentação.
- NÃO duplicar `USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS` — um único arquivo fonte, importado nos dois componentes.
- NÃO duplicar `primaryProfessionLabel`/`primaryRegistrationLabel` — importar de `professionals` (extrair para um util compartilhado se estiverem acopladas ao componente de lista).
- NÃO quebrar a tela se o usuário `PROFESSIONAL` não tiver um registro de `Professional` vinculado (inconsistência) — degradar graciosamente.
- NÃO adicionar a informação de profissão para roles que não são `PROFESSIONAL`.
- NÃO usar `useState` para texto de apoio dinâmico — usar `watch()` do `react-hook-form` já em uso no `user-form.tsx`.

---

## Estrutura esperada
```
apps/frontend/
  lib/ user-role-labels.ts (novo — USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS) (+ .spec)
  components/features/professionals/
    utils/ profession-label.ts (novo, se a lógica ainda estiver só dentro de professional-list.tsx — extrair primaryProfessionLabel/primaryRegistrationLabel/COUNCIL_TYPE_PROFESSION_LABELS pra cá) (+ .spec)
    components/professional-list.tsx → MODIFICAR (importar do util extraído, se aplicável)
  components/features/users/
    components/user-form.tsx → MODIFICAR (label "Perfil de acesso", USER_ROLE_LABELS importado, descrição dinâmica, nota de profissão no modo edit)
    components/user-details.tsx → MODIFICAR (label "Perfil de acesso", USER_ROLE_LABELS importado, descrição, seção de profissão quando PROFESSIONAL)
    hooks/ use-professional-by-user-id.hook.ts (novo, ou reaproveitar hook existente de professionals com filtro) (+ .spec)

cypress/e2e/users/
  users-role-clarity.cy.ts (novo)
```

---

## Cenários de teste

### Unitários
- `USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS`: todos os 5 valores de `UserRole` têm label e descrição definidos (teste de exaustividade do `Record`).
- Hook de busca do professional vinculado: retorna o registro quando existe, `undefined`/estado de erro tratado quando não existe.

### Integração
- `UserForm` (create/edit): label do campo é "Perfil de acesso" (não mais "Role"); ao trocar a seleção, o texto de descrição muda de acordo; em modo edit com `role=PROFESSIONAL`, mostra a nota sobre profissão/registro com link para a tela de profissionais.
- `UserDetails`: label "Perfil de acesso" com descrição; para um usuário com `role=PROFESSIONAL`, mostra a linha "Profissão" com o label correto (ex.: "Nutricionista (CRN 12345/SP)"); para os demais roles, a linha de profissão não aparece; se a busca do professional vinculado falhar, a tela não quebra (seção some, resto continua normal).
- Nenhum dos dois componentes usa mais os mapas `ROLE_LABELS`/`roleLabel` locais (testar via import, ou simplesmente confirmar que o comportamento vem da fonte centralizada).

### E2E
- ADMIN cadastra um profissional (ex.: nutricionista, CRN) pela tela de Profissionais.
- ADMIN acessa a tela de Usuários e visualiza/edita esse mesmo usuário: vê "Perfil de acesso: Profissional" com a descrição do que isso permite, **e** vê "Profissão: Nutricionista (CRN .../SP)" claramente separado.
- ADMIN cria um novo usuário com perfil "Recepcionista" (antigo "Usuário") — label não colide mais com o nome da tela.

---

## Definition of Done
- [ ] `USER_ROLE_LABELS`/`USER_ROLE_DESCRIPTIONS` centralizados num único arquivo, sem duplicação entre `user-form.tsx`/`user-details.tsx`
- [ ] Label do role `USER` trocado de "Usuário" para "Recepcionista" (fiel a `ai/context/permissions.md`)
- [ ] Campo renomeado de "Role" para "Perfil de acesso" nas duas telas
- [ ] Descrição textual do perfil selecionado/exibido, fiel ao resumo de `ai/context/permissions.md`
- [ ] Quando `role === PROFESSIONAL`, a profissão real (ex.: Nutricionista/CRN) é exibida em `user-details.tsx`, reaproveitando a lógica já existente em `professionals` (sem duplicar)
- [ ] `user-form.tsx` em modo edit, para `role === PROFESSIONAL`, exibe nota + link para a tela de Profissionais
- [ ] Nenhuma mudança de backend, DTO ou modelo de permissões
- [ ] Degradação graciosa se o professional vinculado não for encontrado
- [ ] Testes unitários 100% (labels/descrições, hook)
- [ ] Testes de integração (loading/error/success) nos dois componentes modificados
- [ ] E2E cobrindo o fluxo de cadastro de um profissional não-médico e a visualização clara dos dois conceitos na tela de Usuários
- [ ] Naming convention e estrutura seguidas
