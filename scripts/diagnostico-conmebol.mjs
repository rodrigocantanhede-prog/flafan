// Diagnóstico (temporário): estuda o site da CONMEBOL (Libertadores, Sul-Americana, Recopa, Libertadores Feminina e Sub-20). Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
await mkdir('diagnostico', { recursive: true });
const status = {};
const limpa = (t) => t.replace(/[A-Za-z0-9+/=_-]{40,}/g, '[x]');
const urls = {
  robots: 'https://www.conmebol.com/robots.txt',
  home: 'https://www.conmebol.com/',
  libertadores: 'https://www.conmebol.com/libertadores/',
  'libertadores-pt': 'https://www.conmebol.com/pt-br/libertadores/',
  fixture: 'https://www.conmebol.com/libertadores/fixture/',
  'cl-com': 'https://www.conmebollibertadores.com/',
  'cl-pt': 'https://www.conmebollibertadores.com/pt-br/',
  feminina: 'https://www.conmebol.com/libertadores-femenina/',
  sub20: 'https://www.conmebol.com/libertadores-sub-20/',
  sulamericana: 'https://www.conmebol.com/sudamericana/',
  recopa: 'https://www.conmebol.com/recopa/',
};
for (const [nome, u] of Object.entries(urls)) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    status[nome] = { url: u, final: r.url, status: r.status, tipo: r.headers.get('content-type'), bytes: t.length, flamengo: (t.match(/flamengo/gi) ?? []).length,
      next: t.includes('__next_f') ? 'app' : t.includes('__NEXT_DATA__') ? 'pages' : t.includes('wp-content') ? 'wordpress' : '',
      apis: [...new Set(t.match(/https?:\/\/[a-z0-9.-]*(?:api|cdn|fixture|stats|data|opta|sportradar|genius)[a-z0-9.-]*\.[a-z]+[^"'\s<>\\]*/gi) ?? [])].slice(0, 40),
      links: [...new Set([...t.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]).filter((l) => /fixture|partido|calend|resultado|tabla|posicion|match|jogo|flamengo/i.test(l)))].slice(0, 60) };
    if (nome !== 'robots') await writeFile(`diagnostico/${nome}.html`, limpa(t).slice(0, 1500000));
    else await writeFile('diagnostico/robots.txt', t.slice(0, 20000));
  } catch (e) { status[nome] = { url: u, erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1500));
}
await writeFile('diagnostico/conmebol-status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
