# CETUS V2.6 — Banners GIF animados integrados

**Este ZIP contém o bot completo para Discloud.** Não precisa hospedar os GIFs em outro site.

## Instalação

1. Faça backup dos arquivos e configurações atuais do bot.
2. Envie **o ZIP completo** para a Discloud. Ele contém na raiz `index.js`, `package.json`, `discloud.config`, `.env.example`, `assets/` e `tests/`.
3. Configure `DISCORD_TOKEN` nas variáveis privadas da hospedagem, sem publicá-lo em chats ou no GitHub.
4. Garanta as permissões do bot e as intents necessárias no Developer Portal. Reinicie.
5. Use `/recrutamento`, `/registro` e `/boletim` para publicar os painéis animados. Os banners padrão vêm da pasta `assets/` do ZIP.

## GIFs inclusos

- `assets/cetus-recrutamento.gif` — fundo preto e vermelho, glitch ciano/vermelho, movimento em loop.
- `assets/cetus-registro.gif` — neon azul/vermelho, glitch e varredura suave.
- `assets/cetus-boletim.gif` — tema policial ficcional, vermelho e azul, animação em loop.

Os GIFs são anexados **à própria mensagem** usando `attachment://` e aparecem no início dos painéis Components V2. O código faz a primeira publicação com o arquivo incluído no pacote. Nas atualizações automáticas, reutiliza o GIF anexado em vez de duplicar arquivos. Se o painel for antigo e não tiver GIF, o bot adiciona o GIF quando o painel for atualizado.

**Painéis antigos:** após reiniciar, abra uma vez **Configurações** em cada painel público antigo para que o bot reconheça a mensagem naquela execução. Depois, as alterações nas configurações atualizam essa mensagem automaticamente. Para um painel novo, execute o comando correspondente.

Você ainda pode usar um banner personalizado por URL nas opções visuais de Recrutamento e Registro. O banner GIF incluído é o padrão quando a URL personalizada não estiver configurada.

O Discord pode reduzir ou desativar a reprodução automática dos GIFs segundo as preferências de acessibilidade do usuário. A primeira imagem do GIF continua visível.

## Funcionalidades preservadas

- Recrutamento com tickets, perguntas, aprovações e relatórios.
- Registro em modal, quatro turnos opcionais e cargos automáticos.
- Boletim de Ocorrência de roleplay (Prisão, Apreensão, Multa), consulta e até 10 fotos/vídeos.
- `/diagnostico` e painéis de configuração com navegação V2.
- Atualização automática de painéis reconhecidos durante esta execução.
- Crédito original: **🤖 Organizações • Roleplay | Desenvolvido por Cetus**.

## Limitações e testes

Esta versão **continua sem banco de dados**. Configurações, perguntas, candidaturas pendentes e índice dos BOs não são preservados após reiniciar, embora as mensagens enviadas ao Discord não sejam apagadas automaticamente.

Testes locais: `node --check index.js` e `node tests/smoke.js`. Os testes conferem as estruturas V2, os GIFs no painel, a atualização automática, turnos e diagnóstico. **Não substituem os testes reais conectados ao Discord**.

Dependências são instaladas pelo gerenciador de pacotes do host usando `package.json`. Não envie arquivos secretos junto do ZIP.
