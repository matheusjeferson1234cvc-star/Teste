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
  setDefaultUsers(...ids) {this.data.default_values=ids;return this;}
  setDefaultRoles(...ids) {this.data.default_values=ids;return this;}
  setDefaultChannels(...ids) {this.data.default_values=ids;return this;}
  setChannelTypes(...types) {this.data.channel_types=types;return this;}
  setChannelSelectMenuComponent(c) {this.parts=[c];return this;}
  setRoleSelectMenuComponent(c) {this.parts=[c];return this;}
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
  StringSelectMenuBuilder:3, UserSelectMenuBuilder:5, ChannelSelectMenuBuilder:8, RoleSelectMenuBuilder:6, SlashCommandBuilder:0
};
const djs = new Proxy({
  MessageFlags:{IsComponentsV2:32768,Ephemeral:64},
  ButtonStyle:{Primary:1, Secondary:2, Success:3, Danger:4},
  PermissionsBitField:{Flags:{Administrator:8n, ManageRoles:1n,ManageNicknames:2n,ManageChannels:4n,ViewChannel:8n,SendMessages:16n,ReadMessageHistory:32n,AttachFiles:64n}},
  PermissionFlagsBits:{ManageGuild:32n},
  ChannelType:{GuildText:0,GuildCategory:4},
  ChannelType:{GuildText:0},
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
  const boSelecao={...iBase('bo:config_modal'),
    isButton:()=>false,isModalSubmit:()=>true,
    fields:{getSelectedChannels:()=>new Map([['destino',{id:'destino'}]]),getSelectedRoles:()=>new Map()},
    deferReply:async function(){this.deferred=true;},editReply:async function(p){this.updated=p;}};
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


  // Modal V2 de BO: cinco campos Label, seleção de colegas no próprio formulário. Arquivos são adicionados depois.
  const modais=require('./cetus-bo-modais');
  const penal=require('./cetus-codigo-penal');
  assert.equal(penal.ARTIGOS.length,31);
  for(const tipo of ['prisao','apreensao','multa']) {
    const m=bo.buildModal(null,tipo).toJSON();
    assert.equal(m.components.length,5,'modal BO deve ter cinco labels');
    assert.ok(m.components.every(c=>c.type===18));
    assert.match(JSON.stringify(m),/bo_artigos/);
    assert.match(JSON.stringify(m),/bo_policiais/);
    assert.doesNotMatch(JSON.stringify(m),/bo_anexos/);
    assert.equal(m.components[4].components[0].type,5,'campo final deve ser o seletor de usuários');
    assert.equal(m.components[4].components[0].max_values,10,'até dez colegas');
    console.log('OK: Modal V2 em '+tipo);
  }
  assert.equal(modais.modalConfig(bo.getConfig('321')).toJSON().components.length,5);
  assert.equal(modais.modalEquipe({codigo:'B.O. #1',policiais:[]}).toJSON().components.length,1);
  assert.equal(modais.modalArquivos({codigo:'B.O. #1'},3).toJSON().components.length,1);
  assert.equal(modais.modalPesquisa().toJSON().components.length,1);
  console.log('OK: modais de configurações, pesquisa, equipe e anexos');
  const art=bo.interpretarArtigos('01, 02, 28x10, 04x5; pena=reduzida; extra=500');
  assert.deepEqual(art.artigos,['01','02','28','04']);
  assert.equal(art.quantidades['28'],10);
  assert.equal(art.quantidades['04'],5);
  assert.equal(art.modoPena,'reduzida');
  const total=penal.calcular(art.artigos,art.modoPena,art.quantidades,art.multaExtra);
  assert.equal(total.totalPena,32+24+8+32);
  assert.equal(total.totalMulta,3500+1500+20*10+40*5+500);
  assert.throws(()=>bo.interpretarArtigos('28'),/quantidade/);
  assert.throws(()=>bo.interpretarArtigos('98'),/catálogo/);
  assert.throws(()=>bo.interpretarArtigos('01, 01x10'),/repetido/);
  assert.throws(()=>bo.interpretarArtigos('01; pena=invalida'),/Opção inválida/);
  console.log('OK: múltiplos artigos, quantidade, redução, multa extra e validação');
  const publicacaoBO=bo.buildReport({codigo:'B.O. #1',tipo:'prisao',personagemId:'150',local:'Centro',relato:'Teste',autorId:'100',policiais:['101'],criadoEm:Date.now(), ...art}, ['foto.png']);
  validarPainel('B.O. V2 com os artigos e anexos',publicacaoBO);
  const corpo=JSON.stringify(comum.comLogo(publicacaoBO,{iconURL:()=>null}).components);
  for(const nome of ['Identificação','Local da ocorrência','Código Penal','Arquivos e evidências','Equipe responsável']) assert.ok(corpo.includes(nome));
  const cfgB=bo.getConfig('g_modal');
  cfgB.canalId='canal';cfgB.cargoId='policia';
  const enviadas=[];
  const mensagem={id:'msg1',url:'https://discord.com/channels/g_modal/canal/msg1',attachments:new Map(),
    edit:async function(p){this.atualizado=p;}};
  const canal={id:'canal',isTextBased:()=>true,send:async p=>{enviadas.push(p);return mensagem;},messages:{fetch:async()=>mensagem}};
  const guildBO={id:'g_modal',ownerId:'admin',iconURL:()=>null,channels:{fetch:async()=>canal},members:{fetch:async()=>({roles:{cache:new Map()}})}};
  const usuario={id:'admin'};
  function form(submitId,data={}) {
    return {
      customId:submitId,guildId:'g_modal',guild:guildBO,client:{user:{id:'bot',displayAvatarURL:()=>null}},
      user:usuario,memberPermissions:{has:()=>true},inGuild:()=>true,
      isChatInputCommand:()=>false,isButton:()=>false,isModalSubmit:()=>true,
      isChannelSelectMenu:()=>false,isRoleSelectMenu:()=>false,isStringSelectMenu:()=>false,
      fields:{getTextInputValue:id=>({...{bo_id:'456',bo_local:'Centro',bo_relato:'Descrição',bo_artigos:'01, 28x3; pena=aumentada'}, ...data})[id]||'',
        getUploadedFiles:()=>new Map(),getSelectedUsers:()=>new Map()},
      deferReply:async function(){this.deferred=true;},editReply:async function(p){this.resposta=p;},
      reply:async function(p){this.resposta=p;},showModal:async function(p){this.modal=p;}
    };
  }
  const novo=form('bo:criar:prisao');
  novo.fields.getSelectedUsers=()=>new Map([['policial2',{id:'policial2'}],['policial3',{id:'policial3'}]]);
  await bo.handle(novo);
  assert.equal(enviadas.length,1,'deve publicar sem etapa intermediária');
  assert.ok(novo.resposta?.components?.length,'deve exibir botões privados de edição/equipe/arquivos');
  assert.match(JSON.stringify(enviadas[0].components),/456/);
  assert.match(JSON.stringify(enviadas[0].components),/policial2/);
  assert.match(JSON.stringify(enviadas[0].components),/policial3/);
  assert.deepEqual(enviadas[0].allowedMentions.users.sort(),['admin','policial2','policial3'].sort());
  const salvar=bo.dadoDoBO({components:enviadas[0].components});
  assert.equal(salvar.personagemId,'456');
  console.log('OK: BO publica e marca até dez colegas selecionados no modal principal');
  const painelBtn={
    guildId:'g_modal',guild:guildBO,user:usuario,client:{user:{id:'bot',displayAvatarURL:()=>null}},
    memberPermissions:{has:()=>true},inGuild:()=>true,customId:'bo:novo:multa',
    isChatInputCommand:()=>false,isButton:()=>true,isModalSubmit:()=>false,
    isChannelSelectMenu:()=>false,isRoleSelectMenu:()=>false,isStringSelectMenu:()=>false,
    showModal:async function(m){this.modal=m;},reply:async function(p){this.response=p;}
  };
  await bo.handle(painelBtn);
  assert.equal(painelBtn.modal.toJSON().components.length,5);
  console.log('OK: click no painel abre imediatamente o modal de multa');
  const config={...painelBtn,customId:'bo:config',message:{author:{id:'bot'},flags:{has:()=>false},id:'painel-123',channelId:'canal'},
    showModal:async function(m){this.modal=m;}};
  await bo.handle(config);
  assert.equal(config.modal.toJSON().components.length,5);
  console.log('OK: configurações do B.O. abrem por modal V2');
  const configSubmit=form('bo:config_modal');
  configSubmit.fields.getSelectedChannels=()=>new Map([['canal',{id:'canal'}]]);
  configSubmit.fields.getSelectedRoles=id=>id==='bo_cfg_geral'?new Map([['policia',{id:'policia'}]]):
    id==='bo_cfg_prisao'?new Map([['prisao',{id:'prisao'}]]):new Map();
  await bo.handle(configSubmit);
  assert.equal(cfgB.canalId,'canal');
  assert.equal(cfgB.cargosTipos.prisao,'prisao');
  assert.ok(configSubmit.resposta,'configuracao responde com resumo');
  console.log('OK: configuração por modal salva canal e cargos');

  const codigoNovo=bo.dadoDoBO({components:enviadas[0].components}).codigo;
  const abrirEquipe={...painelBtn,customId:'bo:equipe:'+codigoNovo,showModal:async function(m){this.modal=m;}};
  await bo.handle(abrirEquipe);
  assert.equal(abrirEquipe.modal.toJSON().components.length,1);
  assert.match(JSON.stringify(abrirEquipe.modal.toJSON()),/policial2/);
  const novaEquipe=form('bo:equipe_modal:'+codigoNovo);
  novaEquipe.fields.getSelectedUsers=()=>new Map([['policial2',{id:'policial2'}]]);
  await bo.handle(novaEquipe);
  assert.ok(mensagem.atualizado?.components?.length,'atualização da equipe edita a mensagem');
  assert.match(JSON.stringify(mensagem.atualizado.components),/policial2/);
  console.log('OK: seleção de equipe por modal edita a publicação');

  const novasEvidencias=form('bo:arquivos_modal:'+codigoNovo);
  novasEvidencias.fields.getUploadedFiles=()=>new Map([['a1',{name:'prova.jpg',contentType:'image/jpeg',url:'https://example.com/prova.jpg'}]]);
  await bo.handle(novasEvidencias);
  assert.ok(mensagem.atualizado.files?.length,'novos arquivos devem entrar na edição');
  assert.match(JSON.stringify(mensagem.atualizado.components),/attachment:\/\/cetus_/);
  console.log('OK: modal de evidências mantém o relatório e acrescenta anexo');
  console.log('✅ TODOS OS TESTES OFFLINE CONCLUÍDOS');
})().catch(e=>{console.error(e);process.exitCode=1;});
