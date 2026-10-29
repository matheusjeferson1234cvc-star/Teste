'use strict';
// Tabela fictícia de regras do servidor Reduto RP, fornecida pelo usuário.
// Não representa legislação brasileira real. Atualize apenas este arquivo
// quando os valores do servidor mudarem.
const GRUPOS = [
  {id:'pessoa', nome:'Crimes Contra a Pessoa'},
  {id:'armas', nome:'Crimes com Armas e Violência'},
  {id:'patrimonio', nome:'Crimes Contra o Patrimônio'},
  {id:'organizacao', nome:'Crimes de Organização e Facção'},
  {id:'transito', nome:'Crimes de Trânsito e Ordem Pública'}
];
// Campos: codigo, nome, normal, reduzida, aumentada, multa fixa; unidade opcional, fianca opcional.
const RAW = [
 ['pessoa','01','Homicídio Doloso',40,32,52,3500],
 ['pessoa','02','Tentativa de Homicídio',30,24,39,1500],
 ['pessoa','03','Homicídio Qualificado',60,48,78,7000],
 ['pessoa','12','Sequestro',55,44,72,4000],
 ['pessoa','13','Resistência à Prisão',15,12,20,1500],
 ['pessoa','14','Desacato à Autoridade',10,8,13,1500],
 ['armas','05','Porte Ilegal de Arma de Fogo',35,16,46,2800],
 ['armas','06','Assalto à Mão Armada',50,40,65,2500],
 ['armas','27','Tráfico de Armas',50,40,65,12000,null,0,'5 armas ou mais'],
 ['armas','28','Posse de Munição',10,8,13,20,'munição'],
 ['patrimonio','07','Roubo de Veículo',30,28,39,3000],
 ['patrimonio','08','Furto',15,12,20,1500],
 ['patrimonio','17','Estelionato',30,24,39,2500],
 ['patrimonio','18','Contrabando',30,24,39,3500],
 ['patrimonio','20','Roubo a Caixinha',25,20,33,1700],
 ['patrimonio','21','Dinheiro Sujo',25,20,33,3000,null,5000],
 ['patrimonio','23','Destruição de Patrimônio Público',20,16,26,4500],
 ['patrimonio','24','Roubo a Loja',30,24,39,1500],
 ['patrimonio','25','Roubo ao Banco',60,48,78,12000],
 ['patrimonio','26','Roubo à Joalheria',60,48,78,10000],
 ['organizacao','04','Tráfico de Drogas',20,32,26,40,'droga'],
 ['organizacao','09','Formação de Quadrilha',35,28,46,2500],
 ['organizacao','10','Corrupção Ativa',30,24,39,3000],
 ['organizacao','11','Lavagem de Dinheiro',30,24,39,3500],
 ['transito','15','Direção Perigosa',10,8,13,2000],
 ['transito','16','Fuga da Polícia',15,12,20,3000],
 ['transito','19','Atrapalhar Recrutamento',60,48,78,1200],
 ['transito','22','Corrida Ilegal',15,12,20,2000,null,3000],
 ['transito','29','Uso Indevido de Canais Públicos',40,32,52,2500],
 ['transito','30','Posse de Ferramentas Ilegais',15,12,20,1800,null,2600],
 ['transito','31','Ocultação Facial',25,20,33,2000,null,5000]
];
const ARTIGOS = RAW.map(([grupo,codigo,nome,normal,reduzida,aumentada,multa,unidade,fianca,observacao]) => Object.freeze({
 grupo, codigo, artigo:`${codigo}/2025`, nome,
 normal,reduzida,aumentada,multa,unidade:unidade||null,fianca:fianca||0,observacao:observacao||null
}));
const POR_CODIGO = new Map(ARTIGOS.map(a=>[a.codigo,a]));
const formatarMoeda = valor => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(valor);
const normalizar = texto => String(texto??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function buscar(termo='',grupo='todos') {
 const buscado=normalizar(termo);
 return ARTIGOS.filter(a => (grupo==='todos'||a.grupo===grupo) &&
   (!buscado||normalizar(`${a.artigo} ${a.codigo} ${a.nome} ${a.grupo}`).includes(buscado)));
}
function calcular(selecionados=[],modo='normal',quantidades={},multaExtra=0) {
 if(!['normal','reduzida','aumentada'].includes(modo)) throw Error('Tipo de pena inválido');
 const distintos=[...new Set(selecionados)].map(cod=>POR_CODIGO.get(cod)).filter(Boolean);
 const linhas=distintos.map(a=>{
   const qtd = a.unidade ? Number(quantidades[a.codigo]??0) : 1;
   if(a.unidade && (!Number.isSafeInteger(qtd)||qtd<1||qtd>100000)) return {...a, quantidade:null,pena:a[modo],valorMulta:null};
   return {...a, quantidade:qtd,pena:a[modo],valorMulta:a.multa*qtd};
 });
 const extra=Number(multaExtra);
 if(!Number.isSafeInteger(extra)||extra<0||extra>10000000) throw Error('Multa adicional inválida');
 return {
   linhas,pendentes:linhas.filter(a=>a.valorMulta===null).map(a=>a.codigo),
   totalPena:linhas.reduce((s,a)=>s+a.pena,0),
   totalMultaArtigos:linhas.reduce((s,a)=>s+(a.valorMulta||0),0),
   multaExtra:extra,
   totalMulta:linhas.reduce((s,a)=>s+(a.valorMulta||0),0)+extra,
   totalFianca:linhas.reduce((s,a)=>s+a.fianca,0),modo
 };
}
module.exports={GRUPOS,ARTIGOS,POR_CODIGO,formatarMoeda,normalizar,buscar,calcular};
