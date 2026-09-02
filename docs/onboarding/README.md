# Guia de onboarding da clínica

Material entregue à clínica no onboarding: como o Pulso está organizado, os cadastros iniciais, a agenda, o atendimento, os documentos emitidos e as dúvidas que aparecem na primeira semana.

Escrito **para quem vai usar o sistema**, não para quem o desenvolve. O leitor é a administradora da clínica — com frequência a mesma pessoa que atende.

```
guia-pulso.html   → a fonte, versionada
build-pdf.sh      → gera o PDF
build/            → saída, fora do git
```

## Gerar o PDF

```bash
./docs/onboarding/build-pdf.sh
```

Sai em `docs/onboarding/build/Guia-do-Pulso.pdf` — A4, fontes embutidas, pronto para enviar.

O Chrome é procurado no caminho padrão do macOS. Em outro sistema, aponte:

```bash
CHROME_BIN=/usr/bin/chromium ./docs/onboarding/build-pdf.sh
```

## Por que HTML e não Canva, Google Docs ou slides

Porque a interface muda. Um documento feito em ferramenta visual envelhece em silêncio e ninguém atualiza — daqui a três versões, o guia estará ensinando uma tela que não existe mais.

Aqui o guia mora no repositório, ao lado do código que ele descreve: quando um botão muda de nome, o texto muda no mesmo pull request, e o PDF é regerado com um comando.

## Inserir os prints

O guia tem molduras tracejadas marcando onde cada captura entra, com a descrição do que deve aparecer. Para preencher, troque o bloco:

```html
<div class="placeholder">…</div>
```

por:

```html
<img src="data:image/png;base64,COLE_AQUI" alt="Descrição da tela">
```

O CSS já cuida de borda, cantos e largura. A imagem precisa ser embutida como data URI — arquivo externo quebraria a autossuficiência do PDF.

**Nenhum paciente real nos prints.** Cadastre pacientes fictícios e capture só com eles. Nome, CPF, telefone ou dado clínico num material que circula fora da clínica é problema de LGPD, e é o erro mais fácil de cometer aqui.

Capture tudo em **tema claro** e na **mesma janela**, sem redimensionar entre uma captura e outra.

## Ao mexer no CSS

Duas armadilhas que já custaram uma rodada:

- **O bloco `@media print` precisa casar a especificidade do bloco de tema escuro.** O tema escuro usa `:root:not([data-theme="light"])`; um `:root` simples na impressão perde para ele, e o guia sai com texto claro sobre papel branco. Por isso o seletor de impressão lista as três variações.
- **`<meta charset="utf-8">` é obrigatório.** Sem ele, abrir o arquivo via `file://` corrompe toda a acentuação — o Chrome assume Latin-1.

Depois de qualquer mudança de estilo, **gere o PDF e olhe**. O CSS de impressão não se comporta como o de tela, e o erro só aparece na página.
