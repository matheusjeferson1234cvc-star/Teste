const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags
} = require('discord.js');
require('dotenv').config();

// ==========================================
// TRATAMENTO GLOBAL DE ERROS (ANTI-CRASH)
// ==========================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [ANTI-CRASH] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err, origin) => {
  console.error(`⚠️ [ANTI-CRASH] Uncaught Exception: ${err}\nOrigem:${origin}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.on('error', (err) => {
  console.error('⚠️ [DISCORD ERROR]', err);
});

// ==========================================
// CACHES E CONFIGURAÇÕES DO SISTEMA
// ==========================================

// Configurações do Recrutamento
const configRecrutamento = {
  categoriaId: null,
  relatorioChannelId: null,
  anunciosChannelId: null,
  cargosAprovar: [],
  cargosRemover: [],
  cargoRecrutador: null,
  tempoPerguntaMs: 180000,
  tempoPerguntaTexto: '3 minutos',
  perguntas: [],
  painelTitulo: '📋 │ Central de Recrutamento',
  painelDescricao: 'Bem-vindo ao **Sistema Oficial de Recrutamento**.\nSe deseja ingressar na organização, clique no botão abaixo e preencha o formulário.',
  painelBannerUrl: null,
  bannerAprovadoUrl: 'https://i.imgur.com/gZ3Y9x2.png',
  painelCorHex: 0x2ecc71,
  painelCorNome: 'Verde',
  painelChannelId: null,
  painelMessageId: null
};

// Configurações do Registro
const configRegistro = {
  categoriaId: null,
  logChannelId: null,
  cargosAtribuir: [],
  cargosRemover: [],
  cargoResponsavel: null,
  tagNome: '',
  painelTitulo: '👤 │ Central de Registro',
  painelDescricao: 'Utilize este painel para realizar seu **registro oficial** na organização.\n\nClique no botão abaixo para abrir seu ticket privado de registro.',
  painelBannerUrl: null,
  painelCorHex: 0x2ecc71,
  painelChannelId: null,
  painelMessageId: null
};

const sessoesCandidatos = new Map();
const sessoesRegistroTicket = new Map();

function isDonoOuAdmin(interaction) {
  if (!interaction.guild) return false;
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const isAdmin = interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
  return isOwner || isAdmin;
}

// ==========================================
// MÓDULO 1: RECRUTAMENTO (CONTAINERS V2)
// ==========================================

function gerarPayloadPainelRecrutamentoV2(guild) {
  const logoUrl = guild && guild.iconURL({ extension: 'png', size: 256 }) ? guild.iconURL({ extension: 'png', size: 256 }) : null;

  const textoConteudo = 
    `# ${configRecrutamento.painelTitulo}\n\n` +
    `${configRecrutamento.painelDescricao}\n\n` +
    `### 🛡️ Etapas do Processo\n` +
    `• 📝 Preenchimento do formulário\n` +
    `• ⏱️ Você terá **${configRecrutamento.tempoPerguntaTexto}** para responder cada pergunta\n` +
    `• 🔍 Análise da candidatura\n` +
    `• 🎶🎤 Entrevista com a equipe\n` +
    `• ✅ Resultado final`;

  const containerComponents = [];

  if (configRecrutamento.painelBannerUrl) {
    containerComponents.push({
      type: 12,
      items: [{ media: { url: configRecrutamento.painelBannerUrl } }]
    });
  }

  if (logoUrl) {
    containerComponents.push({
      type: 9,
      components: [{ type: 10, content: textoConteudo }],
      accessory: { type: 11, media: { url: logoUrl } }
    });
  } else {
    containerComponents.push({ type: 10, content: textoConteudo });
  }

  containerComponents.push(
    { type: 14, divider: true, spacing: 1 },
    {
      type: 1,
      components: [
        { type: 2, style: 2, custom_id: 'iniciar_formulario', label: 'Formulário', emoji: { name: '📝' } },
        { type: 2, style: 2, custom_id: 'abrir_config_painel', emoji: { name: '⚙️' } }
      ]
    },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
  );

  return {
    components: [{ type: 17, accent_color: configRecrutamento.painelCorHex, components: containerComponents }],
    flags: MessageFlags.IsComponentsV2
  };
}

function gerarPayloadMenuConfigRecrutamentoV2(guild) {
  const logoUrl = guild && guild.iconURL({ extension: 'png', size: 256 }) ? guild.iconURL({ extension: 'png', size: 256 }) : null;

  const textoConteudo = 
    `# ⚙️ Configuração do Recrutamento\n\n` +
    `Gerencie o sistema de recrutamento através das opções abaixo.`;

  const textoExplicativo = 
    `⚙️ **Configuração** — visualize o status atual.\n` +
    `🎨 **Visual & Textos** — altere títulos, descrição e banners.\n` +
    `🛠️ **Definir configurações** — altere os canais e cargos do sistema.\n` +
    `❓ **Perguntas** — gerencie as perguntas e tempo limite.`;

  const containerComponents = [];

  if (logoUrl) {
    containerComponents.push({
      type: 9,
      components: [{ type: 10, content: textoConteudo }],
      accessory: { type: 11, media: { url: logoUrl } }
    });
  } else {
    containerComponents.push({ type: 10, content: textoConteudo });
  }

  containerComponents.push(
    { type: 14, divider: true, spacing: 1 },
    {
      type: 1,
      components: [
        { type: 2, style: 2, custom_id: 'menu_config_geral', label: 'Configuração', emoji: { name: '⚙️' } },
        { type: 2, style: 2, custom_id: 'menu_visual_textos', label: 'Visual & Textos', emoji: { name: '🎨' } },
        { type: 2, style: 2, custom_id: 'menu_definir_config', label: 'Definir configurações', emoji: { name: '🛠️' } },
        { type: 2, style: 2, custom_id: 'menu_gerenciar_perguntas', label: 'Perguntas', emoji: { name: '❓' } }
      ]
    },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: textoExplicativo },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
  );

  return {
    components: [{ type: 17, accent_color: 0x3498db, components: containerComponents }],
    flags: MessageFlags.IsComponentsV2
  };
}

function gerarPayloadStatusConfigRecrutamentoV2() {
  const catTexto = configRecrutamento.categoriaId ? `<#${configRecrutamento.categoriaId}>` : '❌ Não definida';
  const relTexto = configRecrutamento.relatorioChannelId ? `<#${configRecrutamento.relatorioChannelId}>` : '❌ Não definido';
  const anuTexto = configRecrutamento.anunciosChannelId ? `<#${configRecrutamento.anunciosChannelId}>` : '❌ Não definido';
  const aprTexto = configRecrutamento.cargosAprovar.length ? configRecrutamento.cargosAprovar.map(c => `<@&${c}>`).join(', ') : '❌ Não definido';
  const remTexto = configRecrutamento.cargosRemover.length ? configRecrutamento.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ Nenhum cargo configurado';
  const recTexto = configRecrutamento.cargoRecrutador ? `<@&${configRecrutamento.cargoRecrutador}>` : '❌ Não definido';

  const textoConteudo = 
    `# ⚙️ Status Atual das Configurações\n\n` +
    `📁 **Categoria:** ${catTexto}\n` +
    `📡 **Canal de relatórios:** ${relTexto}\n` +
    `📢 **Canal de anúncios:** ${anuTexto}\n` +
    `👮 **Cargo recrutador:** ${recTexto}\n` +
    `✅ **Cargos ao aprovar:** ${aprTexto}\n` +
    `🗑️ **Cargos a remover:** ${remTexto}\n` +
    `❓ **Perguntas cadastradas:** \`${configRecrutamento.perguntas.length}/20\`\n` +
    `⏱️ **Tempo por pergunta:** \`${configRecrutamento.tempoPerguntaTexto}\``;

  return {
    components: [
      {
        type: 17,
        accent_color: 0x3498db,
        components: [
          { type: 10, content: textoConteudo },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 2, custom_id: 'menu_navegacao_principal', label: 'Voltar', emoji: { name: '↩️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
        ]
      }
    ],
    flags: MessageFlags.IsComponentsV2
  };
}

function gerarPayloadVisualTextosRecrutamentoV2() {
  const bannerInfo = configRecrutamento.painelBannerUrl ? `[Clique aqui para ver](${configRecrutamento.painelBannerUrl})` : '❌ Não configurado';
  const bannerAprovInfo = configRecrutamento.bannerAprovadoUrl ? `[Clique aqui para ver](${configRecrutamento.bannerAprovadoUrl})` : '❌ Não configurado';

  const textoConteudo = 
    `# 🎨 Configurações de Visual & Textos\n\n` +
    `📌 **Título Atual:** \`${configRecrutamento.painelTitulo}\`\n` +
    `🎨 **Cor da Borda:** \`${configRecrutamento.painelCorNome}\`\n` +
    `🖼️ **Banner do Painel:** ${bannerInfo}\n` +
    `🖼️ **Banner de Aprovação:** ${bannerAprovInfo}`;

  return {
    components: [
      {
        type: 17,
        accent_color: 0x3498db,
        components: [
          { type: 10, content: textoConteudo },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 1, custom_id: 'btn_editar_painel', label: 'Editar Título & Descrição', emoji: { name: '✏️' } },
              { type: 2, style: 3, custom_id: 'btn_editar_banner_aprovacao', label: 'Banner de Aprovação', emoji: { name: '🖼️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 2, custom_id: 'menu_navegacao_principal', label: 'Voltar', emoji: { name: '↩️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
        ]
      }
    ],
    flags: MessageFlags.IsComponentsV2
  };
}

function gerarPayloadGerenciarPerguntasRecrutamentoV2() {
  const listaPerguntas = configRecrutamento.perguntas.length > 0 
    ? configRecrutamento.perguntas.map((p, i) => `**${i + 1}.**${p}`).join('\n') 
    : '*Nenhuma pergunta cadastrada.*';

  const textoConteudo = 
    `# ❓ Gerenciar Perguntas & Tempo\n\n` +
    `⏱️ **Tempo Atual por Pergunta:** \`${configRecrutamento.tempoPerguntaTexto}\`\n` +
    `📋 **Perguntas Cadastradas (${configRecrutamento.perguntas.length}/20):**\n${listaPerguntas}`;

  return {
    components: [
      {
        type: 17,
        accent_color: 0x3498db,
        components: [
          { type: 10, content: textoConteudo },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 3, custom_id: 'btn_add_pergunta', label: 'Adicionar', emoji: { name: '➕' } },
              { type: 2, style: 4, custom_id: 'btn_rem_pergunta', label: 'Remover Última', emoji: { name: '➖' } },
              { type: 2, style: 4, custom_id: 'btn_rem_pergunta_especifica', label: 'Remover Específica', emoji: { name: '🗑️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [{
              type: 3,
              custom_id: 'select_tempo_pergunta',
              placeholder: '⏱️ Selecione o tempo por pergunta',
              options: [
                { label: '30 Segundos', value: '30000', description: '30 segundos por pergunta' },
                { label: '1 Minuto', value: '60000', description: '1 minuto por pergunta' },
                { label: '3 Minutos (Padrão)', value: '180000', description: '3 minutos por pergunta' },
                { label: '5 Minutos', value: '300000', description: '5 minutos por pergunta' },
                { label: '10 Minutos', value: '600000', description: '10 minutos por pergunta' }
              ]
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 2, custom_id: 'menu_navegacao_principal', label: 'Voltar', emoji: { name: '↩️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
        ]
      }
    ],
    flags: MessageFlags.IsComponentsV2
  };
}

function gerarPayloadDefinirConfigRecrutamentoV2() {
  const catTexto = configRecrutamento.categoriaId ? `<#${configRecrutamento.categoriaId}>` : '❌ Não definido';
  const relTexto = configRecrutamento.relatorioChannelId ? `<#${configRecrutamento.relatorioChannelId}>` : '❌ Não definido';
  const anuTexto = configRecrutamento.anunciosChannelId ? `<#${configRecrutamento.anunciosChannelId}>` : '❌ Não definido';
  const aprTexto = configRecrutamento.cargosAprovar.length ? configRecrutamento.cargosAprovar.map(c => `<@&${c}>`).join(', ') : '❌ Não definido';
  const remTexto = configRecrutamento.cargosRemover.length ? configRecrutamento.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ Nenhum cargo configurado';
  const recTexto = configRecrutamento.cargoRecrutador ? `<@&${configRecrutamento.cargoRecrutador}>` : '❌ Não definido';

  return {
    components: [
      {
        type: 17,
        accent_color: 0x3498db,
        components: [
          { type: 10, content: `📁 **Categoria dos recrutamentos**\n${catTexto}` },
          {
            type: 1,
            components: [{
              type: 8,
              custom_id: 'select_categoria',
              placeholder: '📁 Selecione a categoria',
              channel_types: [ChannelType.GuildCategory]
            }]
          },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: `📄 **Canal de relatórios**\n${relTexto}` },
          {
            type: 1,
            components: [{
              type: 8,
              custom_id: 'select_canal_relatorios',
              placeholder: '📄 Selecione o canal de relatórios',
              channel_types: [ChannelType.GuildText]
            }]
          },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: `📢 **Canal de anúncios**\n${anuTexto}` },
          {
            type: 1,
            components: [{
              type: 8,
              custom_id: 'select_canal_anuncios',
              placeholder: '📢 Selecione o canal de anúncios',
              channel_types: [ChannelType.GuildText]
            }]
          },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: `🎖️ **Cargo de aprovado**\n${aprTexto}` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_cargos_aprovar',
              placeholder: '🎖️ Selecione os cargos de aprovado',
              min_values: 0,
              max_values: 5
            }]
          },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: `🗑️ **Cargos removidos ao aprovar**\n${remTexto}` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_cargos_remover',
              placeholder: '🗑️ Selecione os cargos a remover',
              min_values: 0,
              max_values: 5
            }]
          },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: `🛡️ **Cargo de recrutador**\n${recTexto}` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_cargo_recrutador',
              placeholder: '🛡️ Selecione o cargo de recrutador'
            }]
          },
          { type: 14, divider: true, spacing: 1 },

          {
            type: 1,
            components: [
              { type: 2, style: 2, custom_id: 'menu_navegacao_principal', label: 'Voltar', emoji: { name: '↩️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
        ]
      }
    ],
    flags: MessageFlags.IsComponentsV2
  };
}

async function sincronizarPainelRecrutamento(guild) {
  if (!configRecrutamento.painelChannelId || !configRecrutamento.painelMessageId) return;

  try {
    const canal = await client.channels.fetch(configRecrutamento.painelChannelId).catch(() => null);
    if (!canal) return;

    const mensagem = await canal.messages.fetch(configRecrutamento.painelMessageId).catch(() => null);
    if (!mensagem) return;

    const payload = gerarPayloadPainelRecrutamentoV2(guild || canal.guild);
    await mensagem.edit(payload);
  } catch (err) {
    console.error('Erro ao sincronizar painel público de recrutamento:', err);
  }
}

// CHECAGEM DE FORMULÁRIO PENDENTE NO CANAL DE RELATÓRIOS
async function temFormularioPendente(guild, userId) {
  if (!configRecrutamento.relatorioChannelId) return false;

  try {
    const canalRelatorios = await guild.channels.fetch(configRecrutamento.relatorioChannelId).catch(() => null);
    if (!canalRelatorios) return false;

    const mensagens = await canalRelatorios.messages.fetch({ limit: 50 }).catch(() => null);
    if (!mensagens) return false;

    for (const [, msg] of mensagens) {
      if (msg.author.id === client.user.id && msg.components.length > 0) {
        const temBotaoAprovar = msg.components[0]?.components?.some(b => b.customId === `aprovar_${userId}`);
        if (temBotaoAprovar) return true;
      }
    }
  } catch (err) {
    console.error('Erro ao checar formulários pendentes:', err);
  }
  return false;
}

// AVANÇO DE PERGUNTAS DO RECRUTAMENTO COM EMBEDS
async function avancarPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  if (sessao.timer) clearTimeout(sessao.timer);

  if (sessao.step === 0) {
    if (configRecrutamento.perguntas.length === 0) {
      return finalizarRecrutamento(channel, user, sessao);
    }
    sessao.step = 1;

    const embedPergunta1 = new EmbedBuilder()
      .setTitle(`📋 │ PERGUNTA 1/${configRecrutamento.perguntas.length}`)
      .setDescription(
        `> ${configRecrutamento.perguntas[0]}\n\n` +
        `⏱️ *Você tem **${configRecrutamento.tempoPerguntaTexto}** para responder no chat.*`
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embedPergunta1] });
    iniciarTimerPergunta(channelId, channel, user);
    return;
  }

  if (sessao.step < configRecrutamento.perguntas.length) {
    const proximaPergunta = configRecrutamento.perguntas[sessao.step];
    sessao.step += 1;

    const embedProxima = new EmbedBuilder()
      .setTitle(`📋 │ PERGUNTA ${sessao.step}/${configRecrutamento.perguntas.length}`)
      .setDescription(
        `> ${proximaPergunta}\n\n` +
        `⏱️ *Você tem **${configRecrutamento.tempoPerguntaTexto}** para responder no chat.*`
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embedProxima] });
    iniciarTimerPergunta(channelId, channel, user);
  } else {
    await finalizarRecrutamento(channel, user, sessao);
  }
}

function iniciarTimerPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  sessao.timer = setTimeout(async () => {
    if (!sessoesCandidatos.has(channelId)) return;

    sessoesCandidatos.delete(channelId);

    const embedExpirado = new EmbedBuilder()
      .setTitle('⏰ Recrutamento expirado')
      .setDescription(
        'Olá! Seu recrutamento foi **encerrado por inatividade**.\n\n' +
        `⏰ Você não respondeu a pergunta em até **${configRecrutamento.tempoPerguntaTexto}**.\n` +
        '🗑️ O canal do recrutamento foi fechado.\n\n' +
        'Se ainda quiser participar, utilize o painel de recrutamento e inicie um novo processo. Boa sorte! 🍀\n\n' +
        '───────────────────────\n' +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0xe74c3c);

    await user.send({ embeds: [embedExpirado] }).catch(() => null);

    const embedAvisoExpirado = new EmbedBuilder()
      .setTitle('⏰ │ RECRUTAMENTO EXPIRADO')
      .setDescription('⚠️ **Sessão expirada por inatividade!** O canal será finalizado e apagado em 5 segundos...')
      .setColor(0xe74c3c);

    await channel.send({ embeds: [embedAvisoExpirado] });

    setTimeout(() => {
      channel.delete().catch(() => null);
    }, 5000);

  }, configRecrutamento.tempoPerguntaMs);
}

async function finalizarRecrutamento(channel, user, sessao) {
  if (sessao.timer) clearTimeout(sessao.timer);

  await enviarRelatorioRecrutamento(user, sessao);
  sessoesCandidatos.delete(channel.id);

  const embedFinal = new EmbedBuilder()
    .setTitle('🎉 │ RECRUTAMENTO CONCLUÍDO')
    .setDescription(
      `Parabéns ${user}, formulário enviado para a gerência!\n\n` +
      '───────────────────────\n' +
      '🔒 *Este canal será finalizado e apagado em 5 segundos...*\n\n' +
      '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
    )
    .setColor(0x2ecc71);

  await channel.send({ embeds: [embedFinal] });

  setTimeout(() => {
    channel.delete().catch(() => null);
  }, 5000);
}

async function enviarRelatorioRecrutamento(user, sessao) {
  if (!configRecrutamento.relatorioChannelId) return;

  const canal = await client.channels.fetch(configRecrutamento.relatorioChannelId).catch(() => null);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle(`📋 Relatório de Recrutamento - ${sessao.nomeIdPersonagem}`)
    .setColor(configRecrutamento.painelCorHex)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Candidato', value: `${user} (\`${user.id}\`)`, inline: true },
      { name: '🆔 Personagem / ID', value: `\`${sessao.nomeIdPersonagem}\``, inline: true },
      { name: '‎', value: '─── **Perguntas & Respostas** ───' }
    )
    .setTimestamp();

  if (sessao.rgImageUrl) {
    embed.setImage(sessao.rgImageUrl);
  }

  sessao.respostas.forEach((r, idx) => {
    embed.addFields({
      name: `❓ P${idx + 1}:${r.pergunta}`,
      value: `> ${r.resposta || '*Sem resposta*'}`
    });
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`aprovar_${user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reprovar_${user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
  );

  const textoMencao = configRecrutamento.cargoRecrutador ? `<@&${configRecrutamento.cargoRecrutador}>` : '🔔 **Novo relatório recebido!**';

  await canal.send({ content: textoMencao, embeds: [embed], components: [row] });
}

// ==========================================
// MÓDULO 2: REGISTRO
// ==========================================

function gerarPayloadRegistroV2(guild) {
  const logoUrl = guild && guild.iconURL({ extension: 'png', size: 256 }) ? guild.iconURL({ extension: 'png', size: 256 }) : null;

  const textoConteudo = 
    `# ${configRegistro.painelTitulo}\n\n` +
    `${configRegistro.painelDescricao}\n\n` +
    `### ❓ Como funciona?\n` +
    `• 📝 Clique em **Registre-se** abaixo.\n` +
    `• 📁 Um ticket privado será aberto exclusivamente para você.\n` +
    `• 👤 Responda às perguntas e envie a foto do seu RG no chat.\n` +
    `• 🔒 Após a conclusão, seu nome e cargos serão definidos e o **ticket será fechado automaticamente**.`;

  const containerComponents = [];

  if (configRegistro.painelBannerUrl) {
    containerComponents.push({
      type: 12,
      items: [{ media: { url: configRegistro.painelBannerUrl } }]
    });
  }

  if (logoUrl) {
    containerComponents.push({
      type: 9,
      components: [{ type: 10, content: textoConteudo }],
      accessory: { type: 11, media: { url: logoUrl } }
    });
  } else {
    containerComponents.push({ type: 10, content: textoConteudo });
  }

  containerComponents.push(
    { type: 14, divider: true, spacing: 1 },
    {
      type: 1,
      components: [
        { type: 2, style: 2, custom_id: 'iniciar_ticket_registro', label: 'Registre-se', emoji: { name: '📝' } },
        { type: 2, style: 2, custom_id: 'abrir_config_registro', emoji: { name: '⚙️' } }
      ]
    },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
  );

  return {
    components: [{ type: 17, accent_color: configRegistro.painelCorHex, components: containerComponents }],
    flags: MessageFlags.IsComponentsV2
  };
}

function gerarPayloadConfigRegistroV2() {
  const catTexto = configRegistro.categoriaId ? `<#${configRegistro.categoriaId}>` : '❌ Não definida';
  const logTexto = configRegistro.logChannelId ? `<#${configRegistro.logChannelId}>` : '❌ Não definido';
  const atrTexto = configRegistro.cargosAtribuir.length ? configRegistro.cargosAtribuir.map(c => `<@&${c}>`).join(', ') : '❌ Não definido';
  const remTexto = configRegistro.cargosRemover.length ? configRegistro.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ Nenhum cargo configurado';
  const resTexto = configRegistro.cargoResponsavel ? `<@&${configRegistro.cargoResponsavel}>` : '❌ Não definido';
  const tagTexto = configRegistro.tagNome ? `\`${configRegistro.tagNome}\`` : '❌ Nenhuma TAG configurada';

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Configurações da Central de Registro')
    .setDescription(
      `Configure abaixo a categoria, canais, cargo responsável e cargos do registro.\n\n` +
      `📁 **Categoria dos Tickets:** ${catTexto}\n` +
      `📌 **Canal de LOG:** ${logTexto}\n` +
      `🛡️ **Cargo Responsável:** ${resTexto}\n` +
      `🎖️ **Cargos a Atribuir:** ${atrTexto}\n` +
      `🗑️ **Cargos a Remover:** ${remTexto}\n` +
      `🏷️ **TAG do Nome:** ${tagTexto}`
    )
    .setColor(0x3498db);

  const rowCategoria = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('select_categoria_registro')
      .setPlaceholder('📁 Selecione a categoria dos tickets')
      .setChannelTypes(ChannelType.GuildCategory)
  );

  const rowLog = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('select_log_registro')
      .setPlaceholder('📌 Selecione canal de LOG')
      .setChannelTypes(ChannelType.GuildText)
  );

  const rowResponsavel = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('select_responsavel_reg')
      .setPlaceholder('🛡️ Selecione o Cargo Responsável')
  );

  const rowAtribuir = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('select_cargos_atribuir')
      .setPlaceholder('🎖️ Selecione cargo(s) a atribuir')
      .setMinValues(0)
      .setMaxValues(5)
  );

  const rowRemover = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('select_cargos_remover_reg')
      .setPlaceholder('🗑️ Selecione cargo(s) a remover')
      .setMinValues(0)
      .setMaxValues(5)
  );

  const rowBotoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_configurar_tag_nome')
      .setLabel('Configurar TAG do Nome')
      .setEmoji('🏷️')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [rowCategoria, rowLog, rowResponsavel, rowAtribuir, rowRemover, rowBotoes]
  };
}

async function sincronizarPainelRegistro(guild) {
  if (!configRegistro.painelChannelId || !configRegistro.painelMessageId) return;

  try {
    const canal = await client.channels.fetch(configRegistro.painelChannelId).catch(() => null);
    if (!canal) return;

    const mensagem = await canal.messages.fetch(configRegistro.painelMessageId).catch(() => null);
    if (!mensagem) return;

    const payload = gerarPayloadRegistroV2(guild || canal.guild);
    await mensagem.edit(payload);
  } catch (err) {
    console.error('Erro ao sincronizar painel público de registro:', err);
  }
}

async function processarPassoRegistroTicket(channel, member) {
  const sessao = sessoesRegistroTicket.get(channel.id);
  if (!sessao) return;

  if (sessao.step === 1) {
    const embedPasso1 = new EmbedBuilder()
      .setTitle('👤 │ NOME DO PERSONAGEM')
      .setDescription(
        `Olá ${member}, responda com o **NOME** do seu personagem no chat.\n\n` +
        `📌 **Exemplo:** \`João\`\n\n` +
        '───────────────────────\n' +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embedPasso1] });

  } else if (sessao.step === 2) {
    const embedPasso2 = new EmbedBuilder()
      .setTitle('🆔 │ PASSAPORTE / ID')
      .setDescription(
        `Perfeito! Agora digite o seu **ID / Passaporte** no chat.\n\n` +
        `📌 **Exemplo:** \`1234\`\n\n` +
        '───────────────────────\n' +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embedPasso2] });

  } else if (sessao.step === 3) {
    const embedPasso3 = new EmbedBuilder()
      .setTitle('⏱️ │ TURNO DE ATUAÇÃO')
      .setDescription(
        `Informe qual o seu **Turno de Atuação** na cidade.\n\n` +
        `📌 **Exemplo:** \`Manhã\`, \`Tarde\`, \`Noite\` ou \`Madrugada\`\n\n` +
        '───────────────────────\n' +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embedPasso3] });

  } else if (sessao.step === 4) {
    const embedPasso4 = new EmbedBuilder()
      .setTitle('📸 │ FOTO DO RG')
      .setDescription(
        `Por fim, envie em anexo no chat a **FOTO do seu RG / Personagem**.\n\n` +
        `📌 **Formatos aceitos:** PNG, JPG ou WEBP.\n\n` +
        '───────────────────────\n' +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0x3498db);

    await channel.send({ embeds: [embedPasso4] });

  } else if (sessao.step === 5) {
    const nomeComId = `${sessao.nome} \vert{}${sessao.id}`;
    let novoNick = configRegistro.tagNome 
      ? `『 ${configRegistro.tagNome} 』 ${nomeComId}` 
      : nomeComId;

    let nickSucesso = true;
    if (novoNick.length <= 32) {
      await member.setNickname(novoNick).catch(() => { nickSucesso = false; });
    } else {
      await member.setNickname(nomeComId).catch(() => { nickSucesso = false; });
    }

    if (configRegistro.cargosAtribuir.length > 0) await member.roles.add(configRegistro.cargosAtribuir).catch(() => null);
    if (configRegistro.cargosRemover.length > 0) await member.roles.remove(configRegistro.cargosRemover).catch(() => null);

    if (configRegistro.logChannelId) {
      const canalLog = await client.channels.fetch(configRegistro.logChannelId).catch(() => null);
      if (canalLog) {
        const embedLog = new EmbedBuilder()
          .setTitle('📝 Novo Registro Efetuado')
          .setColor(0x2ecc71)
          .addFields(
            { name: '👤 Membro', value: `${member} (\`${member.id}\`)`, inline: true },
            { name: '🆔 Personagem / ID', value: `\`${sessao.nome}\` | \`${sessao.id}\``, inline: true },
            { name: '⏱️ Turno', value: `\`${sessao.turno}\``, inline: true },
            { name: '🏷️ Apelido Aplicado', value: nickSucesso ? `\`${novoNick}\`` : '❌ Sem permissão p/ alterar apelido', inline: false }
          )
          .setImage(sessao.fotoUrl)
          .setTimestamp();

        await canalLog.send({ embeds: [embedLog] });
      }
    }

    sessoesRegistroTicket.delete(channel.id);

    const dataAtual = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const embedConcluido = new EmbedBuilder()
      .setTitle('✅ │ REGISTRO CONCLUÍDO')
      .setDescription(
        `Parabéns ${member}, seu registro foi **realizado com sucesso**!\n\n` +
        `🏢 **Servidor:** ${channel.guild.name}\n` +
        `🆔 **Personagem / ID:** \`${sessao.nome}\` | \`${sessao.id}\`\n` +
        `🏷️ **Apelido:** \`${novoNick}\`\n\n` +
        '───────────────────────\n' +
        '🔒 *Este canal privado será encerrado e apagado em 5 segundos...*\n\n' +
        `📅 **Data:** ${dataAtual}\n\n` +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0x2ecc71);

    if (channel.guild.iconURL()) {
      embedConcluido.setThumbnail(channel.guild.iconURL({ dynamic: true }));
    }

    await channel.send({ embeds: [embedConcluido] });

    setTimeout(() => {
      channel.delete().catch(() => null);
    }, 5000);
  }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

client.once(Events.ClientReady, async (c) => {
  console.log('==================================================');
  console.log(`🤖 BOT ONLINE NA DISCLOUD: ${c.user.tag} (ID: ${c.user.id})`);

  const cleanClientId = process.env.CLIENT_ID ? process.env.CLIENT_ID.trim() : null;
  const cleanToken = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : null;

  if (!cleanClientId || !cleanToken) return;

  const commands = [
    new SlashCommandBuilder().setName('recrutamento').setDescription('Envia o painel oficial de recrutamento'),
    new SlashCommandBuilder().setName('configuracao').setDescription('Abre o painel privado de configurações do recrutamento'),
    new SlashCommandBuilder().setName('registro').setDescription('Envia o painel oficial de registro'),
    new SlashCommandBuilder().setName('configregistro').setDescription('Abre o painel privado de configurações do registro')
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(cleanToken);

  try {
    const guilds = client.guilds.cache;
    for (const [guildId] of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(cleanClientId, guildId),
        { body: commands }
      );
    }
    await rest.put(Routes.applicationCommands(cleanClientId), { body: commands });
    console.log('✅ Comandos registrados com sucesso!');
  } catch (err) {
    console.error('❌ Erro no registro dos comandos:', err.message);
  }
  console.log('==================================================');
});

// ==========================================
// INTERAÇÕES
// ==========================================

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({ content: '❌ **Acesso negado!** Apenas Administradores podem executar este comando.', flags: MessageFlags.Ephemeral });
      }

      if (interaction.commandName === 'recrutamento') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const payload = gerarPayloadPainelRecrutamentoV2(interaction.guild);
        const msg = await interaction.channel.send(payload);

        configRecrutamento.painelChannelId = msg.channel.id;
        configRecrutamento.painelMessageId = msg.id;

        return interaction.editReply({ content: '✅ Painel de Recrutamento enviado.' });
      }

      if (interaction.commandName === 'configuracao') {
        const payload = gerarPayloadMenuConfigRecrutamentoV2(interaction.guild);
        payload.flags = MessageFlags.Ephemeral;
        return interaction.reply(payload);
      }

      if (interaction.commandName === 'registro') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const payload = gerarPayloadRegistroV2(interaction.guild);
        const msg = await interaction.channel.send(payload);

        configRegistro.painelChannelId = msg.channel.id;
        configRegistro.painelMessageId = msg.id;

        return interaction.editReply({ content: '✅ Painel de Registro enviado.' });
      }

      if (interaction.commandName === 'configregistro') {
        const payload = gerarPayloadConfigRegistroV2();
        payload.flags = MessageFlags.Ephemeral;
        return interaction.reply(payload);
      }
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId === 'abrir_config_painel' || customId === 'menu_navegacao_principal') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Acesso negado.', flags: MessageFlags.Ephemeral });

        const payload = gerarPayloadMenuConfigRecrutamentoV2(interaction.guild);
        if (interaction.replied || interaction.deferred) {
          payload.flags = MessageFlags.Ephemeral;
          return interaction.followUp(payload);
        } else if (customId === 'abrir_config_painel') {
          payload.flags = MessageFlags.Ephemeral;
          return interaction.reply(payload);
        } else {
          return interaction.update(payload);
        }
      }

      if (customId === 'menu_config_geral') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });
        return interaction.update(gerarPayloadStatusConfigRecrutamentoV2());
      }

      if (customId === 'menu_visual_textos') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });
        return interaction.update(gerarPayloadVisualTextosRecrutamentoV2());
      }

      if (customId === 'menu_definir_config') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });
        return interaction.update(gerarPayloadDefinirConfigRecrutamentoV2());
      }

      if (customId === 'menu_gerenciar_perguntas') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });
        return interaction.update(gerarPayloadGerenciarPerguntasRecrutamentoV2());
      }

      if (customId === 'iniciar_formulario') {
        // CHECAGEM SE JÁ TEM FORMULÁRIO PENDENTE DE ANÁLISE
        const pendente = await temFormularioPendente(interaction.guild, interaction.user.id);
        if (pendente) {
          return interaction.reply({
            content: '⚠️ **Atenção!** Você já possui uma candidatura enviada **aguardando análise** da gerência. Por favor, aguarde o resultado antes de enviar outro formulário.',
            flags: MessageFlags.Ephemeral
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_iniciar_recrutamento')
          .setTitle('Iniciar Recrutamento');

        const inputNomeId = new TextInputBuilder()
          .setCustomId('nome_id_personagem')
          .setLabel('Informe Nome e ID do seu personagem')
          .setPlaceholder('Ex: João Silva | ID: 1234')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(inputNomeId));
        return interaction.showModal(modal);
      }

      if (customId === 'btn_editar_painel') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder()
          .setCustomId('modal_editar_painel')
          .setTitle('Personalizar Título, Descrição & Banner');

        const inputTitulo = new TextInputBuilder()
          .setCustomId('p_titulo')
          .setLabel('Título do Painel')
          .setValue(configRecrutamento.painelTitulo)
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputDesc = new TextInputBuilder()
          .setCustomId('p_desc')
          .setLabel('Descrição do Painel')
          .setValue(configRecrutamento.painelDescricao)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const inputBanner = new TextInputBuilder()
          .setCustomId('p_banner')
          .setLabel('URL Banner Painel Principal')
          .setPlaceholder('https://...')
          .setValue(configRecrutamento.painelBannerUrl || '')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputTitulo),
          new ActionRowBuilder().addComponents(inputDesc),
          new ActionRowBuilder().addComponents(inputBanner)
        );

        return interaction.showModal(modal);
      }

      if (customId === 'btn_editar_banner_aprovacao') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder()
          .setCustomId('modal_editar_banner_aprovacao')
          .setTitle('Banner de Aprovação');

        const inputAprovado = new TextInputBuilder()
          .setCustomId('p_banner_aprovado')
          .setLabel('URL Banner de APROVADO')
          .setPlaceholder('https://i.imgur.com/exemplo.png')
          .setValue(configRecrutamento.bannerAprovadoUrl || '')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(inputAprovado));
        return interaction.showModal(modal);
      }

      if (customId === 'btn_add_pergunta') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        if (configRecrutamento.perguntas.length >= 20) {
          return interaction.reply({ content: '❌ Limite de 20 perguntas atingido!', flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder().setCustomId('modal_add_pergunta').setTitle('Nova pergunta');
        const inputPergunta = new TextInputBuilder()
          .setCustomId('texto_pergunta')
          .setLabel('Pergunta')
          .setPlaceholder('Digite a pergunta do recrutamento...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(inputPergunta));
        return interaction.showModal(modal);
      }

      if (customId === 'btn_rem_pergunta') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        if (configRecrutamento.perguntas.length === 0) {
          return interaction.reply({ content: '❌ Nenhuma pergunta cadastrada.', flags: MessageFlags.Ephemeral });
        }
        configRecrutamento.perguntas.pop();
        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.update(gerarPayloadGerenciarPerguntasRecrutamentoV2());
      }

      if (customId === 'btn_rem_pergunta_especifica') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        if (configRecrutamento.perguntas.length === 0) {
          return interaction.reply({ content: '❌ Nenhuma pergunta cadastrada para remover.', flags: MessageFlags.Ephemeral });
        }

        const options = configRecrutamento.perguntas.map((p, index) => ({
          label: `Pergunta ${index + 1}`,
          description: p.length > 50 ? p.substring(0, 47) + '...' : p,
          value: index.toString()
        }));

        const payloadRemover = {
          components: [
            {
              type: 17,
              accent_color: 0xe74c3c,
              components: [
                { type: 10, content: `# 🗑️ Remover Pergunta Específica\n\nSelecione abaixo qual pergunta deseja excluir permanentemente:` },
                { type: 14, divider: true, spacing: 1 },
                {
                  type: 1,
                  components: [{
                    type: 3,
                    custom_id: 'select_remover_pergunta_especifica',
                    placeholder: '🗑️ Selecione qual pergunta deseja remover',
                    options: options
                  }]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                  type: 1,
                  components: [
                    { type: 2, style: 2, custom_id: 'menu_gerenciar_perguntas', label: 'Voltar', emoji: { name: '↩️' } }
                  ]
                }
              ]
            }
          ],
          flags: MessageFlags.IsComponentsV2
        };

        return interaction.update(payloadRemover);
      }

      if (customId.startsWith('aprovar_') || customId.startsWith('reprovar_')) {
        const hasCargoRecrutador = configRecrutamento.cargoRecrutador && interaction.member.roles.cache.has(configRecrutamento.cargoRecrutador);

        if (!isDonoOuAdmin(interaction) && !hasCargoRecrutador) {
          return interaction.reply({
            content: '❌ **Acesso negado!** Apenas o Dono, Administradores ou membros com o cargo de Recrutador podem aprovar/reprovar.',
            flags: MessageFlags.Ephemeral
          });
        }

        const [acao, userId] = customId.split('_');
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (acao === 'aprovar') {
          if (member && configRecrutamento.cargosAprovar.length > 0) await member.roles.add(configRecrutamento.cargosAprovar).catch(() => null);
          if (member && configRecrutamento.cargosRemover.length > 0) await member.roles.remove(configRecrutamento.cargosRemover).catch(() => null);

          const embedAtual = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0x2ecc71)
            .setTitle('✅ Candidatura Aprovada')
            .addFields({ name: 'Aprovado por', value: `${interaction.user}`, inline: true });

          await interaction.update({ embeds: [embedAtual], components: [] });

          if (member) {
            const embedPvAprovado = new EmbedBuilder()
              .setTitle('🎉 Recrutamento Aprovado')
              .setDescription(
                'Parabéns! Seu recrutamento foi **aprovado**.\n\n' +
                'Você foi aceito na organização.\n\n' +
                '📌 **Resultado**\n🟢 Aprovado\n\n' +
                `🏢 **Servidor**\n${interaction.guild.name}\n\n` +
                '───────────────────────\n' +
                '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
              )
              .setColor(0x2ecc71);

            member.send({ embeds: [embedPvAprovado] }).catch(() => null);
          }

          if (configRecrutamento.anunciosChannelId) {
            const canalAnuncios = await interaction.guild.channels.fetch(configRecrutamento.anunciosChannelId).catch(() => null);
            if (canalAnuncios) {
              const dataAtual = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              const embedAvisoAprovado = new EmbedBuilder()
                .setTitle('✅ │ FORMULÁRIO APROVADO')
                .setDescription(
                  `Parabéns <@${userId}>, você foi **APROVADO** no processo seletivo.\n\n` +
                  `🏢 **Servidor:** ${interaction.guild.name}\n` +
                  `👮 **Instrutor:** ${interaction.user}\n\n` +
                  '───────────────────────\n' +
                  '🎉 Seja bem-vindo à organização!\n\n' +
                  `📅 **Data:** ${dataAtual}\n\n` +
                  '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
                )
                .setColor(0x2ecc71);

              if (interaction.guild.iconURL()) {
                embedAvisoAprovado.setThumbnail(interaction.guild.iconURL({ dynamic: true }));
              }

              if (configRecrutamento.bannerAprovadoUrl) {
                embedAvisoAprovado.setImage(configRecrutamento.bannerAprovadoUrl);
              }

              await canalAnuncios.send({ embeds: [embedAvisoAprovado] });
            }
          }

        } else {
          const embedAtual = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0xe74c3c)
            .setTitle('❌ Candidatura Reprovada')
            .addFields({ name: 'Reprovado por', value: `${interaction.user}`, inline: true });

          await interaction.update({ embeds: [embedAtual], components: [] });

          if (member) {
            const embedPvReprovado = new EmbedBuilder()
              .setTitle('❌ Recrutamento Reprovado')
              .setDescription(
                'Agradecemos o envio do seu formulário.\n\n' +
                'Sua candidatura foi **reprovada** pela gerência.\n\n' +
                '📌 **Resultado**\n🔴 Reprovado\n\n' +
                `🏢 **Servidor**\n${interaction.guild.name}\n\n` +
                '───────────────────────\n' +
                '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
              )
              .setColor(0xe74c3c);

            member.send({ embeds: [embedPvReprovado] }).catch(() => null);
          }
        }
      }

      if (customId === 'abrir_config_registro') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        const payload = gerarPayloadConfigRegistroV2();
        payload.flags = MessageFlags.Ephemeral;
        return interaction.reply(payload);
      }

      if (customId === 'iniciar_ticket_registro') {
        const guild = interaction.guild;
        const user = interaction.user;

        const canalNome = `registro-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        try {
          const permissionOverwrites = [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
          ];

          if (configRegistro.cargoResponsavel) {
            permissionOverwrites.push({ id: configRegistro.cargoResponsavel, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
          }

          const canalParams = {
            name: canalNome,
            type: ChannelType.GuildText,
            permissionOverwrites
          };

          if (configRegistro.categoriaId) {
            canalParams.parent = configRegistro.categoriaId;
          }

          const canalTicket = await guild.channels.create(canalParams);

          sessoesRegistroTicket.set(canalTicket.id, {
            userId: user.id,
            step: 1,
            nome: '',
            id: '',
            turno: '',
            fotoUrl: ''
          });

          await processarPassoRegistroTicket(canalTicket, interaction.member);

          return interaction.reply({ content: `✅ Canal de registro criado: ${canalTicket}`, flags: MessageFlags.Ephemeral });
        } catch (err) {
          console.error(err);
          return interaction.reply({ content: '❌ Erro ao criar o canal de registro.', flags: MessageFlags.Ephemeral });
        }
      }

      if (customId === 'btn_configurar_tag_nome') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder()
          .setCustomId('modal_config_tag_nome')
          .setTitle('Configurar TAG do Nome');

        const inputTag = new TextInputBuilder()
          .setCustomId('input_tag_prefixo')
          .setLabel('TAG / Prefixo do Nome')
          .setPlaceholder('Ex: MEMBER')
          .setValue(configRegistro.tagNome)
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(inputTag));
        return interaction.showModal(modal);
      }
    }

    if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });
      }

      if (customId === 'select_remover_pergunta_especifica') {
        const indexRemover = parseInt(interaction.values[0], 10);
        if (!isNaN(indexRemover) && indexRemover >= 0 && indexRemover < configRecrutamento.perguntas.length) {
          configRecrutamento.perguntas.splice(indexRemover, 1);
          await sincronizarPainelRecrutamento(interaction.guild);
        }
        return interaction.update(gerarPayloadGerenciarPerguntasRecrutamentoV2());
      }

      if (customId === 'select_categoria') configRecrutamento.categoriaId = interaction.values[0];
      if (customId === 'select_canal_relatorios') configRecrutamento.relatorioChannelId = interaction.values[0];
      if (customId === 'select_canal_anuncios') configRecrutamento.anunciosChannelId = interaction.values[0];
      if (customId === 'select_cargos_aprovar') configRecrutamento.cargosAprovar = interaction.values;
      if (customId === 'select_cargos_remover') configRecrutamento.cargosRemover = interaction.values;
      if (customId === 'select_cargo_recrutador') configRecrutamento.cargoRecrutador = interaction.values[0];

      if (customId === 'select_tempo_pergunta') {
        const valorMs = parseInt(interaction.values[0], 10);
        configRecrutamento.tempoPerguntaMs = valorMs;

        const tempoMinutos = valorMs / 60000;
        if (tempoMinutos < 1) {
          configRecrutamento.tempoPerguntaTexto = `${valorMs / 1000} segundos`;
        } else if (tempoMinutos === 1) {
          configRecrutamento.tempoPerguntaTexto = '1 minuto';
        } else {
          configRecrutamento.tempoPerguntaTexto = `${tempoMinutos} minutos`;
        }

        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.update(gerarPayloadGerenciarPerguntasRecrutamentoV2());
      }

      if (customId === 'select_categoria_registro') configRegistro.categoriaId = interaction.values[0];
      if (customId === 'select_log_registro') configRegistro.logChannelId = interaction.values[0];
      if (customId === 'select_responsavel_reg') configRegistro.cargoResponsavel = interaction.values[0];
      if (customId === 'select_cargos_atribuir') configRegistro.cargosAtribuir = interaction.values;
      if (customId === 'select_cargos_remover_reg') configRegistro.cargosRemover = interaction.values;

      if (['select_categoria', 'select_canal_relatorios', 'select_canal_anuncios', 'select_cargos_aprovar', 'select_cargos_remover', 'select_cargo_recrutador'].includes(customId)) {
        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.update(gerarPayloadDefinirConfigRecrutamentoV2());
      }

      if (['select_categoria_registro', 'select_log_registro', 'select_responsavel_reg', 'select_cargos_atribuir', 'select_cargos_remover_reg'].includes(customId)) {
        await sincronizarPainelRegistro(interaction.guild);
        return interaction.update(gerarPayloadConfigRegistroV2());
      }
    }

    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId === 'modal_editar_painel') {
        configRecrutamento.painelTitulo = interaction.fields.getTextInputValue('p_titulo');
        configRecrutamento.painelDescricao = interaction.fields.getTextInputValue('p_desc');

        const bannerInput = interaction.fields.getTextInputValue('p_banner');
        configRecrutamento.painelBannerUrl = bannerInput.trim().startsWith('http') ? bannerInput.trim() : null;

        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.reply({ content: '✅ Título, Descrição e Banner do Recrutamento atualizados!', flags: MessageFlags.Ephemeral });
      }

      if (customId === 'modal_editar_banner_aprovacao') {
        const aprovadoInput = interaction.fields.getTextInputValue('p_banner_aprovado');
        if (aprovadoInput.trim().startsWith('http')) {
          configRecrutamento.bannerAprovadoUrl = aprovadoInput.trim();
        }

        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.reply({ content: '✅ Banner de aprovação atualizado!', flags: MessageFlags.Ephemeral });
      }

      if (customId === 'modal_add_pergunta') {
        const novaPergunta = interaction.fields.getTextInputValue('texto_pergunta');
        configRecrutamento.perguntas.push(novaPergunta);

        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.reply({ content: '✅ Pergunta adicionada!', flags: MessageFlags.Ephemeral });
      }

      if (customId === 'modal_iniciar_recrutamento') {
        const nomeId = interaction.fields.getTextInputValue('nome_id_personagem');
        const guild = interaction.guild;
        const user = interaction.user;

        const canalNome = `recrutamento-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        try {
          const permissionOverwrites = [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
          ];

          if (configRecrutamento.cargoRecrutador) {
            permissionOverwrites.push({ id: configRecrutamento.cargoRecrutador, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
          }

          const canalParams = {
            name: canalNome,
            type: ChannelType.GuildText,
            permissionOverwrites
          };

          if (configRecrutamento.categoriaId) {
            canalParams.parent = configRecrutamento.categoriaId;
          }

          const canalTicket = await guild.channels.create(canalParams);

          sessoesCandidatos.set(canalTicket.id, {
            userId: user.id,
            nomeIdPersonagem: nomeId,
            step: 0,
            respostas: [],
            rgImageUrl: null,
            timer: null
          });

          const embedBoasVindas = new EmbedBuilder()
            .setTitle('📋 │ FORMULÁRIO DE RECRUTAMENTO')
            .setDescription(
              `👋 Olá ${user}!\n\n` +
              `🆔 **Candidato:** \`${nomeId}\`\n\n` +
              `📸 **Envie a FOTO do seu RG** em anexo no chat para dar início às perguntas.\n\n` +
              `⏱️ *Você tem **${configRecrutamento.tempoPerguntaTexto}** para responder.*`
            )
            .setColor(0x3498db);

          await canalTicket.send({ embeds: [embedBoasVindas] });

          iniciarTimerPergunta(canalTicket.id, canalTicket, user);

          return interaction.reply({ content: `✅ Canal criado com sucesso: ${canalTicket}`, flags: MessageFlags.Ephemeral });
        } catch (err) {
          console.error(err);
          return interaction.reply({ content: '❌ Não foi possível criar o canal de recrutamento.', flags: MessageFlags.Ephemeral });
        }
      }

      if (customId === 'modal_config_tag_nome') {
        configRegistro.tagNome = interaction.fields.getTextInputValue('input_tag_prefixo').trim();
        await sincronizarPainelRegistro(interaction.guild);
        return interaction.update(gerarPayloadConfigRegistroV2());
      }
    }
  } catch (err) {
    console.error('Erro no processamento da interação:', err);
  }
});

// ==========================================
// PROCESSAMENTO DE MENSAGENS (CHAT)
// ==========================================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const sessaoCandidato = sessoesCandidatos.get(message.channel.id);
  if (sessaoCandidato && message.author.id === sessaoCandidato.userId) {
    if (sessaoCandidato.timer) clearTimeout(sessaoCandidato.timer);

    if (sessaoCandidato.step === 0) {
      const anexo = message.attachments.first();
      if (!anexo || !anexo.contentType?.startsWith('image/')) {
        const embedErroImage = new EmbedBuilder()
          .setTitle('❌ │ IMAGEM INVÁLIDA')
          .setDescription('Por favor, envie uma **imagem válida** (PNG, JPG ou WEBP) para a foto do seu RG.')
          .setColor(0xe74c3c);

        await message.reply({ embeds: [embedErroImage] });
        iniciarTimerPergunta(message.channel.id, message.channel, message.author);
        return;
      }

      sessaoCandidato.rgImageUrl = anexo.url;
      await avancarPergunta(message.channel.id, message.channel, message.author);
      return;
    }

    if (sessaoCandidato.step > 0 && sessaoCandidato.step <= configRecrutamento.perguntas.length) {
      const perguntaAtual = configRecrutamento.perguntas[sessaoCandidato.step - 1];
      sessaoCandidato.respostas.push({
        pergunta: perguntaAtual,
        resposta: message.content
      });

      await avancarPergunta(message.channel.id, message.channel, message.author);
      return;
    }
  }

  const sessaoRegistroTicket = sessoesRegistroTicket.get(message.channel.id);
  if (sessaoRegistroTicket && message.author.id === sessaoRegistroTicket.userId) {
    if (sessaoRegistroTicket.step === 1) {
      sessaoRegistroTicket.nome = message.content.trim();
      sessaoRegistroTicket.step = 2;
      await processarPassoRegistroTicket(message.channel, message.member);
      return;
    }

    if (sessaoRegistroTicket.step === 2) {
      sessaoRegistroTicket.id = message.content.trim();
      sessaoRegistroTicket.step = 3;
      await processarPassoRegistroTicket(message.channel, message.member);
      return;
    }

    if (sessaoRegistroTicket.step === 3) {
      sessaoRegistroTicket.turno = message.content.trim();
      sessaoRegistroTicket.step = 4;
      await processarPassoRegistroTicket(message.channel, message.member);
      return;
    }

    if (sessaoRegistroTicket.step === 4) {
      const anexo = message.attachments.first();
      if (!anexo || !anexo.contentType?.startsWith('image/')) {
        const embedErroImage = new EmbedBuilder()
          .setTitle('❌ │ IMAGEM INVÁLIDA')
          .setDescription('Por favor, envie uma **imagem válida** (PNG, JPG ou WEBP) para a foto do seu RG.')
          .setColor(0xe74c3c);

        await message.reply({ embeds: [embedErroImage] });
        return;
      }

      sessaoRegistroTicket.fotoUrl = anexo.url;
      sessaoRegistroTicket.step = 5;
      await processarPassoRegistroTicket(message.channel, message.member);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
