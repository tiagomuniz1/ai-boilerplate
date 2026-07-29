# Template — `tasks/{backend,frontend}/<slug>/prompt-{backend,frontend}.md`

Este arquivo é o artefato consumido pelo "code builder" — uma chamada de LLM separada, cujo único trabalho é gerar código a partir deste prompt, sem contexto de conversa. Por isso ele precisa ser **autocontido**: nada de "como discutimos" ou referências à conversa que gerou o plano.

É uma versão condensada do `task-{backend,frontend}.md` correspondente — mesma informação, sem a prosa investigativa (sem "achado no código", sem justificativas longas), só o que o executor precisa para gerar o código certo de primeira. Sempre em português.

```markdown
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
- <restrições específicas desta task — reaproveitar tal util em vez de duplicar, texto fiel a tal doc, não alterar tal camada, etc. — mesma lista das "Restrições" da task, condensada>

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
<Colar aqui a versão condensada da task-{backend,frontend}.md: Descrição, Contexto (só os achados que importam para implementar, sem o "por quê" longo), Contratos, Assinaturas esperadas, Fluxo principal, Fluxos alternativos, Regras de negócio, Restrições, Estrutura esperada, Cenários de teste, Definition of Done. Mesma ordem de seções, prosa mais curta.>
```

## Regra de ouro
Se o `prompt-*.md` tiver alguma informação que não está no `task-*.md` correspondente (ou vice-versa), um dos dois está desatualizado — eles descrevem a mesma decisão em dois níveis de detalhe, nunca decisões diferentes. Gere sempre os dois a partir do mesmo entendimento, um logo depois do outro.
