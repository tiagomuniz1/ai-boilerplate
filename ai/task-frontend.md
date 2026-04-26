# Task — <Nome da Task> (Frontend)

## Descrição
<!-- 1-3 frases explicando o objetivo da task e o resultado final esperado -->

---

## Contexto
<!-- Regras de domínio, integrações envolvidas, observações importantes -->
<!-- Referenciar entidades e fluxos existentes quando possível -->

---

## Contratos

### Input (dados do formulário ou parâmetros)
<NomeInput>:
- campo: tipo

### Output (modelo exibido na UI)
<NomeModel>:
- campo: tipo

---

## Assinaturas esperadas

<!-- Hook principal -->
use<Nome>(): { data, isPending, error, ... }

<!-- Use-case -->
<nomeUseCase>(input: <Input>): Promise<<NomeModel>>

<!-- Service -->
<nomeService>.<metodo>(...): Promise<<NomeDto>>

---

## Fluxo principal

1. ...
2. ...
3. ...

---

## Estados e feedbacks

- Loading → skeleton / spinner
- Erro → mensagem amigável (nunca detalhe técnico)
- Sucesso → redirecionamento / toast / atualização de lista

---

## Regras de negócio

- Regra 1
- Regra 2

---

## Dependências

- <Service>
- <Store> (se houver estado global)

---

## Decisões técnicas da task

- Usar React Query (query ou mutation): (sim/não + qual)
- Usar Zustand: (sim/não + por quê)
- Optimistic update: (sim/não)
- Formulário com react-hook-form: (sim/não)

---

## Restrições

- NÃO ...
- NÃO ...

---

## Estrutura esperada

features/<modulo>/
- components/
- hooks/
- services/
- use-cases/
- mappers/
- types/

---

## Cenários de teste adicionais

- Caso específico 1
- Caso específico 2

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Estados de loading, error e success tratados
- [ ] Testes unitários (100%)
- [ ] Testes de integração (loading / error / success)
