// Diagnóstico temporário: a FERJ pagina os jogos do Flamengo? Testa alguns nomes de parâmetro de página.
import { writeFileSync, mkdirSync } from 'node:fs';
import { lerPartidasFerj } from './ferj.mjs';

const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const linhas = [];
const testar = async (rotulo, url) => {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    const lidos = lerPartidasFerj(html, { idadeMinima: 0 });
    const brutos = lidos.brutos ?? [];
    const dias = brutos.map((b) => b.dia).sort();
    const cats = [...new Set(lidos.map((j) => j.competicao.split(' – ')[0]))];
    const linksPg = [...new Set((html.match(/[?&](?:pg|page|pagina)=\d+/g) ?? []))].slice(0, 12);
    linhas.push(`${rotulo} | ${r.status} | ${brutos.length} partidas | ${dias[0] ?? '-'} a ${dias.at(-1) ?? '-'} | ids ${brutos.slice(0, 4).map((b) => b.id).join(',')} | links de página no HTML: ${linksPg.join(' ')} | ${cats.join('; ')}`);
  } catch (e) { linhas.push(`${rotulo} | ERRO ${e.message}`); }
  await new Promise((r) => setTimeout(r, 1500));
};
const B = 'https://www.fferj.com.br/partidas?clubeId=30';
for (const tab of ['finalizados', 'agendados']) {
  for (const p of [1, 2, 3]) await testar(`${tab} pg=${p}`, `${B}&tab=${tab}&pg=${p}`);
  await testar(`${tab} page=2`, `${B}&tab=${tab}&page=2`);
  await testar(`${tab} pagina=2`, `${B}&tab=${tab}&pagina=2`);
}
await testar('sem tab', B);
mkdirSync('diagnostico', { recursive: true });
writeFileSync('diagnostico/ferj.txt', linhas.join('\n'));
console.log(linhas.join('\n'));
