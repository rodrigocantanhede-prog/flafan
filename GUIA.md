# FlaFan: guia do dono do app

App de torcedor que mostra todos os jogos do Flamengo, em todas as modalidades, e onde assistir a cada um.

## Como funciona, em uma frase
Todo dia de madrugada, um robô do GitHub busca os jogos na fonte automática (API-Sports), junta com a **sua planilha** e atualiza o app. A planilha sempre tem a palavra final.

## Onde fica cada coisa
| Arquivo / pasta | Para que serve | Você mexe? |
|---|---|---|
| Planilha "FlaFan — Jogos (painel de controle)" no seu Google Drive | Corrigir ou adicionar jogos e preencher "onde assistir" | **Sim, é o seu painel** |
| `config.json` | Configurações (endereço da planilha, times da API) | Raramente |
| `index.html`, `styles.css`, `app.js` | As telas do app | Não |
| `scripts/atualizar.mjs` | O robô que busca e junta os jogos | Não |
| `data/jogos.json` | Lista de jogos que o app mostra (gerada pelo robô) | Não |
| `data/calendario/*.ics` | Os lembretes de agenda (gerados pelo robô) | Não |
| `.github/workflows/atualizar-jogos.yml` | O "despertador" que roda o robô todo dia | Não |
| `marca/` e `icons/` | Logo e ícones | Não |

## Corrigir ou adicionar um jogo
1. Abra a planilha e vá na aba **Jogos**.
2. Para um **jogo novo**, preencha uma linha e deixe a coluna `id` vazia.
3. Para **corrigir um jogo automático**, coloque o `id` dele e só os campos que quer mudar (por exemplo, `onde_assistir`).
4. Para **esconder um jogo**, escreva `remover` na coluna `acao`.
5. O app atualiza na madrugada seguinte. Para atualizar na hora: no GitHub, vá em **Actions → Atualizar jogos → Run workflow**.

A aba **Como usar** da planilha explica cada coluna.

## Escudos dos times
- O robô baixa os escudos sozinho pela API-Sports (precisa da chave configurada) e guarda na pasta `escudos/`.
- Se um escudo não aparecer ou vier errado, cole o link de uma imagem do escudo na coluna `escudo_adv` da planilha.
- Para trocar um escudo errado: apague o arquivo dele na pasta `escudos/` do GitHub e preencha `escudo_adv`.
- Sem escudo, o app mostra um círculo com as iniciais do time.

## Configuração que só precisa ser feita uma vez
- **Planilha legível pelo robô:** na planilha, clique em Compartilhar → Acesso geral → "Qualquer pessoa com o link" → **Leitor**.
- **Chave da API-Sports:** crie uma conta grátis em dashboard.api-football.com. Depois, no GitHub, vá em Settings → Secrets and variables → Actions → New repository secret, com o nome `API_SPORTS_KEY` e a sua chave como valor.

## Testar no computador (opcional, para quem quiser)
```
node scripts/teste.mjs                                                         # testes automáticos
node scripts/atualizar.mjs --sem-api --planilha data/exemplo-planilha.csv --exemplo   # gera dados de exemplo
npx serve .                                                                    # abre o app em http://localhost:3000
```
