# CETUS V2.7 — Arquivos prontos para GitHub e Discloud

**Todos os arquivos devem ficar juntos na raiz do repositório, sem pasta `assets` e sem pasta `tests`.**

```text
index.js
package.json
discloud.config
cetus-recrutamento.gif
cetus-registro.gif
cetus-boletim.gif
smoke.js
LEIA-ME.md
.gitignore
.env.example
```

## Enviar pelo celular para o GitHub

1. Abra seu repositório e use **Add file → Upload files** (a interface pode mudar no celular).
2. Selecione e envie os arquivos acima diretamente na raiz do repositório.
3. Confirme o envio usando **Commit changes**.
4. Confira se os três `cetus-*.gif` estão na mesma página que o `index.js`, sem estarem dentro de outra pasta.
5. Atualize a hospedagem pela integração com GitHub, caso esteja configurada, ou envie o ZIP completo deste pacote na Discloud.

Não coloque seu token do Discord no GitHub. Configure `DISCORD_TOKEN` de forma privada na hospedagem. O `.env.example` é apenas modelo e **não** contém token real. Se o GitHub no celular esconder arquivos com ponto (como `.gitignore`), são opcionais para iniciar o bot. Nunca suba um `.env` preenchido.

## Teste e correção dos banners

- `/testar_gif`: envia um GIF de teste em resposta privada para você verificar o movimento.
- `/corrigir_gifs`: reenvia o GIF ao painel antigo. Informe o link da mensagem caso o painel não seja encontrado no canal atual.
- `/diagnostico`: consulta canais, cargos e permissões.
- Os arquivos agora são procurados ao lado do `index.js`; o caminho antigo `assets/` também é aceito para quem já possui uma instalação com pasta.

Um banner personalizado cadastrado como URL nos ajustes pode substituir o GIF padrão; apague a URL configurada para o GIF incluído aparecer automaticamente. Se o arquivo chegar ao Discord, mas ficar parado, confira as preferências de reprodução de GIFs do aplicativo.

## Arquivos e versões

O ZIP `Cetus-GitHub-ARQUIVOS-SOLTOS.zip` contém os arquivos da raiz, pronto para extrair e enviar individualmente ao GitHub. O mesmo ZIP também pode ser usado para instalar na Discloud. **Não envie o ZIP para dentro do próprio repositório como se fosse parte do projeto.**

Requer Node.js 22.12 ou mais recente. O código não contém banco de dados; as configurações em memória são perdidas ao reiniciar. Mensagens já enviadas ao Discord não são apagadas por isso.

### Verificação local (opcional)

```
node --check index.js
node smoke.js
```
