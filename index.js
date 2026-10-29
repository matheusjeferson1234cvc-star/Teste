// CETUS V3.1 FLAT — ponto de entrada. Todos os módulos ficam na raiz do projeto.

'use strict';
require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, Partials, REST, Routes,
  MessageFlags
} = require('discord.js');
const recrutamento = require('./cetus-recrutamento');
const registro = require('./cetus-registro');
const ocorrencias = require('./cetus-ocorrencias');
const diagnostico = require('./cetus-diagnostico');
const gifs = require('./cetus-gifs');
const modulos = [gifs, diagnostico, ocorrencias, registro, recrutamento];
const { aviso, comLogo, painel, responder, donoAdmin } = require('./cetus-comum');
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
  console.log(`🤖 CETUS V3.1 FLAT: ${ready.user.tag} | GIFs disponíveis`);
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
