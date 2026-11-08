// FlaFan — atualização diária dos jogos.
// Junta: (1) dados automáticos da API-Sports + (2) sua planilha do Google (que sempre tem a palavra final).
// Gera: data/jogos.json (lido pelo app) e data/calendario/*.ics (lembretes na agenda).
//
// Uso:  node scripts/atualizar.mjs                 -> busca tudo pela internet
//       node scripts/atualizar.mjs --planilha arquivo.csv --sem-api   -> testa offline

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(RAIZ, 'data');
const ESCUDOS = path.join(RAIZ, 'escudos');

export const MODALIDADES = {
  'futebol-masculino': 'Futebol masculino',
  'futebol-feminino': 'Futebol feminino',
  'base': 'Categorias de base',
  'basquete': 'Basquete',
  'volei-masculino': 'Vôlei masculino',
  'volei-feminino': 'Vôlei feminino',
  'futsal': 'Futsal',
  'olimpicos': 'Esportes olímpicos',
};

// ---------- utilidades ----------
const log = (...a) => console.log('[FlaFan]', ...a);
const limpar = (s) => (s ?? '').toString().trim();
const semAcento = (s) => limpar(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function parseCsv(texto) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas.filter((l) => l.some((x) => limpar(x)));
  if (!cab) return [];
  const chaves = cab.map(semAcento).map((k) => k.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return resto.map((l) => Object.fromEntries(chaves.map((k, i) => [k, limpar(l[i])])));
}

// Aceita "Futebol feminino", "volei fem", "basquete"... e devolve a chave interna.
export function normalizarModalidade(txt) {
  const t = semAcento(txt);
  if (!t) return null;
  if (MODALIDADES[t]) return t;
  if (t.includes('futsal')) return 'futsal';
  if (t.includes('basq')) return 'basquete';
  if (t.includes('volei')) return t.includes('fem') ? 'volei-feminino' : 'volei-masculino';
  if (t.includes('base') || /sub[- ]?\d+/.test(t)) return 'base';
  if (t.includes('futebol') || t === 'futebol') return t.includes('fem') ? 'futebol-feminino' : 'futebol-masculino';
  if (/(olimp|remo|natac|ginast|judo|atlet|nado|polo)/.test(t)) return 'olimpicos';
  return null;
}

// "25/12/2026" + "16:00" -> "2026-12-25T16:00:00-03:00" (Brasília não tem horário de verão desde 2019)
// "13:30", "13h", "13h30" -> { hh, mm }; qualquer outra coisa (vazio, "a definir") -> null
export function lerHora(hora) {
  const h = limpar(hora).match(/^(\d{1,2})(?:[:h](\d{2})?)?h?$/i);
  if (!h) return null;
  const hh = Number(h[1]), mm = Number(h[2] ?? 0);
  if (hh > 23 || mm > 59) return null;
  return { hh: String(hh).padStart(2, '0'), mm: String(mm).padStart(2, '0') };
}

// "25/12/2026" + "16:00" -> "2026-12-25T16:00:00-03:00". Datas impossíveis (31/02, 12/13) -> null
export function dataHoraBrasilia(data, hora) {
  const m = limpar(data).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const teste = new Date(Date.UTC(a, mes - 1, d));
  if (teste.getUTCFullYear() !== a || teste.getUTCMonth() !== mes - 1 || teste.getUTCDate() !== d) return null;
  const h = lerHora(hora) ?? { hh: '00', mm: '00' };
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}T${h.hh}:${h.mm}:00-03:00`;
}

const STATUS = {
  agendado: 'agendado', encerrado: 'encerrado', fim: 'encerrado', finalizado: 'encerrado',
  adiado: 'adiado', cancelado: 'cancelado', 'ao vivo': 'ao-vivo', 'ao-vivo': 'ao-vivo',
};
const listaTransmissao = (s) => limpar(s).split(/[;|]/).map(limpar).filter(Boolean);
const numOuNull = (s) => (limpar(s) === '' || isNaN(Number(s)) ? null : Number(s));

// ---------- fonte 1: API-Sports ----------
async function apiGet(host, caminho, chave) {
  const r = await fetch(`https://${host}/${caminho}`, { headers: { 'x-apisports-key': chave } });
  if (!r.ok) throw new Error(`${host} respondeu ${r.status}`);
  const j = await r.json();
  const erros = j.errors && (Array.isArray(j.errors) ? j.errors : Object.values(j.errors));
  if (erros && erros.length) throw new Error(`${host}: ${erros.join(' | ')}`);
  return j.response ?? [];
}

const statusApi = (s) => {
  s = (s || '').toUpperCase();
  if (['FT', 'AET', 'PEN', 'AOT', 'AW', 'WO'].includes(s)) return 'encerrado';
  if (['PST', 'SUSP', 'INT'].includes(s)) return 'adiado';
  if (['CANC', 'ABD'].includes(s)) return 'cancelado';
  if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT', 'S1', 'S2', 'S3', 'S4', 'S5'].includes(s)) return 'ao-vivo';
  return 'agendado';
};

function deApi(modalidade, idTime, j) {
  const casa = j.teams?.home, fora = j.teams?.away;
  const flaEmCasa = casa?.id === idTime;
  const adv = flaEmCasa ? fora : casa;
  const pt = (lado) => {
    if (j.goals) return j.goals[lado];
    const s = j.scores?.[lado];
    return typeof s === 'object' && s !== null ? s.total ?? null : s ?? null;
  };
  const [pCasa, pFora] = [pt('home'), pt('away')];
  const temPlacar = pCasa !== null && pCasa !== undefined;
  const info = j.fixture ?? j;
  return {
    id: `api-${modalidade}-${info.id}`,
    modalidade,
    adversario: adv?.name ?? 'A definir',
    competicao: j.league?.name ?? '',
    inicio: info.date,
    local: [info.venue?.name, info.venue?.city].filter(Boolean).join(', '),
    mandante: flaEmCasa,
    transmissao: [],
    placar: temPlacar ? { flamengo: flaEmCasa ? pCasa : pFora, adversario: flaEmCasa ? pFora : pCasa } : null,
    status: statusApi(info.status?.short ?? j.status?.short),
    fonte: 'automatica',
    escudoAdvUrl: adv?.logo || undefined,
  };
}

async function buscarApi(cfg, chave) {
  const jogos = [];
  const f = cfg.futebol;
  if (f?.ativo && f.time) {
    for (const q of [`next=${f.proximos}`, `last=${f.ultimos}`]) {
      const r = await apiGet('v3.football.api-sports.io', `fixtures?team=${f.time}&${q}&timezone=America/Sao_Paulo`, chave);
      jogos.push(...r.map((j) => deApi('futebol-masculino', f.time, j)));
    }
  }
  const outros = [
    ['basquete', 'v1.basketball.api-sports.io', cfg.basquete],
    ['volei-masculino', 'v1.volleyball.api-sports.io', cfg.volei],
  ];
  for (const [mod, host, c] of outros) {
    if (!c?.ativo || !c.time) continue;
    const r = await apiGet(host, `games?team=${c.time}&season=${c.temporada}&timezone=America/Sao_Paulo`, chave);
    jogos.push(...r.map((j) => deApi(mod, c.time, j)));
  }
  return jogos;
}

// ---------- fonte 2: sua planilha ----------
// Colunas: id | modalidade | adversario | competicao | data | hora | local | mando | onde_assistir |
//          placar_fla | placar_adv | status | acao | observacao
const diaBrasilia = (iso) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);

export function mesclar(automaticos, linhas) {
  const porId = new Map(automaticos.map((j) => [j.id, { ...j }]));
  const avisos = [];
  for (const [n, l] of linhas.entries()) {
    const nLinha = n + 2; // linha 1 é o cabeçalho
    const acao = semAcento(l.acao);
    const modalidade = normalizarModalidade(l.modalidade);
    const inicio = dataHoraBrasilia(l.data, l.hora);
    let id = limpar(l.id);
    if (!id) {
      if (!modalidade || !inicio || !limpar(l.adversario)) {
        avisos.push(`Linha ${nLinha}: ${limpar(l.data) && !inicio ? `data inválida ("${limpar(l.data)}")` : 'faltou modalidade, data ou adversário'} — ignorada.`);
        continue;
      }
      // mesmo jogo já veio da fonte automática? (mesma modalidade no mesmo dia) -> junta em vez de duplicar
      const dia = inicio.slice(0, 10);
      const igual = [...porId.values()].find((j) => j.fonte?.startsWith('automatica') && j.modalidade === modalidade && diaBrasilia(j.inicio) === dia);
      const categoria = (limpar(l.modalidade).match(/sub[- ]?(\d+)/i) ?? [])[1] ?? '';
      id = igual ? igual.id : 'm-' + createHash('sha1').update(`${modalidade}|${categoria}|${dia}|${semAcento(l.adversario)}`).digest('hex').slice(0, 10);
    }
    if (acao === 'remover') { porId.delete(id); continue; }
    const base = porId.get(id) ?? { id, transmissao: [], placar: null, status: 'agendado', mandante: null, local: '', competicao: '', fonte: 'manual' };
    const novo = { ...base };
    if (modalidade) novo.modalidade = modalidade;
    const cat = limpar(l.modalidade).match(/sub[- ]?(\d+)/i);
    if (cat) novo.categoria = `Sub-${cat[1]}`;
    if (limpar(l.adversario)) novo.adversario = limpar(l.adversario);
    if (limpar(l.competicao)) novo.competicao = limpar(l.competicao);
    if (limpar(l.hora) && !lerHora(l.hora)) avisos.push(`Linha ${nLinha}: horário "${limpar(l.hora)}" não entendido — use HH:MM. O jogo aparece como "horário a definir".`);
    if (inicio) {
      const temHora = !!lerHora(l.hora);
      // linha só para completar um jogo automático (ex.: canal): não apaga o horário que veio da API
      if (temHora || !String(base.fonte ?? '').startsWith('automatica')) { novo.inicio = inicio; novo.semHora = !temHora; }
    }
    if (limpar(l.local)) novo.local = limpar(l.local);
    if (limpar(l.mando)) novo.mandante = semAcento(l.mando).startsWith('casa');
    if (limpar(l.onde_assistir)) novo.transmissao = listaTransmissao(l.onde_assistir);
    const pf = numOuNull(l.placar_fla), pa = numOuNull(l.placar_adv);
    if (pf !== null && pa !== null) novo.placar = { flamengo: pf, adversario: pa };
    if (STATUS[semAcento(l.status)]) novo.status = STATUS[semAcento(l.status)];
    if (limpar(l.observacao)) novo.observacao = limpar(l.observacao);
    if (/^https?:\/\//.test(limpar(l.escudo_adv))) novo.escudoAdvUrl = limpar(l.escudo_adv);
    if (base.fonte === 'automatica') novo.fonte = 'automatica+manual';
    if (!novo.modalidade || !novo.inicio || isNaN(Date.parse(novo.inicio)) || !novo.adversario) {
      avisos.push(`Linha ${nLinha}: jogo sem modalidade, data válida ou adversário — ignorado.`); continue;
    }
    porId.set(id, novo);
  }
  const jogos = [...porId.values()].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  return { jogos, avisos };
}

// ---------- calendário (.ics) ----------
const icsTexto = (s) => limpar(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n|\r/g, '\\n');
const icsData = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function dobrar(linha) {
  const out = [];
  let s = linha;
  while (Buffer.byteLength(s) > 74) {
    let corte = 74;
    while (Buffer.byteLength(s.slice(0, corte)) > 74) corte--;
    out.push(s.slice(0, corte)); s = ' ' + s.slice(corte);
  }
  out.push(s);
  return out.join('\r\n');
}
export function gerarIcs(jogos, titulo, carimbo = new Date()) {
  const agora = icsData(carimbo);
  const ev = jogos.filter((j) => !['cancelado', 'adiado'].includes(j.status) && !isNaN(Date.parse(j.inicio))).map((j) => {
    const fim = new Date(new Date(j.inicio).getTime() + 2 * 3600e3);
    const dia = j.inicio.slice(0, 10).replace(/-/g, '');
    const nome = j.mandante === false ? `${j.adversario} x Flamengo` : `Flamengo x ${j.adversario}`;
    const onde = j.transmissao.length ? `Onde assistir: ${j.transmissao.join(', ')}` : 'Onde assistir: a confirmar';
    return [
      'BEGIN:VEVENT', `UID:${j.id}@flafan`, `DTSTAMP:${agora}`,
      ...(j.semHora ? [`DTSTART;VALUE=DATE:${dia}`] : [`DTSTART:${icsData(j.inicio)}`, `DTEND:${icsData(fim)}`]),
      `SUMMARY:${icsTexto(`${nome} (${MODALIDADES[j.modalidade]})`)}`,
      `DESCRIPTION:${icsTexto(`${j.competicao}\n${onde}`)}`,
      j.local ? `LOCATION:${icsTexto(j.local)}` : null,
      ...(j.semHora ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(nome + ' começa em 1 hora')}`, 'TRIGGER:-PT1H', 'END:VALARM']),
      'END:VEVENT',
    ].filter(Boolean);
  }).flat();
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FlaFan//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsTexto(titulo)}`, 'X-WR-TIMEZONE:America/Sao_Paulo', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    ...ev, 'END:VCALENDAR'].map(dobrar).join('\r\n') + '\r\n';
}

// Lê um CSV da planilha (ou de um arquivo local, nos testes) e confere se é mesmo a planilha esperada
async function lerCsv(arqLocal, url, colunaObrigatoria) {
  let csv;
  if (arqLocal) csv = await readFile(arqLocal, 'utf8');
  else if (url) {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error(`planilha respondeu ${r.status}`);
    csv = await r.text();
  } else return null;
  const cab = semAcento(csv.split(/\r?\n/)[0] ?? '');
  if (csv.trimStart().startsWith('<') || !cab.includes(colunaObrigatoria)) {
    throw new Error('a resposta não parece a planilha (o compartilhamento por link pode ter sido desligado)');
  }
  return csv;
}

// ---------- programa principal ----------
async function lerJson(arq, padrao) {
  try { return JSON.parse(await readFile(arq, 'utf8')); } catch { return padrao; }
}

// ---------- escudos dos times ----------
// Baixa cada escudo uma vez para a pasta escudos/ e reaproveita nos dias seguintes.
export const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const GRUPO = { 'futebol-masculino': 'futebol', 'futebol-feminino': 'futebol', base: 'futebol', futsal: 'futebol', basquete: 'basquete', 'volei-masculino': 'volei', 'volei-feminino': 'volei' };
const HOST = { futebol: 'v3.football.api-sports.io', basquete: 'v1.basketball.api-sports.io', volei: 'v1.volleyball.api-sports.io' };
const ESCUDO_FLAMENGO = 'https://media.api-sports.io/football/teams/127.png';
// Códigos dos clubes no servidor de imagens da API-Sports (funciona sem chave). Conferidos visualmente.
const IDS_FUTEBOL = {
  palmeiras: 121, fluminense: 124, botafogo: 120, vasco: 133, 'vasco-da-gama': 133, corinthians: 131, 'sao-paulo': 126,
  santos: 128, gremio: 130, internacional: 119, 'atletico-mg': 1062, 'atletico-mineiro': 1062, cruzeiro: 135, bahia: 118,
  'athletico-pr': 134, 'athletico-paranaense': 134, coritiba: 147, chapecoense: 132, bragantino: 794, 'red-bull-bragantino': 794,
  vitoria: 136, mirassol: 7848, remo: 1198, fortaleza: 154, ceara: 129, sport: 123, juventude: 152, estudiantes: 450,
};
// Clubes que jogam vôlei/basquete com o mesmo escudo do futebol
const IDS_MESMO_CLUBE = { fluminense: 124, botafogo: 120, corinthians: 131, 'itatiaiucu-cruzeiro-basquete': 135, 'sesc-rj-flamengo': 127 };
const MAX_BUSCAS = 40; // limite de buscas novas por dia (protege as cotas grátis)

async function baixarImagem(url, base) {
  for (const ext of ['png', 'svg', 'jpg', 'webp']) {
    if (existsSync(path.join(ESCUDOS, `${base}.${ext}`))) return `escudos/${base}.${ext}`;
  }
  const r = await fetch(url);
  const tipo = r.headers.get('content-type') || '';
  if (!r.ok || !tipo.startsWith('image/')) throw new Error(`imagem indisponível (${r.status})`);
  const ext = tipo.includes('svg') ? 'svg' : tipo.includes('jpeg') ? 'jpg' : tipo.includes('webp') ? 'webp' : 'png';
  await mkdir(ESCUDOS, { recursive: true });
  await writeFile(path.join(ESCUDOS, `${base}.${ext}`), Buffer.from(await r.arrayBuffer()));
  return `escudos/${base}.${ext}`;
}

async function buscarLogoApiSports(grupo, nome, chave) {
  const termo = semAcento(nome).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (termo.length < 3) return null;
  const lista = await apiGet(HOST[grupo], `teams?search=${encodeURIComponent(termo)}`, chave);
  const times = lista.map((x) => x.team ?? x);
  const pais = (t, x) => semAcento(t.country?.name ?? t.country ?? x?.country?.name ?? '');
  const doBrasil = lista.find((x) => pais(x.team ?? x, x) === 'brazil');
  const t = (doBrasil ? doBrasil.team ?? doBrasil : times[0]);
  return t?.logo || null;
}

// Fonte grátis e sem cadastro (TheSportsDB, chave pública "123"), usada quando a API-Sports não acha.
const NOMES_TSDB = {
  'athletico-pr': 'Athletico Paranaense', 'atletico-mg': 'Atletico Mineiro', vasco: 'Vasco da Gama',
  bragantino: 'Red Bull Bragantino', 'red-bull-bragantino': 'Red Bull Bragantino', remo: 'Clube do Remo',
  estudiantes: 'Estudiantes', sport: 'Sport Recife', 'america-mg': 'America Mineiro',
};
const ESPORTE_TSDB = { futebol: 'soccer', basquete: 'basketball', volei: 'volleyball' };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function buscarLogoTsdb(grupo, nome) {
  const termo = NOMES_TSDB[slug(nome)] ?? semAcento(nome).replace(/[^a-z0-9 ]+/gi, ' ').trim();
  await espera(2100); // respeita o limite de ~30 consultas por minuto
  const r = await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(termo)}`);
  if (!r.ok) throw new Error(`TheSportsDB respondeu ${r.status}`);
  const times = ((await r.json()).teams ?? []).filter((t) => semAcento(t.strSport) === ESPORTE_TSDB[grupo] && !/women|feminino|u\d\d/i.test(t.strTeam));
  const t = times.find((x) => semAcento(x.strCountry) === 'brazil') ?? times[0];
  return t?.strBadge || t?.strTeamBadge || null;
}

// itens: [{ modalidade, adversario, escudoAdvUrl? }] — recebem .escudoAdv quando houver imagem
export async function resolverEscudos(itens, chave, problemas) {
  const cacheArq = path.join(DATA, 'escudos.json');
  const cache = await lerJson(cacheArq, {});
  let buscas = 0;
  let escudoFlamengo = null;
  try { escudoFlamengo = await baixarImagem(ESCUDO_FLAMENGO, 'flamengo'); }
  catch (e) {
    try { const l = await buscarLogoTsdb('futebol', 'Flamengo'); if (l) escudoFlamengo = await baixarImagem(l, 'flamengo'); }
    catch (e2) { problemas.push(`Escudo do Flamengo: ${e.message}`); }
  }

  // primeiro os que têm link colado à mão (assim os outros com o mesmo nome reaproveitam)
  for (const [k, v] of Object.entries(cache)) {
    if (typeof v === 'string' && v.startsWith('escudos/') && !existsSync(path.join(RAIZ, v))) delete cache[k];
  }
  const ordem = [...itens].sort((a, b) => (b.escudoAdvUrl ? 1 : 0) - (a.escudoAdvUrl ? 1 : 0));
  for (const j of ordem) {
    const grupo = GRUPO[j.modalidade];
    const chaveCache = `${grupo ?? 'outro'}|${slug(j.adversario)}`;
    const base = `${grupo ?? 'outro'}-${slug(j.adversario)}`;
    const url = j.escudoAdvUrl;
    delete j.escudoAdvUrl;
    try {
      const idFut = grupo === 'futebol' ? IDS_FUTEBOL[slug(j.adversario)] : IDS_MESMO_CLUBE[slug(j.adversario)];
      if (url) {
        // link colado à mão: cada link vira um arquivo próprio, então substitui o escudo achado antes
        const sufixo = createHash('sha1').update(url).digest('hex').slice(0, 6);
        cache[chaveCache] = await baixarImagem(url, `${base}-${sufixo}`);
      } else if (idFut && !cache[chaveCache]) {
        cache[chaveCache] = await baixarImagem(`https://media.api-sports.io/football/teams/${idFut}.png`, base);
      } else if (!(chaveCache in cache) || (cache[chaveCache] === null && (cache[`${chaveCache}|tentou`] ?? 0) < Date.now() - 7 * 864e5)) {
        if (grupo && buscas < MAX_BUSCAS) {
          buscas++;
          let logo = null;
          if (chave) { try { logo = await buscarLogoApiSports(grupo, j.adversario, chave); } catch { /* tenta a outra fonte */ } }
          if (!logo) logo = await buscarLogoTsdb(grupo, j.adversario);
          cache[chaveCache] = logo ? await baixarImagem(logo, base) : null;
          cache[`${chaveCache}|tentou`] = Date.now();
        }
      }
    } catch (e) {
      if (!(chaveCache in cache)) problemas.push(`Escudo de ${j.adversario}: ${e.message}`);
      if (!cache[chaveCache]) { cache[chaveCache] = null; cache[`${chaveCache}|tentou`] = Date.now(); }
    }
    if (cache[chaveCache]) j.escudoAdv = cache[chaveCache];
  }
  for (const j of itens) {
    if (j.escudoAdv) continue;
    const c = cache[`${GRUPO[j.modalidade] ?? 'outro'}|${slug(j.adversario)}`];
    if (c) j.escudoAdv = c;
  }
  await writeFile(cacheArq, JSON.stringify(cache, null, 1));
  return escudoFlamengo;
}

// Nomes diferentes para o mesmo time (jogo x tabela)
const APELIDOS = { londrina: 'sancor-seguros-volei' };
const PALAVRAS_GENERICAS = new Set(['volei', 'basquete', 'basket', 'basketball', 'clube', 'esporte', 'sesi', 'sesc', 'caixa', 'ceisc', 'brb', 'saude']);
export function mesmoTime(a, b) {
  const sa = APELIDOS[slug(a)] ?? slug(a), sb = APELIDOS[slug(b)] ?? slug(b);
  if (sa === sb) return true;
  const pa = sa.split('-').filter((p) => p.length >= 4 && !PALAVRAS_GENERICAS.has(p));
  const pb = new Set(sb.split('-'));
  return pa.length > 0 && pa.every((p) => pb.has(p));
}

// ---------- classificação ----------
// Aba "Classificacao" da planilha: campeonato | modalidade | pos | time | j | v | e | d | sg | pts | atualizado
export function montarClassificacao(linhas) {
  const porCamp = new Map();
  for (const l of linhas) {
    const nome = limpar(l.campeonato);
    if (!nome || !limpar(l.time)) continue;
    if (!porCamp.has(nome)) porCamp.set(nome, { nome, modalidade: normalizarModalidade(l.modalidade) ?? 'futebol-masculino', atualizado: '', fonte: 'planilha', linhas: [] });
    const c = porCamp.get(nome);
    if (limpar(l.atualizado)) c.atualizado = limpar(l.atualizado);
    if (/^https?:\/\//.test(limpar(l.link))) c.link = limpar(l.link);
    if (limpar(l.nota)) c.nota = limpar(l.nota);
    const linha = { pos: numOuNull(l.pos), time: limpar(l.time), j: numOuNull(l.j), v: numOuNull(l.v), e: numOuNull(l.e), d: numOuNull(l.d), sg: numOuNull(l.sg), pts: numOuNull(l.pts) };
    if (/^https?:\/\//.test(limpar(l.escudo))) linha.escudoAdvUrl = limpar(l.escudo);
    c.linhas.push(linha);
  }
  for (const c of porCamp.values()) c.linhas.sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));
  return [...porCamp.values()];
}

// Descobre sozinho o código da liga (ex.: NBB, Superliga Feminina) na API-Sports e guarda em data/ligas.json.
async function descobrirLigas(cfgTabelas, chave, problemas) {
  const cacheArq = path.join(DATA, 'ligas.json');
  const cache = await lerJson(cacheArq, {});
  for (const t of cfgTabelas ?? []) {
    if (!t.ativo || t.liga || !t.busca) continue;
    if (cache[t.nome]) { Object.assign(t, cache[t.nome]); continue; }
    try {
      const lista = await apiGet(HOST[GRUPO[t.modalidade]], 'leagues?country=Brazil', chave);
      const re = new RegExp(t.busca, 'i');
      const liga = lista.map((x) => x.league ? { ...x.league, seasons: x.seasons } : x).find((x) => re.test(x.name));
      if (!liga) { problemas.push(`Não achei a liga "${t.nome}" na API-Sports.`); continue; }
      // a temporada mais recente (a lista da API nem sempre vem em ordem)
      const temporadas = (liga.seasons ?? []).map((x) => x.season ?? x.year).filter(Boolean)
        .sort((a, b) => parseInt(String(a), 10) - parseInt(String(b), 10));
      const achado = { liga: liga.id, temporada: temporadas[temporadas.length - 1] ?? t.temporada };
      cache[t.nome] = achado;
      Object.assign(t, achado);
      log(`Liga encontrada: ${t.nome} = código ${achado.liga}, temporada ${achado.temporada}`);
    } catch (e) { problemas.push(`Busca da liga ${t.nome}: ${e.message}`); }
  }
  await writeFile(cacheArq, JSON.stringify(cache, null, 1));
}

// Tabelas pela API. Também devolve o código do Flamengo em cada liga, para buscar os jogos dela.
async function classificacaoApi(cfgTabelas, chave, problemas) {
  const saida = [], timesFla = [];
  for (const t of cfgTabelas ?? []) {
    if (!t.ativo || !t.liga) continue;
    const host = HOST[GRUPO[t.modalidade]];
    try {
      const r = await apiGet(host, `standings?league=${t.liga}&season=${t.temporada}`, chave);
      const grupos = r[0]?.league?.standings ?? (Array.isArray(r[0]) ? r : [r]);
      const tabela = (grupos[0] ?? []).filter(Boolean);
      if (!tabela.length) { problemas.push(`${t.nome}: a API ainda não tem tabela para ${t.temporada}.`); continue; }
      const fla = tabela.find((x) => /flamengo/i.test(x.team?.name ?? ''));
      if (fla && t.modalidade !== 'futebol-masculino') timesFla.push({ modalidade: t.modalidade, host, time: fla.team.id, liga: t.liga, temporada: t.temporada, competicao: t.nome });
      saida.push({
        nome: t.nome, modalidade: t.modalidade, fonte: 'automatica',
        atualizado: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        linhas: tabela.map((x) => ({
          pos: x.rank ?? x.position, time: x.team?.name, j: x.all?.played ?? x.games?.played, v: x.all?.win ?? x.games?.win?.total,
          e: x.all?.draw ?? null, d: x.all?.lose ?? x.games?.lose?.total, sg: x.goalsDiff ?? null, pts: typeof x.points === "number" ? x.points : null, escudoAdvUrl: x.team?.logo,
        })),
      });
      log(`Tabela automática: ${t.nome} (${tabela.length} times).`);
    } catch (e) { problemas.push(`Tabela automática de ${t.nome}: ${e.message}`); }
  }
  return { saida, timesFla };
}

async function jogosDasLigas(timesFla, chave, problemas) {
  const jogos = [];
  for (const t of timesFla) {
    try {
      const r = await apiGet(t.host, `games?league=${t.liga}&season=${t.temporada}&team=${t.time}&timezone=America/Sao_Paulo`, chave);
      jogos.push(...r.map((j) => ({ ...deApi(t.modalidade, t.time, j), competicao: j.league?.name ? t.competicao : t.competicao })));
      log(`Jogos automáticos: ${t.competicao} (${r.length}).`);
    } catch (e) { problemas.push(`Jogos de ${t.competicao}: ${e.message}`); }
  }
  return jogos;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const cfg = await lerJson(path.join(RAIZ, 'config.json'), {});
  const problemas = [];

  // 1) automáticos (se falhar, usa a última versão que deu certo)
  const cacheArq = path.join(DATA, 'cache-automatico.json');
  let automaticos = await lerJson(cacheArq, []);
  let campeonatosApi = [];
  const chave = process.env.API_SPORTS_KEY;
  if (args.includes('--sem-api')) log('Pulando a API (modo teste).');
  else if (!chave) { problemas.push('Chave da API-Sports não configurada — usando só a planilha.'); }
  else {
    try {
      await descobrirLigas(cfg.apiSports?.classificacao, chave, problemas);
      const r = await classificacaoApi(cfg.apiSports?.classificacao, chave, problemas);
      campeonatosApi = r.saida;
      const novos = [...await buscarApi(cfg.apiSports ?? {}, chave), ...await jogosDasLigas(r.timesFla, chave, problemas)];
      // mantém jogos antigos do cache que a API não devolveu mais (ex.: resultados de 1 mês atrás)
      const ids = new Set(novos.map((j) => j.id));
      automaticos = [...novos, ...automaticos.filter((j) => !ids.has(j.id))];
      await writeFile(cacheArq, JSON.stringify(automaticos, null, 1));
      log(`API: ${novos.length} jogos recebidos.`);
    } catch (e) {
      problemas.push(`Falha na API (${e.message}) — mantive os dados anteriores.`);
    }
  }

  // 2) planilha
  const anterior = await lerJson(path.join(DATA, 'jogos.json'), null);
  const tabelasAnteriores = await lerJson(path.join(DATA, 'classificacao.json'), null);
  let linhas = [];
  let planilhaOk = false;
  try {
    const csv = await lerCsv(arg('--planilha'), cfg.planilhaCsvUrl, 'adversario');
    if (csv !== null) { linhas = parseCsv(csv); planilhaOk = true; }
    else problemas.push('Endereço da planilha não configurado.');
  } catch (e) {
    problemas.push(`Falha ao ler a planilha (${e.message}).`);
  }
  // Segurança: se a planilha falhou (ou veio vazia de repente) e não há outra fonte, mantém o que já está publicado
  const totalAnterior = anterior?.jogos?.length ?? 0;
  if ((!planilhaOk || linhas.length === 0) && automaticos.length === 0 && totalAnterior > 0) {
    log(`Planilha indisponível ou vazia — mantive os ${totalAnterior} jogos já publicados, sem mexer em nada.`);
    problemas.forEach((p) => log('Aviso:', p));
    return;
  }

  // 3) junta e salva
  const { jogos, avisos } = mesclar(automaticos, linhas);
  problemas.push(...avisos);

  // 4) classificação: planilha + API (a API substitui a planilha no mesmo campeonato, quando funciona)
  let campeonatos = [];
  try {
    const csv = await lerCsv(arg('--classificacao'), cfg.planilhaClassificacaoCsvUrl, 'campeonato');
    if (csv !== null) campeonatos = montarClassificacao(parseCsv(csv));
  } catch (e) {
    // não deixa a aba Tabela vazia por uma falha passageira: reaproveita as tabelas da planilha já publicadas
    campeonatos = (tabelasAnteriores?.campeonatos ?? []).filter((c) => c.fonte !== 'automatica');
    problemas.push(`Falha ao ler a classificação da planilha (${e.message}) — mantive as tabelas anteriores.`);
  }
  for (const c of campeonatosApi) campeonatos = [...campeonatos.filter((x) => x.nome !== c.nome), c];
  // mantém a ordem: Brasileirão primeiro, depois os outros
  campeonatos.sort((a, b) => (/brasileir/i.test(b.nome) ? 1 : 0) - (/brasileir/i.test(a.nome) ? 1 : 0));

  // 5) escudos (jogos + times das tabelas)
  let escudoFlamengo = null;
  const linhasTabela = campeonatos.flatMap((c) => c.linhas.map((l) => Object.assign(l, { modalidade: c.modalidade, adversario: l.time })));
  if (args.includes('--sem-api')) [...jogos, ...linhasTabela].forEach((j) => delete j.escudoAdvUrl);
  else escudoFlamengo = await resolverEscudos([...jogos, ...linhasTabela.filter((l) => !/flamengo/i.test(l.time))], chave, problemas);
  // jogos sem escudo: usa o da tabela do mesmo campeonato quando o nome bate
  for (const j of jogos) {
    if (j.escudoAdv) continue;
    const cands = linhasTabela.filter((x) => x.modalidade === j.modalidade && x.escudoAdv);
    const l = cands.find((x) => slug(x.time) === slug(j.adversario)) ?? cands.find((x) => mesmoTime(j.adversario, x.time));
    if (l) j.escudoAdv = l.escudoAdv;
  }
  for (const l of linhasTabela) { delete l.modalidade; delete l.adversario; delete l.escudoAdvUrl; if (l.escudoAdv) { l.escudo = l.escudoAdv; delete l.escudoAdv; } }

  const saida = { atualizadoEm: new Date().toISOString(), exemplo: args.includes('--exemplo'), avisos: problemas, escudoFlamengo, jogos };
  const semData = (o) => JSON.stringify({ ...o, atualizadoEm: null });
  const tabelasNovas = { atualizadoEm: saida.atualizadoEm, escudoFlamengo, campeonatos };
  if (anterior && semData(anterior) === semData(saida) && tabelasAnteriores && semData(tabelasAnteriores) === semData(tabelasNovas)) {
    saida.atualizadoEm = anterior.atualizadoEm; // nada mudou: mantém tudo igual (evita publicações à toa)
    tabelasNovas.atualizadoEm = anterior.atualizadoEm;
  }
  await writeFile(path.join(DATA, 'jogos.json'), JSON.stringify(saida, null, 1));
  await writeFile(path.join(DATA, 'classificacao.json'), JSON.stringify(tabelasNovas, null, 1));

  await mkdir(path.join(DATA, 'calendario'), { recursive: true });
  await writeFile(path.join(DATA, 'calendario', 'todos.ics'), gerarIcs(jogos, 'FlaFan — todos os jogos', new Date(saida.atualizadoEm)));
  for (const [chaveMod, nome] of Object.entries(MODALIDADES)) {
    await writeFile(path.join(DATA, 'calendario', `${chaveMod}.ics`), gerarIcs(jogos.filter((j) => j.modalidade === chaveMod), `FlaFan — ${nome}`, new Date(saida.atualizadoEm)));
  }
  log(`Pronto: ${jogos.length} jogos salvos.`);
  problemas.forEach((p) => log('Aviso:', p));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
