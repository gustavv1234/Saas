# Gestão Autopeças

Sistema interno de gestão para uma loja de autopeças.
Esta etapa contém apenas a **camada front-end inicial**: login provisório, layout administrativo com menu lateral e tela de **cadastro de cliente**.

Princípio do projeto: **básico que funciona**, com **segurança tratada como requisito central** desde a primeira linha.

Stack: **HTML5 + CSS3 + JavaScript puro**. Sem frameworks, sem CDN, sem dependências externas, sem back-end, sem banco de dados, sem API.

---

## Localização do projeto

O projeto está organizado em:

```
Projetos/
└── Helio/
    ├── index.html
    ├── styles.css
    ├── script.js
    └── README.md
```

- Linux/macOS: `~/Projetos/Helio`
- Windows: `C:\Users\SEU_USUARIO\Projetos\Helio`

---

## Como abrir e testar

Sem build, sem instalação, sem servidor.

1. Abra `Projetos/Helio/index.html` diretamente no navegador (duplo clique).
2. A **tela de login** aparece primeiro.
3. Faça login com as credenciais de protótipo abaixo.
4. Após o login, o layout administrativo é exibido com menu lateral e o **cadastro de cliente**.

Opcional — servir a pasta com servidor estático:

```bash
python3 -m http.server 8080
# depois acesse: http://localhost:8080
```

---

## Credenciais provisórias (apenas protótipo)

| Campo   | Valor              |
| ------- | ------------------ |
| Usuário | `admin`            |
| Senha   | `admin-demo-123`   |

> **Atenção — leitura obrigatória:**
>
> - Estas credenciais existem **apenas para o fluxo visual desta etapa**.
> - **Não use em produção.**
> - Não representam autenticação real — qualquer pessoa com acesso ao código consegue lê-las.
> - O front-end nunca é barreira de segurança suficiente.
> - Quando o back-end for implementado, estas credenciais **serão removidas** e substituídas por:
>   - validação real no servidor;
>   - senhas com hash forte (ex.: argon2 / bcrypt);
>   - sessão segura;
>   - controle de permissões;
>   - logs de acesso e auditoria;
>   - proteção real contra força bruta (rate limiting, lockout, MFA conforme necessário).

---

## Fluxo do sistema nesta etapa

1. Usuário abre `index.html`.
2. Sistema mostra **tela de login**.
3. Em caso de credenciais inválidas → mensagem genérica: *“Usuário ou senha inválidos.”*
4. Após muitas tentativas inválidas (5), o botão Entrar é **bloqueado por alguns segundos** (proteção básica de UX em memória — **não é segurança real**).
5. Em caso de credenciais válidas → tela interna com:
   - **menu lateral** com os módulos do sistema;
   - **cadastro de cliente** na área principal;
   - alternância de **tema claro/escuro**;
   - botão **Sair**.
6. **Recarregar a página** = voltar para o login. A sessão **não persiste** no navegador.
7. **Sair** = encerra a sessão visual, limpa o formulário e volta para o login.

---

## Menu lateral

| Item            | Estado nesta etapa                                                    |
| --------------- | --------------------------------------------------------------------- |
| Clientes        | **Ativo** — único módulo funcional. Mostra o cadastro de cliente.     |
| Produtos        | *Em breve* — sem funcionalidade. Exibe aviso amigável ao clicar.      |
| Estoque         | *Em breve* — sem funcionalidade. Exibe aviso amigável ao clicar.      |
| Vendas          | *Em breve* — sem funcionalidade. Exibe aviso amigável ao clicar.     |
| Relatórios      | *Em breve* — sem funcionalidade. Exibe aviso amigável ao clicar.     |
| Configurações   | *Em breve* — sem funcionalidade. Exibe aviso amigável ao clicar.     |
| Sair            | Encerra a sessão e volta para o login.                                |

Módulos *em breve* **não redirecionam** para páginas inexistentes — apenas mostram a mensagem:
> *“[Módulo] ainda não disponível nesta etapa.”*

---

## Cadastro de cliente

Campos:

- **Nome / Razão Social** — obrigatório, 3 a 120 caracteres.
- **Tipo de cliente** — obrigatório (`PF` ou `PJ`).
- **CPF / CNPJ** — obrigatório, máscara dinâmica, validação de dígitos verificadores.
- **Telefone** — obrigatório, máscara brasileira, fixo ou celular.
- **E-mail** — opcional, validado se preenchido (máx. 120).
- **Endereço** — opcional (máx. 180).
- **Observações** — opcional (máx. 500), com contador `0/500`.
- **Status** — interno, cliente nasce como `active: true`.

> Os **clientes da loja não têm login**, não têm senha, **não acessam o sistema**.
> Esse cadastro é apenas o registro comercial básico utilizado internamente pela loja.

O botão **Salvar Cliente**:

- Valida todos os campos.
- Simula uma latência de ~700 ms.
- Mostra uma mensagem **genérica** de sucesso (sem expor PII completa).
- **Não envia dados para nenhuma API e não persiste nada no navegador.**

Payload preparado para futura integração com o back-end (apenas montado em memória, **sem envio**):

```js
{
  name: "string",
  customerType: "PF" | "PJ",
  document: "string (apenas dígitos)",
  phone: "string (apenas dígitos)",
  email: "string | null",
  address: "string | null",
  notes: "string | null",
  active: true
}
```

---

## O que **não** existe nesta etapa (intencional)

- Banco de dados, back-end, API real.
- Autenticação real de produção.
- Cadastro de usuários, recuperação de senha, “lembrar-me”, permissões reais.
- Listagem, edição, exclusão, exportação ou impressão de clientes.
- Módulos de produtos, estoque, vendas, relatórios e configurações.
- Persistência de qualquer dado de cliente ou de sessão.
- Dependências externas, frameworks ou bibliotecas via CDN.

---

## Segurança — leitura obrigatória

1. **Nenhum dado de cliente** é salvo no navegador.
   Não usamos `localStorage`, `sessionStorage` ou cookies para nome, CPF/CNPJ, telefone, e-mail, endereço ou observações.
2. **Nenhum dado de login** (usuário/senha) é persistido em local algum no navegador.
3. `localStorage` é usado **apenas** para a preferência visual de tema (`"light"` ou `"dark"`).
4. **Sessão é apenas em memória**. Ao recarregar a página, o usuário volta para o login.
5. Mensagens de erro de login são **genéricas** — não revelam qual campo falhou.
6. Bloqueio temporário do botão de login após muitas tentativas — **proteção de UX, não de produção**.
7. Inserção de texto em elementos da página: sempre via `textContent` / `createElement`. **Nunca** `innerHTML` com dado vindo do usuário.
8. Sem `eval`, sem `new Function`, sem `fetch`, sem `XMLHttpRequest`.
9. Sem dependências externas, sem CDN, sem frameworks.
10. Sem `onclick` inline — apenas `addEventListener`.
11. Sem senha, token, chave de API ou endpoint sensível no código (além da credencial de protótipo, já documentada como temporária).
12. Botão de salvar bloqueia novos cliques enquanto está “salvando” (sem envio duplicado).
13. Limites de tamanho em todos os campos: `maxlength` no HTML **e** validação no JavaScript.
14. Erros técnicos não chegam ao usuário — apenas mensagens curtas e genéricas.
15. Nenhum dado pessoal completo é exibido em mensagens de sucesso.
16. Nenhum `console.log` expõe PII completa ou credenciais.

### Importante

> As validações em JavaScript existem **apenas para melhorar a experiência do usuário**.
>
> **Todas precisam ser refeitas no back-end** (formato, tamanho, dígitos verificadores, unicidade do documento, sanitização, normalização, regras de negócio).
>
> O front-end **nunca** deve ser tratado como barreira de segurança suficiente.

---

## Próximos passos (fora do escopo desta entrega)

- Back-end real (REST/HTTP) recebendo o objeto produzido por `buildCustomerPayload()`.
- Banco de dados com migrations versionadas e backup periódico.
- Autenticação real, sessão segura, controle de permissões, MFA conforme necessário.
- Logs de acesso e auditoria de cadastro / edição / exclusão.
- Listagem, busca, edição e exclusão de clientes.
- Implementação real dos módulos *em breve*: Produtos, Estoque, Vendas, Relatórios, Configurações.

---

## Observação sobre exemplos

Todos os exemplos neste README e no código usam **valores fictícios**. Nenhum CPF, CNPJ, telefone, endereço ou credencial real foi utilizado.
