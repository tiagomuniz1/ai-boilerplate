# Auditoria — Responsividade Mobile (375px)

> **Status: implementado.** Todos os itens P0/P1/P2 abaixo foram corrigidos. Ver resumo das correções ao final do documento.

## Objetivo

Levantar tudo o que impede a aplicação frontend de funcionar corretamente em uma tela de celular pequena (**375px de largura**, referência iPhone SE/iPhone 12 mini). A análise foi feita por leitura estática do código (componentes, layouts, Tailwind), sem rodar a aplicação em browser — os itens abaixo devem ser validados visualmente em devtools (`375x667`) durante a implementação de cada correção.

Escopo: `apps/frontend`. Não cobre o backoffice de forma separada — o shell (`Sidebar`/`Header`) é compartilhado entre `app/[slug]/(authenticated)` e `app/backoffice/(authenticated)`, então o achado P0 se aplica aos dois.

---

## P0 — Shell quebrado: Sidebar fixo consome 68% da tela

**Este é o problema mais grave.** Em ambos os layouts autenticados, o `Sidebar` é renderizado lado a lado com o conteúdo, sem nenhuma lógica de esconder/sobrepor em telas estreitas:

- `apps/frontend/app/[slug]/(authenticated)/layout.tsx:9-21`
- `apps/frontend/app/backoffice/(authenticated)/layout.tsx` (mesma estrutura)

```tsx
<div className="flex min-h-screen bg-bg">
  <Sidebar />
  <div className="flex flex-col flex-1 overflow-hidden">
    <Header />
    <main className="flex-1 overflow-auto">{children}</main>
  </div>
</div>
```

O `Sidebar` (`apps/frontend/components/ui/organisms/sidebar/sidebar.tsx:37`) é `w-64` (256px) fixo, sem `md:` nem `hidden`:

```tsx
<aside data-testid="sidebar" className="flex flex-col w-64 border-r border-line bg-bg shrink-0" ...>
```

Em 375px isso deixa **~119px** para todo o conteúdo principal — tabelas, formulários, cards, tudo fica espremido ou gera scroll horizontal na página inteira.

### O início da solução já existe, mas está desconectado

- `Header` (`apps/frontend/components/ui/organisms/header/header.tsx:12,22-25`) já tem estado `isMobileMenuOpen` e renderiza um botão hambúrguer:
  ```tsx
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  ...
  <HeaderMobileMenu isOpen={isMobileMenuOpen} onToggle={() => setIsMobileMenuOpen((prev) => !prev)} />
  ```
- `HeaderMobileMenu` (`apps/frontend/components/ui/organisms/header/components/header-mobile-menu.tsx:16`) já é `md:hidden` corretamente — some acima do breakpoint `md` (768px), como esperado.
- **Porém `isMobileMenuOpen` não é consumido em lugar nenhum** — nem passado para o `Sidebar`, nem para o `layout.tsx`. Clicar no hambúrguer hoje não faz nada visível.
- Existe ainda um componente `SidebarToggle` (`apps/frontend/components/ui/organisms/sidebar/sidebar-toggle.tsx`) pronto, com ícone de chevron e prop `isCollapsed`/`onToggle` — mas **nunca é importado em lugar nenhum do app** (confirmado via grep). É código órfão que pode ser reaproveitado ou removido, mas não resolve sozinho o problema (foi pensado para collapse em desktop, não para esconder em mobile).

### Correção recomendada

1. Subir o estado de menu mobile para o `layout.tsx` (ou um contexto/`useState` compartilhado), já que hoje ele vive isolado dentro do `Header`.
2. Fazer o `Sidebar` virar um drawer/overlay abaixo de `md`, controlado por esse estado:
   ```tsx
   <aside className={cn(
     'fixed inset-y-0 left-0 z-50 w-64 -translate-x-full transition-transform duration-200',
     'md:static md:translate-x-0',
     isMobileMenuOpen && 'translate-x-0',
   )}>
   ```
3. Adicionar um backdrop clicável (`fixed inset-0 z-40 bg-black/40 md:hidden`) quando `isMobileMenuOpen` for `true`, fechando o menu ao clicar fora — mesmo padrão já usado no `Modal` (`components/ui/organisms/modal/modal.tsx`).
4. Fechar o menu automaticamente ao navegar (trocar de rota) — hoje o `Sidebar` já usa `usePathname()` (`sidebar.tsx:22`), dá para reaproveitar um `useEffect` nele.
5. Aplicar a mesma correção nos dois layouts (`[slug]/(authenticated)` e `backoffice/(authenticated)`) — são duplicados, então o fix deve ser replicado (ou extraído para um componente de shell compartilhado, se fizer sentido no momento da implementação).

---

## P1 — Grids de formulário sem fallback para 1 coluna

Vários formulários usam `grid grid-cols-2`/`grid-cols-3` fixo, sem uma variante `grid-cols-1` para telas estreitas. Em 375px, cada coluna de um `grid-cols-3` fica com ~110px de largura útil — texto cortado ou quebrado de forma ruim.

| Arquivo | Linha(s) | Padrão atual | Severidade |
|---|---|---|---|
| `components/features/medical-records/components/medical-record-view.tsx` | `106` | `grid grid-cols-3 gap-4` (bloco Paciente/Médico/Especialidade) | **Alta** — nomes completos de paciente/médico cortam |
| `components/features/medical-record-templates/components/field-editor.tsx` | `158`, `207` | `grid grid-cols-2 gap-4` (Rótulo/Tipo, Placeholder/outros) | Média |
| `components/features/atestados/components/atestado-form.tsx` | `123`, `203` | `grid grid-cols-2 gap-2` (dias de afastamento, horários) | Média |
| `components/features/schedules/components/schedule-form.tsx` | `172`, `226`, `318`, `372` | 4 blocos `grid grid-cols-2 gap-4` (início/fim, vigência) | Média |
| `components/features/prescriptions/components/prescription-form.tsx` | `278` | `grid grid-cols-2 gap-2` (dosagem/frequência por item) | Média |
| `components/features/prescription-templates/components/prescription-template-form.tsx` | `275` | idem acima | Média |
| `components/features/clinics/components/clinic-form.tsx` | `337`, `349` | `grid grid-cols-2`/`grid-cols-3` (seletor de tema/raio) | Baixa — tiles pequenos, cabem melhor |
| `components/features/themes/components/theme-form.tsx` | `288` | idem acima | Baixa |
| `components/features/appointments/components/appointment-details-dialog.tsx` | `73` | `grid grid-cols-2 gap-x-4` (`<dl>` label/valor) | Baixa — strings curtas |

**Correção recomendada:** trocar `grid-cols-2`/`grid-cols-3` fixo por `grid-cols-1 sm:grid-cols-2` (ou `sm:grid-cols-3` quando o conteúdo permitir), seguindo o padrão que já funciona corretamente em outros pontos do app (ex.: `resumo-tab.tsx:102,105` usa `grid-cols-1 lg:grid-cols-3`, `appointment-header-card.tsx:97` usa `grid-cols-2 sm:grid-cols-5`).

---

## P1 — Barra de abas da tela de consulta sem scroll/wrap

`apps/frontend/app/[slug]/(authenticated)/appointments/[id]/page.tsx:146-151` renderiza o componente genérico `Tabs`:

```tsx
<Tabs items={tabItems} activeId={activeTab} onChange={...} data-testid="appointment-tabs" />
```

`Tabs` (`apps/frontend/components/ui/atoms/tabs/tabs.tsx:20-23`) usa:

```tsx
<div role="tablist" className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
```

Sem `overflow-x-auto` nem `flex-wrap`. A tela de consulta pode mostrar até 5 abas (Resumo, Prontuário, Receitas, Atestados, Exames — as 3 últimas ainda com badge de contador), o que facilmente ultrapassa a largura útil de conteúdo em 375px (que já é menor por causa do P0). Sem nenhuma affordance de scroll, as abas finais ficam clipadas ou empurram a página inteira para scroll horizontal.

**Correção recomendada:** envolver o `Tabs` em um contêiner com `overflow-x-auto` e impedir quebra de linha nos itens (`whitespace-nowrap` nos botões), permitindo scroll horizontal só na barra de abas — não na página. Alternativa mais trabalhosa: colapsar abas menos usadas num menu "mais" abaixo de `sm`.

---

## P2 — Modal genérico sem respiro lateral em telas estreitas

`apps/frontend/components/ui/organisms/modal/modal.tsx:43-60`:

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
  <div aria-hidden="true" className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
  <div className={cn('relative z-10 w-full max-w-md rounded-lg ... p-6', className)}>
```

O backdrop não tem padding horizontal (`px-4` ou similar) — o painel do modal (`w-full max-w-md`) encosta nas duas bordas da tela em 375px, sobrando só o `p-6` interno como respiro. Funciona, mas fica visualmente apertado e sem margem de segurança contra dispositivos com cantos arredondados/notch.

**Correção recomendada:** adicionar `p-4` (ou `px-4`) no backdrop (`fixed inset-0 z-50 flex items-center justify-center p-4`), garantindo margem mínima do modal até a borda da tela em qualquer viewport.

---

## Confirmado OK — não precisa de ação

Para não ser re-investigado depois, os agentes de exploração confirmaram que os itens abaixo **já funcionam corretamente em 375px**:

- **Dashboard** (`components/features/dashboard/DashboardView.tsx:67`, `DashboardKpiRow.tsx:48`) — grids já usam `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` / `grid-cols-2 sm:grid-cols-4`. Gráficos usam `ResponsiveContainer width="100%"`.
- **Login, registro, definição de senha** (`app/[slug]/(public)/login`, `register`, `set-password`) — usam `max-w-md` + `p-4`, sem larguras fixas.
- **Tabelas de listagem** (patients, doctors, schedules, users, medications, prescription-templates) — todas já envolvem a `<table>` em `overflow-x-auto`, então degradam para scroll horizontal dentro do card em vez de estourar a página.
- **Componentes de UI compartilhados** (`Button`, `Input` em `components/ui/atoms`) — sem larguras fixas, `w-full` onde faz sentido.
- **Meta viewport** — não há `<meta name="viewport">` explícito em `app/layout.tsx`, mas o Next.js App Router injeta o default (`width=device-width, initial-scale=1`) automaticamente, então isso não é um problema.
- **Sistema de toast/notificação** — não existe nenhum (`Alert` é usado como bloco estático inline, não overlay), então não há risco de posicionamento/overflow por esse lado. Não é bug, só não existe — fora de escopo desta auditoria.

---

## Observação lateral (fora do escopo de responsividade)

Não existe nenhuma rota de recuperação de senha (`forgot-password`/`reset-password`/`recover-password`) em `apps/frontend/app` — nenhuma página encontrada. Não é um problema de mobile, é a ausência de uma funcionalidade; registrando aqui só porque apareceu durante a varredura das páginas de auth.

---

## Ordem sugerida de implementação

1. **P0 — Sidebar/Shell mobile** (bloqueia tudo o resto; sem isso, toda página tem só ~119px de conteúdo útil).
2. **P1 — Tab bar da tela de consulta** (tela mais densa e mais usada por DOCTOR/ADMIN).
3. **P1 — Grids de formulário**, começando por `medical-record-view.tsx:106` (maior severidade).
4. **P2 — Modal** (ajuste pequeno, baixo risco).

## Verificação

Após cada correção, testar em devtools com viewport fixo em `375x667`:
- Navegar entre páginas autenticadas e abrir/fechar o menu mobile.
- Abrir a tela de consulta (`/appointments/[id]`) como DOCTOR e ADMIN, navegar por todas as abas.
- Abrir um prontuário existente e conferir o cabeçalho Paciente/Médico/Especialidade.
- Abrir qualquer modal (ex. preview de exame, formulário de agenda) e conferir margem lateral.
- Rodar os testes de integração/E2E existentes (`yarn workspace @app/frontend test`, `yarn workspace @app/frontend cypress:run`) para garantir que nenhuma mudança de classe quebrou os testes de layout.

---

## Resumo das correções aplicadas

- **P0 — Sidebar/Shell mobile**: `stores/sidebar.store.ts` ganhou `isMobileOpen`/`openMobile`/`closeMobile`/`toggleMobile`. `Sidebar` (`sidebar.tsx`) agora renderiza um backdrop (`data-testid="sidebar-backdrop"`) e vira drawer `fixed` com `-translate-x-full`/`translate-x-0` abaixo de `md`, permanecendo `md:static` em telas maiores; fecha automaticamente quando a rota muda (via `usePathname` + `useRef` para não disparar no mount). `Header` agora lê/escreve o mesmo estado do store em vez de um `useState` local isolado, conectando o botão hambúrguer existente ao comportamento real.
- **P1 — Tab bar** (revisado no Round 3, ver abaixo): versão inicial envolvia a lista de abas em `overflow-x-auto` — substituída depois por `flex-wrap` para eliminar completamente o scroll, mesmo contido.
- **P1 — Grids de formulário**: todos os `grid-cols-2`/`grid-cols-3` fixos listados acima (medical-record-view, field-editor, atestado-form, schedule-form, prescription-form, prescription-template-form, clinic-form, theme-form, appointment-details-dialog) agora usam `grid-cols-1 sm:grid-cols-N` (ou `grid-cols-2 sm:grid-cols-3` no seletor de bordas do tema, por ter só 3 tiles pequenos).
- **P2 — Modal**: backdrop do `Modal` genérico ganhou `p-4`, garantindo respiro lateral mínimo em qualquer viewport.

Testes unitários/integração do frontend (`yarn workspace @app/frontend test:unit`, 2521 testes) e `tsc --noEmit` passam após as mudanças. Um bug real foi encontrado e corrigido durante a implementação: o `useEffect` de fechar o menu mobile ao navegar disparava também no mount inicial do `Sidebar`, fechando o drawer instantaneamente se ele já estivesse aberto — corrigido comparando o pathname anterior via `useRef` antes de chamar `closeMobile()`.

---

## Round 2 — bug real encontrado via screenshots (scroll horizontal na tela de consulta)

Após a primeira rodada, screenshots reais em 375px mostraram a página inteira deslocada horizontalmente (texto cortado dos dois lados: cabeçalho da consulta, tabs, e o botão "Excluir" das listas de Receitas/Atestados/Exames). Causa raiz:

- `apps/frontend/components/features/{exames,atestados,prescriptions}/components/*-section.tsx` renderizavam cada item da lista como `<li className="flex items-center justify-between ...">` com um `<div className="flex gap-2 shrink-0">` contendo 3 botões (Visualizar/Baixar PDF/Excluir) que nunca quebravam linha. Em 375px o conteúdo mínimo dessa linha excede a largura disponível; como o `<li>` é filho de um `<ul className="flex flex-col ...">` (portanto um flex item sem `min-width: 0`), ele não podia encolher abaixo do seu conteúdo — isso empurrava `main` (que tinha `overflow-auto`, ou seja, permitia rolagem horizontal da página inteira) a ficar mais largo que o viewport, arrastando tudo junto quando rolado.
- **Correção nos 3 arquivos**: `<li>` virou `flex flex-col gap-3 ... sm:flex-row sm:items-center sm:justify-between` (empilha texto e botões verticalmente no mobile) e o container dos botões virou `flex flex-wrap gap-2 sm:shrink-0` (quebra linha como reforço).
- **Correção de blindagem no shell** (`app/[slug]/(authenticated)/layout.tsx` e `app/backoffice/(authenticated)/layout.tsx`): `main` mudou de `overflow-auto` para `overflow-y-auto overflow-x-hidden`, e `min-w-0` foi adicionado nos containers flex do shell — qualquer elemento que ainda assim exceda a largura fica **contido/cortado** em vez de arrastar a página inteira em scroll horizontal. Isso não substitui corrigir o elemento causador (que ainda deve ser corrigido para não cortar conteúdo), mas garante que a regra do usuário ("nunca scroll horizontal no mobile") se mantenha mesmo diante de bugs futuros não previstos.
- **Teste de regressão permanente**: `apps/frontend/cypress/e2e/mobile/no-horizontal-scroll.cy.ts` — visita a tela de consulta em viewport 375×667 como DOCTOR, navega pelas abas Resumo/Receitas/Atestados/Exames e verifica (a) `document.documentElement.scrollWidth <= clientWidth` e (b) que botões específicos (`exame-delete-button-*`, `atestado-delete-button-*`, `prescription-delete-button-*`, `tab-*`) têm `getBoundingClientRect()` inteiramente dentro de 0–375px — a checagem (a) sozinha não pega botões cortados por um ancestral com `overflow-hidden`, só a (b) pega. Confirmado que o teste falha sem a correção (botão a 432px, fora do viewport) e passa com ela.

---

## Round 3 — a barra de abas ainda tinha scroll horizontal (só que contido)

Um novo screenshot (após o Round 2) mostrou a barra de abas ("Resumo / Prontuário / Receitas / Atestados / Exames") ainda cortada nas duas pontas ("umo" em vez de "Resumo", "Ex" em vez de "Exames"), mesmo com o `overflow-x-auto` isolando esse scroll ao componente e não mais arrastando a página inteira.

O requisito do usuário é absoluto — **nenhum scroll horizontal em lugar nenhum**, nem contido dentro de um componente. Um `overflow-x-auto` na barra de abas tecnicamente "resolve" o vazamento para o resto da página, mas ainda É scroll horizontal (só escopado), então não atende à regra.

- **Correção**: `components/ui/atoms/tabs/tabs.tsx` — removido o wrapper `overflow-x-auto` e o `inline-flex` sem quebra; o container agora é `flex flex-wrap gap-1 rounded-2xl ...`, e cada botão mantém `shrink-0 whitespace-nowrap` (não encolhe, mas quebra para a linha de baixo se não couber). Resultado: com 5 abas em 375px, as abas que não cabem na primeira linha vão para uma segunda linha, sem nenhum scroll.
- Esse mesmo componente `Tabs` é usado também pela navegação interna do prontuário (Dados Gerais/Dados específicos/Informações complementares), então a correção cobre os dois lugares automaticamente.
- **Teste reforçado**: adicionadas assertivas `assertFullyInViewport` para cada `tab-*` (resumo/prontuario/receitas/atestados/exames) na aba Resumo. Confirmado que o teste falha contra a versão anterior (aba "Atestados" com `right: 385.8px`, fora do viewport) e passa com o `flex-wrap`.
