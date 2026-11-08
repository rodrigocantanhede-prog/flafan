// Tabelas completas lidas dos sites oficiais das ligas (páginas públicas; o robots.txt delas permite acesso geral).
// NBB:                https://lnb.com.br/nbb/classificacao/
// Superliga Feminina: https://cbv.com.br/volei-de-quadra/superliga-a-feminina/classificacao

const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';

const decodificar = (s) => String(s ?? '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, ' ').trim();
const num = (s) => { const t = String(s ?? '').replace(',', '.').trim(); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };

// "SESI VOLEI BAURU" -> "Sesi Volei Bauru" (só quando não há nome melhor na planilha)
const PEQUENAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
export function nomeBonito(s) {
  const t = decodificar(s);
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().split(' ').map((p, i) => {
    if (i > 0 && PEQUENAS.has(p)) return p;
    if (p.includes('.')) return p.toUpperCase();
    if (/^(rj|sp|mg|pr|df|rs|sc|ba|brb|ec|fc|ac)$/.test(p)) return p.toUpperCase();
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

// Tabela confere? pelo menos 8 times, posições 1..N e alguém já jogou
function valida(linhas) {
  if (linhas.length < 8) return [];
  if (!linhas.every((l, i) => l.pos === i + 1 && l.time && Number.isFinite(l.j))) return [];
  return linhas.some((l) => l.j > 0) ? linhas : [];
}

// LNB: primeira tabela (ordem por aproveitamento, como o site mostra). Cada time é um <tr> com td.open_content.
// Colunas com data-sort-value: AP | PON | AP | JOG | VIT | DER | CASA | FORA | PRO | CON | SAL | PON
export function lerTabelaLnb(html) {
  const ini = html.search(/<table[^>]*table_ap/);
  if (ini < 0) return [];
  const tabela = html.slice(ini, html.indexOf('</table>', ini));
  const linhas = [];
  for (const tr of tabela.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    if (!/open_content/.test(tr)) continue;
    const pos = num((tr.match(/class="number"[^>]*>\s*<strong>\s*(\d+)/) ?? [])[1]);
    const img = (tr.match(/<div class="logo"[\s\S]*?<img[^>]*>/) ?? [])[0] ?? '';
    const time = decodificar((img.match(/alt="([^"]*)"/) ?? [])[1]);
    const logo = decodificar((img.match(/src="([^"]*)"/) ?? [])[1]);
    const v = [...tr.matchAll(/data-sort-value="([^"]*)"/g)].map((m) => num(m[1]));
    if (!pos || !time || v.length < 12) continue;
    linhas.push({ pos, time: nomeBonito(time), j: v[3], v: v[4], e: null, d: v[5], sg: v[10], pts: v[1], ap: v[0] === null ? null : Math.round(v[0]), escudoAdvUrl: /^https?:/.test(logo) ? logo : undefined });
  }
  return valida(linhas);
}

// CBV (site em Next.js, mas a tabela vem pronta no HTML): # | Clube | Pts | J | V | D | SG | SP | ...
export function lerTabelaCbv(html) {
  const ini = html.indexOf('<table');
  if (ini < 0) return [];
  const tabela = html.slice(ini, html.indexOf('</table>', ini));
  const corpo = tabela.slice(Math.max(0, tabela.indexOf('<tbody')));
  const linhas = [];
  for (const tr of corpo.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (tds.length < 6) continue;
    const pos = num(decodificar(tds[0].replace(/<[^>]+>/g, '')));
    const time = (tds[1].match(/<span[^>]*>([^<]+)<\/span>/) ?? [])[1];
    // logo: /_next/image?url=<endereço original codificado>&w=..
    const src = decodificar((tds[1].match(/<img[^>]*\ssrc="([^"]*)"/) ?? [])[1]);
    let logo = (src.match(/[?&]url=([^&]+)/) ?? [])[1];
    try { logo = logo ? decodeURIComponent(logo) : (/^https?:/.test(src) ? src : undefined); } catch { logo = undefined; }
    const [pts, j, v, d] = tds.slice(2, 6).map((t) => num(decodificar(t.replace(/<[^>]+>/g, ''))));
    if (!pos || !time) continue;
    linhas.push({ pos, time: nomeBonito(time), j, v, e: null, d, sg: null, pts, escudoAdvUrl: /^https?:/.test(logo ?? '') ? logo : undefined });
  }
  return valida(linhas);
}

const LEITORES = { lnb: lerTabelaLnb, cbv: lerTabelaCbv };
const FONTE = { lnb: 'LNB', cbv: 'CBV' };

// cfg: [{ tipo: 'lnb'|'cbv', url, nome, modalidade }]
export async function lerTabelasOficiais(cfg, log = () => {}) {
  const tabelas = [], problemas = [];
  for (const t of cfg ?? []) {
    if (t.ativo === false) continue;
    try {
      const ler = LEITORES[t.tipo];
      if (!ler) throw new Error(`tipo desconhecido "${t.tipo}"`);
      const r = await fetch(t.url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`respondeu ${r.status}`);
      const linhas = ler(await r.text());
      if (!linhas.length) { problemas.push(`Site da ${FONTE[t.tipo]}: tabela ${t.nome} não veio completa — mantive a da planilha.`); continue; }
      const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      tabelas.push({ nome: t.nome, modalidade: t.modalidade, fonte: 'automatica', fonteInfo: FONTE[t.tipo],
        atualizado: `em ${hoje} (site da ${FONTE[t.tipo]})`, linhas });
      log(`Site da ${FONTE[t.tipo]}: tabela ${t.nome} (${linhas.length} times).`);
    } catch (e) { problemas.push(`Site da ${FONTE[t.tipo] ?? t.tipo} (tabela ${t.nome}): ${e.message} — mantive a da planilha.`); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { tabelas, problemas };
}

// ---------- agenda do NBB (LNB): jogos do Flamengo com data, local, placar e onde assistir ----------
// https://lnb.com.br/nbb/tabela-de-jogos/ — cada jogo é um <tr class="with-hotel"> com DATA, CASA, placar, VISITANTE, GINÁSIO e logos das TVs
const limpaTxt = (s) => decodificar(String(s ?? '').replace(/<[^>]+>/g, ' '));
export function lerAgendaLnb(html, agora = Date.now()) {
  const jogos = [];
  for (const tr of html.match(/<tr class="with-hotel">[\s\S]*?<\/tr>/g) ?? []) {
    const id = (tr.match(/data-real-id="(\d+)"/) ?? [])[1];
    const dh = tr.match(/<span[^>]*>\s*(\d{2})\/(\d{2})\/(\d{4})\s*<\/span>\s*<span[^>]*>\s*(\d{1,2}):(\d{2})?/);
    const casa = limpaTxt((tr.match(/home_team_value[^>]*>([\s\S]*?)<\/td>/) ?? [])[1]);
    const fora = limpaTxt((tr.match(/visitor_team_value[^>]*>([\s\S]*?)<\/td>/) ?? [])[1]);
    if (!id || !dh || !casa || !fora) continue;
    const flaCasa = /flamengo/i.test(casa), flaFora = /flamengo/i.test(fora);
    if (flaCasa === flaFora) continue;
    const p = (n) => String(n).padStart(2, '0');
    const inicio = `${dh[3]}-${dh[2]}-${dh[1]}T${p(dh[4])}:${dh[5] ?? '00'}:00-03:00`;
    const logo = (cls) => decodificar((tr.match(new RegExp(`${cls}[^>]*>\\s*<img[^>]*src="([^"]+)"`)) ?? [])[1]);
    const placarTd = (tr.match(/score_value show-for-medium[^>]*>([\s\S]*?)<\/td>/) ?? [])[1] ?? '';
    const pc = num((placarTd.match(/class="home"[^>]*>\s*(\d+)/) ?? [])[1]), pf = num((placarTd.match(/class="away"[^>]*>\s*(\d+)/) ?? [])[1]);
    const tvTd = (tr.match(/logo_tv_value[^>]*>([\s\S]*?)<\/td>/) ?? [])[1] ?? '';
    const tv = [...new Set([...tvTd.matchAll(/<img[^>]*(?:title|alt)="([^"]+)"/g)].map((m) => decodificar(m[1])).filter(Boolean))];
    const fase = limpaTxt((tr.match(/stage_value hide_value[^>]*>([\s\S]*?)<\/td>/) ?? [])[1]);
    const ginasio = limpaTxt((tr.match(/gym_value[^>]*>([\s\S]*?)<(?:div|\/td)/) ?? [])[1]);
    const adv = nomeBonito(flaCasa ? fora : casa);
    const placar = pc !== null && pf !== null && new Date(inicio).getTime() < agora ? { flamengo: flaCasa ? pc : pf, adversario: flaCasa ? pf : pc } : null;
    jogos.push({
      id: `lnb-${id}`, modalidade: 'basquete', adversario: adv, competicao: fase && !/turno/i.test(fase) ? `NBB – ${fase.toLowerCase()}` : 'NBB',
      inicio, semHora: false, local: ginasio, mandante: flaCasa, transmissao: tv, placar, status: placar ? 'encerrado' : 'agendado',
      fonte: 'automatica', fonteInfo: 'LNB', escudoAdvUrl: logo(flaCasa ? 'logo_visitor_team' : 'logo_home_team') || undefined, tabela: 'NBB',
    });
  }
  return jogos;
}

export async function lerJogosLnb(url, log = () => {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`respondeu ${r.status}`);
  const jogos = lerAgendaLnb(await r.text());
  if (!jogos.length) throw new Error('nenhum jogo do Flamengo na agenda (formato mudou?)');
  log(`Site da LNB: agenda do NBB — ${jogos.length} jogos do Flamengo.`);
  return jogos;
}
