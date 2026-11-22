// Contador de acessos do rodapé: lê os números do Cloudflare Web Analytics e guarda em data/visitas.json.
// A chave de leitura vem do cofre do GitHub (CLOUDFLARE_API_TOKEN) e nunca fica escrita no projeto.
//   node scripts/visitas.mjs
// O Cloudflare só guarda alguns meses, então o total é somado aqui, dia a dia (porDia), e nunca se perde.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ARQ = 'data/visitas.json';
const API = 'https://api.cloudflare.com/client/v4';
const dia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d);

// junta os dias novos com os já guardados (o dia mais recente substitui a contagem parcial anterior)
export function somar(anterior, novos, hoje = dia(new Date())) {
  const porDia = { ...(anterior?.porDia ?? {}) };
  for (const [d, n] of Object.entries(novos)) if (Number.isFinite(n) && n >= (porDia[d] ?? 0)) porDia[d] = n;
  const dias = Object.keys(porDia).sort();
  return { desde: anterior?.desde ?? dias[0] ?? hoje, total: Object.values(porDia).reduce((a, b) => a + b, 0), hoje: porDia[hoje] ?? 0, atualizadoEm: new Date().toISOString(), porDia };
}

async function chamar(caminho, token, corpo) {
  const r = await fetch(API + caminho, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) throw new Error(`Cloudflare respondeu ${r.status}: ${JSON.stringify(j.errors ?? j).slice(0, 300)}`);
  return j;
}

export async function lerCloudflare(token, dias = 10, conta = process.env.CLOUDFLARE_ACCOUNT_ID ?? '') {
  const ate = new Date(), de = new Date(ate.getTime() - dias * 864e5);
  // a chave só de leitura de estatísticas não lista contas pelo caminho comum; o próprio relatório diz quais contas ela enxerga
  const filtro = conta ? '{ accountTag: $conta }' : '{}';
  const query = `query (${conta ? '$conta: String!, ' : ''}$de: Date!, $ate: Date!) { viewer { accounts(filter: ${filtro}) {
    rumPageloadEventsAdaptiveGroups(filter: { date_geq: $de, date_leq: $ate }, limit: 1000) { count dimensions { date } } } } }`;
  const j = await chamar('/graphql', token, { query, variables: { ...(conta ? { conta } : {}), de: dia(de), ate: dia(ate) } });
  const contas = j.data?.viewer?.accounts ?? [];
  if (!contas.length) throw new Error('a chave não enxerga nenhuma conta');
  const novos = {};
  for (const c of contas) for (const g of c.rumPageloadEventsAdaptiveGroups ?? []) novos[g.dimensions.date] = (novos[g.dimensions.date] ?? 0) + g.count;
  return novos;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const token = process.env.CLOUDFLARE_API_TOKEN ?? '';
  if (!token) { console.log('[visitas] Chave do Cloudflare não configurada — contador não atualizado.'); process.exit(0); }
  try {
    const anterior = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : null;
    const saida = somar(anterior, await lerCloudflare(token));
    writeFileSync(ARQ, JSON.stringify(saida, null, 1) + '\n');
    console.log(`[visitas] ${saida.total} acessos desde ${saida.desde} (${saida.hoje} hoje).`);
  } catch (e) { console.log(`[visitas] não consegui ler: ${e.message}`); }
}
