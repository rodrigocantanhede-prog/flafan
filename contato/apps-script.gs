// FlaFan — recebe as mensagens do formulário "Fale com a gente" do app.
// Cole este código em: planilha do FlaFan > Extensões > Apps Script. Depois: Implantar > Nova implantação > App da Web
// (Executar como: Eu · Quem pode acessar: Qualquer pessoa). Copie o endereço que termina em /exec.
//
// Cada mensagem vira uma linha na aba "Mensagens" (criada sozinha) e você recebe um e-mail.

const ABA = 'Mensagens';
const TIPOS = { sugestao: 'Sugestão de melhoria', erro: 'Erro no app', anunciar: 'Quero anunciar', outro: 'Outro assunto' };

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.site) return resposta({ ok: true });                 // campo-isca: só robôs preenchem
    const mensagem = limpa(d.mensagem, 2000, true);
    if (mensagem.length < 3) return resposta({ ok: false, erro: 'mensagem vazia' });

    // freio contra enxurrada: no máximo 40 mensagens a cada 10 minutos
    const cache = CacheService.getScriptCache();
    const n = Number(cache.get('qtd') || 0);
    if (n >= 40) return resposta({ ok: false, erro: 'muitas mensagens, tente mais tarde' });
    cache.put('qtd', String(n + 1), 600);

    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    let aba = planilha.getSheetByName(ABA);
    if (!aba) {
      aba = planilha.insertSheet(ABA);
      aba.appendRow(['recebida em', 'assunto', 'nome', 'contato', 'empresa', 'mensagem', 'aparelho', 'respondida?']);
      aba.setFrozenRows(1);
    }
    const tipo = TIPOS[d.tipo] || TIPOS.outro;
    const linha = [new Date(), tipo, limpa(d.nome, 100), limpa(d.contato, 150), limpa(d.empresa, 150), mensagem, limpa(d.aparelho, 200), ''];
    // nada que comece com = + - @ vira fórmula na planilha
    aba.appendRow(linha.map((v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v)));

    const assunto = 'FlaFan — ' + tipo + (d.nome ? ' — ' + limpa(d.nome, 60) : '');
    const corpo = [
      'Nova mensagem pelo app FlaFan', '',
      'Assunto: ' + tipo,
      'Nome: ' + (limpa(d.nome, 100) || '(não informado)'),
      'Contato: ' + (limpa(d.contato, 150) || '(não informado)'),
      d.empresa ? 'Empresa: ' + limpa(d.empresa, 150) : '',
      '', mensagem, '',
      'Todas as mensagens ficam na aba "Mensagens" da planilha.',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), assunto, corpo);

    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: 'falha ao salvar' });
  }
}

// abrir o endereço no navegador mostra só isto (serve para testar se está no ar)
function doGet() { return resposta({ ok: true, servico: 'FlaFan contato' }); }

function limpa(s, max, manterLinhas) {
  let t = String(s == null ? '' : s);
  t = manterLinhas ? t.replace(/\r/g, '') : t.replace(/[\r\n]+/g, ' ');
  return t.slice(0, max).trim();
}
function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
