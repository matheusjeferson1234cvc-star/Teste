# CETUS Bot V2.5 — Atualização automática dos painéis e Diagnóstico

## Instalação na Discloud

1. Faça backup da aplicação atual. O arquivo ZIP **não** inclui token nem banco de dados.
2. Envie o ZIP contendo `index.js`, `package.json`, `discloud.config`, `.env.example` e `tests/smoke.js` na raiz.
3. Configure **DISCORD_TOKEN** de forma privada na hospedagem; nunca publique o valor no GitHub ou no chat.
4. Ligue **Server Members Intent** e **Message Content Intent** nas configurações do bot no Developer Portal do Discord.
5. Garanta que o bot tenha as permissões necessárias: gerenciar canais, cargos e apelidos; ver/enviar mensagens, ler histórico, anexar arquivos. O cargo do bot precisa estar **acima** dos cargos que ele alterará.
6. Reinicie. Use `GUILD_ID` (opcional) para cadastrar comandos rapidamente no servidor de testes. Confira os logs antes de usar os painéis.

## Comandos

- `/recrutamento` — publica o painel de recrutamento (por ticket).
- `/registro` — publica o painel de registro (por modal, sem ticket).
- `/boletim` — publica o painel de ocorrências.
- `/consultar_bo` — procura BO pelo ID do personagem (durante a execução atual).
- `/diagnostico` — relatório **privado** que verifica configuração de canais, cargos, hierarquia e permissões; escolha `Todos` ou um sistema. Também há botão **Diagnóstico** dentro dos menus de configuração.
- **Não é necessário comando para atualizar painéis.** Após alterar uma configuração no menu, o bot tenta editar automaticamente os painéis daquele sistema que reconhece.

## O que mudou

- **Menus em Components V2** com bordas coloridas e opções parecidas com as referências. O rodapé do desenvolvedor foi preservado exatamente como estava no código.
- **Diagnóstico** informa permissões ausentes, canais não encontrados, cargos inexistentes e problemas na hierarquia do bot.
- **Navegação** dos menus retorna à mesma mensagem privada, usando botão **Voltar**; os formulários são abertos em modal.
- **Atualização automática** de Recrutamento, Registro e Boletim: alterações de canais, cargos, turnos, perguntas, títulos, descrições e banners editam as mensagens públicas do próprio bot que foram reconhecidas nesta execução. Vários painéis do mesmo sistema podem ser atualizados.
- **Painéis antigos:** após reiniciar o bot, o administrador pode clicar uma vez no botão **Configurações** do painel público antigo para que ele seja reconhecido; alterações posteriores o atualizam sem comando. Isso não cria mensagens novas.
- **Recrutamento** mantém perguntas, cronômetro, aprovação/reprovação, proteção contra duplicação e copia a imagem de RG *fictício do personagem* para o relatório quando possível.
- **Registro** funciona sem ticket; o menu pode ativar/desativar **Turno / Equipe**, e com a opção ativa há seleção de Manhã, Tarde, Noite e Madrugada e atribuição do cargo correspondente. Foto *fictícia do personagem* é opcional.
- **Boletim** mantém Prisão, Apreensão e Multa (roleplay), consulta, edição pelo autor e envio de até 10 imagens ou vídeos por formulário.

## Limitações desta versão

**Sem armazenamento persistente.** Configurações, perguntas, IDs dos painéis, candidaturas pendentes e índice de consulta dos BOs são apagados quando o bot reinicia. **Mensagens já publicadas no Discord não são apagadas automaticamente**. Para que uma mensagem antiga do mesmo bot volte a receber atualizações automáticas depois de reiniciar, clique uma vez no botão público **Configurações** dela. Se houver vários painéis antigos, clique em Configurações de cada um uma vez após reiniciar. O painel precisa ter botões compatíveis com esta versão e o bot precisa ter permissão para editar sua própria mensagem.

Se você quiser que isso funcione mesmo depois de reiniciar sem clicar nos painéis antigos, a próxima etapa será adicionar armazenamento persistente (por exemplo, Supabase).

A cópia da imagem de RG fictício é tentada durante a publicação do relatório; se o envio falhar, o painel mostrará um aviso. Não envie documentos reais de identidade.

## Testes locais (sem token)

- `node --check index.js`
- `node tests/smoke.js`

Esses testes verificam sintaxe, a estrutura V2, os painéis de configurações, os turnos do registro, o diagnóstico, a navegação e a **atualização automática de mensagens** em simulação. Não executam chamadas reais à API do Discord. É necessário testar as permissões, o envio de anexos e os cargos na Discloud.

## Configuração de ambiente (opcional)

- `DISCORD_TOKEN` — obrigatório e secreto.
- `CLIENT_ID` — opcional.
- `GUILD_ID` — opcional, recomendado para testar slash commands rapidamente.
- `CETUS_LOGO_URL` — URL pública para a logo do painel; se vazio, usa o ícone do servidor ou avatar do bot.

A versão usa Node.js 22.12+ e `discord.js` 14.25.1. O ZIP **não** inclui `node_modules`; a Discloud precisa instalar as dependências do `package.json`.
