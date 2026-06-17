// =============================================
//  MÓDULO 5 — ADIANTAMENTOS  |  Logos Concursos
// =============================================

const SENHA_ACESSO     = "logoscontabil26";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwVdqrdavJvJgaLW-0d0xypUjy-MwJHDcl79zTGrxiYNyYLBs7NvNVsmVLfUG2weAD5YA/exec";

let alunoNome  = "";
let alunoEmail = "";
let score      = 0;
let currentLancamento = 0;
let placedCards       = new Set();
let wrongAttempts     = {};
let visibleRazonetes  = [];
let razoneteSaldos    = {};
let selectedCardId    = null;

// =============================================
//  DEFINIÇÕES DOS RAZONETES
// =============================================
const razoneteDefs = {
  banco:              { label: "Banco Conta Movimento",       tipo: "ativo"             },
  caixa:              { label: "Caixa",                       tipo: "ativo"             },
  estoques:           { label: "Estoques",                    tipo: "ativo"             },
  adiantFornecedor:   { label: "Adiantamentos a Fornecedor",  tipo: "ativo"             },
  adiantClientes:     { label: "Adiantamentos de Clientes",   tipo: "passivo"           },
  adiantEmpregados:   { label: "Adiantamentos a Empregados",  tipo: "ativo"             },
  salariosAPagar:     { label: "Salários a Pagar",            tipo: "passivo"           },
  despesaSalarios:    { label: "Despesa de Salários",         tipo: "resultado-despesa" },
  receitaVendas:      { label: "Receita de Vendas",           tipo: "resultado-receita" },
  duplicatasReceber:  { label: "Duplicatas a Receber",        tipo: "ativo"             },
};

const tipoLabel = {
  "ativo":             "ATIVO",
  "passivo":           "PASSIVO",
  "pl":                "PL",
  "pl-redutora":       "PL — Redutora",
  "ativo-redutora":    "Ativo — Redutora",
  "resultado-receita": "RESULTADO — Receita",
  "resultado-despesa": "RESULTADO — Despesa",
};

// =============================================
//  LANÇAMENTOS — MÓDULO 5
// =============================================
const lancamentos = [
  // ── L1 ────────────────────────────────────
  {
    id: 1,
    descricao: "A empresa fez um <strong>adiantamento a fornecedor de R$&nbsp;3.000</strong> pela compra de produtos para venda, pago via Banco nesta data.",
    cards: [
      { id: "c1a", label: "Adiantamentos a Fornecedor", value: 3000, conta: "adiantFornecedor", lado: "debito"  },
      { id: "c1b", label: "Banco Conta Movimento",       value: 3000, conta: "banco",            lado: "credito" }
    ],
    novosRazonetes: ["banco", "adiantFornecedor"],
    explicacao: "<strong>Adiantamentos a Fornecedor</strong> é debitado — representa um <em>direito</em> da empresa (Ativo Circulante): se o fornecedor não entregar, deverá devolver o dinheiro. <strong>Banco</strong> é creditado — saída de caixa bancário."
  },

  // ── L2 (COMPOSTO) ─────────────────────────
  {
    id: 2,
    descricao: "Pela realização da <strong>compra de produtos para venda no valor de R$&nbsp;8.000</strong>: R$&nbsp;3.000 compensados pelo adiantamento já pago e R$&nbsp;5.000 pagos via Banco nesta data. <em>(Lançamento composto — 3 cartões!)</em>",
    cards: [
      { id: "c2a", label: "Estoques",                    value: 8000, conta: "estoques",          lado: "debito"  },
      { id: "c2b", label: "Banco Conta Movimento",        value: 5000, conta: "banco",             lado: "credito" },
      { id: "c2c", label: "Adiantamentos a Fornecedor",  value: 3000, conta: "adiantFornecedor",  lado: "credito" }
    ],
    novosRazonetes: ["estoques"],
    explicacao: "<strong>Estoques</strong> são debitados pelo valor total da compra (R$&nbsp;8.000). <strong>Banco</strong> é creditado por R$&nbsp;5.000 (valor pago agora). <strong>Adiantamentos a Fornecedor</strong> é creditado por R$&nbsp;3.000 — baixa do adiantamento pago anteriormente. Todo adiantamento é revertido quando o negócio se concretiza."
  },

  // ── L3 ────────────────────────────────────
  {
    id: 3,
    descricao: "A empresa recebeu um <strong>adiantamento do Cliente A no valor de R$&nbsp;5.000</strong>, pago em dinheiro (Caixa).",
    cards: [
      { id: "c3a", label: "Caixa",                      value: 5000, conta: "caixa",           lado: "debito"  },
      { id: "c3b", label: "Adiantamentos de Clientes",  value: 5000, conta: "adiantClientes",  lado: "credito" }
    ],
    novosRazonetes: ["caixa", "adiantClientes"],
    explicacao: "<strong>Caixa</strong> é debitado — entrada de dinheiro. <strong>Adiantamentos de Clientes</strong> é creditado — representa uma <em>obrigação</em> (Passivo Circulante): a empresa deverá entregar mercadorias ou devolver o dinheiro ao cliente."
  },

  // ── L4 ────────────────────────────────────
  {
    id: 4,
    descricao: "Pela <strong>venda a prazo de mercadorias no valor de R$&nbsp;12.000</strong> para o Cliente A.",
    cards: [
      { id: "c4a", label: "Duplicatas a Receber", value: 12000, conta: "duplicatasReceber", lado: "debito"  },
      { id: "c4b", label: "Receita de Vendas",    value: 12000, conta: "receitaVendas",     lado: "credito" }
    ],
    novosRazonetes: ["duplicatasReceber", "receitaVendas"],
    explicacao: "<strong>Duplicatas a Receber</strong> é debitado — direito de receber do cliente (Ativo Circulante). <strong>Receita de Vendas</strong> é creditada — receita reconhecida pelo regime de competência, aumenta o Resultado."
  },

  // ── L5 ────────────────────────────────────
  {
    id: 5,
    descricao: "Pagamento do <strong>adiantamento salarial ao empregado no valor de R$&nbsp;2.000</strong>, via Banco.",
    cards: [
      { id: "c5a", label: "Adiantamentos a Empregados", value: 2000, conta: "adiantEmpregados", lado: "debito"  },
      { id: "c5b", label: "Banco Conta Movimento",       value: 2000, conta: "banco",             lado: "credito" }
    ],
    novosRazonetes: ["adiantEmpregados"],
    explicacao: "<strong>Adiantamentos a Empregados</strong> é debitado — representa um direito da empresa (Ativo): o empregado deverá descontar esse valor no recebimento do salário. <strong>Banco</strong> é creditado — saída de dinheiro."
  },

  // ── L6 ────────────────────────────────────
  {
    id: 6,
    descricao: "<strong>Reconhecimento da despesa de salários de R$&nbsp;5.000</strong>, no mês do adiantamento, sem o pagamento do salário integral (Cenário B — pagamento no mês seguinte).",
    cards: [
      { id: "c6a", label: "Despesa de Salários", value: 5000, conta: "despesaSalarios", lado: "debito"  },
      { id: "c6b", label: "Salários a Pagar",    value: 5000, conta: "salariosAPagar",  lado: "credito" }
    ],
    novosRazonetes: ["despesaSalarios", "salariosAPagar"],
    explicacao: "<strong>Despesa de Salários</strong> é debitada — regime de competência: a despesa pertence ao mês trabalhado, mesmo que o pagamento ocorra no mês seguinte. <strong>Salários a Pagar</strong> é creditado — obrigação com os empregados (Passivo Circulante)."
  },

  // ── L7 ────────────────────────────────────
  {
    id: 7,
    descricao: "Pelo <strong>desconto do adiantamento de R$&nbsp;2.000</strong> efetuado ao empregado.",
    cards: [
      { id: "c7a", label: "Salários a Pagar",           value: 2000, conta: "salariosAPagar",   lado: "debito"  },
      { id: "c7b", label: "Adiantamentos a Empregados", value: 2000, conta: "adiantEmpregados", lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Salários a Pagar</strong> é debitado — reduz a obrigação em R$&nbsp;2.000 (saldo fica R$&nbsp;3.000). <strong>Adiantamentos a Empregados</strong> é creditado — baixa do adiantamento: o direito é compensado com a obrigação salarial. Saldo do adiantamento vai a zero."
  },

  // ── L8 ────────────────────────────────────
  {
    id: 8,
    descricao: "Pelo <strong>pagamento efetivo do saldo de salários de R$&nbsp;3.000</strong> (despesa reconhecida no mês anterior), via Caixa.",
    cards: [
      { id: "c8a", label: "Salários a Pagar", value: 3000, conta: "salariosAPagar", lado: "debito"  },
      { id: "c8b", label: "Caixa",            value: 3000, conta: "caixa",          lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Salários a Pagar</strong> é debitado — quitação da obrigação (saldo vai a zero). <strong>Caixa</strong> é creditado — saída do dinheiro que efetiva o pagamento."
  },

  // ── L9 ────────────────────────────────────
  {
    id: 9,
    descricao: "Pela <strong>baixa do adiantamento de clientes de R$&nbsp;5.000</strong>: o Cliente A realizou a compra (L4), logo o adiantamento é abatido do saldo a receber.",
    cards: [
      { id: "c9a", label: "Adiantamentos de Clientes", value: 5000, conta: "adiantClientes",   lado: "debito"  },
      { id: "c9b", label: "Duplicatas a Receber",       value: 5000, conta: "duplicatasReceber", lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Adiantamentos de Clientes</strong> é debitado — baixa da obrigação: a empresa cumpriu sua parte (entregou a mercadoria). <strong>Duplicatas a Receber</strong> é creditado — o adiantamento abate R$&nbsp;5.000 do valor a receber; o saldo restante fica R$&nbsp;7.000."
  },

  // ── L10 ───────────────────────────────────
  {
    id: 10,
    descricao: "Pelo <strong>recebimento do saldo do Cliente A de R$&nbsp;7.000</strong> via Banco (R$&nbsp;12.000 da venda menos R$&nbsp;5.000 já compensados pelo adiantamento no L9).",
    cards: [
      { id: "c10a", label: "Banco Conta Movimento", value: 7000, conta: "banco",             lado: "debito"  },
      { id: "c10b", label: "Duplicatas a Receber",  value: 7000, conta: "duplicatasReceber", lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Banco</strong> é debitado — entrada de R$&nbsp;7.000 que o cliente pagou. <strong>Duplicatas a Receber</strong> é creditado — zera o saldo restante (R$&nbsp;12.000 − R$&nbsp;5.000 do adiantamento = R$&nbsp;7.000). Ciclo completo do cliente: adiantamento (L3) → venda (L4) → baixa do adiantamento (L9) → recebimento do saldo (L10)."
  }
];

// =============================================
//  AUTENTICAÇÃO
// =============================================
function verificarSenha() {
  const senha = document.getElementById("inputSenha").value.trim();
  const erro  = document.getElementById("senhaErro");
  if (senha === SENHA_ACESSO) {
    document.getElementById("senha").style.display  = "none";
    document.getElementById("intro").style.display  = "block";
  } else {
    erro.innerText = "Senha incorreta. Tente novamente.";
    document.getElementById("inputSenha").value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("inputSenha");
  if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") verificarSenha(); });
});

// =============================================
//  TOUCH DRAG — arrastar no celular
// =============================================
let touchDragId = null;
let touchClone  = null;
let touchStartX = 0;
let touchStartY = 0;

function getRazColAt(cx, cy) {
  let found = null;
  document.querySelectorAll(".raz-col").forEach(col => {
    const r = col.getBoundingClientRect();
    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) found = col;
  });
  return found;
}

document.addEventListener("touchstart", e => {
  const card = e.target.closest(".card");
  if (!card || placedCards.has(card.id)) return;
  e.preventDefault();
  touchDragId = card.id;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  selectCard(card.id);
}, { passive: false });

document.addEventListener("touchmove", e => {
  if (!touchDragId) return;
  const t  = e.touches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (!touchClone && Math.sqrt(dx * dx + dy * dy) > 20) {
    const card = document.getElementById(touchDragId);
    if (card) {
      const cloneWidth = Math.min(card.offsetWidth, 120);
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = `
        position:fixed; pointer-events:none; opacity:0.9;
        z-index:9999; width:${cloneWidth}px;
        transform:rotate(2deg); transition:none; border-radius:8px;
        box-shadow:0 6px 20px rgba(0,0,0,0.3); font-size:11px;
      `;
      document.body.appendChild(touchClone);
    }
  }

  if (touchClone) {
    e.preventDefault();
    moveTouchClone(t);
    autoScroll(t.clientY);
    document.querySelectorAll(".raz-col").forEach(col => {
      const r = col.getBoundingClientRect();
      col.classList.toggle("dragover",
        t.clientX >= r.left && t.clientX <= r.right &&
        t.clientY >= r.top  && t.clientY <= r.bottom);
    });
  }
}, { passive: false });

document.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  document.querySelectorAll(".raz-col").forEach(col => col.classList.remove("dragover"));

  if (touchClone) {
    touchClone.remove(); touchClone = null;
    const col   = getRazColAt(t.clientX, t.clientY);
    const match = col ? col.id.match(/^raz-(.+)-(debito|credito)$/) : null;
    if (match && touchDragId) {
      dropRaz({ preventDefault: () => {}, dataTransfer: { getData: () => touchDragId } }, match[1], match[2]);
    }
    touchDragId = null;

  } else if (selectedCardId) {
    const col   = getRazColAt(t.clientX, t.clientY);
    const match = col ? col.id.match(/^raz-(.+)-(debito|credito)$/) : null;
    if (match) tapRaz(match[1], match[2]);
    touchDragId = null;

  } else {
    touchDragId = null;
  }
}, { passive: true });

// =============================================
//  CADASTRO / INÍCIO
// =============================================
function mostrarCadastro() {
  document.getElementById("intro").style.display    = "none";
  document.getElementById("registro").style.display = "block";
}

function iniciarComCadastro() {
  const nome  = document.getElementById("inputNome").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const erro  = document.getElementById("cadastroErro");
  if (!nome)                          { erro.innerText = "Por favor, informe seu nome.";         return; }
  if (!email || !email.includes("@")) { erro.innerText = "Por favor, informe um e-mail válido."; return; }
  erro.innerText = "";
  alunoNome  = nome;
  alunoEmail = email;
  document.getElementById("registro").style.display = "none";
  document.getElementById("game").style.display     = "block";
  initGame();
}

// =============================================
//  INICIALIZAÇÃO
// =============================================
function initGame() {
  currentLancamento = 0;
  placedCards       = new Set();
  wrongAttempts     = {};
  visibleRazonetes  = [];
  razoneteSaldos    = {};
  score             = 0;
  selectedCardId    = null;
  document.getElementById("razonetesGrid").innerHTML = "";
  updateScoreDisplay();
  loadLancamento();
}

function resetGame() {
  document.getElementById("game").style.display      = "none";
  document.getElementById("resultado").style.display = "none";
  document.getElementById("intro").style.display     = "block";
}

// =============================================
//  CARREGAR LANÇAMENTO
// =============================================
function loadLancamento() {
  const lan = lancamentos[currentLancamento];

  document.getElementById("missionBox").innerHTML = `
    <h2>📖 Lançamento ${lan.id} de ${lancamentos.length}</h2>
    <p>${lan.descricao}</p>
    <p style="font-size:13px;color:#555;margin-top:6px;">
      Toque (ou arraste) cada conta para o lado correto (D ou C) do razonete correspondente.
    </p>
  `;

  lan.novosRazonetes.forEach(conta => {
    if (!visibleRazonetes.includes(conta)) {
      visibleRazonetes.push(conta);
      addRazonete(conta);
    }
  });

  document.getElementById("cards").innerHTML = lan.cards.map(c => `
    <div class="card" draggable="true"
      id="${c.id}"
      data-conta="${c.conta}"
      data-lado="${c.lado}"
      data-value="${c.value}"
      data-label="${c.label}"
      onclick="selectCard('${c.id}')"
      ondragstart="drag(event)">
      <div class="card-nome">${c.label}</div>
      <div class="card-valor">R$&nbsp;${format(c.value)}</div>
    </div>
  `).join("");

  document.getElementById("feedback").innerHTML =
    "💡 Toque em uma conta e depois toque no lado <strong>D</strong> ou <strong>C</strong> do razonete correto.";
  document.getElementById("nextBtn").disabled  = true;
  document.getElementById("nextBtn").innerText =
    currentLancamento < lancamentos.length - 1 ? "➡ Próximo Lançamento" : "🏆 Ver Resultado Final";
  document.getElementById("explanation").style.display = "none";
  document.getElementById("explanation").innerHTML     = "";
}

// =============================================
//  RAZONETE
// =============================================
function addRazonete(conta) {
  const def  = razoneteDefs[conta];
  const grid = document.getElementById("razonetesGrid");
  const div  = document.createElement("div");
  div.className = "razonete razonete-new";
  div.id        = `raz-${conta}`;
  div.innerHTML = `
    <div class="raz-titulo">${def.label}</div>
    <div class="raz-tipo ${def.tipo}">${tipoLabel[def.tipo]}</div>
    <div class="raz-tabela">
      <div class="raz-header">
        <div>Débito</div>
        <div>Crédito</div>
      </div>
      <div class="raz-body">
        <div class="raz-col raz-debito" id="raz-${conta}-debito"
          ondragover="allowDrop(event)"
          ondrop="dropRaz(event,'${conta}','debito')"
          onclick="tapRaz('${conta}','debito')"
          ontouchend="razTouchEnd(event,'${conta}','debito')">
          <div class="raz-drop-hint">D</div>
        </div>
        <div class="raz-col raz-credito" id="raz-${conta}-credito"
          ondragover="allowDrop(event)"
          ondrop="dropRaz(event,'${conta}','credito')"
          onclick="tapRaz('${conta}','credito')"
          ontouchend="razTouchEnd(event,'${conta}','credito')">
          <div class="raz-drop-hint">C</div>
        </div>
      </div>
    </div>
    <div class="raz-saldo" id="raz-${conta}-saldo">Saldo: —</div>
  `;
  grid.appendChild(div);
  requestAnimationFrame(() => div.classList.remove("razonete-new"));
}

// =============================================
//  DRAG & DROP + TAP
// =============================================
function allowDrop(e) { e.preventDefault(); }
function drag(e)      { e.dataTransfer.setData("id", e.currentTarget.id); }

function selectCard(id) {
  selectedCardId = id;
  document.querySelectorAll(".card").forEach(c => c.classList.remove("card-selected"));
  const c = document.getElementById(id);
  if (c) c.classList.add("card-selected");
  document.getElementById("feedback").innerHTML =
    "👆 Agora toque no lado <strong>D</strong> ou <strong>C</strong> do razonete correto.";
}

function tapRaz(conta, lado) {
  if (!selectedCardId) return;
  dropRaz({ preventDefault: () => {}, dataTransfer: { getData: () => selectedCardId } }, conta, lado);
  selectedCardId = null;
}

function razTouchEnd(e, conta, lado) {
  if (touchClone) return;
  e.stopPropagation();
  if (selectedCardId) tapRaz(conta, lado);
}

function dropRaz(event, contaAlvo, ladoAlvo) {
  event.preventDefault();
  const id   = event.dataTransfer.getData("id");
  const card = document.getElementById(id);
  if (!card || placedCards.has(id)) return;

  const contaCard = card.dataset.conta;
  const ladoCard  = card.dataset.lado;
  const value     = Number(card.dataset.value);

  if (contaCard !== contaAlvo || ladoCard !== ladoAlvo) {
    wrongAttempts[id] = (wrongAttempts[id] || 0) + 1;
    const col = document.getElementById(`raz-${contaAlvo}-${ladoAlvo}`);
    if (col) { col.classList.add("raz-erro"); setTimeout(() => col.classList.remove("raz-erro"), 700); }
    document.getElementById("feedback").innerHTML = "❌ Não é aqui. Verifique a conta e o lado (D ou C)!";
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    return;
  }

  // ✅ CORRETO
  const erros  = wrongAttempts[id] || 0;
  const pontos = erros === 0 ? 10 : erros === 1 ? 7 : 5;
  score += pontos;
  updateScoreDisplay();
  showPontos(pontos);
  placedCards.add(id);
  card.remove();

  if (!razoneteSaldos[contaCard]) razoneteSaldos[contaCard] = { debito: 0, credito: 0 };
  razoneteSaldos[contaCard][ladoAlvo] += value;

  const col = document.getElementById(`raz-${contaCard}-${ladoAlvo}`);
  if (col) {
    const entry = document.createElement("div");
    entry.className = "raz-entry raz-entry-new";
    entry.innerHTML = `<span class="raz-val">R$&nbsp;${format(value)}</span>`;
    col.appendChild(entry);
    setTimeout(() => entry.classList.remove("raz-entry-new"), 700);
  }

  updateSaldo(contaCard);
  document.getElementById("feedback").innerHTML = "✅ Correto! Continue.";
  checkLancamentoComplete();
}

// =============================================
//  SALDO DO RAZONETE
// =============================================
function updateSaldo(conta) {
  const saldoEl = document.getElementById(`raz-${conta}-saldo`);
  if (!saldoEl) return;
  const s   = razoneteSaldos[conta] || { debito: 0, credito: 0 };
  const def = razoneteDefs[conta];
  let saldo, lado;

  if (def.tipo === "ativo" || def.tipo === "ativo-redutora" ||
      def.tipo === "pl-redutora" || def.tipo === "resultado-despesa") {
    saldo = s.debito - s.credito; lado = saldo >= 0 ? "D" : "C";
  } else {
    saldo = s.credito - s.debito; lado = saldo >= 0 ? "C" : "D";
  }
  saldoEl.innerHTML = `Saldo ${lado}: R$&nbsp;${format(Math.abs(saldo))}`;
}

// =============================================
//  VERIFICAR CONCLUSÃO DO LANÇAMENTO
// =============================================
function checkLancamentoComplete() {
  const lan       = lancamentos[currentLancamento];
  const allPlaced = lan.cards.every(c => placedCards.has(c.id));
  if (!allPlaced) return;

  document.getElementById("explanation").style.display = "block";
  document.getElementById("explanation").innerHTML     = "💡 " + lan.explicacao;
  document.getElementById("nextBtn").disabled          = false;

  if (currentLancamento >= lancamentos.length - 1) {
    document.getElementById("feedback").innerHTML = "🎉 Todos os lançamentos concluídos!";
    document.getElementById("nextBtn").innerText  = "🏆 Ver Resultado Final";
  } else {
    document.getElementById("feedback").innerHTML = "✅ Lançamento correto! Veja a explicação abaixo.";
    document.getElementById("nextBtn").innerText  = "➡ Próximo Lançamento";
  }
}

function nextLancamento() {
  currentLancamento++;
  if (currentLancamento >= lancamentos.length) { showResult(); return; }
  loadLancamento();
}

// =============================================
//  RESULTADO FINAL
// =============================================
function showResult() {
  document.getElementById("game").style.display = "none";
  const maxScore = lancamentos.reduce((sum, l) => sum + l.cards.length * 10, 0);
  const pct      = Math.round((score / maxScore) * 100);
  const stars    = pct >= 90 ? "⭐⭐⭐" : pct >= 70 ? "⭐⭐" : "⭐";

  // — Calcular DRE —
  let totalReceitas = 0;
  let totalDespesas = 0;
  let dreLinhasReceita = "";
  let dreLinhasDespesa = "";

  visibleRazonetes.forEach(conta => {
    const def = razoneteDefs[conta];
    const s   = razoneteSaldos[conta] || { debito: 0, credito: 0 };
    if (def.tipo === "resultado-receita") {
      const v = s.credito - s.debito;
      totalReceitas += v;
      dreLinhasReceita += `
        <div class="dre-linha dre-receita">
          <span>${def.label}</span>
          <span>R$&nbsp;${format(v)}</span>
        </div>`;
    }
    if (def.tipo === "resultado-despesa") {
      const v = s.debito - s.credito;
      totalDespesas += v;
      dreLinhasDespesa += `
        <div class="dre-linha dre-despesa">
          <span>${def.label}</span>
          <span>(R$&nbsp;${format(v)})</span>
        </div>`;
    }
  });

  const resultado    = totalReceitas - totalDespesas;
  const lucro        = resultado >= 0;
  const dreResultado = `
    <div class="dre-linha ${lucro ? 'dre-resultado-lucro' : 'dre-resultado-prejuizo'}">
      <span>${lucro ? "✅ Lucro do Exercício" : "❌ Prejuízo do Exercício"}</span>
      <span>R$&nbsp;${format(Math.abs(resultado))}</span>
    </div>`;

  // — Balancete —
  const balanceteRows = visibleRazonetes.map(conta => {
    const def = razoneteDefs[conta];
    const s   = razoneteSaldos[conta] || { debito: 0, credito: 0 };
    let saldo, lado;
    if (def.tipo === "ativo" || def.tipo === "ativo-redutora" ||
        def.tipo === "pl-redutora" || def.tipo === "resultado-despesa") {
      saldo = s.debito - s.credito; lado = saldo >= 0 ? "D" : "C";
    } else {
      saldo = s.credito - s.debito; lado = saldo >= 0 ? "C" : "D";
    }
    return `
      <tr class="tipo-${def.tipo}">
        <td>${def.label}</td>
        <td class="num">${s.debito  > 0 ? "R$&nbsp;" + format(s.debito)  : "—"}</td>
        <td class="num">${s.credito > 0 ? "R$&nbsp;" + format(s.credito) : "—"}</td>
        <td class="num saldo-${lado.toLowerCase()}">R$&nbsp;${format(Math.abs(saldo))} (${lado})</td>
      </tr>`;
  }).join("");

  const resultDiv = document.getElementById("resultado");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = `
    <div class="result-container">
      <h1>🏆 Resultado Final — Módulo 5</h1>
      <h2>${stars}</h2>
      <p class="result-score">Pontuação: <strong>${score} / ${maxScore} pts</strong> (${pct}%)</p>
      <p>Parabéns, <strong>${alunoNome}</strong>! Você completou o Módulo 5 — Adiantamentos! 🎉</p>

      <h3>📋 Demonstração do Resultado do Exercício (DRE)</h3>
      <div class="dre-box">
        ${dreLinhasReceita}
        <div class="dre-linha dre-total-receitas">
          <span>Total de Receitas</span>
          <span>R$&nbsp;${format(totalReceitas)}</span>
        </div>
        ${dreLinhasDespesa}
        <div class="dre-linha dre-total-despesas">
          <span>Total de Despesas</span>
          <span>(R$&nbsp;${format(totalDespesas)})</span>
        </div>
        ${dreResultado}
      </div>

      <h3>📊 Balancete de Verificação</h3>
      <div class="balancete-wrap">
        <table class="balancete">
          <thead>
            <tr>
              <th>Conta</th>
              <th>Total Débito</th>
              <th>Total Crédito</th>
              <th>Saldo Final</th>
            </tr>
          </thead>
          <tbody>${balanceteRows}</tbody>
        </table>
      </div>

      <div class="actions" style="margin-top:24px;">
        <button onclick="resetGame()">↺ Jogar Novamente</button>
      </div>
    </div>
  `;

  enviarParaSheet();
}

// =============================================
//  GOOGLE SHEETS
// =============================================
function enviarParaSheet() {
  const maxScore = lancamentos.reduce((sum, l) => sum + l.cards.length * 10, 0);
  const payload  = {
    nome:   alunoNome,
    email:  alunoEmail,
    modulo: "Módulo 5",
    pontos: score + " / " + maxScore,
    data:   new Date().toLocaleString("pt-BR")
  };
  fetch(GOOGLE_SHEET_URL, {
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

// =============================================
//  UTILITÁRIOS
// =============================================
function format(v) { return v.toLocaleString("pt-BR"); }

function showPontos(pontos) {
  const el = document.createElement("div");
  el.className = "pontos-ganhos";
  el.innerText = "+" + pontos + " pts";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function updateScoreDisplay() {
  const el = document.getElementById("scoreDisplay");
  if (el) el.innerText = score;
}

function moveTouchClone(touch) {
  if (!touchClone) return;
  touchClone.style.left = (touch.clientX - touchClone.offsetWidth  / 2) + "px";
  touchClone.style.top  = (touch.clientY - touchClone.offsetHeight / 2 - 10) + "px";
}

function autoScroll(touchY) {
  const zona = 90;
  const vel  = 10;
  if (touchY > window.innerHeight - zona) window.scrollBy(0,  vel);
  else if (touchY < zona)                 window.scrollBy(0, -vel);
}
