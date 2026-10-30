# Cetus V3.5 — Equipe no próprio Modal V2 | GitHub sem pastas

Esta versão atualiza o bot anterior e **mantém os outros sistemas**: Recrutamento, Registro, GIFs, diagnóstico e atualizações automáticas.

## Como usar Boletim de Ocorrência

1. Configure seu bot e publique ou atualize o painel com `/boletim` no canal onde está o painel antigo.
2. Toque em **Configurações**: abre um **modal V2** com canal de relatórios, cargo geral, cargo de Prisão, cargo de Apreensão e cargo de Multa.
3. Toque em **Prisão**, **Apreensão** ou **Multa**: o **modal V2 abre imediatamente**, sem passar por painel intermediário.
4. Complete ID fictício do personagem, local, descrição, códigos penais e selecione **até 10 colegas policiais no próprio modal**, antes de enviar. O autor é incluído automaticamente. A publicação separa essas informações em seções.
5. Após publicar, a resposta privada oferece **Editar B.O.**, **Equipe** (caso queira alterar os participantes) e **Arquivos** (para adicionar até 10 fotos/vídeos). Os anexos são opcionais e são inseridos após salvar, porque o modal principal já usa os cinco campos disponíveis.
6. **Pesquisar artigos** abre um modal para procurar por nome ou número; o resultado retorna com os nomes e valores, permitindo voltar ao modal de B.O. e digitar os códigos.

### Campo "Artigos, pena e multa extra"

Digite os artigos separados por vírgulas. O sistema usa os **31 artigos fictícios do Reduto RP** fornecidos pelo usuário.

- `01, 02, 07` — três artigos, penas normais e somadas.
- `01, 28x12, 04x3; pena=reduzida` — quantidades por unidade e pena reduzida.
- `02, 03; pena=aumentada; extra=500` — pena aumentada com multa adicional de R$ 500.
- `01/2025, 02/2025` — também aceita a notação completa.

`pena=normal` é o padrão. Para os artigos de multa por unidade (04 e 28), é obrigatório usar `04xN` e `28xN` com uma quantidade maior que zero. Para não adicionar crimes, deixe o campo em branco. Até **20 artigos diferentes** e **10 evidências** por boletim.

**Nota de consistência:** o Art. 04 conserva os valores enviados pelo usuário (normal 20, reduzida 32, aumentada 26 min); confirme-os com os administradores do Reduto RP.

### Por que nem tudo está no mesmo modal?

Modais do Discord permitem até **cinco componentes rotulados**. O modal principal já tem ID, local, descrição, artigos e **seleção de colegas**. Por isso, as fotos e vídeos são adicionados pelo botão **Arquivos** após salvar. A seleção de colegas **não exige outra etapa**. O botão separado **Equipe** serve somente para editar os participantes depois. O GIF e os botões continuam no **painel público Components V2**, pois o Discord não permite fixar um modal como mensagem permanente. Não há busca instantânea enquanto você digita no modal; o botão "Pesquisar artigos" faz a pesquisa.

## Instalação pelo GitHub no celular

Todos os arquivos devem ficar **na raiz do repositório**, sem subpastas. Extraia o ZIP e envie o conteúdo por **Add file → Upload files**. Adicione também o arquivo novo `cetus-bo-modais.js` e mantenha `cetus-codigo-penal.js`, `cetus-ocorrencias.js`, `index.js`, os três GIFs e os demais arquivos.

Configure a variável `DISCORD_TOKEN` **na Discloud**; não publique o token no GitHub. `GUILD_ID` e `CLIENT_ID` são opcionais, conforme a configuração anterior.

**No GitHub não basta adicionar os novos arquivos:** substitua os arquivos antigos de mesmo nome, principalmente `cetus-ocorrencias.js` e `index.js`.

### Validação offline

- `npm run check` — checagem de sintaxe.
- `npm run test:offline` — testes com Discord simulado; não abre conexão com um servidor real.

Configurações e o índice de B.O.s desta versão ainda ficam **somente em RAM** e desaparecem após reiniciar. A consulta histórica pode buscar mensagens no canal configurado, mas editar um B.O. anterior à reinicialização requer persistência futura. As regras penais são **fictícias e específicas do servidor RP**, não leis reais.

**Crédito original:** 🤖 Organizações • Roleplay | Desenvolvido por Cetus
