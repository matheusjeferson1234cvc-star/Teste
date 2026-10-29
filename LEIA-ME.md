# CETUS — Pacote de teste, SEM banco de dados

Este pacote contém `index.js` e três sistemas conectados: Recrutamento, Registro Modal e Boletins de Ocorrência.

## Instalação

1. Extraia o ZIP inteiro. **Não junte o conteúdo de cada arquivo num único JS**.
2. Se for rodar localmente: instale Node 22.12+; use `npm install`, faça uma cópia de `.env.example` chamada `.env`, preencha `DISCORD_TOKEN` e opcionalmente `GUILD_ID`, depois `npm start`.
3. Se usar Discloud: envie o ZIP **com os arquivos na raiz**, sem `node_modules`. Configure `DISCORD_TOKEN` no ambiente seguro da hospedagem. Caso a sua forma de instalação exija um `.env` dentro do ZIP, o token será enviado à hospedagem; mantenha sempre o arquivo privado e NÃO publique esse ZIP com token.
4. Ative os intents **Server Members Intent** e **Message Content Intent** no Developer Portal (necessários ao recrutamento que lê respostas no chat).
5. Permissões do bot: Ver Canais, Enviar Mensagens, Ler Histórico, Gerenciar Canais (tickets de recrutamento), Gerenciar Cargos, Gerenciar Apelidos e Anexar Arquivos. Coloque o cargo do bot acima dos cargos que atribui.
6. Execute: `/recrutamento`, `/registro`, `/boletim`, e (para pesquisar BO) `/consultar_bo id:1234`.
7. Os comandos slash podem demorar se foram cadastrados globalmente; `GUILD_ID` faz o registro num servidor de testes.

## Registro sem tickets

* Clique em **Registre-se**. Preencha nome, ID, escolha um turno e, se quiser, adicione foto do documento FICTÍCIO do personagem (não envie RG real).
* O bot atualiza apelido, aplica cargos gerais e o cargo correspondente ao turno, remove outros cargos de turno quando configurados e publica log no canal selecionado.
* No botão de Configurações (administrador), ajuste canal de log, responsável, cargos a atribuir e remover, cargos dos quatro turnos, TAG e painel.
* Configuração de categoria de ticket **não existe mais**, pois o Registro agora usa modal.

## Boletins de Ocorrência

* `/boletim`: publica o painel. No botão **Configurar**, escolha o canal de BOs e o cargo da corporação.
* **Registrar Ocorrência**: formulário com ID do personagem, local, relato, policiais marcados e até 10 imagens/vídeos opcionais.
* **Minhas Ocorrências**: permite editar apenas os seus próprios registros. Nesta versão, a edição modifica texto e policiais, **sem substituir/adicionar arquivos**; anexos originais ficam mantidos no mesmo post.
* `/consultar_bo id:1234`: pesquisa o ID do personagem durante a sessão atual.
* O limite de tamanho de cada arquivo depende da conta e das regras de upload do Discord.

## Recrutamento (mantém os tickets somente AQUI)

* `/recrutamento` envia o painel. Configure categoria, canal de relatórios, canal de anúncios, recrutador, cargos e até 20 perguntas.
* Candidato abre ticket, pode enviar imagem de RG fictício, responde às perguntas com cronômetro por etapa e limite geral de 10 minutos.
* Relatório chega no canal configurado para aprovação/reprovação e atribuição/remoção de cargos.

## IMPORTANTE: sem persistência de dados

**NENHUM BANCO DE DADOS, SUPABASE, JSON OU ARMAZENAMENTO LOCAL é utilizado** nesta versão.

* Configurações, perguntas, boletins indexados, candidatos pendentes e sessões ficam apenas em memória RAM; **serão perdidos ao reiniciar o processo**.
* As mensagens e arquivos enviados para um canal do Discord continuam lá, enquanto o canal/mensagem existir, mas o bot deixa de reconhecer BOs anteriores para consulta e edição após reiniciar.
* Não compartilhe fotos pessoais reais. Este bot foi feito para um servidor de RP.

## Limites deste protótipo

Código verificável por sintaxe, mas **não foi testado em um servidor Discord real** neste ambiente. Verifique a versão do Node e discord.js da hospedagem. Os componentes modernos de upload em modal requerem versão recente da biblioteca e um cliente Discord atualizado. Faça testes em servidor separado antes de usar em produção.
