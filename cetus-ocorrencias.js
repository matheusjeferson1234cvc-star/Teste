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

const configuracoes = new Map();
const boletins = new Map(); // TESTE: sem banco de dados; perde índice e configurações após reiniciar.
let contador = 0;
const cfg = id => guildConfig(configuracoes, id, () => ({ canalId: null, cargoId: null }));
const botao = (a, b) => [a, b, ButtonStyle.Secondary];

const comandos = [
  new SlashCommandBuilder().setName('boletim').setDescription('Envia o painel de boletins de ocorrência')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('consultar_bo').setDescription('Consulta BOs por ID, inclusive no histórico do canal')
    .addStringOption(o => o.setName('id').setDescription('ID do personagem no RP').setRequired(true))
];

const TIPOS_BO = { prisao: { titulo: 'Prisão B.O.', emoji: '🚓', cor: 0xc0392b }, apreensao: { titulo: 'Apreensão B.O.', emoji: '🚔', cor: 0x2f6fed }, multa: { titulo: 'Multa B.O.', emoji: '💰', cor: 0xf39c12 } };

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
  // Limite de cinco campos em modal do Discord:
  // ID, local, descrição, policiais e arquivos (fotos/vídeos).
  return modal(bo ? `bo:editar:${bo.codigo}` : `bo:criar:${tipoFinal}`,
    bo ? `Editar ${bo.codigo}` : `Registrar ${info.titulo}`, [
      campo('bo_id', 'Acusado / ID do personagem', { value: bo?.personagemId, max: 80, placeholder: 'Ex.: 1234' }),
      campo('bo_local', 'Local da ocorrência', { value: bo?.local, max: 150, placeholder: 'Ex.: Praça Central / Bairro Norte' }),
      campo('bo_relato', 'Descrição detalhada da ocorrência', { value: bo?.relato, max: 1800, paragraph: true,
        placeholder: 'Relate o fato, infrações e itens apreendidos...' }),
      new LabelBuilder().setLabel('Policiais envolvidos (opcional)').setUserSelectMenuComponent(usuario),
      upload('bo_anexos', bo ? 'Adicionar arquivos (até 10 no total)' : 'Fotos e vídeos da ocorrência (até 10)', 10)
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
  const mencoes = [...new Set(b.policiais || [])].map(id => `<@${id}>`).join(', ') || 'Não informados';
  const quando = `<t:${Math.floor(b.criadoEm / 1000)}:f>`;
  const contagem = listaNomes.length;
  const c = new ContainerBuilder().setAccentColor(info.cor);
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `# ${info.emoji} | ${info.titulo} ${b.codigo}\n\n### 👤 Envolvido\n**Acusado (ID no jogo):** ${b.personagemId}`
  ));
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `### 📍 Local da ocorrência\n${b.local}`
  ));
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `### 📝 Descrição da ocorrência\n${b.relato}`
  ));
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `### 📁 Arquivos e evidências\n${contagem ? `**${contagem} arquivo(s) anexado(s).** As fotos e vídeos aparecem abaixo.` : '*Nenhum arquivo anexado.*'}`
  ));
  if (contagem) {
    c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(...listaNomes.slice(0, 10).map(nome =>
      new MediaGalleryItemBuilder().setURL(`attachment://${nome}`)
    )));
  }
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `### 👮 Registro e equipe\n`+
    `**Responsável:** <@${b.autorId}>\n`+
    `**Policiais envolvidos:** ${mencoes}\n`+
    `**Registrado em:** ${quando}\n`+
    (b.editadoEm ? `**Última edição:** <t:${Math.floor(b.editadoEm / 1000)}:f>\n` : '') +
    `**Número:** ${b.codigo}\n\n🚔 Boletim de Ocorrência • Registro Oficial`
  ));
  return {
    components: [c], flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [], users: [...new Set([b.autorId, ...(b.policiais || [])])] }
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
      const fotos = arquivos(i, 'bo_anexos', 10, false);
      const arquivosAntigos = editando ? (antigo.arquivos || []) : [];
      if (arquivosAntigos.length + fotos.length > 10) {
        await responder(i, '⚠️ Limite de 10 arquivos por boletim. Para adicionar mais, é preciso remover anexos antigos antes.'); return true;
      }
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
        const adicionais = envioArquivos(fotos);
        const nomesAnexos = [...arquivosAntigos, ...adicionais.map(f => f.name)];
        const novo = { ...antigo, ...dados, editadoEm: Date.now(), arquivos: nomesAnexos };
        // Preserva os arquivos publicados antes e acrescenta os novos, sem apagá-los.
        await msg.edit({ ...comLogo(gerarPublicacao(novo, nomesAnexos), i.guild, i.client),
          ...(adicionais.length ? { files: adicionais } : {}),
          attachments: [...msg.attachments.values()].map(a => ({ id: a.id })) });
        boletins.set(codigo, novo);
        await responder(i, `✅ **${codigo}** editado com sucesso: ${msg.url}`);
      }
      return true;
    }
    return true;
  } catch (e) { await erro(i, e); return true; }
}
module.exports = { comandos, handle, getConfig:cfg, painelConfig, buildPanel:cabecalho, buildModal:modalBO, buildReport:gerarPublicacao, buscarBOsPorId, textoDaMensagem, dadoDoBO,
  registrarPainel:(id,msg)=>registrarPainelMensagem('boletim',id,msg) };

