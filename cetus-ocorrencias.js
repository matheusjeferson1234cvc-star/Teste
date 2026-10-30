'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, UserSelectMenuBuilder,
  StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ContainerBuilder,
  TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, LabelBuilder, SeparatorBuilder
} = require('discord.js');
const {
  BRAND, botoes, donoAdmin, limpar, painel, caixa, bannerAnimado, aviso, campo, upload, modal, arquivos, envioArquivos,
  responder, erro, guildConfig, podeEnviar, enviarV2, comLogo, atualizar, abrirConfig,
  registrarPainelMensagem, registrarPainelDoClique, sincronizarPaineis
} = require('./cetus-comum');

const penal = require('./cetus-codigo-penal');
const boModais = require('./cetus-bo-modais');

const configuracoes = new Map();
const boletins = new Map(); // TESTE: sem banco de dados; perde índice e configurações após reiniciar.
let contador = 0;
const cfg = id => guildConfig(configuracoes, id, () => ({ canalId: null, cargoId: null, cargosTipos: { prisao:null, apreensao:null, multa:null } }));
const botao = (a, b) => [a, b, ButtonStyle.Secondary];

const comandos = [
  new SlashCommandBuilder().setName('boletim').setDescription('Envia o painel de boletins de ocorrência')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('consultar_bo').setDescription('Consulta BOs por ID, inclusive no histórico do canal')
    .addStringOption(o => o.setName('id').setDescription('ID do personagem no RP').setRequired(true))
];

const TIPOS_BO = {
  prisao: { titulo:'Prisão B.O.', nome:'Prisão', emoji:'🚓', cor:0xc0392b,
    campoDescricao:'Descrição detalhada da prisão', exemplo:'Descreva o motivo da prisão, artigos e circunstâncias...' },
  apreensao: { titulo:'Apreensão B.O.', nome:'Apreensão', emoji:'📦', cor:0x2f6fed,
    campoDescricao:'Descrição detalhada da apreensão', exemplo:'Descreva os objetos apreendidos, quantidade, local e motivo...' },
  multa: { titulo:'Multa B.O.', nome:'Multa', emoji:'💰', cor:0xf39c12,
    campoDescricao:'Descrição detalhada da multa', exemplo:'Descreva a infração, o valor da multa e as circunstâncias...' }
};

function cabecalho() {
  // Organização visual da referência: faixa vermelha, seções e botões separados.
  // Dez filhos diretos (incluindo o GIF) = um único contêiner V2.
  const c = new ContainerBuilder().setAccentColor(0xc0392b)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      '# 🚔 | Boletim de Ocorrência\n\nSistema de registro e gerenciamento de ocorrências policiais.'
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      '### 📋 Registrar ocorrência\n> Utilize uma das opções abaixo para registrar um novo B.O.\n> Cada tipo possui suas próprias permissões.'
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(botoes([
      ['bo:novo:prisao','Prisão',ButtonStyle.Danger,'🚓'],
      ['bo:novo:apreensao','Apreensão',ButtonStyle.Secondary,'🚔']
    ]))
    .addActionRowComponents(botoes([['bo:novo:multa','Multa',ButtonStyle.Secondary,'💰']]))
    .addActionRowComponents(botoes([
      ['bo:consultar','Consultar',ButtonStyle.Secondary,'🔎'],
      ['bo:catalogo','Pesquisar artigos',ButtonStyle.Secondary,'📚'],
      ['bo:config','Configurações',ButtonStyle.Secondary,'⚙️'],
      ['bo:minhas','Minhas',ButtonStyle.Secondary,'📁']
    ]))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `🚓 Boletim de Ocorrência • Sistema Policial\n${BRAND}`
    ));
  return bannerAnimado({flags:MessageFlags.IsComponentsV2, components:[c]},'boletim');
}
function painelConfig(c) {
  const cargos = c.cargosTipos || {};
  const mostrar = id => id ? `<@&${id}>` : '*Não definido (usa o cargo geral)*';
  const principal = new ContainerBuilder().setAccentColor(0xc0392b)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      '# ⚙️ | Configurações de Ocorrências\n\nDefina o canal de publicação e a equipe que pode utilizar os boletins. Todas as alterações são aplicadas ao selecionar.'
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📢 Canal de publicação\n${c.canalId ? `<#${c.canalId}>` : '❌ Não configurado'}`
    ))
    .addActionRowComponents({ type:1, components:[{type:8, custom_id:'bo:selecionar_canal',channel_types:[0],placeholder:'📢 Selecione o canal de publicação'}] })
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 🛡️ Cargo geral da corporação\n${c.cargoId ? `<@&${c.cargoId}>` : '❌ Não configurado'}`
    ))
    .addActionRowComponents({ type:1, components:[{type:6,custom_id:'bo:selecionar_cargo',placeholder:'🛡️ Selecione o cargo geral',min_values:0,max_values:1}] });
  const tipos = new ContainerBuilder().setAccentColor(0xc0392b)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      '## 🚔 | Permissões por ocorrência\n\nConfigure um cargo diferente para cada tipo. Sem cargo específico, o sistema utiliza o cargo geral.'
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  for(const [chave, nome, emoji] of [['prisao','Prisão','🚓'],['apreensao','Apreensão','📦'],['multa','Multa','💰']]) {
    tipos.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**${emoji} ${nome}:** ${mostrar(cargos[chave])}`
    )).addActionRowComponents({type:1,components:[{
      type:6,custom_id:`bo:selecionar_tipo_${chave}`,
      placeholder:`${emoji} Cargo autorizado: ${nome}`,min_values:0,max_values:1
    }]});
  }
  tipos.addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(botoes([
      ['bo:config_status','Configuração atual',ButtonStyle.Primary,'📋'],
      ['diag:abrir:bo','Diagnóstico',ButtonStyle.Secondary,'🩺']
    ]))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(BRAND));
  return {flags:MessageFlags.IsComponentsV2,components:[principal,tipos]};
}
function painelStatus(c) {
  const cargo = v => v ? `<@&${v}>` : '❌ Não configurado';
  const tipos = c.cargosTipos || {};
  return painel('📋 | Configuração atual do B.O.',
    `📢 **Canal de publicação:** ${c.canalId ? `<#${c.canalId}>` : '❌ Não configurado'}\n`+
    `🛡️ **Cargo geral:** ${cargo(c.cargoId)}\n\n`+
    `🚓 **Prisão:** ${tipos.prisao ? cargo(tipos.prisao) : 'Cargo geral'}\n`+
    `📦 **Apreensão:** ${tipos.apreensao ? cargo(tipos.apreensao) : 'Cargo geral'}\n`+
    `💰 **Multa:** ${tipos.multa ? cargo(tipos.multa) : 'Cargo geral'}`,
    [[['bo:config','Voltar',ButtonStyle.Secondary,'↩️']]],0xc0392b,
    ['ℹ️ As configurações continuam temporárias nesta versão, até conectarmos um banco de dados.']);
}
// O preenchimento usa Modal V2 (type 18 Label), sem painel intermediário de artigos.
function modalBO(bo = null, tipo = 'prisao') {
  const info = TIPOS_BO[bo?.tipo || tipo] || TIPOS_BO.prisao;
  return boModais.modalBO(bo,tipo,info);
}
function registroDaInteracao(i, tipo = 'prisao', antigo = null) {
  return {
    tipo,
    personagemId: limpar(i.fields.getTextInputValue('bo_id'),80),
    local: limpar(i.fields.getTextInputValue('bo_local'),150),
    relato: limpar(i.fields.getTextInputValue('bo_relato'),1800),
    policiais: usuariosDaEquipe(i)
  };
}
function usuariosDaEquipe(i) {
  return [...(i.fields.getSelectedUsers('bo_policiais',false)?.keys() || [])];
}
async function validarColegas(i, usuarios) {
  if (usuarios.length > 10 || new Set(usuarios).size !== usuarios.length) {
    await responder(i,'⚠️ Selecione até 10 colegas distintos.');
    return false;
  }
  // O autor já é registrado automaticamente; não precisa entrar na lista.
  const c = cfg(i.guildId);
  const autorizados = [c.cargoId,...Object.values(c.cargosTipos||{})].filter(Boolean);
  for (const id of usuarios) {
    if (id === i.user.id) continue;
    let membro;
    try { membro = await i.guild.members.fetch(id); }
    catch { await responder(i,'⚠️ Um dos colegas selecionados não está mais no servidor.'); return false; }
    if (!donoAdmin(i) && !autorizados.some(cargo=>membro.roles.cache.has(cargo))) {
      await responder(i,'❌ Escolha apenas membros autorizados da corporação.');
      return false;
    }
  }
  return true;
}
function painelAcoesBO(bo) {
  return caixa('✅ | B.O. salvo com sucesso',
    `**${bo.codigo}** — ${bo.tipo}\n\n[Ver publicação](${bo.url})\n\n`+
    '**Equipe:** os colegas escolhidos já foram registrados.\n' +
    '**Evidências:** toque em **Arquivos** para anexar fotos ou vídeos (até 10).\n\n' +
    'Use **Editar B.O.** para alterar os dados e **Equipe** para ajustar os participantes.',
    TIPOS_BO[bo.tipo]?.cor || 0xc0392b,
    [[
      [`bo:editar_btn:${bo.codigo}`,'Editar B.O.',ButtonStyle.Primary,'📝'],
      [`bo:equipe:${bo.codigo}`,'Equipe',ButtonStyle.Secondary,'👮'],
      [`bo:arquivos:${bo.codigo}`,'Arquivos',ButtonStyle.Secondary,'📁']
    ]]
  );
}
async function editarMensagemBO(i,b,adicionais=[]) {
  const canal=await i.guild.channels.fetch(b.canalId);
  if (!canal?.messages?.fetch) throw Error('Canal do relatório não encontrado.');
  const msg=await canal.messages.fetch(b.mensagemId);
  const existentes=[...(msg.attachments?.values?.()||[])];
  const nomes=[...existentes.map(x=>x.name),...adicionais.map(x=>x.name)];
  if(nomes.length>10) throw Error('Limite de 10 evidências por relatório.');
  const payload=comLogo(gerarPublicacao(b,nomes),i.guild,i.client);
  await msg.edit({...payload, ...(adicionais.length?{files:adicionais}:{}), attachments:existentes.map(x=>({id:x.id}))});
  b.arquivos=nomes;
  return msg;
}
function permissaoEdicao(i,b) {
  return b && b.guildId===i.guildId && (b.autorId===i.user.id || donoAdmin(i));
}
function gerarPublicacao(b, listaNomes = []) {
  const info = TIPOS_BO[b.tipo] || TIPOS_BO.prisao;
  const nomes = [...new Set(listaNomes)].slice(0,10);
  const mencoes = [...new Set(b.policiais || [])].map(id => `<@${id}>`).join(', ') || '*Nenhum informado*';
  const numero = limpar(b.codigo,100);
  const cabecalho = new ContainerBuilder().setAccentColor(info.cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `# ${info.emoji} | ${info.titulo}\n\n**Número do boletim:** ${numero}\n**Tipo:** ${info.nome}`
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 👤 Identificação\n**Acusado (ID no jogo):** ${b.personagemId}`
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📍 Local da ocorrência\n${b.local}`
    ));
  const calculo = penal.calcular(b.artigos||[], b.modoPena||'normal',b.quantidades||{},b.multaExtra||0);
  const textoArtigos = calculo.linhas.length ? calculo.linhas.map(a =>
    `**Art. ${a.artigo} — ${a.nome}**\n`+
    `Pena: ${a.pena} min (${b.modoPena||'normal'}) | Multa: ${a.valorMulta===null?'quantidade não informada':penal.formatarMoeda(a.valorMulta)}`+
    (a.unidade ? ` | Quantidade: ${a.quantidade||'?'} ${a.unidade}`:'')+
    (a.fianca?` | Fiança: ${penal.formatarMoeda(a.fianca)}`:'') + (a.observacao?` | Obs.: ${a.observacao}`:'')
  ).join('\n\n') : '*Nenhum artigo incluído.*';
  const quadroArtigos = new ContainerBuilder().setAccentColor(info.cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### ⚖️ Código Penal — Reduto RP\n'+textoArtigos.slice(0,3800)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 🧮 Totais calculados\n**Pena:** ${calculo.totalPena} minutos (${b.modoPena||'normal'})\n`+
      `**Multas:** ${penal.formatarMoeda(calculo.totalMulta)}\n`+
      `**Fiança:** ${penal.formatarMoeda(calculo.totalFianca)} *(se aplicável; não somada às multas)*`
    ));
  const relato = new ContainerBuilder().setAccentColor(info.cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📝 ${b.tipo === 'apreensao' ? 'Itens apreendidos e descrição' : b.tipo === 'multa' ? 'Infração e descrição' : 'Descrição da prisão'}\n${b.relato}`
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📁 Arquivos e evidências\n${nomes.length ? `**${nomes.length} arquivo(s)**: fotos e vídeos anexados abaixo.` : '*Nenhuma evidência anexada.*'}`
    ));
  if(nomes.length) {
    relato.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(...nomes.map(nome =>
      new MediaGalleryItemBuilder().setURL(`attachment://${nome}`)
    )));
  }
  const equipe = new ContainerBuilder().setAccentColor(info.cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 👮 Equipe responsável\n**Registrado por:** <@${b.autorId}>\n**Policiais envolvidos:** ${mencoes}`
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📅 Informações do registro\n**Data:** <t:${Math.floor(b.criadoEm/1000)}:f>\n`+
      (b.editadoEm ? `**Última edição:** <t:${Math.floor(b.editadoEm/1000)}:f>\n` : '') +
      `**Número:** ${numero}`
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(BRAND));
  return { flags:MessageFlags.IsComponentsV2,components:[cabecalho,quadroArtigos,relato,equipe],
    allowedMentions:{parse:[],users:[...new Set([b.autorId,...(b.policiais || [])])]}
  };
}
// Lê os Components V2 das mensagens do Discord, inclusive Section e Container.
// Assim a consulta não depende exclusivamente do Map de memória do Node.
function textoDaMensagem(message) {
  const partes = [];
  function percorrer(item) {
    const obj = item?.toJSON?.() || item;
    if (!obj || typeof obj !== 'object') return;
    if ((obj.type === 10 || obj.content) && typeof obj.content === 'string') partes.push(obj.content);
    for (const c of obj.components || []) percorrer(c);
  }
  for (const component of message.components || []) percorrer(component);
  return partes.join('\n');
}
function dadoDoBO(message) {
  const text = textoDaMensagem(message);
  if (!/(?:B\.O\.\s*#\d+|BO-\d+)/i.test(text)) return null;
  const id = text.match(/\*\*Acusado\s*\(ID no jogo\):\*\*\s*([^\n]+)/i)?.[1]?.trim()
    || text.match(/\*\*ID do cidadão \(RP\):\*\*\s*([^\n]+)/i)?.[1]?.trim();
  if (!id) return null;
  const codigo = text.match(/(?:B\.O\.\s*#\d+|BO-\d+(?:-\d+)?)/i)?.[0] || 'B.O.';
  const local = text.match(/###\s*📍\s*Local da ocorrência\s*\n([^\n]+)/i)?.[1]?.trim()
    || text.match(/\*\*Local \/ natureza:\*\*\s*([^\n]+)/i)?.[1]?.trim()
    || 'Local não informado';
  return { personagemId:id, codigo, local, url: message.url, mensagemId: message.id };
}
function normalizarConsultaId(id) { return String(id || '').trim().toLowerCase(); }
async function buscarBOsPorId(i, id, maxPaginas = 5) {
  const buscado = normalizarConsultaId(id);
  const resultados = new Map();
  // Primeiro: BOs feitos desde a última inicialização do bot.
  for (const b of boletins.values()) {
    if (b.guildId === i.guildId && normalizarConsultaId(b.personagemId) === buscado) {
      resultados.set(b.mensagemId, b);
    }
  }
  const c = cfg(i.guildId);
  if (!c.canalId) return { resultados: [...resultados.values()], historicoAcessivel:false, motivo:'Canal dos BOs não configurado.' };
  let canal;
  try { canal = await i.guild.channels.fetch(c.canalId); }
  catch { return { resultados: [...resultados.values()], historicoAcessivel:false, motivo:'Canal dos BOs não encontrado.' }; }
  if (!canal?.messages?.fetch) return { resultados: [...resultados.values()], historicoAcessivel:false, motivo:'Canal sem histórico acessível.' };
  let before;
  let acessivel = true;
  let motivo = null;
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    let mensagens;
    try { mensagens = await canal.messages.fetch({ limit:100, ...(before ? {before} : {}) }); }
    catch(e) { acessivel = false; motivo = 'Falha ao ler o histórico. Verifique a permissão Ler Histórico de Mensagens.'; break; }
    if (!mensagens?.size) break;
    for (const msg of mensagens.values()) {
      if (msg.author?.id !== i.client.user.id) continue;
      const b = dadoDoBO(msg);
      if (b && normalizarConsultaId(b.personagemId) === buscado && !resultados.has(msg.id)) {
        resultados.set(msg.id, b);
      }
    }
    const ultima = mensagens.last?.() || [...mensagens.values()].at(-1);
    if (mensagens.size < 100 || !ultima?.id) break;
    before = ultima.id;
  }
  return { resultados:[...resultados.values()].slice(-15), historicoAcessivel:acessivel, motivo };
}
async function mostrarConsulta(i, id) {
  const encontrados = await buscarBOsPorId(i, id);
  const lista = encontrados.resultados;
  const cabecalho = `🔎 **Consulta de B.O. — ID ${limpar(id,80)}**\n\n`;
  const linhas = lista.length ? lista.map(b => `• **${b.codigo}** — ${limpar(b.local,100)}\n${b.url || 'Sem link'}`).join('\n\n') : 'Nenhum boletim encontrado para esse ID.';
  const nota = !encontrados.historicoAcessivel ? `\n\n⚠️ ${encontrados.motivo}` :
    '\n\nℹ️ O histórico pesquisa até as 500 mensagens mais recentes do canal configurado.';
  await responder(i, (cabecalho + linhas + nota).slice(0,1800));
}

// Reconhece painéis antigos deste próprio bot, sem confundir com relatórios.
function ehPainelBO(msg, botId) {
  if(msg.author?.id !== botId) return false;
  const ids = new Set();
  function ler(elemento) {
    const obj = elemento?.toJSON?.() || elemento;
    if(!obj || typeof obj !== 'object') return;
    if(obj.custom_id) ids.add(obj.custom_id);
    else if(obj.customId) ids.add(obj.customId);
    for(const item of obj.components || []) ler(item);
  }
  for(const e of msg.components || []) ler(e);
  const temControles = [...ids].some(id => /^bo:(?:novo|config|consultar|minhas)/.test(id));
  return temControles && /Boletim de Ocorrência|Ocorrências/i.test(textoDaMensagem(msg));
}
async function publicarOuAtualizarPainel(i) {
  // Busca duas páginas recentes do canal atual, sem tocar em mensagens de terceiros.
  // Uma nova execução do comando /boletim atualiza o painel antigo em vez de duplicá-lo.
  let anteriores = [];
  let antes = null;
  for(let pagina=0;pagina<2;pagina++) {
    const dados = await i.channel.messages.fetch({limit:100,...(antes?{before:antes}:{})});
    if(!dados.size) break;
    anteriores.push(...dados.values());
    const ultimo = dados.last?.() || [...dados.values()].at(-1);
    if(dados.size < 100 || !ultimo?.id) break;
    antes=ultimo.id;
  }
  const paineis = anteriores.filter(m => ehPainelBO(m,i.client.user.id)).slice(0,10);
  if(paineis.length) {
    let editados=0;
    for(const msg of paineis) {
      try {
        const dados = comLogo(cabecalho(),i.guild,i.client);
        const existentes = [...msg.attachments.values()];
        const nomes = new Set(existentes.map(a=>a.name));
        if(dados.files) {
          dados.files = dados.files.filter(f => !nomes.has(f.name));
          if(!dados.files.length) delete dados.files;
        }
        dados.attachments = existentes.map(a=>({id:a.id}));
        await msg.edit(dados);
        registrarPainelMensagem('boletim',i.guildId,msg);
        editados++;
      } catch(e) { console.warn('[CETUS] Não foi possível atualizar um painel de B.O.:',e.message); }
    }
    if(editados) return {editados};
  }
  const msg = await enviarV2(i.channel,cabecalho());
  registrarPainelMensagem('boletim',i.guildId,msg);
  return {novo:msg};
}
async function autorizado(i,tipo=null) {
  if(!i.inGuild()) { await responder(i,'❌ Use no servidor do Discord.');return false; }
  const c=cfg(i.guildId);
  if(!c.canalId) {await responder(i,'⚠️ Configure primeiro o canal de publicação dos B.O.s.');return false;}
  if(donoAdmin(i)) return true;
  const membro=await i.guild.members.fetch(i.user.id);
  const cargos=c.cargosTipos || {};
  const autorizados = tipo ? [cargos[tipo] || c.cargoId] : [c.cargoId,...Object.values(cargos)];
  const existentes=autorizados.filter(Boolean);
  if(!existentes.length) {await responder(i,'⚠️ O administrador ainda precisa definir o cargo da corporação.');return false;}
  if(!existentes.some(id=>membro.roles.cache.has(id))) {
    await responder(i,'❌ Você não possui o cargo autorizado para esta ação.');return false;
  }
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
      const resultado = await publicarOuAtualizarPainel(i);
      await responder(i, resultado.editados ?
        `✅ **${resultado.editados} painel(is) existente(s) atualizado(s)** no canal, sem duplicar.` :
        `✅ Novo painel de ocorrências publicado: ${resultado.novo.url}`);
      return true;
    }
    if (isCmd && i.commandName === 'consultar_bo') {
      if (!(await autorizado(i))) return true;
      const id = i.options.getString('id').trim();
      await i.deferReply({ flags:MessageFlags.Ephemeral });
      await mostrarConsulta(i, id);
      return true;
    }
    if (isBtn && i.customId === 'bo:config') {
      if(!donoAdmin(i)) {await responder(i,'❌ Apenas administradores podem configurar.');return true;}
      registrarPainelDoClique('boletim',i);
      await i.showModal(boModais.modalConfig(cfg(i.guildId)));
      return true;
    }
    if(isModal && i.customId==='bo:config_modal') {
      if(!donoAdmin(i)) {await responder(i,'❌ Sem permissão.');return true;}
      const c=cfg(i.guildId);
      const selected=(getter,id)=>[...(getter.call(i.fields,id,false)?.keys()||[])][0]||null;
      const canal=selected(i.fields.getSelectedChannels,'bo_cfg_canal');
      if(!canal) {await responder(i,'⚠️ Selecione o canal dos relatórios.');return true;}
      c.canalId=canal;
      c.cargoId=selected(i.fields.getSelectedRoles,'bo_cfg_geral');
      for(const tipo of Object.keys(TIPOS_BO)) c.cargosTipos[tipo]=selected(i.fields.getSelectedRoles,'bo_cfg_'+tipo);
      await i.deferReply({flags:MessageFlags.Ephemeral});
      await sincronizarPaineis('boletim',i.guild,i.client,()=>cabecalho());
      await responder(i,painelStatus(c));return true;
    }
    // Compatibilidade com controles publicados antes da atualização.
    if(isBtn && i.customId==='bo:config_status') {
      if(!donoAdmin(i)) {await responder(i,'❌ Sem permissão.');return true;}
      await responder(i,painelStatus(cfg(i.guildId)));return true;
    }
    if(isBtn && ['bo:novo:prisao','bo:novo:apreensao','bo:novo:multa'].includes(i.customId)) {
      const tipo=i.customId.split(':')[2];
      if(!(await autorizado(i,tipo))) return true;
      await i.showModal(modalBO(null,tipo));return true;
    }
    if(isBtn && i.customId==='bo:catalogo') {
      if(!(await autorizado(i))) return true;
      await i.showModal(boModais.modalPesquisa());return true;
    }
    if(isModal && i.customId==='bo:codigo_modal') {
      if(!(await autorizado(i))) return true;
      const termo=limpar(i.fields.getTextInputValue('bo_termo'),60);
      const encontrados=penal.buscar(termo).slice(0,31);
      const texto=encontrados.length?encontrados.map(a=>`**Art. ${a.artigo} — ${a.nome}**\n${a.normal} min normal · ${a.reduzida} reduzida · ${a.aumentada} aumentada\nMulta: ${penal.formatarMoeda(a.multa)}${a.unidade?' por '+a.unidade:''}`).join('\n\n'):'Nenhum artigo encontrado.';
      const corpo=texto.length>3700?texto.slice(0,3700)+'\n… (pesquise mais especificamente) ':texto;
      await responder(i,caixa('📚 Código Penal — Reduto RP',
        `**Busca:** ${termo||'todos'}\n\n${corpo}\n\n**No B.O.:** separe artigos por vírgula; para quantidades use 28x10.`,
        0xc0392b,[[['bo:catalogo','Nova pesquisa',ButtonStyle.Secondary,'🔎']]]));
      return true;
    }
    // Botões antigos da seleção em painel: avisar para reabrir o B.O.
    if((isBtn||isSelect||isModal) && (/^bo:pena:/.test(i.customId) ||
      ['bo:grupo','bo:adicionar','bo:remover','bo:buscar','bo:busca_modal','bo:limpar_filtro','bo:zerar','bo:quantidades','bo:quantidades_modal','bo:preencher'].includes(i.customId))) {
      await responder(i,'ℹ️ Este painel antigo foi substituído pelo Modal V2. Clique em Prisão, Apreensão ou Multa no painel principal.');return true;
    }
    if (isBtn && i.customId === 'bo:consultar') {
      if (!(await autorizado(i))) return true;
      await i.showModal(modal('bo:consulta', 'Consultar boletins', [
        campo('bo_consulta_id', 'ID do personagem no jogo', { max: 80, placeholder: 'Ex.: 1234' })
      ])); return true;
    }
    if (isModal && i.customId === 'bo:consulta') {
      if (!(await autorizado(i))) return true;
      const id = i.fields.getTextInputValue('bo_consulta_id').trim();
      await i.deferReply({ flags:MessageFlags.Ephemeral });
      await mostrarConsulta(i, id);
      return true;
    }
    if (isBtn && i.customId === 'bo:minhas') {
      if (!(await autorizado(i))) return true;
      await menuMinhas(i); return true;
    }
    if(isSelect && i.customId==='bo:escolher') {
      if(!(await autorizado(i))) return true;
      const b=boletins.get(i.values[0]);
      if(!permissaoEdicao(i,b)) {await responder(i,'❌ Apenas o autor ou administrador pode editar.');return true;}
      await i.showModal(modalBO(b,b.tipo));return true;
    }
    if(isBtn && (i.customId.startsWith('bo:editar_btn:')||i.customId.startsWith('bo:equipe:')||i.customId.startsWith('bo:arquivos:'))) {
      const prefixo=i.customId.split(':').slice(0,2).join(':')+':';
      const b=boletins.get(i.customId.slice(prefixo.length));
      if(!permissaoEdicao(i,b)) {await responder(i,'❌ Você só pode alterar seus próprios boletins desta sessão.');return true;}
      if(!(await autorizado(i,b.tipo))) return true;
      if(prefixo==='bo:editar_btn:') await i.showModal(modalBO(b,b.tipo));
      else if(prefixo==='bo:equipe:') await i.showModal(boModais.modalEquipe(b));
      else {
        const total=b.arquivos?.length||0;
        if(total>=10) {await responder(i,'⚠️ Este boletim já possui 10 arquivos.');return true;}
        await i.showModal(boModais.modalArquivos(b,10-total));
      }
      return true;
    }
    if(isModal && i.customId.startsWith('bo:equipe_modal:')) {
      const b=boletins.get(i.customId.slice('bo:equipe_modal:'.length));
      if(!permissaoEdicao(i,b)) {await responder(i,'❌ Sem permissão de edição.');return true;}
      if(!(await autorizado(i,b.tipo))) return true;
      const usuarios=usuariosDaEquipe(i);
      if(!(await validarColegas(i,usuarios))) return true;
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const novo={...b,policiais:usuarios,editadoEm:Date.now()};
      await editarMensagemBO(i,novo);
      boletins.set(b.codigo,novo);
      await responder(i,painelAcoesBO(novo));return true;
    }
    if(isModal && i.customId.startsWith('bo:arquivos_modal:')) {
      const b=boletins.get(i.customId.slice('bo:arquivos_modal:'.length));
      if(!permissaoEdicao(i,b)) {await responder(i,'❌ Sem permissão de edição.');return true;}
      if(!(await autorizado(i,b.tipo))) return true;
      const fotos=arquivos(i,'bo_anexos',10-(b.arquivos?.length||0),false);
      if(!fotos.length) {await responder(i,'⚠️ Anexe pelo menos um arquivo.');return true;}
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const novo={...b,editadoEm:Date.now()};
      await editarMensagemBO(i,novo,envioArquivos(fotos));
      boletins.set(b.codigo,novo);
      await responder(i,painelAcoesBO(novo));return true;
    }
    if(isModal && (i.customId.startsWith('bo:criar:')||i.customId.startsWith('bo:editar:'))) {
      const editando=i.customId.startsWith('bo:editar:');
      const codigo=editando?i.customId.slice('bo:editar:'.length):null;
      const antigo=editando?boletins.get(codigo):null;
      if(editando&&!permissaoEdicao(i,antigo)) {await responder(i,'❌ Apenas o autor ou administrador pode editar este B.O. nesta sessão.');return true;}
      const tipo=editando?antigo.tipo:(i.customId.split(':')[2]||'prisao');
      if(!TIPOS_BO[tipo]) {await responder(i,'❌ Tipo de boletim inválido.');return true;}
      if(!(await autorizado(i,tipo))) return true;
      const dados=registroDaInteracao(i,tipo,antigo);
      if(!dados.personagemId||!dados.local||!dados.relato) {await responder(i,'⚠️ Preencha ID, local e descrição.');return true;}
      dados.policiais = dados.policiais.filter(id=>id!==i.user.id);
      if(!(await validarColegas(i,dados.policiais))) return true;
      const codigos=boModais.interpretarArtigos(i.fields.getTextInputValue('bo_artigos'));
      Object.assign(dados,codigos);
      const soma=penal.calcular(codigos.artigos,codigos.modoPena,codigos.quantidades,codigos.multaExtra);
      // O modal principal reserva o quinto campo para os colegas.
      // Evidências são opcionais e adicionadas pelo botão Arquivos após salvar.
      await i.deferReply({flags:MessageFlags.Ephemeral});
      const c=cfg(i.guildId);
      if(!editando) {
        const canal=await i.guild.channels.fetch(c.canalId);
        if(!podeEnviar(canal)) throw Error('Canal de relatórios não configurado ou inacessível.');
        const b={...dados,codigo:`B.O. #${Date.now()}`,guildId:i.guildId,autorId:i.user.id,
          criadoEm:Date.now(),editadoEm:null,canalId:canal.id};
        const msg=await enviarV2(canal,gerarPublicacao(b,[]));
        b.mensagemId=msg.id;b.url=msg.url;b.arquivos=[];
        boletins.set(b.codigo,b);
        await responder(i,painelAcoesBO(b));
      } else {
        const b={...antigo,...dados,editadoEm:Date.now()};
        await editarMensagemBO(i,b);
        boletins.set(codigo,b);
        await responder(i,painelAcoesBO(b));
      }
      return true;
    }
    return true;
  } catch (e) { await erro(i, e); return true; }
}
module.exports = { comandos, handle, getConfig:cfg, painelConfig, painelStatus, buildPanel:cabecalho, buildModal:modalBO, buildReport:gerarPublicacao, buscarBOsPorId, textoDaMensagem, dadoDoBO, ehPainelBO, publicarOuAtualizarPainel,
  interpretarArtigos:boModais.interpretarArtigos, registrarPainel:(id,msg)=>registrarPainelMensagem('boletim',id,msg) };

