// Testes rápidos da lógica de junção. Rode com: node scripts/teste.mjs
import assert from 'node:assert/strict';
import { parseCsv, mesclar, dataHoraBrasilia, normalizarModalidade, gerarIcs } from './atualizar.mjs';

assert.equal(dataHoraBrasilia('5/1/2027', '9:00'), '2027-01-05T09:00:00-03:00');
assert.equal(dataHoraBrasilia('2027-01-05', '9:00'), null);
assert.equal(normalizarModalidade('Vôlei feminino'), 'volei-feminino');
assert.equal(normalizarModalidade('Futebol sub-20'), 'base');
assert.equal(normalizarModalidade('Natação'), 'olimpicos');
assert.equal(normalizarModalidade('Futebol masculino'), 'futebol-masculino');

const auto = [{ id: 'api-futebol-masculino-1', modalidade: 'futebol-masculino', adversario: 'X', competicao: 'Brasileirão',
  inicio: '2026-12-01T21:30:00-03:00', local: '', mandante: true, transmissao: [], placar: null, status: 'agendado', fonte: 'automatica' },
  { id: 'api-futebol-masculino-2', modalidade: 'futebol-masculino', adversario: 'Y', inicio: '2026-12-05T16:00:00-03:00', transmissao: [], status: 'agendado', fonte: 'automatica' }];
const csv = `id,modalidade,adversario,competicao,data,hora,local,mando,onde_assistir,placar_fla,placar_adv,status,acao,observacao
api-futebol-masculino-1,,,,,,,,"Premiere; Globo",,,,,
api-futebol-masculino-2,,,,,,,,,,,,remover,
,Basquete,"Time, com vírgula",NBB,10/12/2026,20:00,,fora,SporTV,,,,,
,Basquete,,NBB,,,,,,,,,,`;
const { jogos, avisos } = mesclar(auto, parseCsv(csv));
assert.equal(jogos.length, 2);
assert.deepEqual(jogos[0].transmissao, ['Premiere', 'Globo']);
assert.equal(jogos[0].fonte, 'automatica+manual');
assert.equal(jogos[1].adversario, 'Time, com vírgula');
assert.equal(jogos[1].mandante, false);
assert.equal(avisos.length, 1);
const ics = gerarIcs(jogos, 'teste');
assert.match(ics, /TRIGGER:-PT1H/);
assert.match(ics, /DTSTART:20261202T003000Z/);
console.log('✓ Todos os testes passaram');
