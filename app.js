// FlaFan — telas do app.
const FUSO = 'America/Sao_Paulo';
const MODALIDADES = {
  'futebol-masculino': { nome: 'Futebol', curto: 'Futebol', cor: '#E3141B' },
  'futebol-feminino': { nome: 'Futebol feminino', curto: 'Fut. feminino', cor: '#F472B6' },
  'base': { nome: 'Categorias de base', curto: 'Base', cor: '#FB923C' },
  'basquete': { nome: 'Basquete', curto: 'Basquete', cor: '#F59E0B' },
  'volei-masculino': { nome: 'Vôlei masculino', curto: 'Vôlei masc.', cor: '#38BDF8' },
  'volei-feminino': { nome: 'Vôlei feminino', curto: 'Vôlei fem.', cor: '#A78BFA' },
  'futsal': { nome: 'Futsal', curto: 'Futsal', cor: '#4ADE80' },
  'olimpicos': { nome: 'Esportes olímpicos', curto: 'Olímpicos', cor: '#2DD4BF' },
};
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
  const opcoes = [['todas', 'Todas'], ...Object.entries(MODALIDADES).filter(([k]) => presentes.has(k)).map(([k, v]) => [k, v.curto])];
  if (!opcoes.some(([k]) => k === estado.filtro)) estado.filtro = 'todas';
  $('#filtros').innerHTML = opcoes.map(([k, nome]) =>
    `<button class="chip" data-filtro="${k}" aria-pressed="${k === estado.filtro}">${esc(nome)}</button>`).join('');
}

function cartao(j, destaque = false) {
  const m = MODALIDADES[j.modalidade] ?? { nome: j.modalidade, cor: '#E3141B' };
  const data = new Date(j.inicio);
  const fla = `<span class="fla-nome">Flamengo</span>`;
  const adv = `<span>${esc(j.adversario)}</span>`;
  const confronto = j.mandante === false ? `${adv}<span class="vs">x</span>${fla}` : `${fla}<span class="vs">x</span>${adv}`;
  let confrontoHtml = `<div class="confronto">${confronto}</div>`;
  let selo = '';
  if (j.placar) {
    const { flamengo: f, adversario: a } = j.placar;
    const linhas = j.mandante === false ? [['adv', j.adversario, a], ['fla', 'Flamengo', f]] : [['fla', 'Flamengo', f], ['adv', j.adversario, a]];
    const venceu = (n) => (n === Math.max(f, a) && f !== a ? 'venc' : '');
    confrontoHtml = `<div class="placar-grade">${linhas.map(([t, nome, p]) =>
      `<span class="${t === 'fla' ? 'fla-nome' : ''} ${venceu(p)}">${esc(nome)}</span><span class="pts ${venceu(p)}">${p}</span>`).join('')}</div>`;
    if (j.status === 'encerrado') {
      const r = f > a ? ['v', 'Vitória'] : f < a ? ['d', 'Derrota'] : ['e', 'Empate'];
      selo = `<span class="resultado ${r[0]}">${r[1]}</span>`;
    }
  }
  const status = { 'ao-vivo': 'AO VIVO', adiado: 'ADIADO', cancelado: 'CANCELADO' }[j.status];
  const canais = j.transmissao?.length
    ? j.transmissao.map((c) => `<span class="canal ${GRATIS.test(c) ? 'gratis' : ''}">${esc(c)}</span>`).join('')
    : `<span class="canal confirmar">A confirmar</span>`;
  const mostraOnde = j.status !== 'encerrado';
  return `<article class="jogo ${destaque ? 'destaque' : ''}" style="--cor:${m.cor}">
    <div class="jogo-cab">
      <span class="tag">${esc(m.nome)}${j.categoria ? ' ' + esc(j.categoria) : ''}</span>
      ${j.competicao ? `<span class="ponto">${esc(j.competicao)}</span>` : ''}
      ${status ? `<span class="status ${j.status}">${status}</span>` : ''}${selo}
      <span class="hora">${j.semHora ? 'Horário a definir' : fHora.format(data)}</span>
    </div>
    ${confrontoHtml}
    ${j.local ? `<div class="local">📍 ${esc(j.local)}</div>` : ''}
    ${mostraOnde ? `<div class="onde"><span class="onde-rotulo">📺 Onde assistir</span>${canais}</div>` : ''}
    ${j.observacao ? `<div class="obs">${esc(j.observacao)}</div>` : ''}
    ${destaque ? `<div class="contagem">⏱ ${j.semHora ? 'Horário ainda não definido' : contagem(data)} · ${esc(rotuloDia(data))}</div>` : ''}
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
    `<label><input type="checkbox" value="${k}" ${prefs.includes(k) ? 'checked' : ''}> ${esc(v.curto)}</label>`).join('');
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
