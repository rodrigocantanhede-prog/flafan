# FlaFan: guia do dono do app

App de torcedor que mostra todos os jogos do Flamengo, em todas as modalidades, e onde assistir a cada um.

## Como funciona, em uma frase
A cada 2 horas, um robô do GitHub lê as fontes oficiais, junta com a **sua planilha** e publica o app. Você não precisa fazer nada no dia a dia.

## De onde vem cada informação
Cada campeonato tem uma fonte "dona", que manda em dia, horário, placar e canal:

| O quê | Fonte dona |
|---|---|
| Brasileirão, Copa do Brasil, Supercopa, base e feminino nacionais (jogos, placares, canais e tabelas) | Site da CBF |
| Carioca (profissional, feminino e base) e Copa Rio | Site da Federação do Rio (FERJ) |
| NBB (jogos, placares, canais e tabela) | Site da LNB |
| Tabela da Superliga Feminina | Site da CBV |
| Próximos jogos de futebol e vôlei, Libertadores, amistosos e link de ingresso | Site do Flamengo |
| O que nenhum site traz (Libertadores, Liga Sul-Americana, eventos olímpicos, canais que faltam) | Planilha, preenchida todo dia pelo Claude às 6h34 |

Se uma fonte sair do ar, o app continua com a última leitura boa daquela fonte.

## Onde fica cada coisa
| Arquivo / pasta | Para que serve | Você mexe? |
|---|---|---|
| Planilha "FlaFan — Jogos (painel de controle)" no seu Google Drive | Corrigir ou adicionar jogos, eventos e canais; receber as mensagens do "Fale com a gente" | **Sim, é o seu painel** |
| `config.json` | Configurações (endereço da planilha, campeonatos lidos de cada site) | Raramente |
| `index.html`, `styles.css`, `app.js` | As telas do app | Não |
| `scripts/` | O robô que lê as fontes e junta os jogos | Não |
| `data/jogos.json`, `data/classificacao.json` | Jogos e tabelas que o app mostra (gerados pelo robô) | Não |
| `data/cache-*.json`, `data/cache-planilha.csv` | Última leitura boa de cada fonte (reserva para quando uma fonte falha) | Não |
| `data/saude.json` | Quando o robô conferiu pela última vez | Não |
| `data/calendario/*.ics` | Os lembretes de agenda (gerados pelo robô) | Não |
| `contato/apps-script.gs` | Código que você cola no Google para receber as mensagens do app | Uma vez |
| `.github/workflows/atualizar-jogos.yml` | O "despertador" que roda o robô a cada 2 horas | Não |
| `marca/`, `icons/`, `escudos/` | Logo, ícones e escudos dos times | Não |

## Corrigir ou adicionar um jogo
1. Abra a planilha e vá na aba **Jogos**.
2. Para um **jogo novo**, preencha uma linha e deixe a coluna `id` vazia.
3. Para **completar um jogo que veio de um site** (por exemplo, o canal), preencha modalidade, adversário, data e só o campo que falta.
4. Para **esconder um jogo**, escreva `remover` na coluna `acao` (com o mesmo adversário e data).
5. O app atualiza em até 2 horas. Para atualizar na hora: no GitHub, vá em **Actions → Atualizar jogos → Run workflow**.

Regras que o robô segue ao juntar a planilha com os sites:
- Mesma modalidade, categoria (Sub-20, Sub-17…), dia e campeonato = mesmo jogo.
- **Dia, horário e canal de fonte oficial valem mais que os da planilha.** A planilha completa o que falta.
- Observação com cara de dúvida ("a confirmar", "uma fonte cita", "pode mudar") **não é publicada**.

A aba **Como usar** da planilha explica cada coluna.

## Como saber se está tudo funcionando
- No rodapé do app aparece **"Conferido em…"** com a hora da última rodada do robô. Se passar de 12 horas, o app mostra um aviso amarelo.
- No GitHub, em **Actions**, cada rodada aparece verde (ok) ou vermelha (falhou). Se a planilha falhar 3 vezes seguidas, a rodada fica vermelha e o GitHub manda um e-mail.
- Os avisos de cada rodada ficam no campo `avisos` de `data/jogos.json`.

## Fale com a gente (mensagens dos usuários)
1. Na planilha: **Extensões → Apps Script**, cole o conteúdo de `contato/apps-script.gs` e salve.
2. **Implantar → Nova implantação → App da Web**; "Executar como: Eu"; "Quem pode acessar: Qualquer pessoa".
3. Copie o endereço que termina em `/exec` e coloque em `CONTATO_URL`, no arquivo `app.js`.
4. As mensagens caem na aba **Mensagens** da planilha e chegam por e-mail.

## Escudos dos times
- O robô baixa os escudos sozinho (dos próprios sites oficiais e de bancos públicos) e guarda na pasta `escudos/`. Não precisa de chave.
- Se um escudo não aparecer ou vier errado, cole o link de uma imagem do escudo na coluna `escudo_adv` da planilha.
- Sem escudo, o app mostra um círculo com as iniciais do time.

## Configuração que só precisa ser feita uma vez
- **Planilha legível pelo robô:** na planilha, clique em Compartilhar → Acesso geral → "Qualquer pessoa com o link" → **Leitor**.
- A chave da API-Sports (`API_SPORTS_KEY`) é opcional: a API está desligada, porque o plano grátis não cobre a temporada atual.

## Testar no computador (opcional, para quem quiser)
```
node scripts/teste.mjs      # testes automáticos (não mexem nos dados publicados)
npx serve .                 # abre o app em http://localhost:3000
```
Atenção: rodar `node scripts/atualizar.mjs` no computador **regrava** `data/jogos.json`. Só publique o resultado se for essa a intenção.

## Esportes olímpicos (aba Eventos)
- Judô, natação, remo, ginástica etc. ficam na aba **Eventos** da planilha: competição, datas, atletas do Flamengo e resultado.
- No app aparecem no filtro "Olímpicos", com cartão próprio (nome da competição, datas, atletas e medalhas).
- Eventos de vários dias aparecem em todos os dias no calendário e entram na agenda do celular como compromisso de dia inteiro.
- A coluna **fonte** (Jogos e Eventos) mostra no app de onde veio a informação.
