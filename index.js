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
  SlashCommandBuilder
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

// Armazenamento temporário em memória das configurações
const config = {
  relatorioChannelId: null,
  anunciosChannelId: null,
  cargosAprovar: [],
  cargosRemover: [],
  cargoRecrutador: null,
  perguntas: [] // Até 20 perguntas configuráveis
};

// Controle de sessões dos candidatos (userId -> { step, respostas, rgImageUrl })
const sessoesCandidatos = new Map();

// Registro automático de Slash Commands e Inicialização
client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Bot de recrutamento online como: ${c.user.tag}`);

  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abre o painel de configuração do recrutamento')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // DICA: Se quiser que o comando apareça INSTANTANEAMENTE no seu servidor de teste,
    // substitua a linha abaixo colando o ID do seu servidor no local indicado:
    // await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, 'ID_DO_SEU_SERVIDOR_AQUI'), { body: commands });

    console.log('🔄 Registrando comando /painel...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Comando /painel registrado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar o comando /painel:', error);
  }
});

// Gerenciamento de Interações
client.on(Events.InteractionCreate, async (interaction) => {
  // Comando Slash /painel
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'painel') {
      await interaction.reply({
        embeds: [gerarEmbedConfigGeral()],
        components: gerarBotoesConfigGeral(),
        ephemeral: true
      });
    }
    return;
  }

  // Interações de Botões
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Enviar o painel oficial para o canal
    if (customId === 'enviar_painel_recrutamento') {
      await interaction.channel.send({
        embeds: [gerarEmbedPainelPrincipal()],
        components: [gerarBotaoFormulario()]
      });
      return interaction.reply({ content: '✅ Painel de recrutamento enviado no canal!', ephemeral: true });
    }

    // Candidato clica no botão "Formulário"
    if (customId === 'iniciar_formulario') {
      sessoesCandidatos.set(interaction.user.id, {
        step: 0, // 0 = Aguardando foto do RG
        respostas: [],
        rgImageUrl: null
      });

      try {
        const dm = await interaction.user.createDM();
        await dm.send(
          '📌 **Etapa 1:** Envie uma **foto legível do seu RG** aqui nas mensagens privadas para iniciar o processo.'
        );
        return interaction.reply({
          content: '📬 Mensagem enviada no seu privado! Dá uma olhada na sua DM.',
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          content: '❌ Suas mensagens privadas (DM) estão fechadas. Abra suas DMs para continuar.',
          ephemeral: true
        });
      }
    }

    // Navegação Interna (interaction.update mantém o painel aberto sem sumir)
    if (customId === 'menu_config_geral') {
      return interaction.update({
        embeds: [gerarEmbedConfigGeral()],
        components: gerarBotoesConfigGeral()
      });
    }

    if (customId === 'menu_definir_config') {
      return interaction.update({
        embeds: [gerarEmbedDefinirConfig()],
        components: gerarSelectsDefinirConfig()
      });
    }

    if (customId === 'menu_gerenciar_perguntas') {
      return interaction.update({
        embeds: [gerarEmbedGerenciarPerguntas()],
        components: gerarBotoesGerenciarPerguntas()
      });
    }

    // Adicionar pergunta (Modal)
    if (customId === 'btn_add_pergunta') {
      if (config.perguntas.length >= 20) {
        return interaction.reply({ content: '❌ Limite máximo de 20 perguntas atingido!', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_add_pergunta')
        .setTitle('Adicionar Pergunta');

      const inputPergunta = new TextInputBuilder()
        .setCustomId('texto_pergunta')
        .setLabel(`Pergunta #${config.perguntas.length + 1}`)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(inputPergunta));
      return interaction.showModal(modal);
    }

    // Remover última pergunta
    if (customId === 'btn_rem_pergunta') {
      if (config.perguntas.length === 0) {
        return interaction.reply({ content: '❌ Não há nenhuma pergunta para remover.', ephemeral: true });
      }
      config.perguntas.pop();
      return interaction.update({
        embeds: [gerarEmbedGerenciarPerguntas()],
        components: gerarBotoesGerenciarPerguntas()
      });
    }

    // Listar perguntas cadastradas
    if (customId === 'btn_ver_perguntas') {
      const lista = config.perguntas.map((p, i) => `**${i + 1}.** ${p}`).join('\n') || 'Nenhuma pergunta cadastrada.';
      return interaction.reply({ content: `📋 **Perguntas Atuais:**\n\n${lista}`, ephemeral: true });
    }

    // Aprovação / Reprovação na aba de Relatório
    if (customId.startsWith('aprovar_') || customId.startsWith('reprovar_')) {
      const [acao, userId] = customId.split('_');
      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (acao === 'aprovar') {
        if (member && config.cargosAprovar.length > 0) {
          await member.roles.add(config.cargosAprovar).catch(() => null);
        }
        if (member && config.cargosRemover.length > 0) {
          await member.roles.remove(config.cargosRemover).catch(() => null);
        }

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

  // Interações de Menus Seletores (Atualiza mantendo o painel aberto)
  if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
    const customId = interaction.customId;

    if (customId === 'select_canal_relatorios') config.relatorioChannelId = interaction.values[0];
    if (customId === 'select_canal_anuncios') config.anunciosChannelId = interaction.values[0];
    if (customId === 'select_cargos_aprovar') config.cargosAprovar = interaction.values;
    if (customId === 'select_cargos_remover') config.cargosRemover = interaction.values;
    if (customId === 'select_cargo_recrutador') config.cargoRecrutador = interaction.values[0];

    return interaction.update({
      embeds: [gerarEmbedDefinirConfig()],
      components: gerarSelectsDefinirConfig()
    });
  }

  // Envio de Modais
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_add_pergunta') {
      const novaPergunta = interaction.fields.getTextInputValue('texto_pergunta');
      config.perguntas.push(novaPergunta);

      return interaction.update({
        embeds: [gerarEmbedGerenciarPerguntas()],
        components: gerarBotoesGerenciarPerguntas()
      });
    }
  }
});

// Fluxo de Mensagens no Privado (DM)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.guild) return;

  const sessao = sessoesCandidatos.get(message.author.id);
  if (!sessao) return;

  // Etapa 0: Receber a imagem do RG
  if (sessao.step === 0) {
    const anexo = message.attachments.first();
    if (!anexo || !anexo.contentType?.startsWith('image/')) {
      return message.reply('❌ Por favor, envie uma **imagem válida** contendo a foto do seu RG.');
    }

    sessao.rgImageUrl = anexo.url;
    sessao.step = 1;

    if (config.perguntas.length === 0) {
      await enviarRelatorio(message.author, sessao);
      sessoesCandidatos.delete(message.author.id);
      return message.reply('✅ Foto do RG recebida! Seu formulário foi enviado para análise.');
    }

    await message.reply(`✅ **Foto do RG Recebida!**\n\n**Pergunta 1/${config.perguntas.length}:**\n${config.perguntas[0]}`);
    return;
  }

  // Etapas 1 a N: Responder às perguntas em sequência
  if (sessao.step > 0 && sessao.step <= config.perguntas.length) {
    sessao.respostas.push({
      pergunta: config.perguntas[sessao.step - 1],
      resposta: message.content
    });

    if (sessao.step < config.perguntas.length) {
      const proxima = config.perguntas[sessao.step];
      sessao.step += 1;
      await message.reply(`**Pergunta ${sessao.step}/${config.perguntas.length}:**\n${proxima}`);
    } else {
      await enviarRelatorio(message.author, sessao);
      sessoesCandidatos.delete(message.author.id);
      await message.reply('🎉 **Formulário concluído!** Suas respostas foram enviadas para avaliação.');
    }
  }
});

// Função para enviar o relatório completo no canal configurado
async function enviarRelatorio(user, sessao) {
  if (!config.relatorioChannelId) return;

  const canal = await client.channels.fetch(config.relatorioChannelId).catch(() => null);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle(`📝 Formulário de Recrutamento - ${user.username}`)
    .setColor(0x2b2d31)
    .setThumbnail(user.displayAvatarURL())
    .setImage(sessao.rgImageUrl)
    .addFields({ name: '👤 Candidato', value: `${user} (${user.id})` })
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
      name: '⚙️ Configuração — status do sistema.',
      value: `❓ **Perguntas** — gerencie as perguntas.\n⚙️ **Definir configurações** — altere os canais e cargos.`
    });
}

function gerarBotoesConfigGeral() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_definir_config').setLabel('⚙️ Definir configurações').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_gerenciar_perguntas').setLabel('❓ Gerenciar perguntas').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('enviar_painel_recrutamento').setLabel('📤 Enviar Painel').setStyle(ButtonStyle.Success)
    )
  ];
}

function gerarEmbedDefinirConfig() {
  return new EmbedBuilder()
    .setTitle('⚙️ Configurações do Sistema')
    .setDescription('Confira abaixo o status atual do sistema.')
    .setColor(0x2b2d31)
    .addFields(
      { name: '📢 Canal de relatórios', value: config.relatorioChannelId ? `<#${config.relatorioChannelId}>` : '❌ Não definido' },
      { name: '📢 Canal de anúncios', value: config.anunciosChannelId ? `<#${config.anunciosChannelId}>` : '❌ Não definido' },
      { name: '👑 Cargo recrutador', value: config.cargoRecrutador ? `<@&${config.cargoRecrutador}>` : '❌ Não definido' },
      { name: '✅ Cargos a adicionar ao aprovar', value: config.cargosAprovar.length ? config.cargosAprovar.map(c => `<@&${c}>`).join(', ') : 'Nenhum' },
      { name: '🗑️ Cargos a remover ao aprovar', value: config.cargosRemover.length ? config.cargosRemover.map(c => `<@&${c}>`).join(', ') : 'Nenhum' }
    );
}

function gerarSelectsDefinirConfig() {
  return [
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
      new RoleSelectMenuBuilder().setCustomId('select_cargos_remover').setPlaceholder('🗑️ Selecione os cargos a remover').setMinValues(0).setMaxValues(5)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_config_geral').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function gerarEmbedGerenciarPerguntas() {
  return new EmbedBuilder()
    .setTitle('❓ Gerenciar Perguntas')
    .setDescription('Controle as perguntas utilizadas no formulário.')
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
      new ButtonBuilder().setCustomId('menu_config_geral').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
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

function gerarBotaoFormulario() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('iniciar_formulario').setLabel('📝 Formulário').setStyle(ButtonStyle.Secondary)
  );
}

client.login(process.env.DISCORD_TOKEN);
