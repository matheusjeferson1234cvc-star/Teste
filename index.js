const {
  Client,
  GatewayIntentBits,
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
  MessageFlags,
  AttachmentBuilder
} = require('discord.js');
require('dotenv').config();

// Flag explícita do Discord para Components V2
const FLAG_V2 = MessageFlags.IsComponentsV2;

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

const configRecrutamento = {
  categoriaId: null,
  relatorioChannelId: null,
  anunciosChannelId: null,
  cargosAprovar: [],
  cargosRemover: [],
  cargoRecrutador: null,
  tempoPerguntaMs: 30000, // 30 segundos
  tempoPerguntaTexto: '30 segundos',
  tempoGeralInatividadeMs: 600000, // 10 minutos
  perguntas: [],
  painelTitulo: '📋 │ Central de Recrutamento',
  painelDescricao: 'Bem-vindo ao **Sistema Oficial de Recrutamento**.\nSe deseja ingressar na organização, clique no botão abaixo e preencha o formulário.',
  painelBannerUrl: null,
  bannerAprovadoUrl: 'https://i.imgur.com/gZ3Y9x2.png',
  painelCorHex: 0x2ecc71,
  painelChannelId: null,
  painelMessageId: null
};

const configRegistro = {
  categoriaId: null,
  logChannelId: null,
  cargosAtribuir: [],
  cargosRemover: [],
  cargoResponsavel: null,
  cargosTurnos: {
    manha: null,
    tarde: null,
    noite: null,
    madrugada: null
  },
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
    `• ⏱️ Você terá **${configRecrutamento.tempoPerguntaTexto}** por pergunta\n` +
    `• ⌛ Tempo total limite do formulário: **10 minutos**\n` +
    `• 🔍 Análise da candidatura\n` +
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
    flags: FLAG_V2
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
    flags: FLAG_V2
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
    flags: FLAG_V2
  };
}

function gerarPayloadVisualTextosRecrutamentoV2() {
  const bannerInfo = configRecrutamento.painelBannerUrl ? `[Clique aqui para ver](${configRecrutamento.painelBannerUrl})` : '❌ Não configurado';
  const bannerAprovInfo = configRecrutamento.bannerAprovadoUrl ? `[Clique aqui para ver](${configRecrutamento.bannerAprovadoUrl})` : '❌ Não configurado';

  const textoConteudo = 
    `# 🎨 Configurações de Visual & Textos\n\n` +
    `📌 **Título Atual:** \`${configRecrutamento.painelTitulo}\`\n` +
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
    flags: FLAG_V2
  };
}

function gerarPayloadGerenciarPerguntasRecrutamentoV2() {
  const listaPerguntas = configRecrutamento.perguntas.length > 0 
    ? configRecrutamento.perguntas.map((p, i) => `**${i + 1}.**${p}`).join('\n') 
    : '*Nenhuma pergunta cadastrada.*';

  const textoConteudo = 
    `# ❓ Gerenciar Perguntas & Tempo\n\n` +
    `⏱️ **Tempo Atual por Pergunta:** \`${configRecrutamento.tempoPerguntaTexto}\`\n\n` +
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
                { label: '3 Minutos', value: '180000', description: '3 minutos por pergunta' },
                { label: '5 Minutos', value: '300000', description: '5 minutos por pergunta' }
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
    flags: FLAG_V2
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
    flags: FLAG_V2
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

async function avancarPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  if (sessao.timerPergunta) clearTimeout(sessao.timerPergunta);

  if (sessao.step === 0) {
    if (configRecrutamento.perguntas.length === 0) {
      return finalizarRecrutamento(channel, user, sessao);
    }
    sessao.step = 1;

    const payloadP1 = {
      components: [{
        type: 17,
        accent_color: 0x3498db,
        components: [
          { type: 10, content: `# 📋 │ PERGUNTA 1/${configRecrutamento.perguntas.length}\n\n>${configRecrutamento.perguntas[0]}\n\n⏱️ *Você tem **${configRecrutamento.tempoPerguntaTexto}** para responder.*` }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadP1);
    iniciarTimerPergunta(channelId, channel, user);
    return;
  }

  if (sessao.step <= configRecrutamento.perguntas.length) {
    const perguntaIndex = sessao.step - 1;
    const proximaPergunta = configRecrutamento.perguntas[perguntaIndex];

    const payloadProx = {
      components: [{
        type: 17,
        accent_color: 0x3498db,
        components: [
          { type: 10, content: `# 📋 │ PERGUNTA ${sessao.step}/${configRecrutamento.perguntas.length}\n\n>${proximaPergunta}\n\n⏱️ *Você tem **${configRecrutamento.tempoPerguntaTexto}** para responder.*` }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadProx);
    iniciarTimerPergunta(channelId, channel, user);
  } else {
    await finalizarRecrutamento(channel, user, sessao);
  }
}

function iniciarTimerPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  sessao.timerPergunta = setTimeout(async () => {
    if (!sessoesCandidatos.has(channelId)) return;

    if (sessao.step === 0) {
      sessao.rgImageUrl = null;
      await channel.send({
        components: [{
          type: 17,
          accent_color: 0xe67e22,
          components: [{ type: 10, content: `⚠️ **Tempo esgotado!** Foto do RG não enviada. Pulando para as perguntas...` }]
        }],
        flags: FLAG_V2
      });
      sessao.step = 1;
      await avancarPergunta(channelId, channel, user);
      return;
    }

    if (sessao.step > 0 && sessao.step <= configRecrutamento.perguntas.length) {
      const perguntaAtual = configRecrutamento.perguntas[sessao.step - 1];
      sessao.respostas.push({
        pergunta: perguntaAtual,
        resposta: '⚠️ *Tempo esgotado / Não respondeu*'
      });

      await channel.send({
        components: [{
          type: 17,
          accent_color: 0xe67e22,
          components: [{ type: 10, content: `⚠️ **Tempo esgotado!** Pergunta não respondida. Pulando para a próxima...` }]
        }],
        flags: FLAG_V2
      });

      sessao.step += 1;
      await avancarPergunta(channelId, channel, user);
    }
  }, configRecrutamento.tempoPerguntaMs);
}

function iniciarTimerGeralInatividade(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  sessao.timerGeral = setTimeout(async () => {
    if (!sessoesCandidatos.has(channelId)) return;

    if (sessao.timerPergunta) clearTimeout(sessao.timerPergunta);
    sessoesCandidatos.delete(channelId);

    const payloadExpirado = {
      components: [{
        type: 17,
        accent_color: 0xe74c3c,
        components: [
          {
            type: 10,
            content: `# ⏰ Recrutamento expirado\n\nOlá! Seu ticket foi **encerrado por inatividade total** (limite de 10 minutos excedido).\n\n🗑️ O canal foi fechado.`
          }
        ]
      }],
      flags: FLAG_V2
    };

    await user.send(payloadExpirado).catch(() => null);

    await channel.send({
      components: [{
        type: 17,
        accent_color: 0xe74c3c,
        components: [{ type: 10, content: `# ⏰ │ RECRUTAMENTO EXPIRADO\n\n⚠️ **Limite de tempo total (10 minutos) estourado!** O canal será apagado em 5 segundos...` }]
      }],
      flags: FLAG_V2
    });

    setTimeout(() => {
      channel.delete().catch(() => null);
    }, 5000);

  }, configRecrutamento.tempoGeralInatividadeMs);
}

async function finalizarRecrutamento(channel, user, sessao) {
  if (sessao.timerPergunta) clearTimeout(sessao.timerPergunta);
  if (sessao.timerGeral) clearTimeout(sessao.timerGeral);

  await enviarRelatorioRecrutamento(user, sessao);
  sessoesCandidatos.delete(channel.id);

  const payloadFinal = {
    components: [{
      type: 17,
      accent_color: 0x2ecc71,
      components: [
        {
          type: 10,
          content: `# 🎉 │ RECRUTAMENTO CONCLUÍDO\n\nParabéns ${user}, seu formulário foi **enviado com sucesso** para a gerência!\n\n───────────────────────\n🔒 *Este canal privado será encerrado e apagado em 5 segundos...*\n\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
        }
      ]
    }],
    flags: FLAG_V2
  };

  await channel.send(payloadFinal);

  setTimeout(() => {
    channel.delete().catch(() => null);
  }, 5000);
}

async function enviarRelatorioRecrutamento(user, sessao) {
  if (!configRecrutamento.relatorioChannelId) return;

  const canal = await client.channels.fetch(configRecrutamento.relatorioChannelId).catch(() => null);
  if (!canal) return;

  let textoRespostas = '';
  sessao.respostas.forEach((r, idx) => {
    textoRespostas += `**❓ P${idx + 1}: ${r.pergunta}**\n>${r.resposta || '*Sem resposta*'}\n\n`;
  });

  const files = [];
  const containerComponents = [
    { type: 10, content: `# 📋 Relatório de Recrutamento - ${sessao.nomeIdPersonagem}\n\n👤 **Candidato:** ${user} (\`${user.id}\`)\n🆔 **Personagem / ID:** \`${sessao.nomeIdPersonagem}\`` },
    { type: 14, divider: true, spacing: 1 }
  ];

  if (sessao.rgImageUrl) {
    const anexoFoto = new AttachmentBuilder(sessao.rgImageUrl, { name: 'recrutamento_rg.png' });
    files.push(anexoFoto);

    containerComponents.push({
      type: 12,
      items: [{ media: { url: 'attachment://recrutamento_rg.png' } }]
    });
    containerComponents.push({ type: 14, divider: true, spacing: 1 });
  } else {
    containerComponents.push({ type: 10, content: `📸 **Foto do RG:** ❌ *Não enviada / Tempo esgotado*` });
    containerComponents.push({ type: 14, divider: true, spacing: 1 });
  }

  containerComponents.push(
    { type: 10, content: textoRespostas },
    { type: 14, divider: true, spacing: 1 },
    {
      type: 1,
      components: [
        { type: 2, style: 3, custom_id: `aprovar_${user.id}`, label: 'Aprovar' },
        { type: 2, style: 4, custom_id: `reprovar_${user.id}`, label: 'Reprovar' }
      ]
    }
  );

  const textoMencao = configRecrutamento.cargoRecrutador ? `<@&${configRecrutamento.cargoRecrutador}>` : '🔔 **Novo relatório recebido!**';

  await canal.send({
    content: textoMencao,
    files,
    components: [{ type: 17, accent_color: configRecrutamento.painelCorHex, components: containerComponents }],
    flags: FLAG_V2
  });
}

// ==========================================
// MÓDULO 2: REGISTRO (CONTAINERS V2)
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
    flags: FLAG_V2
  };
}

function gerarPayloadConfigRegistroV2() {
  const catTexto = configRegistro.categoriaId ? `<#${configRegistro.categoriaId}>` : '❌ Não definida';
  const logTexto = configRegistro.logChannelId ? `<#${configRegistro.logChannelId}>` : '❌ Não definido';
  const atrTexto = configRegistro.cargosAtribuir.length ? configRegistro.cargosAtribuir.map(c => `<@&${c}>`).join(', ') : '❌ Não definido';
  const resTexto = configRegistro.cargoResponsavel ? `<@&${configRegistro.cargoResponsavel}>` : '❌ Não definido';
  const tagTexto = configRegistro.tagNome ? `\`${configRegistro.tagNome}\`` : '❌ Nenhuma TAG configurada';

  const tManha = configRegistro.cargosTurnos.manha ? `<@&${configRegistro.cargosTurnos.manha}>` : '❌ Não configurado';
  const tTarde = configRegistro.cargosTurnos.tarde ? `<@&${configRegistro.cargosTurnos.tarde}>` : '❌ Não configurado';
  const tNoite = configRegistro.cargosTurnos.noite ? `<@&${configRegistro.cargosTurnos.noite}>` : '❌ Não configurado';
  const tMadrugada = configRegistro.cargosTurnos.madrugada ? `<@&${configRegistro.cargosTurnos.madrugada}>` : '❌ Não configurado';

  return {
    components: [
      {
        type: 17,
        accent_color: 0x3498db,
        components: [
          {
            type: 10,
            content: 
              `# ⚙️ Configurações da Central de Registro\n\n` +
              `📁 **Categoria dos Tickets:** ${catTexto}\n` +
              `📌 **Canal de LOG:** ${logTexto}\n` +
              `🛡️ **Cargo Responsável:** ${resTexto}\n` +
              `🎖️ **Cargos a Atribuir:** ${atrTexto}\n` +
              `🏷️ **TAG do Nome:** ${tagTexto}\n\n` +
              `### ⏱️ Cargos por Turno\n` +
              `🌅 **Manhã:** ${tManha}\n` +
              `☀️ **Tarde:** ${tTarde}\n` +
              `🌙 **Noite:** ${tNoite}\n` +
              `🌌 **Madrugada:** ${tMadrugada}`
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [{
              type: 8,
              custom_id: 'select_categoria_registro',
              placeholder: '📁 Selecione a categoria dos tickets',
              channel_types: [ChannelType.GuildCategory]
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [{
              type: 8,
              custom_id: 'select_log_registro',
              placeholder: '📌 Selecione canal de LOG',
              channel_types: [ChannelType.GuildText]
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_responsavel_reg',
              placeholder: '🛡️ Selecione o Cargo Responsável'
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_cargos_atribuir',
              placeholder: '🎖️ Selecione cargo(s) a atribuir',
              min_values: 0,
              max_values: 5
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 1, custom_id: 'btn_menu_cargos_turnos', label: 'Configurar Cargos por Turno', emoji: { name: '⏱️' } },
              { type: 2, style: 2, custom_id: 'btn_configurar_tag_nome', label: 'TAG do Nome', emoji: { name: '🏷️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
        ]
      }
    ],
    flags: FLAG_V2
  };
}

function gerarPayloadConfigCargosTurnosV2() {
  const tManha = configRegistro.cargosTurnos.manha ? `<@&${configRegistro.cargosTurnos.manha}>` : '❌ Não definido';
  const tTarde = configRegistro.cargosTurnos.tarde ? `<@&${configRegistro.cargosTurnos.tarde}>` : '❌ Não definido';
  const tNoite = configRegistro.cargosTurnos.noite ? `<@&${configRegistro.cargosTurnos.noite}>` : '❌ Não definido';
  const tMadrugada = configRegistro.cargosTurnos.madrugada ? `<@&${configRegistro.cargosTurnos.madrugada}>` : '❌ Não definido';

  return {
    components: [
      {
        type: 17,
        accent_color: 0x3498db,
        components: [
          {
            type: 10,
            content: 
              `# ⏱️ Configuração de Cargos por Turno\n\n` +
              `Selecione os cargos para cada turno. O bot entregará automaticamente o cargo correspondente ao membro quando ele preencher o registro.\n\n` +
              `🌅 **Manhã:** ${tManha}\n` +
              `☀️ **Tarde:** ${tTarde}\n` +
              `🌙 **Noite:** ${tNoite}\n` +
              `🌌 **Madrugada:** ${tMadrugada}`
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🌅 **Cargo do Turno Manhã**` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_turno_manha',
              placeholder: '🌅 Selecione o cargo para o turno MANHÃ'
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `☀️ **Cargo do Turno Tarde**` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_turno_tarde',
              placeholder: '☀️ Selecione o cargo para o turno TARDE'
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🌙 **Cargo do Turno Noite**` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_turno_noite',
              placeholder: '🌙 Selecione o cargo para o turno NOITE'
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🌌 **Cargo do Turno Madrugada**` },
          {
            type: 1,
            components: [{
              type: 6,
              custom_id: 'select_turno_madrugada',
              placeholder: '🌌 Selecione o cargo para o turno MADRUGADA'
            }]
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              { type: 2, style: 2, custom_id: 'abrir_config_registro', label: 'Voltar', emoji: { name: '↩️' } }
            ]
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `🤖 Organizações • Roleplay | Desenvolvido por Cetus` }
        ]
      }
    ],
    flags: FLAG_V2
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
    const payloadP1 = {
      components: [{
        type: 17,
        accent_color: 0x3498db,
        components: [
          {
            type: 10,
            content: `# 👤 │ NOME DO PERSONAGEM\n\nOlá ${member}, responda com o **NOME** do seu personagem no chat.\n\n📌 **Exemplo:** \`João\`\n\n───────────────────────\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
          }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadP1);

  } else if (sessao.step === 2) {
    const payloadP2 = {
      components: [{
        type: 17,
        accent_color: 0x3498db,
        components: [
          {
            type: 10,
            content: `# 🆔 │ PASSAPORTE / ID\n\nPerfeito! Agora digite o seu **ID / Passaporte** no chat.\n\n📌 **Exemplo:** \`1234\`\n\n───────────────────────\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
          }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadP2);

  } else if (sessao.step === 3) {
    const payloadP3 = {
      components: [{
        type: 17,
        accent_color: 0x3498db,
        components: [
          {
            type: 10,
            content: `# ⏱️ │ TURNO DE ATUAÇÃO\n\nInforme qual o seu **Turno de Atuação** na cidade.\n\n📌 **Opções:** \`Manhã\`, \`Tarde\`, \`Noite\` ou \`Madrugada\`\n\n───────────────────────\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
          }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadP3);

  } else if (sessao.step === 4) {
    const payloadP4 = {
      components: [{
        type: 17,
        accent_color: 0x3498db,
        components: [
          {
            type: 10,
            content: `# 📸 │ FOTO DO RG\n\nPor fim, envie em anexo no chat a **FOTO do seu RG / Personagem**.\n\n📌 **Formatos aceitos:** PNG, JPG ou WEBP.\n\n───────────────────────\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
          }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadP4);

  } else if (sessao.step === 5) {
    const nomeComId = `${sessao.nome} | ${sessao.id}`;
    let novoNick = configRegistro.tagNome 
      ? `『 ${configRegistro.tagNome} 』 ${nomeComId}` 
      : nomeComId;

    let nickSucesso = true;

    try {
      if (novoNick.length <= 32) {
        await member.setNickname(novoNick);
      } else {
        await member.setNickname(nomeComId);
      }
    } catch (err) {
      console.error(`Não foi possível alterar o apelido de ${member.user.tag}:`, err.message);
      nickSucesso = false;
    }

    if (configRegistro.cargosAtribuir.length > 0) {
      await member.roles.add(configRegistro.cargosAtribuir).catch(() => null);
    }

    const turnoLower = sessao.turno.toLowerCase();
    let cargoTurnoId = null;

    if (turnoLower.includes('manh') || turnoLower.includes('manha')) {
      cargoTurnoId = configRegistro.cargosTurnos.manha;
    } else if (turnoLower.includes('tard')) {
      cargoTurnoId = configRegistro.cargosTurnos.tarde;
    } else if (turnoLower.includes('noit')) {
      cargoTurnoId = configRegistro.cargosTurnos.noite;
    } else if (turnoLower.includes('madrug')) {
      cargoTurnoId = configRegistro.cargosTurnos.madrugada;
    }

    if (cargoTurnoId) {
      await member.roles.add(cargoTurnoId).catch(() => null);
    }

    if (configRegistro.logChannelId) {
      const canalLog = await client.channels.fetch(configRegistro.logChannelId).catch(() => null);
      if (canalLog) {
        const files = [];
        const containerComponents = [
          {
            type: 10,
            content: `# 📝 Novo Registro Efetuado\n\n👤 **Membro:** ${member} (\`${member.id}\`)\n🆔 **Personagem / ID:** \`${sessao.nome}\` | \`${sessao.id}\`\n⏱️ **Turno:** \`${sessao.turno}\`\n🏷️ **Apelido Aplicado:** ${nickSucesso ? `\`${novoNick}\`` : '❌ Sem permissão p/ alterar apelido'}`
          },
          { type: 14, divider: true, spacing: 1 }
        ];

        if (sessao.fotoUrl) {
          const anexoFoto = new AttachmentBuilder(sessao.fotoUrl, { name: 'registro_rg.png' });
          files.push(anexoFoto);

          containerComponents.push({
            type: 12,
            items: [{ media: { url: 'attachment://registro_rg.png' } }]
          });
        }

        const payloadLog = {
          files,
          components: [{
            type: 17,
            accent_color: 0x2ecc71,
            components: containerComponents
          }],
          flags: FLAG_V2
        };

        await canalLog.send(payloadLog);
      }
    }

    sessoesRegistroTicket.delete(channel.id);

    const dataAtual = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const payloadConcluido = {
      components: [{
        type: 17,
        accent_color: 0x2ecc71,
        components: [
          {
            type: 10,
            content: `# ✅ │ REGISTRO CONCLUÍDO\n\nParabéns ${member}, seu registro foi **realizado com sucesso**!\n\n🏢 **Servidor:** ${channel.guild.name}\n🆔 **Personagem / ID:** \`${sessao.nome}\` | \`${sessao.id}\`\n🏷️ **Apelido:** \`${novoNick}\`\n⏱️ **Turno:** \`${sessao.turno}\`\n\n───────────────────────\n🔒 *Este canal privado será encerrado e apagado em 5 segundos...*\n\n📅 **Data:** ${dataAtual}\n\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
          }
        ]
      }],
      flags: FLAG_V2
    };

    await channel.send(payloadConcluido);

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
    new SlashCommandBuilder().setName('registro').setDescription('Envia o painel oficial de registro')
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(cleanToken);

  try {
    await rest.put(Routes.applicationCommands(cleanClientId), { body: commands });
    console.log('✅ Comandos globais registrados com sucesso!');
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

      if (interaction.commandName === 'registro') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const payload = gerarPayloadRegistroV2(interaction.guild);
        const msg = await interaction.channel.send(payload);

        configRegistro.painelChannelId = msg.channel.id;
        configRegistro.painelMessageId = msg.id;

        return interaction.editReply({ content: '✅ Painel de Registro enviado.' });
      }
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId === 'abrir_config_painel' || customId === 'menu_navegacao_principal') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Acesso negado.', flags: MessageFlags.Ephemeral });

        const payload = gerarPayloadMenuConfigRecrutamentoV2(interaction.guild);
        payload.flags = MessageFlags.Ephemeral | FLAG_V2;

        if (customId === 'abrir_config_painel') {
          return interaction.reply(payload);
        } else {
          return interaction.update(payload);
        }
      }

      if (customId === 'abrir_config_registro') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Acesso negado.', flags: MessageFlags.Ephemeral });

        const payload = gerarPayloadConfigRegistroV2();
        payload.flags = MessageFlags.Ephemeral | FLAG_V2;

        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(payload);
        } else {
          return interaction.reply(payload);
        }
      }

      if (customId === 'btn_menu_cargos_turnos') {
        if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', flags: MessageFlags.Ephemeral });

        const payload = gerarPayloadConfigCargosTurnosV2();
        payload.flags = MessageFlags.Ephemeral | FLAG_V2;
        return interaction.update(payload);
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
        if (sessoesCandidatos.size >= 10) {
          return interaction.reply({
            content: '⚠️ **Fila cheia!** No momento há 10 recrutamentos simultâneos em andamento. Aguarde alguns instantes para que uma vaga seja liberada.',
            flags: MessageFlags.Ephemeral
          });
        }

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
          flags: FLAG_V2
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

          const payloadAtualizado = {
            components: [
              {
                type: 17,
                accent_color: 0x2ecc71,
                components: [
                  { type: 10, content: `# ✅ Candidatura Aprovada\n\n**Aprovado por:** ${interaction.user}` }
                ]
              }
            ],
            flags: FLAG_V2
          };

          await interaction.update(payloadAtualizado);

          if (member) {
            const payloadPv = {
              components: [{
                type: 17,
                accent_color: 0x2ecc71,
                components: [
                  {
                    type: 10,
                    content: `# 🎉 Recrutamento Aprovado\n\nParabéns! Seu recrutamento foi **aprovado**.\n\nVocê foi aceito na organização.\n\n📌 **Resultado**\n🟢 Aprovado\n\n🏢 **Servidor**\n${interaction.guild.name}\n\n───────────────────────\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
                  }
                ]
              }],
              flags: FLAG_V2
            };

            member.send(payloadPv).catch(() => null);
          }

          if (configRecrutamento.anunciosChannelId) {
            const canalAnuncios = await interaction.guild.channels.fetch(configRecrutamento.anunciosChannelId).catch(() => null);
            if (canalAnuncios) {
              const dataAtual = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              const containerAnuncio = [
                {
                  type: 10,
                  content: `# ✅ │ FORMULÁRIO APROVADO\n\nParabéns <@${userId}>, você foi **APROVADO** no processo seletivo.\n\n🏢 **Servidor:** ${interaction.guild.name}\n👮 **Instrutor:** ${interaction.user}\n\n───────────────────────\n🎉 Seja bem-vindo à organização!\n\n📅 **Data:** ${dataAtual}\n\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
                }
              ];

              if (configRecrutamento.bannerAprovadoUrl) {
                containerAnuncio.push({
                  type: 12,
                  items: [{ media: { url: configRecrutamento.bannerAprovadoUrl } }]
                });
              }

              await canalAnuncios.send({
                components: [{ type: 17, accent_color: 0x2ecc71, components: containerAnuncio }],
                flags: FLAG_V2
              });
            }
          }

        } else {
          const payloadReprovado = {
            components: [
              {
                type: 17,
                accent_color: 0xe74c3c,
                components: [
                  { type: 10, content: `# ❌ Candidatura Reprovada\n\n**Reprovado por:** ${interaction.user}` }
                ]
              }
            ],
            flags: FLAG_V2
          };

          await interaction.update(payloadReprovado);

          if (member) {
            const payloadPvReprovado = {
              components: [{
                type: 17,
                accent_color: 0xe74c3c,
                components: [
                  {
                    type: 10,
                    content: `# ❌ Recrutamento Reprovado\n\nAgradecemos o envio do seu formulário.\n\nSua candidatura foi **reprovada** pela gerência.\n\n📌 **Resultado**\n🔴 Reprovado\n\n🏢 **Servidor**\n${interaction.guild.name}\n\n───────────────────────\n🤖 Organizações • Roleplay | Desenvolvido por Cetus`
                  }
                ]
              }],
              flags: FLAG_V2
            };

            member.send(payloadPvReprovado).catch(() => null);
          }
        }
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

      if (customId === 'select_turno_manha') configRegistro.cargosTurnos.manha = interaction.values[0];
      if (customId === 'select_turno_tarde') configRegistro.cargosTurnos.tarde = interaction.values[0];
      if (customId === 'select_turno_noite') configRegistro.cargosTurnos.noite = interaction.values[0];
      if (customId === 'select_turno_madrugada') configRegistro.cargosTurnos.madrugada = interaction.values[0];

      if (['select_categoria', 'select_canal_relatorios', 'select_canal_anuncios', 'select_cargos_aprovar', 'select_cargos_remover', 'select_cargo_recrutador'].includes(customId)) {
        await sincronizarPainelRecrutamento(interaction.guild);
        return interaction.update(gerarPayloadDefinirConfigRecrutamentoV2());
      }

      if (['select_categoria_registro', 'select_log_registro', 'select_responsavel_reg', 'select_cargos_atribuir'].includes(customId)) {
        await sincronizarPainelRegistro(interaction.guild);
        return interaction.update(gerarPayloadConfigRegistroV2());
      }

      if (['select_turno_manha', 'select_turno_tarde', 'select_turno_noite', 'select_turno_madrugada'].includes(customId)) {
        await sincronizarPainelRegistro(interaction.guild);
        return interaction.update(gerarPayloadConfigCargosTurnosV2());
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
            timerPergunta: null,
            timerGeral: null
          });

          const payloadBoasVindas = {
            components: [{
              type: 17,
              accent_color: 0x3498db,
              components: [
                {
                  type: 10,
                  content: `# 📋 │ FORMULÁRIO DE RECRUTAMENTO\n\n👋 Olá ${user}!\n\n🆔 **Candidato:** \`${nomeId}\`\n\n📸 **Envie a FOTO do seu RG** em anexo no chat para dar início às perguntas.\n\n⏱️ *Tempo por etapa: **${configRecrutamento.tempoPerguntaTexto}** (se não responder, pula para a próxima).*`
                }
              ]
            }],
            flags: FLAG_V2
          };

          await canalTicket.send(payloadBoasVindas);

          iniciarTimerPergunta(canalTicket.id, canalTicket, user);
          iniciarTimerGeralInatividade(canalTicket.id, canalTicket, user);

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
    if (sessaoCandidato.timerPergunta) clearTimeout(sessaoCandidato.timerPergunta);

    if (sessaoCandidato.step === 0) {
      const anexo = message.attachments.first();
      if (!anexo || !anexo.contentType?.startsWith('image/')) {
        const payloadErro = {
          components: [{
            type: 17,
            accent_color: 0xe74c3c,
            components: [
              { type: 10, content: `# ❌ │ IMAGEM INVÁLIDA\n\nPor favor, envie uma **imagem válida** (PNG, JPG ou WEBP) para a foto do seu RG.` }
            ]
          }],
          flags: FLAG_V2
        };

        await message.reply(payloadErro);
        iniciarTimerPergunta(message.channel.id, message.channel, message.author);
        return;
      }

      sessaoCandidato.rgImageUrl = anexo.url;
      sessaoCandidato.step = 1;
      await avancarPergunta(message.channel.id, message.channel, message.author);
      return;
    }

    if (sessaoCandidato.step > 0) {
      const perguntaAtual = configRecrutamento.perguntas[sessaoCandidato.step - 1];
      sessaoCandidato.respostas.push({
        pergunta: perguntaAtual,
        resposta: message.content
      });

      sessaoCandidato.step += 1;

      if (sessaoCandidato.step <= configRecrutamento.perguntas.length) {
        await avancarPergunta(message.channel.id, message.channel, message.author);
      } else {
        await finalizarRecrutamento(message.channel, message.author, sessaoCandidato);
      }
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
        const payloadErro = {
          components: [{
            type: 17,
            accent_color: 0xe74c3c,
            components: [
              { type: 10, content: `# ❌ │ IMAGEM INVÁLIDA\n\nPor favor, envie uma **imagem válida** (PNG, JPG ou WEBP) para a foto do seu RG.` }
            ]
          }],
          flags: FLAG_V2
        };

        await message.reply(payloadErro);
        return;
      }

      sessaoRegistroTicket.fotoUrl = anexo.url;
      sessaoRegistroTicket.step = 5;
      await processarPassoRegistroTicket(message.channel, message.member);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
