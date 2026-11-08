// Diagnóstico (temporário): baixa páginas de tabelas da CBF (base) para estudar o formato.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const B = 'https://www.cbf.com.br';
const caminhos = [
  '/futebol-brasileiro/times/copa-do-brasil/sub-20/2026/20016',
  '/futebol-brasileiro/times/campeonato-brasileiro/sub-20/2026/20016',
  '/futebol-brasileiro/times/campeonato-brasileiro/sub-17/2026/20016',
  '/futebol-brasileiro/times/campeonato-brasileiro/feminino-a1/2026/20016',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/sub-20/2026/2008',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/sub-17/2026/2049',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026',
  '/futebol-brasileiro/jogos/copa-do-brasil/sub-20/2026/flamengo-x-operario/835459',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/sub-15/2026',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/feminino-sub-20/2026',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/feminino-sub-17/2026',
  '/futebol-brasileiro/tabelas/supercopa/sub-20/2026',
  '/futebol-brasileiro/tabelas/campeonato-brasileiro/aspirantes/2026'];
await mkdir('diagnostico', { recursive: true });
const status = {};
for (const c of caminhos) {
  try {
    const r = await fetch(B + c, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    status[c] = { status: r.status, final: r.url, tipo: r.headers.get('content-type'), bytes: t.length,
      flamengo: (t.match(/flamengo/gi) ?? []).length, nextData: t.includes('__NEXT_DATA__'), nextF: (t.match(/__next_f/g) ?? []).length,
      apis: [...new Set(t.match(/https?:\/\/[a-z0-9.-]*(?:api|cbf)[a-z0-9.-]*\.[a-z]+\/[^"'\s<>\\]*/gi) ?? [])].slice(0, 40) };
    await writeFile(`diagnostico/${c.replace(/\W+/g, '_')}.html`, t.slice(0, 1500000));
  } catch (e) { status[c] = { erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1500));
}
await writeFile('diagnostico/cbf-status2.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
