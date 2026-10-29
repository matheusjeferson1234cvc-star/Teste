// CETUS — versão de teste em um arquivo único. Sem Supabase, JSON, banco ou persistência.
'use strict';
const __cetusRequireReal = require;
const __cetusModuleFactories = Object.create(null);
const __cetusModuleCache = Object.create(null);
function __cetusLoad(nome) {
  if (__cetusModuleCache[nome]) return __cetusModuleCache[nome].exports;
  const factory = __cetusModuleFactories[nome];
  if (!factory) throw new Error(`Módulo interno não encontrado: ${nome}`);
  const mod = { exports: {} };
  __cetusModuleCache[nome] = mod;
  const req = caminho => {
    if (caminho === './comum') return __cetusLoad('sistemas/comum');
    if (caminho.startsWith('./sistemas/')) return __cetusLoad(caminho.slice(2));
    return __cetusRequireReal(caminho);
  };
  factory(mod, mod.exports, req);
  return mod.exports;
}

// ------ sistemas/comum.js ------
__cetusModuleFactories["sistemas/comum"] = function(module, exports, require) {
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

};

// ------ sistemas/recrutamento.js ------
__cetusModuleFactories["sistemas/recrutamento"] = function(module, exports, require) {
'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ButtonStyle,
  PermissionsBitField, ChannelType, StringSelectMenuBuilder, ActionRowBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, validoUrl, painel, bannerAnimado, aviso, replyMensagem, campo, modal, guildConfig, responder, erro, podeEnviar,
  enviarV2, comLogo, atualizar, abrirConfig, concluirConfig,
  registrarPainelMensagem, registrarPainelDoClique, sincronizarPaineis
} = require('./comum');
const configs = new Map();
const sessoes = new Map();
const pendentes = new Set();
const criandoTickets = new Set();
const avaliando = new Set();
const cfg = id => guildConfig(configs, id, () => ({
  categoriaId:null, relatorioId:null, anuncioId:null, cargoRecrutador:null,
  cargosAprovar:[], cargosRemover:[], perguntas:[], tempoMs:60000,
  titulo:'📋 │ Central de Recrutamento',
  descricao:'Bem-vindo ao **Sistema Oficial de Recrutamento**.\nSe deseja ingressar na organização, clique no botão abaixo e preencha o formulário.',
  bannerUrl:null, bannerAprovadoUrl:null, painelCanal:null, painelMensagem:null
}));
const comando = new SlashCommandBuilder().setName('recrutamento')
  .setDescription('Envia o painel oficial de recrutamento')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
const permit = i => donoAdmin(i) || !!(cfg(i.guildId).cargoRecrutador && i.member?.roles?.cache?.has(cfg(i.guildId).cargoRecrutador));
function painelPrincipal(c) {
  const tempoTxt = c.tempoMs === 60000 ? '1 minuto' : `${Math.round(c.tempoMs / 1000)} segundos`;
  const resultado = painel(c.titulo,
    c.descricao,
    [[['rec:iniciar','Formulário',ButtonStyle.Primary,'📝'],
      ['rec:config','Configurações',ButtonStyle.Secondary,'⚙️']]],0x27ae60,
    [`## 🛡️ Etapas do Processo\n> • 📝 Preenchimento do formulário\n> • ⏱️ Você terá **${tempoTxt}** para responder cada pergunta\n> • 🔎 Análise da candidatura\n> • 🎤 Entrevista com a equipe\n> • ✅ Resultado final`,
     '📷 **Atenção:** envie apenas imagem do RG **do personagem do jogo**. Não envie documento real.']);
  return bannerAnimado(resultado, 'recrutamento', c.bannerUrl);
}
async function sincronizarPainelPrincipal(i, c) {
  return sincronizarPaineis('recrutamento', i.guild, i.client, () => painelPrincipal(c));
}
function menuConfig() {
  return painel('⚙️ Configuração do Recrutamento',
    'Gerencie o sistema de recrutamento através das opções abaixo.',
    [
      [['rec:status','Configuração',ButtonStyle.Secondary,'⚙️']],
      [['rec:seletores','Definir configurações',ButtonStyle.Secondary,'🛠️']],
      [['rec:perguntas','Gerenciar perguntas',ButtonStyle.Secondary,'❓']],
      [['rec:visual','Visual & textos',ButtonStyle.Secondary,'🎨']],
      [['diag:abrir:rec','Diagnóstico',ButtonStyle.Secondary,'🩺']]
    ],0x4f66ff,
    ['⚙️ **Configuração** — visualize o status atual.\n❓ **Perguntas** — gerencie as perguntas.\n🛠️ **Definir configurações** — altere os canais e cargos do sistema.\n🎨 **Visual & textos** — altere título, descrição e banners.']);
}
function nomeCargo(id){return id?`<@&${id}>`:'Não definido';}
function status(c) {
  const ar = a=>a.length?a.map(nomeCargo).join(', '):'Nenhum';
  return painel('⚙️ Configuração do Recrutamento',
    `📁 **Categoria dos recrutamentos:** ${c.categoriaId?`<#${c.categoriaId}>`:'❌ Não definida'}\n`+
    `📄 **Canal de relatórios:** ${c.relatorioId?`<#${c.relatorioId}>`:'❌ Não definido'}\n`+
    `📢 **Canal de anúncios:** ${c.anuncioId?`<#${c.anuncioId}>`:'❌ Não definido'}\n`+
    `🎖️ **Cargo de aprovado:** ${ar(c.cargosAprovar)}\n`+
    `🗑️ **Cargos removidos ao aprovar:** ${ar(c.cargosRemover)}\n`+
    `🛡️ **Cargo de recrutador:** ${nomeCargo(c.cargoRecrutador)}\n`+
    `❓ **Perguntas cadastradas:** ${c.perguntas.length}/20\n`+
    `⏱️ **Tempo por pergunta:** ${c.tempoMs === 60000 ? '1 minuto' : `${Math.round(c.tempoMs/1000)} segundos`}`,
    [[['rec:config','Voltar',ButtonStyle.Secondary,'↩️']]],0x4f66ff);
}
function seletores(c) {
  const linha = (titulo, atual, comp) => ([
    {type:14,divider:true,spacing:1},
    {type:10,content:`## ${titulo}\n${atual}`},
    {type:1,components:[comp]}
  ]);
  const componentes = [
    {type:10,content:'# 🛠️ Definir Configurações\n\nConfigure os canais e cargos utilizados pelo sistema de recrutamento.'},
    ...linha('📁 Categoria dos recrutamentos', c.categoriaId ? `<#${c.categoriaId}>` : '❌ Não definida', { type:8,custom_id:'rec:s_categoria',placeholder:'📁 Selecione a categoria',channel_types:[4]}),
    ...linha('📄 Canal de relatórios', c.relatorioId ? `<#${c.relatorioId}>` : '❌ Não definido', { type:8,custom_id:'rec:s_relatorio',placeholder:'📄 Selecione o canal de relatórios',channel_types:[0]}),
    ...linha('📢 Canal de anúncios', c.anuncioId ? `<#${c.anuncioId}>` : '❌ Não definido', { type:8,custom_id:'rec:s_anuncio',placeholder:'📢 Selecione o canal de anúncios',channel_types:[0]}),
    ...linha('🎖️ Cargo de aprovado', c.cargosAprovar.length ? c.cargosAprovar.map(nomeCargo).join(', ') : '❌ Não definido', { type:6,custom_id:'rec:s_aprovar',placeholder:'🎖️ Selecione os cargos de aprovado',min_values:0,max_values:5}),
    ...linha('🗑️ Cargos removidos ao aprovar', c.cargosRemover.length ? c.cargosRemover.map(nomeCargo).join(', ') : '❌ Nenhum cargo configurado', { type:6,custom_id:'rec:s_remover',placeholder:'🗑️ Selecione os cargos a remover',min_values:0,max_values:5}),
    ...linha('🛡️ Cargo de recrutador', c.cargoRecrutador ? nomeCargo(c.cargoRecrutador) : '❌ Não definido', { type:6,custom_id:'rec:s_recrutador',placeholder:'🛡️ Selecione o cargo de recrutador'}),
    {type:14,divider:true,spacing:1},
    {type:1,components:[{type:2,style:2,custom_id:'rec:config',label:'Voltar',emoji:{name:'↩️'}}]}
  ];
  return { flags:MessageFlags.IsComponentsV2,components:[{type:17,accent_color:0x4f66ff,components:componentes}]};
}
function menuPerguntas(c) {
  const tempoTxt = c.tempoMs === 60000 ? '1 minuto' : `${Math.round(c.tempoMs/1000)} segundos`;
  const lista=c.perguntas.map((p,idx)=>`**${idx+1}.** ${limpar(p,120)}`).join('\n')||'*Nenhuma pergunta cadastrada.*';
  const componentes = [{type:10,content:`# ❓ Gerenciar perguntas\n\n⏱️ **Tempo atual por pergunta:** ${tempoTxt}\n\n📋 **Perguntas cadastradas (${c.perguntas.length}/20):**`}];
  const blocos=[];
  let atual='';
  for(const l of lista.split('\n')) {if(atual.length+l.length>3000){blocos.push(atual);atual='';}atual+=(atual?'\n':'')+l;}
  if(atual)blocos.push(atual);
  for(const p of blocos.slice(0,6)) componentes.push({type:10,content:p});
  componentes.push({type:14,divider:true,spacing:1},
    {type:1,components:[
      {type:2,style:3,custom_id:'rec:add',label:'Adicionar',emoji:{name:'➕'}},
      {type:2,style:4,custom_id:'rec:pop',label:'Remover última',emoji:{name:'➖'}},
      {type:2,style:4,custom_id:'rec:escolher_rem',label:'Remover específica',emoji:{name:'🗑️'}}
    ]},
    {type:1,components:[{type:3,custom_id:'rec:s_tempo',placeholder:'⏱️ Selecione o tempo por pergunta',options:[
      {label:'30 segundos',value:'30000'},{label:'1 minuto',value:'60000'},
      {label:'3 minutos',value:'180000'},{label:'5 minutos',value:'300000'}
    ]}]},
    {type:1,components:[{type:2,style:2,custom_id:'rec:config',label:'Voltar',emoji:{name:'↩️'}}]});
  return {flags:MessageFlags.IsComponentsV2,components:[{type:17,accent_color:0x4f66ff,components:componentes}]};
}
async function sincronizar(canal, messageId, builder) {
  try{if(!canal || !messageId) return; const msg=await canal.messages.fetch(messageId);await msg.edit(builder());}catch(e){console.warn('Não foi possível atualizar painel:',e.message);}
}
async function mensagemTicket(canal, titulo, desc, cor=0x3498db) {
  return enviarV2(canal, painel(titulo,desc,[],cor));
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
  for(let j=0;j<partes.length;j++) await enviarV2(canal, painel(j===0?'📋 Candidatura':'📋 Continuação',partes[j],[],0x3498db));
  const dados = `Candidato <@${sessao.userId}>\nPersonagem ${sessao.nome}`;
  const aval = painel('🔎 Avaliar candidatura',
    `📷 **RG fictício do personagem:** ${sessao.rg ? 'imagem anexada abaixo' : 'não enviado'}\n${dados}`,
    [[[`rec:aprovar:${sessao.userId}`,'Aprovar',ButtonStyle.Success],
      [`rec:reprovar:${sessao.userId}`,'Reprovar',ButtonStyle.Danger]]],0x3498db);
  if (sessao.rg) {
    // Republica no relatório antes de apagar o ticket: evita depender do anexo original.
    const ext = String(sessao.rgExt || 'png').replace(/[^a-z0-9]/gi,'').slice(0,5) || 'png';
    const nome = `rg_personagem_${sessao.userId}.${ext}`;
    aval.files = [{ attachment: sessao.rg, name: nome }];
    aval.components[0].addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${nome}`))
    );
  }
  try { await enviarV2(canal, aval); }
  catch (e) {
    if (!sessao.rg) throw e;
    console.warn('Falha ao copiar imagem de RG fictício para relatório:', e.message);
    await enviarV2(canal, painel('🔎 Avaliar candidatura',
      `⚠️ **Imagem não pôde ser copiada.** Confira o ticket antes de ele fechar.\n${dados}`,
      [[[`rec:aprovar:${sessao.userId}`,'Aprovar',ButtonStyle.Success],
        [`rec:reprovar:${sessao.userId}`,'Reprovar',ButtonStyle.Danger]]],0xe67e22));
  }
  pendentes.add(`${sessao.guildId}:${sessao.userId}`);
  encerrar(sessao,'Formulário enviado para avaliação.');
}
async function criarTicket(i, nome) {
  const c=cfg(i.guildId), key=`${i.guildId}:${i.user.id}`;
  if(!c.relatorioId) throw new Error('Configure o canal de relatórios antes de receber recrutamentos.');
  if(pendentes.has(key)) throw new Error('Você já tem uma candidatura aguardando análise.');
  if(criandoTickets.has(key)) throw new Error('Seu ticket já está sendo criado. Aguarde um instante.');
  if([...sessoes.values()].some(s=>s.guildId===i.guildId && s.userId===i.user.id)) throw new Error('Você já tem um ticket em andamento.');
  if([...sessoes.values()].filter(s=>s.guildId===i.guildId).length>=10) throw new Error('Há 10 recrutamentos simultâneos. Aguarde uma vaga.');
  criandoTickets.add(key);
  try {
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
  } finally { criandoTickets.delete(key); }
}
async function handleMessage(m) {
  if(m.author.bot||!m.guild)return;
  const s=sessoes.get(m.channel.id);
  if(!s ||s.userId!==m.author.id||s.fechando)return;
  if(s.step===0){
    const a=m.attachments.first();
    if(!a || !a.contentType?.startsWith('image/')){
      await replyMensagem(m, '⚠️ Envie uma imagem do RG **fictício do personagem** (ou aguarde o tempo expirar).');return;
    }
    s.rg=a.url;
    s.rgExt = (a.name?.split('.').pop() || 'png').toLowerCase();
  }else {
    if(!m.content.trim()) {await replyMensagem(m, '⚠️ Responda com texto.');return;}
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
      const msg=await enviarV2(i.channel, painelPrincipal(c));
      c.painelCanal=msg.channelId;c.painelMensagem=msg.id;
      registrarPainelMensagem('recrutamento', i.guildId, msg);
      await responder(i, `✅ Painel publicado: ${msg.url}`);return true;
    }
    if(button&&i.customId==='rec:iniciar'){
      await i.showModal(modal('rec:form','Iniciar Recrutamento',[
        campo('rec_nome','Nome e ID do personagem',{max:120,placeholder:'Ex: João Silva | ID 1234'})
      ]));return true;
    }
    if(m&&i.customId==='rec:form'){
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const canal=await criarTicket(i,limpar(i.fields.getTextInputValue('rec_nome'),120));
      await responder(i, `✅ Ticket de recrutamento criado: ${canal}`);return true;
    }
    if(button&&(i.customId.startsWith('rec:aprovar:')||i.customId.startsWith('rec:reprovar:'))){
      if(!permit(i)){await responder(i,'❌ Você não é recrutador.');return true;}
      const aprovado=i.customId.startsWith('rec:aprovar:');
      const userId=i.customId.split(':')[2];
      const key=`${i.guildId}:${userId}`;
      if(!pendentes.has(key) || avaliando.has(key)){await responder(i,'⚠️ Esta candidatura já está sendo analisada ou não está pendente.');return true;}
      avaliando.add(key);
      await i.deferUpdate();
      const member=await i.guild.members.fetch(userId).catch(()=>null);
      if(aprovado&&member){
        if(c.cargosAprovar.length)await member.roles.add(c.cargosAprovar);
        if(c.cargosRemover.length)await member.roles.remove(c.cargosRemover);
      }
      await i.editReply(comLogo(painel(aprovado?'✅ Candidatura aprovada':'❌ Candidatura reprovada',
        `Candidato <@${userId}>\nAnalisado por <@${i.user.id}>`,[],aprovado?0x2ecc71:0xe74c3c), i.guild, i.client));
      pendentes.delete(key);
      avaliando.delete(key);
      if(member)member.send(comLogo(painel(aprovado?'✅ Recrutamento aprovado':'❌ Recrutamento reprovado', `Servidor: **${i.guild.name}**
Situação: ${aprovado?'Aprovado ✅':'Reprovado ❌'}`, [], aprovado?0x2ecc71:0xe74c3c), i.guild, i.client)).catch(()=>null);
      if(aprovado&&c.anuncioId){const canal=await i.guild.channels.fetch(c.anuncioId).catch(()=>null);
        if(podeEnviar(canal))await enviarV2(canal, painel('✅ Recrutamento Aprovado',
          `Parabéns <@${userId}>!\nInstrutor: <@${i.user.id}>`+(c.bannerAprovadoUrl?`\n[Banner de aprovação](${c.bannerAprovadoUrl})`:''),[],0x2ecc71));}
      return true;
    }
    if(!donoAdmin(i)){await responder(i,'❌ Apenas administradores podem configurar.');return true;}
    if(button){
      if(i.customId==='rec:config'){registrarPainelDoClique('recrutamento',i);await abrirConfig(i,menuConfig());return true;}
      if(i.customId==='rec:status'){await atualizar(i, status(c));return true;}
      if(i.customId==='rec:seletores'){await atualizar(i, seletores(c));return true;}
      if(i.customId==='rec:perguntas'){await atualizar(i, menuPerguntas(c));return true;}
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
      if(i.customId==='rec:pop'){
        c.perguntas.pop(); await atualizar(i, menuPerguntas(c));
        await sincronizarPainelPrincipal(i,c); return true;
      }
      if(i.customId==='rec:escolher_rem'){
        if(!c.perguntas.length){await responder(i,'Nenhuma pergunta para remover.');return true;}
        const menu=new StringSelectMenuBuilder().setCustomId('rec:s_remover_pergunta')
          .setPlaceholder('Escolha a pergunta a remover').addOptions(c.perguntas.map((p,k)=>({value:String(k),label:`${k+1}. ${p}`.slice(0,100)})));
        await atualizar(i, { flags:MessageFlags.IsComponentsV2,components:[{type:17,components:[
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
        case 'rec:s_tempo':
          c.tempoMs=Number(value[0]); await atualizar(i, menuPerguntas(c));
          await sincronizarPainelPrincipal(i,c); return true;
        case 'rec:s_remover_pergunta':
          c.perguntas.splice(Number(value[0]),1); await atualizar(i, menuPerguntas(c));
          await sincronizarPainelPrincipal(i,c); return true;
      }
      await atualizar(i, seletores(c));
      await sincronizarPainelPrincipal(i,c); return true;
    }
    if(m&&i.customId==='rec:edit_visual'){
      c.titulo=limpar(i.fields.getTextInputValue('rec_titulo'),90);
      c.descricao=limpar(i.fields.getTextInputValue('rec_desc'),800);
      c.bannerUrl=validoUrl(i.fields.getTextInputValue('rec_banner'));
      c.bannerAprovadoUrl=validoUrl(i.fields.getTextInputValue('rec_banner_aprovado'));
      await concluirConfig(i, menuConfig());
      await sincronizarPainelPrincipal(i,c); return true;
    }
    if(m&&i.customId==='rec:adicionar'){
      if(c.perguntas.length>=20){await responder(i,'❌ Limite atingido.');return true;}
      c.perguntas.push(limpar(i.fields.getTextInputValue('rec_pergunta'),250));
      await concluirConfig(i, menuPerguntas(c));
      await sincronizarPainelPrincipal(i,c); return true;
    }
    return true;
  }catch(e){
    if(i.customId?.startsWith('rec:aprovar:') || i.customId?.startsWith('rec:reprovar:'))
      avaliando.delete(`${i.guildId}:${i.customId.split(':')[2]}`);
    await erro(i,e);return true;
  }
}
module.exports={comando,handle,handleMessage,getConfig:cfg,menuConfig,buildPanel:painelPrincipal,
  registrarPainel:(id,msg)=>{const c=cfg(id);c.painelCanal=msg.channelId;c.painelMensagem=msg.id;
    registrarPainelMensagem('recrutamento',id,msg);}};

};

// ------ sistemas/registro.js ------
__cetusModuleFactories["sistemas/registro"] = function(module, exports, require) {
'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ButtonStyle,
  StringSelectMenuBuilder, LabelBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, validoUrl, painel, bannerAnimado, aviso, campo, upload, modal, arquivos, envioArquivos,
  responder, erro, guildConfig, podeEnviar, enviarV2, comLogo, atualizar, abrirConfig, concluirConfig,
  registrarPainelMensagem, registrarPainelDoClique, sincronizarPaineis
} = require('./comum');
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

};

// ------ sistemas/ocorrencias.js ------
__cetusModuleFactories["sistemas/ocorrencias"] = function(module, exports, require) {
'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, UserSelectMenuBuilder,
  StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ContainerBuilder,
  TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const {
  donoAdmin, limpar, painel, caixa, bannerAnimado, aviso, campo, upload, modal, arquivos, envioArquivos,
  responder, erro, guildConfig, podeEnviar, enviarV2, comLogo, atualizar, abrirConfig,
  registrarPainelMensagem, registrarPainelDoClique, sincronizarPaineis
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

const TIPOS_BO = { prisao: { titulo: 'Prisão B.O.', emoji: '🚓', cor: 0xc0392b }, apreensao: { titulo: 'Apreensão B.O.', emoji: '🚔', cor: 0x2f6fed }, multa: { titulo: 'Multa B.O.', emoji: '💰', cor: 0xf39c12 } };

function cabecalho(i) {
  const resultado = caixa('🚔 | Boletim de Ocorrência',
    'Sistema de registro e gerenciamento de ocorrências policiais.\n\nUse os botões abaixo para registrar um novo B.O. ou consultar os seus registros.',
    0xc0392b,
    [
      [['bo:novo:prisao', 'Prisão', ButtonStyle.Danger, '🚓'], ['bo:novo:apreensao', 'Apreensão', ButtonStyle.Secondary, '🚔'], ['bo:novo:multa', 'Multa', ButtonStyle.Secondary, '💰']],
      [['bo:consultar', 'Consultar', ButtonStyle.Secondary, '🔎'], ['bo:minhas', 'Minhas', ButtonStyle.Secondary, '📁'], ['bo:config', 'Configurações', ButtonStyle.Secondary, '⚙️']]
    ],
    ['### 📝 Registrar ocorrência\nSelecione o tipo de boletim e preencha o formulário em modal V2. Você também pode marcar os policiais envolvidos e anexar até **10 imagens ou vídeos**.',
     '### ℹ️ Observações\n• Somente membros com o cargo configurado podem registrar ocorrências.\n• Consulta e edição ficam disponíveis até o bot reiniciar (versão sem banco de dados).']
  );
  return bannerAnimado(resultado, 'boletim');
}

function painelConfig(c) {
  return painel('⚙️ │ Configurar BOs',
    `**Canal de publicação:** ${c.canalId ? `<#${c.canalId}>` : '❌ Não configurado'}\n` +
    `**Cargo da corporação:** ${c.cargoId ? `<@&${c.cargoId}>` : '❌ Não configurado'}\n\n` +
    'Estas escolhas são aplicadas imediatamente e esta janela é atualizada ao navegar. Sem banco de dados nesta versão de testes.',
    [[botao('bo:config_canal', 'Definir canal'), botao('bo:config_cargo', 'Definir cargo')],
     [['diag:abrir:bo','Diagnóstico',ButtonStyle.Secondary,'🩺']]], 0x8e44ad,
    ['### Permissões\nApenas administradores alteram estas configurações.']);
}
function modalBO(bo = null, tipo = 'prisao') {
  const usuario = new UserSelectMenuBuilder().setCustomId('bo_policiais')
    .setMinValues(0).setMaxValues(10).setRequired(false);
  if (bo?.policiais?.length) usuario.setDefaultUsers(...bo.policiais);
  const tipoFinal = bo?.tipo || tipo;
  const info = TIPOS_BO[tipoFinal] || TIPOS_BO.prisao;
  return modal(bo ? `bo:editar:${bo.codigo}` : `bo:criar:${tipoFinal}`,
    bo ? `Editar ${bo.codigo}` : `Registrar ${info.titulo}`, [
      campo('bo_id', 'Acusado / ID no jogo', { value: bo?.personagemId, max: 80, placeholder: 'Ex.: 1234' }),
      campo('bo_local', 'Artigo / local / natureza', { value: bo?.local, max: 150, placeholder: 'Ex.: Art. 04/2025 • Centro' }),
      campo('bo_relato', 'Descrição da ocorrência', { value: bo?.relato, max: 1800, paragraph: true }),
      new (require('discord.js').LabelBuilder)().setLabel('Policiais envolvidos (opcional)').setUserSelectMenuComponent(usuario),
      ...(!bo ? [upload('bo_anexos', 'Evidências: fotos e vídeos (até 10)', 10)] : [])
    ]);
}
function registroDaInteracao(i, tipo = 'prisao') {
  const policiais = [...(i.fields.getSelectedUsers('bo_policiais', false)?.keys() || [])];
  return {
    tipo,
    personagemId: limpar(i.fields.getTextInputValue('bo_id'), 80),
    local: limpar(i.fields.getTextInputValue('bo_local'), 150),
    relato: limpar(i.fields.getTextInputValue('bo_relato'), 1800),
    policiais
  };
}
function corpoBO(b) {
  const mencoes = [...new Set([b.autorId, ...b.policiais])].map(id => `<@${id}>`).join(' ');
  const info = TIPOS_BO[b.tipo] || TIPOS_BO.prisao;
  return (
    `# ${info.emoji} | ${info.titulo} ${b.codigo}

` +
    `### 👤 Envolvido
` +
    `**Acusado (ID no jogo):** ${b.personagemId}

` +
    `### 📋 Ocorrência
` +
    `**Artigo / local / natureza:** ${b.local}
` +
    `**Policiais envolvidos:** ${mencoes || 'Nenhum informado'}

` +
    `**Descrição:**
${b.relato}

` +
    `### 👮 Registro
` +
    `**Responsável:** <@${b.autorId}>
` +
    `**Registrado em:** <t:${Math.floor(b.criadoEm / 1000)}:f>
` +
    (b.editadoEm ? `**Última edição:** <t:${Math.floor(b.editadoEm / 1000)}:f>
` : '') +
    `**Número:** ${b.codigo}`
  );
}
function gerarPublicacao(b, listaNomes = []) {
  const container = new ContainerBuilder().setAccentColor((TIPOS_BO[b.tipo] || TIPOS_BO.prisao).cor)
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
  const card = caixa('📁 Minhas Ocorrências', 'Selecione um boletim seu para editar. O conteúdo será atualizado na mensagem original.', 0x8e44ad, [], [{ type: 'actionrow', value: new ActionRowBuilder().addComponents(lista) }]);
  card.flags = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;
  return i.reply(comLogo(card, i.guild, i.client));
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
      const msg = await enviarV2(i.channel, cabecalho(i));
      registrarPainelMensagem('boletim', i.guildId, msg);
      await responder(i, `✅ Painel enviado: ${msg.url}`);
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
      registrarPainelDoClique('boletim',i);
      await abrirConfig(i, painelConfig(cfg(i.guildId))); return true;
    }
    if (isBtn && ['bo:config_canal','bo:config_cargo'].includes(i.customId)) {
      if (!donoAdmin(i)) { await responder(i, '❌ Sem permissão.'); return true; }
      const isCanal = i.customId.endsWith('canal');
      const s = isCanal ? { type: 8, custom_id: 'bo:selecionar_canal', channel_types: [0], placeholder: 'Selecione o canal dos BOs' }
        : { type: 6, custom_id: 'bo:selecionar_cargo', placeholder: 'Selecione o cargo policial' };
      await atualizar(i, { flags: MessageFlags.IsComponentsV2, components: [{type:17,components:[
        {type:10,content: isCanal ? '# Selecione o canal de publicação' : '# Selecione o cargo da corporação'},
        {type:1,components:[s]},
        {type:14,divider:true,spacing:1},
        {type:1,components:[{type:2,style:2,custom_id:'bo:config',label:'↩️ Voltar'}]}
      ]}] }); return true;
    }
    if (isSelect && ['bo:selecionar_canal','bo:selecionar_cargo'].includes(i.customId)) {
      if (!donoAdmin(i)) { await responder(i, '❌ Sem permissão.'); return true; }
      const c = cfg(i.guildId);
      if (i.customId === 'bo:selecionar_canal') c.canalId = i.values[0];
      else c.cargoId = i.values[0];
      await atualizar(i, painelConfig(c));
      await sincronizarPaineis('boletim', i.guild, i.client, () => cabecalho(i)); return true;
    }
    if (isBtn && ['bo:novo:prisao', 'bo:novo:apreensao', 'bo:novo:multa'].includes(i.customId)) {
      if (!(await autorizado(i))) return true;
      const tipo = i.customId.split(':')[2] || 'prisao';
      await i.showModal(modalBO(null, tipo)); return true;
    }
    if (isBtn && i.customId === 'bo:consultar') {
      if (!(await autorizado(i))) return true;
      await i.showModal(modal('bo:consulta', 'Consultar boletins', [
        campo('bo_consulta_id', 'ID do personagem no jogo', { max: 80, placeholder: 'Ex.: 1234' })
      ])); return true;
    }
    if (isModal && i.customId === 'bo:consulta') {
      if (!(await autorizado(i))) return true;
      const id = i.fields.getTextInputValue('bo_consulta_id').trim().toLowerCase();
      const resultados = [...boletins.values()].filter(b => b.guildId === i.guildId && b.personagemId.toLowerCase() === id).slice(-15);
      await responder(i, resultados.length ? resultados.map(b => `• **${b.codigo}** — ${b.local}\n${b.url}`).join('\n\n') :
        'ℹ️ Nenhum boletim encontrado para esse ID nesta sessão do bot.');
      return true;
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
    if (isModal && (i.customId.startsWith('bo:criar:') || i.customId.startsWith('bo:editar:'))) {
      if (!(await autorizado(i))) return true;
      const editando = i.customId.startsWith('bo:editar:');
      const codigo = editando ? i.customId.slice('bo:editar:'.length) : null;
      const antigo = editando ? boletins.get(codigo) : null;
      if (editando && (!antigo || antigo.guildId !== i.guildId || antigo.autorId !== i.user.id)) {
        await responder(i, '❌ Apenas o autor pode editar este BO.'); return true;
      }
      const tipo = editando ? (antigo?.tipo || 'prisao') : (i.customId.split(':')[2] || 'prisao');
      const dados = registroDaInteracao(i, tipo);
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
        const b = { ...dados, codigo: `B.O. #${contador}`, guildId: i.guildId,
          autorId: i.user.id, criadoEm: Date.now(), editadoEm: null, canalId: canal.id };
        const files = envioArquivos(fotos);
        const payload = gerarPublicacao(b, files.map(f => f.name));
        const msg = await enviarV2(canal, { ...payload, ...(files.length ? { files } : {}) });
        b.mensagemId = msg.id; b.url = msg.url; b.arquivos = files.map(f => f.name);
        boletins.set(b.codigo, b);
        await responder(i, `✅ **${b.codigo}** publicado: ${msg.url}`);
      } else {
        const msg = await canal.messages.fetch(antigo.mensagemId);
        const novo = { ...antigo, ...dados, editadoEm: Date.now() };
        // Nenhum campo attachments -> Discord mantém todos os arquivos anexados.
        await msg.edit({ ...comLogo(gerarPublicacao(novo, antigo.arquivos), i.guild, i.client),
          attachments: [...msg.attachments.values()].map(a => ({ id: a.id })) });
        boletins.set(codigo, novo);
        await responder(i, `✅ **${codigo}** editado com sucesso: ${msg.url}`);
      }
      return true;
    }
    return true;
  } catch (e) { await erro(i, e); return true; }
}
module.exports = { comandos, handle, getConfig:cfg, painelConfig, buildPanel:cabecalho,
  registrarPainel:(id,msg)=>registrarPainelMensagem('boletim',id,msg) };

};

// ------ sistemas/diagnostico.js ------
__cetusModuleFactories["sistemas/diagnostico"] = function(module, exports, require) {
'use strict';
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { painel, donoAdmin, responder, atualizar, comLogo } = require('./comum');
const recrutamento = __cetusLoad('sistemas/recrutamento');
const registro = __cetusLoad('sistemas/registro');
const boletins = __cetusLoad('sistemas/ocorrencias');

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
};

// ------ sistemas/gifs.js ------
__cetusModuleFactories["sistemas/gifs"] = function(module, exports, require) {
'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { donoAdmin, responder, painel, bannerAnimado, comLogo, registrarPainelMensagem } = require('./comum');
const recrutamento = __cetusLoad('sistemas/recrutamento');
const registro = __cetusLoad('sistemas/registro');
const boletins = __cetusLoad('sistemas/ocorrencias');

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
};

// ------ index.js ------
'use strict';
require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, Partials, REST, Routes,
  MessageFlags
} = require('discord.js');
const recrutamento = __cetusLoad('sistemas/recrutamento');
const registro = __cetusLoad('sistemas/registro');
const ocorrencias = __cetusLoad('sistemas/ocorrencias');
const diagnostico = __cetusLoad('sistemas/diagnostico');
const gifs = __cetusLoad('sistemas/gifs');
const modulos = [gifs, diagnostico, ocorrencias, registro, recrutamento];
const { aviso, comLogo, painel, responder, donoAdmin } = __cetusLoad('sistemas/comum');
const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
  console.error('❌ DISCORD_TOKEN não definido. Configure no .env ou na hospedagem.');
  process.exit(1);
}
process.on('unhandledRejection', err => console.error('⚠️ Promise rejeitada:', err));
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});
client.on('error', e => console.error('Erro do cliente Discord:', e));
client.once(Events.ClientReady, async ready => {
  console.log(`🤖 CETUS V2.7: ${ready.user.tag} | GIFs disponíveis`);
  const cmds = [...ocorrencias.comandos, registro.comando, recrutamento.comando, diagnostico.comando, ...gifs.comandos].map(c=>c.toJSON());
  const rest = new REST({version:'10'}).setToken(token);
  const guildId = process.env.GUILD_ID?.trim();
  const appId = process.env.CLIENT_ID?.trim() || ready.user.id;
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(appId, guildId), {body:cmds});
      console.log('✅ Comandos de teste cadastrados no servidor:', guildId);
    } else {
      await rest.put(Routes.applicationCommands(appId), {body:cmds});
      console.log('✅ Comandos globais cadastrados (podem demorar para aparecer).');
    }
  } catch(e) {
    console.error('❌ Falha ao registrar os comandos:', e);
  }
});
client.on(Events.InteractionCreate, async i => {
  try {
    if (!i.inGuild()) return;
    for(const modulo of modulos) {
      if(await modulo.handle(i)) return;
    }
  } catch(e) {
    console.error('Erro geral em InteractionCreate:', e);
    if (!i.replied && !i.deferred) {
      await i.reply(comLogo({ ...aviso('❌ Erro inesperado. Consulte o console.'), flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 }, i.guild, i.client)).catch(()=>null);
    }
  }
});
client.on(Events.MessageCreate, async msg => {
  try { await recrutamento.handleMessage(msg); }
  catch(e) { console.error('Erro na mensagem de recrutamento:', e); }
});
client.login(token).catch(e => { console.error('❌ Login falhou:',e); process.exit(1); });
