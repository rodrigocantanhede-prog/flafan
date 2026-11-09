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
{
  const auto5 = [{ id: 'site-futebol-feminino-2026-11-11-botafogo', modalidade: 'futebol-feminino', adversario: 'Botafogo', inicio: '2026-11-11T15:00:00-03:00', transmissao: [], status: 'agendado', fonte: 'automatica' }];
  const { jogos: j5 } = mesclar(auto5, parseCsv(`id,modalidade,adversario,data,acao
,Futebol feminino,A definir,11/11/2026,remover`));
  assert.equal(j5.length, 1, 'remover de outro jogo no mesmo dia não apaga o jogo do site');
  const { jogos: j6 } = mesclar(auto5, parseCsv(`id,modalidade,adversario,data,acao
,Futebol feminino,Botafogo,11/11/2026,remover`));
  assert.equal(j6.length, 0, 'remover com o mesmo adversário apaga');
  console.log('✓ Remover só o jogo certo');
}
{
  const { lerTabelaLnb, lerTabelaCbv } = await import('./tabelas-oficiais.mjs');
  const { juntarComPlanilha } = await import('./atualizar.mjs');
  const lnbLinha = (p, nome, j, v, d, sal, pon) => `<tr class=""><td class="open_content headcol"><div class="number"><strong>${p}</strong></div><div class="logo" style="max-height:32px;"><img src="https://lnb.com.br/l${p}.png" alt="${nome}" ></div></td><td data-sort-value="1">1</td><td data-sort-value="${pon}">${pon}</td><td data-sort-value="1">1</td><td data-sort-value="${j}">${j}</td><td data-sort-value="${v}">${v}</td><td data-sort-value="${d}">${d}</td><td data-sort-value="1">1-0</td><td data-sort-value="1">1-0</td><td data-sort-value="500">500</td><td data-sort-value="400">400</td><td data-sort-value="${sal}">${sal}</td><td></td><td data-sort-value="${pon}.0">${pon}</td></tr><tr><td colspan="12">detalhes</td></tr>`;
  const nomes = ['Minas Storm', 'UNIFACISA', 'Pinheiros', 'Flamengo', 'Mogi', 'Paulistano', 'Sesi Franca', 'Bauru Basket'];
  const lnb = `<table class="table_ap table-wrapper"><thead><tr><th>EQUIPES</th></tr></thead><tbody>${nomes.map((n, i) => lnbLinha(i + 1, n, 6, 6 - i % 6, i % 6, 10 - i, 12 - i)).join('')}</tbody></table><table class="table_pon"></table>`;
  const t = lerTabelaLnb(lnb);
  assert.equal(t.length, 8);
  assert.deepEqual(t[1], { pos: 2, time: 'Unifacisa', j: 6, v: 5, e: null, d: 1, sg: 9, pts: 11, ap: 1, escudoAdvUrl: 'https://lnb.com.br/l2.png' });
  assert.equal(lerTabelaLnb(lnb.replace(/<tr class="">[\s\S]*?<\/tr>/, '')).length, 0, 'tabela incompleta (sem o 1º) é ignorada');
  const cbvLinha = (p, nome, pts, j, v, d) => `<tr class="group"><td><span>${p}</span></td><td><div><img alt="" src="/_next/image?url=https%3A%2F%2Fassets.volleystation.com%2Fwebsite%2Fteams%2F${p}%2Fbadge.png&amp;w=64&amp;q=75"/><span class="x">${nome}</span></div></td><td>${pts}</td><td>${j}</td><td>${v}</td><td>${d}</td><td>15</td><td>1</td></tr>`;
  const vnomes = ['SESI VOLEI BAURU', 'SESC RJ FLAMENGO', 'DENTIL PRAIA CLUBE', 'GERDAU MINAS', 'FLUMINENSE F.C.', 'E.C. PINHEIROS', 'BRUSQUE VÔLEI', 'PAULISTANO BARUERI'];
  const cbv = `<table><thead><tr><th>#</th></tr></thead><tbody>${vnomes.map((n, i) => cbvLinha(i + 1, n, 15 - i, 5, 5 - i % 5, i % 5)).join('')}</tbody></table>`;
  const s = lerTabelaCbv(cbv);
  assert.equal(s.length, 8);
  assert.equal(s[0].time, 'Sesi Volei Bauru'); assert.equal(s[1].time, 'Sesc RJ Flamengo'); assert.equal(s[4].time, 'Fluminense F.C.');
  assert.equal(s[0].escudoAdvUrl, 'https://assets.volleystation.com/website/teams/1/badge.png');
  assert.equal(s[2].pts, 13); assert.equal(s[2].j, 5);
  assert.equal(lerTabelaCbv(cbv.replace(/>5<\/td>/g, '>0</td>')).length, 0, 'tabela zerada é ignorada');
  const junta = juntarComPlanilha({ nome: 'Superliga Feminina', linhas: s }, { nome: 'Superliga Feminina', nota: 'obs', linhas: [{ time: 'Sesi Vôlei Bauru' }, { time: 'Fluminense', escudoAdvUrl: 'https://x/flu.png' }] });
  assert.equal(junta.linhas[0].time, 'Sesi Vôlei Bauru'); assert.equal(junta.linhas[4].time, 'Fluminense');
  assert.equal(junta.linhas[4].escudoAdvUrl, 'https://assets.volleystation.com/website/teams/5/badge.png', 'escudo do site tem preferência');
  assert.equal(junta.nota, 'obs');
  console.log('✓ Tabelas da LNB e da CBV ok');
}
{
  const { lerJogosDoTime, lerTabela, lerFases } = await import('./cbf.mjs');
  const { juntarCbf } = await import('./atualizar.mjs');
  const pagina = (obj) => `<script>self.__next_f.push([1,${JSON.stringify('28:' + JSON.stringify(obj).slice(0, 40))}])</script><script>self.__next_f.push([1,${JSON.stringify(JSON.stringify(obj).slice(40))}])</script>`;
  const jogo = (id, data, m, gm, v, gv, pm = '0', pv = '0') => ({ id_jogo: id, rodada: '1', grupo: 'GRUPO 1', local: 'Luso Brasileiro - Rio de Janeiro - RJ', campeonato: 'Copa do Brasil', data: ` ${data}`, hora: '16:30',
    mandante: { id: m === 'Flamengo' ? '20016' : '1', nome: m, url_escudo: 'https://conteudo.cbf.com.br/clubes/1/escudo.jpg', gols: gm, panaltis: pm },
    visitante: { id: v === 'Flamengo' ? '20016' : '1', nome: v, url_escudo: 'https://conteudo.cbf.com.br/clubes/1/escudo.jpg', gols: gv, panaltis: pv } });
  const html = pagina({ data: [jogo('1', '08/09/2026', 'Flamengo', '6', 'Forte', '0'), jogo('2', '08/10/2026', 'Flamengo', '2', 'Vasco da Gama Saf', '2', '4', '3'),
    jogo('2', '08/10/2026', 'Flamengo', '2', 'Vasco da Gama Saf', '2', '4', '3'), jogo('3', '27/10/2026', 'Operário', '0', 'Flamengo', '0'), jogo('4', '20/12/2026', 'Flamengo', '', 'Bahia', '')] });
  const c = { campeonato: 'copa-do-brasil', categoria: 'sub-20', nome: 'Copa do Brasil Sub-20', modalidade: 'base', categoriaApp: 'Sub-20' };
  const js = lerJogosDoTime(html, c, new Date('2026-11-08T12:00:00-03:00').getTime(), '2026-10-01');
  assert.equal(js.length, 3, 'filtra pela data "desde" e tira repetidos');
  assert.deepEqual(js[0].placar, { flamengo: 2, adversario: 2 }); assert.equal(js[0].adversario, 'Vasco da Gama');
  assert.equal(js[0].observacao, 'Pênaltis: Flamengo 4 x 3'); assert.equal(js[0].categoria, 'Sub-20'); assert.equal(js[0].mandante, true);
  assert.equal(js[1].mandante, false); assert.equal(js[1].status, 'encerrado');
  assert.equal(js[2].placar, null); assert.equal(js[2].status, 'agendado'); assert.equal(js[2].inicio, '2026-12-20T16:30:00-03:00');
  const linha = (p, t, cod, j) => ({ cod_time: cod, time: t, escudo: 'https://e/' + cod + '.jpg', posicao: String(p), pontos: String(30 - p), jogos: String(j), vitorias: '5', empates: '2', derrotas: '1', gols_pro: '20', gols_contra: '10', gols_saldo: '10', cartoes_vermelho: '1', cartoes_amarelo: '20', aproveitamento: '60', ultimos_jogos: ['V', 'E', 'D'] });
  const tab = pagina({ competitionData: { competitionId: '1', phase: { fase_id: '9', fase_nome: 'Final', fase_tipo: 'eliminacao' }, phasesList: [{ fase_id: '8', fase_nome: '1ª Fase', fase_tipo: 'pontuacao' }] },
    grupos: [{ title: 'GRUPO A', data: [1, 2, 3, 4].map((p) => linha(p, p === 3 ? 'Flamengo' : 'Time ' + p, p === 3 ? '20016' : String(p), 8)) }, { title: 'GRUPO B', data: [1, 2, 3, 4].map((p) => linha(p, 'Outro ' + p, String(p + 10), 8)) }] });
  assert.deepEqual(lerFases(tab).map((f) => f.fase_id), ['8', '9']);
  const t = lerTabela(tab);
  assert.equal(t.grupo, 'GRUPO A', 'pega o grupo do Flamengo');
  assert.deepEqual(t.linhas[2], { pos: 3, time: 'Flamengo', j: 8, v: 5, e: 2, d: 1, gp: 20, gc: 10, sg: 10, pts: 27, ap: 60, ca: 20, cv: 1, ult: ['V', 'E', 'D'], escudoReserva: 'https://e/20016.jpg' });
  const site = [{ id: 'site-base-2026-12-20-bahia', modalidade: 'base', categoria: 'Sub-20', adversario: 'Bahia', inicio: '2026-12-20T15:00:00-03:00', ingresso: 'https://x' }];
  const junto = juntarCbf(site, js);
  assert.equal(junto.length, 3, 'jogo do site e da CBF no mesmo dia viram um só');
  const bahia = junto.find((j) => j.adversario === 'Bahia');
  assert.equal(bahia.id.startsWith('cbf-'), true, 'a CBF é a dona do jogo'); assert.equal(bahia.ingresso, 'https://x', 'ingresso vem do site'); assert.ok(bahia.link.includes('cbf.com.br'));
  console.log('✓ Leitura da CBF ok');
}
{
  // revisão: base Sub-17 e Sub-20 no mesmo dia não se misturam; "remover" acha o jogo certo; feminino Sub-20 não vira base
  assert.equal(normalizarModalidade('Futebol feminino Sub-20'), 'futebol-feminino');
  assert.equal(normalizarModalidade('Futebol sub-17'), 'base');
  const auto7 = [
    { id: 'site-base-a', modalidade: 'base', categoria: 'Sub-17', adversario: 'Vasco', inicio: '2026-11-20T10:00:00-03:00', transmissao: [], status: 'agendado', fonte: 'automatica' },
    { id: 'site-base-b', modalidade: 'base', categoria: 'Sub-20', adversario: 'Palmeiras', inicio: '2026-11-20T15:00:00-03:00', transmissao: [], status: 'agendado', fonte: 'automatica' }];
  const { jogos: j7 } = mesclar(auto7, parseCsv(`id,modalidade,adversario,data,onde_assistir\n,Futebol sub-20,Palmeiras,20/11/2026,SporTV`));
  assert.equal(j7.length, 2);
  assert.equal(j7.find((j) => j.adversario === 'Vasco').transmissao.length, 0, 'Sub-17 intacto');
  assert.equal(j7.find((j) => j.adversario === 'Palmeiras').transmissao[0].nome ?? j7.find((j) => j.adversario === 'Palmeiras').transmissao[0], 'SporTV');
  assert.ok(!('daPlanilha' in j7[0]));
  const { jogos: j8 } = mesclar(auto7, parseCsv(`id,modalidade,adversario,data,acao\n,Futebol sub-20,Palmeiras,20/11/2026,remover`));
  assert.deepEqual(j8.map((j) => j.adversario), ['Vasco'], 'remover apaga o jogo certo');
  console.log('✓ Correções da revisão ok');
}
{
  const { lerAgendaLnb } = await import('./tabelas-oficiais.mjs');
  const linha = (id, data, hora, casa, fora, placar, tvs) => `<tr class="with-hotel"><td class="position_value show-for-medium" data-label="JOGO" data-real-id="${id}">1</td><td class="date_value show-for-medium" data-label="DATA"> <span class="">${data}</span> <span class="">${hora}</span> </td><td class="home_team_value show-for-medium" data-label="CASA"> <span class="team-shortname">${casa}</span> </td><td class="logo_home_team show-for-medium"> <img alt="" src="https://lnb/${casa}.png"> </td><td class="score_value show-for-medium"> ${placar ? `<a><span class="home">${placar[0]}</span> X <span class="away">${placar[1]}</span></a>` : 'X'} </td><td class="logo_visitor_team show-for-medium"> <img alt="" src="https://lnb/${fora}.png"> </td><td class="visitor_team_value show-for-medium" data-label="VISITANTE"> <span class="team-shortname">${fora}</span> </td><td class="stage_value hide_value" data-label="FASE">1º TURNO</td><td class="gym_value hide_value" data-label="GINÁSIO">Maracanãzinho <div class="hotel"></div></td><td class="logo_tv_value"> ${tvs.map((t) => `<img alt="${t}" title="${t}" src="x.png">`).join(' ')} </td></tr>`;
  const html = linha(1, '04/11/2026', '20:15', 'CAIXA/Brasília Basquete', 'Flamengo', [87, 91], ['YouTube', 'SporTV']) + linha(2, '19/11/2026', '19:00', 'UNIFACISA', 'Flamengo', null, ['SporTV']) + linha(3, '20/11/2026', '19:00', 'Minas', 'Pinheiros', null, []);
  const j = lerAgendaLnb(html, new Date('2026-11-08T12:00:00-03:00').getTime());
  assert.equal(j.length, 2, 'só jogos do Flamengo');
  assert.deepEqual(j[0].placar, { flamengo: 91, adversario: 87 }); assert.equal(j[0].mandante, false); assert.deepEqual(j[0].transmissao, ['YouTube', 'SporTV']);
  assert.equal(j[1].adversario, 'Unifacisa'); assert.equal(j[1].placar, null); assert.equal(j[1].inicio, '2026-11-19T19:00:00-03:00'); assert.equal(j[1].local, 'Maracanãzinho');
  assert.equal(j[1].escudoAdvUrl, 'https://lnb/UNIFACISA.png');
  console.log('✓ Agenda do NBB (LNB) ok');
}
{
  const { lerPartidasFerj, nomeFerj } = await import('./ferj.mjs');
  assert.equal(nomeFerj('S.A.F Botafogo'), 'Botafogo'); assert.equal(nomeFerj('Vasco da Gama S.A.F'), 'Vasco da Gama'); assert.equal(nomeFerj('Bahia (ba)'), 'Bahia');
  const linhas = [
    '1:{"id":30,"nome":"C.R Flamengo","imgEscudo":"img_icone_30.jpg"}', '2:{"id":25,"nome":"S.A.F Botafogo","imgEscudo":"img_icone_25.png"}',
    '3:{"id":4,"nome":"Sub-17"}', '4:{"id":3,"nome":"Copa Rio"}', '5:{"id":753,"campeonatoCategoria":"$3","campeonato":"$4","genero":"MASCULINO"}', '6:{"nome":"ESTÁDIO NILTON SANTOS"}',
    '7:{"id":6195,"data":"$D2026-11-11T11:00:00.000Z","placarMandante":null,"placarVisitante":null,"penaltiMandante":null,"penaltiVisitante":null,"visitante":"$1","mandante":"$2","campeonatoCategoriaTemporada":"$5","fase":null,"statusPartida":"AGENDADO","estadio":"$6"}',
    '8:{"id":1,"nome":"Profissional"}', '9:{"id":2,"nome":"Estadual"}', 'a:{"id":9,"campeonatoCategoria":"$8","campeonato":"$9","genero":"FEMININO"}',
    'b:{"id":6000,"data":"$D2026-11-07T15:00:00.000Z","placarMandante":3,"placarVisitante":1,"penaltiMandante":null,"penaltiVisitante":null,"visitante":"$2","mandante":"$1","campeonatoCategoriaTemporada":"$a","fase":null,"statusPartida":"FINALIZADO","estadio":"$6"}',
    'c:{"id":11,"nome":"Sub-13"}', 'd:{"id":12,"campeonatoCategoria":"$c","campeonato":"$4","genero":"MASCULINO"}',
    'e:{"id":7000,"data":"$D2026-11-12T09:00:00.000Z","placarMandante":null,"placarVisitante":null,"visitante":"$2","mandante":"$1","campeonatoCategoriaTemporada":"$d","statusPartida":"AGENDADO","estadio":"$6"}',
  ].join('\n') + '\n';
  const html = `<script>self.__next_f.push([1,${JSON.stringify(linhas)}])</script>`;
  const j = lerPartidasFerj(html, { idadeMinima: 15, agora: new Date('2026-11-08T12:00:00-03:00').getTime() });
  assert.equal(j.length, 2, 'Sub-13 fica de fora');
  const sub17 = j.find((x) => x.id === 'ferj-6195'), fem = j.find((x) => x.id === 'ferj-6000');
  assert.equal(sub17.modalidade, 'base'); assert.equal(sub17.categoria, 'Sub-17'); assert.equal(sub17.competicao, 'Copa Rio Sub-17');
  assert.equal(sub17.adversario, 'Botafogo'); assert.equal(sub17.mandante, false); assert.equal(sub17.inicio, '2026-11-11T11:00:00-03:00'); assert.equal(sub17.local, 'Estádio Nilton Santos');
  assert.equal(fem.modalidade, 'futebol-feminino'); assert.equal(fem.competicao, 'Carioca Feminino'); assert.deepEqual(fem.placar, { flamengo: 3, adversario: 1 });
  console.log('✓ Leitura da FERJ ok');
}
{
  // revisão 2: FERJ não para numa página só de escolinha; LNB não publica placar parcial; jogo remarcado não duplica
  const { lerFerj } = await import('./ferj.mjs');
  const { lerAgendaLnb } = await import('./tabelas-oficiais.mjs');
  const { juntarCbf } = await import('./atualizar.mjs');
  const pagina = (cat, id, dia) => {
    const linhas = ['1:{"id":30,"nome":"C.R Flamengo"}', '2:{"id":25,"nome":"S.A.F Botafogo"}', `3:{"id":4,"nome":"${cat}"}`, '4:{"id":3,"nome":"Copa Rio"}',
      '5:{"id":9,"campeonatoCategoria":"$3","campeonato":"$4","genero":"MASCULINO"}', '6:{"nome":"X"}',
      `7:{"id":${id},"data":"$D${dia}T10:00:00.000Z","placarMandante":1,"placarVisitante":0,"visitante":"$2","mandante":"$1","campeonatoCategoriaTemporada":"$5","statusPartida":"FINALIZADO","estadio":"$6"}`].join('\n') + '\n';
    return `<script>self.__next_f.push([1,${JSON.stringify(linhas)}])</script>`;
  };
  const real = globalThis.fetch, realTimeout = globalThis.setTimeout;
  const pedidas = [];
  globalThis.setTimeout = (f) => realTimeout(f, 0);
  globalThis.fetch = async (u) => { pedidas.push(u); const pg = Number(new URL(u).searchParams.get('pg')); const tab = new URL(u).searchParams.get('tab');
    if (tab === 'agendados') return new Response('<html></html>');
    return new Response(pg === 1 ? pagina('Sub-17', 1, '2026-10-01') : pg === 2 ? pagina('Sub-13', 2, '2026-09-01') : pg === 3 ? pagina('Sub-20', 3, '2026-08-01') : '<html></html>'); };
  try {
    const j = await lerFerj({ paginas: 5, idadeMinima: 15, desde: '2026-01-01' });
    assert.deepEqual(j.map((x) => x.categoria), ['Sub-20', 'Sub-17'], 'lê a página depois da página só de Sub-13');
  } finally { globalThis.fetch = real; globalThis.setTimeout = realTimeout; }
  const tr = `<tr class="with-hotel"><td data-real-id="9">1</td><td class="date_value"><span>08/11/2026</span> <span>19:00</span></td><td class="home_team_value"><span>Flamengo</span></td><td class="score_value show-for-medium"><a><span class="home">40</span> X <span class="away">38</span></a></td><td class="visitor_team_value"><span>Mogi</span></td></tr>`;
  assert.equal(lerAgendaLnb(tr, new Date('2026-11-08T20:00:00-03:00').getTime())[0].placar, null, 'jogo em andamento: sem placar final');
  assert.deepEqual(lerAgendaLnb(tr, new Date('2026-11-08T22:00:00-03:00').getTime())[0].placar, { flamengo: 40, adversario: 38 });
  const site = [{ id: 'site-futebol-masculino-2026-11-18-athletico', modalidade: 'futebol-masculino', adversario: 'Athletico-PR', inicio: '2026-11-18T21:30:00-03:00', ingresso: 'https://x' }];
  const cbf = [{ id: 'cbf-1', modalidade: 'futebol-masculino', adversario: 'Athletico Paranaense', inicio: '2026-11-19T19:00:00-03:00', link: 'https://cbf' }];
  const junto = juntarCbf(site, cbf);
  assert.equal(junto.length, 1, 'remarcado: vira um jogo só'); assert.equal(junto[0].inicio, '2026-11-19T19:00:00-03:00', 'vale a data da CBF'); assert.equal(junto[0].ingresso, 'https://x');
  console.log('✓ Correções da revisão 2 ok');
}
{
  const { ehDuvida } = await import('./atualizar.mjs');
  for (const t of ['Horário a confirmar: uma fonte cita 15h', 'Horário ainda não divulgado', 'Transmissão ainda não anunciada', 'Data definida pela CBF em 7/11 (antes se falava em 27/11)', 'Atletas inscritos ainda não divulgados']) assert.ok(ehDuvida(t), t);
  for (const t of ['Pênaltis: Flamengo 4 x 3', 'Classificado para a final inédita da Copa do Brasil Feminina', 'Jogo em quadra neutra, em Medellín', 'Última rodada do Brasileirão', 'Eliminado nos pênaltis (2 x 3)']) assert.ok(!ehDuvida(t), t);
  const { jogos, avisos } = mesclar([], parseCsv(`id,modalidade,adversario,data,hora,observacao\n,Futebol masculino,Athletico-PR,18/11/2026,20:30,Horário a confirmar: uma fonte cita 15h`));
  assert.equal(jogos[0].observacao, undefined); assert.ok(avisos.some((a) => a.includes('dúvida')));
  console.log('✓ Observação com dúvida não é publicada');
}
{
  const { lerCanais } = await import('./cbf.mjs');
  const pag = (c) => `<script>self.__next_f.push([1,${JSON.stringify(`5:{"id_jogo":"1","data":" 04/11/2026","hora":"19:30","canais":"${c}","qtd_alteracoes_jogo":0}\n`)}])</script>`;
  assert.deepEqual(lerCanais(pag('Premiere')), ['Premiere']);
  assert.deepEqual(lerCanais(pag('Mil Sports, Sportv')), ['Mil Sports', 'SporTV']);
  assert.deepEqual(lerCanais(pag('')), []);
  const auto = [{ id: 'cbf-1', modalidade: 'futebol-masculino', adversario: 'Grêmio', inicio: '2026-11-20T19:30:00-03:00', transmissao: ['Premiere'], status: 'agendado', fonte: 'automatica' }];
  const { jogos } = mesclar(auto, parseCsv(`id,modalidade,adversario,data,onde_assistir\n,Futebol masculino,Grêmio,20/11/2026,Globo`));
  assert.deepEqual(jogos[0].transmissao, ['Premiere'], 'canal oficial da CBF vale mais que o da planilha');
  console.log('✓ Canais da CBF ok');
}
{
  const { mesmaCompeticao } = await import('./atualizar.mjs');
  assert.equal(mesmaCompeticao('Copa do Brasil Feminina – final (ida)', 'Carioca Feminino'), false);
  assert.equal(mesmaCompeticao('Campeonato Carioca Feminino', 'Carioca Feminino'), true);
  assert.equal(mesmaCompeticao('Brasileirão Série A', 'Brasileirão Série A'), true);
  assert.equal(mesmaCompeticao('', 'NBB'), true);
  const auto = [{ id: 'site-futebol-feminino-2026-11-11-botafogo', modalidade: 'futebol-feminino', adversario: 'Botafogo', competicao: 'Carioca Feminino', inicio: '2026-11-11T15:00:00-03:00', transmissao: [], status: 'agendado', fonte: 'automatica' }];
  const { jogos } = mesclar(auto, parseCsv(`id,modalidade,adversario,competicao,data\n,Futebol feminino,Internacional,Copa do Brasil Feminina – final (ida),11/11/2026`));
  assert.equal(jogos.length, 2, 'final da Copa do Brasil não engole o jogo do Carioca no mesmo dia');
  assert.ok(jogos.some((j) => j.adversario === 'Botafogo') && jogos.some((j) => j.adversario === 'Internacional'));
  console.log('✓ Jogos de campeonatos diferentes no mesmo dia não se misturam');
}
{
  // revisão 3
  const { mesmaCompeticao, juntarCbf, ehDuvida } = await import('./atualizar.mjs');
  assert.equal(mesmaCompeticao('Copa do Brasil Sub-20', 'Brasileiro Sub-20'), false, 'Copa do Brasil não é Brasileiro');
  assert.equal(mesmaCompeticao('Brasileirão Série A', 'Campeonato Brasileiro'), true);
  assert.equal(mesmaCompeticao('Superliga', 'Superliga Feminina'), true);
  assert.equal(mesmaCompeticao('Copa do Brasil Feminina – final (ida)', 'Copa do Brasil Feminina'), true);
  const site = [{ id: 'site-futebol-feminino-2026-11-11-botafogo', modalidade: 'futebol-feminino', adversario: 'Botafogo', competicao: 'Campeonato Carioca Feminino', inicio: '2026-11-11T15:00:00-03:00', ingresso: 'https://bota' }];
  const cbf = [{ id: 'cbf-9', modalidade: 'futebol-feminino', adversario: 'Internacional', competicao: 'Copa do Brasil Feminina', inicio: '2026-11-11T19:00:00-03:00' }];
  const j = juntarCbf(site, cbf);
  assert.equal(j.length, 2, 'jogos diferentes no mesmo dia continuam separados');
  assert.equal(j.find((x) => x.adversario === 'Internacional').ingresso, undefined, 'ingresso do outro jogo não vaza');
  // série de dois jogos contra o mesmo time: cada ingresso fica no seu jogo
  const s2 = [{ id: 'site-a', modalidade: 'basquete', adversario: 'Franca', inicio: '2026-12-01T20:00:00-03:00', ingresso: 'https://1' }, { id: 'site-b', modalidade: 'basquete', adversario: 'Franca', inicio: '2026-12-03T20:00:00-03:00', ingresso: 'https://2' }];
  const l2 = [{ id: 'lnb-1', modalidade: 'basquete', adversario: 'Sesi Franca', inicio: '2026-12-01T20:00:00-03:00' }, { id: 'lnb-2', modalidade: 'basquete', adversario: 'Sesi Franca', inicio: '2026-12-03T20:00:00-03:00' }];
  const j2 = juntarCbf(s2, l2);
  assert.deepEqual(j2.map((x) => [x.id, x.ingresso]), [['lnb-1', 'https://1'], ['lnb-2', 'https://2']]);
  assert.ok(!ehDuvida('Flamengo ainda não perdeu em casa')); assert.ok(ehDuvida('Horário pode mudar')); assert.ok(ehDuvida('Deve passar no SporTV'));
  const ics = gerarIcs([{ id: 'x', modalidade: 'basquete', adversario: 'Time 🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀🏀', competicao: 'NBB', inicio: '2026-12-01T20:00:00-03:00', transmissao: [], status: 'agendado' }], 'T');
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(ics), 'calendário não corta emoji ao meio');
  console.log('✓ Correções da revisão 3 ok');
}
{
  // rodada inteira adiada em uma semana: cada jogo do site casa com o seu, sem sobrar jogo fantasma
  const { juntarCbf } = await import('./atualizar.mjs');
  const S = (adv, dia) => ({ id: `site-fem-${dia}-${adv}`, modalidade: 'futebol-feminino', adversario: adv, competicao: 'Campeonato Carioca Feminino', inicio: `2026-11-${dia}T15:00:00-03:00` });
  const F = (id, adv, dia) => ({ id: `ferj-${id}`, modalidade: 'futebol-feminino', adversario: adv, competicao: 'Carioca Feminino', inicio: `2026-11-${dia}T15:00:00-03:00` });
  const j = juntarCbf([S('Botafogo', 11), S('Vasco da Gama', 14), S('Fluminense', 18)], [F(1, 'Botafogo', 18), F(2, 'Vasco da Gama', 21), F(3, 'Fluminense', 25)]);
  assert.deepEqual(j.map((x) => `${x.id} ${x.inicio.slice(8, 10)}`).sort(), ['ferj-1 18', 'ferj-2 21', 'ferj-3 25']);
  console.log('✓ Rodada adiada não deixa jogo fantasma');
}
