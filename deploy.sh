#!/bin/bash
# =============================================================
#  deploy.sh — Arq BIM no Fly.io
#  Execute: bash deploy.sh
# =============================================================

set -e

echo ""
echo "🚀 Arq BIM — Deploy no Fly.io"
echo "================================"

# 1. Verifica se flyctl está instalado
if ! command -v fly &> /dev/null; then
  echo "❌ flyctl não encontrado. Instalando..."
  curl -L https://fly.io/install.sh | sh
  export PATH="$HOME/.fly/bin:$PATH"
fi

echo "✅ flyctl encontrado: $(fly version)"

# 2. Login (abre browser)
echo ""
echo "📋 Passo 1: Login no Fly.io"
fly auth login

# 3. Cria o app (só na primeira vez)
echo ""
echo "📋 Passo 2: Criando app..."
fly launch \
  --name arq-bim \
  --region gru \
  --no-deploy \
  --copy-config

# 4. Cria volume persistente para o SQLite
echo ""
echo "📋 Passo 3: Criando volume para banco de dados (SQLite)..."
fly volumes create arq_bim_data \
  --region gru \
  --size 1 \
  --yes

# 5. Define os secrets (variáveis de ambiente sensíveis)
echo ""
echo "📋 Passo 4: Configurando secrets..."
echo "⚠️  Você precisará digitar os valores abaixo:"
echo ""

# Gera JWT_SECRET aleatório automaticamente
JWT_SECRET=$(openssl rand -hex 32)
fly secrets set \
  JWT_SECRET="$JWT_SECRET" \
  ADMIN_PASSWORD="mude-esta-senha-agora" \
  R2_ENDPOINT="${R2_ENDPOINT:-}" \
  R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-}" \
  R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-}" \
  R2_BUCKET_NAME="${R2_BUCKET_NAME:-arq-bim-models}"

echo "✅ JWT_SECRET gerado automaticamente: $JWT_SECRET"
echo "⚠️  Anote o JWT_SECRET acima em local seguro!"

# 6. Deploy
echo ""
echo "📋 Passo 5: Deploy..."
fly deploy

# 7. Resultado
echo ""
echo "🎉 Deploy concluído!"
echo "================================"
fly status
echo ""
echo "🌐 URL do app:"
fly info | grep "Hostname"
echo ""
echo "📊 Painel admin: https://$(fly info | grep Hostname | awk '{print $2}')/admin"
echo ""
echo "📝 Próximos passos:"
echo "   1. Acesse o painel admin e troque a senha"
echo "   2. Configure as variáveis R2 se usar Cloudflare:"
echo "      fly secrets set R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com"
echo "      fly secrets set R2_ACCESS_KEY_ID=sua-key"
echo "      fly secrets set R2_SECRET_ACCESS_KEY=sua-secret"
echo "      fly secrets set R2_BUCKET_NAME=arq-bim-models"
