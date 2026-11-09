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

// "Mil Sports, Sportv" -> ["Mil Sports", "SporTV"]
const NOMES_CANAIS = { sportv: 'SporTV', 'sportv 2': 'SporTV 2', 'sportv 3': 'SporTV 3', premiere: 'Premiere', globo: 'Globo', 'tv globo': 'Globo', 'ge tv': 'ge TV', getv: 'ge TV', cazetv: 'CazéTV', 'cazé tv': 'CazéTV', 'caze tv': 'CazéTV', record: 'Record', band: 'Band', espn: 'ESPN', 'prime video': 'Prime Video', youtube: 'YouTube' };
export function lerCanais(html) {
  const txt = dadosDaPagina(html);
  const bruto = (txt.match(/"canais":"([^"]*)"/) ?? [])[1] ?? '';
  return [...new Set(bruto.split(/[,;\/]| e /).map((c) => c.trim()).filter((c) => c && !/^(a definir|a confirmar|-|n\/?a)$/i.test(c))
    .map((c) => NOMES_CANAIS[c.toLowerCase()] ?? c))];
}
async function baixarUrl(u) {
  const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${u} respondeu ${r.status}`);
  return r.text();
}

async function baixar(caminho) {
  const r = await fetch(BASE + caminho, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.text();
}
const pausa = () => new Promise((r) => setTimeout(r, 1200));

// cfg: { ativo, anos: [2026, 2027], desde, campeonatos: [{ campeonato, categoria, nome, modalidade, categoriaApp?, jogos?, tabela? }] }
// Anos futuros (ex.: 2027) ainda sem página na CBF não contam como erro: os jogos entram sozinhos quando forem publicados.
export async function lerCbf(cfg, log = () => {}) {
  const jogos = [], tabelas = [], problemas = [], campeonatosComFalha = [];
  const atual = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
  const anos = (cfg?.anos ?? [cfg?.ano ?? atual]).map(Number).sort();
  const futuro = (ano) => ano > atual;
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  for (const c of cfg?.campeonatos ?? []) {
    if (c.jogos !== false) {
      let falhou = false;
      for (const ano of anos) {
        try {
          const lidos = lerJogosDoTime(await baixar(`/times/${c.campeonato}/${c.categoria}/${ano}/${ID_FLAMENGO}`), c, Date.now(), cfg.desde);
          jogos.push(...lidos);
          if (lidos.length || !futuro(ano)) log(`CBF: ${c.nome} ${ano} — ${lidos.length} jogos do Flamengo.`);
        } catch (e) {
          if (futuro(ano) && /respondeu 404/.test(e.message)) continue; // ano que vem ainda não publicado
          problemas.push(`CBF (${c.nome} ${ano}, jogos): ${e.message}`); falhou = true;
        }
        await pausa();
      }
      if (falhou) campeonatosComFalha.push(`${c.campeonato}/${c.categoria}`);
    }
    if (c.tabela) {
      let achou = false, erro = null;
      // a temporada mais nova que já tiver tabela com o Flamengo
      for (const ano of [...anos].reverse()) {
        const rota = `${c.campeonato}/${c.categoria}/${ano}`;
        try {
          // fases por pontos; da mais recente para a mais antiga, fica com a primeira que tem o Flamengo
          const todas = lerFases(await baixar(`/tabelas/${rota}`));
          const fases = todas.filter((f) => f.fase_tipo === 'pontuacao');
          await pausa();
          for (const f of fases.reverse()) {
            const t = lerTabela(await baixar(`/tabelas/${rota}/${f.fase_id}`));
            await pausa();
            if (!t.linhas.length) continue;
            const sufixo = [todas.length > 1 ? f.fase_nome : '', t.grupo && !/unico|único/i.test(t.grupo) ? t.grupo.replace(/^GRUPO/i, 'Grupo') : ''].filter(Boolean).join(' · ');
            tabelas.push({ nome: c.tabela, modalidade: c.modalidade, fonte: 'automatica', fonteInfo: 'CBF',
              atualizado: `em ${hoje} (site da CBF${anos.length > 1 ? `, ${ano}` : ''})${sufixo ? ' — ' + sufixo : ''}`, linhas: t.linhas });
            log(`CBF: tabela ${c.tabela} ${ano} (${t.linhas.length} times${sufixo ? ', ' + sufixo : ''}).`);
            achou = true;
            break;
          }
        } catch (e) { if (!(futuro(ano) && /respondeu 404/.test(e.message))) erro = e; }
        if (achou) break;
      }
      if (!achou) problemas.push(erro ? `CBF (tabela ${c.tabela}): ${erro.message} — mantive a publicada antes.` : `CBF: tabela ${c.tabela} sem fase por pontos com o Flamengo — mantive a publicada antes.`);
    }
  }
  // onde assistir: a página de cada jogo traz o canal oficial ("canais":"Premiere"). Só jogos de ontem até 14 dias à frente.
  const agora = Date.now();
  for (const j of jogos) {
    const t = new Date(j.inicio).getTime();
    if (!j.link || t < agora - 864e5 || t > agora + 14 * 864e5) continue;
    try {
      const canais = lerCanais(await baixarUrl(j.link));
      if (canais.length) j.transmissao = canais;
    } catch { /* sem canal desta vez: fica "a confirmar" */ }
    await pausa();
  }
  return { jogos, tabelas, problemas, campeonatosComFalha };
}
