// Diagnóstico (temporário): estuda o site da FERJ (jogos da base, feminino e profissional). Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const B = 'https://www.fferj.com.br';
await mkdir('diagnostico', { recursive: true });
const status = {};
const limpa = (t) => t.replace(/[A-Za-z0-9+/=_-]{40,}/g, '[x]');
const baixar = async (nome, u) => {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    status[nome] = { url: u, final: r.url, status: r.status, tipo: r.headers.get('content-type'), bytes: t.length, flamengo: (t.match(/flamengo/gi) ?? []).length,
      links: [...new Set([...t.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]).filter((l) => /jogo|agenda|competi|tabela|partida|calend|campeonato|base|feminino/i.test(l)))].slice(0, 80),
      apis: [...new Set(t.match(/(?:https?:)?\/\/[a-z0-9.-]+\/[^"'\s<>]*(?:api|graphql|json)[^"'\s<>]*/gi) ?? [])].slice(0, 30) };
    await writeFile(`diagnostico/${nome}.html`, limpa(t).slice(0, 1500000));
    return t;
  } catch (e) { status[nome] = { url: u, erro: e.message }; return ''; }
};
await baixar('robots', `${B}/robots.txt`);
await baixar('home', `${B}/`);
for (const p of ['/jogos', '/agenda', '/competicoes', '/tabela', '/partidas', '/calendario']) {
  await new Promise((r) => setTimeout(r, 1200));
  await baixar('p' + p.replace(/\W/g, '_'), B + p);
}
await writeFile('diagnostico/ferj-status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
