/* global document, window, setTimeout, clearTimeout, URLSearchParams */
'use strict';

(function () {
  // ────────────────────────────────────────────────────────────────────────────
  // AUTH — token apenas em memória, nunca em storage
  // ────────────────────────────────────────────────────────────────────────────
  const Auth = (() => {
    let _token = null;
    let _user  = null;

    function setSession(token, user) { _token = token; _user = user; }
    function clearSession()          { _token = null;  _user = null; }
    function getToken()              { return _token; }
    function getUser()               { return _user; }
    function isLoggedIn()            { return !!_token; }
    return { setSession, clearSession, getToken, getUser, isLoggedIn };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // API — fetch autenticado, interceptor global de 401
  // ────────────────────────────────────────────────────────────────────────────
  const Api = (() => {
    const BASE = '/api';

    async function req(method, path, body) {
      const headers = { 'Content-Type': 'application/json' };
      const token   = Auth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const opts = { method, headers, credentials: 'omit' };
      if (body !== undefined) opts.body = JSON.stringify(body);

      let res;
      try {
        res = await fetch(`${BASE}${path}`, opts);
      } catch (_) {
        throw new Error('Falha de conexão com o servidor.');
      }

      if (res.status === 401) {
        Auth.clearSession();
        Router.irPara('login');
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      let data;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = { message: await res.text() };
      }

      if (!res.ok) {
        throw Object.assign(new Error(data.message || 'Erro desconhecido.'), { status: res.status, data });
      }
      return data;
    }

    return {
      get:    (path)         => req('GET',    path),
      post:   (path, body)   => req('POST',   path, body),
      put:    (path, body)   => req('PUT',    path, body),
      del:    (path)         => req('DELETE', path),
    };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // TOAST — notificações de interface
  // ────────────────────────────────────────────────────────────────────────────
  const Toast = (() => {
    let _container;

    function _ensureContainer() {
      if (!_container) {
        _container = document.createElement('div');
        _container.className = 'toast-container';
        _container.setAttribute('aria-live', 'polite');
        _container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(_container);
      }
      return _container;
    }

    function show(msg, tipo, duracao) {
      if (duracao === undefined) duracao = 4000;
      if (!tipo) tipo = 'info';
      const c = _ensureContainer();
      const t = document.createElement('div');
      t.className = `toast toast-${tipo}`;
      t.setAttribute('role', 'status');
      t.textContent = msg;
      c.appendChild(t);
      requestAnimationFrame(() => t.classList.add('toast-visivel'));
      setTimeout(() => {
        t.classList.remove('toast-visivel');
        t.addEventListener('transitionend', () => t.remove(), { once: true });
      }, duracao);
    }

    return {
      sucesso: (m, d) => show(m, 'sucesso', d),
      erro:    (m, d) => show(m, 'erro',    d),
      info:    (m, d) => show(m, 'info',    d),
      aviso:   (m, d) => show(m, 'aviso',   d),
    };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // MODAL — diálogo de confirmação
  // ────────────────────────────────────────────────────────────────────────────
  const Modal = (() => {
    function confirmar(opts) {
      const titulo     = opts.titulo     || 'Confirmar';
      const corpo      = opts.corpo      || '';
      const textoBotao = opts.textoBotao || 'Confirmar';
      const tipo       = opts.tipo       || 'danger';

      return new Promise(function (resolve) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'modal-titulo');

        const btnClass = tipo === 'danger' ? 'btn-danger' : 'btn-primario';
        overlay.innerHTML = `
          <div class="modal">
            <header class="modal-header">
              <h2 id="modal-titulo" class="modal-titulo">${_esc(titulo)}</h2>
            </header>
            <div class="modal-corpo">${_esc(corpo)}</div>
            <footer class="modal-footer">
              <button type="button" class="btn btn-ghost modal-btn-cancelar">Cancelar</button>
              <button type="button" class="btn ${btnClass} modal-btn-confirmar">${_esc(textoBotao)}</button>
            </footer>
          </div>`;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('modal-overlay-visivel'));

        function fechar(resultado) {
          overlay.classList.remove('modal-overlay-visivel');
          overlay.addEventListener('transitionend', function () {
            overlay.remove();
            resolve(resultado);
          }, { once: true });
        }

        overlay.querySelector('.modal-btn-cancelar').addEventListener('click',  function () { fechar(false); });
        overlay.querySelector('.modal-btn-confirmar').addEventListener('click', function () { fechar(true); });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) fechar(false); });
        overlay.querySelector('.modal-btn-cancelar').focus();
      });
    }
    return { confirmar: confirmar };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // TEMA
  // ────────────────────────────────────────────────────────────────────────────
  const Tema = (() => {
    const CHAVE = 'tema';
    let _atual;

    function _aplicar(tema) {
      _atual = tema;
      document.documentElement.setAttribute('data-tema', tema);
      try { localStorage.setItem(CHAVE, tema); } catch (_) {}
      document.querySelectorAll('[data-btn-tema]').forEach(function (btn) {
        const icone  = btn.querySelector('[data-tema-icone]');
        const texto  = btn.querySelector('[data-tema-texto]');
        const escuro = tema === 'dark';
        btn.setAttribute('aria-pressed', escuro ? 'true' : 'false');
        if (icone) icone.textContent = escuro ? '◑' : '◐';
        if (texto) texto.textContent = escuro ? 'Tema escuro' : 'Tema claro';
      });
    }

    function init() {
      let salvo = 'dark';
      try { salvo = localStorage.getItem(CHAVE) || 'dark'; } catch (_) {}
      _aplicar(salvo);
    }

    function alternar() { _aplicar(_atual === 'dark' ? 'light' : 'dark'); }
    return { init: init, alternar: alternar, atual: function () { return _atual; } };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // ROUTER — controla visibilidade dos módulos
  // ────────────────────────────────────────────────────────────────────────────
  const Router = (() => {
    const MODULOS = {
      clientes:   { secao: 'modulo-clientes',   titulo: 'Clientes'   },
      produtos:   { secao: 'modulo-produtos',   titulo: 'Produtos'   },
      estoque:    { secao: 'modulo-estoque',    titulo: 'Estoque'    },
      vendas:     { secao: 'modulo-vendas',     titulo: 'Vendas'     },
      relatorios: { secao: 'modulo-relatorios', titulo: 'Relatórios' },
    };

    function irPara(modulo) {
      if (modulo === 'login') {
        document.getElementById('tela-login').hidden = false;
        document.getElementById('tela-app').hidden   = true;
        return;
      }
      document.getElementById('tela-login').hidden = true;
      document.getElementById('tela-app').hidden   = false;
      _ativarModulo(modulo);
    }

    function _ativarModulo(modulo) {
      if (!MODULOS[modulo]) return;
      Object.keys(MODULOS).forEach(function (k) {
        const el  = document.getElementById(MODULOS[k].secao);
        const btn = document.querySelector('.sidebar-item[data-modulo="' + k + '"]');
        if (el)  el.hidden = (k !== modulo);
        if (btn) btn.setAttribute('aria-current', k === modulo ? 'page' : 'false');
      });
      const titulo = document.getElementById('topbar-titulo');
      if (titulo) titulo.textContent = MODULOS[modulo].titulo;

      if (modulo === 'clientes')   Clientes.carregar();
      if (modulo === 'produtos')   Produtos.carregar();
      if (modulo === 'estoque')    Estoque.carregar();
      if (modulo === 'vendas')     Vendas.inicializar();
      if (modulo === 'relatorios') Relatorios.carregar();
    }

    return { irPara: irPara };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────────────────────
  function _esc(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _brl(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function _debounce(fn, ms) {
    let timer;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function _msgEl(id, msg, tipo) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = msg;
    el.className   = 'mensagem-global mensagem-' + (tipo || 'erro');
    el.hidden      = false;
  }

  function _spinnerHTML() {
    return '<div class="spinner" aria-label="Carregando..."></div>';
  }

  function _emptyHTML(msg) {
    return '<div class="empty-state"><div class="empty-state-icone">📭</div><p class="empty-state-desc">' + _esc(msg) + '</p></div>';
  }

  function _setBtnLoading(btn, sim) {
    if (!btn) return;
    btn.disabled = sim;
    if (sim) {
      btn.dataset.textoOriginal = btn.textContent;
      btn.textContent = 'Aguarde…';
    } else if (btn.dataset.textoOriginal) {
      btn.textContent = btn.dataset.textoOriginal;
    }
  }

  function _limparErrosCampos(form) {
    form.querySelectorAll('.erro-campo').forEach(function (el) { el.textContent = ''; });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MÓDULO: CLIENTES
  // ────────────────────────────────────────────────────────────────────────────
  const Clientes = (function () {
    var _pag       = 1;
    var _busca     = '';
    var _editandoId = null;
    var POR_PAG    = 15;

    function carregar(pag) {
      if (pag) _pag = pag;
      _renderLista();
    }

    async function _renderLista() {
      const cont = document.getElementById('tabela-clientes-container');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const params = new URLSearchParams({ page: _pag, limit: POR_PAG });
        if (_busca) params.set('search', _busca);
        const resp = await Api.get('/customers?' + params.toString());
        const customers = resp.customers || [];
        const total     = resp.total     || 0;
        cont.innerHTML = customers.length
          ? _tabelaClientes(customers)
          : _emptyHTML('Nenhum cliente encontrado.');
        _renderPaginacao(total);
      } catch (e) {
        cont.innerHTML = _emptyHTML(e.message);
      }
    }

    function _tabelaClientes(lista) {
      const linhas = lista.map(function (c) {
        return '<tr>' +
          '<td>' + _esc(c.name) + '</td>' +
          '<td>' + _esc(c.customerType === 'PJ' ? 'Jurídica' : 'Física') + '</td>' +
          '<td>' + _esc(c.document || '—') + '</td>' +
          '<td>' + _esc(c.phone || '—') + '</td>' +
          '<td><span class="badge ' + (c.active ? 'badge-ativo' : 'badge-inativo') + '">' + (c.active ? 'Ativo' : 'Inativo') + '</span></td>' +
          '<td>' +
            '<button class="btn btn-ghost btn-sm" data-acao="editar" data-id="' + c.id + '">Editar</button> ' +
            '<button class="btn btn-danger btn-sm" data-acao="excluir" data-id="' + c.id + '" data-nome="' + _esc(c.name) + '">Inativar</button>' +
          '</td>' +
          '</tr>';
      }).join('');
      return '<table class="tabela"><thead><tr><th>Nome</th><th>Tipo</th><th>Documento</th><th>Telefone</th><th>Status</th><th>Ações</th></tr></thead><tbody>' + linhas + '</tbody></table>';
    }

    function _renderPaginacao(total) {
      const cont = document.getElementById('paginacao-clientes');
      if (!cont) return;
      const totalPags = Math.ceil(total / POR_PAG);
      if (totalPags <= 1) { cont.innerHTML = ''; return; }
      let btns = [];
      if (_pag > 1)         btns.push('<button class="paginacao-btn" data-p="' + (_pag - 1) + '">← Anterior</button>');
      btns.push('<span class="paginacao-info">' + _pag + ' / ' + totalPags + '</span>');
      if (_pag < totalPags) btns.push('<button class="paginacao-btn" data-p="' + (_pag + 1) + '">Próximo →</button>');
      cont.innerHTML = btns.join('');
    }

    function _abrirForm(cliente) {
      _editandoId = cliente ? cliente.id : null;
      const form = document.getElementById('form-cliente');
      if (!form) return;
      // Garante que o botão está ativo mesmo se aberto durante carregamento anterior
      var saveBtn = document.getElementById('btn-salvar-cliente');
      if (saveBtn) { saveBtn.disabled = false; if (saveBtn.dataset.textoOriginal) saveBtn.textContent = saveBtn.dataset.textoOriginal; }
      form.reset();
      _limparErrosCampos(form);
      _msgEl('mensagem-cliente-form', '', '');
      document.getElementById('titulo-form-cliente').textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';
      document.getElementById('card-cliente-form').hidden = false;
      document.getElementById('card-cliente-form').scrollIntoView({ behavior: 'smooth' });
      if (cliente) {
        form.querySelector('#nome').value         = cliente.name        || '';
        form.querySelector('#tipo-cliente').value = cliente.customerType || '';
        form.querySelector('#documento').value    = cliente.document    || '';
        form.querySelector('#telefone').value     = cliente.phone       || '';
        form.querySelector('#email').value        = cliente.email       || '';
        form.querySelector('#endereco').value     = cliente.address     || '';
        form.querySelector('#observacoes').value  = cliente.notes       || '';
        _atualizarDocumento(cliente.customerType);
      } else {
        form.querySelector('#tipo-cliente').value = '';
        _atualizarDocumento('');
      }
    }

    function _fecharForm() {
      document.getElementById('card-cliente-form').hidden = true;
      _editandoId = null;
      document.getElementById('form-cliente').reset();
    }

    function _atualizarDocumento(tipo) {
      const docInput = document.getElementById('documento');
      const docLabel = document.getElementById('label-documento');
      if (!docInput) return;
      if (!tipo) { docInput.disabled = true; return; }
      docInput.disabled = false;
      if (tipo === 'PF') {
        if (docLabel) docLabel.textContent = 'CPF';
        docInput.placeholder = '000.000.000-00';
        docInput.maxLength   = 14;
      } else {
        if (docLabel) docLabel.textContent = 'CNPJ';
        docInput.placeholder = '00.000.000/0000-00';
        docInput.maxLength   = 18;
      }
    }

    async function _salvarCliente(e) {
      e.preventDefault();
      _limparErrosCampos(e.target);
      const btn = document.getElementById('btn-salvar-cliente');
      _setBtnLoading(btn, true);
      _msgEl('mensagem-cliente-form', '', '');
      const form = e.target;
      const payload = {
        name:        form.querySelector('#nome').value.trim(),
        customerType: form.querySelector('#tipo-cliente').value,
        document:    form.querySelector('#documento').value.trim(),
        phone:       form.querySelector('#telefone').value.trim(),
        email:       form.querySelector('#email').value.trim()    || null,
        address:     form.querySelector('#endereco').value.trim() || null,
        notes:       form.querySelector('#observacoes').value.trim() || null,
      };
      try {
        if (_editandoId) {
          await Api.put('/customers/' + _editandoId, payload);
          Toast.sucesso('Cliente atualizado.');
        } else {
          await Api.post('/customers', payload);
          Toast.sucesso('Cliente cadastrado.');
        }
        _fecharForm();
        await _renderLista();
      } catch (err) {
        if (err.status === 422 && err.data && err.data.errors) {
          err.data.errors.forEach(function (e) {
            const el = document.getElementById('erro-' + e.field);
            if (el) el.textContent = e.message;
          });
          _msgEl('mensagem-cliente-form', 'Corrija os campos destacados.', 'erro');
        } else {
          _msgEl('mensagem-cliente-form', err.message, 'erro');
        }
      } finally {
        _setBtnLoading(btn, false);
      }
    }

    async function _excluirCliente(id, nome) {
      const ok = await Modal.confirmar({
        titulo: 'Inativar cliente', corpo: 'Inativar "' + nome + '"?', textoBotao: 'Inativar', tipo: 'danger',
      });
      if (!ok) return;
      try {
        await Api.del('/customers/' + id);
        Toast.sucesso('Cliente inativado.');
        await _renderLista();
      } catch (e) { Toast.erro(e.message); }
    }

    async function _editarCliente(id) {
      try {
        const c = await Api.get('/customers/' + id);
        _abrirForm(c);
      } catch (e) { Toast.erro(e.message); }
    }

    function _bindEventos() {
      const btnNovo = document.getElementById('btn-novo-cliente');
      if (btnNovo) btnNovo.addEventListener('click', function () { _abrirForm(null); });

      const btnCancelar = document.getElementById('btn-cancelar-cliente');
      if (btnCancelar) btnCancelar.addEventListener('click', _fecharForm);

      const form = document.getElementById('form-cliente');
      if (form) form.addEventListener('submit', _salvarCliente);

      const tipo = document.getElementById('tipo-cliente');
      if (tipo) tipo.addEventListener('change', function (e) { _atualizarDocumento(e.target.value); });

      const obs = document.getElementById('observacoes');
      const cnt = document.getElementById('contador-observacoes');
      if (obs && cnt) obs.addEventListener('input', function () { cnt.textContent = obs.value.length + '/500'; });

      const busca = document.getElementById('busca-clientes');
      if (busca) {
        busca.addEventListener('input', _debounce(function (e) {
          _busca = e.target.value.trim(); _pag = 1; _renderLista();
        }, 350));
      }

      const modulo = document.getElementById('modulo-clientes');
      if (modulo) {
        modulo.addEventListener('click', async function (e) {
          const btn = e.target.closest('[data-acao]');
          if (btn && btn.dataset.acao === 'editar')  await _editarCliente(btn.dataset.id);
          if (btn && btn.dataset.acao === 'excluir') await _excluirCliente(btn.dataset.id, btn.dataset.nome);
          const btnPag = e.target.closest('[data-p]');
          if (btnPag) carregar(Number(btnPag.dataset.p));
        });
      }
    }

    return { init: _bindEventos, carregar: carregar };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // MÓDULO: PRODUTOS
  // ────────────────────────────────────────────────────────────────────────────
  const Produtos = (function () {
    var _pag        = 1;
    var _busca      = '';
    var _editandoId = null;
    var POR_PAG     = 15;

    function carregar(pag) {
      if (pag) _pag = pag;
      _renderLista();
    }

    async function _renderLista() {
      const cont = document.getElementById('tabela-produtos-container');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const params = new URLSearchParams({ page: _pag, limit: POR_PAG });
        if (_busca) params.set('search', _busca);
        const resp = await Api.get('/products?' + params.toString());
        const products = resp.products || [];
        const total    = resp.total    || 0;
        cont.innerHTML = products.length ? _tabelaProdutos(products) : _emptyHTML('Nenhum produto encontrado.');
        _renderPaginacao(total);
      } catch (e) { cont.innerHTML = _emptyHTML(e.message); }
    }

    function _tabelaProdutos(lista) {
      const linhas = lista.map(function (p) {
        return '<tr>' +
          '<td>' + _esc(p.sku) + '</td>' +
          '<td>' + _esc(p.name) + '</td>' +
          '<td>' + _esc((p.category && p.category.name) || '—') + '</td>' +
          '<td>' + _brl(p.salePrice) + '</td>' +
          '<td class="' + (p.currentStock <= p.minStock ? 'texto-alerta' : '') + '">' + p.currentStock + ' ' + _esc(p.unit || 'un') + '</td>' +
          '<td><span class="badge ' + (p.active ? 'badge-ativo' : 'badge-inativo') + '">' + (p.active ? 'Ativo' : 'Inativo') + '</span></td>' +
          '<td>' +
            '<button class="btn btn-ghost btn-sm" data-acao="editar" data-id="' + p.id + '">Editar</button> ' +
            '<button class="btn btn-danger btn-sm" data-acao="excluir" data-id="' + p.id + '" data-nome="' + _esc(p.name) + '">Inativar</button>' +
          '</td></tr>';
      }).join('');
      return '<table class="tabela"><thead><tr><th>SKU</th><th>Nome</th><th>Categoria</th><th>Preço venda</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>' + linhas + '</tbody></table>';
    }

    function _renderPaginacao(total) {
      const cont = document.getElementById('paginacao-produtos');
      if (!cont) return;
      const totalPags = Math.ceil(total / POR_PAG);
      if (totalPags <= 1) { cont.innerHTML = ''; return; }
      let btns = [];
      if (_pag > 1)         btns.push('<button class="paginacao-btn" data-pp="' + (_pag - 1) + '">← Anterior</button>');
      btns.push('<span class="paginacao-info">' + _pag + ' / ' + totalPags + '</span>');
      if (_pag < totalPags) btns.push('<button class="paginacao-btn" data-pp="' + (_pag + 1) + '">Próximo →</button>');
      cont.innerHTML = btns.join('');
    }

    async function _carregarCategorias() {
      const sel = document.getElementById('prod-categoria');
      if (!sel) return;
      try {
        const resp = await Api.get('/categories');
        const cats = resp.categories || [];
        const html = cats.map(function (c) { return '<option value="' + c.id + '">' + _esc(c.name) + '</option>'; }).join('');
        sel.innerHTML = '<option value="">Sem categoria</option>' + html;
      } catch (_) {}
    }

    async function _abrirForm(produto) {
      _editandoId = produto ? produto.id : null;
      const form = document.getElementById('form-produto');
      if (!form) return;
      // Garante que o botão está ativo mesmo se aberto durante carregamento anterior
      var saveBtn = document.getElementById('btn-salvar-produto');
      if (saveBtn) { saveBtn.disabled = false; if (saveBtn.dataset.textoOriginal) saveBtn.textContent = saveBtn.dataset.textoOriginal; }
      form.reset();
      _limparErrosCampos(form);
      _msgEl('mensagem-produto-form', '', '');
      document.getElementById('titulo-form-produto').textContent = produto ? 'Editar Produto' : 'Novo Produto';
      await _carregarCategorias();
      if (produto) {
        document.getElementById('prod-nome').value       = produto.name       || '';
        document.getElementById('prod-sku').value        = produto.sku        || '';
        document.getElementById('prod-categoria').value  = produto.categoryId || '';
        document.getElementById('prod-unit').value       = produto.unit       || 'un';
        document.getElementById('prod-custo').value      = produto.costPrice  || 0;
        document.getElementById('prod-venda').value      = produto.salePrice  || 0;
        document.getElementById('prod-min-stock').value  = produto.minStock   || 0;
      }
      document.getElementById('card-produto-form').hidden = false;
      document.getElementById('card-produto-form').scrollIntoView({ behavior: 'smooth' });
    }

    function _fecharForm() {
      document.getElementById('card-produto-form').hidden = true;
      _editandoId = null;
    }

    async function _salvar(e) {
      e.preventDefault();
      _limparErrosCampos(e.target);
      const btn = document.getElementById('btn-salvar-produto');
      _setBtnLoading(btn, true);
      const payload = {
        name:       document.getElementById('prod-nome').value.trim(),
        sku:        document.getElementById('prod-sku').value.trim().toUpperCase(),
        categoryId: document.getElementById('prod-categoria').value || null,
        unit:       document.getElementById('prod-unit').value,
        costPrice:  parseFloat(document.getElementById('prod-custo').value) || 0,
        salePrice:  parseFloat(document.getElementById('prod-venda').value) || 0,
        minStock:   parseInt(document.getElementById('prod-min-stock').value,  10) || 0,
      };
      try {
        if (_editandoId) {
          await Api.put('/products/' + _editandoId, payload);
          Toast.sucesso('Produto atualizado.');
        } else {
          await Api.post('/products', payload);
          Toast.sucesso('Produto cadastrado.');
        }
        _fecharForm();
        await _renderLista();
      } catch (err) {
        if (err.status === 422 && err.data && err.data.errors) {
          err.data.errors.forEach(function (e) {
            const el = document.getElementById('erro-prod-' + e.field);
            if (el) el.textContent = e.message;
          });
          _msgEl('mensagem-produto-form', 'Corrija os campos destacados.', 'erro');
        } else {
          _msgEl('mensagem-produto-form', err.message, 'erro');
        }
      } finally {
        _setBtnLoading(btn, false);
      }
    }

    async function _excluir(id, nome) {
      const ok = await Modal.confirmar({ titulo: 'Inativar produto', corpo: 'Inativar "' + nome + '"?', textoBotao: 'Inativar', tipo: 'danger' });
      if (!ok) return;
      try { await Api.del('/products/' + id); Toast.sucesso('Produto inativado.'); await _renderLista(); }
      catch (e) { Toast.erro(e.message); }
    }

    async function _editar(id) {
      try { const p = await Api.get('/products/' + id); await _abrirForm(p); }
      catch (e) { Toast.erro(e.message); }
    }

    function _bindEventos() {
      const btnNovo = document.getElementById('btn-novo-produto');
      if (btnNovo) btnNovo.addEventListener('click', function () { _abrirForm(null); });

      const btnCancelar = document.getElementById('btn-cancelar-produto');
      if (btnCancelar) btnCancelar.addEventListener('click', _fecharForm);

      const form = document.getElementById('form-produto');
      if (form) form.addEventListener('submit', _salvar);

      const busca = document.getElementById('busca-produtos');
      if (busca) {
        busca.addEventListener('input', _debounce(function (e) {
          _busca = e.target.value.trim(); _pag = 1; _renderLista();
        }, 350));
      }

      const modulo = document.getElementById('modulo-produtos');
      if (modulo) {
        modulo.addEventListener('click', async function (e) {
          const btn = e.target.closest('[data-acao]');
          if (btn && btn.dataset.acao === 'editar')  await _editar(btn.dataset.id);
          if (btn && btn.dataset.acao === 'excluir') await _excluir(btn.dataset.id, btn.dataset.nome);
          const btnPag = e.target.closest('[data-pp]');
          if (btnPag) carregar(Number(btnPag.dataset.pp));
        });
      }
    }

    return { init: _bindEventos, carregar: carregar };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // MÓDULO: ESTOQUE
  // ────────────────────────────────────────────────────────────────────────────
  const Estoque = (function () {
    var _busca = '';

    async function carregar() {
      await Promise.all([_renderPosicao(), _renderHistorico(), _carregarProdutosMov()]);
    }

    async function _renderPosicao() {
      const cont = document.getElementById('tabela-estoque-container');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const params = _busca ? '?search=' + encodeURIComponent(_busca) : '';
        const resp = await Api.get('/stock/position' + params);
        const products = resp.products || [];
        if (products.length === 0) { cont.innerHTML = _emptyHTML('Nenhum produto no estoque.'); return; }
        const linhas = products.map(function (p) {
          return '<tr>' +
            '<td>' + _esc(p.sku)  + '</td>' +
            '<td>' + _esc(p.name) + '</td>' +
            '<td class="' + (p.currentStock <= p.minStock ? 'texto-alerta' : '') + '">' + p.currentStock + '</td>' +
            '<td>' + p.minStock + '</td>' +
            '<td>' + (p.currentStock <= p.minStock
              ? '<span class="badge badge-alerta">Crítico</span>'
              : '<span class="badge badge-ativo">OK</span>') + '</td>' +
            '</tr>';
        }).join('');
        cont.innerHTML = '<table class="tabela"><thead><tr><th>SKU</th><th>Produto</th><th>Saldo atual</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>' + linhas + '</tbody></table>';
        _renderResumoEstoque(products);
      } catch (e) { cont.innerHTML = _emptyHTML(e.message); }
    }

    function _renderResumoEstoque(products) {
      const cont = document.getElementById('resumo-estoque');
      if (!cont) return;
      const criticos = products.filter(function (p) { return p.currentStock <= p.minStock; }).length;
      const total    = products.length;
      cont.innerHTML =
        '<div class="resumo-card"><div class="resumo-card-valor">' + total + '</div><div class="resumo-card-label">Produtos ativos</div></div>' +
        '<div class="resumo-card ' + (criticos > 0 ? 'resumo-card-alerta' : '') + '">' +
          '<div class="resumo-card-valor">' + criticos + '</div>' +
          '<div class="resumo-card-label">Estoque crítico</div>' +
        '</div>';
    }

    async function _renderHistorico() {
      const cont = document.getElementById('tabela-movimentos-container');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const resp = await Api.get('/stock/movements?limit=30');
        const movements = resp.movements || [];
        if (movements.length === 0) { cont.innerHTML = _emptyHTML('Nenhuma movimentação registrada.'); return; }
        const linhas = movements.map(function (m) {
          const tipo = m.type === 'IN' ? 'Entrada' : m.type === 'OUT' ? 'Saída' : 'Ajuste';
          const badge = m.type === 'IN' ? 'badge-ativo' : m.type === 'OUT' ? 'badge-inativo' : 'badge-alerta';
          return '<tr>' +
            '<td>' + new Date(m.createdAt).toLocaleString('pt-BR') + '</td>' +
            '<td>' + _esc((m.product && m.product.name) || '—') + '</td>' +
            '<td><span class="badge ' + badge + '">' + tipo + '</span></td>' +
            '<td>' + m.quantity + '</td>' +
            '<td>' + (m.balanceAfter != null ? m.balanceAfter : '—') + '</td>' +
            '<td>' + _esc(m.reason || '—') + '</td>' +
            '<td>' + _esc((m.user && (m.user.name || m.user.username)) || '—') + '</td>' +
            '</tr>';
        }).join('');
        cont.innerHTML = '<table class="tabela"><thead><tr><th>Data/Hora</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Saldo após</th><th>Motivo</th><th>Usuário</th></tr></thead><tbody>' + linhas + '</tbody></table>';
      } catch (e) { cont.innerHTML = _emptyHTML(e.message); }
    }

    async function _carregarProdutosMov() {
      const sel = document.getElementById('mov-produto');
      if (!sel) return;
      try {
        const resp = await Api.get('/products?limit=500');
        const products = resp.products || [];
        const html = products.map(function (p) {
          return '<option value="' + p.id + '">' + _esc(p.sku) + ' — ' + _esc(p.name) + '</option>';
        }).join('');
        sel.innerHTML = '<option value="">Selecione...</option>' + html;
      } catch (_) {}
    }

    async function _registrarMovimento(e) {
      e.preventDefault();
      _limparErrosCampos(e.target);
      const btn = document.getElementById('btn-registrar-mov');
      _setBtnLoading(btn, true);
      _msgEl('mensagem-estoque', '', '');
      const payload = {
        productId: document.getElementById('mov-produto').value,
        type:      document.getElementById('mov-tipo').value,
        quantity:  parseInt(document.getElementById('mov-qty').value, 10) || 0,
        reason:    document.getElementById('mov-motivo').value.trim() || null,
      };
      try {
        await Api.post('/stock/movements', payload);
        Toast.sucesso('Movimentação registrada.');
        e.target.reset();
        await Promise.all([_renderPosicao(), _renderHistorico()]);
      } catch (err) {
        if (err.status === 422 && err.data && err.data.errors) {
          err.data.errors.forEach(function (e) {
            const el = document.getElementById('erro-mov-' + e.field);
            if (el) el.textContent = e.message;
          });
          _msgEl('mensagem-estoque', 'Corrija os campos destacados.', 'erro');
        } else {
          _msgEl('mensagem-estoque', err.message, 'erro');
        }
      } finally {
        _setBtnLoading(btn, false);
      }
    }

    function _bindEventos() {
      const form = document.getElementById('form-movimento');
      if (form) form.addEventListener('submit', _registrarMovimento);
      const busca = document.getElementById('busca-estoque');
      if (busca) {
        busca.addEventListener('input', _debounce(function (e) {
          _busca = e.target.value.trim(); _renderPosicao();
        }, 350));
      }
    }

    return { init: _bindEventos, carregar: carregar };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // MÓDULO: VENDAS / PDV
  // ────────────────────────────────────────────────────────────────────────────
  const Vendas = (function () {
    var _itens = [];

    async function inicializar() {
      await Promise.all([_carregarClientes(), _renderHistorico()]);
      _renderCarrinho();
    }

    async function _carregarClientes() {
      const sel = document.getElementById('pdv-cliente');
      if (!sel) return;
      try {
        const resp = await Api.get('/customers?active=true&limit=500');
        const customers = resp.customers || [];
        const html = customers.map(function (c) {
          return '<option value="' + c.id + '">' + _esc(c.name) + '</option>';
        }).join('');
        sel.innerHTML = '<option value="">— Sem cliente —</option>' + html;
      } catch (_) {}
    }

    function _renderCarrinho() {
      const cont = document.getElementById('pdv-itens-lista');
      if (!cont) return;
      if (_itens.length === 0) {
        cont.innerHTML = '<div class="empty-state" style="padding:30px 20px"><div class="empty-state-icone">🛒</div><p class="empty-state-desc">Nenhum item adicionado.</p></div>';
        _atualizarTotais();
        return;
      }
      cont.innerHTML = _itens.map(function (it, i) {
        return '<div class="pdv-item">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc(it.nome) + '</div>' +
            '<div style="font-size:0.8rem;color:var(--cor-texto-secundario)">' + _brl(it.preco) + ' × ' + it.qty + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
            '<button class="btn btn-ghost btn-sm" data-pdv-dec="' + i + '" aria-label="Diminuir">−</button>' +
            '<span style="min-width:24px;text-align:center">' + it.qty + '</span>' +
            '<button class="btn btn-ghost btn-sm" data-pdv-inc="' + i + '" aria-label="Aumentar">+</button>' +
            '<span style="min-width:64px;text-align:right;font-weight:600">' + _brl(it.preco * it.qty) + '</span>' +
            '<button class="btn btn-danger btn-sm" data-pdv-rm="' + i + '" aria-label="Remover item">✕</button>' +
          '</div>' +
          '</div>';
      }).join('');
      _atualizarTotais();
    }

    function _atualizarTotais() {
      const descInput = document.getElementById('pdv-desconto');
      const descPct   = Math.min(50, Math.max(0, parseFloat((descInput && descInput.value) || 0)));
      const sub       = _itens.reduce(function (s, it) { return s + it.preco * it.qty; }, 0);
      const descVal   = sub * (descPct / 100);
      const total     = sub - descVal;
      const elSub     = document.getElementById('pdv-subtotal');
      const elDesc    = document.getElementById('pdv-desconto-val');
      const elTotal   = document.getElementById('pdv-total');
      if (elSub)   elSub.textContent   = _brl(sub);
      if (elDesc)  elDesc.textContent  = '− ' + _brl(descVal);
      if (elTotal) elTotal.textContent = _brl(total);
    }

    async function _buscarProdutos(q) {
      const cont = document.getElementById('resultado-busca-pdv');
      if (!cont) return;
      if (!q) { cont.innerHTML = ''; return; }
      try {
        const resp = await Api.get('/products?search=' + encodeURIComponent(q) + '&limit=8');
        const products = resp.products || [];
        if (products.length === 0) {
          cont.innerHTML = '<div style="padding:8px;color:var(--cor-texto-secundario);font-size:0.9rem">Nenhum resultado.</div>';
          return;
        }
        cont.innerHTML = products.map(function (p) {
          return '<button type="button" class="btn btn-ghost" style="display:flex;justify-content:space-between;width:100%;text-align:left;padding:8px 12px;border-radius:6px;margin:2px 0"' +
            ' data-pdv-add="' + p.id + '" data-pdv-nome="' + _esc(p.name) + '" data-pdv-preco="' + p.salePrice + '" data-pdv-stock="' + p.currentStock + '">' +
            '<span>' + _esc(p.sku) + ' — ' + _esc(p.name) + '</span>' +
            '<span style="color:var(--cor-texto-secundario)">' + _brl(p.salePrice) + '</span>' +
            '</button>';
        }).join('');
      } catch (_) { cont.innerHTML = ''; }
    }

    function _addItem(id, nome, preco, stock) {
      const existing = _itens.find(function (it) { return it.id === id; });
      if (existing) {
        if (existing.qty >= existing.stock) { Toast.aviso('Estoque insuficiente.'); return; }
        existing.qty++;
      } else {
        if (Number(stock) < 1) { Toast.aviso('Produto sem estoque.'); return; }
        _itens.push({ id: id, nome: nome, preco: Number(preco), qty: 1, stock: Number(stock) });
      }
      _renderCarrinho();
      const resultEl = document.getElementById('resultado-busca-pdv');
      const buscaEl  = document.getElementById('busca-pdv');
      if (resultEl) resultEl.innerHTML = '';
      if (buscaEl)  buscaEl.value      = '';
    }

    async function _confirmarVenda() {
      if (_itens.length === 0) { Toast.aviso('Adicione ao menos um item.'); return; }
      const btn = document.getElementById('btn-confirmar-venda');
      _setBtnLoading(btn, true);
      _msgEl('mensagem-pdv', '', '');
      const descInput    = document.getElementById('pdv-desconto');
      const clienteInput = document.getElementById('pdv-cliente');
      const pagInput     = document.getElementById('pdv-pagamento');
      const descPct      = Math.min(50, Math.max(0, parseFloat((descInput && descInput.value) || 0)));
      const payload = {
        customerId:    (clienteInput && clienteInput.value) || null,
        paymentMethod: (pagInput && pagInput.value) || 'cash',
        discount:      descPct / 100,
        items: _itens.map(function (it) { return { productId: it.id, quantity: it.qty }; }),
      };
      try {
        await Api.post('/sales', payload);
        Toast.sucesso('Venda registrada com sucesso!');
        _limparVenda();
        await _renderHistorico();
      } catch (err) {
        _msgEl('mensagem-pdv', err.message, 'erro');
      } finally {
        _setBtnLoading(btn, false);
      }
    }

    function _limparVenda() {
      _itens.length = 0;
      _renderCarrinho();
      const desc    = document.getElementById('pdv-desconto');
      const cliente = document.getElementById('pdv-cliente');
      if (desc)    desc.value    = '0';
      if (cliente) cliente.value = '';
    }

    async function _renderHistorico() {
      const cont = document.getElementById('historico-vendas-container');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const resp  = await Api.get('/sales?limit=10');
        const sales = resp.sales || [];
        if (sales.length === 0) { cont.innerHTML = _emptyHTML('Nenhuma venda.'); return; }
        cont.innerHTML = sales.map(function (s) {
          const id6 = (s.id || '').toString().slice(-6) || '—';
          return '<div style="padding:8px 0;border-bottom:1px solid var(--cor-borda);font-size:0.85rem">' +
            '<div style="display:flex;justify-content:space-between">' +
              '<span>#' + id6 + '</span>' +
              '<span style="font-weight:600">' + _brl(s.total) + '</span>' +
            '</div>' +
            '<div style="color:var(--cor-texto-secundario)">' + new Date(s.createdAt).toLocaleString('pt-BR') + '</div>' +
            '</div>';
        }).join('');
      } catch (_) { cont.innerHTML = ''; }
    }

    function _bindEventos() {
      const buscaEl = document.getElementById('busca-pdv');
      if (buscaEl) buscaEl.addEventListener('input', _debounce(function (e) { _buscarProdutos(e.target.value.trim()); }, 300));

      const resultados = document.getElementById('resultado-busca-pdv');
      if (resultados) {
        resultados.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-pdv-add]');
          if (btn) _addItem(btn.dataset.pdvAdd, btn.dataset.pdvNome, btn.dataset.pdvPreco, btn.dataset.pdvStock);
        });
      }

      const listEl = document.getElementById('pdv-itens-lista');
      if (listEl) {
        listEl.addEventListener('click', function (e) {
          const btnRm  = e.target.closest('[data-pdv-rm]');
          const btnInc = e.target.closest('[data-pdv-inc]');
          const btnDec = e.target.closest('[data-pdv-dec]');
          if (btnRm)  { _itens.splice(Number(btnRm.dataset.pdvRm), 1); _renderCarrinho(); }
          if (btnInc) { var ii = Number(btnInc.dataset.pdvInc); if (_itens[ii].qty < _itens[ii].stock) _itens[ii].qty++; _renderCarrinho(); }
          if (btnDec) { var id = Number(btnDec.dataset.pdvDec); if (_itens[id].qty > 1) _itens[id].qty--; else _itens.splice(id, 1); _renderCarrinho(); }
        });
      }

      const descEl = document.getElementById('pdv-desconto');
      if (descEl) descEl.addEventListener('input', _atualizarTotais);

      const btnConfirmar = document.getElementById('btn-confirmar-venda');
      if (btnConfirmar) btnConfirmar.addEventListener('click', _confirmarVenda);

      const btnLimpar = document.getElementById('btn-limpar-venda');
      if (btnLimpar) btnLimpar.addEventListener('click', _limparVenda);
    }

    return { init: _bindEventos, inicializar: inicializar };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // MÓDULO: RELATÓRIOS
  // ────────────────────────────────────────────────────────────────────────────
  const Relatorios = (function () {
    async function carregar() {
      await Promise.all([_renderSumario(), _renderTopProdutos(), _renderTopClientes(), _renderEstoqueCritico()]);
    }

    async function _renderSumario() {
      const cont = document.getElementById('resumo-relatorios');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const d = await Api.get('/reports/sales-summary');
        cont.innerHTML =
          '<div class="resumo-card"><div class="resumo-card-valor">' + _brl(d.totalRevenue)  + '</div><div class="resumo-card-label">Receita (mês)</div></div>' +
          '<div class="resumo-card"><div class="resumo-card-valor">' + d.totalSales           + '</div><div class="resumo-card-label">Vendas (mês)</div></div>' +
          '<div class="resumo-card"><div class="resumo-card-valor">' + _brl(d.averageTicket)  + '</div><div class="resumo-card-label">Ticket médio</div></div>' +
          '<div class="resumo-card"><div class="resumo-card-valor">' + d.totalItemsSold       + '</div><div class="resumo-card-label">Itens vendidos</div></div>';
      } catch (e) {
        cont.innerHTML = '<div class="resumo-card"><div class="resumo-card-label">' + _esc(e.message) + '</div></div>';
      }
    }

    async function _renderTopProdutos() {
      const cont = document.getElementById('grafico-top-produtos');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const resp = await Api.get('/reports/top-products');
        const products = resp.products || [];
        cont.innerHTML = _graficoBarras(products,
          function (p) { return _esc(p.name); },
          function (p) { return p.totalQuantity; },
          false);
      } catch (_) { cont.innerHTML = _emptyHTML('Sem dados.'); }
    }

    async function _renderTopClientes() {
      const cont = document.getElementById('grafico-top-clientes');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const resp = await Api.get('/reports/customers-ranking');
        const customers = resp.customers || [];
        cont.innerHTML = _graficoBarras(customers,
          function (c) { return _esc(c.name); },
          function (c) { return c.totalSpent; },
          true);
      } catch (_) { cont.innerHTML = _emptyHTML('Sem dados.'); }
    }

    function _graficoBarras(lista, fnLabel, fnVal, moeda) {
      if (!lista || lista.length === 0) return _emptyHTML('Sem dados para este período.');
      const vals = lista.map(fnVal);
      const max  = Math.max.apply(null, vals) || 1;
      return lista.map(function (item) {
        const val  = fnVal(item);
        const pct  = Math.round((val / max) * 100);
        const disp = moeda ? _brl(val) : val;
        return '<div class="grafico-barra-item">' +
          '<div class="grafico-barra-label">' + fnLabel(item) + '</div>' +
          '<div class="grafico-barra-trilho"><div class="grafico-barra-preench" style="width:' + pct + '%"></div></div>' +
          '<div class="grafico-barra-val">' + disp + '</div>' +
          '</div>';
      }).join('');
    }

    async function _renderEstoqueCritico() {
      const cont = document.getElementById('tabela-estoque-critico');
      if (!cont) return;
      cont.innerHTML = _spinnerHTML();
      try {
        const resp = await Api.get('/reports/low-stock');
        const products = resp.products || [];
        if (products.length === 0) { cont.innerHTML = _emptyHTML('Nenhum produto com estoque crítico.'); return; }
        const linhas = products.map(function (p) {
          return '<tr><td>' + _esc(p.sku) + '</td><td>' + _esc(p.name) + '</td>' +
            '<td class="texto-alerta">' + p.currentStock + '</td><td>' + p.minStock + '</td></tr>';
        }).join('');
        cont.innerHTML = '<table class="tabela"><thead><tr><th>SKU</th><th>Produto</th><th>Estoque atual</th><th>Mínimo</th></tr></thead><tbody>' + linhas + '</tbody></table>';
      } catch (e) { cont.innerHTML = _emptyHTML(e.message); }
    }

    return { carregar: carregar };
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // LOGIN / SAIR
  // ────────────────────────────────────────────────────────────────────────────
  function _bindLogin() {
    const form = document.getElementById('form-login');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = document.getElementById('btn-entrar');
      _setBtnLoading(btn, true);
      _msgEl('mensagem-login', '', '');

      const tenant  = document.getElementById('login-tenant').value.trim()  || null;
      const usuario = document.getElementById('login-usuario').value.trim();
      const senha   = document.getElementById('login-senha').value;

      if (!usuario || !senha) {
        _msgEl('mensagem-login', 'Preencha usuário e senha.', 'erro');
        _setBtnLoading(btn, false);
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usuario, password: senha, tenantSlug: tenant }),
          credentials: 'omit',
        });
        let body;
        try { body = await res.json(); } catch (_) { body = {}; }
        if (!res.ok) {
          _msgEl('mensagem-login', body.message || 'Credenciais inválidas.', 'erro');
          return;
        }
        Auth.setSession(body.token, body.user);
        form.reset();
        Router.irPara('clientes');
      } catch (_) {
        _msgEl('mensagem-login', 'Falha de conexão com o servidor.', 'erro');
      } finally {
        _setBtnLoading(btn, false);
      }
    });
  }

  function _bindSair() {
    const btn = document.getElementById('btn-sair');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      const ok = await Modal.confirmar({ titulo: 'Sair', corpo: 'Deseja encerrar sua sessão?', textoBotao: 'Sair', tipo: 'danger' });
      if (!ok) return;
      Auth.clearSession();
      Router.irPara('login');
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SIDEBAR + MENU MOBILE
  // ────────────────────────────────────────────────────────────────────────────
  function _bindSidebar() {
    document.querySelectorAll('.sidebar-item[data-modulo]').forEach(function (btn) {
      if (btn.id === 'btn-sair') return;
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-em-breve')) { Toast.info('Módulo em desenvolvimento.'); return; }
        Router.irPara(btn.dataset.modulo);
        _fecharSidebarMobile();
      });
    });

    const btnMenu  = document.getElementById('btn-menu');
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (btnMenu && sidebar) {
      btnMenu.addEventListener('click', function () {
        const aberto = sidebar.classList.toggle('sidebar-aberta');
        btnMenu.setAttribute('aria-expanded', String(aberto));
        if (backdrop) backdrop.hidden = !aberto;
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', _fecharSidebarMobile);
    }
  }

  function _fecharSidebarMobile() {
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnMenu  = document.getElementById('btn-menu');
    if (sidebar)  sidebar.classList.remove('sidebar-aberta');
    if (backdrop) backdrop.hidden = true;
    if (btnMenu)  btnMenu.setAttribute('aria-expanded', 'false');
  }

  function _bindTema() {
    document.querySelectorAll('[data-btn-tema]').forEach(function (btn) {
      btn.addEventListener('click', function () { Tema.alternar(); });
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BOOT
  // ────────────────────────────────────────────────────────────────────────────
  function init() {
    Tema.init();
    _bindLogin();
    _bindSair();
    _bindSidebar();
    _bindTema();
    Clientes.init();
    Produtos.init();
    Estoque.init();
    Vendas.init();
    Router.irPara('login');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
