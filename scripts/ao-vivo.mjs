// Modo "ao vivo": diz se há jogo do Flamengo acontecendo agora (de 5 min antes até 2h45 depois do início).
//   node scripts/ao-vivo.mjs            -> sai com código 0 se há jogo agora, 1 se não há
//   node scripts/ao-vivo.mjs --mudou    -> sai com código 0 se placar/status mudaram em data/jogos.json desde o último commit
// Usado por .github/workflows/placar-ao-vivo.yml, que roda o robô a cada poucos minutos enquanto o jogo acontece.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ANTES = 5 * 60e3, DEPOIS = 2.75 * 3600e3;

export function jogosAgora(jogos, agora = Date.now()) {
  return (jogos ?? []).filter((j) => {
    if (j.tipo === 'evento' || j.semHora || j.status === 'cancelado' || j.status === 'adiado') return false;
    if (j.status === 'encerrado' && j.placar) return false;
    const t = new Date(j.inicio).getTime();
    return agora >= t - ANTES && agora <= t + DEPOIS;
  });
}

// o que importa para o torcedor durante o jogo (ignora horários de conferência, calendários etc.)
// (chave = modalidade + dia + adversário, porque o id muda quando uma fonte oscila entre uma rodada e outra)
export const resumoAoVivo = (dados) => JSON.stringify((dados?.jogos ?? []).filter((j) => j.tipo !== 'evento')
  .map((j) => `${j.modalidade}|${j.inicio.slice(0, 10)}|${j.adversario}|${j.status}|${j.placar?.flamengo ?? ''}x${j.placar?.adversario ?? ''}`).sort());

if (import.meta.url === `file://${process.argv[1]}`) {
  const atual = JSON.parse(readFileSync('data/jogos.json', 'utf8'));
  if (process.argv.includes('--mudou')) {
    let antes = null;
    try { antes = JSON.parse(execSync('git show HEAD:data/jogos.json', { encoding: 'utf8', maxBuffer: 64e6 })); } catch { /* sem versão anterior */ }
    process.exit(!antes || resumoAoVivo(antes) !== resumoAoVivo(atual) ? 0 : 1);
  }
  const agora = jogosAgora(atual.jogos);
  for (const j of agora) console.log(`Ao vivo agora: Flamengo x ${j.adversario} (${j.competicao}) — ${j.placar ? `${j.placar.flamengo} x ${j.placar.adversario}` : 'sem placar ainda'}`);
  process.exit(agora.length ? 0 : 1);
}
