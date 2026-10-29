'use strict';
const {
  MessageFlags, PermissionsBitField, ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle,
  FileUploadBuilder, StringSelectMenuBuilder
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
function painel(titulo, descricao, linhas = [], cor = 0x3498db, extra = []) {
  const c = new ContainerBuilder().setAccentColor(cor).addTextDisplayComponents(texto(`# ${titulo}\n\n${descricao}`));
  if (extra.length) c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  for (const e of extra) c.addTextDisplayComponents(texto(e));
  for (const linha of linhas) {
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addActionRowComponents(botoes(linha));
  }
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(texto(BRAND));
  return { flags: V2, components: [c] };
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
  const data = typeof msg === 'string' ? { content: msg, flags: EPHEMERAL } :
    { ...msg, flags: v2 ? (EPHEMERAL | V2) : (msg.flags ?? EPHEMERAL) };
  if (i.deferred) return i.editReply(data);
  if (i.replied) return i.followUp(data);
  return i.reply(data);
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
  BRAND, V2, EPHEMERAL, donoAdmin, limpar, validoUrl, texto, botoes, painel,
  campo, upload, modal, arquivos, envioArquivos, responder, erro, guildConfig, podeEnviar
};
