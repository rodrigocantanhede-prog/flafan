// Diagnóstico (temporário): procura "onde assistir" nas páginas oficiais (CBF, CBV, site do Flamengo). Guarda só trechos de texto. Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const urls = {
  'cbf-jogo-seriea': 'https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/serie-a/2026/flamengo-x-gremio/832221',
  'cbf-jogo-feminino': 'https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/feminino/2026/flamengo-x-bahia/835451',
  'cbf-jogo-sub20': 'https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/sub-20/2026/flamengo-x-operario/835459',
  'cbf-tabela-seriea': 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026',
  'cbv-tabela': 'https://cbv.com.br/volei-de-quadra/superliga-a-feminina/tabela',
  'cbv-jogos': 'https://cbv.com.br/volei-de-quadra/superliga-a-feminina/jogos',
  'cbv-calendario': 'https://cbv.com.br/volei-de-quadra/superliga-a-feminina/calendario',
  'fla-futebol': 'https://www.flamengo.com.br/futebol/proximos-jogos',
  'fla-volei': 'https://www.flamengo.com.br/volei/proximos-jogos',
};
const TV = /(transmiss|onde assistir|sportv|globo|premiere|caz[ée]|youtube|prime video|amazon|record|band\b|espn|disney|tv brasil|fla ?tv|flamengo tv|vbtv|volleyball ?world|dazn|max\b|paramount|goat)/i;
await mkdir('diagnostico', { recursive: true });
const status = {};
for (const [nome, u] of Object.entries(urls)) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const h = await r.text();
    // texto do RSC (Next.js) + texto visível
    let rsc = '';
    for (const m of h.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) { try { rsc += JSON.parse(`"${m[1]}"`); } catch { /* */ } }
    const visivel = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const trechos = [...`${visivel}\n${rsc}`.matchAll(new RegExp(`.{0,160}${TV.source}.{0,200}`, 'gi'))].map((m) => m[0]).slice(0, 40);
    const chaves = [...new Set(rsc.match(/"(transmiss[a-z_]*|tv[a-z_]*|emissora[s]?|canal[a-z_]*|broadcast[a-z_]*|streaming[a-z_]*)":/gi) ?? [])];
    const links = [...new Set([...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((l) => /partida|jogo|match|onde-assistir|pre-jogo/i.test(l)))].slice(0, 30);
    status[nome] = { url: u, final: r.url, status: r.status, bytes: h.length, chaves, links };
    await writeFile(`diagnostico/${nome}.txt`, trechos.join('\n---\n').replace(/[A-Za-z0-9+/=_-]{40,}/g, '[x]'));
  } catch (e) { status[nome] = { url: u, erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1500));
}
await writeFile('diagnostico/tv-status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
