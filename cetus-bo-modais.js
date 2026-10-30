'use strict';
// Modais V2 do Boletim Reduto RP: todas as entradas em Label (type 18).
// O Discord permite somente 5 campos por modal: ID, local, descrição, artigos e equipe.
// Evidências continuam em um modal complementar opcional após salvar o BO.
const { LabelBuilder, UserSelectMenuBuilder, ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelType } = require('discord.js');
const { modal, campo, upload } = require('./cetus-comum');
const penal = require('./cetus-codigo-penal');
const MODOS = new Set(['normal','reduzida','aumentada']);
const LIMITE = 20;

function textoArtigos(bo = null) {
  if (!bo) return '';
  const codigos = (bo.artigos||[]).map(c=>{
    const a=penal.POR_CODIGO.get(c);
    if(!a) return null;
    return c + (a.unidade ? `x${bo.quantidades?.[c]||1}` : '');
  }).filter(Boolean).join(', ');
  const extra=Number(bo.multaExtra)||0;
  return `${codigos}${bo.modoPena&&bo.modoPena!=='normal'?`; pena=${bo.modoPena}`:''}${extra?`; extra=${extra}`:''}`.trim();
}

// Exemplos: 01, 02, 28x12; pena=reduzida; extra=200
// Não executa código do usuário; somente valida códigos do catálogo do Reduto.
function interpretarArtigos(bruto) {
  const texto=String(bruto??'').trim();
  if(!texto) return {artigos:[],modoPena:'normal',quantidades:{},multaExtra:0};
  const partes=texto.split(';').map(s=>s.trim()).filter(Boolean);
  let modoPena='normal',multaExtra=0;
  const tokens=[];
  for(const parte of partes) {
    let m=parte.match(/^(?:pena|modo)\s*[:=]\s*(normal|reduzida|aumentada)$/i);
    if(m) {modoPena=m[1].toLowerCase();continue;}
    m=parte.match(/^(?:extra|multaextra)\s*[:=]\s*(\d{1,8})$/i);
    if(m) {multaExtra=Number(m[1]);continue;}
    if(/^(?:pena|modo|extra|multaextra)\s*[:=]/i.test(parte)) throw Error(`Opção inválida: "${parte}". Use pena=normal/reduzida/aumentada ou extra=500.`);
    tokens.push(...parte.split(/[,\n]+/g).map(s=>s.trim()).filter(Boolean));
  }
  if(tokens.length>LIMITE) throw Error(`Selecione até ${LIMITE} artigos diferentes por boletim.`);
  const artigos=[],quantidades={};
  for(const token of tokens) {
    const t=token.replace(/^art(?:igo)?\.?\s*/i,'').trim();
    const m=t.match(/^(\d{1,2})(?:\s*\/\s*2025)?(?:\s*[x×*]\s*(\d{1,6}))?$/i);
    if(!m) throw Error(`Artigo inválido: "${token}". Exemplo: 01, 02, 28x10.`);
    const codigo=m[1].padStart(2,'0'), a=penal.POR_CODIGO.get(codigo);
    if(!a) throw Error(`Art. ${codigo}/2025 não está no catálogo do Reduto.`);
    if(artigos.includes(codigo)) throw Error(`Art. ${codigo}: artigo repetido. Use apenas uma vez.`);
    if(m[2] && !a.unidade) throw Error(`Art. ${codigo}: quantidade não se aplica a este artigo.`);
    if(a.unidade) {
      const qtd=Number(m[2]);
      if(!Number.isSafeInteger(qtd)||qtd<1||qtd>100000) throw Error(`Art. ${codigo}: informe a quantidade como ${codigo}x10 (1 a 100000).`);
      quantidades[codigo]=qtd;
    }
    artigos.push(codigo);
  }
  if(!MODOS.has(modoPena)) throw Error('Modalidade de pena inválida.');
  if(!Number.isSafeInteger(multaExtra)||multaExtra>10000000) throw Error('Multa extra inválida (máximo R$ 10.000.000).');
  const soma=penal.calcular(artigos,modoPena,quantidades,multaExtra);
  if(soma.pendentes.length) throw Error(`Faltam quantidades: ${soma.pendentes.map(c=>`Art. ${c}`).join(', ')}.`);
  return {artigos,modoPena,quantidades,multaExtra};
}
function modalBO(bo=null, tipo='prisao', info) {
  const tipoFinal=bo?.tipo||tipo;
  const cod=bo?`bo:editar:${bo.codigo}`:`bo:criar:${tipoFinal}`;
  const lArtigos=campo('bo_artigos','⚖️ Artigos, pena e multa extra',{
    value:textoArtigos(bo),max:500,required:false,paragraph:true,
    placeholder:'01, 02, 28x10; pena=normal; extra=0'
  }).setDescription('Vários códigos separados por vírgula. Ex.: 01, 02, 28x10; pena=reduzida');
  return modal(cod,bo?`Editar ${bo.codigo}`:`Novo B.O.: ${info.nome}`,[
    campo('bo_id','👤 ID do personagem (RP)',{value:bo?.personagemId,max:80,placeholder:'Ex.: 1234'}),
    campo('bo_local','📍 Local da ocorrência',{value:bo?.local,max:150,placeholder:'Ex.: Praça Central'}),
    campo('bo_relato',info.campoDescricao,{value:bo?.relato,max:1800,paragraph:true,placeholder:info.exemplo}),
    lArtigos,
    campoEquipe(bo)
  ]);
}
function campoEquipe(bo=null) {
  const select = new UserSelectMenuBuilder().setCustomId('bo_policiais')
    .setMinValues(0).setMaxValues(10).setRequired(false)
    .setPlaceholder('Escolha até 10 colegas policiais');
  if (bo?.policiais?.length) select.setDefaultUsers(...bo.policiais);
  return new LabelBuilder()
    .setLabel('👮 Colegas policiais (opcional)')
    .setDescription('Selecione os participantes agora. O autor já entra automaticamente.')
    .setUserSelectMenuComponent(select);
}
function modalPesquisa() {return modal('bo:codigo_modal','Pesquisar Código Penal Reduto',[
  campo('bo_termo','🔎 Nome ou número do artigo',{max:60,required:false,placeholder:'Ex.: 28, veículo, lavagem; vazio = todos'})
]);}
function modalEquipe(bo) {
  return modal(`bo:equipe_modal:${bo.codigo}`,'Equipe policial do B.O.',[campoEquipe(bo)]);
}
function modalArquivos(bo, restante) {
  return modal(`bo:arquivos_modal:${bo.codigo}`,'Adicionar evidências ao B.O.',[
    upload('bo_anexos','📁 Fotos e vídeos',Math.max(1,restante),true)
  ]);
}
function modalConfig(c) {
  const canal=new ChannelSelectMenuBuilder().setCustomId('bo_cfg_canal')
    .setChannelTypes(ChannelType.GuildText).setMinValues(1).setMaxValues(1).setRequired(true)
    .setPlaceholder('Selecione o canal dos relatórios');
  if(c.canalId) canal.setDefaultChannels(c.canalId);
  const campos=[new LabelBuilder().setLabel('📢 Canal onde os B.O.s são publicados').setChannelSelectMenuComponent(canal)];
  for(const [id, titulo, roleId] of [
    ['geral','🛡️ Cargo geral da corporação',c.cargoId],
    ['prisao','🚓 Cargo para Prisão',c.cargosTipos?.prisao],
    ['apreensao','📦 Cargo para Apreensão',c.cargosTipos?.apreensao],
    ['multa','💰 Cargo para Multa',c.cargosTipos?.multa]
  ]) {
    const role=new RoleSelectMenuBuilder().setCustomId('bo_cfg_'+id)
      .setMinValues(0).setMaxValues(1).setRequired(false).setPlaceholder('Selecione o cargo (opcional)');
    if(roleId) role.setDefaultRoles(roleId);
    campos.push(new LabelBuilder().setLabel(titulo).setRoleSelectMenuComponent(role));
  }
  return modal('bo:config_modal','Configurações do Boletim',campos);
}
module.exports={modalBO,modalPesquisa,modalEquipe,modalArquivos,modalConfig,interpretarArtigos,textoArtigos};
