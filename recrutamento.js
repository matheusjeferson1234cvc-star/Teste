'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ButtonStyle,
  PermissionsBitField, ChannelType, StringSelectMenuBuilder, ActionRowBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, validoUrl, painel, campo, modal, guildConfig, responder, erro, podeEnviar
} = require('./comum');
const configs = new Map();
const sessoes = new Map();
const pendentes = new Set();
const cfg = id => guildConfig(configs, id, () => ({
  categoriaId:null, relatorioId:null, anuncioId:null, cargoRecrutador:null,
  cargosAprovar:[], cargosRemover:[], perguntas:[], tempoMs:60000,
  titulo:'📋 │ Central de Recrutamento',
  descricao:'Bem-vindo ao Sistema Oficial de Recrutamento. Clique para preencher sua candidatura.',
  bannerUrl:null, bannerAprovadoUrl:null, painelCanal:null, painelMensagem:null
}));
const comando = new SlashCommandBuilder().setName('recrutamento')
  .setDescription('Envia o painel oficial de recrutamento')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
const permit = i => donoAdmin(i) || !!(cfg(i.guildId).cargoRecrutador && i.member?.roles?.cache?.has(cfg(i.guildId).cargoRecrutador));
function painelPrincipal(c) {
  const numero = c.perguntas.length;
  const resultado = painel(c.titulo,c.descricao + '\n\n' +
    `📝 **Perguntas:** ${numero}\n⏱️ **Tempo por pergunta:** ${c.tempoMs/1000} segundos\n⌛ **Tempo total:** 10 minutos\n` +
    '📷 Envie somente a foto do RG **fictício do personagem** (não envie documento real).' +
    (c.bannerUrl ? `\n🖼️ [Banner](${c.bannerUrl})` : ''),
    [[['rec:iniciar','Formulário',ButtonStyle.Primary,'📝'],['rec:config','Configurações',ButtonStyle.Secondary,'⚙️']]],0x2ecc71);
  if (c.bannerUrl) resultado.components[0].addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(c.bannerUrl))
  );
  return resultado;
}
async function sincronizarPainelPrincipal(i, c) {
  if (!c.painelCanal || !c.painelMensagem) return;
  try {
    const canal=await i.guild.channels.fetch(c.painelCanal);
    const msg=await canal.messages.fetch(c.painelMensagem);
    await msg.edit(painelPrincipal(c));
  } catch (e) { console.warn('Recrutamento: falha ao atualizar painel:',e.message); }
}
function menuConfig() {
  return painel('⚙️ Configuração do Recrutamento','Gerencie canais, cargos, perguntas e visual.',
    [[['rec:status','Status'],['rec:seletores','Canais e cargos'],['rec:perguntas','Perguntas e tempo'],['rec:visual','Visual e textos']]],0x3498db);
}
function nomeCargo(id){return id?`<@&${id}>`:'Não definido';}
function status(c) {
  const ar = a=>a.length?a.map(nomeCargo).join(', '):'Nenhum';
  return painel('⚙️ Status do Recrutamento',
    `📁 **Categoria:** ${c.categoriaId?`<#${c.categoriaId}>`:'Não definida'}\n`+
    `📄 **Relatórios:** ${c.relatorioId?`<#${c.relatorioId}>`:'Não definido'}\n`+
    `📢 **Anúncios:** ${c.anuncioId?`<#${c.anuncioId}>`:'Não definido'}\n`+
    `👮 **Recrutador:** ${nomeCargo(c.cargoRecrutador)}\n`+
    `✅ **Aprovação:** ${ar(c.cargosAprovar)}\n`+
    `🗑️ **Remover:** ${ar(c.cargosRemover)}\n`+
    `❓ **Perguntas:** ${c.perguntas.length}/20\n⏱️ **Tempo por pergunta:** ${c.tempoMs/1000}s`,
    [[['rec:config','Voltar']]]);
}
function seletores() {
  const dados = [
    ['Categoria para os tickets',{ type:8,custom_id:'rec:s_categoria',placeholder:'Selecione categoria',channel_types:[4]}],
    ['Canal de relatórios',{ type:8,custom_id:'rec:s_relatorio',placeholder:'Selecione canal',channel_types:[0]}],
    ['Canal de anúncios',{ type:8,custom_id:'rec:s_anuncio',placeholder:'Selecione canal',channel_types:[0]}],
    ['Cargos ao aprovar',{ type:6,custom_id:'rec:s_aprovar',placeholder:'Até 5 cargos',min_values:0,max_values:5}],
    ['Cargos a remover',{ type:6,custom_id:'rec:s_remover',placeholder:'Até 5 cargos',min_values:0,max_values:5}],
    ['Cargo recrutador',{ type:6,custom_id:'rec:s_recrutador',placeholder:'Selecione recrutador'}]
  ];
  return { flags:MessageFlags.IsComponentsV2,components:[{type:17,accent_color:0x3498db,components:[
    {type:10,content:'# 🛠️ Canais e Cargos\n\nEscolha as opções. São temporárias até a próxima reinicialização.'},
    ...dados.flatMap(([name,comp])=>[{type:14,divider:true,spacing:1},{type:10,content:`**${name}**`},{type:1,components:[comp]}]),
    {type:14,divider:true,spacing:1},{type:1,components:[{type:2,style:2,custom_id:'rec:config',label:'Voltar'}]}
  ]}]};
}
function menuPerguntas(c) {
  const lista=c.perguntas.map((p,idx)=>`**${idx+1}.** ${limpar(p,120)}`).join('\n')||'*Nenhuma pergunta cadastrada.*';
  // O texto por componente tem limite. Segmenta para evitar painéis gigantes.
  const componentes = [{type:10,content:`# ❓ Perguntas (${c.perguntas.length}/20)\nTempo atual: **${c.tempoMs/1000} segundos**`}];
  const blocos=[];
  let atual='';
  for(const l of lista.split('\n')) {if(atual.length+l.length>3000){blocos.push(atual);atual='';}atual+=(atual?'\n':'')+l;}
  if(atual)blocos.push(atual);
  for(const p of blocos.slice(0,6)) componentes.push({type:10,content:p});
  componentes.push({type:14,divider:true,spacing:1},
    {type:1,components:[
      {type:2,style:3,custom_id:'rec:add',label:'Adicionar'},
      {type:2,style:4,custom_id:'rec:pop',label:'Remover última'},
      {type:2,style:4,custom_id:'rec:escolher_rem',label:'Remover específica'}
    ]},
    {type:1,components:[{type:3,custom_id:'rec:s_tempo',placeholder:'Tempo por pergunta',options:[
      {label:'30 segundos',value:'30000'},{label:'1 minuto',value:'60000'},
      {label:'3 minutos',value:'180000'},{label:'5 minutos',value:'300000'}
    ]}]},
    {type:1,components:[{type:2,style:2,custom_id:'rec:config',label:'Voltar'}]});
  return {flags:MessageFlags.IsComponentsV2,components:[{type:17,accent_color:0x3498db,components}]};
}
async function sincronizar(canal, messageId, builder) {
  try{if(!canal || !messageId) return; const msg=await canal.messages.fetch(messageId);await msg.edit(builder());}catch(e){console.warn('Não foi possível atualizar painel:',e.message);}
}
async function mensagemTicket(canal, titulo, desc, cor=0x3498db) {
  return canal.send(painel(titulo,desc,[],cor));
}
function encerrar(sessao, conteudo, ms=5000) {
  if(sessao.fechando) return;
  sessao.fechando=true;
  clearTimeout(sessao.timerEtapa);clearTimeout(sessao.timerGeral);
  sessoes.delete(sessao.canal.id);
  mensagemTicket(sessao.canal,'🔒 Ticket encerrado',conteudo,0xe67e22).catch(()=>null);
  const timer=setTimeout(()=>sessao.canal.delete().catch(()=>null),ms);
  timer.unref?.();
}
async function encaminharProxima(sessao) {
  if(!sessoes.has(sessao.canal.id) || sessao.fechando) return;
  clearTimeout(sessao.timerEtapa);
  if(sessao.step > sessao.perguntas.length) return finalizar(sessao);
  const isRG=sessao.step===0;
  await mensagemTicket(sessao.canal,isRG?'📷 │ RG DO PERSONAGEM':`📋 │ PERGUNTA ${sessao.step}/${sessao.perguntas.length}`,
    isRG?'Envie uma imagem do **RG fictício do seu personagem** em até '+`${sessao.tempoMs/1000}s. Não envie documentos reais.`:
      `**${sessao.perguntas[sessao.step-1]}**\n\n⏱️ Responda em até ${sessao.tempoMs/1000} segundos.`);
  sessao.timerEtapa=setTimeout(()=>pularTempo(sessao).catch(console.error),sessao.tempoMs);
  sessao.timerEtapa.unref?.();
}
async function pularTempo(sessao){
  if(!sessoes.has(sessao.canal.id)||sessao.fechando) return;
  if(sessao.step===0) {sessao.rg=null;sessao.step=1;}
  else {sessao.respostas.push({pergunta:sessao.perguntas[sessao.step-1], resposta:'Não respondeu (tempo esgotado)'});sessao.step++;}
  await mensagemTicket(sessao.canal,'⏰ Tempo esgotado','Etapa ignorada.');
  await encaminharProxima(sessao);
}
async function finalizar(sessao){
  if(sessao.fechando)return;
  const c=cfg(sessao.guildId);
  const canal=await sessao.canal.guild.channels.fetch(c.relatorioId).catch(()=>null);
  if(!podeEnviar(canal)) {encerrar(sessao,'Não foi possível entregar o relatório: canal de relatórios não configurado. Contate um administrador.',10000);return;}
  let conteudo=`# 📋 RELATÓRIO DE RECRUTAMENTO\n👤 **Candidato:** <@${sessao.userId}>\n🆔 **Personagem:** ${sessao.nome}\n\n`;
  conteudo+=sessao.respostas.map((r,ind)=>`**${ind+1}. ${limpar(r.pergunta,120)}**\n${limpar(r.resposta,500)}`).join('\n\n');
  const partes=[];while(conteudo.length){partes.push(conteudo.slice(0,3400));conteudo=conteudo.slice(3400);}
  // Publicação em blocos, caso perguntas e respostas somem mais que 4 mil caracteres.
  for(let j=0;j<partes.length;j++) await canal.send(painel(j===0?'📋 Candidatura':'📋 Continuação',partes[j],[],0x3498db));
  const aviso = (sessao.rg ? `📷 **RG fictício do personagem:** ${sessao.rg}\n` : '📷 **RG:** não enviado\n');
  await canal.send(painel('🔎 Avaliar candidatura',aviso+`Candidato <@${sessao.userId}>\nPersonagem ${sessao.nome}`,
    [[[`rec:aprovar:${sessao.userId}`,'Aprovar',ButtonStyle.Success],[`rec:reprovar:${sessao.userId}`,'Reprovar',ButtonStyle.Danger]]],0x3498db));
  pendentes.add(`${sessao.guildId}:${sessao.userId}`);
  encerrar(sessao,'Formulário enviado para avaliação.');
}
async function criarTicket(i, nome) {
  const c=cfg(i.guildId), key=`${i.guildId}:${i.user.id}`;
  if(!c.relatorioId) throw new Error('Configure o canal de relatórios antes de receber recrutamentos.');
  if(pendentes.has(key)) throw new Error('Você já tem uma candidatura aguardando análise.');
  if([...sessoes.values()].some(s=>s.guildId===i.guildId && s.userId===i.user.id)) throw new Error('Você já tem um ticket em andamento.');
  if([...sessoes.values()].filter(s=>s.guildId===i.guildId).length>=10) throw new Error('Há 10 recrutamentos simultâneos. Aguarde uma vaga.');
  const perm=[
    {id:i.guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
    {id:i.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.AttachFiles]}
  ];
  if(c.cargoRecrutador)perm.push({id:c.cargoRecrutador,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]});
  const canal=await i.guild.channels.create({name:`recrutamento-${i.user.id}`,type:ChannelType.GuildText,
    ...(c.categoriaId?{parent:c.categoriaId}:{}),permissionOverwrites:perm});
  const sessao={canal,userId:i.user.id,guildId:i.guildId,nome,step:0,rg:null,
    respostas:[],perguntas:[...c.perguntas],tempoMs:c.tempoMs,timerEtapa:null,timerGeral:null,fechando:false};
  sessoes.set(canal.id,sessao);
  sessao.timerGeral=setTimeout(()=>encerrar(sessao,'Tempo geral de 10 minutos esgotado.'),600000);
  sessao.timerGeral.unref?.();
  await encaminharProxima(sessao);
  return canal;
}
async function handleMessage(m) {
  if(m.author.bot||!m.guild)return;
  const s=sessoes.get(m.channel.id);
  if(!s ||s.userId!==m.author.id||s.fechando)return;
  if(s.step===0){
    const a=m.attachments.first();
    if(!a || !a.contentType?.startsWith('image/')){
      await m.reply('⚠️ Envie uma imagem do RG **fictício do personagem** (ou aguarde o tempo expirar).');return;
    }
    s.rg=a.url;
  }else {
    if(!m.content.trim()) {await m.reply('⚠️ Responda com texto.');return;}
    s.respostas.push({pergunta:s.perguntas[s.step-1], resposta:m.content.slice(0,1500)});
  }
  s.step++;
  await encaminharProxima(s);
}
async function handle(i){
  const cmd=i.isChatInputCommand()&&i.commandName==='recrutamento';
  const button=i.isButton()&&i.customId.startsWith('rec:');
  const sel=(i.isChannelSelectMenu()||i.isRoleSelectMenu()||i.isStringSelectMenu())&&i.customId.startsWith('rec:');
  const m=i.isModalSubmit()&&i.customId.startsWith('rec:');
  if(!(cmd||button||sel||m))return false;
  try{
    const c=cfg(i.guildId);
    if(cmd){
      if(!donoAdmin(i)){await responder(i,'❌ Apenas administradores podem publicar painel.');return true;}
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const msg=await i.channel.send(painelPrincipal(c));
      c.painelCanal=msg.channelId;c.painelMensagem=msg.id;
      await i.editReply(`✅ Painel publicado: ${msg.url}`);return true;
    }
    if(button&&i.customId==='rec:iniciar'){
      await i.showModal(modal('rec:form','Iniciar Recrutamento',[
        campo('rec_nome','Nome e ID do personagem',{max:120,placeholder:'Ex: João Silva | ID 1234'})
      ]));return true;
    }
    if(m&&i.customId==='rec:form'){
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const canal=await criarTicket(i,limpar(i.fields.getTextInputValue('rec_nome'),120));
      await i.editReply(`✅ Ticket de recrutamento criado: ${canal}`);return true;
    }
    if(button&&(i.customId.startsWith('rec:aprovar:')||i.customId.startsWith('rec:reprovar:'))){
      if(!permit(i)){await responder(i,'❌ Você não é recrutador.');return true;}
      const aprovado=i.customId.startsWith('rec:aprovar:');
      const userId=i.customId.split(':')[2];
      const key=`${i.guildId}:${userId}`;
      if(!pendentes.has(key)){await responder(i,'⚠️ Não há candidatura pendente para esse usuário (ou o bot reiniciou).');return true;}
      await i.deferUpdate();
      const member=await i.guild.members.fetch(userId).catch(()=>null);
      if(aprovado&&member){
        if(c.cargosAprovar.length)await member.roles.add(c.cargosAprovar);
        if(c.cargosRemover.length)await member.roles.remove(c.cargosRemover);
      }
      await i.editReply(painel(aprovado?'✅ Candidatura aprovada':'❌ Candidatura reprovada',
        `Candidato <@${userId}>\nAnalisado por <@${i.user.id}>`,[],aprovado?0x2ecc71:0xe74c3c));
      pendentes.delete(key);
      if(member)member.send(`Sua candidatura no servidor **${i.guild.name}** foi ${aprovado?'APROVADA ✅':'REPROVADA ❌'}.`).catch(()=>null);
      if(aprovado&&c.anuncioId){const canal=await i.guild.channels.fetch(c.anuncioId).catch(()=>null);
        if(podeEnviar(canal))await canal.send(painel('✅ Recrutamento Aprovado',
          `Parabéns <@${userId}>!\nInstrutor: <@${i.user.id}>`+(c.bannerAprovadoUrl?`\n[Banner de aprovação](${c.bannerAprovadoUrl})`:''),[],0x2ecc71));}
      return true;
    }
    if(!donoAdmin(i)){await responder(i,'❌ Apenas administradores podem configurar.');return true;}
    if(button){
      if(i.customId==='rec:config'){await responder(i,menuConfig(),true);return true;}
      if(i.customId==='rec:status'){await i.update(status(c));return true;}
      if(i.customId==='rec:seletores'){await i.update(seletores());return true;}
      if(i.customId==='rec:perguntas'){await i.update(menuPerguntas(c));return true;}
      if(i.customId==='rec:visual'){
        await i.showModal(modal('rec:edit_visual','Visual do Recrutamento',[
          campo('rec_titulo','Título',{value:c.titulo,max:90}),
          campo('rec_desc','Descrição',{value:c.descricao,max:800,paragraph:true}),
          campo('rec_banner','URL banner painel (opcional)',{value:c.bannerUrl,max:500,required:false}),
          campo('rec_banner_aprovado','URL banner aprovação (opcional)',{value:c.bannerAprovadoUrl,max:500,required:false})
        ]));return true;
      }
      if(i.customId==='rec:add'){
        if(c.perguntas.length>=20){await responder(i,'❌ Limite de 20 perguntas.');return true;}
        await i.showModal(modal('rec:adicionar','Adicionar pergunta',[
          campo('rec_pergunta','Pergunta',{max:250,paragraph:true})]));return true;
      }
      if(i.customId==='rec:pop'){c.perguntas.pop();await sincronizarPainelPrincipal(i,c);await i.update(menuPerguntas(c));return true;}
      if(i.customId==='rec:escolher_rem'){
        if(!c.perguntas.length){await responder(i,'Nenhuma pergunta para remover.');return true;}
        const menu=new StringSelectMenuBuilder().setCustomId('rec:s_remover_pergunta')
          .setPlaceholder('Escolha a pergunta a remover').addOptions(c.perguntas.map((p,k)=>({value:String(k),label:`${k+1}. ${p}`.slice(0,100)})));
        await i.update({ flags:MessageFlags.IsComponentsV2,components:[{type:17,components:[
          {type:10,content:'# Remover pergunta'},
          {type:1,components:[menu.toJSON()]},
          {type:1,components:[{type:2,style:2,custom_id:'rec:perguntas',label:'Voltar'}]}
        ]}]});return true;
      }
    }
    if(sel){
      const value=i.values;
      switch(i.customId){
        case 'rec:s_categoria':c.categoriaId=value[0];break;
        case 'rec:s_relatorio':c.relatorioId=value[0];break;
        case 'rec:s_anuncio':c.anuncioId=value[0];break;
        case 'rec:s_aprovar':c.cargosAprovar=value;break;
        case 'rec:s_remover':c.cargosRemover=value;break;
        case 'rec:s_recrutador':c.cargoRecrutador=value[0];break;
        case 'rec:s_tempo':c.tempoMs=Number(value[0]);await sincronizarPainelPrincipal(i,c);await i.update(menuPerguntas(c));return true;
        case 'rec:s_remover_pergunta':c.perguntas.splice(Number(value[0]),1);await i.update(menuPerguntas(c));return true;
      }
      await i.update(seletores());return true;
    }
    if(m&&i.customId==='rec:edit_visual'){
      c.titulo=limpar(i.fields.getTextInputValue('rec_titulo'),90);
      c.descricao=limpar(i.fields.getTextInputValue('rec_desc'),800);
      c.bannerUrl=validoUrl(i.fields.getTextInputValue('rec_banner'));
      c.bannerAprovadoUrl=validoUrl(i.fields.getTextInputValue('rec_banner_aprovado'));
      await sincronizarPainelPrincipal(i,c);
      await responder(i,'✅ Visual editado nesta sessão e aplicado ao painel.');return true;
    }
    if(m&&i.customId==='rec:adicionar'){
      if(c.perguntas.length>=20){await responder(i,'❌ Limite atingido.');return true;}
      c.perguntas.push(limpar(i.fields.getTextInputValue('rec_pergunta'),250));
      await sincronizarPainelPrincipal(i,c);
      await responder(i,'✅ Pergunta adicionada.');return true;
    }
    return true;
  }catch(e){await erro(i,e);return true;}
}
module.exports={comando,handle,handleMessage};
