'use strict';
const {
  MessageFlags, PermissionsBitField, ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle,
  FileUploadBuilder, StringSelectMenuBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');

const BRAND = '🤖 Organizações • Roleplay | Desenvolvido por Cetus';
const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;

function donoAdmin(i) {
  return !!i.guild && (i.guild.ownerId === i.user.id ||
    i.memberPermissions?.has(PermissionsBitField.Flags.Administrator) || false);
}
function limpar(s, tamanho = 1800) {
  return String(s ?? '').trim().slice(0, tamanho).replace(/@/g, '@\u200b');
}
function validoUrl(value) {
  if (!value) return null;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
function texto(content) { return new TextDisplayBuilder().setContent(content); }
function botoes(itens) {
  return new ActionRowBuilder().addComponents(...itens.map(([id, label, estilo = ButtonStyle.Secondary, emoji]) => {
    const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(estilo);
    if (emoji) b.setEmoji(emoji);
    return b;
  }));
}
function caixa(titulo, descricao, cor = 0x3498db, linhas = [], extras = [], rodape = true) {
  const c = new ContainerBuilder().setAccentColor(cor)
    .addTextDisplayComponents(texto(`# ${titulo}

${descricao}`));
  for (const extra of extras) {
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    if (extra?.type === 'actionrow') c.addActionRowComponents(extra.value);
    else c.addTextDisplayComponents(texto(String(extra)));
  }
  for (const linha of linhas) {
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addActionRowComponents(botoes(linha));
  }
  if (rodape) {
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addTextDisplayComponents(texto(BRAND));
  }
  return { flags: V2, components: [c] };
}
function painel(titulo, descricao, linhas = [], cor = 0x3498db, extra = []) {
  return caixa(titulo, descricao, cor, linhas, extra, true);
}
// Cabeçalho animado incluso no pacote. O arquivo permanece anexado à mensagem,
// portanto não precisa ser hospedado externamente e funciona mesmo após reiniciar.
function bannerAnimado(payload, tipo, bannerPersonalizado = null) {
  const permitidos = ['recrutamento', 'registro', 'boletim'];
  if (!permitidos.includes(tipo)) throw new Error('Tipo de banner desconhecido');
  const nome = `cetus-${tipo}.gif`;
  const url = validoUrl(bannerPersonalizado) || `attachment://${nome}`;
  const galeria = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
  const principal = payload?.components?.[0];
  if (typeof principal?.spliceComponents !== 'function') throw new Error('Painel V2 inválido para banner');
  principal.spliceComponents(0, 0, galeria);
  if (!validoUrl(bannerPersonalizado)) {
    // Buffer explícito para a Discloud sempre enviar os bytes do GIF correto.
    // A galeria referencia exatamente o nome do anexo enviado.
    const fs = require('node:fs');
    // Arquivos no diretório principal: compatível com upload individual pelo GitHub mobile.
    // Também aceita assets/ se o bot já estiver organizado em pastas.
    const path = require('node:path');
    const raiz = path.join(__dirname, nome);
    const legado = path.join(__dirname, 'assets', nome);
    const caminho = fs.existsSync(raiz) ? raiz : legado;
    if (!fs.existsSync(caminho)) throw new Error(`GIF não encontrado: ${nome}. Envie ${nome} junto do index.js no diretório principal.`);
    const bytes = fs.readFileSync(caminho);
    if (bytes.toString('ascii', 0, 6) !== 'GIF89a' && bytes.toString('ascii', 0, 6) !== 'GIF87a') {
      throw new Error(`Arquivo inválido (não é GIF): ${nome}`);
    }
    payload.files = [{ attachment: bytes, name: nome }];
  }
  return payload;
}
function aviso(msg, tipo = 'info') {
  const bruto = limpar(typeof msg === 'string' ? msg : String(msg || ''));
  let titulo = 'ℹ️ Informação';
  let cor = 0x3498db;
  if (bruto.startsWith('✅')) { titulo = '✅ Sucesso'; cor = 0x2ecc71; }
  else if (bruto.startsWith('❌')) { titulo = '❌ Erro'; cor = 0xe74c3c; }
  else if (bruto.startsWith('⚠️')) { titulo = '⚠️ Aviso'; cor = 0xf1c40f; }
  if (tipo === 'error') { titulo = '❌ Erro'; cor = 0xe74c3c; }
  if (tipo === 'warn') { titulo = '⚠️ Aviso'; cor = 0xf1c40f; }
  if (tipo === 'success') { titulo = '✅ Sucesso'; cor = 0x2ecc71; }
  const descricao = bruto.replace(/^[✅❌⚠️ℹ️]\s*/u, '');
  return caixa(titulo, descricao || 'Sem detalhes.', cor);
}
async function replyMensagem(message, payload, tipo = 'info') {
  return message.reply(comLogo(typeof payload === 'string' ? aviso(payload, tipo) : payload, message.guild, message.client));
}
// Aplica o ícone do servidor (ou avatar do bot) aos containers V2.
// Utiliza Section/Thumbnail, sem depender de links externos.
function comLogo(payload, guild, client = null) {
  if (!payload || !payload.components?.length) return payload;
  const logo = validoUrl(process.env.CETUS_LOGO_URL) ||
    guild?.iconURL?.({ extension: 'png', size: 256 }) ||
    client?.user?.displayAvatarURL?.({ extension: 'png', size: 256 });
  // Serializa builders e divide containers maiores que 10 filhos.
  // Limite oficial do Discord: 10 componentes diretos em cada container V2.
  const componentes = payload.components.flatMap(entrada => {
    const c = entrada?.toJSON?.() ?? entrada;
    if (c.type !== 17 || !Array.isArray(c.components)) return [c];
    const internos = [...c.components];
    const idx = internos.findIndex(f => f.type === 10 && f.content);
    if (logo && idx !== -1) {
      internos[idx] = {
        type: 9,
        components: [{ type: 10, content: internos[idx].content }],
        accessory: { type: 11, media: { url: logo } }
      };
    }
    const resultado = [];
    for (let ini = 0; ini < internos.length; ini += 10) {
      resultado.push({ ...c, components: internos.slice(ini, ini + 10) });
    }
    return resultado;
  });
  return { ...payload, components: componentes };
}
// Painéis públicos observados durante esta execução; nenhuma informação vai para disco.
// Quando o administrador abre Configurações num painel antigo, ele também é registrado.
const paineisPublicados = new Map();
function registrarPainelMensagem(tipo, guildId, msg) {
  if (!['recrutamento','registro','boletim'].includes(tipo) || !guildId) return false;
  const canalId = msg?.channelId || msg?.channel?.id;
  const mensagemId = msg?.id;
  if (!canalId || !mensagemId) return false;
  const chave = `${guildId}:${tipo}`;
  if (!paineisPublicados.has(chave)) paineisPublicados.set(chave, new Map());
  paineisPublicados.get(chave).set(`${canalId}:${mensagemId}`, { canalId, mensagemId });
  return true;
}
function registrarPainelDoClique(tipo, i) {
  const autorId = i.message?.author?.id;
  if (!autorId || autorId !== i.client?.user?.id || mensagemPrivada(i)) return false;
  return registrarPainelMensagem(tipo, i.guildId, i.message);
}
async function sincronizarPaineis(tipo, guild, client, criarPayload) {
  if (!guild?.id) return { atualizados: 0, falhas: 0 };
  const alvos = paineisPublicados.get(`${guild.id}:${tipo}`);
  if (!alvos?.size) return { atualizados: 0, falhas: 0 };
  let atualizados = 0;
  let falhas = 0;
  for (const [chave, alvo] of alvos) {
    try {
      const canal = await guild.channels.fetch(alvo.canalId);
      if (!canal?.messages?.fetch) throw new Error('Canal inacessível');
      const msg = await canal.messages.fetch(alvo.mensagemId);
      if (msg.author?.id !== client.user?.id) {
        alvos.delete(chave); // Nunca edita mensagens de outro bot.
        continue;
      }
      const dados = comLogo(criarPayload(), guild, client);
      // Preserva explicitamente os anexos atuais ao editar o painel.
      // Isso mantém a referência attachment://cetus-*.gif apontando a um GIF existente.
      const existentes = [...(msg.attachments?.values?.() || [])];
      const nomes = new Set(existentes.map(a => a.name));
      if (dados.files?.length) {
        dados.files = dados.files.filter(f => !nomes.has(f.name));
        if (!dados.files.length) delete dados.files;
      }
      dados.attachments = existentes.map(a => ({ id: a.id }));
      await msg.edit(dados);
      console.log(`[CETUS GIF] ${tipo}: painel ${alvo.mensagemId} atualizado; GIF ${nomes.has('cetus-' + tipo + '.gif') ? 'mantido' : 'incluído se necessário'}`);
      atualizados++;
    } catch (e) {
      falhas++;
      if (e.code === 10008 || e.code === 10003) alvos.delete(chave);
      console.warn(`[CETUS] Falha na atualização automática (${tipo}, ${chave}):`, e.message);
    }
  }
  return { atualizados, falhas };
}
async function enviarV2(canal, payload) {
  return canal.send(comLogo(payload, canal.guild, canal.client));
}
async function atualizar(i, payload) {
  return i.update(comLogo(payload, i.guild, i.client));
}
function mensagemPrivada(i) {
  const flags = i.message?.flags;
  if (!flags) return false;
  return typeof flags.has === 'function' ? flags.has(EPHEMERAL) : !!((flags.bitfield ?? flags) & EPHEMERAL);
}
// Clique público abre o painel privado. Cliques posteriores substituem a mesma mensagem.
async function abrirConfig(i, payload) {
  if (i.isButton?.() && mensagemPrivada(i)) return atualizar(i, payload);
  return responder(i, payload, true);
}
// Modais abertos a partir da mensagem privada podem atualizá-la também.
async function concluirConfig(i, payload) {
  if (i.isModalSubmit?.() && mensagemPrivada(i)) return atualizar(i, payload);
  return responder(i, payload, true);
}

function campo(id, rotulo, { value = '', max = 200, paragraph = false, required = true, placeholder } = {}) {
  const t = new TextInputBuilder().setCustomId(id)
    .setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setMaxLength(max).setRequired(required);
  if (value) t.setValue(String(value).slice(0, max));
  if (placeholder) t.setPlaceholder(placeholder);
  return new LabelBuilder().setLabel(rotulo).setTextInputComponent(t);
}
function upload(id, rotulo, max = 1, required = false) {
  return new LabelBuilder().setLabel(rotulo).setFileUploadComponent(
    new FileUploadBuilder().setCustomId(id).setMinValues(required ? 1 : 0)
      .setMaxValues(max).setRequired(required)
  );
}
function modal(id, titulo, campos) {
  return new ModalBuilder().setCustomId(id).setTitle(titulo).addLabelComponents(...campos);
}
function arquivos(i, id, limite = 10, apenasImagem = false) {
  const arr = [...(i.fields.getUploadedFiles(id, false)?.values() || [])];
  if (arr.length > limite) throw new Error(`Máximo de ${limite} arquivo(s).`);
  for (const a of arr) {
    const tipo = a.contentType || '';
    if (!(apenasImagem ? tipo.startsWith('image/') : (tipo.startsWith('image/') || tipo.startsWith('video/')))) {
      throw new Error(apenasImagem ? 'Envie uma imagem PNG, JPG ou WEBP.' : 'São permitidas apenas imagens e vídeos.');
    }
  }
  return arr;
}
function envioArquivos(arr) {
  return arr.map((a, index) => {
    const extension = (a.name?.split('.').pop() || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) ||
      (a.contentType?.startsWith('video/') ? 'mp4' : 'png');
    return { attachment: a.url, name: `cetus_${Date.now()}_${index}.${extension}` };
  });
}
async function responder(i, msg, v2 = false) {
  let data;
  if (typeof msg === 'string') {
    data = { ...aviso(msg), flags: EPHEMERAL | V2 };
  } else if (msg?.content && !msg?.components) {
    data = { ...aviso(msg.content), ...Object.fromEntries(Object.entries(msg).filter(([k]) => k !== 'content' && k !== 'flags')), flags: (msg.flags ?? 0) | EPHEMERAL | V2 };
  } else {
    data = { ...msg, flags: ((msg?.flags ?? 0) | EPHEMERAL | V2) };
  }
  const decorado = comLogo(data, i.guild, i.client);
  if (i.deferred) {
    // Ephemeral só é configurável no defer/reply inicial. No edit, use apenas IsComponentsV2.
    return i.editReply({ ...decorado, flags: V2 });
  }
  if (i.replied) return i.followUp(decorado);
  return i.reply(decorado);
}
async function erro(i, e) {
  console.error('⚠️ CETUS:', e);
  const msg = e?.message || 'Ocorreu um erro. Confira as permissões do bot.';
  try { return await responder(i, `❌ ${msg.slice(0, 1800)}`); }
  catch (err) { console.error('Falha ao responder interação:', err); }
}
function guildConfig(map, guildId, fabrica) {
  if (!map.has(guildId)) map.set(guildId, fabrica());
  return map.get(guildId);
}
function podeEnviar(canal) { return canal && typeof canal.send === 'function' && canal.isTextBased(); }
module.exports = {
  BRAND, V2, EPHEMERAL, donoAdmin, limpar, validoUrl, texto, botoes, caixa, painel, bannerAnimado, aviso, replyMensagem,
  campo, upload, modal, arquivos, envioArquivos, responder, erro, guildConfig, podeEnviar,
  comLogo, enviarV2, atualizar, abrirConfig, concluirConfig,
  registrarPainelMensagem, registrarPainelDoClique, sincronizarPaineis
};

