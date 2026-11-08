// Diagnóstico (temporário): procura no site do Flamengo a página com os próximos jogos da base (Sub-20, Sub-17).
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const B = 'https://www.flamengo.com.br';
const caminhos = ['/', '/futebol/proximos-jogos', '/futebol-de-base/proximos-jogos', '/base/proximos-jogos', '/futebol-base/proximos-jogos',
  '/categorias-de-base/proximos-jogos', '/futebol/base/proximos-jogos', '/futebol/sub-20/proximos-jogos', '/futebol/categorias-de-base', '/futebol-de-base'];
await mkdir('diagnostico', { recursive: true });
const status = {};
const links = new Set();
for (const c of caminhos) {
  try {
    const r = await fetch(B + c, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    const artigos = t.match(/<article[^>]*data-analytics-match-date[^>]*>/g) ?? [];
    status[c] = { status: r.status, final: r.url, bytes: t.length, jogos: artigos.length,
      esportes: [...new Set(artigos.map((a) => (a.match(/data-analytics-match-sport="([^"]*)"/) ?? [])[1]))],
      sub: (t.match(/sub[- ]?\d{2}/gi) ?? []).length };
    for (const m of t.matchAll(/href="([^"]*(?:base|sub-?\d|categoria)[^"]*)"/gi)) links.add(m[1]);
    if (r.ok && c !== '/') await writeFile(`diagnostico/${c.replace(/\W+/g, '_')}.html`, t.slice(0, 600000));
  } catch (e) { status[c] = { erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1200));
}
status.links = [...links].slice(0, 200);
await writeFile('diagnostico/base-status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
