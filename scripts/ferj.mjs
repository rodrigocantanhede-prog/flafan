// Leitura do site da FERJ (Federação de Futebol do Rio): jogos do Flamengo no Carioca (profissional, feminino e base) e na Copa Rio.
// https://www.fferj.com.br/partidas?clubeId=30&tab=agendados|finalizados&pg=N  (30 = C.R Flamengo)
// O site é feito em Next.js: os dados vêm no HTML em pedaços self.__next_f.push([1,"..."]), como linhas "id:{json}"
// que se referenciam com "$id" (ex.: "mandante":"$124").

import { dadosDaPagina } from './cbf.mjs';
import { nomeBonito } from './tabelas-oficiais.mjs';

const BASE = 'https://www.fferj.com.br';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
export const ID_FLAMENGO_FERJ = 30;

// "S.A.F Botafogo" -> "Botafogo"; "Vasco da Gama S.A.F" -> "Vasco da Gama"; "Fluminense F.C" -> "Fluminense"
export function nomeFerj(s) {
  const sigla = '(?:S\\.?\\s?A\\.?\\s?F\\.?|C\\.?\\s?R\\.?|E\\.?\\s?C\\.?|A\\.?\\s?C\\.?|F\\.?\\s?C\\.?|S\\.?\\s?C\\.?|A\\.?\\s?A\\.?|G\\.?\\s?R\\.?\\s?E\\.?\\s?S\\.?)';
  return String(s ?? '').replace(/\s*\([a-z]{2}\)\s*$/i, '').replace(new RegExp(`^${sigla}\\s+`, 'i'), '').replace(new RegExp(`\\s+${sigla}$`, 'i'), '').replace(/\s+/g, ' ').trim();
}

// monta o mapa id -> objeto e resolve as referências "$id"
function mapaDeLinhas(txt) {
  const mapa = new Map();
  for (const m of txt.matchAll(/(?:^|\n)([0-9a-f]+):(\{[^\n]*\})(?=\n|$)/g)) {
    try { mapa.set(m[1], JSON.parse(m[2])); } catch { /* linha que não é objeto simples */ }
  }
  const resolver = (v, prof = 0) => {
    if (prof > 6) return v;
    if (typeof v === 'string' && /^\$[0-9a-f]+$/.test(v)) return resolver(mapa.get(v.slice(1)), prof + 1);
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolver(x, prof + 1)]));
    return v;
  };
  return { mapa, resolver };
}

// "2026-11-11T09:00:00.000Z" — o site guarda a hora de Brasília com um "Z" no fim; a página mostra 09:00
function inicioFerj(d) {
  const m = String(d ?? '').replace(/^\$D/, '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[1]}T${m[2]}:${m[3]}:00-03:00` : null;
}

const NUM_CAT = (nome) => Number((String(nome ?? '').match(/sub-?(\d+)/i) ?? [])[1] ?? 99);

// lê os jogos do Flamengo de uma página de partidas da FERJ
export function lerPartidasFerj(html, { idadeMinima = 15, agora = Date.now() } = {}) {
  const { mapa, resolver } = mapaDeLinhas(dadosDaPagina(html));
  const jogos = [];
  // todas as partidas da página, antes de qualquer filtro (para saber quando parar de virar páginas)
  jogos.brutos = [...mapa.values()].filter((o) => o && typeof o === 'object' && 'statusPartida' in o && o.mandante)
    .map((o) => ({ id: o.id, dia: String(o.data ?? '').replace(/^\$D/, '').slice(0, 10) }));
  for (const bruto of mapa.values()) {
    if (!bruto || typeof bruto !== 'object' || !('statusPartida' in bruto) || !bruto.mandante) continue;
    const p = resolver(bruto);
    const casa = p.mandante, fora = p.visitante;
    if (!casa?.nome || !fora?.nome) continue;
    const flaCasa = casa.id === ID_FLAMENGO_FERJ, flaFora = fora.id === ID_FLAMENGO_FERJ;
    if (flaCasa === flaFora) continue;
    const cct = p.campeonatoCategoriaTemporada ?? {};
    const categoria = cct.campeonatoCategoria?.nome ?? '';
    const idade = NUM_CAT(categoria);
    if (idade < idadeMinima) continue; // Sub-11 a Sub-14 ficam de fora (muitos jogos de escolinha)
    const fem = /fem/i.test(cct.genero ?? '');
    const base = idade < 99;
    const inicio = inicioFerj(p.data);
    if (!inicio) continue;
    const camp = cct.campeonato?.nome ?? '';
    if (/brasileir|copa do brasil|libertadores|sul-?americana|supercopa/i.test(camp)) continue; // nacionais já vêm da CBF
    const nomeCamp = /estadual/i.test(camp) ? 'Carioca' : camp;
    const competicao = [nomeCamp, fem ? 'Feminino' : '', base ? categoria : ''].filter(Boolean).join(' ') + (p.fase?.nome ? ` – ${String(p.fase.nome).toLowerCase()}` : '');
    const adv = flaCasa ? fora : casa;
    const status = String(p.statusPartida ?? '').toUpperCase();
    const gc = p.placarMandante, gv = p.placarVisitante;
    const temPlacar = Number.isFinite(gc) && Number.isFinite(gv) && (status.startsWith('FINALIZ') || new Date(inicio).getTime() + 2.5 * 3600e3 < agora);
    const jogo = {
      id: `ferj-${p.id}`, modalidade: fem ? 'futebol-feminino' : base ? 'base' : 'futebol-masculino',
      adversario: nomeBonito(nomeFerj(adv.nome)), competicao, inicio, semHora: false,
      local: nomeBonito(String(p.estadio?.nome ?? '').replace(/\s+/g, ' ').trim()), mandante: flaCasa, transmissao: [],
      placar: temPlacar ? { flamengo: flaCasa ? gc : gv, adversario: flaCasa ? gv : gc } : null,
      status: /CANCEL/.test(status) ? 'cancelado' : /ADIAD/.test(status) ? 'adiado' : temPlacar ? 'encerrado' : 'agendado',
      fonte: 'automatica', fonteInfo: 'FERJ',
      escudoReserva: adv.imgEscudo ? `https://static.fferj.com.br/media/upload/time/${adv.imgEscudo}` : undefined,
      link: `${BASE}/partidas/${p.id}`,
    };
    if (base) jogo.categoria = categoria.replace(/^sub-?/i, 'Sub-');
    if (p.linkIngressos && /^https:\/\//.test(p.linkIngressos)) jogo.ingresso = p.linkIngressos;
    const pf = flaCasa ? p.penaltiMandante : p.penaltiVisitante, pa = flaCasa ? p.penaltiVisitante : p.penaltiMandante;
    if (jogo.placar && (Number.isFinite(pf) || Number.isFinite(pa)) && (pf || pa)) jogo.observacao = `Pênaltis: Flamengo ${pf ?? 0} x ${pa ?? 0}`;
    jogos.push(jogo);
  }
  return jogos;
}

async function baixar(u) {
  const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${u.replace(BASE, '')} respondeu ${r.status}`);
  return r.text();
}

// cfg: { ativo, paginas (por aba), idadeMinima, desde }
export async function lerFerj(cfg, log = () => {}) {
  const porId = new Map(), vistos = new Set();
  for (const tab of ['agendados', 'finalizados']) {
    for (let pg = 1; pg <= (cfg?.paginas ?? 3); pg++) {
      const lidos = lerPartidasFerj(await baixar(`${BASE}/partidas?clubeId=${ID_FLAMENGO_FERJ}&tab=${tab}&pg=${pg}`), cfg);
      await new Promise((r) => setTimeout(r, 1200));
      lidos.forEach((j) => porId.set(j.id, j));
      // para pela página "bruta" (com Sub-11 a Sub-14), não pela filtrada: página só de escolinha não interrompe a leitura
      const brutos = lidos.brutos ?? [];
      const novos = brutos.filter((b) => !vistos.has(b.id));
      brutos.forEach((b) => vistos.add(b.id));
      if (!novos.length) break;
      // finalizados vêm do mais novo para o mais antigo: para quando a página inteira já é de antes da data "desde"
      if (tab === 'finalizados' && cfg?.desde && brutos.every((b) => b.dia && b.dia < cfg.desde)) break;
    }
  }
  const jogos = [...porId.values()].filter((j) => !cfg?.desde || j.inicio.slice(0, 10) >= cfg.desde).sort((a, b) => a.inicio.localeCompare(b.inicio));
  if (!jogos.length) throw new Error('nenhum jogo do Flamengo encontrado (formato mudou?)');
  log(`FERJ: ${jogos.length} jogos do Flamengo (Carioca e Copa Rio).`);
  return jogos;
}
