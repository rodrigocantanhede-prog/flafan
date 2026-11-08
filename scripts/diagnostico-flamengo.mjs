// Diagnóstico (temporário): baixa páginas públicas do site do Flamengo para estudar o formato.
import { writeFile, mkdir } from 'node:fs/promises';
const mods = ['futebol', 'futebol-feminino', 'basquete', 'volei', 'futsal', 'base', 'futebol-base', 'sub-20', 'remo', 'natacao', 'judo', 'ginastica-artistica', 'polo-aquatico', 'nado-artistico'];
const paginas = ['proximos-jogos', 'resultados', 'classificacao'];
const urls = ['https://www.flamengo.com.br/robots.txt', 'https://www.flamengo.com.br/', ...mods.flatMap((m) => paginas.map((p) => `https://www.flamengo.com.br/${m}/${p}`))];
await mkdir('diagnostico', { recursive: true });
const status = {};
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)' }, redirect: 'follow' });
    const t = await r.text();
    status[u] = { status: r.status, final: r.url, tipo: r.headers.get('content-type'), bytes: t.length };
    if (r.ok) await writeFile(`diagnostico/${u.replace('https://www.flamengo.com.br/', '').replace(/\//g, '_') || 'home'}.html`, t.slice(0, 600000));
  } catch (e) { status[u] = { erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1500));
}
await writeFile('diagnostico/status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
