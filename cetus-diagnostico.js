'use strict';
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { painel, donoAdmin, responder, atualizar, comLogo } = require('./cetus-comum');
const recrutamento = require('./cetus-recrutamento');
const registro = require('./cetus-registro');
const boletins = require('./cetus-ocorrencias');

const comando = new SlashCommandBuilder().setName('diagnostico')
  .setDescription('Confere as configurações, cargos e permissões do Cetus')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  .addStringOption(o => o.setName('sistema').setDescription('Sistema para verificar')
    .setRequired(false).addChoices(
      { name: 'Todos', value: 'todos' },
      { name: 'Recrutamento', value: 'rec' },
      { name: 'Registro', value: 'reg' },
      { name: 'Boletim de ocorrência', value: 'bo' }
    ));

function checarCargo(guild, me, id, nome) {
  if (!id) return `⚠️ ${nome}: não configurado`;
  const cargo = guild.roles.cache.get(id);
  if (!cargo) return `❌ ${nome}: cargo não existe mais`;
  if (cargo.managed) return `⚠️ ${nome}: cargo gerenciado por integração`;
  const acima = me.roles.highest.comparePositionTo(cargo) > 0;
  return `${acima ? '✅' : '❌'} ${nome}: ${acima ? 'hierarquia OK' : 'suba o cargo do bot acima de ' + cargo.name}`;
}
async function checarCanal(guild, me, id, nome, categoria = false) {
  if (!id) return `⚠️ ${nome}: não configurado`;
  const ch = await guild.channels.fetch(id).catch(() => null);
  if (!ch) return `❌ ${nome}: canal não encontrado`;
  if (categoria) return `${ch.type === 4 ? '✅' : '❌'} ${nome}: ${ch.type === 4 ? 'categoria válida' : 'canal não é uma categoria'}`;
  if (!ch.isTextBased?.() || !ch.send) return `❌ ${nome}: canal não aceita mensagens`;
  const p = ch.permissionsFor(me);
  const exigidas = [
    ['ver', PermissionsBitField.Flags.ViewChannel],
    ['enviar', PermissionsBitField.Flags.SendMessages],
    ['histórico', PermissionsBitField.Flags.ReadMessageHistory],
    ['anexar', PermissionsBitField.Flags.AttachFiles]
  ];
  const faltas = exigidas.filter(([,bit]) => !p?.has(bit)).map(([texto]) => texto);
  return faltas.length ? `❌ ${nome}: faltam permissões (${faltas.join(', ')})` : `✅ ${nome}: permissões OK`;
}
async function gerar(i, escolha) {
  const guild = i.guild;
  const me = await guild.members.fetchMe();
  const perm = me.permissions;
  const linhas = [];
  const rec = recrutamento.getConfig(i.guildId);
  const reg = registro.getConfig(i.guildId);
  const bo = boletins.getConfig(i.guildId);
  const incluir = x => escolha === 'todos' || escolha === x;
  const local = [
    ['Gerenciar cargos', PermissionsBitField.Flags.ManageRoles],
    ['Gerenciar apelidos', PermissionsBitField.Flags.ManageNicknames],
    ['Gerenciar canais', PermissionsBitField.Flags.ManageChannels]
  ];
  linhas.push('### 🤖 Permissões gerais do bot\n' + local.map(([nome, bit]) =>
    `${perm.has(bit) ? '✅' : '❌'} ${nome}`).join('\n'));
  if (incluir('rec')) {
    const r = [];
    r.push(await checarCanal(guild, me, rec.categoriaId, 'Categoria', true));
    r.push(await checarCanal(guild, me, rec.relatorioId, 'Canal de relatórios'));
    if (rec.anuncioId) r.push(await checarCanal(guild, me, rec.anuncioId, 'Canal de anúncios'));
    else r.push('⚠️ Canal de anúncios: não configurado (opcional)');
    r.push(checarCargo(guild, me, rec.cargoRecrutador, 'Cargo recrutador'));
    for (const [n, id] of rec.cargosAprovar.entries()) r.push(checarCargo(guild, me, id, `Cargo a atribuir ${n + 1}`));
    for (const [n, id] of rec.cargosRemover.entries()) r.push(checarCargo(guild, me, id, `Cargo a remover ${n + 1}`));
    r.push(`ℹ️ Perguntas: ${rec.perguntas.length}/20 • ${Math.round(rec.tempoMs/1000)}s por pergunta`);
    linhas.push('### 🟢 Recrutamento\n' + r.join('\n'));
  }
  if (incluir('reg')) {
    const r = [await checarCanal(guild, me, reg.logId, 'Canal de LOG'),
      checarCargo(guild, me, reg.cargoResponsavel, 'Responsável')];
    for (const [n, id] of reg.cargosAtribuir.entries()) r.push(checarCargo(guild, me, id, `Cargo a atribuir ${n + 1}`));
    for (const [n, id] of reg.cargosRemover.entries()) r.push(checarCargo(guild, me, id, `Cargo a remover ${n + 1}`));
    if (reg.usarTurnos) {
      for (const [t, id] of Object.entries(reg.turnos)) r.push(checarCargo(guild, me, id, `Turno ${t}`));
    } else r.push('ℹ️ Turno / Equipe está desativado');
    linhas.push('### 🔵 Registro\n' + r.join('\n'));
  }
  if (incluir('bo')) {
    linhas.push('### 🔴 Boletim de ocorrência\n' + [
      await checarCanal(guild, me, bo.canalId, 'Canal dos boletins'),
      checarCargo(guild, me, bo.cargoId, 'Cargo da corporação')
    ].join('\n'));
  }
  linhas.push('ℹ️ **Sem banco de dados:** configurações e índice de BOs deixam de existir após reiniciar o bot.\nEste diagnóstico não modifica nenhuma configuração.');
  // Evita estourar o limite do Text Display, mesmo em servidores com muitos cargos.
  const extras = linhas.map(linha => linha.slice(0, 3500));
  const nome = { todos:'Todos os sistemas', rec:'Recrutamento', reg:'Registro', bo:'Boletim de ocorrência' }[escolha] || 'Todos os sistemas';
  return painel('🩺 Diagnóstico do Cetus',
    `**Sistema:** ${nome}\n**Servidor:** ${guild.name}\nConfira os itens com ❌ e ajuste o cargo/permissões do bot.`,
    [[['diag:atualizar:'+escolha,'Verificar novamente',2,'🔄']],
     [['diag:voltar:'+escolha, 'Voltar',2,'↩️']]], 0x5865f2, extras);
}
async function handle(i) {
  const cmd = i.isChatInputCommand() && i.commandName === 'diagnostico';
  const btn = i.isButton() && i.customId.startsWith('diag:');
  if (!cmd && !btn) return false;
  if (!donoAdmin(i)) { await responder(i, '❌ Somente administradores podem executar o diagnóstico.'); return true; }
  const scope = cmd ? (i.options.getString('sistema') || 'todos') : (i.customId.split(':')[2] || 'todos');
  if (btn && i.customId.startsWith('diag:voltar:')) {
    const tela = scope === 'rec' ? recrutamento.menuConfig() :
      scope === 'reg' ? registro.painelConfig(registro.getConfig(i.guildId)) :
      scope === 'bo' ? boletins.painelConfig(boletins.getConfig(i.guildId)) : null;
    if (tela) await atualizar(i, tela);
    else await atualizar(i, painel('⚙️ Diagnóstico', 'Volte ao painel do sistema que deseja configurar.'));
    return true;
  }
  if (cmd) await i.deferReply({ flags: MessageFlags.Ephemeral });
  else if (i.message?.flags?.has?.(MessageFlags.Ephemeral)) await i.deferUpdate();
  else await i.deferReply({ flags: MessageFlags.Ephemeral });
  const tela = await gerar(i, ['rec', 'reg', 'bo'].includes(scope) ? scope : 'todos');
  if (btn && i.message?.flags?.has?.(MessageFlags.Ephemeral))
    await i.editReply(comLogo({ ...tela, flags: MessageFlags.IsComponentsV2 }, i.guild, i.client));
  else await responder(i, tela, true);
  return true;
}
module.exports = { comando, handle, gerar };
