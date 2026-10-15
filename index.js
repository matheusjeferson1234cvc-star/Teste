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

// Apenas Dono do servidor ou Administrador do Discord
function isDonoOuAdmin(interaction) {
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
  return isOwner || isAdmin;
}

// Sincroniza o painel público automaticamente
async function sincronizarPainelPublico(guild) {
  if (!config.painelChannelId || !config.painelMessageId) return;

  try {
    const canal = await client.channels.fetch(config.painelChannelId).catch(() => null);
    if (!canal) return;

    const mensagem = await canal.messages.fetch(config.painelMessageId).catch(() => null);
    if (!mensagem) return;

    await mensagem.edit({
      embeds: [gerarEmbedPainelPrincipal(guild || canal.guild)],
      components: [gerarBotaoFormularioComConfig()]
    });
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
        'Se ainda quiser participar, utilize o painel de recrutamento e inicie um novo processo. Boa sorte! 🍀'
      )
      .setColor(0xe74c3c)
      .setFooter({ text: '🤖 Organizações • Roleplay | Desenvolvido por Cetus' });

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

      const msg = await interaction.channel.send({
        embeds: [gerarEmbedPainelPrincipal(interaction.guild)],
        components: [gerarBotaoFormularioComConfig()]
      });

      config.painelChannelId = msg.channel.id;
      config.painelMessageId = msg.id;

      return interaction.editReply({ content: '✅ Painel enviado com sucesso.' });
    }

    if (interaction.commandName === 'configuracao') {
      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({ content: '❌ **Acesso negado!** Apenas o Dono ou Administradores do servidor podem abrir as configurações.', ephemeral: true });
      }

      return interaction.reply({
        embeds: [gerarEmbedMenuNavegacao()],
        components: gerarBotoesConfigGeral(),
        ephemeral: true
      });
    }
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    // MENU PRINCIPAL DE NAVEGAÇÃO
    if (customId === 'menu_navegacao_principal') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
      return interaction.update({ embeds: [gerarEmbedMenuNavegacao()], components: gerarBotoesConfigGeral() });
    }

    // BOTÃO "Config" / "⚙️ Configuração do Recrutamento" (TELA DA SUA IMAGEM)
    if (customId === 'abrir_config_painel' || customId === 'menu_config_geral') {
      if (!isDonoOuAdmin(interaction)) {
        return interaction.reply({
          content: '❌ **Acesso negado!** Apenas o Dono ou Administradores podem acessar as configurações.',
          ephemeral: true
        });
      }

      const rowVoltar = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('menu_navegacao_principal').setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
        )
      ];

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ embeds: [gerarEmbedStatusConfiguracoes()], components: rowVoltar, ephemeral: true });
      } else if (customId === 'abrir_config_painel') {
        return interaction.reply({ embeds: [gerarEmbedStatusConfiguracoes()], components: rowVoltar, ephemeral: true });
      } else {
        return interaction.update({ embeds: [gerarEmbedStatusConfiguracoes()], components: rowVoltar });
      }
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

    if (customId === 'menu_visual_textos') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update({ embeds: [gerarEmbedVisualTextos()], components: gerarBotoesVisualTextos() });
    }

    if (customId === 'menu_definir_config' || customId === 'page_canais') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update({ embeds: [gerarEmbedCanaisCategoria()], components: gerarSelectsCanaisCategoria() });
    }

    if (customId === 'page_cargos') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update({ embeds: [gerarEmbedCargos()], components: gerarSelectsCargos() });
    }

    if (customId === 'menu_gerenciar_perguntas') {
      if (!isDonoOuAdmin(interaction)) return interaction.reply({ content: '❌ Permissão insuficiente.', ephemeral: true });
      return interaction.update({ embeds: [gerarEmbedGerenciarPerguntas()], components: gerarBotoesGerenciarPerguntas() });
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
      return interaction.update({ embeds: [gerarEmbedGerenciarPerguntas()], components: gerarBotoesGerenciarPerguntas() });
    }

    if (customId === 'btn_ver_perguntas') {
      const embedPerguntas = new EmbedBuilder().setTitle('📋 Perguntas do Recrutamento').setColor(config.painelCorHex);
      if (config.perguntas.length === 0) {
        embedPerguntas.setDescription('❌ **Nenhuma pergunta cadastrada.**');
      } else {
        const lista = config.perguntas.map((p, i) => `**${i + 1}.**${p}`).join('\n\n');
        embedPerguntas.setDescription(lista);
      }

      const rowVoltar = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_gerenciar_perguntas').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
      );
      return interaction.update({ embeds: [embedPerguntas], components: [rowVoltar] });
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
              `🏢 **Servidor**\n${interaction.guild.name}`
            )
            .setColor(0x2ecc71)
            .setFooter({ text: '🤖 Organizações • Roleplay | Desenvolvido por Cetus' });

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
                `👮 **Instrutor:** ${interaction.user}\n\n` +
                '───────────────────────\n' +
                '🎉 Seja bem-vindo à organização!\n\n' +
                `📅 **Data:** ${dataAtual}`
              )
              .setColor(0x2ecc71)
              .setImage(config.bannerAprovadoUrl)
              .setFooter({ text: '🤖 Organizações • Roleplay | Desenvolvido por Cetus' });

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
              `🏢 **Servidor**\n${interaction.guild.name}`
            )
            .setColor(0xe74c3c)
            .setFooter({ text: '🤖 Organizações • Roleplay | Desenvolvido por Cetus' });

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
    if (customId === 'select_categoria') config.categoriaId = interaction.values[0];
    if (customId === 'select_canal_relatorios') config.relatorioChannelId = interaction.values[0];
    if (customId === 'select_canal_anuncios') config.anunciosChannelId = interaction.values[0];
    if (customId === 'select_cargos_aprovar') config.cargosAprovar = interaction.values;
    if (customId === 'select_cargos_remover') config.cargosRemover = interaction.values;
    if (customId === 'select_cargo_recrutador') config.cargoRecrutador = interaction.values[0];

    if (customId === 'select_cor_painel') {
      const valor = interaction.values[0];
      const mapaCores = {
        '0xe74c3c': 'Vermelho',
        '0x3498db': 'Azul',
        '0x2ecc71': 'Verde',
        '0xf1c40f': 'Amarelo',
        '0x9b59b6': 'Roxo',
        '0x2b2d31': 'Cinza Escuro / Preto'
      };

      config.painelCorHex = parseInt(valor, 16);
      config.painelCorNome = mapaCores[valor] || 'Customizada';

      await sincronizarPainelPublico(interaction.guild);
      return interaction.update({ embeds: [gerarEmbedVisualTextos()], components: gerarBotoesVisualTextos() });
    }

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
      return interaction.update({ embeds: [gerarEmbedGerenciarPerguntas()], components: gerarBotoesGerenciarPerguntas() });
    }

    await sincronizarPainelPublico(interaction.guild);

    if (['select_categoria', 'select_canal_relatorios', 'select_canal_anuncios'].includes(customId)) {
      return interaction.update({ embeds: [gerarEmbedCanaisCategoria()], components: gerarSelectsCanaisCategoria() });
    } else {
      return interaction.update({ embeds: [gerarEmbedCargos()], components: gerarSelectsCargos() });
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_editar_painel') {
      config.painelTitulo = interaction.fields.getTextInputValue('p_titulo');
      config.painelDescricao = interaction.fields.getTextInputValue('p_desc');
      
      const bannerInput = interaction.fields.getTextInputValue('p_banner');
      config.painelBannerUrl = bannerInput.trim().startsWith('http') ? bannerInput.trim() : null;

      await sincronizarPainelPublico(interaction.guild);
      return interaction.update({ embeds: [gerarEmbedVisualTextos()], components: gerarBotoesVisualTextos() });
    }

    if (interaction.customId === 'modal_editar_banner_aprovacao') {
      const aprovadoInput = interaction.fields.getTextInputValue('p_banner_aprovado');
      if (aprovadoInput.trim().startsWith('http')) {
        config.bannerAprovadoUrl = aprovadoInput.trim();
      }

      await sincronizarPainelPublico(interaction.guild);
      return interaction.update({ embeds: [gerarEmbedVisualTextos()], components: gerarBotoesVisualTextos() });
    }

    if (interaction.customId === 'modal_add_pergunta') {
      const novaPergunta = interaction.fields.getTextInputValue('texto_pergunta');
      config.perguntas.push(novaPergunta);

      await sincronizarPainelPublico(interaction.guild);
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
    .setTimestamp()
    .setFooter({ text: '🤖 Organizações • Roleplay | Desenvolvido por Cetus' });

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

  const textoMencao = config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '🔔 **Novo relatório recebido!**';

  await canal.send({ content: textoMencao, embeds: [embed], components: [row] });
}

function gerarEmbedPainelPrincipal(guild) {
  const embed = new EmbedBuilder()
    .setTitle(config.painelTitulo)
    .setDescription(config.painelDescricao)
    .setColor(config.painelCorHex)
    .addFields({
      name: '🛡️ Etapas do Processo',
      value: 
        `• 📝 Preenchimento do formulário\n` +
        `• ⏱️ Você terá **${config.tempoPerguntaTexto}** para responder cada pergunta\n` +
        `• 🔍 Análise da candidatura\n` +
        `• 🎶🎤 Entrevista com a equipe\n` +
        `• ✅ Resultado final`
    })
    .setFooter({ text: '🤖 Organizações • Roleplay | Desenvolvido por Cetus' });

  if (guild && guild.iconURL()) {
    embed.setThumbnail(guild.iconURL({ dynamic: true }));
  }

  if (config.painelBannerUrl) {
    embed.setImage(config.painelBannerUrl);
  }

  return embed;
}

function gerarBotaoFormularioComConfig() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('iniciar_formulario').setLabel('Formulário').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('abrir_config_painel').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
  );
}

function gerarEmbedMenuNavegacao() {
  return new EmbedBuilder()
    .setTitle('⚙️ Central de Configurações')
    .setDescription('Selecione uma das opções abaixo para gerenciar o sistema de recrutamento:')
    .setColor(config.painelCorHex);
}

// TELA IDENTICA À SUA IMAGEM
function gerarEmbedStatusConfiguracoes() {
  return new EmbedBuilder()
    .setTitle('⚙️ Configuração do Recrutamento')
    .setDescription('Confira abaixo o estado atual do sistema.')
    .setColor(config.painelCorHex)
    .addFields(
      { name: '📁 Categoria', value: config.categoriaId ? `<#${config.categoriaId}>` : 'Não definida', inline: false },
      { name: '📡 Canal de relatórios', value: config.relatorioChannelId ? `<#${config.relatorioChannelId}>` : 'Não definido', inline: false },
      { name: '📢 Canal de anúncios', value: config.anunciosChannelId ? `<#${config.anunciosChannelId}>` : 'Não definido', inline: false },
      { name: '👮 Cargo recrutador', value: config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : 'Não definido', inline: false },
      { name: '✅ Cargos adicionar ao aprovar', value: config.cargosAprovar.length ? config.cargosAprovar.map(c => `<@&${c}>`).join(', ') : 'Não definido', inline: false },
      { name: '🗑️ Cargos removidos ao aprovar', value: config.cargosRemover.length ? config.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ *Nenhum cargo configurado*', inline: false },
      { name: '❓ Perguntas', value: `\`${config.perguntas.length}/20\``, inline: false }
    );
}

function gerarBotoesConfigGeral() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_config_geral').setLabel('Config').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_visual_textos').setLabel('Visual & Textos').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_definir_config').setLabel('Definir configurações').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_gerenciar_perguntas').setLabel('Gerenciar perguntas').setEmoji('❓').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function gerarEmbedVisualTextos() {
  return new EmbedBuilder()
    .setTitle('🎨 Configurações de Visual & Textos')
    .setDescription(
      'Edite a aparência do painel público e mensagens do bot:\n\n' +
      '• **Título & Descrição**: Textos do painel principal.\n' +
      '• **Cor Borda Lateral**: Cor do painel público.\n' +
      '• **Banner de Aprovação**: URL da imagem do anúncio de aprovados.'
    )
    .setColor(config.painelCorHex)
    .addFields(
      { name: '📌 Título Atual', value: `\`${config.painelTitulo}\``, inline: false },
      { name: '🎨 Cor Lateral', value: `\`${config.painelCorNome}\``, inline: false },
      { name: '🖼️ Banner Aprovado Atual', value: config.bannerAprovadoUrl ? `[Clique para ver o Banner](${config.bannerAprovadoUrl})` : '❌ *Não configurado*', inline: false }
    );
}

function gerarBotoesVisualTextos() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_editar_painel').setLabel('✏️ Editar Título & Descrição').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_editar_banner_aprovacao').setLabel('🖼️ Definir Banner de Aprovação').setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_cor_painel')
        .setPlaceholder('🎨 Selecione a Cor da Barra Lateral')
        .addOptions([
          { label: 'Verde (Padrão Aprovado)', value: '0x2ecc71', description: 'Cor verde' },
          { label: 'Vermelho', value: '0xe74c3c', description: 'Cor vermelha clássica' },
          { label: 'Azul', value: '0x3498db', description: 'Cor azul' },
          { label: 'Amarelo', value: '0xf1c40f', description: 'Cor amarela' },
          { label: 'Roxo', value: '0x9b59b6', description: 'Cor roxa' },
          { label: 'Preto / Cinza Escuro', value: '0x2b2d31', description: 'Cor escura minimalista' }
        ])
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_navegacao_principal').setLabel('↩️ Voltar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function gerarEmbedCanaisCategoria() {
  return new EmbedBuilder()
    .setTitle('📁 Configurar Canais e Categoria')
    .setColor(config.painelCorHex)
    .addFields(
      { name: '📁 Categoria dos recrutamentos', value: config.categoriaId ? `<#${config.categoriaId}>` : '❌ *Não definida*', inline: false },
      { name: '📄 Canal de relatórios', value: config.relatorioChannelId ? `<#${config.relatorioChannelId}>` : '❌ *Não definido*', inline: false },
      { name: '📢 Canal de anúncios', value: config.anunciosChannelId ? `<#${config.anunciosChannelId}>` : '❌ *Não definido*', inline: false }
    );
}

function gerarSelectsCanaisCategoria() {
  return [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('select_categoria').setPlaceholder('📁 Selecione a categoria').setChannelTypes(ChannelType.GuildCategory)
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('select_canal_relatorios').setPlaceholder('📄 Selecione o canal de relatórios').setChannelTypes(ChannelType.GuildText)
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('select_canal_anuncios').setPlaceholder('📢 Selecione o canal de anúncios').setChannelTypes(ChannelType.GuildText)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_navegacao_principal').setLabel('↩️ Voltar').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('page_cargos').setLabel('Próximo: Cargos ➡️').setStyle(ButtonStyle.Primary)
    )
  ];
}

function gerarEmbedCargos() {
  return new EmbedBuilder()
    .setTitle('🛡️ Configurar Cargos')
    .setColor(config.painelCorHex)
    .addFields(
      { name: '🎖️ Cargo de aprovado', value: config.cargosAprovar.length ? config.cargosAprovar.map(c => `<@&${c}>`).join(', ') : '❌ *Não definido*', inline: false },
      { name: '🗑️ Cargos removidos ao aprovar', value: config.cargosRemover.length ? config.cargosRemover.map(c => `<@&${c}>`).join(', ') : '❌ *Nenhum cargo configurado*', inline: false },
      { name: '🛡️ Cargo de recrutador', value: config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '❌ *Não definido*', inline: false }
    );
}

function gerarSelectsCargos() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId('select_cargos_aprovar').setPlaceholder('🎖️ Selecione os cargos de aprovado').setMinValues(0).setMaxValues(5)
    ),
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId('select_cargos_remover').setPlaceholder('🗑️ Selecione os cargos a remover').setMinValues(0).setMaxValues(5)
    ),
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId('select_cargo_recrutador').setPlaceholder('🛡️ Selecione o cargo de recrutador')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('page_canais').setLabel('⬅️ Anterior: Canais').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_navegacao_principal').setLabel('↩️ Voltar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function gerarEmbedGerenciarPerguntas() {
  return new EmbedBuilder()
    .setTitle('❓ Gerenciar Perguntas & Tempo')
    .setDescription('Cadastre as perguntas do formulário e defina o tempo limite de resposta.')
    .setColor(config.painelCorHex)
    .addFields(
      { name: '⏱️ Tempo Atual por Pergunta', value: `\`${config.tempoPerguntaTexto}\``, inline: false },
      { name: `📋 Perguntas Cadastradas: ${config.perguntas.length}/20`, value: config.perguntas.length === 0 ? 'Nenhuma pergunta cadastrada.' : `Há ${config.perguntas.length} pergunta(s) ativa(s).` }
    );
}

function gerarBotoesGerenciarPerguntas() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_add_pergunta').setLabel('➕ Adicionar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_rem_pergunta').setLabel('➖ Remover última').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_ver_perguntas').setLabel('👁️ Ver perguntas').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_tempo_pergunta')
        .setPlaceholder('⏱️ Selecione o tempo por pergunta')
        .addOptions([
          { label: '30 Segundos', value: '30000', description: '30 segundos por pergunta' },
          { label: '1 Minuto', value: '60000', description: '1 minuto por pergunta' },
          { label: '3 Minutos (Padrão)', value: '180000', description: '3 minutos por pergunta' },
          { label: '5 Minutos', value: '300000', description: '5 minutos por pergunta' },
          { label: '10 Minutos', value: '600000', description: '10 minutos por pergunta' }
        ])
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_navegacao_principal').setLabel('↩️ Voltar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

client.login(process.env.DISCORD_TOKEN);
