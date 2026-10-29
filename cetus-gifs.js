'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { donoAdmin, responder, painel, bannerAnimado, comLogo, registrarPainelMensagem } = require('./cetus-comum');
const recrutamento = require('./cetus-recrutamento');
const registro = require('./cetus-registro');
const boletins = require('./cetus-ocorrencias');

const tipos = [
  { name: 'Recrutamento', value: 'recrutamento' },
  { name: 'Registro', value: 'registro' },
  { name: 'Boletim de Ocorrência', value: 'boletim' }
];
const comandos = [
  new SlashCommandBuilder().setName('testar_gif')
    .setDescription('Testa um GIF animado do Cetus numa mensagem privada V2')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('tipo').setDescription('GIF a testar').setRequired(true).addChoices(...tipos)),
  new SlashCommandBuilder().setName('corrigir_gifs')
    .setDescription('Atualiza o GIF de um painel antigo, sem recriar a mensagem')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('tipo').setDescription('Sistema do painel').setRequired(true).addChoices(...tipos))
    .addStringOption(o => o.setName('link').setDescription('Link do painel antigo (vazio: buscar neste canal)').setRequired(false))
];
function criar(tipo, guildId, forcarGif = false) {
  if (tipo === 'recrutamento') {
    const cfg = recrutamento.getConfig(guildId);
    return recrutamento.buildPanel(forcarGif ? { ...cfg, bannerUrl: null } : cfg);
  }
  if (tipo === 'registro') {
    const cfg = registro.getConfig(guildId);
    return registro.buildPanel(forcarGif ? { ...cfg, bannerUrl: null } : cfg);
  }
  if (tipo === 'boletim') return boletins.buildPanel();
  throw new Error('Tipo desconhecido');
}
function identificar(msg) {
  const ids = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (value.customId || value.custom_id) ids.push(value.customId || value.custom_id);
    for (const child of (value.components || [])) walk(child);
  };
  for (const c of msg.components || []) walk(c.toJSON?.() || c);
  if (ids.some(x => ['rec:iniciar', 'iniciar_formulario'].includes(x))) return 'recrutamento';
  if (ids.some(x => ['reg:iniciar', 'iniciar_ticket_registro'].includes(x))) return 'registro';
  if (ids.some(x => x.startsWith('bo:novo:') || x.startsWith('bo:config'))) return 'boletim';
  return null;
}
function parseLink(link, guildId) {
  const m = /^https?:\/\/(?:canary\.|ptb\.)?(?:discord(?:app)?\.com)\/channels\/(\d+)\/(\d+)\/(\d+)(?:\?.*)?$/.exec(link || '');
  if (!m || m[1] !== guildId) throw new Error('Link inválido ou de outro servidor. Copie o link da mensagem do painel.');
  return { channelId: m[2], messageId: m[3] };
}
async function repararMensagem(i, msg, tipo) {
  if (msg.author?.id !== i.client.user.id) throw new Error('Essa mensagem não foi enviada pelo Cetus.');
  const detectado = identificar(msg);
  if (detectado !== tipo) throw new Error(`Mensagem não é um painel do tipo ${tipo} (detectado: ${detectado || 'desconhecido'}).`);
  const payload = comLogo(criar(tipo, i.guildId, true), i.guild, i.client);
  // Força enviar o GIF novo, mesmo que o anexo antigo esteja quebrado ou parado.
  // Outros anexos permanecem; o GIF anterior será substituído no mesmo painel.
  payload.attachments = [...msg.attachments.values()]
    .filter(a => a.name !== `cetus-${tipo}.gif`).map(a => ({ id:a.id }));
  await msg.edit(payload);
  registrarPainelMensagem(tipo, i.guildId, msg);
  console.log(`[CETUS GIF] ${tipo}: reparado painel ${msg.id}, novo GIF ${payload.files?.[0]?.name || '(URL personalizada)'}`);
  return msg;
}
async function handle(i) {
  if (!i.isChatInputCommand() || !['testar_gif', 'corrigir_gifs'].includes(i.commandName)) return false;
  if (!donoAdmin(i)) { await responder(i, '❌ Apenas administradores podem testar ou corrigir os GIFs.'); return true; }
  const tipo = i.options.getString('tipo');
  try {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    if (i.commandName === 'testar_gif') {
      const teste = bannerAnimado(painel('🎞️ Teste de animação', `Este é o GIF do sistema: **${tipo}**. Se ele aparecer parado, confira as opções de animação do Discord.`), tipo);
      const payload = comLogo(teste, i.guild, i.client);
      // Após deferReply(ephemeral), o edit não pode declarar Ephemeral novamente.
      payload.flags = MessageFlags.IsComponentsV2;
      await i.editReply(payload);
      return true;
    }
    const link = i.options.getString('link');
    let mensagens = [];
    if (link) {
      const ids = parseLink(link, i.guildId);
      const canal = await i.guild.channels.fetch(ids.channelId);
      if (!canal?.messages?.fetch) throw new Error('Não foi possível abrir o canal do painel.');
      mensagens = [await canal.messages.fetch(ids.messageId)];
    } else {
      const achados = await i.channel.messages.fetch({ limit:100 });
      mensagens = [...achados.values()].filter(m => m.author?.id === i.client.user.id && identificar(m) === tipo);
    }
    let sucesso = 0, erro = 0;
    for (const msg of mensagens.slice(0,10)) {
      try { await repararMensagem(i, msg, tipo); sucesso++; }
      catch (e) { console.warn('[CETUS GIF] Falha de reparo:', e.message); erro++; }
    }
    await responder(i, sucesso ? `✅ GIF atualizado em **${sucesso}** painel(is) de ${tipo}. ${erro ? `${erro} falha(s).` : 'Tudo certo.'}` :
      `⚠️ Não encontrei um painel de ${tipo} neste canal. Use o campo **link** para indicar a mensagem antiga.`);
    return true;
  } catch (e) {
    console.error('[CETUS GIF] Erro:',e);
    await responder(i, `❌ Não foi possível atualizar o GIF: ${e.message}`);
    return true;
  }
}
module.exports = { comandos, handle, identificar, criar, repararMensagem };
