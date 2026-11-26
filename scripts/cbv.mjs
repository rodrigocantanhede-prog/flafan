// Agenda da Superliga no site da CBV: jogos do Flamengo com data, placar em sets, ginásio e canal de TV.
// https://cbv.com.br/volei-de-quadra/superliga-a-feminina  (a página traz a tabela inteira nos dados embutidos)
// Cada partida vem como {"ChampionshipMatch_ID":..., "HomeTeam":..., "GuestTeam":..., "MatchDateTime":..., "WonSetHome":...}.
// Ginásio e canal às vezes vêm por extenso e às vezes como referência a outra partida ("...matchesByRound:<rodada>:<n>:hall").

import { dadosDaPagina } from './cbf.mjs';
import { nomeBonito } from './tabelas-oficiais.mjs';

const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const chave = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// nomes como o torcedor conhece (a CBV usa o nome com patrocinador, em maiúsculas)
const CURTOS = {
  'gerdau minas': 'Minas', 'e.c. pinheiros': 'Pinheiros', 'osasco sao cristovao saude': 'Osasco', 'batavo mackenzie': 'Mackenzie',
  'brasilia volei / brb': 'Brasília', 'paulistano barueri': 'Paulistano/Barueri', 'fluminense f.c.': 'Fluminense',
  'sesi volei bauru': 'Sesi Vôlei Bauru', 'brusque volei': 'Brusque', 'sancor seguros volei': 'Sancor Seguros Vôlei', 'dentil praia clube': 'Dentil Praia Clube',
};
export const nomeCbv = (s) => CURTOS[chave(s)] ?? nomeBonito(String(s ?? '').replace(/\s+/g, ' ').trim());
const CANAIS = { 'sportv 1': 'SporTV', 'sportv': 'SporTV', 'sportv 2': 'SporTV 2', 'sportv 3': 'SporTV 3', 'ge tv': 'GE TV', 'vbtv': 'VBTV' };
const nomeCanal = (s) => CANAIS[chave(s)] ?? nomeBonito(String(s ?? '').trim());
const ACERTOS = [[/\bGin[aá]sio do Ttc\b/i, 'Tijuca Tênis Clube'], [/\bUtc\b/, 'UTC'], [/\bFvdf\b/, 'FVDF'], [/\bSao Paulo\b/i, 'São Paulo'], [/\bUberlandia\b/i, 'Uberlândia'], [/\bBrasilia\b/i, 'Brasília']];
const titulo = (s) => ACERTOS.reduce((t, [de, para]) => t.replace(de, para), nomeBonito(String(s ?? '').replace(/\s+/g, ' ').trim()));

export function lerAgendaCbv(html, { competicao = 'Superliga Feminina', modalidade = 'volei-feminino', agora = Date.now() } = {}) {
  const txt = dadosDaPagina(html);
  const inicios = [...txt.matchAll(/\{"ChampionshipMatch_ID":(\d+)/g)].map((m) => ({ id: m[1], pos: m.index }));
  const canais = new Map([...txt.matchAll(/"channel":\{"ID":(\d+),"Denomination":"([^"]+)"/g)].map((m) => [m[1], m[2]]));
  // 1ª passada: cada partida (a primeira vez que aparece), na ordem da tabela, para resolver as referências por rodada e posição
  const partidas = new Map(), porRodada = new Map();
  inicios.forEach((ini, i) => {
    const c = txt.slice(ini.pos, inicios[i + 1]?.pos ?? ini.pos + 60000);
    const g = (re) => (c.match(re) ?? [])[1];
    const p = partidas.get(ini.id) ?? { id: ini.id };
    const novo = !partidas.has(ini.id);
    p.casa ??= g(/"HomeTeam":"([^"]*)"/); p.fora ??= g(/"GuestTeam":"([^"]*)"/); p.quando ??= g(/"MatchDateTime":"([^"]*)"/);
    p.rodada ??= g(/"RoundType":"([^"]*)"/);
    const sc = g(/"WonSetHome":(\d+)/), sf = g(/"WonSetGuest":(\d+)/);
    if (sc !== undefined && p.setsCasa === undefined) { p.setsCasa = Number(sc); p.setsFora = Number(sf ?? 0); }
    p.encerrado ??= g(/"isFinished":(true|false)/); p.adiado ??= g(/"postponed":(true|false)/);
    p.tvId ??= g(/"TelevisionID":(\d+)/);
    const canal = c.match(/"channel":(?:\{"ID":\d+,"Denomination":"([^"]+)"|"(\$[^"]+)")/);
    if (canal && !p.canal && !p.canalRef) { p.canal = canal[1]; p.canalRef = canal[2]; }
    const hall = c.match(/"hall":(?:\{"Hall_ID":\d+,"Denomination":"([^"]*)","City":"([^"]*)"|"(\$[^"]+)")/);
    if (hall && !p.ginasio && !p.hallRef) { p.ginasio = hall[1]; p.cidade = hall[2]; p.hallRef = hall[3]; }
    if (novo) { partidas.set(ini.id, p); if (p.rodada) { if (!porRodada.has(p.rodada)) porRodada.set(p.rodada, []); porRodada.get(p.rodada).push(p); } }
  });
  const alvo = (ref) => { const m = String(ref ?? '').match(/matchesByRound:(.+):(\d+):(?:hall|channel)$/); return m ? porRodada.get(m[1])?.[Number(m[2])] : undefined; };
  const jogos = [];
  for (const p of partidas.values()) {
    if (!p.casa || !p.fora || !p.quando) continue;
    const flaCasa = /flamengo/i.test(p.casa), flaFora = /flamengo/i.test(p.fora);
    if (flaCasa === flaFora) continue;
    const t = new Date(p.quando).getTime();
    if (isNaN(t)) continue;
    // hora de Brasília (a CBV publica no fuso da Europa)
    const br = new Date(t - 3 * 3600e3).toISOString().slice(0, 16);
    const inicio = `${br}:00-03:00`;
    const h = p.ginasio !== undefined ? p : alvo(p.hallRef);
    const local = h?.ginasio ? [titulo(h.ginasio), h.cidade ? titulo(h.cidade) : ''].filter(Boolean).join(', ') : '';
    const canal = p.canal ?? alvo(p.canalRef)?.canal ?? canais.get(p.tvId);
    const sets = (p.setsCasa ?? 0) + (p.setsFora ?? 0);
    const acabou = p.encerrado === 'true' || (sets >= 3 && Math.max(p.setsCasa, p.setsFora) === 3);
    const comecou = t <= agora;
    const placar = comecou && sets > 0 ? { flamengo: flaCasa ? p.setsCasa : p.setsFora, adversario: flaCasa ? p.setsFora : p.setsCasa } : null;
    jogos.push({
      id: `cbv-${p.id}`, modalidade, adversario: nomeCbv(flaCasa ? p.fora : p.casa), competicao, inicio, semHora: false, local, mandante: flaCasa,
      transmissao: canal ? [nomeCanal(canal)] : [], placar,
      status: p.adiado === 'true' ? 'adiado' : placar ? (acabou ? 'encerrado' : 'ao-vivo') : 'agendado',
      fonte: 'automatica', fonteInfo: 'CBV', tabela: competicao, link: 'https://cbv.com.br/volei-de-quadra/superliga-a-feminina',
    });
  }
  return jogos.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export async function lerJogosCbv(cfg, log = () => {}) {
  const r = await fetch(cfg.url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`respondeu ${r.status}`);
  const jogos = lerAgendaCbv(await r.text(), cfg);
  if (jogos.length < 5) throw new Error('poucos jogos do Flamengo encontrados (formato mudou?)');
  log(`Site da CBV: agenda da ${cfg.competicao ?? 'Superliga Feminina'} — ${jogos.length} jogos do Flamengo.`);
  return jogos;
}
