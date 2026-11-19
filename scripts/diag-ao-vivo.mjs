// Diagnóstico temporário: as fontes oficiais mudam o placar DURANTE o jogo?
// Lê 4 vezes, com 4 minutos de intervalo, a página da CBF (Série A, Flamengo) e a página de futebol do site do Flamengo,
// e guarda só os trechos do jogo de hoje (sem HTML inteiro) em diagnostico/ao-vivo.txt.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dadosDaPagina, objetos } from './cbf.mjs';

const UA = 'FlaFan/1.0 (app de torcedor; github.com/rodrigocantanhede-prog/flafan)';
const baixar = async (u) => { try { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) }); return `${r.status}|` + await r.text(); } catch (e) { return `ERRO|${e.message}`; } };
const saida = [];
for (let i = 0; i < 4; i++) {
  const hora = new Date().toISOString();
  const cbf = await baixar('https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026/20016');
  const [st1, h1] = [cbf.slice(0, cbf.indexOf('|')), cbf.slice(cbf.indexOf('|') + 1)];
  let jogosCbf = [];
  try { jogosCbf = objetos(dadosDaPagina(h1), 'id_jogo').filter((o) => /athletico/i.test(JSON.stringify(o.mandante ?? '') + JSON.stringify(o.visitante ?? ''))); } catch (e) { jogosCbf = [`falha: ${e.message}`]; }
  const site = await baixar('https://www.flamengo.com.br/futebol');
  const [st2, h2] = [site.slice(0, site.indexOf('|')), site.slice(site.indexOf('|') + 1)];
  const artigos = (h2.match(/<article[^>]*data-analytics-match-date[\s\S]*?<\/article>/g) ?? []).filter((a) => /athletico/i.test(a))
    .map((a) => a.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<img[^>]*>/g, '<img>').replace(/\s+/g, ' ').slice(0, 2500));
  saida.push(`=== ${hora} | CBF ${st1} | site ${st2}`, 'CBF objetos com Athletico:', JSON.stringify(jogosCbf.map((o) => typeof o === 'string' ? o : ({ id: o.id_jogo, data: o.data, hora: o.hora, status: o.status ?? o.situacao ?? o.status_jogo, mandante: { nome: o.mandante?.nome, gols: o.mandante?.gols }, visitante: { nome: o.visitante?.nome, gols: o.visitante?.gols }, chaves: Object.keys(o) }))), 'Site do Flamengo (cartão Athletico):', ...artigos, '');
  if (i < 3) await new Promise((r) => setTimeout(r, 240000));
}
mkdirSync('diagnostico', { recursive: true });
writeFileSync('diagnostico/ao-vivo.txt', saida.join('\n'));
console.log(saida.join('\n').slice(0, 4000));
