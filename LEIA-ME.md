# Cetus V2.2 — Painel corrigido e atualização da mensagem antiga

**Esta é uma versão de teste, sem banco de dados.** Recrutamento, Registro e Boletins de Ocorrência continuam em um único `index.js`.

## Como comprovar que a nova versão está rodando

1. Envie este ZIP completo à Discloud, mantendo `index.js`, `package.json` e `discloud.config` na raiz. Não misture com arquivos antigos.
2. Configure `DISCORD_TOKEN` de forma privada na hospedagem (nunca compartilhe o token). Reinicie a aplicação.
3. Nos logs da Discloud, procure **`CETUS V2.2.0-PAINEL-CORRIGIDO ONLINE`**. Se não aparecer, ainda está executando o código antigo ou a aplicação falhou ao iniciar.
4. No Discord, rode `/cetus_versao`. O retorno deve mostrar **2.2.0-painel-corrigido**.

## Atualizar o painel antigo sem apagá-lo

- No Discord, toque e segure a mensagem antiga do **painel de B.O.**, escolha **Copiar link da mensagem**.
- Execute `/boletim` e preencha a opção **`atualizar`** com o link copiado.
- O bot edita essa mensagem no mesmo canal (se tiver permissão). O texto deve mostrar **CENTRAL DE BOLETINS** e **CETUS • PAINEL OPERACIONAL V2.2**.
- Se não preencher `atualizar`, `/boletim` envia um painel novo no canal atual.
- O bot só aceita editar mensagens enviadas por ele mesmo e identificadas como painel de B.O.

## Instalação e teste

- Node.js 22.12+; pacote usa `discord.js` 14.25.1. O ZIP deve ter `index.js`, `package.json`, `discloud.config`, `.env.example`, `.gitignore` e este arquivo na raiz.
- Verifique as permissões necessárias de Ver canal, Enviar mensagens, Ler histórico, Gerenciar cargos e anexar arquivos. Para tickets de Recrutamento, Gerenciar canais. Ative os intents necessários no Developer Portal.
- Comandos: `/cetus_versao`, `/boletim`, `/registro`, `/recrutamento`, `/consultar_bo`.
- Não execute o bot em duas hospedagens com o mesmo token simultaneamente; isso dificulta saber qual versão responde.

## Limitações

Esta versão **não se conecta ao Supabase nem armazena configurações localmente**. Configurações, processos de recrutamento em andamento e o índice de consulta e edição de BOs serão perdidos ao reiniciar. Mensagens e anexos já enviados ao Discord continuam no canal, a menos que sejam excluídos. O código passou por testes locais de sintaxe e estrutura, mas não foi testado em conexão real a um servidor Discord.
