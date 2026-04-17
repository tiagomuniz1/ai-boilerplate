# Task — <Nome da Task> (Backend)

## Descrição
<!-- 1-3 frases explicando o objetivo da task e o resultado final esperado -->

---

## Contexto
<!-- Regras de domínio, integrações envolvidas, observações importantes -->
<!-- Referenciar entidades existentes quando possível -->

---

## Contratos

### Input (DTO)
<!-- Definir exatamente o formato esperado -->
<NomeDto>:
- campo: tipo

### Output
<!-- Definir o retorno do use-case -->
<NomeResponse>:
- campo: tipo

---

## Assinaturas esperadas

<!-- Use-cases -->
<UseCase>.execute(dto: <InputDto>): Promise<<Output>>

<!-- Repositories -->
<IRepository>:
- metodo(...): Promise<...>

<!-- Adapters (se houver) -->
<IAdapter>:
- metodo(...): Promise<...>

---

## Fluxo principal

1. ...
2. ...
3. ...

---

## Fluxos alternativos

- Caso X → lançar <Exception>
- Caso Y → comportamento esperado

---

## Regras de negócio

- Regra 1
- Regra 2

---

## Dependências

- <Repository>
- <Adapter>

---

## Decisões técnicas da task

- Usar transação: (sim/não + por quê)
- Usar distributed lock: (sim/não)
- Usar cache: (sim/não + onde)
- Estratégia de concorrência: (se aplicável)

---

## Restrições

- NÃO ...
- NÃO ...

---

## Estrutura esperada

modules/<modulo>/
- controllers/
- use-cases/
- repositories/
- dto/
- entities/

---

## Cenários de teste adicionais

- Caso específico 1
- Caso específico 2

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Fluxos alternativos tratados
- [ ] Testes unitários (100%)
- [ ] Testes de integração