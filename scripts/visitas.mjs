// Contador de acessos do rodapé: lê os números do Cloudflare Web Analytics e guarda em data/visitas.json.
// A chave de leitura vem do cofre do GitHub (CLOUDFLARE_API_TOKEN) e nunca fica escrita no projeto.
//   node scripts/visitas.mjs
// O Cloudflare só guarda alguns meses, então o total é somado aqui, dia a dia (porDia), e nunca se perde.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ARQ = 'data/visitas.json';
const API = 'https://api.cloudflare.com/client/v4';
const CONTA = '5803b0e0f138c97b2e9cc625a623c48c'; // identificador da conta no Cloudflare (não é segredo)
const dia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d);

// junta os dias lidos agora com os já guardados (dias que o Cloudflare não devolve mais ficam como estavam)
export function somar(anterior, novos, hoje = dia(new Date())) {
  const porDia = { ...(anterior?.porDia ?? {}) };
  // vale sempre a leitura mais recente de cada dia: o Cloudflare entrega estimativas que oscilam um pouco,
  // e guardar "a maior já vista" fazia o total crescer sozinho, sem visita nova
  for (const [d, n] of Object.entries(novos)) if (Number.isFinite(n)) porDia[d] = n;
  const dias = Object.keys(porDia).sort();
  return { desde: anterior?.desde ?? dias[0] ?? hoje, total: Object.values(porDia).reduce((a, b) => a + b, 0), hoje: porDia[hoje] ?? 0, atualizadoEm: new Date().toISOString(), porDia };
}

async function chamar(caminho, token, corpo) {
  const r = await fetch(API + caminho, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) throw new Error(`Cloudflare respondeu ${r.status}: ${JSON.stringify(j.errors ?? j).slice(0, 300)}`);
  return j;
}

export async function lerCloudflare(token, dias = 10, conta = process.env.CLOUDFLARE_ACCOUNT_ID || CONTA) {
  const ate = new Date(), de = new Date(ate.getTime() - dias * 864e5);
  // a chave só de leitura de estatísticas não lista contas pelo caminho comum; o próprio relatório diz quais contas ela enxerga
  const filtro = conta ? '{ accountTag: $conta }' : '{}';
  const query = `query (${conta ? '$conta: String!, ' : ''}$de: Date!, $ate: Date!) { viewer { accounts(filter: ${filtro}) {
    rumPageloadEventsAdaptiveGroups(filter: { date_geq: $de, date_leq: $ate }, limit: 1000) { count sum { visits } dimensions { date } } } } }`;
  const j = await chamar('/graphql', token, { query, variables: { ...(conta ? { conta } : {}), de: dia(de), ate: dia(ate) } });
  const contas = j.data?.viewer?.accounts ?? [];
  if (!contas.length) throw new Error('a chave não enxerga nenhuma conta');
  const novos = {};
  console.log('[visitas] Cloudflare devolveu: ' + JSON.stringify(contas.map((c) => (c.rumPageloadEventsAdaptiveGroups ?? []).map((g) => `${g.dimensions.date}: ${g.count} páginas, ${g.sum?.visits} visitas`))));
  for (const c of contas) for (const g of c.rumPageloadEventsAdaptiveGroups ?? []) novos[g.dimensions.date] = (novos[g.dimensions.date] ?? 0) + g.count;
  return novos;
}

// saúde do site (velocidade e estabilidade da tela) por dia, medida pelo Cloudflare nos aparelhos de quem visita
export async function lerDesempenho(token, dias = 7, conta = process.env.CLOUDFLARE_ACCOUNT_ID || CONTA) {
  const ate = new Date(), de = new Date(ate.getTime() - dias * 864e5);
  const query = `query ($conta: String!, $de: Date!, $ate: Date!) { viewer { accounts(filter: { accountTag: $conta }) {
    rumWebVitalsEventsAdaptiveGroups(filter: { date_geq: $de, date_leq: $ate }, limit: 1000, orderBy: [date_ASC]) {
      count dimensions { date }
      sum { lcpGood lcpNeedsImprovement lcpPoor clsGood clsNeedsImprovement clsPoor inpGood inpNeedsImprovement inpPoor } } } } }`;
  const j = await chamar('/graphql', token, { query, variables: { conta, de: dia(de), ate: dia(ate) } });
  return (j.data?.viewer?.accounts?.[0]?.rumWebVitalsEventsAdaptiveGroups ?? []).map((g) => ({ dia: g.dimensions.date, medicoes: g.count, ...g.sum }));
}

// de onde vêm as visitas (site de origem, tipo de aparelho e país), nos últimos dias
export async function lerOrigens(token, dias = 7, conta = process.env.CLOUDFLARE_ACCOUNT_ID || CONTA) {
  const ate = new Date(), de = new Date(ate.getTime() - dias * 864e5);
  const grupo = (dim) => `rumPageloadEventsAdaptiveGroups(filter: { date_geq: $de, date_leq: $ate }, limit: 50, orderBy: [count_DESC]) { count sum { visits } dimensions { ${dim} } }`;
  const query = `query ($conta: String!, $de: Date!, $ate: Date!) { viewer { accounts(filter: { accountTag: $conta }) {
    origem: ${grupo('refererHost')} aparelho: ${grupo('deviceType')} pais: ${grupo('countryName')} pagina: ${grupo('requestPath')} } } }`;
  const j = await chamar('/graphql', token, { query, variables: { conta, de: dia(de), ate: dia(ate) } });
  const c = j.data?.viewer?.accounts?.[0] ?? {};
  const lista = (grupos, campo) => (grupos ?? []).map((g) => ({ nome: g.dimensions?.[campo] || '(direto, app instalado ou WhatsApp)', paginas: g.count, visitas: g.sum?.visits ?? 0 }));
  return { de: dia(de), ate: dia(ate), origem: lista(c.origem, 'refererHost'), aparelho: lista(c.aparelho, 'deviceType'), pais: lista(c.pais, 'countryName'), pagina: lista(c.pagina, 'requestPath') };
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
  try {
    const d = await lerDesempenho(token);
    writeFileSync('data/desempenho.json', JSON.stringify({ atualizadoEm: new Date().toISOString(), porDia: d }, null, 1) + '\n');
    console.log(`[desempenho] ${d.length} dias lidos.`);
  } catch (e) { console.log(`[desempenho] não consegui ler: ${e.message}`); }
  try {
    const o = await lerOrigens(token);
    writeFileSync('data/origem.json', JSON.stringify({ atualizadoEm: new Date().toISOString(), ...o }, null, 1) + '\n');
    console.log(`[origem] ${o.origem.length} origens lidas.`);
  } catch (e) { console.log(`[origem] não consegui ler: ${e.message}`); }
}
