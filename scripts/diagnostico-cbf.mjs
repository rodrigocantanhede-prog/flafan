// Diagnóstico (temporário): testa todas as combinações campeonato/categoria da CBF e conta os jogos do Flamengo em 2026. Será removido.
import { writeFile, mkdir } from 'node:fs/promises';
import { dadosDaPagina, objetos } from './cbf.mjs';
const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const B = 'https://www.cbf.com.br/futebol-brasileiro';
const campeonatos = ['campeonato-brasileiro', 'copa-do-brasil', 'supercopa', 'supercopa-do-brasil', 'copa-do-nordeste', 'copa-verde', 'torneio', 'copa-sul-sudeste', 'brasileiro', 'copa'];
const categorias = ['serie-a', 'serie-b', 'serie-c', 'serie-d', 'profissional', 'masculino', 'feminino', 'feminina', 'feminino-a1', 'feminino-a2', 'feminino-a3',
  'feminino-sub-20', 'feminino-sub-17', 'feminino-sub-15', 'sub-23', 'sub-21', 'sub-20', 'sub-17', 'sub-15', 'sub-14', 'aspirantes', 'futsal', 'futebol-de-areia', 'beach-soccer', 'base'];
await mkdir('diagnostico', { recursive: true });
const achados = [];
for (const c of campeonatos) for (const k of categorias) {
  const u = `${B}/times/${c}/${k}/2026/20016`;
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!r.ok) continue;
    const t = dadosDaPagina(await r.text());
    const jogos = new Map();
    for (const o of objetos(t, 'id_jogo')) if (o.data && o.mandante?.nome) jogos.set(o.id_jogo, o);
    const comp = objetos(t, 'competitionId')[0];
    if (jogos.size || comp) achados.push({ rota: `${c}/${k}`, jogos: jogos.size, nome: comp ? `${comp.championship} - ${comp.category}` : '', ultimo: [...jogos.values()].map((j) => j.data.trim().split('/').reverse().join('-')).sort().pop() ?? '' });
  } catch { /* não existe */ }
  await new Promise((r) => setTimeout(r, 400));
}
await writeFile('diagnostico/cbf-competicoes.json', JSON.stringify(achados, null, 1));
console.log(JSON.stringify(achados, null, 1));
