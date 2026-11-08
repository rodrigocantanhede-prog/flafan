// Diagnóstico (temporário): baixa páginas oficiais para achar onde assistir os jogos da semana. Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'Mozilla/5.0 (compatible; FlaFan/1.0; +https://github.com/rodrigocantanhede-prog/flafan)';
const urls = {
  'lnb-tabela': 'https://lnb.com.br/nbb/tabela-de-jogos/',
  'lnb-nbb': 'https://lnb.com.br/nbb/',
  'fiba-lsb-noticia': 'https://www.fiba.basketball/en/news/liga-sudamericana-de-baloncesto-2026-full-schedule-tip-off-times',
  'fiba-lsb': 'https://www.fiba.basketball/en/events/liga-sudamericana-de-baloncesto-2026',
  'fla-feminino': 'https://www.flamengo.com.br/futebol-feminino/proximos-jogos',
  'fla-basquete': 'https://www.flamengo.com.br/basquete/proximos-jogos',
  'fla-volei': 'https://www.flamengo.com.br/volei/proximos-jogos',
  'fla-futebol': 'https://www.flamengo.com.br/futebol/proximos-jogos',
  'fferj': 'https://www.fferj.com.br/',
};
await mkdir('diagnostico', { recursive: true });
const status = {};
for (const [nome, u] of Object.entries(urls)) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    status[nome] = { url: u, status: r.status, bytes: t.length,
      tv: [...new Set((t.match(/(sportv|espn|globo|premiere|cultura|youtube|basquet ?pass|fla ?tv|flatv|courtside|cazé|caze|prime video|amazon|band|record|vasco ?tv|dazn|max)\b/gi) ?? []).map((x) => x.toLowerCase()))] };
    await writeFile(`diagnostico/${nome}.html`, t.slice(0, 1200000));
  } catch (e) { status[nome] = { url: u, erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1200));
}
await writeFile('diagnostico/tv-status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
