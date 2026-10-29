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

// Um painel privado de edição por pessoa; não há segunda tela de confirmação.
const rascunhos = new Map();
const DURACAO_RASCUNHO = 30 * 60 * 1000;
const LIMITE_ARTIGOS = 20;
const chaveRascunho = i => `${i.guildId}:${i.user.id}`;
function obterRascunho(i) {
  const d = rascunhos.get(chaveRascunho(i));
  if(!d) return null;
  if(Date.now()-d.atualizado > DURACAO_RASCUNHO) {rascunhos.delete(chaveRascunho(i));return null;}
  d.atualizado = Date.now();
  return d;
}
function iniciarRascunho(i,tipo,bo=null) {
  const d={ tipo, codigo:bo?.codigo||null, artigos:[...(bo?.artigos||[])], modo:bo?.modoPena||'normal',
    quantidades:{...(bo?.quantidades||{})}, multaExtra:bo?.multaExtra||0, grupo:'todos', termo:'', atualizado:Date.now() };
  rascunhos.set(chaveRascunho(i),d);
  return d;
}
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
function desenharSeletorArtigos(d) {
  const info = TIPOS_BO[d.tipo] || TIPOS_BO.prisao;
  const calculo = penal.calcular(d.artigos, d.modo, d.quantidades, d.multaExtra);
  const grupoAtual = penal.GRUPOS.find(g=>g.id===d.grupo)?.nome || 'Todos os artigos';
  const lista = penal.buscar(d.termo,d.grupo).slice(0,25);
  const resumo = calculo.linhas.length
    ? calculo.linhas.map(a=>`• **Art. ${a.artigo}** — ${a.nome}${a.unidade ? ` (${a.quantidade||'quantidade pendente'} ${a.unidade})`:''} — ${a.pena} min · ${a.valorMulta===null?'multa pendente':penal.formatarMoeda(a.valorMulta)}`).join('\n')
    : '*Nenhum artigo selecionado por enquanto.*';
  const avisoQuant = calculo.pendentes.length
    ? `\n⚠️ Falta informar a quantidade dos artigos: ${calculo.pendentes.map(x=>'Art. '+x+'/2025').join(', ')}.` : '';
  const avisoArt04 = d.artigos.includes('04')
    ? '\n⚠️ Confira o Art. 04/2025: a pena reduzida (32 min) veio maior que a normal (20 min) na tabela informada.' : '';
  // UM único contêiner com seções separadas. Limite do Discord: 10 componentes diretos.
  const c = new ContainerBuilder().setAccentColor(info.cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `# ${info.emoji} | ${info.nome} — Reduto RP\n`+
      `### ⚖️ Código Penal e multas\n`+
      `**Categoria:** ${grupoAtual} | **Busca:** ${d.termo||'Todas'}\n`+
      'Selecione vários artigos, ajuste a pena e confira os valores abaixo. Tudo fica neste mesmo painel.'
    ));
  const grupos = new StringSelectMenuBuilder().setCustomId('bo:grupo')
    .setPlaceholder('📚 Filtrar por categoria')
    .addOptions([{label:'Todos os artigos',value:'todos'},...penal.GRUPOS.map(g=>({label:g.nome,value:g.id}))]);
  c.addActionRowComponents(new ActionRowBuilder().addComponents(grupos));
  if(lista.length) {
    const artigos = new StringSelectMenuBuilder().setCustomId('bo:adicionar')
      .setPlaceholder('➕ Selecione um ou mais artigos para adicionar')
      .setMinValues(1).setMaxValues(Math.min(20,lista.length))
      .addOptions(lista.map(a=>({label:`Art. ${a.artigo} • ${a.nome}`.slice(0,100),
        description:`${a.normal} min • ${a.unidade ? `R$ ${a.multa}/${a.unidade}` : penal.formatarMoeda(a.multa)}`.slice(0,100),value:a.codigo})));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(artigos));
  } else {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent('Nenhum artigo encontrado. Pesquise por outro número ou nome.'));
  }
  c.addActionRowComponents(botoes([
    ['bo:buscar','Pesquisar',ButtonStyle.Secondary,'🔎'],
    ['bo:limpar_filtro','Limpar busca',ButtonStyle.Secondary,'🧹'],
    ['bo:zerar','Limpar artigos',ButtonStyle.Danger,'🗑️']
  ]))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `### 📋 Artigos selecionados (${d.artigos.length}/${LIMITE_ARTIGOS})\n${resumo.slice(0,2400)}\n\n`+
    `### ⏱️ Pena ${ {normal:'normal', reduzida:'reduzida', aumentada:'aumentada'}[d.modo]}\n`+
    `**Tempo total:** ${calculo.totalPena} minutos\n**Multa total:** ${penal.formatarMoeda(calculo.totalMulta)}\n`+
    `**Fiança total:** ${penal.formatarMoeda(calculo.totalFianca)} *(não incluída na multa)*`+
    avisoQuant + avisoArt04
  ));
  if(d.artigos.length) {
    const remover = new StringSelectMenuBuilder().setCustomId('bo:remover')
      .setPlaceholder('➖ Remover artigo(s) selecionado(s)')
      .setMinValues(1).setMaxValues(Math.min(d.artigos.length,LIMITE_ARTIGOS))
      .addOptions(d.artigos.map(cod=>{
        const a=penal.POR_CODIGO.get(cod);
        return {label:`Art. ${a.artigo} • ${a.nome}`.slice(0,100),value:cod};
      }));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(remover));
  }
  c.addActionRowComponents(botoes([
    ['bo:pena:normal','Normal',d.modo==='normal'?ButtonStyle.Primary:ButtonStyle.Secondary],
    ['bo:pena:reduzida','Reduzida',d.modo==='reduzida'?ButtonStyle.Primary:ButtonStyle.Secondary],
    ['bo:pena:aumentada','Aumentada',d.modo==='aumentada'?ButtonStyle.Primary:ButtonStyle.Secondary]
  ]))
  .addActionRowComponents(botoes([
    ['bo:quantidades','Quantidades / Multa extra',ButtonStyle.Secondary,'💰'],
    ['bo:preencher','Preencher e publicar B.O.',ButtonStyle.Success,'📝']
  ]))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(BRAND));
  return {flags:MessageFlags.IsComponentsV2,components:[c]};
}
function modalQuantidade(d) {
  const porUnidade=d.artigos.map(cod=>penal.POR_CODIGO.get(cod)).filter(a=>a.unidade);
  return modal('bo:quantidades_modal','Quantidades e multa',[
    ...porUnidade.map(a=>campo(`bo_q_${a.codigo}`,`Qtd. Art. ${a.artigo} (${a.unidade})`,
      {value:String(d.quantidades[a.codigo]||1),max:6,placeholder:'Ex.: 5'})),
    campo('bo_extra','Multa extra (R$, sem centavos)',{value:String(d.multaExtra||0),max:8,placeholder:'0'})
  ]);
}
function modalBO(bo = null, tipo = 'prisao') {
  const usuario = new UserSelectMenuBuilder().setCustomId('bo_policiais')
    .setMinValues(0).setMaxValues(10).setRequired(false);
  if (bo?.policiais?.length) usuario.setDefaultUsers(...bo.policiais);
  const info = TIPOS_BO[bo?.tipo || tipo] || TIPOS_BO.prisao;
  // Cada formulário tem cinco campos, o máximo permitido pelo Discord.
  // Arquivos, local, texto e equipe são campos independentes.
  return modal(bo ? `bo:editar:${bo.codigo}` : `bo:criar:${bo?.tipo || tipo}`,
    bo ? `Editar ${bo.codigo}` : `Novo B.O.: ${info.nome}`, [
      campo('bo_id','👤 Acusado / ID do personagem', {
        value:bo?.personagemId,max:80,placeholder:'Ex.: 1234'
      }),
      campo('bo_local','📍 Local da ocorrência', {
        value:bo?.local,max:150,placeholder:'Ex.: Praça Central, Bairro Norte'
      }),
      campo('bo_relato',info.campoDescricao, {
        value:bo?.relato,max:1800,paragraph:true,placeholder:info.exemplo
      }),
      new LabelBuilder().setLabel('👮 Policiais envolvidos (opcional)').setUserSelectMenuComponent(usuario),
      upload('bo_anexos','📁 Fotos e vídeos (até 10 no B.O.)',10)
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
      if (!donoAdmin(i)) { await responder(i, '❌ Apenas administradores podem configurar.'); return true; }
      registrarPainelDoClique('boletim',i);
      await abrirConfig(i, painelConfig(cfg(i.guildId))); return true;
    }
    if(isBtn && i.customId === 'bo:config_status') {
      if(!donoAdmin(i)) {await responder(i,'❌ Apenas administradores podem consultar as configurações.');return true;}
      await atualizar(i,painelStatus(cfg(i.guildId)));return true;
    }
    if (isSelect && (['bo:selecionar_canal','bo:selecionar_cargo'].includes(i.customId)
      || i.customId.startsWith('bo:selecionar_tipo_'))) {
      if (!donoAdmin(i)) { await responder(i, '❌ Sem permissão.'); return true; }
      const c=cfg(i.guildId);
      if(i.customId === 'bo:selecionar_canal') c.canalId=i.values[0];
      else if(i.customId === 'bo:selecionar_cargo') c.cargoId=i.values[0] || null;
      else {
        const tipo=i.customId.slice('bo:selecionar_tipo_'.length);
        if(!TIPOS_BO[tipo]) {await responder(i,'❌ Tipo de ocorrência inválido.');return true;}
        c.cargosTipos[tipo]=i.values[0] || null;
      }
      await atualizar(i,painelConfig(c));
      await sincronizarPaineis('boletim',i.guild,i.client,()=>cabecalho());
      return true;
    }
    if (isBtn && ['bo:novo:prisao', 'bo:novo:apreensao', 'bo:novo:multa'].includes(i.customId)) {
      const tipo = i.customId.split(':')[2] || 'prisao';
      if (!(await autorizado(i,tipo))) return true;
      const d=iniciarRascunho(i,tipo);
      await responder(i,desenharSeletorArtigos(d));return true;
    }
    // O painel de artigos permanece numa única mensagem privada; as buscas e somas
    // atualizam a própria mensagem sem abrir uma segunda página de configuração.
    if ((isBtn || isSelect || isModal) && (
      i.customId.startsWith('bo:pena:') || ['bo:grupo','bo:adicionar','bo:remover','bo:buscar','bo:busca_modal',
        'bo:limpar_filtro','bo:zerar','bo:quantidades','bo:quantidades_modal','bo:preencher'].includes(i.customId)
    )) {
      const d=obterRascunho(i);
      if(!d) {await responder(i,'⚠️ Rascunho expirado. Clique novamente em Prisão, Apreensão ou Multa.');return true;}
      if(!(await autorizado(i,d.tipo))) return true;
      if(isBtn && i.customId==='bo:buscar') {
        await i.showModal(modal('bo:busca_modal','Pesquisar artigo do Reduto',[
          campo('bo_termo','Número ou nome do crime',{required:false,max:60,placeholder:'Ex.: 21, veículo, tráfico'})
        ]));return true;
      }
      if(isModal && i.customId==='bo:busca_modal') {
        d.termo=i.fields.getTextInputValue('bo_termo').trim();
        d.grupo='todos'; // A busca por nome ou número sempre pesquisa todas as categorias.
        // O modal foi aberto sobre o mesmo painel privado, que recebe o novo filtro.
        await atualizar(i,desenharSeletorArtigos(d));return true;
      }
      if(isSelect && i.customId==='bo:grupo') {d.grupo=i.values[0];d.termo='';}
      if(isSelect && i.customId==='bo:adicionar') {
        const permitidos=new Set(penal.buscar(d.termo,d.grupo).slice(0,25).map(a=>a.codigo));
        const novos=i.values.filter(cod=>permitidos.has(cod) && !d.artigos.includes(cod));
        if(d.artigos.length+novos.length>LIMITE_ARTIGOS) {
          await responder(i,`⚠️ São permitidos até ${LIMITE_ARTIGOS} artigos por B.O. Remova um antes de adicionar outro.`);return true;
        }
        d.artigos.push(...novos);
      }
      if(isSelect && i.customId==='bo:remover') {
        const removidos=new Set(i.values);
        d.artigos=d.artigos.filter(cod=>!removidos.has(cod));
        for(const cod of removidos) delete d.quantidades[cod];
      }
      if(isBtn && i.customId==='bo:limpar_filtro') {d.termo='';d.grupo='todos';}
      if(isBtn && i.customId==='bo:zerar') {d.artigos=[];d.quantidades={};d.multaExtra=0;}
      if(isBtn && i.customId.startsWith('bo:pena:')) {d.modo=i.customId.slice('bo:pena:'.length);}
      if(isBtn && i.customId==='bo:quantidades') {
        await i.showModal(modalQuantidade(d));return true;
      }
      if(isModal && i.customId==='bo:quantidades_modal') {
        for(const cod of d.artigos) {
          const a=penal.POR_CODIGO.get(cod);
          if(!a?.unidade) continue;
          const qtd=Number(i.fields.getTextInputValue(`bo_q_${cod}`));
          if(!Number.isSafeInteger(qtd)||qtd<1||qtd>100000) {
            await responder(i,`⚠️ Quantidade inválida para o Art. ${a.artigo}. Informe um número entre 1 e 100000.`);return true;
          }
          d.quantidades[cod]=qtd;
        }
        const extra=Number(i.fields.getTextInputValue('bo_extra'));
        if(!Number.isSafeInteger(extra)||extra<0||extra>10000000) {
          await responder(i,'⚠️ A multa extra deve ser um valor inteiro de R$ 0 a R$ 10.000.000.');return true;
        }
        d.multaExtra=extra;
        await atualizar(i,desenharSeletorArtigos(d));return true;
      }
      if(isBtn && i.customId==='bo:preencher') {
        const soma=penal.calcular(d.artigos,d.modo,d.quantidades,d.multaExtra);
        if(soma.pendentes.length) {await responder(i,'⚠️ Informe as quantidades dos artigos com multa por unidade antes de publicar.');return true;}
        const antigo=d.codigo?boletins.get(d.codigo):null;
        if(d.codigo && (!antigo || antigo.autorId!==i.user.id || antigo.guildId!==i.guildId)) {
          await responder(i,'⚠️ A edição desse B.O. não está disponível nesta sessão.');return true;
        }
        await i.showModal(modalBO(antigo,d.tipo));return true;
      }
      await atualizar(i,desenharSeletorArtigos(d));return true;
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
    if (isSelect && i.customId === 'bo:escolher') {
      if (!(await autorizado(i))) return true;
      const b = boletins.get(i.values[0]);
      if (!b || b.guildId !== i.guildId || b.autorId !== i.user.id) {
        await responder(i, '❌ Você só pode editar seus próprios boletins.'); return true;
      }
      await responder(i,desenharSeletorArtigos(iniciarRascunho(i,b.tipo,b))); return true;
    }
    if (isModal && (i.customId.startsWith('bo:criar:') || i.customId.startsWith('bo:editar:'))) {
      const editando = i.customId.startsWith('bo:editar:');
      const codigo = editando ? i.customId.slice('bo:editar:'.length) : null;
      const antigo = editando ? boletins.get(codigo) : null;
      if (editando && (!antigo || antigo.guildId !== i.guildId || antigo.autorId !== i.user.id)) {
        await responder(i, '❌ Apenas o autor pode editar este BO.'); return true;
      }
      const tipo = editando ? (antigo?.tipo || 'prisao') : (i.customId.split(':')[2] || 'prisao');
      if(!TIPOS_BO[tipo]) {await responder(i,'❌ Tipo de boletim inválido.');return true;}
      if (!(await autorizado(i,tipo))) return true;
      const dados = registroDaInteracao(i, tipo);
      const d=obterRascunho(i);
      if(!d || d.tipo!==tipo || (editando ? d.codigo!==codigo : !!d.codigo)) {
        await responder(i,'⚠️ Seu painel de artigos expirou. Reabra Prisão, Apreensão ou Multa para selecionar os artigos novamente.');return true;
      }
      const soma=penal.calcular(d.artigos,d.modo,d.quantidades,d.multaExtra);
      if(soma.pendentes.length) {await responder(i,'⚠️ Informe as quantidades antes de publicar.');return true;}
      dados.artigos=[...d.artigos];
      dados.modoPena=d.modo;
      dados.quantidades={...d.quantidades};
      dados.multaExtra=d.multaExtra;
      if(!dados.personagemId || !dados.local || !dados.relato) {
        await responder(i,'⚠️ Preencha o ID, o local e a descrição do B.O.');return true;
      }
      const fotos = arquivos(i, 'bo_anexos', 10, false);
      const arquivosAntigos = editando ? (antigo.arquivos || []) : [];
      if (arquivosAntigos.length + fotos.length > 10) {
        await responder(i, '⚠️ Limite de 10 arquivos por boletim. Para adicionar mais, é preciso remover anexos antigos antes.'); return true;
      }
      const c = cfg(i.guildId);
      for (const id of dados.policiais) {
        const m = await i.guild.members.fetch(id);
        const cargosPermitidos=[c.cargoId,...Object.values(c.cargosTipos || {})].filter(Boolean);
        if (!cargosPermitidos.some(cargoId=>m.roles.cache.has(cargoId)) && !donoAdmin(i)) {
          await responder(i, '❌ Marque apenas membros da corporação.'); return true;
        }
      }
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const canal = await i.guild.channels.fetch(editando ? antigo.canalId : c.canalId);
      if (!podeEnviar(canal)) throw new Error('Canal dos BOs não existe ou o bot não pode enviar mensagens.');
      if (!editando) {
        contador++;
        const b = { ...dados, codigo: `B.O. #${Date.now()}`, guildId: i.guildId,
          autorId: i.user.id, criadoEm: Date.now(), editadoEm: null, canalId: canal.id };
        const files = envioArquivos(fotos);
        const payload = gerarPublicacao(b, files.map(f => f.name));
        const msg = await enviarV2(canal, { ...payload, ...(files.length ? { files } : {}) });
        b.mensagemId = msg.id; b.url = msg.url; b.arquivos = files.map(f => f.name);
        boletins.set(b.codigo, b);
        rascunhos.delete(chaveRascunho(i));
        await responder(i, `✅ **${b.codigo}** publicado: ${msg.url}\n⚖️ Pena: **${soma.totalPena} min** | Multas: **${penal.formatarMoeda(soma.totalMulta)}**`);
      } else {
        const msg = await canal.messages.fetch(antigo.mensagemId);
        const adicionais = envioArquivos(fotos);
        const nomesAnexos = [...arquivosAntigos, ...adicionais.map(f => f.name)];
        const novo = { ...antigo, ...dados, editadoEm: Date.now(), arquivos: nomesAnexos };
        // Preserva os arquivos publicados antes e acrescenta os novos, sem apagá-los.
        await msg.edit({ ...comLogo(gerarPublicacao(novo, nomesAnexos), i.guild, i.client),
          ...(adicionais.length ? { files: adicionais } : {}),
          attachments: [...msg.attachments.values()].map(a => ({ id: a.id })) });
        boletins.set(codigo, novo);
        rascunhos.delete(chaveRascunho(i));
        await responder(i, `✅ **${codigo}** editado com sucesso: ${msg.url}\n⚖️ Pena: **${soma.totalPena} min** | Multas: **${penal.formatarMoeda(soma.totalMulta)}**`);
      }
      return true;
    }
    return true;
  } catch (e) { await erro(i, e); return true; }
}
module.exports = { comandos, handle, getConfig:cfg, painelConfig, painelStatus, buildPanel:cabecalho, buildModal:modalBO, buildReport:gerarPublicacao, buscarBOsPorId, textoDaMensagem, dadoDoBO, ehPainelBO, publicarOuAtualizarPainel,
  desenharSeletorArtigos, iniciarRascunho, obterRascunho, registrarPainel:(id,msg)=>registrarPainelMensagem('boletim',id,msg) };

