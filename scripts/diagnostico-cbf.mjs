// Diagnóstico (temporário): lista as competições da CBF e testa os escudos. Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
import { dadosDaPagina } from './cbf.mjs';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const B = 'https://www.cbf.com.br/futebol-brasileiro';
await mkdir('diagnostico', { recursive: true });
const saida = {};
const pegar = async (u, h = {}) => { const r = await fetch(u, { headers: { 'user-agent': UA, ...h }, redirect: 'follow' }); return r; };
// escudos
for (const [nome, h] of [['sem cabeçalho', null], ['com UA', {}], ['com referer', { referer: 'https://www.cbf.com.br/' }]]) {
  try {
    const r = h === null ? await fetch('https://conteudo.cbf.com.br/clubes/20019/escudo.jpg') : await pegar('https://conteudo.cbf.com.br/clubes/20019/escudo.jpg', h);
    const b = Buffer.from(await r.arrayBuffer());
    saida['escudo ' + nome] = { status: r.status, tipo: r.headers.get('content-type'), bytes: b.length, inicio: b.subarray(0, 8).toString('hex') };
  } catch (e) { saida['escudo ' + nome] = e.message; }
}
// páginas com a lista de competições
const paginas = ['/tabelas/campeonato-brasileiro/serie-a/2026', '/times/campeonato-brasileiro/feminino-a1/2026/20016', '/tabelas/copa-do-brasil/feminino/2026', '/tabelas/copa-do-brasil/feminina/2026', '/tabelas/supercopa/feminino/2026', '/tabelas/copa-do-brasil/profissional/2026', '/tabelas/copa-do-brasil/masculino/2026'];
for (const p of paginas) {
  try {
    const r = await pegar(B + p);
    const h = await r.text();
    const t = dadosDaPagina(h);
    const rotas = [...new Set([...h.matchAll(/\/futebol-brasileiro\/(?:tabelas|times)\/([a-z0-9-]+\/[a-z0-9-]+)\//g), ...t.matchAll(/"(?:slug|url|href)":"([^"]+)"/g)].map((m) => m[1]))].slice(0, 300);
    const textos = [...new Set([...t.matchAll(/"(championship|category|label|name|nome_campeonato|categoria)":"([^"]{2,60})"/g)].map((m) => m[1] + '=' + m[2]))].slice(0, 300);
    saida[p] = { status: r.status, final: r.url, bytes: h.length, flamengo: (h.match(/flamengo/gi) ?? []).length, rotas, textos };
    await writeFile(`diagnostico/${p.replace(/\W+/g, '_')}.txt`, t.slice(0, 400000));
  } catch (e) { saida[p] = e.message; }
  await new Promise((r) => setTimeout(r, 1200));
}
await writeFile('diagnostico/cbf-status3.json', JSON.stringify(saida, null, 1));
console.log(JSON.stringify(saida, null, 1));
