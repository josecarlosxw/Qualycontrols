# QualiControl

Painel web para controle de qualidade industrial. Registra e analisa **não conformidades** (recebimento, fornecedores, produtos) e **retrabalho/refugo** (processo interno), com dashboards, planilhas dinâmicas e importação de dados via Excel.

O projeto é **100% front-end estático** (HTML + CSS + JS puro, sem build). Os dados e a autenticação ficam no **Firebase** (Firestore + Auth).

---

## Funcionalidades

**Módulo 1 – Não conformidades**
- Dashboard com KPIs e gráficos (evolução, fornecedor, motivo, destino, interno)
- Lançamentos (cadastro/edição de incidentes)
- Planilha com tabela dinâmica (pivot) e filtros
- Modo apresentação
- Valor financeiro calculado como `Qtd (KG) × Valor Unitário`

**Módulo 2 – Retrabalho e Refugo**
- Dashboard de retrabalho
- Lançamentos e planilha de registros
- Importação de planilhas Excel (`.xlsx`)
- Cadastros auxiliares próprios

**Geral**
- Login com Firebase Auth e proteção de páginas
- Configurações: fornecedores, produtos, motivos, destinos, status, tipos de processo, unidades de medida e responsáveis
- Tema claro/escuro

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI | HTML5, CSS, [Tailwind CDN](https://tailwindcss.com), [Phosphor Icons](https://phosphoricons.com) |
| Gráficos | [Chart.js](https://www.chartjs.org) |
| Excel | [SheetJS (xlsx)](https://sheetjs.com) |
| Backend | Firebase Auth + Cloud Firestore (SDK 10.12.0, modo compat) |

Todas as bibliotecas são carregadas por CDN, então não há `npm install`.

---

## Estrutura

```
.
├── index.html              # redireciona para /app/index.html
├── favicon.png / .ico
├── robots.txt
├── firestore.rules         # regras do Firestore
└── app/
    ├── index.html                    # dashboard (não conformidades)
    ├── login.html
    ├── lancamentos.html
    ├── planilha.html
    ├── configuracoes.html
    ├── retrabalho.html               # dashboard de retrabalho
    ├── retrabalho-lancamentos.html
    ├── retrabalho-planilha.html
    ├── retrabalho-importar.html
    ├── retrabalho-cadastros.html
    ├── styles.css
    ├── css/redesign.css
    ├── assets/                       # favicons e imagens
    └── js/
        ├── auth.js                   # init do Firebase e proteção de rotas
        ├── main.js                   # bootstrap do dashboard
        ├── theme.js                  # tema claro/escuro
        ├── data/
        │   ├── api.js                # acesso ao Firestore (módulo 1)
        │   └── api-m2.js             # acesso ao Firestore (módulo 2)
        ├── charts/                   # gráficos Chart.js
        ├── components/               # KPIs, filtros, tabelas, sidebar, toast...
        └── m2/                       # telas do módulo de retrabalho
```

---

## Dados (Firestore)

| Coleção | Uso |
|---|---|
| `incidents` | Não conformidades |
| `rework_entries` | Registros de retrabalho/refugo |
| `m2_imports` | Importações de planilha do módulo 2 |
| `suppliers`, `products`, `reasons`, `destinations`, `statuses`, `process_types`, `measure_units`, `responsibles` | Cadastros auxiliares (selects) |

---

## Como rodar localmente

Não precisa de build. Basta servir a pasta com qualquer servidor estático (abrir o arquivo direto com `file://` pode falhar com o Firebase Auth):

```bash
# opção 1
npx serve .

# opção 2
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080` (redireciona para `/app/index.html`; sem login, cai em `login.html`).

---

## Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. Ative **Authentication** (e-mail/senha) e **Cloud Firestore**.
3. Substitua o objeto `firebaseConfig` em `app/js/auth.js` pelos dados do seu projeto.
4. Em *Authentication → Settings → Authorized domains*, adicione o domínio onde o site será hospedado.
5. Publique as regras: Console → Firestore Database → Regras → cole o conteúdo de `firestore.rules` e publique.
6. Crie os usuários manualmente em *Authentication → Users*.

> A `apiKey` do Firebase Web não é segredo (é identificador público do projeto). A segurança vem das **regras do Firestore** e dos domínios autorizados.

---

## Segurança

As regras atuais (`firestore.rules`) permitem **leitura e escrita em todas as coleções para qualquer usuário autenticado**:

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

Isso é suficiente para uso interno de uma equipe única. Se houver perfis diferentes (ex.: só leitura, admin), restrinja por coleção e por papel (custom claims ou coleção de usuários) antes de ir para produção.

---

## Deploy

Por ser estático, funciona em qualquer hospedagem: Firebase Hosting, Netlify, Vercel, GitHub Pages ou servidor Nginx/Apache. Publique a raiz do projeto e lembre de autorizar o domínio no Firebase Auth.

---

## Observações

- O arquivo `app/lab-bg.mp4.asset.json` é só uma referência a um vídeo de fundo hospedado externamente; o `.mp4` não está no repositório.
- `TOTAL_ITEMS_RECEIVED_LAST_YEAR` (em `app/js/data/api.js`) é um valor fixo usado nos cálculos de percentual. Ajuste conforme necessário.
