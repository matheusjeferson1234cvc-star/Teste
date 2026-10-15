const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField
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

// Cache das configurações em memória
const config = {
  categoriaId: null,
  relatorioChannelId: null,
  anunciosChannelId: null,
  cargosAprovar: [],
  cargosRemover: [],
  cargoRecrutador: null,
  perguntas: []
};

// Sessões de recrutamento nos tickets
const sessoesCandidatos = new Map();

// Avançar perguntas sequenciais ou avançar por tempo esgotado
async function avancarPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  if (sessao.timer) clearTimeout(sessao.timer);

  // Etapa 0: Imagem do RG
  if (sessao.step === 0) {
    if (config.perguntas.length === 0) {
      return finalizarRecrutamento(channel, user, sessao);
    }
    sessao.step = 1;
    await channel.send(`📌 **Pergunta 1/${config.perguntas.length}:**\n${config.perguntas[0]}\n\n⏱️ *Você tem 60 segundos para responder.*`);
    iniciarTimerPergunta(channelId, channel, user);
    return;
  }

  // Avançar perguntas
  if (sessao.step < config.perguntas.length) {
    const proximaPergunta = config.perguntas[sessao.step];
    sessao.step += 1;

    await channel.send(`📌 **Pergunta ${sessao.step}/${config.perguntas.length}:**\n${proximaPergunta}\n\n⏱️ *Você tem 60 segundos para responder.*`);
    iniciarTimerPergunta(channelId, channel, user);
  } else {
    await finalizarRecrutamento(channel, user, sessao);
  }
}

// Timer de 60 segundos por pergunta
function iniciarTimerPergunta(channelId, channel, user) {
  const sessao = sessoesCandidatos.get(channelId);
  if (!sessao) return;

  sessao.timer = setTimeout(async () => {
    if (!sessoesCandidatos.has(channelId)) return;

    if (sessao.step === 0) {
      sessao.rgImageUrl = null;
      await channel.send('⚠️ **Tempo esgotado para o envio do RG!** Etapa sem envio de RG.');
    } else {
      const perguntaAtual = config.perguntas[sessao.step - 1];
      sessao.respostas.push({
        pergunta: perguntaAtual,
        resposta: '⚠️ *Tempo esgotado (não respondeu)*'
      });
      await channel.send(`⚠️ **Tempo esgotado para a Pergunta ${sessao.step}!** Pergunta anulada e avançando...`);
    }

    await avancarPergunta(channelId, channel, user);
  }, 60000);
}

// Finaliza o recrutamento, envia o relatório e deleta o ticket em 5s
async function finalizarRecrutamento(channel, user, sessao) {
  if (sessao.timer) clearTimeout(sessao.timer);

  await enviarRelatorio(user, sessao);
  sessoesCandidatos.delete(channel.id);

  await channel.send('🎉 **Recrutamento finalizado!** Suas respostas foram enviadas para avaliação da equipe.\n🔒 **Este ticket será fechado e apagado em 5 segundos...**');

  setTimeout(() => {
    channel.delete().catch(() => null);
  }, 5000);
}

// Ready e registro de comandos
client.once(Events.ClientReady, async (c) => {
  console.log('==================================================');
  console.log(`🤖 BOT ONLINE: ${c.user.tag} (ID: ${c.user.id})`);

  const cleanClientId = process.env.CLIENT_ID ? process.env.CLIENT_ID.trim() : null;
  const cleanToken = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : null;

  if (!cleanClientId || !cleanToken) return;

  const commands = [
    new SlashCommandBuilder()
      .setName('recrutamento')
      .setDescription('Envia o painel de recrutamento')
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
    console.error('❌ Erro nos comandos:', err.message);
  }
  console.log('==================================================');
});

// Interações de interface
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'recrutamento' || interaction.commandName === 'painel') {
      await interaction.reply({
        embeds: [gerarEmbedConfigGeral()],
        components: gerarBotoesConfigGeral(),
        ephemeral: true
      });
    }
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'enviar_painel_recrutamento') {
      await interaction.channel.send({
        embeds: [gerarEmbedPainelPrincipal()],
        components: [gerarBotaoFormularioComConfig()]
      });
      return interaction.reply({ content: '✅ Painel enviado com sucesso.', ephemeral: true });
    }

    if (customId === 'abrir_config_painel') {
      return interaction.reply({
        embeds: [gerarEmbedConfigGeral()],
        components: gerarBotoesConfigGeral(),
        ephemeral: true
      });
    }

    // Modal inicial: apenas Nome e ID do Personagem
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

    if (customId === 'btn_finalizar_recrutamento') {
      const sessao = sessoesCandidatos.get(interaction.channel.id);
      if (sessao && sessao.timer) clearTimeout(sessao.timer);
      sessoesCandidatos.delete(interaction.channel.id);

      await interaction.reply('🔒 Encerrando este canal de recrutamento...');
      setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
      return;
    }

    if (customId === 'menu_config_geral') {
      return interaction.update({ embeds: [gerarEmbedConfigGeral()], components: gerarBotoesConfigGeral() });
    }

    if (customId === 'menu_definir_config') {
      return interaction.update({ embeds: [gerarEmbedDefinirConfig()], components: gerarSelectsDefinirConfig() });
    }

    if (customId === 'menu_gerenciar_perguntas') {
      return interaction.update({ embeds: [gerarEmbedGerenciarPerguntas()], components: gerarBotoesGerenciarPerguntas() });
    }

    if (customId === 'btn_add_pergunta') {
      if (config.perguntas.length >= 20) {
        return interaction.reply({ content: '❌ Limite de 20 perguntas atingido!', ephemeral: true });
      }

      const modal = new ModalBuilder().setCustomId('modal_add_pergunta').setTitle('Nova pergunta');
      const inputPergunta = new TextInputBuilder()
        .setCustomId('texto_pergunta')
        .setLabel('Pergunta')
        .setPlaceholder('digite a pergunta do recrutamento...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(inputPergunta));
      return interaction.showModal(modal);
    }

    if (customId === 'btn_rem_pergunta') {
      if (config.perguntas.length === 0) {
        return interaction.reply({ content: '❌ Nenhuma pergunta cadastrada.', ephemeral: true });
      }
      config.perguntas.pop();
      return interaction.update({ embeds: [gerarEmbedGerenciarPerguntas()], components: gerarBotoesGerenciarPerguntas() });
    }

    if (customId === 'btn_ver_perguntas') {
      const embedPerguntas = new EmbedBuilder().setTitle('Perguntas do Recrutamento').setColor(0x2b2d31);
      if (config.perguntas.length === 0) {
        embedPerguntas.setDescription('❌ **Nenhuma pergunta cadastrada.**\n\nAdicione uma pergunta para começar a configurar o formulário.');
      } else {
        const lista = config.perguntas.map((p, i) => `**${i + 1}.** ${p}`).join('\n\n');
        embedPerguntas.setDescription(lista);
      }

      const rowVoltar = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_gerenciar_perguntas').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
      );
      return interaction.update({ embeds: [embedPerguntas], components: [rowVoltar] });
    }

    if (customId.startsWith('aprovar_') || customId.startsWith('reprovar_')) {
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
        if (member) member.send('🎉 **Parabéns!** Sua candidatura foi **APROVADA**!').catch(() => null);
      } else {
        const embedAtual = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0xe74c3c)
          .setTitle('❌ Candidatura Reprovada')
          .addFields({ name: 'Reprovado por', value: `${interaction.user}`, inline: true });

        await interaction.update({ embeds: [embedAtual], components: [] });
        if (member) member.send('❌ Sua candidatura foi **REPROVADA**.').catch(() => null);
      }
    }
  }

  if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
    const customId = interaction.customId;
    if (customId === 'select_categoria') config.categoriaId = interaction.values[0];
    if (customId === 'select_canal_relatorios') config.relatorioChannelId = interaction.values[0];
    if (customId === 'select_canal_anuncios') config.anunciosChannelId = interaction.values[0];
    if (customId === 'select_cargos_aprovar') config.cargosAprovar = interaction.values;
    if (customId === 'select_cargos_remover') config.cargosRemover = interaction.values;
    if (customId === 'select_cargo_recrutador') config.cargoRecrutador = interaction.values[0];

    return interaction.update({ embeds: [gerarEmbedDefinirConfig()], components: gerarSelectsDefinirConfig() });
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_add_pergunta') {
      const novaPergunta = interaction.fields.getTextInputValue('texto_pergunta');
      config.perguntas.push(novaPergunta);
      return interaction.update({ embeds: [gerarEmbedGerenciarPerguntas()], components: gerarBotoesGerenciarPerguntas() });
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

        const canalTicket = await guild.channels.create({
          name: canalNome,
          type: ChannelType.GuildText,
          parent: config.categoriaId || null,
          permissionOverwrites
        });

        sessoesCandidatos.set(canalTicket.id, {
          userId: user.id,
          nomeIdPersonagem: nomeId,
          step: 0,
          respostas: [],
          rgImageUrl: null,
          timer: null
        });

        const rowFinalizar = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_finalizar_recrutamento').setLabel('Finalizar Recrutamento').setStyle(ButtonStyle.Danger)
        );

        await canalTicket.send({
          content: `Bem-vindo(a) ${user}!\n👤 **Candidato:** ${nomeId}\n\n📌 **Para iniciar o formulário de recrutamento, envie a foto do seu RG abaixo.**\n⏱️ *Você tem 60 segundos para responder.*`,
          components: [rowFinalizar]
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

// Leitura de mensagens / respostas no ticket
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const sessao = sessoesCandidatos.get(message.channel.id);
  if (!sessao || message.author.id !== sessao.userId) return;

  if (sessao.timer) clearTimeout(sessao.timer);

  // Etapa 0: Imagem do RG
  if (sessao.step === 0) {
    const anexo = message.attachments.first();
    if (!anexo || !anexo.contentType?.startsWith('image/')) {
      await message.reply('❌ Por favor, envie uma **imagem válida** contendo a foto do seu RG.');
      iniciarTimerPergunta(message.channel.id, message.channel, message.author);
      return;
    }

    sessao.rgImageUrl = anexo.url;
    await message.reply('✅ **Foto do RG registrada com sucesso!**');
    await avancarPergunta(message.channel.id, message.channel, message.author);
    return;
  }

  // Etapas 1 a N: Respostas das perguntas
  if (sessao.step > 0 && sessao.step <= config.perguntas.length) {
    const perguntaAtual = config.perguntas[sessao.step - 1];
    sessao.respostas.push({
      pergunta: perguntaAtual,
      resposta: message.content
    });

    await avancarPergunta(message.channel.id, message.channel, message.author);
  }
});

// Envio do relatório para o canal configurado
async function enviarRelatorio(user, sessao) {
  if (!config.relatorioChannelId) return;

  const canal = await client.channels.fetch(config.relatorioChannelId).catch(() => null);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle(`📝 Formulário de Recrutamento - ${sessao.nomeIdPersonagem}`)
    .setColor(0x2b2d31)
    .setThumbnail(user.displayAvatarURL())
    .setImage(sessao.rgImageUrl)
    .addFields(
      { name: '👤 Candidato', value: `${user} (${user.id})` },
      { name: '🆔 Personagem / ID', value: sessao.nomeIdPersonagem }
    )
    .setTimestamp();

  sessao.respostas.forEach((r, idx) => {
    embed.addFields({
      name: `P${idx + 1}: ${r.pergunta}`,
      value: r.resposta || '*Sem resposta*'
    });
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`aprovar_${user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reprovar_${user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });
}

// Construtores de Embeds e Componentes
function gerarEmbedConfigGeral() {
  return new EmbedBuilder()
    .setTitle('⚙️ Configuração do Recrutamento')
    .setDescription('Gerencie o sistema de recrutamento através das opções abaixo.')
    .setColor(0x2b2d31)
    .addFields({
      name: '⚙️ Configuração — visualize o status atual.',
      value: '❓ **Perguntas** — gerencie as perguntas.\n⚙️ **Definir configurações** — altere os canais e cargos do sistema.'
    });
}

function gerarBotoesConfigGeral() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_config_geral').setLabel('⚙️ Configuração').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_definir_config').setLabel('⚙️ Definir configurações').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_gerenciar_perguntas').setLabel('❓ Gerenciar perguntas').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('enviar_painel_recrutamento').setLabel('📤 Enviar Painel').setStyle(ButtonStyle.Success)
    )
  ];
}

function gerarEmbedDefinirConfig() {
  return new EmbedBuilder()
    .setTitle('⚙️ Definir Configurações')
    .setDescription('Configure os canais e cargos utilizados pelo sistema de recrutamento.')
    .setColor(0x2b2d31)
    .addFields(
      { name: '📁 Categoria dos recrutamentos', value: config.categoriaId ? `<#${config.categoriaId}>` : '❌ Não definida' },
      { name: '📢 Canal de relatórios', value: config.relatorioChannelId ? `<#${config.relatorioChannelId}>` : '❌ Não definido' },
      { name: '📢 Canal de anúncios', value: config.anunciosChannelId ? `<#${config.anunciosChannelId}>` : '❌ Não definido' },
      { name: '👑 Cargo recrutador', value: config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '❌ Não definido' },
      { name: '✅ Cargos adicionar ao aprovar', value: config.cargosAprovar.length ? config.cargosAprovar.map(c => `<@&${c}>`).join(', ') : 'Não definido' },
      { name: '🗑️ Cargos removidos ao aprovar', value: config.cargosRemover.length ? config.cargosRemover.map(c => `<@&${c}>`).join(', ') : 'Nenhum cargo configurado' }
    );
}

function gerarSelectsDefinirConfig() {
  return [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('select_categoria').setPlaceholder('📁 Selecione a categoria').setChannelTypes(ChannelType.GuildCategory)
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('select_canal_relatorios').setPlaceholder('📢 Selecione o canal de relatórios').setChannelTypes(ChannelType.GuildText)
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('select_canal_anuncios').setPlaceholder('📢 Selecione o canal de anúncios').setChannelTypes(ChannelType.GuildText)
    ),
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId('select_cargos_aprovar').setPlaceholder('⭐ Selecione os cargos de aprovado').setMinValues(0).setMaxValues(5)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_config_geral').setLabel('↩️ Voltar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function gerarEmbedGerenciarPerguntas() {
  return new EmbedBuilder()
    .setTitle('❓ Gerenciar Perguntas')
    .setDescription('Controle as perguntas utilizadas no formulário de recrutamento.')
    .setColor(0x2b2d31)
    .addFields({
      name: `📋 Perguntas: ${config.perguntas.length}/20`,
      value: config.perguntas.length === 0 ? 'Nenhuma pergunta cadastrada.' : `Há ${config.perguntas.length} pergunta(s) ativa(s).`
    });
}

function gerarBotoesGerenciarPerguntas() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_add_pergunta').setLabel('➕ Adicionar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_rem_pergunta').setLabel('➖ Remover última').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_ver_perguntas').setLabel('👁️ Ver perguntas').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_config_geral').setLabel('↩️ Voltar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function gerarEmbedPainelPrincipal() {
  return new EmbedBuilder()
    .setTitle('📋 Central de Recrutamento')
    .setDescription('Bem-vindo ao **Sistema Oficial de Recrutamento**.\nSe deseja ingressar na organização, clique no botão abaixo e preencha o formulário.')
    .setColor(0x2b2d31)
    .addFields({
      name: '✔️ Etapas do Processo',
      value: '☑️ **Preenchimento do formulário**\n⏱️ Você terá **1 minuto** para responder cada pergunta\n🔍 Análise da candidatura\n🎙️ Entrevista com a equipe\n✅ Resultado final'
    })
    .setFooter({ text: 'Organizações • Roleplay' });
}

function gerarBotaoFormularioComConfig() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('iniciar_formulario').setLabel('📝 Formulário').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('abrir_config_painel').setLabel('⚙️').setStyle(ButtonStyle.Secondary)
  );
}

client.login(process.env.DISCORD_TOKEN);
