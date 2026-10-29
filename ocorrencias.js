'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, UserSelectMenuBuilder,
  StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ContainerBuilder,
  TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, painel, campo, upload, modal, arquivos, envioArquivos,
  responder, erro, guildConfig, podeEnviar
} = require('./comum');

const configuracoes = new Map();
const boletins = new Map(); // TESTE: sem banco de dados; perde índice e configurações após reiniciar.
let contador = 0;
const cfg = id => guildConfig(configuracoes, id, () => ({ canalId: null, cargoId: null }));
const botao = (a, b) => [a, b, ButtonStyle.Secondary];

const comandos = [
  new SlashCommandBuilder().setName('boletim').setDescription('Envia o painel de boletins de ocorrência')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('consultar_bo').setDescription('Consulta BOs pelo ID de personagem (durante esta execução)')
    .addStringOption(o => o.setName('id').setDescription('ID do personagem no RP').setRequired(true))
];

function cabecalho(i) {
  return painel('🚔 │ Central de Boletins de Ocorrência',
    'Registre ocorrências de RP, marque policiais envolvidos e inclua até **10 fotos ou vídeos**.\n\n**Minhas Ocorrências:** edite somente os boletins que você registrou.',
    [[['bo:novo', 'Registrar Ocorrência', ButtonStyle.Primary, '📝'],
      ['bo:minhas', 'Minhas Ocorrências', ButtonStyle.Secondary, '📁'],
      ['bo:config', 'Configurar', ButtonStyle.Secondary, '⚙️']]], 0x2f6fed);
}
function painelConfig(c) {
  return painel('⚙️ │ Configurar BOs',
    `**Canal de publicação:** ${c.canalId ? `<#${c.canalId}>` : '❌ Não configurado'}\n` +
    `**Cargo da corporação:** ${c.cargoId ? `<@&${c.cargoId}>` : '❌ Não configurado'}\n\n` +
    'Somente administradores configuram. A configuração é temporária nesta versão.',
    [[botao('bo:config_canal', 'Selecionar canal'), botao('bo:config_cargo', 'Selecionar cargo')]], 0x3498db);
}
function modalBO(bo = null) {
  const usuario = new UserSelectMenuBuilder().setCustomId('bo_policiais')
    .setMinValues(0).setMaxValues(10).setRequired(false);
  if (bo?.policiais?.length) usuario.setDefaultUsers(...bo.policiais);
  return modal(bo ? `bo:editar:${bo.codigo}` : 'bo:criar',
    bo ? `Editar ${bo.codigo}` : 'Registrar ocorrência', [
      campo('bo_id', 'ID do personagem envolvido', { value: bo?.personagemId, max: 80, placeholder: 'Ex.: 1234' }),
      campo('bo_local', 'Local / natureza da ocorrência', { value: bo?.local, max: 150 }),
      campo('bo_relato', 'Descrição do ocorrido (RP)', { value: bo?.relato, max: 1800, paragraph: true }),
      new (require('discord.js').LabelBuilder)().setLabel('Policiais envolvidos (opcional)').setUserSelectMenuComponent(usuario),
      ...(!bo ? [upload('bo_anexos', 'Fotos e vídeos (até 10, opcional)', 10)] : [])
    ]);
}
function registroDaInteracao(i) {
  const policiais = [...(i.fields.getSelectedUsers('bo_policiais', false)?.keys() || [])];
  return {
    personagemId: limpar(i.fields.getTextInputValue('bo_id'), 80),
    local: limpar(i.fields.getTextInputValue('bo_local'), 150),
    relato: limpar(i.fields.getTextInputValue('bo_relato'), 1800),
    policiais
  };
}
function corpoBO(b) {
  const mencoes = [...new Set([b.autorId, ...b.policiais])].map(id => `<@${id}>`).join(' ');
  return (
    `# 📋 │ BOLETIM DE OCORRÊNCIA ${b.codigo}\n\n` +
    `🆔 **ID do cidadão (RP):** ${b.personagemId}\n` +
    `📍 **Local / natureza:** ${b.local}\n` +
    `👮 **Policiais envolvidos:** ${mencoes}\n` +
    `📝 **Relato:**\n${b.relato}\n\n` +
    `📅 **Data:** <t:${Math.floor(b.criadoEm / 1000)}:f>\n` +
    (b.editadoEm ? `✏️ **Editado:** <t:${Math.floor(b.editadoEm / 1000)}:f>\n` : '') +
    `\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
  );
}
function gerarPublicacao(b, listaNomes = []) {
  const container = new ContainerBuilder().setAccentColor(0x2f6fed)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(corpoBO(b)));
  if (listaNomes.length) {
    const galeria = new MediaGalleryBuilder().addItems(...listaNomes.slice(0, 10).map(nome =>
      new MediaGalleryItemBuilder().setURL(`attachment://${nome}`)
    ));
    container.addMediaGalleryComponents(galeria);
  }
  return { components: [container], flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [], users: [...new Set([b.autorId, ...b.policiais])] } };
}
async function autorizado(i) {
  if (!i.inGuild()) { await responder(i, '❌ Use no servidor do Discord.'); return false; }
  const c = cfg(i.guildId);
  if (!c.cargoId || !c.canalId) { await responder(i, '⚠️ O administrador ainda precisa configurar o canal e o cargo da corporação no painel.'); return false; }
  if (donoAdmin(i)) return true;
  const m = await i.guild.members.fetch(i.user.id);
  if (!m.roles.cache.has(c.cargoId)) { await responder(i, '❌ Apenas policiais com o cargo da corporação podem registrar BOs.'); return false; }
  return true;
}
async function menuMinhas(i) {
  const meus = [...boletins.values()].filter(b => b.guildId === i.guildId && b.autorId === i.user.id)
    .sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 25);
  if (!meus.length) return responder(i, 'Você não criou nenhum BO nesta sessão do bot.');
  const lista = new StringSelectMenuBuilder().setCustomId('bo:escolher')
    .setPlaceholder('Selecione um BO para editar')
    .addOptions(meus.map(b => ({ value: b.codigo, label: `${b.codigo} • ${b.local}`.slice(0, 100) })));
  return i.reply({ content: 'Selecione um BO seu para editar:',
    components: [new ActionRowBuilder().addComponents(lista)], flags: MessageFlags.Ephemeral });
}
async function handle(i) {
  const isCmd = i.isChatInputCommand() && ['boletim','consultar_bo'].includes(i.commandName);
  const isBtn = i.isButton() && i.customId.startsWith('bo:');
  const isSelect = (i.isChannelSelectMenu() || i.isRoleSelectMenu() || i.isStringSelectMenu()) && i.customId.startsWith('bo:');
  const isModal = i.isModalSubmit() && i.customId.startsWith('bo:');
  if (!(isCmd || isBtn || isSelect || isModal)) return false;
  try {
    if (isCmd && i.commandName === 'boletim') {
      if (!donoAdmin(i)) { await responder(i, '❌ Apenas administradores podem publicar o painel.'); return true; }
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const msg = await i.channel.send(cabecalho(i));
      await i.editReply(`✅ Painel enviado: ${msg.url}`);
      return true;
    }
    if (isCmd && i.commandName === 'consultar_bo') {
      if (!(await autorizado(i))) return true;
      const id = i.options.getString('id').trim().toLowerCase();
      const lista = [...boletins.values()]
        .filter(b => b.guildId === i.guildId && b.personagemId.toLowerCase() === id).slice(-15);
      await responder(i, lista.length ? lista.map(b => `• **${b.codigo}** — ${b.local}\n${b.url}`).join('\n') :
        'Nenhum BO encontrado com esse ID nesta sessão.');
      return true;
    }
    if (isBtn && i.customId === 'bo:config') {
      if (!donoAdmin(i)) { await responder(i, '❌ Apenas administradores podem configurar.'); return true; }
      await responder(i, painelConfig(cfg(i.guildId)), true); return true;
    }
    if (isBtn && ['bo:config_canal','bo:config_cargo'].includes(i.customId)) {
      if (!donoAdmin(i)) { await responder(i, '❌ Sem permissão.'); return true; }
      const isCanal = i.customId.endsWith('canal');
      const s = isCanal ? { type: 8, custom_id: 'bo:selecionar_canal', channel_types: [0], placeholder: 'Selecione o canal dos BOs' }
        : { type: 6, custom_id: 'bo:selecionar_cargo', placeholder: 'Selecione o cargo policial' };
      await i.update({ flags: MessageFlags.IsComponentsV2, components: [{type:17,components:[
        {type:10,content: isCanal ? '# Selecione o canal de publicação' : '# Selecione o cargo da corporação'},
        {type:1,components:[s]}
      ]}] }); return true;
    }
    if (isSelect && ['bo:selecionar_canal','bo:selecionar_cargo'].includes(i.customId)) {
      if (!donoAdmin(i)) { await responder(i, '❌ Sem permissão.'); return true; }
      const c = cfg(i.guildId);
      if (i.customId === 'bo:selecionar_canal') c.canalId = i.values[0];
      else c.cargoId = i.values[0];
      await i.update(painelConfig(c)); return true;
    }
    if (isBtn && i.customId === 'bo:novo') {
      if (!(await autorizado(i))) return true;
      await i.showModal(modalBO()); return true;
    }
    if (isBtn && i.customId === 'bo:minhas') {
      if (!(await autorizado(i))) return true;
      await menuMinhas(i); return true;
    }
    if (isSelect && i.customId === 'bo:escolher') {
      if (!(await autorizado(i))) return true;
      const b = boletins.get(i.values[0]);
      if (!b || b.guildId !== i.guildId || b.autorId !== i.user.id) {
        await responder(i, '❌ Você só pode editar seus próprios boletins.'); return true;
      }
      await i.showModal(modalBO(b)); return true;
    }
    if (isModal && (i.customId === 'bo:criar' || i.customId.startsWith('bo:editar:'))) {
      if (!(await autorizado(i))) return true;
      const editando = i.customId.startsWith('bo:editar:');
      const codigo = editando ? i.customId.slice('bo:editar:'.length) : null;
      const antigo = editando ? boletins.get(codigo) : null;
      if (editando && (!antigo || antigo.guildId !== i.guildId || antigo.autorId !== i.user.id)) {
        await responder(i, '❌ Apenas o autor pode editar este BO.'); return true;
      }
      const dados = registroDaInteracao(i);
      const fotos = editando ? [] : arquivos(i, 'bo_anexos', 10, false);
      const c = cfg(i.guildId);
      for (const id of dados.policiais) {
        const m = await i.guild.members.fetch(id);
        if (!m.roles.cache.has(c.cargoId) && !donoAdmin(i)) {
          await responder(i, '❌ Marque apenas membros da corporação.'); return true;
        }
      }
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const canal = await i.guild.channels.fetch(editando ? antigo.canalId : c.canalId);
      if (!podeEnviar(canal)) throw new Error('Canal dos BOs não existe ou o bot não pode enviar mensagens.');
      if (!editando) {
        contador++;
        const b = { ...dados, codigo: `BO-${Date.now()}-${contador}`, guildId: i.guildId,
          autorId: i.user.id, criadoEm: Date.now(), editadoEm: null, canalId: canal.id };
        const files = envioArquivos(fotos);
        const payload = gerarPublicacao(b, files.map(f => f.name));
        const msg = await canal.send({ ...payload, ...(files.length ? { files } : {}) });
        b.mensagemId = msg.id; b.url = msg.url; b.arquivos = files.map(f => f.name);
        boletins.set(b.codigo, b);
        await i.editReply(`✅ **${b.codigo}** publicado: ${msg.url}`);
      } else {
        const msg = await canal.messages.fetch(antigo.mensagemId);
        const novo = { ...antigo, ...dados, editadoEm: Date.now() };
        // Nenhum campo attachments -> Discord mantém todos os arquivos anexados.
        await msg.edit(gerarPublicacao(novo, antigo.arquivos));
        boletins.set(codigo, novo);
        await i.editReply(`✅ **${codigo}** editado com sucesso: ${msg.url}`);
      }
      return true;
    }
    return true;
  } catch (e) { await erro(i, e); return true; }
}
module.exports = { comandos, handle };
