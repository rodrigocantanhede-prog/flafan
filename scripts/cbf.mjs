// Leitura do site da CBF (páginas públicas; o site não tem robots.txt com restrições).
// Jogos do Flamengo em cada campeonato: https://www.cbf.com.br/futebol-brasileiro/times/<campeonato>/<categoria>/<ano>/20016
// Tabelas (fases por pontos):           https://www.cbf.com.br/futebol-brasileiro/tabelas/<campeonato>/<categoria>/<ano>[/<fase>]
// O site é feito em Next.js: os dados vêm dentro do HTML, em pedaços self.__next_f.push([1,"..."]).

const BASE = 'https://www.cbf.com.br/futebol-brasileiro';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
export const ID_FLAMENGO = '20016';

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const limparNome = (s) => String(s ?? '').replace(/\s+saf$/i, '').replace(/\s+/g, ' ').trim();
// o servidor de imagens da CBF não responde para o robô; o próprio site entrega a mesma imagem por /_next/image
export const escudoCbf = (u) => !u ? undefined : /^https:\/\/conteudo\.cbf\.com\.br\//.test(u)
  ? `https://www.cbf.com.br/_next/image?url=${encodeURIComponent(u)}&w=128&q=70` : u;
const num = (s) => { if (s === null || s === undefined || String(s).trim() === '') return null; const n = Number(s); return Number.isFinite(n) ? n : null; };

// junta os pedaços de dados da página
export function dadosDaPagina(html) {
  let txt = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try { txt += JSON.parse(`"${m[1]}"`); } catch { /* pedaço estranho: ignora */ }
  }
  return txt;
}

// acha cada objeto JSON que começa com {"<chave>": e devolve já convertido
export function objetos(txt, chave) {
  const res = [];
  const alvo = `{"${chave}":`;
  let i = txt.indexOf(alvo);
  while (i >= 0) {
    let prof = 0, emTexto = false, fim = -1;
    for (let k = i; k < txt.length; k++) {
      const c = txt[k];
      if (emTexto) { if (c === '\\') k++; else if (c === '"') emTexto = false; continue; }
      if (c === '"') emTexto = true;
      else if (c === '{' || c === '[') prof++;
      else if (c === '}' || c === ']') { prof--; if (prof === 0) { fim = k; break; } }
    }
    if (fim < 0) break;
    try { res.push(JSON.parse(txt.slice(i, fim + 1))); } catch { /* ignora */ }
    i = txt.indexOf(alvo, i + 1);
  }
  return res;
}

// " 08/09/2026" + "15:00" -> ISO em Brasília
function inicioDe(data, hora) {
  const d = String(data ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!d) return null;
  const h = String(hora ?? '').trim().match(/^(\d{1,2}):(\d{2})/);
  const p = (n) => String(n).padStart(2, '0');
  return { iso: `${d[3]}-${p(d[2])}-${p(d[1])}T${p(h ? h[1] : 0)}:${h ? h[2] : '00'}:00-03:00`, temHora: !!h };
}

// cfg de cada campeonato: { campeonato, categoria, nome, modalidade, categoriaApp?, tabela? }
// Jogos do Flamengo a partir da página do time no campeonato
export function lerJogosDoTime(html, c, agora = Date.now(), desde = null) {
  const vistos = new Map();
  for (const o of objetos(dadosDaPagina(html), 'id_jogo')) {
    if (!o.data || !o.mandante?.nome || !o.visitante?.nome) continue;
    vistos.set(o.id_jogo, o);
  }
  const jogos = [];
  for (const o of vistos.values()) {
    const ini = inicioDe(o.data, o.hora);
    if (!ini) continue;
    if (desde && ini.iso.slice(0, 10) < desde) continue;
    const flaCasa = String(o.mandante.id) === ID_FLAMENGO || /flamengo/i.test(o.mandante.nome);
    const flaFora = String(o.visitante.id) === ID_FLAMENGO || /flamengo/i.test(o.visitante.nome);
    if (flaCasa === flaFora) continue;
    const fla = flaCasa ? o.mandante : o.visitante, adv = flaCasa ? o.visitante : o.mandante;
    const gf = num(fla.gols), ga = num(adv.gols);
    const passou = new Date(ini.iso).getTime() + 2.5 * 3600e3 < agora;
    const placar = passou && gf !== null && ga !== null ? { flamengo: gf, adversario: ga } : null;
    const jogo = {
      id: `cbf-${o.id_jogo}`, modalidade: c.modalidade, adversario: limparNome(adv.nome), competicao: c.nome,
      inicio: ini.iso, semHora: !ini.temHora, local: String(o.local ?? '').replace(/\s+/g, ' ').trim(),
      mandante: flaCasa, transmissao: [], placar, status: placar ? 'encerrado' : 'agendado',
      fonte: 'automatica', fonteInfo: 'CBF', campeonatoCbf: `${c.campeonato}/${c.categoria}`, escudoReserva: escudoCbf(adv.url_escudo),
      link: `${BASE}/jogos/${c.campeonato}/${c.categoria}/${ini.iso.slice(0, 4)}/${slug(o.mandante.nome)}-x-${slug(o.visitante.nome)}/${o.id_jogo}`,
    };
    if (c.categoriaApp) jogo.categoria = c.categoriaApp;
    if (c.tabela) jogo.tabela = c.tabela;
    const pf = num(fla.panaltis), pa = num(adv.panaltis);
    if (placar && (pf || pa)) jogo.observacao = `Pênaltis: Flamengo ${pf ?? 0} x ${pa ?? 0}`;
    jogos.push(jogo);
  }
  return jogos.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// Fases do campeonato (a atual + as outras) — vem no objeto competitionData
export function lerFases(html) {
  const c = objetos(dadosDaPagina(html), 'competitionId')[0];
  if (!c) return [];
  return [...(Array.isArray(c.phasesList) ? c.phasesList : []), c.phase].filter((f) => f && typeof f === 'object' && f.fase_id)
    .filter((f, i, a) => a.findIndex((x) => x.fase_id === f.fase_id) === i);
}

// Tabela da fase (só o grupo do Flamengo, ou o grupo único). Traz todas as colunas da CBF.
export function lerTabela(html) {
  const txt = dadosDaPagina(html);
  // cada grupo: {"title":"GRUPO A","data":[{"cod_time":...}, ...]}
  const grupos = objetos(txt, 'title').filter((g) => Array.isArray(g.data) && g.data[0]?.cod_time);
  const grupo = grupos.find((g) => g.data.some((t) => String(t.cod_time) === ID_FLAMENGO)) ?? (grupos.length === 1 ? grupos[0] : null);
  if (!grupo) return { grupo: null, linhas: [] };
  const linhas = grupo.data.map((t) => ({
    pos: num(t.posicao), time: limparNome(t.time), j: num(t.jogos), v: num(t.vitorias), e: num(t.empates), d: num(t.derrotas),
    gp: num(t.gols_pro), gc: num(t.gols_contra), sg: num(t.gols_saldo), pts: num(t.pontos), ap: num(t.aproveitamento),
    ca: num(t.cartoes_amarelo), cv: num(t.cartoes_vermelho),
    ult: Array.isArray(t.ultimos_jogos) ? t.ultimos_jogos.filter((x) => /^[VED]$/.test(x)) : [],
    escudoReserva: escudoCbf(t.escudo),
  })).filter((l) => l.pos && l.time).sort((a, b) => a.pos - b.pos);
  const ok = linhas.length >= 4 && linhas.every((l, i) => l.pos === i + 1) && linhas.some((l) => l.j > 0);
  return { grupo: grupo.title, linhas: ok ? linhas : [] };
}

async function baixar(caminho) {
  const r = await fetch(BASE + caminho, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.text();
}
const pausa = () => new Promise((r) => setTimeout(r, 1200));

// cfg: { ativo, ano, desde, campeonatos: [{ campeonato, categoria, nome, modalidade, categoriaApp?, jogos?, tabela? }] }
export async function lerCbf(cfg, log = () => {}) {
  const jogos = [], tabelas = [], problemas = [], campeonatosComFalha = [];
  const ano = cfg?.ano ?? new Date().getFullYear();
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  for (const c of cfg?.campeonatos ?? []) {
    const rota = `${c.campeonato}/${c.categoria}/${ano}`;
    if (c.jogos !== false) {
      try {
        const lidos = lerJogosDoTime(await baixar(`/times/${rota}/${ID_FLAMENGO}`), c, Date.now(), cfg.desde);
        jogos.push(...lidos);
        log(`CBF: ${c.nome} — ${lidos.length} jogos do Flamengo.`);
      } catch (e) { problemas.push(`CBF (${c.nome}, jogos): ${e.message}`); campeonatosComFalha.push(`${c.campeonato}/${c.categoria}`); }
      await pausa();
    }
    if (c.tabela) {
      try {
        // fases por pontos; da mais recente para a mais antiga, fica com a primeira que tem o Flamengo
        const todas = lerFases(await baixar(`/tabelas/${rota}`));
        const fases = todas.filter((f) => f.fase_tipo === 'pontuacao');
        await pausa();
        let achou = false;
        for (const f of fases.reverse()) {
          const t = lerTabela(await baixar(`/tabelas/${rota}/${f.fase_id}`));
          await pausa();
          if (!t.linhas.length) continue;
          const sufixo = [todas.length > 1 ? f.fase_nome : '', t.grupo && !/unico|único/i.test(t.grupo) ? t.grupo.replace(/^GRUPO/i, 'Grupo') : ''].filter(Boolean).join(' · ');
          tabelas.push({ nome: c.tabela, modalidade: c.modalidade, fonte: 'automatica', fonteInfo: 'CBF',
            atualizado: `em ${hoje} (site da CBF)${sufixo ? ' — ' + sufixo : ''}`, linhas: t.linhas });
          log(`CBF: tabela ${c.tabela} (${t.linhas.length} times${sufixo ? ', ' + sufixo : ''}).`);
          achou = true;
          break;
        }
        if (!achou) problemas.push(`CBF: tabela ${c.tabela} sem fase por pontos com o Flamengo — mantive a publicada antes.`);
      } catch (e) { problemas.push(`CBF (tabela ${c.tabela}): ${e.message}`); }
    }
  }
  return { jogos, tabelas, problemas, campeonatosComFalha };
}
