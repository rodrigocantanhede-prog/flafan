// Diagnóstico (temporário): baixa as páginas de classificação da LNB (NBB) e da CBV (Superliga) para estudar o formato.
import { writeFile, mkdir } from 'node:fs/promises';
const urls = {
  'lnb-robots': 'https://lnb.com.br/robots.txt',
  'lnb-classificacao': 'https://lnb.com.br/nbb/classificacao/',
  'cbv-robots': 'https://cbv.com.br/robots.txt',
  'cbv-classificacao': 'https://cbv.com.br/volei-de-quadra/superliga-a-feminina/classificacao',
};
await mkdir('diagnostico', { recursive: true });
const status = {};
for (const [nome, u] of Object.entries(urls)) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)' }, redirect: 'follow' });
    const t = await r.text();
    status[nome] = { url: u, status: r.status, final: r.url, tipo: r.headers.get('content-type'), bytes: t.length };
    await writeFile(`diagnostico/${nome}.html`, t.slice(0, 900000));
  } catch (e) { status[nome] = { url: u, erro: e.message }; }
  await new Promise((r) => setTimeout(r, 1500));
}
await writeFile('diagnostico/status.json', JSON.stringify(status, null, 1));
console.log(JSON.stringify(status, null, 1));
