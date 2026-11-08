// Diagnóstico (temporário, v3): procura a página "How to watch LSB 2026" da FIBA. Guarda só texto. Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'Mozilla/5.0 (compatible; FlaFan/1.0; +https://github.com/rodrigocantanhede-prog/flafan)';
const base = 'https://www.fiba.basketball';
await mkdir('diagnostico', { recursive: true });
const status = {};
const texto = (t) => t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
// 1) acha o link da notícia "how to watch" a partir da página da competição
const links = new Set(['/en/news/how-to-watch-lsb-2026', '/en/news/how-to-watch-liga-sudamericana-de-baloncesto-2026']);
try {
  const t = await (await fetch(`${base}/en/events/liga-sudamericana-de-baloncesto-2026`, { headers: { 'user-agent': UA } })).text();
  for (const m of t.matchAll(/href="([^"]*(?:watch|como-ver|donde-ver)[^"]*)"/gi)) links.add(m[1]);
  for (const m of t.matchAll(/"(\/en\/news\/[^"]*watch[^"]*)"/gi)) links.add(m[1]);
} catch (e) { status.evento = e.message; }
for (const l of links) {
  const u = l.startsWith('http') ? l : base + l;
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow' });
    const t = texto(await r.text());
    const i = t.search(/how to watch|watch live|courtside|youtube|dazn/i);
    status[u] = { status: r.status, trecho: (i >= 0 ? t.slice(Math.max(0, i - 400), i + 2500) : t.slice(0, 600)).replace(/[A-Za-z0-9]{28,}/g, '[x]') };
  } catch (e) { status[u] = { erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1200));
}
await writeFile('diagnostico/tv-status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
