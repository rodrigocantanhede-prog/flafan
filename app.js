// FlaFan — telas do app.
const FUSO = 'America/Sao_Paulo';
const MODALIDADES = {
  'futebol-masculino': { nome: 'Futebol masculino', curto: 'Futebol masc.', icone: 'futebol', sexo: 'm', cor: '#E3141B' },
  'futebol-feminino': { nome: 'Futebol feminino', curto: 'Futebol fem.', icone: 'futebol', sexo: 'f', cor: '#F472B6' },
  'base': { nome: 'Categorias de base', curto: 'Base', icone: 'base', sexo: null, cor: '#FB923C' },
  'basquete': { nome: 'Basquete masculino', curto: 'Basquete masc.', icone: 'basquete', sexo: 'm', cor: '#F59E0B' },
  'volei-masculino': { nome: 'Vôlei masculino', curto: 'Vôlei masc.', icone: 'volei', sexo: 'm', cor: '#38BDF8' },
  'volei-feminino': { nome: 'Vôlei feminino', curto: 'Vôlei fem.', icone: 'volei', sexo: 'f', cor: '#A78BFA' },
  'futsal': { nome: 'Futsal masculino', curto: 'Futsal masc.', icone: 'futsal', sexo: 'm', cor: '#4ADE80' },
  'olimpicos': { nome: 'Esportes olímpicos', curto: 'Olímpicos', icone: 'olimpicos', sexo: null, cor: '#2DD4BF' },
};

// Ícones desenhados para o FlaFan (traço simples, herdam a cor do texto)
const ICONES = {
  futebol: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.6l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill="currentColor"/><path d="M12 7.6V2.6M15.2 9.9l4.6-1.5M14 13.7l2.9 3.9M10 13.7l-2.9 3.9M8.8 9.9L4.2 8.4"/>',
  base: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.6l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill="currentColor"/><path d="M12 7.6V2.6M15.2 9.9l4.6-1.5M14 13.7l2.9 3.9M10 13.7l-2.9 3.9M8.8 9.9L4.2 8.4"/>',
  basquete: '<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5c2.8 2.6 2.8 11.4 0 14M18.4 5c-2.8 2.6-2.8 11.4 0 14"/>',
  volei: '<circle cx="12" cy="12" r="9.5"/><path d="M12 12c-1.2-3.8-.6-7.2 1.6-9.3M12 12c3.9-.9 7.2.2 9.2 2.6M12 12c-2.7 2.9-6 4-9 3.5M12 12c3.2-2.4 4.4-5.7 4-8.5M12 12c.7 3.9 3 6.6 6 7.4"/>',
  futsal: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.8"/><path d="M2 9.5h2.5v5H2M22 9.5h-2.5v5H22"/>',
  olimpicos: '<circle cx="12" cy="15.5" r="5.5"/><path d="M8.5 11.3L5.5 2.5h4l2.5 6M15.5 11.3l3-8.8h-4L12 8.5"/><path d="M12 13l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor" stroke="none"/>',
  natacao: '<path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><circle cx="16.5" cy="6.5" r="2"/><path d="M4 13l5-4 3 2 3-2"/>',
  remo: '<path d="M3 21L17 7M15 3l6 6-3 1-4-4zM2 15c3 1 6 1 9 0M13 21c3-1 6-1 9 0"/>',
  judo: '<path d="M4 9h16M8 9l-2 9M16 9l2 9M10 9l2 5 2-5"/><rect x="9" y="7" width="6" height="4" rx="1"/>',
  ginastica: '<circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/><path d="M7 10V3M17 10V3"/>',
  pessoa: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21c.5-4 3.3-6.5 7-6.5s6.5 2.5 7 6.5"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a2.5 2.5 0 0 0 3.5 3.5M16 6h3.5a2.5 2.5 0 0 1-3.5 3.5M12 13v4M8.5 20h7l-1-3h-5z"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  tv: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M8 21.5h8M9 2.5l3 3 3-3"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  f: '<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V22M8.5 18.5h7"/>',
  m: '<circle cx="10" cy="14" r="5.5"/><path d="M14 10l6.5-6.5M15 3.5h5.5V9"/>',
};
const icone = (nome, cls = 'ic') => ICONES[nome]
  ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome]}</svg>` : '';
const seloModalidade = (m) => `${icone(m.icone)}${m.sexo ? icone(m.sexo, 'ic ic-sexo') : ''}`;

const GRATIS = /(globo\b|tv globo|ge ?tv|youtube|tv brasil|tv cultura|cazé|caze|record\b|band\b|sbt\b|flatv|fla tv|flamengo tv)/i;

// ---------- memória do aparelho (só conveniência; se falhar, o app funciona igual) ----------
const guardar = (k, v) => { try { localStorage.setItem('flafan:' + k, JSON.stringify(v)); } catch {} };
const lembrar = (k, padrao) => { try { const v = localStorage.getItem('flafan:' + k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } };

const estado = {
  aba: 'proximos',
  filtro: lembrar('filtro', 'todas'),
  jogos: [],
  campeonatos: [],
  compacto: lembrar('compacto', false),
  mes: null,      // {ano, mes} em exibição no calendário
  diaSel: null,   // 'AAAA-MM-DD' selecionado no calendário
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- datas sempre no horário de Brasília ----------
const fmt = (opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opts });
const fHora = fmt({ hour: '2-digit', minute: '2-digit' });
const fDia = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fChave = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
const fDataHora = fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function rotuloDia(data) {
  const k = fChave.format(data);
  const hoje = new Date();
  if (k === fChave.format(hoje)) return 'Hoje';
  if (k === fChave.format(new Date(hoje.getTime() + 864e5))) return 'Amanhã';
  if (k === fChave.format(new Date(hoje.getTime() - 864e5))) return 'Ontem';
  const t = fDia.format(data);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function contagem(data) {
  const ms = data - Date.now();
  if (ms <= 0) return 'Começando agora';
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  if (d > 0) return `Faltam ${d} dia${d > 1 ? 's' : ''} e ${h}h`;
  if (h > 0) return `Faltam ${h}h${String(m).padStart(2, '0')}`;
  return `Faltam ${m} min`;
}

// ---------- montagem da tela ----------
function montarFiltros() {
  const presentes = new Set([...estado.jogos.map((j) => j.modalidade), ...estado.campeonatos.map((c) => c.modalidade)]);
  const opcoes = [['todas', 'Todas', ''], ...Object.entries(MODALIDADES).filter(([k]) => presentes.has(k)).map(([k, v]) => [k, v.curto, v])];
  if (!opcoes.some(([k]) => k === estado.filtro)) estado.filtro = 'todas';
  $('#filtros').innerHTML = opcoes.map(([k, nome, m]) =>
    `<button class="chip" data-filtro="${k}" aria-pressed="${k === estado.filtro}" ${m ? `aria-label="${esc(m.nome)}" title="${esc(m.nome)}"` : ''}>${m ? icone(m.icone) : ''}${esc(nome)}</button>`).join('');
}

const SIGLA_IGNORAR = new Set(['sesi', 'sesc', 'time', 'basquete', 'volei', 'vôlei', 'ec', 'sc', 'fc', 'cr', 'clube', 'esporte', 'associação', 'regata', 'caixa']);
function sigla(nome) {
  const palavras = String(nome).split(/[\s\-/]+/).filter(Boolean);
  const boa = palavras.find((p) => !SIGLA_IGNORAR.has(p.toLowerCase())) ?? palavras[0] ?? '?';
  return boa.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase();
}
// logos escuros que ficam apagados no fundo preto: ganham um fundo claro
const FUNDO_CLARO = /gerdau-minas|osasco-sao-cristovao/;
const classeImg = (url) => `escudo-img${FUNDO_CLARO.test(url ?? '') ? ' claro' : ''}`;

// nome do time: pode quebrar depois de "/" e ganha letra menor quando é comprido
const nomeTime = (nome) => esc(nome).replace(/\//g, '/<wbr>');
const classeNome = (nome) => (String(nome).length > 13 ? 'longo' : '');

function escudo(nome, fla, url) {
  const reserva = fla ? '<span class="escudo fla"></span>' : `<span class="escudo adv">${esc(sigla(nome))}</span>`;
  if (!url) return `<span class="escudo-box falhou" aria-hidden="true">${reserva}</span>`;
  return `<span class="escudo-box" aria-hidden="true"><img class="${classeImg(url)}" src="${esc(url)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('falhou')">${reserva}</span>`;
}

const semAc = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function iconeEsporte(esporte) {
  const e = semAc(esporte);
  if (/natac|aquat|nado|polo|salto/.test(e)) return 'natacao';
  if (/remo|canoa/.test(e)) return 'remo';
  if (/judo/.test(e)) return 'judo';
  if (/ginast/.test(e)) return 'ginastica';
  return 'olimpicos';
}
const fDiaCurto = fmt({ weekday: 'short', day: '2-digit', month: '2-digit' });
const fDM = fmt({ day: '2-digit', month: '2-digit' });
// "13/11" (00:00 de Brasília) a partir de 'AAAA-MM-DD'
const dataDoDia = (k) => new Date(`${k}T12:00:00-03:00`);
const fimDoEvento = (j) => new Date(`${j.fim ?? j.inicio.slice(0, 10)}T23:59:59-03:00`).getTime();

function cartaoEvento(j, destaque = false) {
  const m = MODALIDADES.olimpicos;
  const inicio = new Date(j.inicio);
  const kIni = j.inicio.slice(0, 10), kFim = j.fim ?? kIni;
  const quando = kIni === kFim
    ? `${fDiaCurto.format(inicio)}${j.semHora ? '' : ' · ' + fHora.format(inicio)}`
    : `${fDiaCurto.format(dataDoDia(kIni))} a ${fDiaCurto.format(dataDoDia(kFim))}`;
  const status = { adiado: 'Adiado', cancelado: 'Cancelado' }[j.status];
  const terminou = j.status === 'encerrado' || fimDoEvento(j) < Date.now();
  const canais = j.transmissao?.length
    ? j.transmissao.map((c) => `<span class="canal ${GRATIS.test(c) ? 'gratis' : ''}">${esc(c)}${GRATIS.test(c) ? '<em>grátis</em>' : ''}</span>`).join('')
    : `<span class="canal confirmar">A confirmar</span>`;
  return `<article class="jogo evento ${destaque ? 'destaque' : ''}" data-id="${esc(j.id)}" style="--cor:${m.cor}">
    ${destaque ? '<div class="destaque-rotulo">Próximo evento</div>' : ''}
    <header class="jogo-cab">
      <span class="tag">${icone(iconeEsporte(j.esporte))}<span>${esc(j.esporte)}</span></span>
      ${status ? `<span class="status ${j.status}">${status}</span>` : ''}
    </header>
    <div class="evento-nome">${esc(j.competicao)}</div>
    <div class="evento-quando">${icone('relogio')}<span>${esc(quando)}</span></div>
    ${j.resultado?.length ? `<ul class="evento-lista resultado-lista">${j.resultado.map((r) => `<li>${icone('trofeu')}<span>${esc(r)}</span></li>`).join('')}</ul>` : ''}
    ${j.atletas?.length ? `<div class="evento-atletas">${icone('pessoa')}<span>${j.atletas.map(esc).join(' · ')}</span></div>` : ''}
    <div class="detalhes">
      ${j.local ? `<div class="linha">${icone('pin')}<span>${esc(j.local)}</span></div>` : ''}
      ${!terminou ? `<div class="linha onde">${icone('tv')}<div class="canais">${canais}</div></div>` : ''}
    </div>
    ${j.observacao ? `<div class="obs">${esc(j.observacao)}</div>` : ''}
    ${j.fonteInfo ? `<div class="fonte-info">Fonte: ${esc(j.fonteInfo)}</div>` : ''}
  </article>`;
}

function contagemCaixas(data) {
  const ms = Math.max(0, data - Date.now());
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  const caixa = (n, r) => `<span class="cx"><b>${String(n).padStart(2, '0')}</b><small>${r}</small></span>`;
  return `<div class="contagem" aria-label="${esc(contagem(data))}">${caixa(d, d === 1 ? 'dia' : 'dias')}${caixa(h, 'horas')}${caixa(m, 'min')}</div>`;
}

function blocoInfo(j) {
  const data = new Date(j.inicio);
  const acabou = j.tipo === 'evento' ? (j.status === 'encerrado' || fimDoEvento(j) < Date.now()) : jaTerminou(j) || (!j.semHora && data.getTime() + DURACAO < Date.now());
  const info = [];
  if (j.local) info.push(`<span class="lc-item">${icone('pin')}${esc(j.local)}</span>`);
  if (!acabou && j.status !== 'cancelado') {
    info.push(`<span class="lc-item">${icone('tv')}${j.transmissao?.length ? j.transmissao.map((c) => `<b class="${GRATIS.test(c) ? 'gratis' : ''}">${esc(c)}</b>`).join(', ') : '<i>a confirmar</i>'}</span>`);
  }
  if (j.tipo === 'evento' && j.atletas?.length) info.push(`<span class="lc-item">${icone('pessoa')}${j.atletas.map(esc).join(' · ')}</span>`);
  const extras = [];
  if (j.tipo === 'evento' && j.resultado?.length > 1) extras.push(`<div class="lc-resultado">${j.resultado.map((r) => `<span>${icone('trofeu')}${esc(r)}</span>`).join('')}</div>`);
  if (j.observacao) extras.push(`<div class="lc-obs">${esc(j.observacao)}</div>`);
  const rodape = [];
  if (j.ingresso && /^https:\/\//.test(j.ingresso) && !acabou && j.status !== 'cancelado') rodape.push(`<a class="lc-ingresso" href="${esc(j.ingresso)}" target="_blank" rel="noopener">Comprar ingresso ↗</a>`);
  if (j.categoria) rodape.push(`<span class="lc-fonte">${esc(j.categoria)}</span>`);
  if (j.fonteInfo) rodape.push(`<span class="lc-fonte">Fonte: ${esc(j.fonteInfo)}</span>`);
  return `${info.length ? `<div class="lc-info">${info.join('')}</div>` : ''}${extras.join('')}${rodape.length ? `<div class="lc-rodape">${rodape.join('')}</div>` : ''}`;
}

function linhaCompacta(j) {
  const m = MODALIDADES[j.modalidade] ?? { cor: '#E3141B' };
  const data = new Date(j.inicio);
  let esq, dir, valor, legenda = '', classeValor = '';
  if (j.tipo === 'evento') {
    const kIni = j.inicio.slice(0, 10), kFim = j.fim ?? kIni;
    esq = `<div class="lc-time"><span class="lc-ic" style="color:${m.cor}">${icone(iconeEsporte(j.esporte))}</span><span class="lc-nome">${esc(j.esporte)}</span></div>`;
    dir = `<div class="lc-time"><span class="lc-ic lc-trofeu">${icone(j.resultado?.length ? 'trofeu' : 'pin')}</span><span class="lc-nome">${esc(j.resultado?.[0] ?? j.local ?? '')}</span></div>`;
    valor = `<span class="lc-evento">${esc(j.competicao)}</span>`;
    legenda = kIni === kFim ? (j.semHora ? 'Dia todo' : fHora.format(data)) : `${fDM.format(dataDoDia(kIni))} a ${fDM.format(dataDoDia(kFim))}`;
  } else {
    const flaCasa = j.mandante !== false;
    const lado = (nome, fla, url, venceu) => `<div class="lc-time ${fla ? 'eh-fla' : ''} ${venceu ? 'venc' : ''}">${escudoPequeno(nome, url, fla)}<span class="lc-nome ${classeNome(nome)}">${nomeTime(nome)}</span></div>`;
    const terminou = jaTerminou(j);
    const f = j.placar?.flamengo, a = j.placar?.adversario;
    const flaVenceu = j.placar && f > a, advVenceu = j.placar && a > f;
    esq = flaCasa ? lado('Flamengo', true, null, flaVenceu) : lado(j.adversario, false, j.escudoAdv, advVenceu);
    dir = flaCasa ? lado(j.adversario, false, j.escudoAdv, advVenceu) : lado('Flamengo', true, null, flaVenceu);
    if (j.placar) {
      const [pe, pd] = flaCasa ? [f, a] : [a, f];
      valor = `<span class="lc-placar"><b class="${pe > pd ? 'mais' : ''}">${pe}</b><i>–</i><b class="${pd > pe ? 'mais' : ''}">${pd}</b></span>`;
      legenda = terminou ? (f > a ? 'Vitória' : f < a ? 'Derrota' : 'Empate') : 'Parcial';
      classeValor = terminou ? (f > a ? 'v' : f < a ? 'd' : 'e') : '';
    } else if (j.status === 'cancelado' || j.status === 'adiado') {
      valor = '<span class="lc-hora apagado">--:--</span>'; legenda = j.status === 'adiado' ? 'Adiado' : 'Cancelado';
    } else if (terminou || (!j.semHora && data.getTime() + DURACAO < Date.now())) {
      valor = '<span class="lc-hora apagado">– × –</span>'; legenda = 'Sem placar';
    } else {
      valor = `<span class="lc-hora">${j.semHora ? '--:--' : fHora.format(data)}</span>`;
      legenda = j.status === 'ao-vivo' ? 'Ao vivo' : j.semHora ? 'Horário a definir' : 'Brasília';
    }
  }
  const comp = j.tipo === 'evento' ? 'Olímpicos' : (j.competicao || m.nome || '');
  return `<article class="lc" data-id="${esc(j.id)}" style="--cor:${m.cor}">
    <div class="lc-placa">
      ${esq}
      <div class="lc-centro">
        <span class="lc-comp">${j.tipo === 'evento' ? '' : icone(m.icone ?? 'olimpicos')}${esc(comp)}</span>
        ${valor}
        <span class="lc-leg ${classeValor} ${j.status === 'ao-vivo' ? 'ao-vivo' : ''}">${esc(legenda)}</span>
      </div>
      ${dir}
    </div>
    ${blocoInfo(j)}
  </article>`;
}

function cartao(j, destaque = false) {
  if (j.tipo === 'evento') return cartaoEvento(j, destaque);
  const m = MODALIDADES[j.modalidade] ?? { nome: j.modalidade, cor: '#E3141B' };
  const data = new Date(j.inicio);
  const flaCasa = j.mandante !== false;
  const timeFla = { nome: 'Flamengo', fla: true, url: estado.escudoFla }, timeAdv = { nome: j.adversario, fla: false, url: j.escudoAdv };
  const [esq, dir] = flaCasa ? [timeFla, timeAdv] : [timeAdv, timeFla];
  const lado = (t, pos) => `<div class="time ${pos} ${t.fla ? 'eh-fla' : ''}">${escudo(t.nome, t.fla, t.url)}<span class="time-nome ${classeNome(t.nome)}">${nomeTime(t.nome)}</span></div>`;

  let centro, selo = '';
  const terminou = jaTerminou(j);
  if (j.placar) {
    const { flamengo: f, adversario: a } = j.placar;
    const [pe, pd] = flaCasa ? [f, a] : [a, f];
    centro = `<div class="placar"><span>${pe}</span><i>–</i><span>${pd}</span></div><div class="centro-legenda">${terminou ? 'Encerrado' : 'Parcial'}</div>`;
    if (terminou) {
      const r = f > a ? ['v', 'Vitória'] : f < a ? ['d', 'Derrota'] : ['e', 'Empate'];
      selo = `<span class="resultado ${r[0]}">${r[1]}</span>`;
    }
  } else if (j.status === 'cancelado' || j.status === 'adiado') {
    centro = `<div class="hora-grande a-definir">--:--</div><div class="centro-legenda">${j.status === 'adiado' ? 'Nova data a definir' : 'Jogo cancelado'}</div>`;
  } else if (terminou || (!j.semHora && data.getTime() + DURACAO < Date.now())) {
    centro = `<div class="hora-grande a-definir">– × –</div><div class="centro-legenda">Placar não informado</div>`;
  } else if (j.semHora) {
    centro = `<div class="hora-grande a-definir">--:--</div><div class="centro-legenda">Horário a definir</div>`;
  } else {
    centro = `<div class="hora-grande">${fHora.format(data)}</div><div class="centro-legenda">Brasília</div>`;
  }

  const status = { 'ao-vivo': 'Ao vivo', adiado: 'Adiado', cancelado: 'Cancelado' }[j.status];
  const canais = j.transmissao?.length
    ? j.transmissao.map((c) => `<span class="canal ${GRATIS.test(c) ? 'gratis' : ''}">${esc(c)}${GRATIS.test(c) ? '<em>grátis</em>' : ''}</span>`).join('')
    : `<span class="canal confirmar">A confirmar</span>`;
  const mostraOnde = j.status !== 'encerrado';

  return `<article class="jogo ${destaque ? 'destaque' : ''}" data-id="${esc(j.id)}" style="--cor:${m.cor}">
    ${destaque ? `<div class="destaque-rotulo">Próximo jogo</div>` : ''}
    <header class="jogo-cab">
      <span class="tag">${m.icone ? seloModalidade(m) : ''}<span>${esc(m.nome)}${j.categoria ? ' ' + esc(j.categoria) : ''}</span></span>
      ${status ? `<span class="status ${j.status}">${status}</span>` : ''}${selo}
    </header>
    ${j.competicao ? `<div class="competicao">${esc(j.competicao)}</div>` : ''}
    <div class="confronto">${lado(esq, 'esq')}<div class="centro">${centro}</div>${lado(dir, 'dir')}</div>
    ${destaque && !j.semHora && !j.placar && j.status !== 'adiado' && j.status !== 'cancelado' ? contagemCaixas(data) : ''}
    <div class="detalhes">
      ${j.local ? `<div class="linha">${icone('pin')}<span>${esc(j.local)}</span></div>` : ''}
      ${mostraOnde ? `<div class="linha onde">${icone('tv')}<div class="canais">${canais}</div></div>` : ''}
    </div>
    ${j.observacao ? `<div class="obs">${esc(j.observacao)}</div>` : ''}
    ${j.ingresso && /^https:\/\//.test(j.ingresso) && !terminou && j.status !== 'cancelado' ? `<a class="btn ingresso" href="${esc(j.ingresso)}" target="_blank" rel="noopener">Comprar ingresso ↗</a>` : ''}
    ${j.fonteInfo ? `<div class="fonte-info">Fonte: ${esc(j.fonteInfo)}</div>` : ''}
  </article>`;
}

// chave 'AAAA-MM-DD' de uma data no horário de Brasília
function chaveDia(data) {
  const [d, m, a] = fChave.format(data).split('/');
  return `${a}-${m}-${d}`;
}
const fMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function desenharCalendario(filtrados) {
  const hoje = chaveDia(new Date());
  if (!estado.mes) estado.mes = { ano: +hoje.slice(0, 4), mes: +hoje.slice(5, 7) - 1 };
  if (!estado.diaSel) estado.diaSel = hoje;
  const { ano, mes } = estado.mes;

  const porDia = new Map();
  for (const j of filtrados) {
    if (j.status === 'cancelado') continue;
    const dias = [chaveDia(new Date(j.inicio))];
    if (j.tipo === 'evento' && j.fim) {
      for (let d = dataDoDia(dias[0]); chaveDia(d) < j.fim && dias.length < 40;) { d = new Date(d.getTime() + 864e5); dias.push(chaveDia(d)); }
    }
    for (const k of dias) { if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(j); }
  }

  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const vazios = primeiro.getUTCDay();
  const titulo = fMes.format(primeiro);
  const totalMes = [...porDia.keys()].filter((k) => k.startsWith(`${ano}-${String(mes + 1).padStart(2, '0')}`))
    .reduce((n, k) => n + porDia.get(k).length, 0);

  let celulas = '';
  for (let i = 0; i < vazios; i++) celulas += '<span class="cal-vazio"></span>';
  for (let d = 1; d <= diasNoMes; d++) {
    const k = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const jogos = porDia.get(k) ?? [];
    const cores = jogos.slice(0, 3).map((j) => `<i style="background:${(MODALIDADES[j.modalidade] ?? {}).cor ?? '#E3141B'}"></i>`).join('');
    const mais = jogos.length > 3 ? '<b>+</b>' : '';
    const classes = ['cal-dia', k === hoje ? 'hoje' : '', k === estado.diaSel ? 'sel' : '', jogos.length ? 'tem' : ''].join(' ');
    const rotulo = `${d}${jogos.length ? `, ${jogos.length} jogo${jogos.length > 1 ? 's' : ''}` : ''}`;
    celulas += `<button class="${classes}" data-dia="${k}" aria-label="${rotulo}" aria-pressed="${k === estado.diaSel}">
      <span class="cal-num">${d}</span><span class="cal-pontos">${cores}${mais}</span></button>`;
  }

  const sel = porDia.get(estado.diaSel) ?? [];
  const [sa, sm, sd] = estado.diaSel.split('-').map(Number);
  const rotSel = rotuloDia(new Date(Date.UTC(sa, sm - 1, sd, 15)));
  const lista = sel.length ? (estado.compacto ? `<div class="painel-compacto">${sel.map(linhaCompacta).join('')}</div>` : sel.map((j) => cartao(j)).join('')) : '<p class="vazio pequeno">Nenhum jogo neste dia.</p>';

  $('#lista').innerHTML = `
    <section class="cal" aria-label="Calendário de jogos">
      <div class="cal-topo">
        <button class="btn-icone" data-mes="-1" aria-label="Mês anterior">‹</button>
        <div class="cal-titulo"><strong>${esc(titulo.charAt(0).toUpperCase() + titulo.slice(1))}</strong>
          <span>${totalMes ? `${totalMes} jogo${totalMes > 1 ? 's' : ''}` : 'Sem jogos cadastrados'}</span></div>
        <button class="btn-icone" data-mes="1" aria-label="Próximo mês">›</button>
      </div>
      <div class="cal-semana" aria-hidden="true"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
      <div class="cal-grade">${celulas}</div>
    </section>
    <h2 class="dia">${esc(rotSel)}</h2>
    ${lista}`;
}

function escudoPequeno(nome, url, fla) {
  const u = fla ? estado.escudoFla : url;
  const reserva = fla ? '<span class="escudo fla"></span>' : `<span class="escudo adv">${esc(sigla(nome))}</span>`;
  return `<span class="escudo-box mini ${u ? '' : 'falhou'}" aria-hidden="true">${u ? `<img class="${classeImg(u)}" src="${esc(u)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('falhou')">` : ''}${reserva}</span>`;
}

// mesmo time com nomes diferentes ("Athletico-PR" x "Athletico PR")
const tokensTime = (n) => semAc(n).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((p) => p.length >= 4 && !['volei', 'basquete', 'basket', 'clube', 'esporte', 'sesi', 'sesc', 'caixa', 'ceisc'].includes(p));
function mesmoTimeApp(a, b) {
  if (semAc(a) === semAc(b)) return true;
  const ta = tokensTime(a), tb = new Set(tokensTime(b));
  return ta.length > 0 && ta.some((t) => tb.has(t));
}

function htmlTabela(c, adversario = null) {
  const m = MODALIDADES[c.modalidade] ?? { cor: '#E3141B' };
  const COLS = [['v', 'V', 'Vitórias'], ['e', 'E', 'Empates'], ['d', 'D', 'Derrotas'], ['gp', 'GP', 'Gols pró'], ['gc', 'GC', 'Gols contra'],
    ['sg', 'SG', 'Saldo'], ['ap', '%', 'Aproveitamento'], ['ca', 'CA', 'Cartões amarelos'], ['cv', 'CV', 'Cartões vermelhos'], ['ult', 'Últimos', 'Últimos jogos']];
  const tem = (k) => c.linhas.some((l) => l[k] !== null && l[k] !== undefined && !(Array.isArray(l[k]) && !l[k].length));
  const extras = COLS.filter(([k]) => tem(k));
  const temPts = tem('pts');
  const brasileirao = /brasileir[aã]o s[ée]rie a/i.test(c.nome);
  const zona = (pos) => !brasileirao || !pos ? '' : pos <= 4 ? 'z-liberta' : pos <= 6 ? 'z-pre' : pos >= c.linhas.length - 3 ? 'z-rebaixa' : '';
  const ULT = { V: 'Vitória', E: 'Empate', D: 'Derrota' };
  const sinal = (k, v) => k === 'ult' ? `<span class="ult">${(v ?? []).map((r) => `<i class="ult-${r}" title="${ULT[r]}">${r}</i>`).join('')}</span>`
    : (k === 'sg' && v > 0 ? `+${v}` : v ?? '');
  const larga = extras.length > 4;
  const linhas = c.linhas.map((l) => {
    const fla = /flamengo/i.test(l.time);
    const adv = !fla && adversario && mesmoTimeApp(adversario, l.time);
    return `<tr class="${fla ? 'eh-fla' : ''} ${adv ? 'eh-adv' : ''} ${zona(l.pos)}">
      <td class="t-pos">${l.pos ?? ''}</td>
      <td class="t-time"><div class="t-time-in">${escudoPequeno(l.time, l.escudo, fla)}<span>${esc(l.time)}</span></div></td>
      ${temPts ? `<td class="t-pts">${l.pts ?? ''}</td>` : ''}<td>${l.j ?? ''}</td>
      ${extras.map(([k]) => `<td class="c-${k}">${sinal(k, l[k])}</td>`).join('')}
    </tr>`;
  }).join('');
  return `<section class="tabela-camp" style="--cor:${m.cor}">
    <header class="tabela-cab">
      <span class="tag">${m.icone ? seloModalidade(m) : ''}<span>${esc(c.nome)}</span></span>
      ${c.atualizado ? `<small>Atualizado ${esc(c.atualizado)}</small>` : ''}
    </header>
    <div class="tabela-rolagem"><table class="${larga ? 'larga' : ''}">
      <thead><tr><th class="t-pos">#</th><th class="t-time">Time</th>${temPts ? '<th title="Pontos">P</th>' : ''}<th title="Jogos">J</th>
        ${extras.map(([k, r, t]) => `<th class="c-${k}" title="${t}">${r}</th>`).join('')}</tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>
    ${larga ? '<div class="tabela-dica">Arraste para o lado para ver todas as colunas →</div>' : ''}
    ${c.nota ? `<div class="tabela-nota"><span>${esc(c.nota)}</span></div>` : ''}
    ${brasileirao ? '<div class="tabela-legenda"><span class="lg z-liberta">Libertadores</span><span class="lg z-pre">Pré-Libertadores</span><span class="lg z-rebaixa">Rebaixamento</span></div>' : ''}
  </section>`;
}

function desenharTabela() {
  const lista = estado.campeonatos.filter((c) => estado.filtro === 'todas' || c.modalidade === estado.filtro);
  if (!lista.length) {
    $('#lista').innerHTML = `<p class="vazio">${estado.campeonatos.length ? 'Nenhuma tabela para esta modalidade ainda.' : 'As tabelas de classificação aparecem aqui assim que forem cadastradas.'}</p>`;
    return;
  }
  $('#lista').innerHTML = lista.map((c) => htmlTabela(c)).join('');
}

// tabela do campeonato do jogo (Brasileirão, NBB, Superliga...), se existir
function tabelaDoJogo(j) {
  if (j.tabela) return estado.campeonatos.find((c) => c.nome === j.tabela) ?? null;
  const comp = semAc(j.competicao);
  const cat = semAc(j.categoria ?? '').replace(/[^a-z0-9]+/g, ' ').trim(); // "sub 20" ou ""
  let melhor = null, pontos = 0;
  for (const c of estado.campeonatos) {
    if (c.modalidade !== j.modalidade) continue;
    const nome = semAc(c.nome).replace(/[^a-z0-9]+/g, ' ');
    const catTabela = (nome.match(/sub \d+/) ?? [''])[0];
    if (catTabela !== cat) continue; // Sub-17 não usa a tabela do Sub-20, nem o principal a da base
    const n = nome.split(' ').filter((p) => p.length >= 3 && !['serie', 'feminina', 'masculina', 'sub', 'feminino', 'copa'].includes(p) && comp.includes(p)).length;
    if (n > pontos) { melhor = c; pontos = n; }
  }
  return melhor;
}

// ---------- "Neste campeonato": próximo jogo e últimos resultados da mesma competição ----------
// "Copa do Brasil Feminina – semifinal (volta)" e "Copa do Brasil Feminina" = mesmo campeonato; "Superliga" = "Superliga Feminina"
function chaveCampeonato(j) {
  const nome = semAc(j.competicao ?? '').split(/\s[–—-]\s/)[0].replace(/\(.*?\)/g, ' ')
    .replace(/\b(campeonato|feminin[oa]|masculin[oa])\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  return nome ? `${j.modalidade}|${j.categoria ?? ''}|${nome}` : null;
}
const fCurta = fmt({ weekday: 'short', day: '2-digit', month: '2-digit' });
function linhaCampeonato(j) {
  const terminou = jaTerminou(j);
  const fla = j.placar ? j.placar.flamengo : null, adv = j.placar ? j.placar.adversario : null;
  const res = j.placar ? (fla > adv ? 'v' : fla < adv ? 'd' : 'e') : '';
  const direita = j.placar
    ? `<span class="nc-placar nc-${res}"><i>${{ v: 'V', e: 'E', d: 'D' }[res]}</i>${fla}–${adv}</span>`
    : terminou ? '<span class="nc-hora">—</span>'
    : `<span class="nc-hora">${j.status === 'adiado' ? 'Adiado' : j.semHora ? 'a definir' : fHora.format(new Date(j.inicio))}</span>`;
  const fase = (String(j.competicao ?? '').split(/\s[–—-]\s/)[1] ?? '');
  return `<button type="button" class="nc-jogo" data-jogo="${esc(j.id)}">
    <span class="nc-data">${esc(fCurta.format(new Date(j.inicio)).replace('.', ''))}</span>
    ${escudoPequeno(j.adversario, j.escudoAdv, false)}
    <span class="nc-nome"><b>${esc(j.adversario)}</b><small>${j.mandante === true ? 'em casa' : j.mandante === false ? 'fora' : ''}${fase ? (j.mandante !== null && j.mandante !== undefined ? ' · ' : '') + esc(fase) : ''}</small></span>
    ${direita}
  </button>`;
}
function blocoCampeonato(j) {
  const chave = chaveCampeonato(j);
  if (!chave || j.tipo === 'evento') return '';
  const mesmos = estado.jogos.filter((x) => x.id !== j.id && x.tipo !== 'evento' && chaveCampeonato(x) === chave)
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const proximos = mesmos.filter((x) => !jaTerminou(x)).slice(0, 2);
  const ultimos = mesmos.filter((x) => jaTerminou(x)).slice(-3).reverse();
  if (!proximos.length && !ultimos.length) return '';
  return `<h3 class="fj-titulo">Neste campeonato</h3>
    <section class="nc">
      <div class="nc-rotulo">${proximos.length > 1 ? 'Próximos jogos' : 'Próximo jogo'}</div>
      ${proximos.length ? proximos.map(linhaCampeonato).join('') : '<p class="nc-vazio">Próximo jogo ainda não marcado.</p>'}
      ${ultimos.length ? `<div class="nc-rotulo">Últimos resultados</div>${ultimos.map(linhaCampeonato).join('')}` : ''}
    </section>`;
}

// ---------- tela do jogo (toque no cartão) ----------
function abrirJogo(id) {
  const j = estado.jogos.find((x) => x.id === id);
  if (!j) return;
  const m = MODALIDADES[j.modalidade] ?? { cor: '#E3141B', nome: '' };
  let topo;
  if (j.tipo === 'evento') {
    topo = `<div class="fj-comp">${esc(j.esporte)}</div><div class="fj-evento">${esc(j.competicao)}</div>`;
  } else {
    const flaCasa = j.mandante !== false;
    const ladoT = (nome, fla, url) => `<div class="fj-time">${escudo(nome, fla, fla ? estado.escudoFla : url)}<span class="${classeNome(nome)}">${nomeTime(nome)}</span></div>`;
    const esq = flaCasa ? ladoT('Flamengo', true) : ladoT(j.adversario, false, j.escudoAdv);
    const dir = flaCasa ? ladoT(j.adversario, false, j.escudoAdv) : ladoT('Flamengo', true);
    const data = new Date(j.inicio);
    let centro;
    if (j.placar) {
      const [pe, pd] = flaCasa ? [j.placar.flamengo, j.placar.adversario] : [j.placar.adversario, j.placar.flamengo];
      centro = `<div class="fj-placar">${pe}<i>–</i>${pd}</div><div class="fj-leg">${jaTerminou(j) ? 'Fim' : 'Parcial'}</div>`;
    } else {
      const dia = rotuloDia(data);
      centro = `<div class="fj-hora">${j.semHora ? '--:--' : fHora.format(data)}</div><div class="fj-leg">${esc(/^(Hoje|Amanhã|Ontem)$/.test(dia) ? dia : fDiaCurto.format(data))}</div>`;
    }
    topo = `<div class="fj-comp">${esc(j.competicao || m.nome)}${j.categoria ? ' · ' + esc(j.categoria) : ''}</div>
      <div class="fj-confronto">${esq}<div class="fj-centro">${centro}</div>${dir}</div>`;
  }
  const tabela = j.tipo === 'evento' ? null : tabelaDoJogo(j);
  $('#detalhe-conteudo').innerHTML = `
    <div class="fj-topo" style="--cor:${m.cor}">${topo}</div>
    <div class="fj-info">${blocoInfo(j)}</div>
    ${blocoCampeonato(j)}
    ${tabela ? `<h3 class="fj-titulo">Tabela</h3>${htmlTabela(tabela, j.adversario)}` : ''}`;
  // sempre abre do topo (sem herdar a rolagem nem o arraste do jogo anterior)
  const conteudo = $('#detalhe .folha-conteudo');
  conteudo.style.transition = 'none'; conteudo.style.transform = '';
  conteudo.style.setProperty('--cor', m.cor);
  $('#detalhe').showModal();
  document.activeElement?.blur?.(); // não deixa nenhum botão selecionado ao abrir
  conteudo.scrollTop = 0; $('#detalhe').scrollTop = 0;
  requestAnimationFrame(() => { conteudo.scrollTop = 0; });
}

const DURACAO = 3 * 3600e3;
// terminou = marcado como encerrado, ou já tem placar e passaram 3h do início
const jaTerminou = (j) => j.status === 'encerrado' || (!!j.placar && new Date(j.inicio).getTime() + DURACAO < Date.now()) ||
  (j.tipo === 'evento' && fimDoEvento(j) < Date.now());

function desenhar() {
  $('#lista').classList.toggle('compacto', !!estado.compacto);
  const agora = Date.now();
  const DUR = 3 * 3600e3; // um jogo "ainda não acabou" até 3h depois do início, se não tiver resultado
  const filtrados = estado.jogos.filter((j) => estado.filtro === 'todas' || j.modalidade === estado.filtro);
  // Próximos: ainda vai acontecer (ou adiado sem nova data). Resultados: todo o resto — nenhum jogo some.
  const proximos = filtrados.filter((j) => j.status !== 'cancelado' && !jaTerminou(j) &&
    (j.status === 'adiado' || (j.tipo === 'evento' ? fimDoEvento(j) > agora : new Date(j.inicio).getTime() + (j.semHora ? 864e5 : DUR) > agora)));
  const idsProx = new Set(proximos.map((j) => j.id));
  const resultados = filtrados.filter((j) => !idsProx.has(j.id)).reverse();
  if (estado.aba === 'calendario') return desenharCalendario(filtrados);
  if (estado.aba === 'tabela') return desenharTabela();
  const lista = estado.aba === 'proximos' ? proximos : resultados;

  if (!lista.length) {
    $('#lista').innerHTML = `<p class="vazio">${estado.aba === 'proximos' ? 'Nenhum jogo marcado por enquanto.' : 'Nenhum resultado recente.'}</p>`;
    return;
  }
  let html = '', diaAtual = '';
  const iDestaque = estado.aba === 'proximos' ? lista.findIndex((j) => j.status !== 'adiado' && j.status !== 'cancelado') : -1;
  lista.forEach((j, i) => {
    const d = new Date(j.inicio);
    const rot = rotuloDia(d);
    if (rot !== diaAtual) {
      if (estado.compacto && diaAtual) html += '</div>';
      html += `<h2 class="dia">${esc(rot)}</h2>`;
      if (estado.compacto) html += '<div class="painel-compacto">';
      diaAtual = rot;
    }
    html += estado.compacto ? linhaCompacta(j) : cartao(j, i === iDestaque);
  });
  if (estado.compacto && diaAtual) html += '</div>';
  $('#lista').innerHTML = html;
}

// ---------- lembretes na agenda (.ics) ----------
function linkCalendario(mod) {
  const base = new URL(`data/calendario/${mod}.ics`, location.href);
  return { https: base.href, webcal: base.href.replace(/^https?:/, 'webcal:') };
}
function montarAjustes() {
  const sel = $('#cal-modalidade');
  sel.innerHTML = `<option value="todos">Todos os jogos</option>` +
    Object.entries(MODALIDADES).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('');
  const atualizar = () => {
    const l = linkCalendario(sel.value);
    $('#cal-iphone').href = l.webcal;
    $('#cal-google').href = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(l.webcal);
  };
  sel.onchange = atualizar; atualizar();
  $('#cal-copiar').onclick = async () => {
    const l = linkCalendario(sel.value).https;
    try { await navigator.clipboard.writeText(l); $('#cal-copiar').textContent = 'Copiado ✓'; }
    catch { prompt('Copie o link:', l); }
    setTimeout(() => ($('#cal-copiar').textContent = 'Copiar link'), 2000);
  };

  const prefs = lembrar('acompanhar', Object.keys(MODALIDADES));
  $('#pref-modalidades').innerHTML = Object.entries(MODALIDADES).map(([k, v]) =>
    `<label><input type="checkbox" value="${k}" ${prefs.includes(k) ? 'checked' : ''}> <span class="pref-nome" style="color:${v.cor}">${seloModalidade(v)}</span> ${esc(v.nome)}</label>`).join('');
  $('#pref-modalidades').onchange = () => {
    guardar('acompanhar', [...document.querySelectorAll('#pref-modalidades input:checked')].map((i) => i.value));
    window.dispatchEvent(new Event('flafan:prefs'));
  };
}

// ---------- eventos ----------
document.addEventListener('click', (e) => {
  const outro = e.target.closest('#detalhe [data-jogo]');
  if (outro) { abrirJogo(outro.dataset.jogo); return; }
  const card = e.target.closest('#lista [data-id]');
  if (card && !e.target.closest('a, button')) { abrirJogo(card.dataset.id); return; }
  const aba = e.target.closest('[data-aba]');
  if (aba) {
    estado.aba = aba.dataset.aba;
    document.querySelectorAll('.aba').forEach((b) => { const on = b === aba; b.classList.toggle('ativa', on); b.setAttribute('aria-selected', on); });
    moverDestaqueAba();
    desenhar();
  }
  const navMes = e.target.closest('[data-mes]');
  if (navMes) {
    let { ano, mes } = estado.mes;
    mes += Number(navMes.dataset.mes);
    if (mes < 0) { mes = 11; ano--; } else if (mes > 11) { mes = 0; ano++; }
    estado.mes = { ano, mes };
    const hojeK = chaveDia(new Date()), prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    estado.diaSel = hojeK.startsWith(prefixo) ? hojeK : `${prefixo}-01`;
    desenhar();
  }
  const dia = e.target.closest('[data-dia]');
  if (dia) { estado.diaSel = dia.dataset.dia; desenhar(); }
  const chip = e.target.closest('[data-filtro]');
  if (chip) {
    estado.filtro = chip.dataset.filtro; guardar('filtro', estado.filtro);
    montarFiltros(); desenhar();
  }
});
$('#abrir-ajustes').onclick = () => $('#ajustes').showModal();

// ---------- instalar na tela inicial ----------
// o botão só aparece quando o app está aberto no navegador (some depois de instalado)
const instalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let pedidoInstalar = null;
if (!instalado()) $('#abrir-instalar').hidden = false;
else $('#compartilhar').hidden = false; // dentro do app instalado: compartilhar com amigos

// link que abre o FlaFan já com o passo a passo de instalação (para mandar aos amigos)
const linkConvite = () => `${location.origin}${location.pathname.replace(/index\.html$/, '')}?instalar`;
function avisar(texto) {
  const t = $('#toast'); t.textContent = texto; t.hidden = false;
  clearTimeout(avisar.tempo); avisar.tempo = setTimeout(() => { t.hidden = true; }, 2600);
}
$('#compartilhar').onclick = async () => {
  const dados = { title: 'FlaFan', text: 'Todos os jogos do Mengão em um app: futebol, base, feminino, basquete, vôlei e mais. Instala aí:', url: linkConvite() };
  try {
    if (navigator.share) { await navigator.share(dados); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${dados.text} ${dados.url}`); avisar('Link copiado! Cole no WhatsApp para mandar.'); }
  catch { prompt('Copie o link do FlaFan:', dados.url); }
};
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; $('#instalar-direto').hidden = false; });
window.addEventListener('appinstalled', () => { $('#abrir-instalar').hidden = true; $('#instalar').close(); });
$('#abrir-instalar').onclick = () => {
  // mostra primeiro o passo a passo do celular da pessoa
  const passos = $('#instalar .instalar');
  const meu = passos.querySelector(`[data-sistema="${ehIos ? 'ios' : 'android'}"]`);
  passos.insertBefore(meu, passos.querySelector('.passos'));
  passos.querySelectorAll('.passos').forEach((p) => p.classList.toggle('outro', p !== meu));
  $('#instalar').showModal();
};
$('#instalar-direto').onclick = async () => {
  if (!pedidoInstalar) return;
  pedidoInstalar.prompt();
  await pedidoInstalar.userChoice.catch(() => null);
  pedidoInstalar = null; $('#instalar-direto').hidden = true;
};
$('#instalar').addEventListener('click', (e) => { if (e.target === $('#instalar')) $('#instalar').close(); });
if (/[?&]instalar\b/.test(location.search)) {
  history.replaceState(null, '', location.pathname); // tira o ?instalar do endereço (não reabre ao atualizar)
  if (!instalado()) setTimeout(() => $('#abrir-instalar').click(), 600);
}
$('#detalhe').addEventListener('click', (e) => { if (e.target === $('#detalhe') || e.target.closest('[data-fechar]')) $('#detalhe').close(); });
// arrastar a folha para baixo fecha (quando ela está no topo da rolagem)
{
  const folha = $('#detalhe'), conteudo = folha.querySelector('.folha-conteudo');
  let y0 = null, dy = 0;
  conteudo.addEventListener('touchstart', (e) => { y0 = conteudo.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; conteudo.style.transition = 'none'; }, { passive: true });
  conteudo.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0) { conteudo.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); }
    else { y0 = null; conteudo.style.transform = ''; }
  }, { passive: false });
  const soltar = () => {
    if (y0 === null) return;
    y0 = null;
    conteudo.style.transition = 'transform .22s ease-out';
    if (dy > 90) {
      conteudo.style.transform = 'translateY(100%)';
      setTimeout(() => { folha.close(); conteudo.style.transition = 'none'; conteudo.style.transform = ''; }, 200);
    } else conteudo.style.transform = '';
  };
  conteudo.addEventListener('touchend', soltar);
  conteudo.addEventListener('touchcancel', soltar);
}

// ---------- chave do visual compacto ----------
$('#chave-compacto').checked = !!estado.compacto;
$('#chave-compacto').onchange = (e) => {
  estado.compacto = e.target.checked;
  guardar('compacto', estado.compacto);
  desenhar();
};

// ---------- modo claro / noturno ----------
const sistemaEscuro = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const temaAtual = () => document.documentElement.dataset.theme || (sistemaEscuro() ? 'dark' : 'light');
function aplicarCorBarra() {
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = temaAtual() === 'dark' ? '#09090B' : '#F5F4F2';
}
$('#tema').onclick = () => {
  const novo = temaAtual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = novo;
  try { localStorage.setItem('flafan:tema', novo); } catch {}
  aplicarCorBarra();
};
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', aplicarCorBarra);
aplicarCorBarra();
$('#ajustes').addEventListener('click', (e) => { if (e.target === $('#ajustes')) $('#ajustes').close(); });

// ---------- início ----------
async function carregar() {
  try {
    const r = await fetch('data/jogos.json', { cache: 'no-cache' });
    const dados = await r.json();
    estado.jogos = dados.jogos ?? [];
    estado.carregado = true;
    estado.escudoFla = dados.escudoFlamengo ?? null;
    try {
      const t = await (await fetch('data/classificacao.json', { cache: 'no-cache' })).json();
      estado.campeonatos = t.campeonatos ?? [];
    } catch { estado.campeonatos = []; }
    $('#aviso-exemplo').hidden = !dados.exemplo;
    if (dados.atualizadoEm) $('#atualizado').textContent = 'Atualizado em ' + fDataHora.format(new Date(dados.atualizadoEm));
  } catch {
    $('#lista').innerHTML = '<p class="vazio">Não foi possível carregar os jogos. Verifique sua internet.</p>';
    return;
  }
  montarFiltros(); desenhar();
}
// destaque vermelho que desliza até a aba escolhida
function moverDestaqueAba() {
  const abas = [...document.querySelectorAll('.abas .aba')];
  const i = Math.max(0, abas.findIndex((b) => b.classList.contains('ativa')));
  document.querySelector('.abas')?.style.setProperty('--i', i);
}
moverDestaqueAba();
requestAnimationFrame(() => document.querySelector('.abas')?.classList.add('anima'));
montarAjustes();
carregar();
setInterval(() => { if (estado.carregado && (estado.aba === 'proximos' || estado.aba === 'resultados') && !$('#detalhe').open) desenhar(); }, 60e3); // atualiza a contagem regressiva

// Atualização do app: confere se há versão nova ao abrir e ao voltar para o app; quando chega, recarrega sozinho.
if ('serviceWorker' in navigator) {
  const tinhaVersao = !!navigator.serviceWorker.controller;
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (tinhaVersao && !recarregou) { recarregou = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
