# Deploy Arq BIM no Fly.io 🚀

## Pré-requisitos

- Conta criada em https://fly.io (tem plano gratuito com $5/mês de crédito)
- Node.js instalado localmente

---

## Deploy rápido (primeira vez)

### 1. Instala o flyctl
```bash
# Mac/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login
```bash
fly auth login
```

### 3. Coloca os arquivos na raiz do projeto
Copie `Dockerfile` e `fly.toml` para a **raiz** do projeto (mesmo nível do `package.json`).

### 4. Cria o app
```bash
fly launch --name arq-bim --region gru --no-deploy --copy-config
```
> Se `arq-bim` já estiver tomado, escolha outro nome (ex: `arq-bim-thais`)

### 5. Cria o volume para o banco SQLite
```bash
fly volumes create arq_bim_data --region gru --size 1
```

### 6. Configura as variáveis de ambiente secretas
```bash
# JWT (gera um aleatório)
fly secrets set JWT_SECRET=$(openssl rand -hex 32)

# Senha do admin
fly secrets set ADMIN_PASSWORD=sua-senha-segura

# Cloudflare R2 (se estiver usando)
fly secrets set R2_ENDPOINT=https://SEU_ID.r2.cloudflarestorage.com
fly secrets set R2_ACCESS_KEY_ID=sua-key
fly secrets set R2_SECRET_ACCESS_KEY=sua-secret
fly secrets set R2_BUCKET_NAME=arq-bim-models
```

### 7. Faz o deploy
```bash
fly deploy
```

Pronto! O app vai estar em: `https://arq-bim.fly.dev/admin`

---

## Comandos úteis do dia a dia

```bash
# Ver logs em tempo real
fly logs

# Ver status das máquinas
fly status

# Abrir no browser
fly open /admin

# Re-deploy após mudanças no código
fly deploy

# Ver uso de memória/CPU
fly metrics

# SSH na máquina (para debug)
fly ssh console

# Ver secrets configurados
fly secrets list

# Trocar senha do admin
fly secrets set ADMIN_PASSWORD=nova-senha
```

---

## Estrutura de custos no Fly.io

| Recurso | Custo |
|---|---|
| 1 máquina shared (1GB RAM) | ~$5.70/mês |
| Volume 1GB (SQLite) | ~$0.15/mês |
| Banda de saída (10GB free) | $0 |
| **Total estimado** | **~$6/mês** |

> Com o crédito gratuito de $5/mês do Fly.io, você paga ~$1/mês na prática.

---

## Problema com memória?

Se o app travar por OOM (falta de memória), aumente no `fly.toml`:

```toml
[[vm]]
  memory = "2gb"   # era "1gb"
```

Depois: `fly deploy`

---

## Estrutura de arquivos necessária

```
seu-projeto/
├── Dockerfile        ← novo
├── fly.toml          ← novo
├── package.json
├── src/
│   ├── server.js
│   ├── routes/
│   ├── services/
│   └── middleware/
└── client/
    └── public/
        ├── admin.html
        └── viewer.html
```
