'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ButtonStyle,
  StringSelectMenuBuilder, LabelBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, validoUrl, painel, bannerAnimado, aviso, campo, upload, modal, arquivos, envioArquivos,
  responder, erro, guildConfig, podeEnviar, enviarV2, comLogo, atualizar, abrirConfig, concluirConfig,
  registrarPainelMensagem, registrarPainelDoClique, sincronizarPaineis
} = require('./cetus-comum');
const configs = new Map();
const novo = () => ({ logId: null, cargoResponsavel: null, cargosAtribuir: [], cargosRemover: [],
  usarTurnos: false,
  turnos: { manha: null, tarde: null, noite: null, madrugada: null }, tag: '',
  titulo: '👤 │ Central de Registro', descricao: 'Utilize este painel para realizar seu **registro oficial** na organização.\nApós concluir o formulário, seus dados serão processados e sua identificação será atualizada automaticamente.', bannerUrl: null, painelCanal: null, painelMensagem: null });
const cfg = id => guildConfig(configs, id, novo);
const comando = new SlashCommandBuilder().setName('registro')
  .setDescription('Envia o painel oficial de registro (sem ticket)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
const nomes = { manha: '🌅 Manhã', tarde: '☀️ Tarde', noite: '🌙 Noite', madrugada: '🌌 Madrugada' };
function painelRegistro(c) {
  const resultado = painel(c.titulo,
    c.descricao,
    [[['reg:iniciar', 'Registre-se', ButtonStyle.Primary, '📝'],
      ['reg:config', 'Configurações', ButtonStyle.Secondary, '⚙️']]], 0x2980b9,
    ['## ❔ Como funciona?\n> • 📝 Preencha o formulário de registro.\n> • 👤 Informe seus dados corretamente.\n> • 🏷️ Seu nome e cargos serão configurados automaticamente.\n> • ✅ O registro será concluído imediatamente.']);
  return bannerAnimado(resultado, 'registro', c.bannerUrl);
}
async function sincronizarPainel(i, c) {
  return sincronizarPaineis('registro', i.guild, i.client, () => painelRegistro(c));
}
function status(c) {
  const turnoAtivo = c.usarTurnos ? 'Turno/Equipe: Ativado' : 'Turno/Equipe: Desativado';
  const components = [
    { type:10, content:'# ⚙️ Configuração de Registro\n\nConfigure os canais e cargos do sistema abaixo.' },
    { type:14, divider:true, spacing:1 },
    { type:1, components:[{ type:8, custom_id:'reg:s_log', channel_types:[0], placeholder:'📌 Selecione canal de LOG' }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_atribuir', placeholder:'🎖️ Selecione cargo a atribuir', min_values:0, max_values:5 }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_remover', placeholder:'🗑️ Selecione cargos a remover', min_values:0, max_values:5 }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_responsavel', placeholder:'📣 Selecione Responsavel' }] },
    { type:14, divider:true, spacing:1 },
    { type:10, content:'# 🕘 Turno / Equipe\n\nAtive para mostrar a seleção no formulário.\nO cargo escolhido será aplicado quando o registro for aprovado.' },
    { type:1, components:[{ type:2, custom_id:'reg:toggle_turnos', label: turnoAtivo, style: c.usarTurnos ? 3 : 4 }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_turno_manha', placeholder:'🌅 Cargo do turno Manhã' }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_turno_tarde', placeholder:'☀️ Cargo do turno Tarde' }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_turno_noite', placeholder:'🌙 Cargo do turno Noite' }] },
    { type:1, components:[{ type:6, custom_id:'reg:s_turno_madrugada', placeholder:'🌌 Cargo do turno Madrugada' }] },
    { type:14, divider:true, spacing:1 },
    { type:1, components:[{ type:2, custom_id:'reg:ver_status', label:'Configuração Atual', style:1, emoji:{name:'🔎'} }] },
    { type:1, components:[{ type:2, custom_id:'reg:config_visual', label:'Configurar TAG do nome', style:2, emoji:{name:'🏷️'} }] },
    { type:1, components:[{ type:2, custom_id:'diag:abrir:reg', label:'🩺 Diagnóstico', style:2 }] }
  ];
  return { flags: MessageFlags.IsComponentsV2, components: [{ type:17, accent_color:0x3498db, components }] };
}
function painelResumo(c) {
  const lista = items => items.length ? items.map(x => `<@&${x}>`).join(', ') : '❌ Não configurado';
  const txt = `📌 **Canal de LOG:** ${c.logId ? `<#${c.logId}>` : '❌ Não configurado'}\n` +
    `🎖️ **Cargos a atribuir:** ${lista(c.cargosAtribuir)}\n` +
    `🗑️ **Cargos a remover:** ${lista(c.cargosRemover)}\n` +
    `📣 **Responsável:** ${c.cargoResponsavel ? `<@&${c.cargoResponsavel}>` : '❌ Não configurado'}\n` +
    `🏷️ **TAG do nome:** ${c.tag || '❌ Nenhuma'}\n` +
    `🕘 **Turno / Equipe:** ${c.usarTurnos ? 'Ativado' : 'Desativado'}\n\n` +
    Object.entries(nomes).map(([k, nome]) => `${nome}: ${c.turnos[k] ? `<@&${c.turnos[k]}>` : '❌ Não definido'}`).join('\n');
  return painel('🔎 Configuração Atual', txt, [[['reg:config','Voltar',ButtonStyle.Secondary,'↩️']]], 0x3498db);
}
function modalRegistro(c) {
  const campos = [
    campo('reg_nome','Nome do personagem',{max:40,placeholder:'Ex: João Silva'}),
    campo('reg_id','Passaporte / ID no jogo',{max:20,placeholder:'Ex: 1234'})
  ];
  if (c.usarTurnos) {
    const turnos = new StringSelectMenuBuilder().setCustomId('reg_turno').setRequired(true)
      .setMinValues(1).setMaxValues(1).addOptions(Object.entries(nomes).map(([value,label]) => ({label,value})));
    campos.push(new LabelBuilder().setLabel('Turno de atuação').setStringSelectMenuComponent(turnos));
  }
  campos.push(upload('reg_rg','RG do personagem (imagem opcional)',1));
  return modal('reg:form','Registro Oficial',campos);
}
async function executarRegistro(i) {
  const c = cfg(i.guildId);
  const nome = limpar(i.fields.getTextInputValue('reg_nome'),40);
  const id = limpar(i.fields.getTextInputValue('reg_id'),20);
  const turno = c.usarTurnos ? i.fields.getStringSelectValues('reg_turno')[0] : null;
  if (!nome || !id || (c.usarTurnos && !nomes[turno])) throw new Error('Nome, ID ou turno inválido.');
  const foto = arquivos(i, 'reg_rg', 1, true);
  await i.deferReply({flags:MessageFlags.Ephemeral});
  const membro = await i.guild.members.fetch(i.user.id);
  const falhas=[];
  const formato = `${nome} | ${id}`;
  let novoNick = c.tag ? `『 ${c.tag} 』 ${formato}` : formato;
  if (novoNick.length > 32) novoNick = formato.slice(0,32);
  try { await membro.setNickname(novoNick); }
  catch(e) { falhas.push('apelido (hierarquia/permissão)'); console.error(e); }
  const adicionar = [...new Set([...c.cargosAtribuir, ...((c.usarTurnos && turno && c.turnos[turno]) ? [c.turnos[turno]] : [])])];
  const remover = [...new Set([...c.cargosRemover,
    ...(c.usarTurnos && turno ? Object.entries(c.turnos).filter(([t])=>t!==turno).map(([,cargo])=>cargo).filter(Boolean) : [])])].filter(x => !adicionar.includes(x));
  try { if (remover.length) await membro.roles.remove(remover); }
  catch(e) { falhas.push('remoção de cargos'); console.error(e); }
  try { if (adicionar.length) await membro.roles.add(adicionar); }
  catch(e) { falhas.push('atribuição de cargos'); console.error(e); }
  if (c.logId) {
    const canal = await i.guild.channels.fetch(c.logId).catch(()=>null);
    if (podeEnviar(canal)) {
      try {
        const texto = `# ✅ Novo registro\n👤 **Discord:** <@${i.user.id}>\n🆔 **Personagem:** ${nome} | ${id}\n⏱️ **Turno:** ${c.usarTurnos && turno ? nomes[turno] : 'Não utilizado'}\n🏷️ **Apelido:** ${limpar(novoNick)}\n${falhas.length ? `⚠️ **Pendências:** ${falhas.join(', ')}` : ''}`;
        // LOG não expõe documentos reais. RG é do personagem, não um documento pessoal.
        const files = envioArquivos(foto);
        if (files.length) {
          const payload = painel('📝 Registro efetuado', texto, [], 0x2ecc71);
          payload.files = files;
          payload.allowedMentions = { parse: [] };
          payload.components[0].addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(...files.map(f => new MediaGalleryItemBuilder().setURL(`attachment://${f.name}`)))
          );
          await enviarV2(canal, payload);
        } else {
          await enviarV2(canal, painel('📝 Registro efetuado',texto,[],0x2ecc71));
        }
      } catch(e) { falhas.push('envio do LOG'); console.error(e); }
    }
  }
  const resumoTurno = c.usarTurnos && turno ? ` — turno **${nomes[turno]}**` : '';
  await responder(i, falhas.length ? `⚠️ Registro processado, mas houve falha em: ${falhas.join(', ')}. Verifique a hierarquia dos cargos e as permissões do bot.` : `✅ Registro concluído! **${nome} | ${id}**${resumoTurno}. Cargos e apelido aplicados.`);
}
async function handle(i) {
  const cmd = i.isChatInputCommand() && i.commandName === 'registro';
  const button = i.isButton() && i.customId.startsWith('reg:');
  const sel = (i.isChannelSelectMenu() || i.isRoleSelectMenu()) && i.customId.startsWith('reg:');
  const m = i.isModalSubmit() && i.customId.startsWith('reg:');
  if (!(cmd || button || sel || m)) return false;
  try {
    if (cmd) {
      if (!donoAdmin(i)) {await responder(i,'❌ Apenas administradores podem publicar o painel.');return true;}
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const c = cfg(i.guildId);
      const mensagem = await enviarV2(i.channel, painelRegistro(c));
      c.painelCanal = mensagem.channelId; c.painelMensagem = mensagem.id;
      registrarPainelMensagem('registro', i.guildId, mensagem);
      await responder(i, `✅ Painel enviado: ${mensagem.url}`);return true;
    }
    if (button && i.customId === 'reg:iniciar') { const c = cfg(i.guildId); await i.showModal(modalRegistro(c)); return true; }
    if (m && i.customId==='reg:form') {await executarRegistro(i);return true;}
    if (!donoAdmin(i)) {await responder(i,'❌ Apenas administradores alteram configurações.');return true;}
    const c=cfg(i.guildId);
    if (button) {
      if (i.customId==='reg:config') { registrarPainelDoClique('registro',i);await abrirConfig(i,status(c));return true; }
      if (i.customId==='reg:toggle_turnos') { c.usarTurnos = !c.usarTurnos; await atualizar(i, status(c)); await sincronizarPainel(i,c); return true; }
      if (i.customId==='reg:ver_status') { await atualizar(i, painelResumo(c)); return true; }
      if (i.customId==='reg:config_visual') {
        await i.showModal(modal('reg:visual','Personalizar Registro',[
          campo('reg_tag','TAG do apelido (opcional)',{value:c.tag,max:12,required:false}),
          campo('reg_titulo','Título do painel',{value:c.titulo,max:90}),
          campo('reg_desc','Descrição do painel',{value:c.descricao,max:800,paragraph:true}),
          campo('reg_banner','URL de banner (opcional)',{value:c.bannerUrl,max:500,required:false})
        ]));return true;
      }
    }
    if (sel) {
      const v=i.values;
      switch(i.customId) {
        case 'reg:s_log': c.logId=v[0];break;
        case 'reg:s_responsavel': c.cargoResponsavel=v[0];break;
        case 'reg:s_atribuir': c.cargosAtribuir=v;break;
        case 'reg:s_remover': c.cargosRemover=v;break;
        default: {
          const turno=i.customId.replace('reg:s_turno_','');
          if (Object.hasOwn(c.turnos,turno)) c.turnos[turno]=v[0];
        }
      }
      await atualizar(i, status(c));
      await sincronizarPainel(i,c); return true;
    }
    if (m && i.customId==='reg:visual') {
      c.tag=limpar(i.fields.getTextInputValue('reg_tag'),12);
      c.titulo=limpar(i.fields.getTextInputValue('reg_titulo'),90);
      c.descricao=limpar(i.fields.getTextInputValue('reg_desc'),800);
      c.bannerUrl=validoUrl(i.fields.getTextInputValue('reg_banner'));
      await concluirConfig(i, status(c));
      await sincronizarPainel(i,c); return true;
    }
    return true;
  } catch(e) {await erro(i,e);return true;}
}
module.exports={comando,handle,getConfig:cfg,painelConfig:status,buildPanel:painelRegistro,
  registrarPainel:(id,msg)=>{const c=cfg(id);c.painelCanal=msg.channelId;c.painelMensagem=msg.id;
    registrarPainelMensagem('registro',id,msg);}};

