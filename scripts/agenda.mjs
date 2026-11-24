// Página em texto simples para o Google (e outros buscadores) encontrarem o RubroNegro+:
// agenda/index.html com os próximos jogos, onde assistir e os últimos resultados, e o sitemap.xml.
// O app em si é montado no celular de quem abre; esta página já vem pronta, que é o que os buscadores leem melhor.
//   node scripts/agenda.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE = 'https://rubronegroplus.com';
const FUSO = 'America/Sao_Paulo';
const MOD = { 'futebol-masculino': 'Futebol masculino', 'futebol-feminino': 'Futebol feminino', base: 'Categorias de base', basquete: 'Basquete', 'volei-feminino': 'Vôlei feminino', 'volei-masculino': 'Vôlei masculino', futsal: 'Futsal', olimpicos: 'Esportes olímpicos' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO });
const fCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO });
const fHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const confronto = (j) => (j.mandante === false ? `${j.adversario} x Flamengo` : `Flamengo x ${j.adversario}`);
const nomeComp = (j) => [j.competicao || MOD[j.modalidade] || '', j.categoria && !String(j.competicao).includes(j.categoria) ? j.categoria : ''].filter(Boolean).join(' · ');

// dados estruturados (schema.org) de um jogo: é o que permite ao Google mostrar data, local e times
export function eventoLd(j) {
  const ev = { '@type': 'SportsEvent', name: `${confronto(j)} – ${nomeComp(j)}`, startDate: j.semHora ? j.inicio.slice(0, 10) : j.inicio, eventStatus: 'https://schema.org/EventScheduled', url: `${SITE}/?jogo=${encodeURIComponent(j.id)}`, sport: MOD[j.modalidade] ?? 'Esporte',
    competitor: [{ '@type': 'SportsTeam', name: 'Flamengo' }, { '@type': 'SportsTeam', name: j.adversario }] };
  if (j.local) ev.location = { '@type': 'Place', name: j.local };
  return ev;
}

export function montarAgenda(jogos, agora = Date.now()) {
  const jogosSo = (jogos ?? []).filter((j) => j.tipo !== 'evento' && j.adversario && j.status !== 'cancelado');
  const proximos = jogosSo.filter((j) => new Date(j.inicio).getTime() > agora - 3 * 3600e3 && !j.placar).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 40);
  const resultados = jogosSo.filter((j) => j.placar && j.status === 'encerrado' && new Date(j.inicio).getTime() <= agora).sort((a, b) => b.inicio.localeCompare(a.inicio)).slice(0, 20);
  const linhaProx = (j) => {
    const quando = `${maiuscula(fDia.format(new Date(j.inicio)))}${j.semHora ? ', horário a definir' : `, às ${fHora.format(new Date(j.inicio))}`}`;
    const canal = j.transmissao?.length ? `Onde assistir: ${j.transmissao.join(', ')}.` : 'Onde assistir: a confirmar.';
    return `<li><a href="../?jogo=${encodeURIComponent(j.id)}"><strong>${esc(confronto(j))}</strong></a> — ${esc(nomeComp(j))}<br>${esc(quando)}${j.local ? ` · ${esc(j.local)}` : ''}<br>${esc(canal)}</li>`;
  };
  const linhaRes = (j) => {
    const [a, b] = j.mandante === false ? [j.placar.adversario, j.placar.flamengo] : [j.placar.flamengo, j.placar.adversario];
    const [ta, tb] = j.mandante === false ? [j.adversario, 'Flamengo'] : ['Flamengo', j.adversario];
    return `<li>${esc(fCurto.format(new Date(j.inicio)))} — <strong>${esc(ta)} ${a} x ${b} ${esc(tb)}</strong> — ${esc(nomeComp(j))}${j.observacao ? ` (${esc(j.observacao)})` : ''}</li>`;
  };
  const ld = { '@context': 'https://schema.org', '@graph': proximos.slice(0, 20).map(eventoLd) };
  const hoje = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: FUSO }).format(new Date(agora));
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Próximos jogos do Flamengo: datas, horários e onde assistir | RubroNegro+</title>
  <meta name="description" content="Agenda dos próximos jogos do Flamengo em todas as modalidades (futebol, feminino, base, basquete e vôlei), com horário de Brasília, local e canal de TV. Atualizada todos os dias.">
  <link rel="canonical" href="${SITE}/agenda/">
  <meta property="og:title" content="Próximos jogos do Flamengo e onde assistir">
  <meta property="og:description" content="Futebol, feminino, base, basquete e vôlei: datas, horários e canais. Grátis, no RubroNegro+.">
  <meta property="og:image" content="${SITE}/icons/icon-512.png">
  <meta property="og:url" content="${SITE}/agenda/">
  <meta property="og:locale" content="pt_BR">
  <meta name="theme-color" content="#0B0B0D">
  <link rel="icon" href="../icons/favicon-64.png">
  <link rel="stylesheet" href="../styles.css">
  <script>try { const t = localStorage.getItem('flafan:tema'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}</script>
  <style>
    .pagina { max-width: 720px; margin: 0 auto; padding: 22px 18px 48px; line-height: 1.55; font-size: 16px; color: var(--texto); }
    .pagina h1 { font-size: 26px; line-height: 1.2; margin: 0 0 8px; }
    .pagina h2 { font-size: 19px; margin: 30px 0 10px; }
    .pagina p, .pagina li { color: var(--suave); }
    .pagina strong { color: var(--texto); }
    .pagina a { color: inherit; }
    .pagina ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .pagina li { background: var(--vidro); border: 1px solid var(--vidro-borda); border-radius: 16px; padding: 12px 14px; }
    .pagina .abrir { display: inline-block; margin: 6px 0 4px; padding: 11px 18px; border-radius: 999px; background: #E3141B; color: #fff; font-weight: 700; text-decoration: none; }
    .pagina .nota { font-size: 13px; margin-top: 26px; }
  </style>
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <main class="pagina">
    <h1>Próximos jogos do Flamengo e onde assistir</h1>
    <p>Todas as modalidades em um só lugar: futebol masculino e feminino, categorias de base, basquete e vôlei. Horários de Brasília. Atualizado em ${esc(hoje)}.</p>
    <p><a class="abrir" href="../">Abrir o RubroNegro+</a></p>
    <p>No app você também vê as tabelas de classificação, o calendário do mês e recebe um aviso no celular uma hora antes de cada jogo.</p>

    <h2>Próximos jogos</h2>
    ${proximos.length ? `<ul>\n      ${proximos.map(linhaProx).join('\n      ')}\n    </ul>` : '<p>Nenhum jogo marcado no momento.</p>'}

    <h2>Últimos resultados</h2>
    ${resultados.length ? `<ul>\n      ${resultados.map(linhaRes).join('\n      ')}\n    </ul>` : '<p>Sem resultados recentes.</p>'}

    <p class="nota">RubroNegro+ é um app de torcedor, sem vínculo oficial com o clube. <a href="../privacidade.html">Privacidade</a></p>
  </main>
</body>
</html>
`;
}

export function montarSitemap(agora = Date.now()) {
  const dia = new Date(agora).toISOString().slice(0, 10);
  const url = (loc, freq, pri) => `  <url><loc>${SITE}${loc}</loc><lastmod>${dia}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${url('/', 'hourly', '1.0')}\n${url('/agenda/', 'hourly', '0.9')}\n${url('/privacidade.html', 'yearly', '0.2')}\n</urlset>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jogos = JSON.parse(readFileSync('data/jogos.json', 'utf8')).jogos;
  mkdirSync('agenda', { recursive: true });
  writeFileSync('agenda/index.html', montarAgenda(jogos));
  writeFileSync('sitemap.xml', montarSitemap());
  console.log('[agenda] página de agenda e sitemap atualizados.');
}
