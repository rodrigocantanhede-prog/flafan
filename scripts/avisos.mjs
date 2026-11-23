// Avisos no celular: agenda no OneSignal um aviso 1 hora antes de cada jogo (para quem ativou os avisos no app).
// Roda depois do robô. A chave secreta vem do cofre do GitHub (ONESIGNAL_REST_API_KEY) e nunca fica escrita no projeto.
//   node scripts/avisos.mjs           -> agenda/atualiza/cancela de verdade
//   node scripts/avisos.mjs --ensaio  -> só mostra o que faria
// O que já foi agendado fica em data/avisos-push.json (para não mandar aviso repetido e para corrigir se o jogo mudar).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const APP_ID = '1283bb3c-ffa7-42a3-9e4e-d65d32a66c6b';
const SITE = 'https://rubronegroplus.com/';
const ARQ = 'data/avisos-push.json';
const HORA = 3600e3;
const ANTES = 1 * HORA;        // avisa 1 hora antes
const JANELA = 36 * HORA;      // agenda os jogos das próximas 36 horas
const MINIMO = 10 * 60e3;      // jogo começando em menos de 10 minutos: não avisa mais

const fHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const fDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
const NOME_MOD = { 'futebol-masculino': 'Futebol', 'futebol-feminino': 'Futebol feminino', base: 'Base', basquete: 'Basquete', 'volei-feminino': 'Vôlei feminino', 'volei-masculino': 'Vôlei', futsal: 'Futsal' };

export const chaveJogo = (j) => `${j.modalidade}|${j.categoria ?? ''}|${j.inicio.slice(0, 10)}|${j.adversario}`;
export const etiqueta = (modalidade) => `m_${modalidade.replace(/-/g, '_')}`;

// texto do aviso: "Flamengo x Osasco às 21:00" / "Superliga Feminina · SporTV 2 · Maracanãzinho (RJ)"
export function textoAviso(j) {
  const [casa, fora] = j.mandante === false ? [j.adversario, 'Flamengo'] : ['Flamengo', j.adversario];
  const titulo = `${casa} x ${fora} às ${fHora.format(new Date(j.inicio))}`;
  const comp = [j.competicao || NOME_MOD[j.modalidade] || '', j.categoria && !String(j.competicao).includes(j.categoria) ? j.categoria : ''].filter(Boolean).join(' · ');
  const canal = j.transmissao?.length ? `📺 ${j.transmissao.join(', ')}` : '';
  return { titulo, corpo: [comp, canal, j.local ? `📍 ${j.local}` : ''].filter(Boolean).join(' · ') };
}

// o que deveria estar agendado agora: { chave: { quando (ISO), titulo, corpo, modalidade, idJogo } }
export function planejar(jogos, agora = Date.now()) {
  const plano = {};
  for (const j of jogos ?? []) {
    if (j.tipo === 'evento' || j.semHora || !j.adversario || (j.status && j.status !== 'agendado')) continue;
    const t = new Date(j.inicio).getTime();
    if (!(t - agora > MINIMO) || t - agora > JANELA) continue;
    const quando = Math.max(t - ANTES, agora + 60e3); // jogo em menos de 1 hora: avisa já
    plano[chaveJogo(j)] = { quando: new Date(quando).toISOString().slice(0, 16) + ':00Z', inicio: j.inicio, ...textoAviso(j), modalidade: j.modalidade, idJogo: j.id };
  }
  return plano;
}

const igual = (a, b) => a && b && a.inicio === b.inicio && a.titulo === b.titulo && a.corpo === b.corpo;

// compara o plano com o que já foi agendado e devolve o que criar e o que cancelar
export function diferencas(plano, estado, agora = Date.now()) {
  const criar = [], cancelar = [], manter = {};
  for (const [k, e] of Object.entries(estado ?? {})) {
    const p = plano[k];
    const jaSaiu = new Date(e.quando).getTime() <= agora;
    if (jaSaiu) { if (new Date(e.inicio).getTime() + 6 * HORA > agora) manter[k] = e; continue; } // aviso já enviado: guarda até o jogo passar
    if (igual(p, e)) manter[k] = e; else cancelar.push({ chave: k, ...e });
  }
  for (const [k, p] of Object.entries(plano)) {
    if (manter[k]) continue; // já agendado igual, ou já enviado
    criar.push({ chave: k, ...p });
  }
  return { criar, cancelar, manter };
}

// mesma chave para o mesmo aviso: se o registro local se perder, o OneSignal recusa o repetido em vez de mandar duas vezes
export function chaveUnica(a) {
  const h = createHash('sha1').update(`${a.chave}|${a.inicio}|${a.titulo}|${a.corpo}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const cabecalho = (chave) => ({ 'content-type': 'application/json', authorization: `${chave.startsWith('os_v2_') ? 'Key' : 'Basic'} ${chave}` });

async function criarAviso(a, chave) {
  const corpo = {
    app_id: APP_ID, target_channel: 'push',
    // quem acompanha a modalidade (ou ainda não escolheu)
    filters: [{ field: 'tag', key: etiqueta(a.modalidade), relation: '=', value: '1' }, { operator: 'OR' }, { field: 'tag', key: etiqueta(a.modalidade), relation: 'not_exists' }],
    headings: { en: a.titulo, pt: a.titulo }, contents: { en: a.corpo || 'Começa em 1 hora.', pt: a.corpo || 'Começa em 1 hora.' },
    url: `${SITE}?jogo=${encodeURIComponent(a.idJogo)}`,
    send_after: a.quando, ttl: 5400, idempotency_key: chaveUnica(a),
  };
  const r = await fetch('https://api.onesignal.com/notifications?c=push', { method: 'POST', headers: cabecalho(chave), body: JSON.stringify(corpo), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error(`OneSignal respondeu ${r.status}: ${JSON.stringify(j.errors ?? j).slice(0, 200)}`);
  return j.id;
}
async function cancelarAviso(id, chave) {
  const r = await fetch(`https://api.onesignal.com/notifications/${id}?app_id=${APP_ID}`, { method: 'DELETE', headers: cabecalho(chave), signal: AbortSignal.timeout(15000) });
  if (!r.ok && r.status !== 404) throw new Error(`cancelar respondeu ${r.status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ensaio = process.argv.includes('--ensaio');
  const chave = process.env.ONESIGNAL_REST_API_KEY ?? '';
  const jogos = JSON.parse(readFileSync('data/jogos.json', 'utf8')).jogos;
  const estado = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : {};
  const { criar, cancelar, manter } = diferencas(planejar(jogos), estado);
  if (ensaio || !chave) {
    if (!chave && !ensaio) console.log('[avisos] Chave do OneSignal não configurada — nada foi agendado.');
    for (const a of cancelar) console.log(`[avisos] cancelaria: ${a.titulo}`);
    for (const a of criar) console.log(`[avisos] agendaria para ${a.quando}: ${a.titulo} — ${a.corpo}`);
    process.exit(0);
  }
  const novo = { ...manter };
  for (const a of cancelar) {
    try { await cancelarAviso(a.id, chave); console.log(`[avisos] cancelado: ${a.titulo}`); }
    catch (e) { console.log(`[avisos] não consegui cancelar "${a.titulo}": ${e.message}`); novo[a.chave] = a; delete novo[a.chave].chave; }
  }
  for (const a of criar) {
    if (novo[a.chave]) continue; // o antigo não pôde ser cancelado: não cria outro por cima
    try {
      const id = await criarAviso(a, chave);
      novo[a.chave] = { id, quando: a.quando, inicio: a.inicio, titulo: a.titulo, corpo: a.corpo };
      console.log(`[avisos] agendado para ${a.quando}: ${a.titulo}`);
    } catch (e) {
      if (/not subscribed/i.test(e.message)) console.log(`[avisos] "${a.titulo}": ninguém que acompanha esta modalidade ativou os avisos ainda — tento de novo na próxima rodada.`);
      else console.log(`[avisos] falhou "${a.titulo}": ${e.message}`);
    }
  }
  writeFileSync(ARQ, JSON.stringify(novo, null, 1) + '\n');
}
