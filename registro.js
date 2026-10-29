'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ButtonStyle,
  StringSelectMenuBuilder, LabelBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, validoUrl, painel, campo, upload, modal, arquivos, envioArquivos,
  responder, erro, guildConfig, podeEnviar
} = require('./comum');
const configs = new Map();
const novo = () => ({ logId: null, cargoResponsavel: null, cargosAtribuir: [], cargosRemover: [],
  turnos: { manha: null, tarde: null, noite: null, madrugada: null }, tag: '',
  titulo: '👤 │ Central de Registro', descricao: 'Preencha o formulário para receber o cargo e a identificação da corporação.', bannerUrl: null, painelCanal: null, painelMensagem: null });
const cfg = id => guildConfig(configs, id, novo);
const comando = new SlashCommandBuilder().setName('registro')
  .setDescription('Envia o painel oficial de registro (sem ticket)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
const nomes = { manha: '🌅 Manhã', tarde: '☀️ Tarde', noite: '🌙 Noite', madrugada: '🌌 Madrugada' };
function painelRegistro(c) {
  const resultado = painel(c.titulo, c.descricao + '\n\n' +
    '📝 Clique em **Registre-se** e preencha nome, ID e turno.\n📸 Você pode anexar a imagem do RG **do personagem do jogo** (não envie documentos reais).\n✅ O bot aplicará seus cargos e apelido. **Não cria ticket.**' +
    (c.bannerUrl ? `\n\n🖼️ [Banner do Registro](${c.bannerUrl})` : ''),
    [[['reg:iniciar', 'Registre-se', ButtonStyle.Primary, '📝'],
      ['reg:config', 'Configurações', ButtonStyle.Secondary, '⚙️']]], 0x2ecc71);
  if (c.bannerUrl) resultado.components[0].addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(c.bannerUrl))
  );
  return resultado;
}
async function sincronizarPainel(i, c) {
  if (!c.painelCanal || !c.painelMensagem) return;
  try {
    const canal = await i.guild.channels.fetch(c.painelCanal);
    const msg = await canal.messages.fetch(c.painelMensagem);
    await msg.edit(painelRegistro(c));
  } catch (e) { console.warn('Registro: painel não pôde ser atualizado:', e.message); }
}
function status(c) {
  const lista = items => items.length ? items.map(x => `<@&${x}>`).join(', ') : 'Não configurados';
  const txt = `📌 **Canal de LOG:** ${c.logId ? `<#${c.logId}>` : 'Não configurado'}\n` +
    `👮 **Cargo responsável:** ${c.cargoResponsavel ? `<@&${c.cargoResponsavel}>` : 'Não configurado'}\n` +
    `✅ **Cargos atribuir:** ${lista(c.cargosAtribuir)}\n` +
    `🗑️ **Cargos remover:** ${lista(c.cargosRemover)}\n` +
    `🏷️ **TAG de nome:** ${c.tag || '(nenhuma)'}\n\n` +
    Object.entries(nomes).map(([k, nome]) => `${nome}: ${c.turnos[k] ? `<@&${c.turnos[k]}>` : 'Não definido'}`).join('\n');
  return painel('⚙️ Configurações do Registro', txt,
    [[['reg:config_geral','Canais e cargos',ButtonStyle.Primary],
      ['reg:config_turnos','Cargos dos turnos'],['reg:config_visual','TAG e painel']]], 0x3498db);
}
function painelSelect(titulo, descricao, selectores, volta = 'reg:config') {
  const c = [{ type:10, content: `# ${titulo}\n\n${descricao}` }];
  for (const s of selectores) {
    c.push({ type: 14, divider: true, spacing: 1 });
    c.push({ type: 10, content: s.rotulo });
    c.push({ type:1, components:[s.campo] });
  }
  c.push({type:14, divider:true, spacing:1});
  c.push({type:1, components:[{type:2, custom_id:volta, label:'Voltar', style:2}]});
  return { flags: MessageFlags.IsComponentsV2, components: [{type:17, accent_color:0x3498db, components:c}] };
}
function selecionarCargo(id, placeholder, varios = false) {
  return { type:6, custom_id:id, placeholder, min_values: varios ? 0 : 1, max_values: varios ? 5 : 1 };
}
function painelGeral() {
  return painelSelect('🛠️ Definir canais e cargos', 'Cada seleção é aplicada imediatamente.', [
    {rotulo:'Canal de LOG',campo:{type:8,custom_id:'reg:s_log',channel_types:[0],placeholder:'Escolha o canal de logs'}},
    {rotulo:'Cargo responsável',campo:selecionarCargo('reg:s_responsavel','Cargo responsável')},
    {rotulo:'Cargos a atribuir (até 5)',campo:selecionarCargo('reg:s_atribuir','Selecione cargos',true)},
    {rotulo:'Cargos a remover (até 5)',campo:selecionarCargo('reg:s_remover','Selecione cargos',true)}
  ]);
}
function painelTurnos() {
  return painelSelect('⏱️ Cargos por turno', 'O bot entrega o cargo do turno escolhido e remove os cargos dos outros turnos.',
    Object.entries(nomes).map(([k, titulo]) => ({ rotulo: titulo,
      campo: selecionarCargo(`reg:s_turno_${k}`, `Selecione cargo de ${titulo}`) })));
}
function modalRegistro() {
  const turnos = new StringSelectMenuBuilder().setCustomId('reg_turno').setRequired(true)
    .setMinValues(1).setMaxValues(1).addOptions(Object.entries(nomes).map(([value,label]) => ({label,value})));
  return modal('reg:form','Registro Oficial',[
    campo('reg_nome','Nome do personagem',{max:40,placeholder:'Ex: João Silva'}),
    campo('reg_id','Passaporte / ID no jogo',{max:20,placeholder:'Ex: 1234'}),
    new LabelBuilder().setLabel('Turno de atuação').setStringSelectMenuComponent(turnos),
    upload('reg_rg','RG do personagem (imagem opcional)',1)
  ]);
}
async function executarRegistro(i) {
  const c = cfg(i.guildId);
  const nome = limpar(i.fields.getTextInputValue('reg_nome'),40);
  const id = limpar(i.fields.getTextInputValue('reg_id'),20);
  const turno = i.fields.getStringSelectValues('reg_turno')[0];
  if (!nome || !id || !nomes[turno]) throw new Error('Nome, ID ou turno inválido.');
  const foto = arquivos(i, 'reg_rg', 1, true);
  await i.deferReply({flags:MessageFlags.Ephemeral});
  const membro = await i.guild.members.fetch(i.user.id);
  const falhas=[];
  const formato = `${nome} | ${id}`;
  let novoNick = c.tag ? `『 ${c.tag} 』 ${formato}` : formato;
  if (novoNick.length > 32) novoNick = formato.slice(0,32);
  try { await membro.setNickname(novoNick); }
  catch(e) { falhas.push('apelido (hierarquia/permissão)'); console.error(e); }
  const adicionar = [...new Set([...c.cargosAtribuir, ...(c.turnos[turno] ? [c.turnos[turno]] : [])])];
  const remover = [...new Set([...c.cargosRemover,
    ...Object.entries(c.turnos).filter(([t])=>t!==turno).map(([,cargo])=>cargo).filter(Boolean)])].filter(x => !adicionar.includes(x));
  try { if (remover.length) await membro.roles.remove(remover); }
  catch(e) { falhas.push('remoção de cargos'); console.error(e); }
  try { if (adicionar.length) await membro.roles.add(adicionar); }
  catch(e) { falhas.push('atribuição de cargos'); console.error(e); }
  if (c.logId) {
    const canal = await i.guild.channels.fetch(c.logId).catch(()=>null);
    if (podeEnviar(canal)) {
      try {
        const texto = `# ✅ Novo registro\n👤 **Discord:** <@${i.user.id}>\n🆔 **Personagem:** ${nome} | ${id}\n⏱️ **Turno:** ${nomes[turno]}\n🏷️ **Apelido:** ${limpar(novoNick)}\n${falhas.length ? `⚠️ **Pendências:** ${falhas.join(', ')}` : ''}`;
        // LOG não expõe documentos reais. RG é do personagem, não um documento pessoal.
        const files = envioArquivos(foto);
        if (files.length) {
          await canal.send({ content: texto, files, allowedMentions: {parse: []} });
        } else {
          await canal.send(painel('📝 Registro efetuado',texto,[],0x2ecc71));
        }
      } catch(e) { falhas.push('envio do LOG'); console.error(e); }
    }
  }
  await i.editReply(falhas.length ? `⚠️ Registro processado, mas houve falha em: ${falhas.join(', ')}. Verifique a hierarquia dos cargos e as permissões do bot.` :
    `✅ Registro concluído! **${nome} | ${id}** — turno **${nomes[turno]}**. Cargos e apelido aplicados.`);
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
      const mensagem = await i.channel.send(painelRegistro(c));
      c.painelCanal = mensagem.channelId; c.painelMensagem = mensagem.id;
      await i.editReply(`✅ Painel enviado: ${mensagem.url}`);return true;
    }
    if (button && i.customId === 'reg:iniciar') { await i.showModal(modalRegistro()); return true; }
    if (m && i.customId==='reg:form') {await executarRegistro(i);return true;}
    if (!donoAdmin(i)) {await responder(i,'❌ Apenas administradores alteram configurações.');return true;}
    const c=cfg(i.guildId);
    if (button) {
      if (i.customId==='reg:config') { await responder(i,status(c),true);return true; }
      if (i.customId==='reg:config_geral') {await i.update(painelGeral());return true;}
      if (i.customId==='reg:config_turnos') {await i.update(painelTurnos());return true;}
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
      await i.update(i.customId.startsWith('reg:s_turno_') ? painelTurnos() : painelGeral()); return true;
    }
    if (m && i.customId==='reg:visual') {
      c.tag=limpar(i.fields.getTextInputValue('reg_tag'),12);
      c.titulo=limpar(i.fields.getTextInputValue('reg_titulo'),90);
      c.descricao=limpar(i.fields.getTextInputValue('reg_desc'),800);
      c.bannerUrl=validoUrl(i.fields.getTextInputValue('reg_banner'));
      await sincronizarPainel(i, c);
      await responder(i,'✅ Personalização aplicada ao painel e salva nesta sessão do bot.');return true;
    }
    return true;
  } catch(e) {await erro(i,e);return true;}
}
module.exports={comando,handle};
