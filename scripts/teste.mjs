// Testes rápidos da lógica de junção. Rode com: node scripts/teste.mjs
import assert from 'node:assert/strict';
import { parseCsv, mesclar, dataHoraBrasilia, normalizarModalidade, gerarIcs } from './atualizar.mjs';

assert.equal(dataHoraBrasilia('5/1/2027', '9:00'), '2027-01-05T09:00:00-03:00');
assert.equal(dataHoraBrasilia('2027-01-05', '9:00'), null);
assert.equal(normalizarModalidade('Vôlei feminino'), 'volei-feminino');
assert.equal(normalizarModalidade('Futebol sub-20'), 'base');
assert.equal(normalizarModalidade('Natação'), 'olimpicos');
assert.equal(normalizarModalidade('Futebol masculino'), 'futebol-masculino');

const auto = [{ id: 'api-futebol-masculino-1', modalidade: 'futebol-masculino', adversario: 'X', competicao: 'Brasileirão',
  inicio: '2026-12-01T21:30:00-03:00', local: '', mandante: true, transmissao: [], placar: null, status: 'agendado', fonte: 'automatica' },
  { id: 'api-futebol-masculino-2', modalidade: 'futebol-masculino', adversario: 'Y', inicio: '2026-12-05T16:00:00-03:00', transmissao: [], status: 'agendado', fonte: 'automatica' }];
const csv = `id,modalidade,adversario,competicao,data,hora,local,mando,onde_assistir,placar_fla,placar_adv,status,acao,observacao
api-futebol-masculino-1,,,,,,,,"Premiere; Globo",,,,,
api-futebol-masculino-2,,,,,,,,,,,,remover,
,Basquete,"Time, com vírgula",NBB,10/12/2026,20:00,,fora,SporTV,,,,,
,Basquete,,NBB,,,,,,,,,,`;
const { jogos, avisos } = mesclar(auto, parseCsv(csv));
assert.equal(jogos.length, 2);
assert.deepEqual(jogos[0].transmissao, ['Premiere', 'Globo']);
assert.equal(jogos[0].fonte, 'automatica+manual');
assert.equal(jogos[1].adversario, 'Time, com vírgula');
assert.equal(jogos[1].mandante, false);
assert.equal(avisos.length, 1);
const ics = gerarIcs(jogos, 'teste');
assert.match(ics, /TRIGGER:-PT1H/);
assert.match(ics, /DTSTART:20261202T003000Z/);
console.log('✓ Todos os testes passaram');

// ---- escudos (simula a API e o servidor de imagens, sem internet) ----
import { resolverEscudos, slug } from './atualizar.mjs';
import { rm, readFile as ler } from 'node:fs/promises';
import { existsSync } from 'node:fs';
assert.equal(slug('Athletico-PR'), 'athletico-pr');
const png = new Uint8Array([137, 80, 78, 71]);
const chamadas = [];
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url) => {
  chamadas.push(String(url));
  if (String(url).includes('/teams?search=')) {
    return new Response(JSON.stringify({ errors: [], response: [{ team: { name: 'Palmeiras', logo: 'https://media.api-sports.io/football/teams/121.png', country: 'Brazil' } }] }), { headers: { 'content-type': 'application/json' } });
  }
  return new Response(png, { headers: { 'content-type': 'image/png' } });
};
const cacheAntes = existsSync('data/escudos.json') ? await ler('data/escudos.json', 'utf8') : null;
// guarda o escudo verdadeiro do Flamengo para devolver depois do teste (o teste não pode apagar arquivos reais)
const flaAntes = existsSync('escudos/flamengo.png') ? await ler('escudos/flamengo.png') : null;
if (flaAntes) await rm('escudos/flamengo.png');
const jogosTeste = [
  { modalidade: 'futebol-masculino', adversario: 'Palmeiras Teste' },
  { modalidade: 'volei-feminino', adversario: 'Clube Teste', escudoAdvUrl: 'https://exemplo.com/escudo.png' },
  { modalidade: 'olimpicos', adversario: 'Regata Teste' },
];
try {
const probs = [];
const fla = await resolverEscudos(jogosTeste, 'chave-falsa', probs);
assert.equal(fla, 'escudos/flamengo.png');
assert.equal(jogosTeste[0].escudoAdv, 'escudos/futebol-palmeiras-teste.png');
assert.match(jogosTeste[1].escudoAdv, /^escudos\/volei-clube-teste-[0-9a-f]{6}\.png$/);
assert.equal(jogosTeste[2].escudoAdv, undefined);
assert.ok(!('escudoAdvUrl' in jogosTeste[1]));
assert.deepEqual(probs, []);
// segunda vez: não busca nem baixa de novo
chamadas.length = 0;
await resolverEscudos([{ modalidade: 'futebol-masculino', adversario: 'Palmeiras Teste' }], 'chave-falsa', []);
assert.equal(chamadas.length, 0);
} finally {
// limpeza
globalThis.fetch = fetchOriginal;
for (const f of ['escudos/flamengo.png', 'escudos/futebol-palmeiras-teste.png', jogosTeste[1].escudoAdv]) await rm(f, { force: true });
if (flaAntes) await (await import('node:fs/promises')).writeFile('escudos/flamengo.png', flaAntes);
}
if (cacheAntes === null) await rm('data/escudos.json', { force: true }); else await (await import('node:fs/promises')).writeFile('data/escudos.json', cacheAntes);
console.log('✓ Testes de escudos passaram');

// ---- classificação ----
import { montarClassificacao } from './atualizar.mjs';
const camps = montarClassificacao(parseCsv(`campeonato,modalidade,pos,time,j,v,e,d,sg,pts,atualizado
Brasileirão Série A,Futebol masculino,2,Palmeiras,34,,,,,73,
Brasileirão Série A,Futebol masculino,1,Flamengo,34,,,,,76,após a 34ª rodada
NBB,Basquete,1,Minas,5,5,,0,,,`));
assert.equal(camps.length, 2);
assert.equal(camps[0].linhas[0].time, 'Flamengo');
assert.equal(camps[0].atualizado, 'após a 34ª rodada');
assert.equal(camps[1].modalidade, 'basquete');
console.log('✓ Testes de classificação passaram');
const c2 = montarClassificacao(parseCsv(`campeonato,modalidade,pos,time,j,v,e,d,sg,pts,atualizado,link,nota
NBB,Basquete,3,Flamengo,6,5,,1,,,após 7/11,https://lnb.com.br/nbb/classificacao/,Tabela parcial`));
assert.equal(c2[0].link, 'https://lnb.com.br/nbb/classificacao/');
assert.equal(c2[0].nota, 'Tabela parcial');
console.log('✓ Nota e link da classificação ok');
// jogo da planilha sem id + mesmo jogo da API no mesmo dia -> um só
{
  const auto2 = [{ id: 'api-volei-feminino-2', modalidade: 'volei-feminino', adversario: 'Fluminense FC', inicio: '2026-11-13T00:00:00Z', transmissao: [], status: 'agendado', fonte: 'automatica' }];
  const { jogos: j2 } = mesclar(auto2, parseCsv(`id,modalidade,adversario,data,hora,onde_assistir
,Vôlei feminino,Fluminense,12/11/2026,21:00,SporTV 2`));
  assert.equal(j2.length, 1);
  assert.deepEqual(j2[0].transmissao, ['SporTV 2']);
  assert.equal(j2[0].adversario, 'Fluminense');
  console.log('✓ Sem jogos duplicados entre planilha e API');
}
import { mesmoTime } from './atualizar.mjs';
assert.ok(mesmoTime('Londrina', 'Sancor Seguros Vôlei'));
assert.ok(mesmoTime('Brasília', 'CAIXA/Brasília Basquete'));
assert.ok(mesmoTime('Brasília', 'Brasília Vôlei / BRB'));
assert.ok(mesmoTime('Bauru', 'Bauru Basket'));
assert.ok(mesmoTime('União Corinthians', 'Ceisc/União Corinthians'));
assert.ok(mesmoTime('Osasco', 'Osasco São Cristóvão Saúde'));
assert.ok(mesmoTime('Mackenzie', 'Batavo Mackenzie'));
assert.ok(mesmoTime('Paulistano/Barueri', 'Paulistano Barueri'));
assert.ok(!mesmoTime('Bauru', 'Minas Storm'));
console.log('✓ Nomes de times reconhecidos');

// ---- datas e horas impossíveis não travam nada ----
import { lerHora } from './atualizar.mjs';
assert.equal(dataHoraBrasilia('12/13/2026', '10:00'), null);
assert.equal(dataHoraBrasilia('31/02/2026', '10:00'), null);
assert.equal(lerHora('25:00'), null);
assert.equal(lerHora('A definir'), null);
assert.deepEqual(lerHora('16h'), { hh: '16', mm: '00' });
assert.deepEqual(lerHora('16h30'), { hh: '16', mm: '30' });
{
  const { jogos: j3, avisos: av3 } = mesclar([], parseCsv(`id,modalidade,adversario,data,hora
,Basquete,Time X,12/13/2026,20:00
,Basquete,Time Y,10/12/2026,A definir
,Futebol sub-17,Vasco,15/11/2026,10:00
,Futebol sub-20,Vasco,15/11/2026,15:00
semjogo,Basquete,,10/12/2026,20:00`));
  assert.equal(j3.length, 3, 'data impossível e linha sem adversário são ignoradas; sub-17 e sub-20 não se sobrepõem');
  assert.ok(j3.find((j) => j.adversario === 'Time Y').semHora, 'horário em texto vira "a definir"');
  assert.ok(av3.some((a) => a.includes('data inválida')));
  gerarIcs(j3, 'teste'); // não pode quebrar
}
// linha da planilha só com o canal não apaga o horário que veio da API
{
  const auto4 = [{ id: 'api-futebol-masculino-9', modalidade: 'futebol-masculino', adversario: 'Palmeiras', inicio: '2026-11-21T19:30:00Z', semHora: false, transmissao: [], status: 'agendado', fonte: 'automatica' }];
  const { jogos: j4 } = mesclar(auto4, parseCsv(`id,modalidade,adversario,data,hora,onde_assistir
,Futebol masculino,Palmeiras,21/11/2026,,Premiere`));
  assert.equal(j4.length, 1);
  assert.equal(j4[0].inicio, '2026-11-21T19:30:00Z');
  assert.equal(j4[0].semHora, false);
}
// jogo adiado não entra na agenda (sem alarme no horário antigo)
assert.doesNotMatch(gerarIcs([{ id: 'x', modalidade: 'basquete', adversario: 'A', inicio: '2026-12-01T20:00:00-03:00', transmissao: [], status: 'adiado' }], 't'), /VEVENT/);
console.log('✓ Datas, horários, base e adiados ok');

// ---- eventos olímpicos ----
import { montarEventos } from './atualizar.mjs';
{
  const { eventos, avisos } = montarEventos(parseCsv(`id,esporte,competicao,data_inicio,data_fim,hora,local,atletas,resultado,onde_assistir,status,acao,observacao,fonte
,Natação,Troféu Teste,10/12/2026,14/12/2026,,Rio de Janeiro,Fulana (100 m livre); Ciclano,,SporTV,,,,CBDA
,Judô,Grand Prix Teste,05/11/2026,,10:00,Lima,Beltrana (-57 kg),Ouro (Beltrana),,,,,IJF
,Remo,Sem data,,,,,,,,,,,
,Remo,Escondido,01/12/2026,,,,,,,,remover,,`));
  assert.equal(eventos.length, 2);
  assert.equal(avisos.length, 1);
  const nat = eventos.find((e) => e.esporte === 'Natação');
  assert.equal(nat.fim, '2026-12-14');
  assert.deepEqual(nat.atletas, ['Fulana (100 m livre)', 'Ciclano']);
  assert.equal(nat.status, 'agendado');
  assert.equal(nat.fonteInfo, 'CBDA');
  const judo = eventos.find((e) => e.esporte === 'Judô');
  assert.equal(judo.status, 'encerrado', 'com resultado vira encerrado');
  const ics = gerarIcs(eventos, 't');
  assert.match(ics, /DTSTART;VALUE=DATE:20261210/);
  assert.match(ics, /DTEND;VALUE=DATE:20261215/);
  assert.match(ics, /SUMMARY:Natação: Troféu Teste \(Flamengo\)/);
  console.log('✓ Eventos olímpicos ok');
}

// ---- leitura do site do Flamengo ----
import { lerProximosJogos, lerClassificacao, dataDoSite } from './site-flamengo.mjs';
{
  const hoje = new Date('2026-11-08T12:00:00-03:00');
  assert.equal(dataDoSite('12 Nov, 21:00', hoje).iso, '2026-11-12T21:00:00-03:00');
  assert.equal(dataDoSite('03 Jan, 16:00', hoje).iso, '2027-01-03T16:00:00-03:00', 'janeiro do ano seguinte');
  assert.equal(dataDoSite('20 Out, 19:00', hoje).iso, '2026-10-20T19:00:00-03:00', 'outubro que já passou');
  const card = (data, esporte, local, a, b, escA = true) => `<article class="X_matchCard" data-analytics-match-state="upcoming" data-analytics-match-competition="Superliga" data-analytics-match-sport="${esporte}" data-analytics-match-date="${data}" data-analytics-match-venue="${local}"><div class="Y_matchTeams"><div class="Z_matchTeamsEmblem">${escA ? '<img class="Z_teamEmblem" src="https://x/a.png"/>' : ''}<p class="T_title">${a}</p></div><span>X</span><div class="Z_matchTeamsEmblem"><img class="Z_teamEmblem" src="https://x/b.png"/><p class="T_title">${b}</p></div></div><a class="b" aria-label="Ingresso" href="https://ingresso.exemplo/1">Ingresso</a></article>`;
  const html = card('12 Nov, 21:00', 'Vôlei Feminino', 'Maracanãzinho (RJ)', 'Sesc RJ Flamengo', 'Fluminense') + card('17 Nov, 21:00', 'Vôlei Feminino', 'Bauru', 'SESI Vôlei Bauru', 'Sesc RJ Flamengo', false);
  const j = lerProximosJogos(html, 'volei', hoje);
  assert.equal(j.length, 2);
  assert.equal(j[0].modalidade, 'volei-feminino');
  assert.equal(j[0].mandante, true);
  assert.equal(j[0].adversario, 'Fluminense');
  assert.equal(j[0].escudoAdvUrl, 'https://x/b.png');
  assert.equal(j[0].ingresso, 'https://ingresso.exemplo/1');
  assert.equal(j[1].mandante, false);
  assert.equal(j[1].escudoAdvUrl, undefined, 'adversário sem escudo no site');
  const fut = lerProximosJogos(card('18 Nov, 20:30', 'Sub-20', 'Gávea', 'Flamengo', 'Vasco'), 'futebol', hoje);
  assert.equal(fut[0].modalidade, 'base'); assert.equal(fut[0].categoria, 'Sub-20');
  const tab = `<table class="A_standingsTable"><thead><tr><th>Times</th></tr></thead><tbody><tr><td><div><span>1</span><img src="https://x/f.png"/><span>Flamengo</span></div></td><td>76</td><td>34</td><td>23</td><td>7</td><td>4</td><td>71</td><td>29</td><td>42</td></tr></tbody></table>`;
  assert.deepEqual(lerClassificacao(tab)[0], { pos: 1, time: 'Flamengo', j: 34, v: 23, e: 7, d: 4, sg: 42, pts: 76, escudoAdvUrl: 'https://x/f.png' });
  assert.equal(lerClassificacao(tab.replace(/<td>34<\/td>/, '<td>0</td>')).length, 0, 'tabela zerada é ignorada');
  console.log('✓ Leitura do site do Flamengo ok');
}
