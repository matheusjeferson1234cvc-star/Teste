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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Cache das configurações do sistema
const config = {
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

const sessoesCandidatos = new Map();

// Permissão restrita: Dono do servidor ou Administrador do Discord
function isDonoOuAdmin(interaction) {
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
  return isOwner || isAdmin;
}

// 1. PAINEL PRINCIPAL (PÚBLICO)
function gerarPayloadPainelV2(guild) {
  const logoUrl = guild && guild.iconURL({ extension: 'png', size: 256 }) ? guild.iconURL({ extension: 'png', size: 256 }) : null;

  const textoConteudo = 
    `# ${config.painelTitulo}\n\n` +
    `${config.painelDescricao}\n\n` +
    `### 🛡️ Etapas do Processo\n` +
    `• 📝 Preenchimento do formulário\n` +
    `• ⏱️ Você terá **${config.tempoPerguntaTexto}** para responder cada pergunta\n` +
    `• 🔍 Análise da candidatura\n` +
    `• 🎶🎤 Entrevista com a equipe\n` +
    `• ✅ Resultado final`;

  const containerComponents = [];

  if (config.painelBannerUrl) {
    containerComponents.push({
      type: 12,
      items: [{ media: { url: config.painelBannerUrl } }]
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
    components: [{ type: 17, accent_color: config.painelCorHex, components: containerComponents }],
    flags: MessageFlags.IsComponentsV2
  };
}

// 2. MENU PRINCIPAL DE CONFIGURAÇÃO
function gerarPayloadMenuConfigV2(guild) {
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

// 3. ABA CONFIGURAÇÃO (STATUS ATUAL)
function gerarPayloadStatusConfigV2() {
  const catTexto = config.categoriaId ? `<#${config.categoriaId}>` : '❌ Não definida';
  const relTexto = config.relatorioChannelId ? `<#${config.relatorioChannelId}>` : '❌ Não definido';
  const anuTexto = config.anunciosChannelId ? `<#${config.anunciosChannelId}>` : '❌ Não definido';
  const aprTexto = config.cargosAprovar.length ? config.cargosAprovar.map(c => `<@&${c}>`).join(', ') : '❌ Não definido';
  const remTexto = config.cargosRemover.length ? config.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ Nenhum cargo configurado';
  const recTexto = config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '❌ Não definido';

  const textoConteudo = 
    `# ⚙️ Status Atual das Configurações\n\n` +
    `📁 **Categoria:** ${catTexto}\n` +
    `📡 **Canal de relatórios:** ${relTexto}\n` +
    `📢 **Canal de anúncios:** ${anuTexto}\n` +
    `👮 **Cargo recrutador:** ${recTexto}\n` +
    `✅ **Cargos ao aprovar:** ${aprTexto}\n` +
    `🗑️ **Cargos a remover:** ${remTexto}\n` +
    `❓ **Perguntas cadastradas:** \`${config.perguntas.length}/20\`\n` +
    `⏱️ **Tempo por pergunta:** \`${config.tempoPerguntaTexto}\``;

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

// 4. ABA VISUAL & TEXTOS
function gerarPayloadVisualTextosV2() {
  const bannerInfo = config.painelBannerUrl ? `[Clique aqui para ver](${config.painelBannerUrl})` : '❌ Não configurado';
  const bannerAprovInfo = config.bannerAprovadoUrl ? `[Clique aqui para ver](${config.bannerAprovadoUrl})` : '❌ Não configurado';

  const textoConteudo = 
    `# 🎨 Configurações de Visual & Textos\n\n` +
    `📌 **Título Atual:** \`${config.painelTitulo}\`\n` +
    `🎨 **Cor da Borda:** \`${config.painelCorNome}\`\n` +
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

// 5. ABA GERENCIAR PERGUNTAS
function gerarPayloadGerenciarPerguntasV2() {
  const listaPerguntas = config.perguntas.length > 0 
    ? config.perguntas.map((p, i) => `**${i + 1}.**${p}`).join('\n') 
    : '*Nenhuma pergunta cadastrada.*';

  const textoConteudo = 
    `# ❓ Gerenciar Perguntas & Tempo\n\n` +
    `⏱️ **Tempo Atual por Pergunta:** \`${config.tempoPerguntaTexto}\`\n` +
    `📋 **Perguntas Cadastradas (${config.perguntas.length}/20):**\n${listaPerguntas}`;

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
              type: 3, // String Select Menu
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

// 6. ABA DEFINIR CONFIGURAÇÕES (CANAL/CARGO)
function gerarPayloadDefinirConfigV2() {
  const catTexto = config.categoriaId ? `<#${config.categoriaId}>` : '❌ Não definido';
  const relTexto = config.relatorioChannelId ? `<#${config.relatorioChannelId}>` : '❌ Não definido';
  const anuTexto = config.anunciosChannelId ? `<#${config.anunciosChannelId}>` : '❌ Não definido';
  const aprTexto = config.cargosAprovar.length ? config.cargosAprovar.map(c => `<@&${c}>`).join(', ') : '❌ Não definido';
  const remTexto = config.cargosRemover.length ? config.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ Nenhum cargo configurado';
  const recTexto = config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '❌ Não definido';

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

// Sincroniza o painel público automaticamente
async function sincronizarPainelPublico(guild) {
  if (!config.painelChannelId || !config.painelMessageId) return;

  try {
    const canal = await client.channels.fetch(config.painelChannelId).catch(() => null);
    if (!canal) return;

    const mensagem = await canal.messages.fetch(config.painelMessageId).catch(() => null);
    if (!mensagem) return;

    const payload = gerarPayloadPainelV2(guild || canal.guild);
    await mensagem.edit(payload);
  } catch (err) {
    console.error('Erro ao sincronizar painel público:', err);
  }
}

// Avançar perguntas do formulário
async function avancarPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  if (sessao.timer) clearTimeout(sessao.timer);

  if (sessao.step === 0) {
    if (config.perguntas.length === 0) {
      return finalizarRecrutamento(channel, user, sessao);
    }
    sessao.step = 1;
    await channel.send(`📋 **Pergunta 1/${config.perguntas.length}:**\n> ${config.perguntas[0]}\n\n⏱️ *Você tem ${config.tempoPerguntaTexto} para responder.*`);
    iniciarTimerPergunta(channelId, channel, user);
    return;
  }

  if (sessao.step < config.perguntas.length) {
    const proximaPergunta = config.perguntas[sessao.step];
    sessao.step += 1;

    await channel.send(`📋 **Pergunta ${sessao.step}/${config.perguntas.length}:**\n> ${proximaPergunta}\n\n⏱️ *Você tem ${config.tempoPerguntaTexto} para responder.*`);
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
        `⏰ Você não respondeu a pergunta em até **${config.tempoPerguntaTexto}**.\n` +
        '🗑️ O canal do recrutamento foi fechado.\n\n' +
        'Se ainda quiser participar, utilize o painel de recrutamento e inicie um novo processo. Boa sorte! 🍀\n\n' +
        '───────────────────────\n' +
        '🤖 Organizações • Roleplay | Desenvolvido por Cetus'
      )
      .setColor(0xe74c3c);

    await user.send({ embeds: [embedExpirado] }).catch(() => null);

    await channel.send('⚠️ **Recrutamento expirado por inatividade!** Fechando o canal em 5 segundos...');
    setTimeout(() => {
      channel.delete().catch(() => null);
    }, 5000);

  }, config.tempoPerguntaMs);
}

async function finalizarRecrutamento(channel, user, sessao) {
  if (sessao.timer) clearTimeout(sessao.timer);

  await enviarRelatorio(user, sessao);
  sessoesCandidatos.delete(channel.id);

  await channel.send(`🎉 **Recrutamento concluído com sucesso, ${user}!**\n🔒 *Este canal será finalizado e apagado em 5 segundos...*`);

  setTimeout(() => {
    channel.delete().catch(() => null);
  }, 5000);
}

client.once(Events.ClientReady, async (c) => {
  console.log('==================================================');
  console.log(`🤖 BOT ONLINE: ${c.user.tag} (ID:${c.user.id})`);

  const cleanClientId = process.env.CLIENT_ID ? process.env.CLIENT_ID.trim() : null;
  const cleanToken = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : null;

  if (!cleanClientId || !cleanToken) return;

  const commands = [
    new SlashCommandBuilder()
      .setName('recrutamento')
      .setDescription('Envia o painel oficial de recrutamento'),
    new SlashCommandBuilder()
      .setName('configuracao')
      .setDescription('Abre o painel privado de configurações do sistema')
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
    console.log('✅ Comandos registrados!');
  } catch (err) {
    console.error('❌ Erro nos comandos:', err.message);
  }
  console.log('==================================================');
});

// Interações do Bot
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'recrutamento') {
      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({ content: '❌ **Acesso negado!** Apenas o Dono ou Administradores do servidor podem usar este comando.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const payload = gerarPayloadPainelV2(interaction.guild);
      const msg = await interaction.channel.send(payload);

      config.painelChannelId = msg.channel.id;
      config.painelMessageId = msg.id;

      return interaction.editReply({ content: '✅ Painel enviado com sucesso.' });
    }

    if (interaction.commandName === 'configuracao') {
      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({ content: '❌ **Acesso negado!** Apenas o Dono ou Administradores do servidor podem abrir as configurações.', ephemeral: true });
      }

      const payload = gerarPayloadMenuConfigV2(interaction.guild);
      payload.ephemeral = true;
      return interaction.reply(payload);
    }
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'abrir_config_painel' || customId === 'menu_navegacao_principal') {
      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({
          content: '❌ **Acesso negado!** Apenas o Dono ou Administradores do servidor podem acessar as configurações.',
          ephemeral: true
        });
      }

      const payload = gerarPayloadMenuConfigV2(interaction.guild);
      if (interaction.replied || interaction.deferred) {
        payload.ephemeral = true;
        return interaction.followUp(payload);
      } else if (customId === 'abrir_config_painel') {
        payload.ephemeral = true;
        return interaction.reply(payload);
      } else {
        return interaction.update(payload);
      }
    }

    if (customId === 'menu_config_geral') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update(gerarPayloadStatusConfigV2());
    }

    if (customId === 'menu_visual_textos') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update(gerarPayloadVisualTextosV2());
    }

    if (customId === 'menu_definir_config') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update(gerarPayloadDefinirConfigV2());
    }

    if (customId === 'menu_gerenciar_perguntas') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update(gerarPayloadGerenciarPerguntasV2());
    }

    if (customId === 'iniciar_formulario') {
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
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('modal_editar_painel')
        .setTitle('Personalizar Título, Descrição & Banner');

      const inputTitulo = new TextInputBuilder()
        .setCustomId('p_titulo')
        .setLabel('Título do Painel')
        .setValue(config.painelTitulo)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputDesc = new TextInputBuilder()
        .setCustomId('p_desc')
        .setLabel('Descrição do Painel')
        .setValue(config.painelDescricao)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const inputBanner = new TextInputBuilder()
        .setCustomId('p_banner')
        .setLabel('URL Banner Painel Principal')
        .setPlaceholder('https://...')
        .setValue(config.painelBannerUrl || '')
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
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('modal_editar_banner_aprovacao')
        .setTitle('Banner de Aprovação');

      const inputAprovado = new TextInputBuilder()
        .setCustomId('p_banner_aprovado')
        .setLabel('URL Banner de APROVADO')
        .setPlaceholder('https://i.imgur.com/exemplo.png')
        .setValue(config.bannerAprovadoUrl || '')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(inputAprovado));
      return interaction.showModal(modal);
    }

    if (customId === 'btn_add_pergunta') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });

      if (config.perguntas.length >= 20) {
        return interaction.reply({ content: '❌ Limite de 20 perguntas atingido!', ephemeral: true });
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
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });

      if (config.perguntas.length === 0) {
        return interaction.reply({ content: '❌ Nenhuma pergunta cadastrada.', ephemeral: true });
      }
      config.perguntas.pop();
      await sincronizarPainelPublico(interaction.guild);
      return interaction.update(gerarPayloadGerenciarPerguntasV2());
    }

    if (customId === 'btn_rem_pergunta_especifica') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });

      if (config.perguntas.length === 0) {
        return interaction.reply({ content: '❌ Nenhuma pergunta cadastrada para remover.', ephemeral: true });
      }

      const options = config.perguntas.map((p, index) => ({
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

    // APROVAÇÃO E REPROVAÇÃO
    if (customId.startsWith('aprovar_') || customId.startsWith('reprovar_')) {
      const hasCargoRecrutador = config.cargoRecrutador && interaction.member.roles.cache.has(config.cargoRecrutador);

      if (!isDonoOuAdmin(interaction) && !hasCargoRecrutador) {
        return interaction.reply({
          content: '❌ **Acesso negado!** Apenas o Dono, Administradores ou membros com o cargo de Recrutador podem aprovar/reprovar.',
          ephemeral: true
        });
      }

      const [acao, userId] = customId.split('_');
      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (acao === 'aprovar') {
        if (member && config.cargosAprovar.length > 0) await member.roles.add(config.cargosAprovar).catch(() => null);
        if (member && config.cargosRemover.length > 0) await member.roles.remove(config.cargosRemover).catch(() => null);

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

        if (config.anunciosChannelId) {
          const canalAnuncios = await interaction.guild.channels.fetch(config.anunciosChannelId).catch(() => null);
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

            if (config.bannerAprovadoUrl) {
              embedAvisoAprovado.setImage(config.bannerAprovadoUrl);
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
  }

  // MENUS DE SELEÇÃO
  if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || interaction.isStringSelectMenu()) {
    if (!isDonoOuAdmin(interaction)) {
      return interaction.reply({ content: '❌ **Acesso negado!** Apenas o Dono ou Administradores podem alterar configurações.', ephemeral: true });
    }

    const customId = interaction.customId;

    if (customId === 'select_remover_pergunta_especifica') {
      const indexRemover = parseInt(interaction.values[0], 10);
      if (!isNaN(indexRemover) && indexRemover >= 0 && indexRemover < config.perguntas.length) {
        config.perguntas.splice(indexRemover, 1);
        await sincronizarPainelPublico(interaction.guild);
      }
      return interaction.update(gerarPayloadGerenciarPerguntasV2());
    }

    if (customId === 'select_categoria') config.categoriaId = interaction.values[0];
    if (customId === 'select_canal_relatorios') config.relatorioChannelId = interaction.values[0];
    if (customId === 'select_canal_anuncios') config.anunciosChannelId = interaction.values[0];
    if (customId === 'select_cargos_aprovar') config.cargosAprovar = interaction.values;
    if (customId === 'select_cargos_remover') config.cargosRemover = interaction.values;
    if (customId === 'select_cargo_recrutador') config.cargoRecrutador = interaction.values[0];

    if (customId === 'select_tempo_pergunta') {
      const valorMs = parseInt(interaction.values[0], 10);
      config.tempoPerguntaMs = valorMs;

      const tempoMinutos = valorMs / 60000;
      if (tempoMinutos < 1) {
        config.tempoPerguntaTexto = `${valorMs / 1000} segundos`;
      } else if (tempoMinutos === 1) {
        config.tempoPerguntaTexto = '1 minuto';
      } else {
        config.tempoPerguntaTexto = `${tempoMinutos} minutos`;
      }

      await sincronizarPainelPublico(interaction.guild);
      return interaction.update(gerarPayloadGerenciarPerguntasV2());
    }

    await sincronizarPainelPublico(interaction.guild);
    return interaction.update(gerarPayloadDefinirConfigV2());
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_editar_painel') {
      config.painelTitulo = interaction.fields.getTextInputValue('p_titulo');
      config.painelDescricao = interaction.fields.getTextInputValue('p_desc');
      
      const bannerInput = interaction.fields.getTextInputValue('p_banner');
      config.painelBannerUrl = bannerInput.trim().startsWith('http') ? bannerInput.trim() : null;

      await sincronizarPainelPublico(interaction.guild);
      return interaction.reply({ content: '✅ Título, Descrição e Banner atualizados com sucesso!', ephemeral: true });
    }

    if (interaction.customId === 'modal_editar_banner_aprovacao') {
      const aprovadoInput = interaction.fields.getTextInputValue('p_banner_aprovado');
      if (aprovadoInput.trim().startsWith('http')) {
        config.bannerAprovadoUrl = aprovadoInput.trim();
      }

      await sincronizarPainelPublico(interaction.guild);
      return interaction.reply({ content: '✅ Banner de aprovação atualizado com sucesso!', ephemeral: true });
    }

    if (interaction.customId === 'modal_add_pergunta') {
      const novaPergunta = interaction.fields.getTextInputValue('texto_pergunta');
      config.perguntas.push(novaPergunta);

      await sincronizarPainelPublico(interaction.guild);
      return interaction.reply({ content: '✅ Pergunta adicionada com sucesso!', ephemeral: true });
    }

    if (interaction.customId === 'modal_iniciar_recrutamento') {
      const nomeId = interaction.fields.getTextInputValue('nome_id_personagem');
      const guild = interaction.guild;
      const user = interaction.user;

      const canalNome = `recrutamento-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      try {
        const permissionOverwrites = [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ];

        if (config.cargoRecrutador) {
          permissionOverwrites.push({ id: config.cargoRecrutador, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        }

        const canalParams = {
          name: canalNome,
          type: ChannelType.GuildText,
          permissionOverwrites
        };

        if (config.categoriaId) {
          canalParams.parent = config.categoriaId;
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

        await canalTicket.send({
          content: `👋 Olá ${user}!\n\n🆔 **Candidato:** \`${nomeId}\`\n\n📌 **Envie a foto do seu RG abaixo para começar o recrutamento.**\n⏱️ *Você tem ${config.tempoPerguntaTexto} para responder.*`
        });

        iniciarTimerPergunta(canalTicket.id, canalTicket, user);

        return interaction.reply({ content: `✅ Canal criado com sucesso: ${canalTicket}`, ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ Não foi possível criar o canal de recrutamento.', ephemeral: true });
      }
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const sessao = sessoesCandidatos.get(message.channel.id);
  if (!sessao || message.author.id !== sessao.userId) return;

  if (sessao.timer) clearTimeout(sessao.timer);

  if (sessao.step === 0) {
    const anexo = message.attachments.first();
    if (!anexo || !anexo.contentType?.startsWith('image/')) {
      await message.reply('❌ Por favor, envie uma **imagem válida** do seu RG.');
      iniciarTimerPergunta(message.channel.id, message.channel, message.author);
      return;
    }

    sessao.rgImageUrl = anexo.url;
    await avancarPergunta(message.channel.id, message.channel, message.author);
    return;
  }

  if (sessao.step > 0 && sessao.step <= config.perguntas.length) {
    const perguntaAtual = config.perguntas[sessao.step - 1];
    sessao.respostas.push({
      pergunta: perguntaAtual,
      resposta: message.content
    });

    await avancarPergunta(message.channel.id, message.channel, message.author);
  }
});

async function enviarRelatorio(user, sessao) {
  if (!config.relatorioChannelId) return;

  const canal = await client.channels.fetch(config.relatorioChannelId).catch(() => null);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle(`📋 Relatório de Recrutamento - ${sessao.nomeIdPersonagem}`)
    .setColor(config.painelCorHex)
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
      name: `❓ P${idx + 1}: ${r.pergunta}`,
      value: `> ${r.resposta || '*Sem resposta*'}`
    });
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`aprovar_${user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reprovar_${user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
  );

  const textoMencao = config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '🔔 **Novo relatório recebido!**';

  await canal.send({ content: textoMencao, embeds: [embed], components: [row] });
}

client.login(process.env.DISCORD_TOKEN);
