# CETUS — VERSÃO DE TESTE, ARQUIVO ÚNICO

Este ZIP corrige o erro `MODULE_NOT_FOUND` de `./sistemas/recrutamento` caso a pasta `sistemas` não tenha sido enviada à Discloud. **Todos os módulos locais estão incorporados no `index.js`.** NÃO requer a pasta `sistemas`.

## Instalar na Discloud

1. Faça backup da versão antiga. Extraia ou envie este ZIP inteiro, com `index.js`, `package.json` e `discloud.config` na raiz da aplicação (não dentro de uma pasta a mais).
2. Configure `DISCORD_TOKEN` na variável segura da hospedagem. `CLIENT_ID` é opcional e `GUILD_ID` é opcional (recomendado no teste para comandos aparecerem rápido). NÃO publique nenhum token ou arquivo `.env` preenchido.
3. Reinicie o bot. As dependências externas `discord.js` e `dotenv` são instaladas a partir de `package.json` pela hospedagem.
4. Se a Discloud continuar mostrando `MODULE_NOT_FOUND` em `index.js:7`, a versão antiga ainda está sendo executada; faça novo deploy e confira o diretório raiz.

## Comandos

- `/recrutamento`: tickets e formulário de recrutamento.
- `/registro`: formulário **modal** sem ticket, turno, apelido, cargos e foto fictícia opcional.
- `/boletim`: publica o painel de BO (configurar canal e cargo de corporação no botão ⚙️).
- `/consultar_bo id:1234`: pesquisa BOs da sessão atual.

Os cargos de turno são configuráveis (manhã, tarde, noite, madrugada). BO permite mencionar policiais, enviar até 10 imagens ou vídeos, e editar apenas o texto/policiais dos BOs criados pelo próprio autor. Fotos e vídeos são enviados na mensagem original do Discord.

## Atenção: TESTE SEM ARMAZENAMENTO

- Não há banco de dados nem armazenamento local: configurações e índice dos BOs **se perdem quando o bot é reiniciado**. Arquivos/mensagens publicados no Discord persistem enquanto não forem excluídos, mas o bot não poderá editar/consultar os registros antigos pelo índice da RAM após reinício.
- Esse pacote não foi testado conectado a um servidor Discord real; a sintaxe JavaScript pode ser verificada com `node --check index.js`. Requer Node >=22.12 e discord.js conforme `package.json`.
- Não envie RG real; use apenas documentos fictícios do RP.
