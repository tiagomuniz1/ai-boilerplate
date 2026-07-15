Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito na task.

Siga TODAS as regras e contexto definidos na task e nos documentos de referência.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida em `ai/context/frontend.md` e `ai/context/architecture.md`
- Criar um app NOVO e independente em `apps/website` — NÃO alterar `apps/frontend`
- Recriar o design de referência com componentes React + Tailwind — NÃO embutir o HTML do protótipo como está
- Placeholders (prova social, mockups) permanecem placeholders — NÃO inventar depoimentos, logos ou métricas
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## ARQUIVOS DE REFERÊNCIA (mesma pasta)
- `tasks/website/task-website.md` — especificação completa desta task (LEIA PRIMEIRO)
- `tasks/website/Pulso Landing.dc.html` — protótipo de design em alta fidelidade (referência visual, não código de produção)
- `tasks/website/README.md` — handoff de design (seções, tokens, interações, comportamento)
- `tasks/marketing/landing-institucional.md` — copy institucional PT-BR e direção de marca (fonte da copy e critérios de revisão)

---
## TASK
Implementar a task descrita em `tasks/website/task-website.md`: criar o **site institucional do Pulso** (landing de captura, SPA one-page) como um **novo app `@app/website` em `apps/website`**, espelhando a stack e as convenções do `apps/frontend` (Next.js App Router + React + Tailwind + Atomic Design + tokens no `tailwind.config.ts` + utility `cn()`), com modo claro/escuro persistido, acordeão de FAQ, navegação por âncora e CTAs apontando para o cadastro self-service de clínica via `NEXT_PUBLIC_*`.

Seguir a **Estrutura esperada**, os **Design Tokens**, as **Restrições**, os **Cenários de teste** e a **Definition of Done** da task. Ao concluir, atualizar o `CHANGELOG.md` do novo app e mover a pasta `tasks/website/` para `tasks/done/website/`.
