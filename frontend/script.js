/* =============================================================================
 * Gestão Autopeças — Front-end
 *
 * SEGURANÇA (princípios mantidos):
 * - Token JWT armazenado APENAS em memória (variável JS) — nunca localStorage.
 * - Nenhum dado de cliente é persistido no navegador (localStorage/cookies).
 * - Inserção de texto sempre via textContent / createElement (nunca innerHTML).
 * - Sem eval, sem new Function, sem dependências externas, sem CDN.
 * - Erros técnicos da API nunca são exibidos ao usuário — apenas mensagens genéricas.
 * - Nenhum console.log expõe credenciais, tokens ou PII completa.
 * - Token limpo da memória ao fazer logout ou ao detectar expiração (401).
 *
 * INTEGRAÇÃO COM API:
 * - POST /api/auth/login  → autenticação real (substitui mockAuthenticate)
 * - POST /api/customers   → cadastro real (substitui simulação)
 * - API_BASE detectado automaticamente conforme o contexto de execução.
 * ===========================================================================*/

"use strict";

(function () {
  // ---------------------------------------------------------------------------
  // Configuração da API
  // ---------------------------------------------------------------------------
  // Quando o frontend é servido pelo próprio backend (Docker / produção),
  // usamos URLs relativas. Quando aberto diretamente do sistema de arquivos
  // (file://), apontamos para o servidor local.
  const API_BASE =
    window.location.protocol === "file:" ? "http://localhost:3000" : "";

  // ---------------------------------------------------------------------------
  // Helpers de DOM
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const els = {
    // Telas
    telaLogin: $("tela-login"),
    telaApp: $("tela-app"),

    // Login
    formLogin: $("form-login"),
    loginUsuario: $("login-usuario"),
    loginSenha: $("login-senha"),
    btnEntrar: $("btn-entrar"),
    mensagemLogin: $("mensagem-login"),

    // App shell
    sidebar: $("sidebar"),
    sidebarBackdrop: $("sidebar-backdrop"),
    btnMenu: $("btn-menu"),
    btnSair: $("btn-sair"),
    avisoModulo: $("aviso-modulo"),
    topbarTitulo: $("topbar-titulo"),

    // Tema (dois botões, mesmo comportamento)
    botoesTema: document.querySelectorAll("[data-btn-tema]"),

    // Cadastro de cliente
    form: $("form-cliente"),
    nome: $("nome"),
    tipoCliente: $("tipo-cliente"),
    documento: $("documento"),
    labelDocumento: $("label-documento"),
    ajudaDocumento: $("ajuda-documento"),
    telefone: $("telefone"),
    email: $("email"),
    endereco: $("endereco"),
    observacoes: $("observacoes"),
    contadorObs: $("contador-observacoes"),
    btnSalvar: $("btn-salvar"),
    btnLimpar: $("btn-limpar"),
    btnCancelar: $("btn-cancelar"),
    mensagemGlobal: $("mensagem-global"),
    erros: {
      nome: $("erro-nome"),
      tipoCliente: $("erro-tipo-cliente"),
      documento: $("erro-documento"),
      telefone: $("erro-telefone"),
      email: $("erro-email"),
      endereco: $("erro-endereco"),
      observacoes: $("erro-observacoes"),
    },
  };

  // Estado interno (em memória — não persiste entre recargas)
  let salvando = false;
  let sessaoAtiva = false;
  let jwtToken = null; // Token JWT: APENAS em memória, nunca gravado no navegador

  // =============================================================================
  // TEMA
  // localStorage guarda APENAS "light" ou "dark".
  // =============================================================================
  const CHAVE_TEMA = "gestao-autopecas:tema";

  function lerTemaSalvo() {
    try {
      const v = localStorage.getItem(CHAVE_TEMA);
      return v === "light" || v === "dark" ? v : null;
    } catch (_e) {
      return null;
    }
  }

  function salvarTema(tema) {
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch (_e) {
      // Em modo privado o set pode falhar — segue só na sessão atual.
    }
  }

  function aplicarTema(tema) {
    const t = tema === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-tema", t);
    const proximo = t === "dark" ? "claro" : "escuro";

    els.botoesTema.forEach((btn) => {
      const txt = btn.querySelector("[data-tema-texto]");
      const ico = btn.querySelector("[data-tema-icone]");
      if (txt) txt.textContent = "Tema " + proximo;
      if (ico) ico.textContent = t === "dark" ? "☀" : "◐";
      btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", "Alternar para tema " + proximo);
    });
  }

  function inicializarTema() {
    const salvo = lerTemaSalvo();
    if (salvo) {
      aplicarTema(salvo);
      return;
    }
    const prefereDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    aplicarTema(prefereDark ? "dark" : "light");
  }

  els.botoesTema.forEach((btn) => {
    btn.addEventListener("click", function () {
      const atual = document.documentElement.getAttribute("data-tema");
      const novo = atual === "dark" ? "light" : "dark";
      aplicarTema(novo);
      salvarTema(novo);
      // Importante: NÃO altera formulário, NÃO valida, NÃO envia.
    });
  });

  // =============================================================================
  // TROCA DE TELAS (login <-> app)
  // =============================================================================
  function mostrarTelaLogin() {
    els.telaApp.hidden = true;
    els.telaLogin.hidden = false;
    ocultarAvisoModulo();
    try {
      els.loginUsuario.focus();
    } catch (_e) {}
  }

  function mostrarTelaApp() {
    els.telaLogin.hidden = true;
    els.telaApp.hidden = false;
    try {
      els.nome.focus();
    } catch (_e) {}
  }

  // =============================================================================
  // LOGIN — integrado com POST /api/auth/login
  // =============================================================================
  function mostrarMensagemLogin(texto, tipo) {
    const el = els.mensagemLogin;
    el.classList.remove("tipo-sucesso", "tipo-erro");
    if (tipo === "sucesso") el.classList.add("tipo-sucesso");
    if (tipo === "erro") el.classList.add("tipo-erro");
    el.textContent = texto; // textContent — nunca innerHTML
    el.hidden = false;
  }

  function limparMensagemLogin() {
    els.mensagemLogin.textContent = "";
    els.mensagemLogin.classList.remove("tipo-sucesso", "tipo-erro");
    els.mensagemLogin.hidden = true;
  }

  els.formLogin.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    limparMensagemLogin();

    const u = (els.loginUsuario.value || "").trim();
    const s = els.loginSenha.value || "";

    if (!u || !s) {
      mostrarMensagemLogin("Usuário ou senha inválidos.", "erro");
      return;
    }

    els.btnEntrar.disabled = true;
    els.btnEntrar.textContent = "Entrando...";
    let loginSucesso = false;

    try {
      const resp = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: s }),
      });

      let data = {};
      try {
        data = await resp.json();
      } catch (_e) {
        // Resposta sem corpo JSON — tratar como erro genérico
      }

      if (resp.ok && data.token) {
        loginSucesso = true;
        jwtToken = data.token;
        sessaoAtiva = true;
        els.formLogin.reset();
        limparMensagemLogin();
        mostrarTelaApp();
        return;
      }

      // Limpa senha após falha — mantém o usuário para conveniência
      els.loginSenha.value = "";
      els.loginSenha.focus();

      if (resp.status === 429) {
        mostrarMensagemLogin(
          data.message ||
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
          "erro"
        );
        return;
      }

      // 401 ou qualquer outra falha: mensagem genérica (nunca revelar detalhes)
      mostrarMensagemLogin("Usuário ou senha inválidos.", "erro");
    } catch (_e) {
      // Falha de rede (servidor offline ou inacessível)
      mostrarMensagemLogin(
        "Não foi possível conectar ao servidor. Verifique se o sistema está ativo.",
        "erro"
      );
    } finally {
      if (!loginSucesso) {
        els.btnEntrar.disabled = false;
        els.btnEntrar.textContent = "Entrar";
      }
    }
  });

  // =============================================================================
  // SIDEBAR — navegação e logout
  // =============================================================================
  function abrirSidebar() {
    els.telaApp.classList.add("sidebar-aberto");
    els.sidebarBackdrop.hidden = false;
    els.btnMenu.setAttribute("aria-expanded", "true");
  }

  function fecharSidebar() {
    els.telaApp.classList.remove("sidebar-aberto");
    els.sidebarBackdrop.hidden = true;
    els.btnMenu.setAttribute("aria-expanded", "false");
  }

  els.btnMenu.addEventListener("click", function () {
    if (els.telaApp.classList.contains("sidebar-aberto")) {
      fecharSidebar();
    } else {
      abrirSidebar();
    }
  });

  els.sidebarBackdrop.addEventListener("click", fecharSidebar);

  // Nomes amigáveis dos módulos
  const NOMES_MODULOS = {
    produtos: "Produtos",
    estoque: "Estoque",
    vendas: "Vendas",
    relatorios: "Relatórios",
    configuracoes: "Configurações",
  };

  function mostrarAvisoModulo(modulo) {
    const nome = NOMES_MODULOS[modulo] || "Este módulo";
    els.avisoModulo.textContent = nome + " ainda não disponível nesta etapa.";
    els.avisoModulo.hidden = false;
  }

  function ocultarAvisoModulo() {
    els.avisoModulo.textContent = "";
    els.avisoModulo.hidden = true;
  }

  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.addEventListener("click", function () {
      const modulo = item.getAttribute("data-modulo");
      if (!modulo) return;

      if (modulo === "clientes") {
        ocultarAvisoModulo();
        fecharSidebar();
        try {
          els.nome.focus();
        } catch (_e) {}
        return;
      }

      if (modulo === "sair") {
        encerrarSessao();
        return;
      }

      // Módulos futuros: aviso amigável
      mostrarAvisoModulo(modulo);
      fecharSidebar();
    });
  });

  function encerrarSessao() {
    sessaoAtiva = false;
    jwtToken = null; // Remove token da memória imediatamente
    resetarFormularioCompletamente();
    limparMensagemGlobal();
    ocultarAvisoModulo();
    fecharSidebar();
    els.formLogin.reset();
    limparMensagemLogin();
    mostrarTelaLogin();
  }

  // =============================================================================
  // CADASTRO DE CLIENTE
  // =============================================================================

  // ---------- Mensagem global ----------
  function mostrarMensagemGlobal(texto, tipo) {
    const el = els.mensagemGlobal;
    el.classList.remove("tipo-sucesso", "tipo-erro");
    if (tipo === "sucesso") el.classList.add("tipo-sucesso");
    if (tipo === "erro") el.classList.add("tipo-erro");
    el.textContent = texto;
    el.hidden = false;
  }

  function limparMensagemGlobal() {
    const el = els.mensagemGlobal;
    el.textContent = "";
    el.classList.remove("tipo-sucesso", "tipo-erro");
    el.hidden = true;
  }

  // ---------- Erros por campo ----------
  function definirErro(campoKey, mensagem) {
    const erroEl = els.erros[campoKey];
    if (!erroEl) return;
    erroEl.textContent = mensagem || "";
    const container = erroEl.closest(".campo");
    if (container) container.classList.toggle("campo-erro", Boolean(mensagem));
    const input = els[campoKey];
    if (input) {
      if (mensagem) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function limparTodosOsErros() {
    Object.keys(els.erros).forEach((k) => definirErro(k, ""));
  }

  // ---------- Máscaras ----------
  function somenteDigitos(s) {
    return (s || "").replace(/\D+/g, "");
  }

  function mascararCPF(d) {
    d = d.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.replace(/(\d{3})(\d+)/, "$1.$2");
    if (d.length <= 9) return d.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, "$1.$2.$3-$4");
  }

  function mascararCNPJ(d) {
    d = d.slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return d.replace(/(\d{2})(\d+)/, "$1.$2");
    if (d.length <= 8) return d.replace(/(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
    if (d.length <= 12)
      return d.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
    return d.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/,
      "$1.$2.$3/$4-$5"
    );
  }

  function mascararTelefone(d) {
    d = d.slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) {
      return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    }
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  // ---------- Validações de UX (a barreira de segurança real é o backend) ----------
  function validarCPF(cpf) {
    const d = somenteDigitos(cpf);
    if (d.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(d)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(d[i], 10) * (10 - i);
    let dv1 = 11 - (soma % 11);
    if (dv1 >= 10) dv1 = 0;
    if (dv1 !== parseInt(d[9], 10)) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(d[i], 10) * (11 - i);
    let dv2 = 11 - (soma % 11);
    if (dv2 >= 10) dv2 = 0;
    return dv2 === parseInt(d[10], 10);
  }

  function validarCNPJ(cnpj) {
    const d = somenteDigitos(cnpj);
    if (d.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(d)) return false;
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < 12; i++) soma += parseInt(d[i], 10) * pesos1[i];
    let dv1 = soma % 11;
    dv1 = dv1 < 2 ? 0 : 11 - dv1;
    if (dv1 !== parseInt(d[12], 10)) return false;
    soma = 0;
    for (let i = 0; i < 13; i++) soma += parseInt(d[i], 10) * pesos2[i];
    let dv2 = soma % 11;
    dv2 = dv2 < 2 ? 0 : 11 - dv2;
    return dv2 === parseInt(d[13], 10);
  }

  function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return re.test(email);
  }

  function validarTelefone(tel) {
    const d = somenteDigitos(tel);
    if (d.length !== 10 && d.length !== 11) return false;
    if (d.length === 11 && d[2] !== "9") return false;
    const ddd = parseInt(d.slice(0, 2), 10);
    if (ddd < 11 || ddd > 99) return false;
    return true;
  }

  // ---------- Eventos de input / máscara dinâmica ----------
  els.tipoCliente.addEventListener("change", function () {
    const tipo = els.tipoCliente.value;
    els.documento.value = "";
    definirErro("documento", "");

    if (tipo === "PF") {
      els.labelDocumento.textContent = "CPF";
      els.documento.disabled = false;
      els.documento.maxLength = 14;
      els.documento.placeholder = "000.000.000-00";
      els.ajudaDocumento.textContent =
        "Digite apenas números, a máscara é aplicada.";
    } else if (tipo === "PJ") {
      els.labelDocumento.textContent = "CNPJ";
      els.documento.disabled = false;
      els.documento.maxLength = 18;
      els.documento.placeholder = "00.000.000/0000-00";
      els.ajudaDocumento.textContent =
        "Digite apenas números, a máscara é aplicada.";
    } else {
      els.labelDocumento.textContent = "CPF / CNPJ";
      els.documento.disabled = true;
      els.documento.placeholder = "Selecione o tipo de cliente";
      els.ajudaDocumento.textContent =
        "A máscara muda conforme o tipo de cliente.";
    }
    definirErro("tipoCliente", "");
  });

  els.documento.addEventListener("input", function () {
    const tipo = els.tipoCliente.value;
    const d = somenteDigitos(els.documento.value);
    if (tipo === "PF") els.documento.value = mascararCPF(d);
    else if (tipo === "PJ") els.documento.value = mascararCNPJ(d);
    else els.documento.value = "";
  });

  els.telefone.addEventListener("input", function () {
    els.telefone.value = mascararTelefone(somenteDigitos(els.telefone.value));
  });

  function atualizarContadorObservacoes() {
    const v = els.observacoes.value || "";
    const len = v.length;
    els.contadorObs.textContent = len + "/500";
    els.contadorObs.classList.toggle("contador-limite", len >= 500);
  }

  els.observacoes.addEventListener("input", atualizarContadorObservacoes);

  // ---------- Validação completa de UX ----------
  function validarFormulario() {
    limparTodosOsErros();
    let primeiroInvalido = null;

    const marcar = (campoKey, mensagem) => {
      definirErro(campoKey, mensagem);
      if (!primeiroInvalido) primeiroInvalido = els[campoKey];
    };

    const nome = (els.nome.value || "").trim();
    if (!nome) marcar("nome", "Informe o nome ou razão social.");
    else if (nome.length < 3)
      marcar("nome", "Nome deve ter no mínimo 3 caracteres.");
    else if (nome.length > 120)
      marcar("nome", "Nome deve ter no máximo 120 caracteres.");

    const tipo = els.tipoCliente.value;
    if (tipo !== "PF" && tipo !== "PJ")
      marcar("tipoCliente", "Selecione o tipo de cliente.");

    const doc = (els.documento.value || "").trim();
    if (!doc) {
      marcar(
        "documento",
        tipo === "PJ" ? "Informe o CNPJ." : "Informe o CPF."
      );
    } else if (tipo === "PF" && !validarCPF(doc)) {
      marcar("documento", "CPF inválido.");
    } else if (tipo === "PJ" && !validarCNPJ(doc)) {
      marcar("documento", "CNPJ inválido.");
    } else if (tipo !== "PF" && tipo !== "PJ") {
      marcar("documento", "Selecione o tipo de cliente antes do documento.");
    }

    const tel = (els.telefone.value || "").trim();
    if (!tel) marcar("telefone", "Informe o telefone.");
    else if (!validarTelefone(tel))
      marcar("telefone", "Telefone inválido. Use DDD + número.");
    else if (tel.length > 15)
      marcar("telefone", "Telefone excede o tamanho permitido.");

    const email = (els.email.value || "").trim();
    if (email) {
      if (email.length > 120)
        marcar("email", "E-mail deve ter no máximo 120 caracteres.");
      else if (!validarEmail(email)) marcar("email", "E-mail inválido.");
    }

    const endereco = (els.endereco.value || "").trim();
    if (endereco && endereco.length > 180)
      marcar("endereco", "Endereço deve ter no máximo 180 caracteres.");

    const obs = els.observacoes.value || "";
    if (obs.length > 500)
      marcar("observacoes", "Observações devem ter no máximo 500 caracteres.");

    if (primeiroInvalido) {
      try {
        primeiroInvalido.focus({ preventScroll: false });
      } catch (_e) {
        primeiroInvalido.focus();
      }
      return false;
    }
    return true;
  }

  // ---------- Payload (mesmo contrato esperado pelo backend) ----------
  function buildCustomerPayload() {
    const tipo = els.tipoCliente.value;
    if (tipo !== "PF" && tipo !== "PJ") return null;

    return {
      name:         (els.nome.value || "").trim(),
      customerType: tipo,
      document:     somenteDigitos(els.documento.value),
      phone:        somenteDigitos(els.telefone.value),
      email:        (els.email.value || "").trim() || null,
      address:      (els.endereco.value || "").trim() || null,
      notes:        (els.observacoes.value || "").trim() || null,
    };
  }

  // ---------- Estado "salvando" ----------
  function setSalvando(ativo) {
    salvando = ativo;
    els.btnSalvar.disabled = ativo;
    els.btnLimpar.disabled = ativo;
    els.btnCancelar.disabled = ativo;
    els.btnSalvar.textContent = ativo ? "Salvando..." : "Salvar Cliente";
    if (ativo) els.btnSalvar.setAttribute("aria-busy", "true");
    else els.btnSalvar.removeAttribute("aria-busy");
  }

  // ---------- Submit — integrado com POST /api/customers ----------
  els.form.addEventListener("submit", async function (ev) {
    ev.preventDefault();

    if (!sessaoAtiva || !jwtToken) {
      // Sessão inválida — força novo login sem expor detalhes
      encerrarSessao();
      return;
    }

    if (salvando) return;
    limparMensagemGlobal();

    if (!validarFormulario()) {
      mostrarMensagemGlobal(
        "Não foi possível salvar. Verifique os campos destacados.",
        "erro"
      );
      return;
    }

    const payload = buildCustomerPayload();
    if (!payload) {
      definirErro("tipoCliente", "Selecione o tipo de cliente.");
      mostrarMensagemGlobal(
        "Não foi possível salvar. Verifique os campos destacados.",
        "erro"
      );
      return;
    }

    setSalvando(true);

    try {
      const resp = await fetch(API_BASE + "/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwtToken,
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await resp.json();
      } catch (_e) {
        // Resposta sem corpo JSON — tratar como erro genérico
      }

      if (resp.status === 201) {
        mostrarMensagemGlobal("Cliente cadastrado com sucesso.", "sucesso");
        els.form.reset();
        atualizarContadorObservacoes();
        els.labelDocumento.textContent = "CPF / CNPJ";
        els.documento.disabled = true;
        els.documento.placeholder = "Selecione o tipo de cliente";
        els.ajudaDocumento.textContent =
          "A máscara muda conforme o tipo de cliente.";
        els.nome.focus();
        return;
      }

      if (resp.status === 401) {
        // Token expirado ou inválido — força novo login
        jwtToken = null;
        sessaoAtiva = false;
        mostrarTelaLogin();
        return;
      }

      if (resp.status === 409) {
        definirErro("documento", "CPF/CNPJ já cadastrado no sistema.");
        mostrarMensagemGlobal(
          "Não foi possível salvar. CPF/CNPJ já cadastrado.",
          "erro"
        );
        return;
      }

      // 400 com mensagem do servidor ou erro genérico
      mostrarMensagemGlobal(
        (resp.status === 400 && data.message) ? data.message
          : "Não foi possível salvar. Tente novamente.",
        "erro"
      );
    } catch (_e) {
      // Falha de rede (servidor offline ou inacessível)
      mostrarMensagemGlobal(
        "Não foi possível conectar ao servidor. Verifique se o sistema está ativo.",
        "erro"
      );
    } finally {
      setSalvando(false);
    }
  });

  // ---------- Limpar / Cancelar ----------
  function formularioTemDados() {
    return (
      (els.nome.value || "").trim() !== "" ||
      els.tipoCliente.value !== "" ||
      (els.documento.value || "").trim() !== "" ||
      (els.telefone.value || "").trim() !== "" ||
      (els.email.value || "").trim() !== "" ||
      (els.endereco.value || "").trim() !== "" ||
      (els.observacoes.value || "").trim() !== ""
    );
  }

  function resetarFormularioCompletamente() {
    els.form.reset();
    limparTodosOsErros();
    limparMensagemGlobal();
    atualizarContadorObservacoes();
    els.labelDocumento.textContent = "CPF / CNPJ";
    els.documento.disabled = true;
    els.documento.placeholder = "Selecione o tipo de cliente";
    els.ajudaDocumento.textContent =
      "A máscara muda conforme o tipo de cliente.";
  }

  els.btnLimpar.addEventListener("click", function () {
    if (salvando) return;
    if (formularioTemDados()) {
      const ok = window.confirm(
        "Deseja realmente limpar todos os campos do formulário?"
      );
      if (!ok) return;
    }
    resetarFormularioCompletamente();
    try {
      els.nome.focus();
    } catch (_e) {}
  });

  els.btnCancelar.addEventListener("click", function () {
    if (salvando) return;
    if (formularioTemDados()) {
      const ok = window.confirm(
        "Deseja cancelar o cadastro? Os dados digitados serão descartados."
      );
      if (!ok) return;
    }
    resetarFormularioCompletamente();
    // Não redireciona — listagem ainda não existe.
  });

  // =============================================================================
  // BOOTSTRAP
  // Sempre exibe a tela de login ao carregar. Sessão NÃO persiste entre recargas.
  // =============================================================================
  inicializarTema();
  resetarFormularioCompletamente();
  mostrarTelaLogin();
})();
