FROM node:20-alpine

# Instala dependências do sistema necessárias para sql.js (WASM)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copia dependências primeiro (cache de layer)
COPY package*.json ./

# Instala dependências de produção
RUN npm ci --omit=dev

# Copia o código fonte
COPY . .

# Cria diretórios necessários
RUN mkdir -p data uploads /tmp/arq-bim-uploads

# Usuário não-root por segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
