// Leitura do site oficial do Flamengo (páginas públicas; o robots.txt só restringe /api, login, conta e busca da loja).
// Próximos jogos: https://www.flamengo.com.br/<modalidade>/proximos-jogos
// Classificação:  https://www.flamengo.com.br/futebol/classificacao

const BASE = 'https://www.flamengo.com.br';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const decodificar = (s) => String(s ?? '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
const attr = (tag, nome) => decodificar((tag.match(new RegExp(`${nome}="([^"]*)"`)) ?? [])[1] ?? '');

// "12 Nov, 21:00" -> ISO em Brasília. O site não mostra o ano: usa o ano que deixa a data mais perto de hoje.
export function dataDoSite(texto, hoje = new Date()) {
  const m = semAcento(texto).match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s*(?:(\d{1,2}):(\d{2}))?/);
  if (!m || !MESES[m[2]]) return null;
  const [d, mes] = [Number(m[1]), MESES[m[2]]];
  const ano0 = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(hoje));
  let melhor = null;
  for (const ano of [ano0 - 1, ano0, ano0 + 1]) {
    const t = Date.UTC(ano, mes - 1, d, 12);
    if (!melhor || Math.abs(t - hoje) < Math.abs(melhor.t - hoje)) melhor = { ano, t };
  }
  const p = (n) => String(n).padStart(2, '0');
  return { iso: `${melhor.ano}-${p(mes)}-${p(d)}T${p(m[3] ?? 0)}:${p(m[4] ?? 0)}:00-03:00`, temHora: m[3] !== undefined };
}

function modalidadeDe(pagina, esporte) {
  const e = semAcento(esporte);
  const cat = (esporte.match(/sub[- ]?(\d+)/i) ?? [])[1];
  if (pagina === 'volei') return { modalidade: e.includes('masc') ? 'volei-masculino' : 'volei-feminino' };
  if (pagina === 'basquete') return { modalidade: 'basquete', categoria: cat ? `Sub-${cat}` : undefined };
  if (pagina === 'futebol-feminino') return { modalidade: 'futebol-feminino', categoria: cat ? `Sub-${cat}` : undefined };
  if (pagina === 'futebol') return cat ? { modalidade: 'base', categoria: `Sub-${cat}` } : { modalidade: 'futebol-masculino' };
  return { modalidade: pagina };
}

// Lê os cartões <article data-analytics-match-...> da página de próximos jogos
export function lerProximosJogos(html, pagina, hoje = new Date()) {
  const jogos = [];
  const artigos = html.match(/<article[^>]*data-analytics-match-date[\s\S]*?<\/article>/g) ?? [];
  for (const a of artigos) {
    const abre = a.slice(0, a.indexOf('>') + 1);
    const data = dataDoSite(attr(abre, 'data-analytics-match-date'), hoje);
    // cada time: <div ...matchTeamsEmblem> [<img ... src="escudo">] <p>Nome</p> </div> (o escudo às vezes falta)
    const times = [...a.matchAll(/<div[^>]*matchTeamsEmblem[^>]*>([\s\S]*?)<\/div>/g)].map((m) => ({
      escudo: decodificar((m[1].match(/<img[^>]*src="([^"]*)"/) ?? [])[1]),
      nome: decodificar((m[1].match(/<p[^>]*>([^<]+)<\/p>/) ?? [])[1]),
    })).filter((t) => t.nome);
    if (!data || times.length !== 2) continue;
    const iFla = times.findIndex((t) => /flamengo/i.test(t.nome));
    if (iFla < 0) continue;
    const adv = times[1 - iFla];
    const esporte = attr(abre, 'data-analytics-match-sport');
    const { modalidade, categoria } = modalidadeDe(pagina, esporte);
    const estado = semAcento(attr(abre, 'data-analytics-match-state'));
    const ingresso = (a.match(/<a[^>]*(?:Ingresso|ingresso)[^>]*href="(https?:[^"]+)"/) ?? a.match(/<a[^>]*href="(https?:[^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*Ingresso/) ?? [])[1];
    const jogo = {
      id: `site-${modalidade}-${data.iso.slice(0, 10)}-${slug(adv.nome)}`,
      modalidade, adversario: adv.nome, competicao: attr(abre, 'data-analytics-match-competition'),
      inicio: data.iso, semHora: !data.temHora, local: attr(abre, 'data-analytics-match-venue'),
      mandante: iFla === 0, transmissao: [], placar: null,
      status: estado.includes('live') || estado.includes('vivo') ? 'ao-vivo' : estado.includes('finish') || estado.includes('encerr') ? 'encerrado' : 'agendado',
      fonte: 'automatica', fonteInfo: 'Site do Flamengo', escudoAdvUrl: adv.escudo || undefined,
    };
    if (categoria) jogo.categoria = categoria;
    if (ingresso) jogo.ingresso = decodificar(ingresso);
    jogos.push(jogo);
  }
  return jogos;
}

// Lê a tabela <table ...standingsTable>
export function lerClassificacao(html) {
  const tabela = (html.match(/<table[^>]*standingsTable[\s\S]*?<\/table>/) ?? [])[0];
  if (!tabela) return [];
  const linhas = [];
  for (const tr of tabela.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    if (/<th/.test(tr)) continue;
    const pos = Number((tr.match(/<span>\s*(\d+)\s*<\/span>/) ?? [])[1]);
    const time = decodificar((tr.match(/<img[^>]*>\s*<span>([^<]+)<\/span>/) ?? [])[1]);
    const escudo = decodificar((tr.match(/<img[^>]*src="([^"]+)"/) ?? [])[1]);
    const nums = [...tr.matchAll(/<td>\s*(-?\d+)\s*<\/td>/g)].map((m) => Number(m[1]));
    if (!pos || !time || nums.length < 8) continue;
    const [pts, j, v, e, d, , , sg] = nums;
    linhas.push({ pos, time, j, v, e, d, sg, pts, escudoAdvUrl: escudo || undefined });
  }
  // tabela "zerada" (sem jogos) não serve
  return linhas.some((l) => l.j > 0) ? linhas : [];
}

async function baixar(caminho) {
  const r = await fetch(BASE + caminho, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.text();
}

// cfg: { ativo, paginas: ['futebol', ...], classificacao: [{ pagina, nome, modalidade }] }
export async function lerSiteFlamengo(cfg, log = () => {}) {
  const jogos = [], tabelas = [], problemas = [];
  for (const pagina of cfg?.paginas ?? []) {
    try {
      const lidos = lerProximosJogos(await baixar(`/${pagina}/proximos-jogos`), pagina);
      jogos.push(...lidos);
      log(`Site do Flamengo: ${pagina} — ${lidos.length} próximos jogos.`);
    } catch (e) { problemas.push(`Site do Flamengo (${pagina}): ${e.message}`); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  for (const t of cfg?.classificacao ?? []) {
    try {
      const linhas = lerClassificacao(await baixar(`/${t.pagina}/classificacao`));
      if (linhas.length >= 4) {
        tabelas.push({ nome: t.nome, modalidade: t.modalidade, fonte: 'automatica', fonteInfo: 'Site do Flamengo',
          atualizado: `em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (site do Flamengo)`, linhas });
        log(`Site do Flamengo: tabela ${t.nome} (${linhas.length} times).`);
      } else problemas.push(`Site do Flamengo: tabela ${t.nome} vazia ou incompleta — mantive a da planilha.`);
    } catch (e) { problemas.push(`Site do Flamengo (tabela ${t.nome}): ${e.message}`); }
  }
  return { jogos, tabelas, problemas };
}
