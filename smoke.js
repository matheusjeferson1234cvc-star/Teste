'use strict';
// Testes offline de regressão dos módulos e dos limites de componentes V2.
// Não usa token, internet, conexão com Discord nem módulos instalados.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ROOT = __dirname;
const source = ['index.js',...fs.readdirSync(ROOT).filter(x=>/^cetus-.*\.js$/.test(x))]
  .map(x=>fs.readFileSync(path.join(ROOT,x),'utf8')).join('\n');
class Builder {
  constructor(kind) { this.data={...(kind?{type:kind}:{})}; this.parts=[]; this.items=[]; }
  setAccentColor(c) {this.data.accent_color=c;return this;}
  setContent(c) {this.data.content=c;return this;}
  setDivider(c) {this.data.divider=c;return this;}
  setCustomId(c) {this.data.custom_id=c;return this;}
  setLabel(c) {this.data.label=c;return this;}
  setStyle(c) {this.data.style=c;return this;}
  setEmoji(c) {this.data.emoji=c;return this;}
  setURL(c) {this.data.media={url:c};return this;}
  setName(c) {this.data.name=c;return this;}
  setDescription(c) {this.data.description=c;return this;}
  setDefaultMemberPermissions(c) {return this;}
  setRequired(c) {this.data.required=c;return this;}
  setMinValues(c) {this.data.min_values=c;return this;}
  setMaxValues(c) {this.data.max_values=c;return this;}
  setMinLength(c) {return this;}
  setMaxLength(c) {return this;}
  setValue(c) {this.data.value=c;return this;}
  setPlaceholder(c) {this.data.placeholder=c;return this;}
  setTitle(c) {this.data.title=c;return this;}
  setTextInputComponent(c) {this.parts=[c];return this;}
  setFileUploadComponent(c) {this.parts=[c];return this;}
  setUserSelectMenuComponent(c) {this.parts=[c];return this;}
  setStringSelectMenuComponent(c) {this.parts=[c];return this;}
  setDefaultUsers() {return this;}
  setColor() {return this;}
  addTextDisplayComponents(...c) {this.parts.push(...c.flat());return this;}
  addSeparatorComponents(...c) {this.parts.push(...c.flat());return this;}
  addActionRowComponents(...c) {this.parts.push(...c.flat());return this;}
  addMediaGalleryComponents(...c) {this.parts.push(...c.flat());return this;}
  addLabelComponents(...c) {this.parts.push(...c.flat());return this;}
  addItems(...c) {this.items.push(...c.flat());return this;}
  addComponents(...c) {this.parts.push(...c.flat());return this;}
  addOptions(...c) {this.items.push(...c.flat());return this;}
  addChoices(...c) {this.items.push(...c.flat());return this;}
  addStringOption(fn) {fn(new Builder());return this;}
  spliceComponents(start,del,...c) {this.parts.splice(start,del,...c);return this;}
  toJSON() {
    return {...this.data,
      ...(this.parts.length?{components:this.parts.map(x=>x?.toJSON?.()??x)}:{}),
      ...(this.items.length?{items:this.items.map(x=>x?.toJSON?.()??x)}:{})};
  }
}
const types = {
  ContainerBuilder:17, TextDisplayBuilder:10, SeparatorBuilder:14, ActionRowBuilder:1,
  ButtonBuilder:2, MediaGalleryBuilder:12, MediaGalleryItemBuilder:0,
  LabelBuilder:18, FileUploadBuilder:19, TextInputBuilder:4, ModalBuilder:99,
  StringSelectMenuBuilder:3, UserSelectMenuBuilder:5, SlashCommandBuilder:0
};
const djs = new Proxy({
  MessageFlags:{IsComponentsV2:32768,Ephemeral:64},
  ButtonStyle:{Primary:1, Secondary:2, Success:3, Danger:4},
  PermissionsBitField:{Flags:{Administrator:8n, ManageRoles:1n,ManageNicknames:2n,ManageChannels:4n,ViewChannel:8n,SendMessages:16n,ReadMessageHistory:32n,AttachFiles:64n}},
  PermissionFlagsBits:{ManageGuild:32n},
  ChannelType:{GuildText:0,GuildCategory:4},
  TextInputStyle:{Short:1,Paragraph:2}
}, {get(obj,prop){if(prop in obj)return obj[prop];if(prop in types)return class extends Builder {constructor(){super(types[prop]);}};throw Error(`Unknown mocked ${String(prop)}`);}});

const origLoad = Module._load;
Module._load = function(request,parent,isMain) {
  if (request === 'discord.js') return djs;
  return origLoad.apply(this,arguments);
};
const comum = require('./cetus-comum');
const rec = require('./cetus-recrutamento');
const reg = require('./cetus-registro');
const bo = require('./cetus-ocorrencias');
const diag = require('./cetus-diagnostico');
const gifs = require('./cetus-gifs');
Module._load = origLoad;
function validarPainel(label,payload) {
  const result=comum.comLogo(payload,{iconURL:()=> 'https://example.com/icon.png'});
  assert.equal(result.flags & 32768,32768,`${label}: flag V2`);
  assert.ok(result.components.length>0,`${label}: componentes`);
  let total=0;
  for (const c of result.components) {
    assert.equal(c.type,17,`${label}: container`);
    assert.ok(c.components.length<=10,`${label}: container excedeu 10 (${c.components.length})`);
    total += c.components.length;
  }
  assert.ok(total <= 40, `${label}: ultrapassou 40 componentes (${total})`);
  console.log('OK:',label, '|', result.components.length,'container(s),',total,'componentes');
}
for (const tipo of ['recrutamento','registro','boletim']) {
  const gif = path.join(ROOT, `cetus-${tipo}.gif`);
  assert.ok(fs.existsSync(gif), `GIF ${tipo} incluído no ZIP`);
  const arquivo = fs.readFileSync(gif);
  assert.equal(arquivo.subarray(0, 6).toString('ascii'),'GIF89a',`GIF ${tipo} válido`);
  assert.ok(arquivo.length < 5 * 1024 * 1024,`GIF ${tipo} leve para Discord`);
}
for (const [tipo, p] of [['recrutamento',rec.buildPanel(rec.getConfig('x'))],['registro',reg.buildPanel(reg.getConfig('x'))],['boletim',bo.buildPanel()]]) {
  validarPainel(`painel animado ${tipo}`, p);
  assert.equal(p.files.length,1, `GIF ${tipo} presente no payload`);
  assert.equal(p.files[0].name, `cetus-${tipo}.gif`);
  assert.ok(Buffer.isBuffer(p.files[0].attachment), 'GIF carregado como bytes');
  const tela=comum.comLogo(p,{iconURL:()=>null});
  assert.match(JSON.stringify(tela.components), new RegExp('attachment://cetus-'+tipo+'\\.gif'));
}
const recCustom = rec.getConfig('custom-banner');
recCustom.bannerUrl = 'https://example.com/custom.gif';
const customPanel = rec.buildPanel(recCustom);
assert.ok(!customPanel.files?.length, 'banner personalizado não requer GIF local');
assert.match(JSON.stringify(comum.comLogo(customPanel, {iconURL:()=>null}).components), /custom\.gif/);
console.log('OK: banner personalizado continua disponível');
validarPainel('menu de recrutamento', rec.menuConfig());
validarPainel('configuração do registro', reg.painelConfig(reg.getConfig('123')));
validarPainel('configuração do boletim', bo.painelConfig(bo.getConfig('123')));
const guild={id:'123',name:'Servidor de testes',roles:{cache:new Map()},
  channels:{fetch:async()=>null},iconURL:()=>null,
  members:{fetchMe:async()=>({permissions:{has:()=>true},roles:{highest:{comparePositionTo:()=>1}}})}};
(async()=>{
  validarPainel('diagnóstico de todos os sistemas',await diag.gerar({guild,guildId:'123'},'todos'));
  // Formulário de registro com turno desligado e depois ligado.
  const fakeInteraction={customId:'reg:iniciar',guildId:'123',
    isChatInputCommand:()=>false,isButton:()=>true,isChannelSelectMenu:()=>false,isRoleSelectMenu:()=>false,isModalSubmit:()=>false,
    showModal:async function(m){this.modal=m;}};
  await reg.handle(fakeInteraction);
  let content=fakeInteraction.modal.toJSON();
  assert.equal(content.components.length,3,'sem turno: nome, ID e foto');
  reg.getConfig('123').usarTurnos=true;
  await reg.handle(fakeInteraction);
  content=fakeInteraction.modal.toJSON();
  assert.equal(content.components.length,4,'com turno: nome, ID, turno e foto');
  console.log('OK: modal de registro com turno ativado/desativado');
  assert.match(source,/const BRAND = '🤖 Organizações • Roleplay \| Desenvolvido por Cetus';/);
  console.log('OK: crédito do desenvolvedor preservado');

  // Consulta de B.O. deve recuperar relatórios do histórico após reinício do bot.
  const registroHistorico = {
    codigo:'B.O. #88', tipo:'prisao', personagemId:'149324', local:'Delegacia Central',
    relato:'Teste RP', policiais:[], autorId:'policial', criadoEm: Date.now()
  };
  const publicadoHistorico=bo.buildReport(registroHistorico, []);
  const mensagemAntiga = {
    id:'msg-88',url:'https://discord.com/channels/history/historychan/msg-88',
    author:{id:'bot'}, components:publicadoHistorico.components
  };
  assert.match(bo.textoDaMensagem(mensagemAntiga),/149324/);
  assert.equal(bo.dadoDoBO(mensagemAntiga).personagemId,'149324');
  bo.getConfig('history').canalId='historychan';
  const consulta = await bo.buscarBOsPorId({ guildId:'history',client:{user:{id:'bot'}},
    guild:{ channels:{ fetch:async()=>({messages:{fetch:async()=>new Map([['msg-88',mensagemAntiga]])}})} }
  },'149324');
  assert.equal(consulta.resultados.length,1,'deve achar BO publicado antes de reiniciar');
  assert.equal(consulta.resultados[0].codigo,'B.O. #88');
  console.log('OK: botão Consultar busca BOs no histórico do canal');

  // Navegação nas configurações: Voltar e seletores não criam novas janelas.
  const admin={id:'admin'};
  const novaInteracao = id => ({
    guildId:'123',guild:{ownerId:'admin',iconURL:()=>null},user:admin,client:{user:{displayAvatarURL:()=>null}},
    customId:id, values:['999'],memberPermissions:{has:()=>true},
    message:{flags:{has:()=>true}},
    isChatInputCommand:()=>false,isButton:()=>!id.includes(':s_'),
    isChannelSelectMenu:()=>id.includes(':s_'),isRoleSelectMenu:()=>false,
    isStringSelectMenu:()=>false,isModalSubmit:()=>false,
    update:async function(payload){this.updated=payload;},
    reply:async function(payload){this.replied=payload;}
  });
  for (const id of ['rec:config','rec:status','rec:seletores','rec:perguntas']) {
    const i=novaInteracao(id);
    await rec.handle(i);
    assert.ok(i.updated,`${id}: deveria atualizar janela privada`);
    validarPainel(`navegação ${id}`,i.updated);
  }
  const sel=novaInteracao('rec:s_relatorio');
  await rec.handle(sel);
  assert.equal(rec.getConfig('123').relatorioId,'999');
  validarPainel('seleção de relatório do recrutamento',sel.updated);
  for (const id of ['reg:config','reg:ver_status']) {
    const i=novaInteracao(id);
    await reg.handle(i);
    assert.ok(i.updated,`${id} não atualizou a janela`);
    validarPainel(`navegação ${id}`,i.updated);
  }
  const diagBack=novaInteracao('diag:voltar:reg');
  diagBack.guild=guild;
  await diag.handle(diagBack);
  assert.ok(diagBack.updated,'diagnóstico Voltar para registro deve atualizar');
  console.log('OK: navegação e botão Voltar');

  // Atualização automática: confirma que os mesmos IDs de mensagens são editados,
  // inclusive em múltiplos painéis, sem exigir comando manual.
  const editados = [];
  const msgs = new Map();
  const guildAtualizacao = {
    id:'321', ownerId:'admin',iconURL:()=>null,
    channels:{fetch:async id=>({
      messages:{fetch:async msgId=>msgs.get(`${id}:${msgId}`) || null}
    })}
  };
  function salvarPainel(tipo, id) {
    const m={id,channelId:'chan',author:{id:'bot'},
      attachments: id==='rec1' ? new Map([['arquivo',{id:'arquivo',name:'cetus-recrutamento.gif'}]]) : new Map(),
      edit:async function(payload){editados.push({id,payload});}};
    msgs.set(`chan:${id}`,m);
    comum.registrarPainelMensagem(tipo,'321',m);
    return m;
  }
  salvarPainel('recrutamento','rec1');
  salvarPainel('recrutamento','rec2');
  salvarPainel('registro','reg1');
  salvarPainel('boletim','bo1');
  const iBase=(id,isSelect=false)=>({
    guildId:'321',guild:guildAtualizacao,user:admin,client:{user:{id:'bot',displayAvatarURL:()=>null}},
    customId:id,values:['destino'],memberPermissions:{has:()=>true},
    message:{flags:{has:()=>true}},
    isChatInputCommand:()=>false,isButton:()=>!isSelect,
    isChannelSelectMenu:()=>isSelect,isRoleSelectMenu:()=>false,isStringSelectMenu:()=>false,isModalSubmit:()=>false,
    update:async function(payload){this.updated=payload;},
    reply:async function(payload){this.replied=payload;}
  });
  const recSelecao=iBase('rec:s_relatorio',true);
  await rec.handle(recSelecao);
  assert.deepEqual(editados.map(x=>x.id).sort(),['rec1','rec2']);
  assert.ok(!editados.find(x=>x.id==='rec1')?.payload.files?.length, 'painel com GIF anterior deve reutilizar o anexo');
  assert.equal(editados.find(x=>x.id==='rec1')?.payload.attachments?.[0]?.id,'arquivo','GIF existente deve ser explicitamente mantido');
  assert.equal(editados.find(x=>x.id==='rec2')?.payload.files?.[0]?.name, 'cetus-recrutamento.gif', 'painel antigo recebe GIF durante atualização');
  assert.equal(rec.getConfig('321').relatorioId,'destino');
  console.log('OK: recrutamento atualiza automaticamente dois painéis');
  editados.length=0;
  const regSelecao=iBase('reg:s_log',true);
  await reg.handle(regSelecao);
  assert.deepEqual(editados.map(x=>x.id),['reg1']);
  console.log('OK: registro atualiza automaticamente o painel');
  editados.length=0;
  const boSelecao=iBase('bo:selecionar_canal',true);
  await bo.handle(boSelecao);
  assert.deepEqual(editados.map(x=>x.id),['bo1']);
  console.log('OK: boletim atualiza automaticamente o painel');

  // Um painel já publicado antes de reiniciar pode ser reconhecido quando
  // o administrador clica no seu botão público de Configurações.
  const antigo={id:'antigo',channelId:'chan',author:{id:'bot'},
    flags:{has:()=>false},edit:async payload=>editados.push({id:'antigo',payload})};
  msgs.set('chan:antigo',antigo);
  const abrir=iBase('reg:config');
  abrir.message=antigo;
  await reg.handle(abrir);
  assert.ok(abrir.replied,'primeira abertura pública deve responder privadamente');
  editados.length=0;
  const toggle=iBase('reg:toggle_turnos');
  await reg.handle(toggle);
  assert.deepEqual(editados.map(x=>x.id).sort(),['antigo','reg1']);
  console.log('OK: painel antigo reconhecido ao abrir Configurações');
  const painelAntigo = rec.buildPanel(rec.getConfig('321'));
  const antigoReparo = {
    id:'painel-velho', channelId:'chan', author:{id:'bot'},
    attachments:new Map([['old',{id:'old',name:'cetus-recrutamento.gif'}],['anexo',{id:'anexo',name:'outro.gif'}]]),
    components:comum.comLogo(painelAntigo,{iconURL:()=>null}).components,
    edit:async function(payload) {this.atualizado=payload;}
  };
  const reparoI={guildId:'321',guild:guildAtualizacao,client:{user:{id:'bot'}},user:admin};
  await gifs.repararMensagem(reparoI,antigoReparo,'recrutamento');
  assert.equal(antigoReparo.atualizado.files[0].name,'cetus-recrutamento.gif');
  assert.equal(antigoReparo.atualizado.attachments.length,1);
  assert.equal(antigoReparo.atualizado.attachments[0].id,'anexo');
  console.log('OK: reparo de GIF envia novo arquivo sem apagar outros anexos');
  const gifTeste = {
    guildId:'321', guild:{ownerId:'admin',iconURL:()=>null}, user:admin, client:{user:{id:'bot',displayAvatarURL:()=>null}},
    commandName:'testar_gif', options:{getString:n=>n==='tipo'?'registro':null},
    isChatInputCommand:()=>true, deferReply:async function(arg){this.deferred=true;this.deferArgs=arg;},
    editReply:async function(payload){this.edited=payload;}, memberPermissions:{has:()=>true}
  };
  await gifs.handle(gifTeste);
  assert.equal(gifTeste.deferArgs.flags, 64, 'resposta de teste deve ser privada');
  assert.equal(gifTeste.edited.flags, 32768, 'edição privada deve usar flag V2 sem Ephemeral');
  assert.equal(gifTeste.edited.files[0].name, 'cetus-registro.gif', 'teste envia GIF como anexo');
  console.log('OK: comando /testar_gif constrói resposta privada com anexo animado');


  // Novo B.O. com campos separados e anexos também disponíveis ao editar.
  const novoBO = bo.buildModal(null,'prisao').toJSON();
  assert.equal(novoBO.components.length,5,'formulário do BO precisa ter cinco campos');
  assert.match(JSON.stringify(novoBO),/Local da ocorrência/);
  assert.match(JSON.stringify(novoBO),/Descrição detalhada/);
  assert.match(JSON.stringify(novoBO),/Fotos e vídeos/);
  const edicaoBO = bo.buildModal({codigo:'B.O. #1',tipo:'prisao',personagemId:'150',local:'Centro',relato:'Teste',policiais:[]}).toJSON();
  assert.match(JSON.stringify(edicaoBO),/Adicionar arquivos/,'edição permite novos anexos');
  const publicacaoBO = bo.buildReport({
    codigo:'B.O. #1',tipo:'prisao',personagemId:'150',local:'Centro',relato:'Descrição de teste',
    autorId:'100',policiais:['101'],criadoEm:Date.now()
  },['imagem.png','video.mp4']);
  validarPainel('BO com fotos e vídeos separados',publicacaoBO);
  const publicado = JSON.stringify(comum.comLogo(publicacaoBO,{iconURL:()=>null}).components);
  for (const label of ['Envolvido','Local da ocorrência','Descrição da ocorrência','Arquivos e evidências','Registro e equipe']) {
    assert.ok(publicado.includes(label),`seção ausente: ${label}`);
  }
  assert.match(publicado,/attachment:\/\/imagem.png/);
  assert.match(publicado,/attachment:\/\/video.mp4/);
  console.log('OK: BO organizado por seções; edição aceita anexos');

  // Exercita o envio de boletim e a edição que acrescenta arquivos sem remover os anteriores.
  const cfgBO = bo.getConfig('gBO');
  cfgBO.cargoId = 'policia';
  cfgBO.canalId = 'canalBO';
  const enviosBO = [];
  const mensagemBO = {id:'msgBO1', url:'https://discord.com/channels/gBO/canalBO/msgBO1',
    attachments:new Map([['file1',{id:'file1',name:'cetus_fake_0.png'}]]),
    edit: async function(payload){this.ultimaEdicao=payload;return this;}};
  const canalBO = {id:'canalBO',isTextBased:()=>true,send:async payload=>{enviosBO.push(payload);return mensagemBO;},
    messages:{fetch:async()=>mensagemBO}};
  const guildBO = {id:'gBO',ownerId:'admin',iconURL:()=>null,
    channels:{fetch:async()=>canalBO},members:{fetch:async()=>({roles:{cache:new Map()}})}};
  const interBO = (id,anexos,descricao) => ({
    customId:id,guildId:'gBO',guild:guildBO,user:{id:'admin'},client:{user:{id:'bot',displayAvatarURL:()=>null}},
    memberPermissions:{has:()=>true},inGuild:()=>true,
    isChatInputCommand:()=>false,isButton:()=>false,isModalSubmit:()=>true,
    isChannelSelectMenu:()=>false,isRoleSelectMenu:()=>false,isStringSelectMenu:()=>false,
    fields:{
      getSelectedUsers:()=>new Map(),
      getTextInputValue:k=>({bo_id:'149324',bo_local:'Centro',bo_relato:descricao})[k],
      getUploadedFiles:()=>new Map(anexos.map((a,j)=>[String(j),a]))
    },
    deferReply:async function(){this.deferred=true;},editReply:async function(payload){this.respondido=payload;}
  });
  const boNovo=interBO('bo:criar:prisao', [{name:'prova.png',contentType:'image/png',url:'https://example.com/prova.png'}],'Relato inicial');
  await bo.handle(boNovo);
  assert.equal(enviosBO.length,1,'publicação do BO criada');
  assert.equal(enviosBO[0].files.length,1,'anexo inicial enviado');
  assert.ok(boNovo.respondido,'confirmação do envio do BO');
  // Durante o teste, o Discord teria retornado este anexo no objeto da mensagem.
  mensagemBO.attachments = new Map([['file1',{id:'file1',name:enviosBO[0].files[0].name}]]);
  const boEditar=interBO('bo:editar:B.O. #1',[{name:'video.mp4',contentType:'video/mp4',url:'https://example.com/video.mp4'}],'Relato atualizado');
  await bo.handle(boEditar);
  assert.ok(mensagemBO.ultimaEdicao,'BO editado');
  assert.equal(mensagemBO.ultimaEdicao.files.length,1,'novo arquivo adicionado na edição');
  assert.equal(mensagemBO.ultimaEdicao.attachments[0].id,'file1','anexo anterior preservado');
  assert.match(JSON.stringify(mensagemBO.ultimaEdicao.components),/attachment:\/\/cetus_/);
  console.log('OK: criação/edição de B.O. preserva anexos e aceita vídeo novo');

  assert.match(source,/setName\('diagnostico'\)/);
  assert.match(source,/setName\('testar_gif'\)/);
  assert.match(source,/setName\('corrigir_gifs'\)/);
  console.log('OK: comando diagnóstico preservado');

})().catch(err=>{console.error(err);process.exitCode=1;});
