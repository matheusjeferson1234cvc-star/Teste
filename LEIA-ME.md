# CETUS — V2 com visual profissional (teste sem armazenamento)

Esta versão reúne os sistemas de **Recrutamento, Registro sem tickets e Boletins de Ocorrência** em **um único `index.js`**. Não requer `sistemas/`, Supabase nem banco de dados.

## Instalar na Discloud

1. Faça backup do seu bot atual e, se possível, teste primeiro em um servidor Discord de testes.
2. Envie o ZIP sem modificar a estrutura. `index.js`, `package.json` e `discloud.config` estão na raiz.
3. Configure **`DISCORD_TOKEN`** em local privado na hospedagem. Nunca publique o token no GitHub ou envie para outra pessoa. Se usar o `.env`, mantenha-o privado.
4. Confira as permissões: Ver canais, Enviar mensagens, Ler histórico, Gerenciar cargos, Gerenciar apelidos, Gerenciar canais (tickets do Recrutamento) e Anexar arquivos. O cargo do bot deve ficar acima dos cargos atribuídos.
5. Ative **Server Members Intent** e **Message Content Intent** no Developer Portal, necessários para cargos e respostas do Recrutamento.
6. Reinicie e teste os comandos `/recrutamento`, `/registro`, `/boletim` e `/consultar_bo`.

Use Node.js 22.12+ e `discord.js` 14.25.1. Em um computador, rode `npm install`, `npm run check` e `npm start`.

## Interface e cores

- **Recrutamento: verde**, com aprovação/reprovação, perguntas, temporizadores e ticket apenas nesse sistema.
- **Registro: azul**, totalmente por modal, com nome do personagem, ID, seleção de turno e imagem de documento **fictício** opcional. O bot aplica o cargo de turno selecionado e remove cargos de outros turnos, se configurados.
- **Boletins: vermelho**, com Prisão, Apreensão e Multa; formulário com marcação de policiais e até dez imagens/vídeos. A cor da publicação depende do tipo. Consulta pelo botão ou `/consultar_bo`. Apenas o autor pode editar seus próprios BOs.
- **Configurações:** o primeiro clique abre uma resposta **privada**; os submenus, seletores e botões Voltar **atualizam a mesma mensagem**, sem abrir uma coleção de janelas. Formulários modais continuam abrindo normalmente quando necessário.
- **Visual V2** para painéis, respostas de sucesso/erro, logs, aprovação e mensagens privadas.
- **Ícone:** o bot tenta usar `CETUS_LOGO_URL` (opcional), depois o ícone do servidor e depois o avatar do bot.

## IMPORTANTE: teste sem banco de dados

**Tudo que está em memória some ao reiniciar**: configurações, IDs dos painéis, perguntas, processos pendentes e índice dos boletins (consulta/edição). Os BOs já publicados e os arquivos que estão no Discord permanecem nas mensagens enquanto não forem excluídos, mas o bot não reconhecerá seu histórico para consulta/edição após reiniciar.

Na edição de BO, o bot preserva os anexos publicados, sem adicionar novos arquivos. O limite de tamanho de upload depende do Discord.

## Testes que você deve fazer

1. Recrutamento: Configurações → Visão geral → Voltar → Canais e cargos → Voltar; perguntas e tempo; aprovação/reprovação.
2. Registro: Configurações → Cargos dos turnos → Voltar; escolha cada turno no modal e confira a atribuição de cargo e a foto no LOG.
3. Boletim: Configurações → Definir canal/cargo → Voltar; registre um BO com imagens/vídeos fictícios; consulte pelo ID e edite o próprio boletim. Confira que os anexos permanecem no post.
4. Reinicie apenas após confirmar os testes, pois **os dados de memória serão perdidos**.

**Verificação realizada nesta preparação:** sintaxe do JavaScript e simulação local de navegação nos menus. Não foi possível executar o bot em uma conexão real ao Discord; se aparecer erro na Discloud, mande o trecho de logs.
