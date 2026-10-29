# CETUS V3.1 — Bot modular sem pastas

Esta versão mantém os sistemas do CETUS separados em arquivos, mas TODOS OS ARQUIVOS FICAM NA RAIZ.
Foi preparada para facilitar o envio individual pelo GitHub no celular.

## Estrutura

```
index.js                  <- liga todos os sistemas
cetus-comum.js            <- Components V2, utilitários, GIFs e painéis
cetus-recrutamento.js     <- tickets, perguntas, aprovação
cetus-registro.js         <- modal, TAG, cargos e turnos
cetus-ocorrencias.js      <- B.O., formulário, anexos, Consulta e edição
cetus-diagnostico.js      <- /diagnostico
cetus-gifs.js             <- /testar_gif e /corrigir_gifs
cetus-recrutamento.gif    <- banner animado
cetus-registro.gif        <- banner animado
cetus-boletim.gif         <- banner animado
package.json
smoke.js                  <- testes offline opcionais
LEIA-ME.md
.env.example              <- modelo de variáveis, SEM token
.gitignore
 discloud.config
```

**Não crie a pasta `sistemas` nesta versão.** Os comandos `require('./cetus-X')` são escritos para buscar os arquivos ao lado do `index.js`. Não altere os nomes dos GIFs.

## Como colocar no GitHub pelo celular

1. Faça backup do código antigo. Não apague tudo antes de guardar uma cópia.
2. Extraia o ZIP. Dentro dele estão todos os arquivos, **sem pastas**.
3. No GitHub, abra o repositório e toque em **Add file → Upload files**.
4. Selecione os arquivos extraídos diretamente, sem enviar o ZIP fechado.
5. Confirme com **Commit changes**.
6. Confira se `index.js`, `cetus-ocorrencias.js` e os 3 GIFs estão todos no mesmo nível da lista.

Se o navegador permitir enviar somente alguns por vez, faça vários commits. O GitHub suporta pastas, mas esta versão **não exige** envio de pastas.

Nunca publique um `.env` contendo `DISCORD_TOKEN`, senhas ou chaves. Configure `DISCORD_TOKEN` nas variáveis privadas da Discloud. `CLIENT_ID` e `GUILD_ID` podem ser definidos conforme seu ambiente.

## Envio para Discloud

Você pode enviar o ZIP inteiro da V3.1 (os arquivos estão na raiz) ou configurar o deploy a partir do GitHub com os arquivos da raiz. Não deixe uma pasta `Cetus-V3.1` adicional envolvendo o `index.js` no deploy.

Comandos: `/recrutamento`, `/registro`, `/boletim`, `/consultar_bo`, `/diagnostico`, `/testar_gif` e `/corrigir_gifs`.

## Correção do botão Consultar

- **Consultar** abre o formulário para digitar o **ID do personagem do RP**.
- Busca primeiro os B.O.s gerados desde que o bot foi iniciado e depois pesquisa mensagens anteriores publicadas pelo próprio bot no canal de B.O. configurado.
- O histórico verifica até **500 mensagens recentes** (5 páginas de 100) do canal; ocorrências mais antigas podem não ser encontradas.
- O bot precisa de permissão **Ver Canal** e **Ler Histórico de Mensagens** no canal de B.O.
- Sem Supabase, as **configurações ainda são perdidas ao reiniciar**. Após reiniciar, configure novamente o canal e cargo de B.O. para a busca funcionar; os relatórios antigos continuam no Discord.
- **Minhas** ainda mostra e edita apenas os boletins registrados desde a última inicialização. A busca histórica adicionada é para **Consultar** e `/consultar_bo`.

## O que continua igual

- Painel B.O. vermelho, com Prisão, Apreensão, Multa, Consultar, Configurações e Minhas.
- Publicação organizada por envolvido, local, descrição, policiais e arquivos (até 10).
- GIFs, registro por modal, recrutamento, diagnóstico e atualização automática dos painéis reconhecidos.
- Crédito **🤖 Organizações • Roleplay | Desenvolvido por Cetus**.

## Verificações locais

```
npm install
npm run check
npm run test:offline
```

Os testes offline não são uma confirmação de funcionamento em um servidor Discord real.
