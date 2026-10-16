await canal.send({
  content: textoMencao, // <-- ESTA LINHA CAUSAVA O ERRO SILENCIOSO DA API DO DISCORD!
  files,
  components: [...]
});
