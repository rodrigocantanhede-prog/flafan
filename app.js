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
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  tv: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M8 21.5h8M9 2.5l3 3 3-3"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  f: '<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V22M8.5 18.5h7"/>',
  m: '<circle cx="10" cy="14" r="5.5"/><path d="M14 10l6.5-6.5M15 3.5h5.5V9"/>',
};
const icone = (nome, cls = 'ic') => ICONES[nome]
  ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome]}</svg>` : '';
const seloModalidade = (m) => `${icone(m.icone)}${m.sexo ? icone(m.sexo, 'ic ic-sexo') : ''}`;

const GRATIS = /(globo\b|tv globo|ge ?tv|youtube|tv brasil|cazé|caze|record\b|band\b|sbt\b|flatv|fla tv)/i;

// ---------- memória do aparelho (só conveniência; se falhar, o app funciona igual) ----------
const guardar = (k, v) => { try { localStorage.setItem('flafan:' + k, JSON.stringify(v)); } catch {} };
const lembrar = (k, padrao) => { try { const v = localStorage.getItem('flafan:' + k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } };

const estado = {
  aba: 'proximos',
  filtro: lembrar('filtro', 'todas'),
  jogos: [],
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
  const presentes = new Set(estado.jogos.map((j) => j.modalidade));
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
function escudo(nome, fla, url) {
  const reserva = fla ? '<span class="escudo fla"></span>' : `<span class="escudo adv">${esc(sigla(nome))}</span>`;
  if (!url) return `<span class="escudo-box falhou" aria-hidden="true">${reserva}</span>`;
  return `<span class="escudo-box" aria-hidden="true"><img class="escudo-img" src="${esc(url)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('falhou')">${reserva}</span>`;
}

function contagemCaixas(data) {
  const ms = Math.max(0, data - Date.now());
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  const caixa = (n, r) => `<span class="cx"><b>${String(n).padStart(2, '0')}</b><small>${r}</small></span>`;
  return `<div class="contagem" aria-label="${esc(contagem(data))}">${caixa(d, d === 1 ? 'dia' : 'dias')}${caixa(h, 'horas')}${caixa(m, 'min')}</div>`;
}

function cartao(j, destaque = false) {
  const m = MODALIDADES[j.modalidade] ?? { nome: j.modalidade, cor: '#E3141B' };
  const data = new Date(j.inicio);
  const flaCasa = j.mandante !== false;
  const timeFla = { nome: 'Flamengo', fla: true, url: estado.escudoFla }, timeAdv = { nome: j.adversario, fla: false, url: j.escudoAdv };
  const [esq, dir] = flaCasa ? [timeFla, timeAdv] : [timeAdv, timeFla];
  const lado = (t, pos) => `<div class="time ${pos} ${t.fla ? 'eh-fla' : ''}">${escudo(t.nome, t.fla, t.url)}<span class="time-nome">${esc(t.nome)}</span></div>`;

  let centro, selo = '';
  if (j.placar) {
    const { flamengo: f, adversario: a } = j.placar;
    const [pe, pd] = flaCasa ? [f, a] : [a, f];
    centro = `<div class="placar"><span>${pe}</span><i>–</i><span>${pd}</span></div><div class="centro-legenda">${j.status === 'encerrado' ? 'Encerrado' : 'Parcial'}</div>`;
    if (j.status === 'encerrado') {
      const r = f > a ? ['v', 'Vitória'] : f < a ? ['d', 'Derrota'] : ['e', 'Empate'];
      selo = `<span class="resultado ${r[0]}">${r[1]}</span>`;
    }
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

  return `<article class="jogo ${destaque ? 'destaque' : ''}" style="--cor:${m.cor}">
    ${destaque ? `<div class="destaque-rotulo">Próximo jogo</div>` : ''}
    <header class="jogo-cab">
      <span class="tag">${m.icone ? seloModalidade(m) : ''}<span>${esc(m.nome)}${j.categoria ? ' ' + esc(j.categoria) : ''}</span></span>
      ${status ? `<span class="status ${j.status}">${status}</span>` : ''}${selo}
    </header>
    ${j.competicao ? `<div class="competicao">${esc(j.competicao)}</div>` : ''}
    <div class="confronto">${lado(esq, 'esq')}<div class="centro">${centro}</div>${lado(dir, 'dir')}</div>
    ${destaque && !j.semHora && !j.placar ? contagemCaixas(data) : ''}
    <div class="detalhes">
      ${j.local ? `<div class="linha">${icone('pin')}<span>${esc(j.local)}</span></div>` : ''}
      ${mostraOnde ? `<div class="linha onde">${icone('tv')}<div class="canais">${canais}</div></div>` : ''}
    </div>
    ${j.observacao ? `<div class="obs">${esc(j.observacao)}</div>` : ''}
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
    const k = chaveDia(new Date(j.inicio));
    if (!porDia.has(k)) porDia.set(k, []);
    porDia.get(k).push(j);
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
  const lista = sel.length ? sel.map((j) => cartao(j)).join('') : '<p class="vazio pequeno">Nenhum jogo neste dia.</p>';

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

function desenhar() {
  const agora = Date.now();
  const DUR = 3 * 3600e3; // um jogo "ainda não acabou" até 3h depois do início, se não tiver resultado
  const filtrados = estado.jogos.filter((j) => estado.filtro === 'todas' || j.modalidade === estado.filtro);
  const proximos = filtrados.filter((j) => j.status !== 'encerrado' && new Date(j.inicio).getTime() + (j.semHora ? 864e5 : DUR) > agora && j.status !== 'cancelado');
  const resultados = filtrados.filter((j) => j.status === 'encerrado' || (j.placar && new Date(j.inicio) < agora)).reverse();
  if (estado.aba === 'calendario') return desenharCalendario(filtrados);
  const lista = estado.aba === 'proximos' ? proximos : resultados;

  if (!lista.length) {
    $('#lista').innerHTML = `<p class="vazio">${estado.aba === 'proximos' ? 'Nenhum jogo marcado por enquanto.' : 'Nenhum resultado recente.'}</p>`;
    return;
  }
  let html = '', diaAtual = '';
  lista.forEach((j, i) => {
    const d = new Date(j.inicio);
    const rot = rotuloDia(d);
    if (rot !== diaAtual) { html += `<h2 class="dia">${esc(rot)}</h2>`; diaAtual = rot; }
    html += cartao(j, estado.aba === 'proximos' && i === 0);
  });
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
  const aba = e.target.closest('[data-aba]');
  if (aba) {
    estado.aba = aba.dataset.aba;
    document.querySelectorAll('.aba').forEach((b) => { const on = b === aba; b.classList.toggle('ativa', on); b.setAttribute('aria-selected', on); });
    desenhar();
  }
  const navMes = e.target.closest('[data-mes]');
  if (navMes) {
    let { ano, mes } = estado.mes;
    mes += Number(navMes.dataset.mes);
    if (mes < 0) { mes = 11; ano--; } else if (mes > 11) { mes = 0; ano++; }
    estado.mes = { ano, mes };
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
$('#ajustes').addEventListener('click', (e) => { if (e.target === $('#ajustes')) $('#ajustes').close(); });

// ---------- início ----------
async function carregar() {
  try {
    const r = await fetch('data/jogos.json', { cache: 'no-cache' });
    const dados = await r.json();
    estado.jogos = dados.jogos ?? [];
    estado.escudoFla = dados.escudoFlamengo ?? null;
    $('#aviso-exemplo').hidden = !dados.exemplo;
    if (dados.atualizadoEm) $('#atualizado').textContent = 'Atualizado em ' + fDataHora.format(new Date(dados.atualizadoEm));
  } catch {
    $('#lista').innerHTML = '<p class="vazio">Não foi possível carregar os jogos. Verifique sua internet.</p>';
    return;
  }
  montarFiltros(); desenhar();
}
montarAjustes();
carregar();
setInterval(desenhar, 60e3); // atualiza a contagem regressiva

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
