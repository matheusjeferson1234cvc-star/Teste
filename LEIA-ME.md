# Cetus V3.3 — Código Penal Reduto RP, seleção integrada

## Novidade no Boletim de Ocorrência

- 31 artigos fictícios do código penal do Reduto RP, organizados em 5 categorias.
- Em **Prisão**, **Apreensão** ou **Multa**, o bot abre **um único painel privado de seleção de artigos**, sem uma segunda página de confirmação. A pessoa pode pesquisar pelo número ou nome do crime (ex.: `21`, `homicídio`), filtrar por categoria, acrescentar **até 20 artigos** de grupos diferentes e remover artigos quando necessário.
- Os botões **Normal**, **Reduzida**, **Aumentada** escolhem o tipo de pena do boletim; os tempos dos artigos são somados.
- As multas fixas também são somadas. Para **Posse de Munição (28)** e **Tráfico de Drogas (04)**, use **Quantidades / Multa extra** para informar quantas unidades: a multa de cada artigo é multiplicada pela quantidade. É possível incluir uma multa extra manual em reais inteiros.
- **Fianças** são mostradas separadamente; não se somam ao valor da multa.
- O botão **Preencher e publicar B.O.** abre o formulário padrão do Discord com ID do personagem, local, descrição, policiais e fotos/vídeos. Após enviar, o bot publica automaticamente o B.O., com os artigos e totais visíveis em seção separada.
- A **edição** do B.O. também permite modificar a seleção dos artigos e mantém os anexos anteriores.

> Os códigos são regras **fictícias do Reduto RP** fornecidas pelo usuário, e não correspondem à legislação real.

### Artigo 04/2025 — valor a conferir
Na tabela fornecida, Tráfico de Drogas tem **pena normal de 20 min, reduzida de 32 min, aumentada de 26 min**. O arquivo preserva esses números exatamente, mas o painel sinaliza a inconsistência para confirmação.

## Código modular, sem criar pastas no GitHub

Todos os arquivos do ZIP ficam **diretamente na raiz**: `index.js`, `cetus-ocorrencias.js`, `cetus-codigo-penal.js`, os outros módulos `cetus-*.js`, três GIFs, `package.json`, `discloud.config`, `smoke.js` e documentos.

Quando a tabela do Reduto mudar, basta editar `cetus-codigo-penal.js`. Outros módulos de Recrutamento, Registro, GIFs e Diagnóstico continuam separados.

### Instalação

1. Guarde uma cópia do código anterior antes de substituir.
2. Extraia o ZIP e suba os arquivos **extraídos**, não o ZIP fechado, na raiz do repositório GitHub.
3. Confirme que **`cetus-codigo-penal.js`** e todos os outros `.js` foram enviados, com exatamente esses nomes.
4. Configure o token **fora do GitHub**, na Discloud, pela variável `DISCORD_TOKEN`.
5. Reinicie o bot e execute `/boletim` no canal onde está o painel antigo para atualizá-lo.
6. Abra as **Configurações** do B.O. e ajuste o canal e os cargos de acesso, pois as configurações ainda não são persistentes.
7. Teste **Prisão**, selecione vários artigos, use **Pesquisar**, altere o modo de pena, informe quantidades quando necessárias e confirme a publicação.

### Limitações

- **Sem banco de dados**, os rascunhos e as configurações não sobrevivem ao reinício. Rascunhos privados de artigos expiram em 30 minutos.
- O Discord limita os menus a 25 opções de cada vez; use as categorias ou a busca para localizar qualquer um dos 31 artigos.
- O Discord limita os modais a cinco campos; por isso a escolha dos artigos fica na mesma mensagem privada V2 e o preenchimento dos dados ocorre em um modal sobre essa mensagem.
- Os testes são **offline**, com simulação de interações e validação de sintaxe. Ainda é necessário confirmar a versão em um servidor Discord real.
- Preserve o crédito `🤖 Organizações • Roleplay | Desenvolvido por Cetus`.
