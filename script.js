/* =============================================================================
 * Gestão Autopeças — Front-end (login protótipo + cadastro de cliente)
 *
 * SEGURANÇA (princípios aplicados aqui):
 * - Nenhum dado de cliente é persistido em localStorage/sessionStorage/cookies.
 * - Nenhum dado de login (usuário/senha) é persistido em local algum.
 * - localStorage é usado APENAS para a preferência visual de tema.
 * - Nenhum console.log expõe PII completa ou credenciais.
 * - Inserção de texto sempre via textContent / createElement (sem innerHTML).
 * - Sem eval, sem new Function, sem dependências externas, sem CDN.
 * - Sem fetch / XMLHttpRequest. Nenhuma chamada de rede é feita.
 * - As validações abaixo existem apenas para UX. A validação real DEVE ser
 *   refeita no back-end/API quando essa camada existir.
 *
 * IMPORTANTE — login:
 * - Esta tela de login é PROTÓTIPO FRONT-END, não autenticação real.
 * - A autenticação real (senha com hash forte, sessão segura, permissões,
 *   logs, auditoria, bloqueio por tentativas reais, MFA etc.) deverá ser
 *   implementada no back-end no futuro.
 * - As credenciais usadas aqui são apenas para fluxo visual de desenvolvimento.
 *   NÃO USE em produção.
 * - Clientes da loja NÃO têm login. Login é apenas para uso interno.
 * ===========================================================================*/

"use strict";

(function () {
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

  // Estado interno (em memória — não persiste)
  let salvando = false;
  let sessaoAtiva = false; // sessão provisória, apenas em memória

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
    // Limpa o aviso de "em breve" do app, se estiver aberto.
    ocultarAvisoModulo();
    // Foco no primeiro campo do login.
    try {
      els.loginUsuario.focus();
    } catch (_e) {}
  }

  function mostrarTelaApp() {
    els.telaLogin.hidden = true;
    els.telaApp.hidden = false;
    // Foco no campo Nome do cadastro.
    try {
      els.nome.focus();
    } catch (_e) {}
  }

  // =============================================================================
  // LOGIN (PROTÓTIPO — NÃO É AUTENTICAÇÃO REAL)
  // =============================================================================

  /*
   * Credenciais provisórias APENAS para protótipo de fluxo visual.
   * NÃO use em produção. Quando o back-end existir:
   *   - estas credenciais serão removidas;
   *   - usuário/senha serão validados no servidor;
   *   - senhas serão guardadas com hash forte (ex.: argon2/bcrypt);
   *   - haverá controle de sessão segura, permissões, logs e auditoria.
   */
  const CREDENCIAIS_PROTOTIPO = Object.freeze({
    usuario: "admin",
    senha: "admin-demo-123",
  });

  /*
   * mockAuthenticate — função temporária de autenticação para protótipo.
   * NÃO use em produção. Comparações no front-end nunca substituem
   * autenticação real no back-end.
   */
  function mockAuthenticate(usuario, senha) {
    const u = typeof usuario === "string" ? usuario.trim() : "";
    const s = typeof senha === "string" ? senha : "";
    // Comparação direta: aceitável APENAS por ser protótipo local.
    // Em produção, esta verificação deverá ocorrer no servidor.
    return (
      u === CREDENCIAIS_PROTOTIPO.usuario &&
      s === CREDENCIAIS_PROTOTIPO.senha
    );
  }
  // Não expomos mockAuthenticate em window — evitar uso indevido.

  // Proteção básica de UX contra muitas tentativas (apenas em memória).
  // NÃO é segurança real: usuário pode recarregar a página.
  // Proteção real (rate limiting, lockout) deverá vir do back-end.
  const LOGIN_MAX_TENTATIVAS = 5;
  const LOGIN_BLOQUEIO_MS = 15000;
  let loginTentativas = 0;
  let loginBloqueadoAte = 0;

  function loginEstaBloqueado() {
    return Date.now() < loginBloqueadoAte;
  }

  function segundosAteDesbloqueio() {
    return Math.max(0, Math.ceil((loginBloqueadoAte - Date.now()) / 1000));
  }

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

  function bloquearBotaoEntrarTemporariamente() {
    els.btnEntrar.disabled = true;
    const desbloquear = () => {
      els.btnEntrar.disabled = false;
      els.btnEntrar.textContent = "Entrar";
    };
    const tick = () => {
      const restante = segundosAteDesbloqueio();
      if (restante <= 0) {
        desbloquear();
        return;
      }
      els.btnEntrar.textContent = "Aguarde " + restante + "s";
      window.setTimeout(tick, 500);
    };
    tick();
  }

  els.formLogin.addEventListener("submit", function (ev) {
    ev.preventDefault();
    limparMensagemLogin();

    if (loginEstaBloqueado()) {
      mostrarMensagemLogin(
        "Muitas tentativas. Aguarde alguns segundos e tente novamente.",
        "erro"
      );
      return;
    }

    const u = (els.loginUsuario.value || "").trim();
    const s = els.loginSenha.value || "";

    if (!u || !s) {
      // Mensagem genérica — não revela qual campo falhou.
      mostrarMensagemLogin("Usuário ou senha inválidos.", "erro");
      return;
    }

    let autenticado = false;
    try {
      autenticado = mockAuthenticate(u, s);
    } catch (_e) {
      // Erro genérico ao usuário. Detalhes técnicos nunca aparecem.
      mostrarMensagemLogin(
        "Não foi possível concluir o acesso. Tente novamente.",
        "erro"
      );
      return;
    }

    if (autenticado) {
      // Sucesso: estabelece sessão provisória APENAS em memória.
      sessaoAtiva = true;
      loginTentativas = 0;
      loginBloqueadoAte = 0;
      // Limpa campos sensíveis da tela antes de mostrar o app.
      els.formLogin.reset();
      limparMensagemLogin();
      mostrarTelaApp();
      return;
    }

    // Falha: contabiliza tentativa e, se exceder, bloqueia o botão.
    loginTentativas++;
    if (loginTentativas >= LOGIN_MAX_TENTATIVAS) {
      loginBloqueadoAte = Date.now() + LOGIN_BLOQUEIO_MS;
      loginTentativas = 0;
      bloquearBotaoEntrarTemporariamente();
      mostrarMensagemLogin(
        "Muitas tentativas. Aguarde alguns segundos e tente novamente.",
        "erro"
      );
      return;
    }

    // Limpa a senha após cada falha. Mantém o usuário para conveniência.
    els.loginSenha.value = "";
    els.loginSenha.focus();
    mostrarMensagemLogin("Usuário ou senha inválidos.", "erro");
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
    // textContent — nunca innerHTML.
    els.avisoModulo.textContent =
      nome + " ainda não disponível nesta etapa.";
    els.avisoModulo.hidden = false;
  }

  function ocultarAvisoModulo() {
    els.avisoModulo.textContent = "";
    els.avisoModulo.hidden = true;
  }

  // Listeners para itens da sidebar
  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.addEventListener("click", function () {
      const modulo = item.getAttribute("data-modulo");
      if (!modulo) return;

      if (modulo === "clientes") {
        // Único módulo ativo nesta etapa.
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

      // Módulos futuros: aviso amigável, sem redirecionar.
      mostrarAvisoModulo(modulo);
      fecharSidebar();
    });
  });

  function encerrarSessao() {
    sessaoAtiva = false;
    // Limpa o estado visual completamente antes de voltar para o login.
    resetarFormularioCompletamente();
    limparMensagemGlobal();
    ocultarAvisoModulo();
    fecharSidebar();
    // Limpa também os campos do login.
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

  // ---------- Validações ----------
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
    // Regex pragmática para UX. Validação real ocorre no back-end.
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
    // Limpa documento ao trocar tipo, evitando inconsistência (PF com CNPJ etc.)
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

  // ---------- Validação completa ----------
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

  // ---------- Payload ----------
  function buildCustomerPayload() {
    const nome = (els.nome.value || "").trim();
    const tipo = els.tipoCliente.value;
    const doc = somenteDigitos(els.documento.value);
    const tel = somenteDigitos(els.telefone.value);
    const email = (els.email.value || "").trim();
    const endereco = (els.endereco.value || "").trim();
    const obs = (els.observacoes.value || "").trim();

    return {
      name: nome,
      customerType: tipo === "PJ" ? "PJ" : "PF",
      document: doc,
      phone: tel,
      email: email ? email : null,
      address: endereco ? endereco : null,
      notes: obs ? obs : null,
      active: true,
    };
  }
  // Exposição apenas para conferência manual em desenvolvimento.
  // Não é invocada espontaneamente.
  window.buildCustomerPayload = buildCustomerPayload;

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

  // ---------- Submit ----------
  els.form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!sessaoAtiva) {
      // Defesa básica: se a sessão provisória não estiver ativa, volta ao login.
      // (Lembrando que isso não substitui autenticação real no back-end.)
      mostrarTelaLogin();
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

    // Monta o payload em memória local. NÃO há envio para API/banco nesta etapa.
    const _payload = buildCustomerPayload(); // eslint-disable-line no-unused-vars

    setSalvando(true);

    // Simulação intencional de latência. Nenhuma chamada real é feita.
    window.setTimeout(function () {
      try {
        // Mensagem genérica — não revela PII completa.
        mostrarMensagemGlobal(
          "Cliente validado com sucesso. Pronto para futura integração com o banco de dados.",
          "sucesso"
        );
        els.form.reset();
        atualizarContadorObservacoes();
        els.labelDocumento.textContent = "CPF / CNPJ";
        els.documento.disabled = true;
        els.documento.placeholder = "Selecione o tipo de cliente";
        els.ajudaDocumento.textContent =
          "A máscara muda conforme o tipo de cliente.";
        els.nome.focus();
      } catch (_e) {
        // Mensagem amigável — nunca exibir erro técnico ao usuário.
        mostrarMensagemGlobal(
          "Ocorreu um erro inesperado. Tente novamente em instantes.",
          "erro"
        );
      } finally {
        setSalvando(false);
      }
    }, 700);
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
  // Ao carregar a página, sempre exibimos a tela de login.
  // Recarregar = voltar ao login (sessão NÃO persiste).
  // =============================================================================
  inicializarTema();
  atualizarContadorObservacoes();
  mostrarTelaLogin();
})();
