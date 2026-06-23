'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Garantir que as pastas necessárias existam
const DATA_DIR = path.resolve(__dirname, '../data');
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
const PUBLIC_DIR = path.resolve(__dirname, '../../client/public');

[DATA_DIR, UPLOAD_DIR, PUBLIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Pasta criada: ${dir}`);
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos - corrigido para usar caminho absoluto
app.use(express.static(PUBLIC_DIR));

// Rotas de API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/proxy', require('./routes/proxy'));

// Páginas
app.get('/admin', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/v/:slug', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'viewer.html'));
});

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function start() {
    try {
        await require('./services/db').getDb();
        app.listen(PORT, () => {
            console.log(`\n🚀 Arq BIM rodando em http://localhost:${PORT}`);
            console.log(`📊 Admin: http://localhost:${PORT}/admin`);
            console.log(`📁 Banco de dados: ${DATA_DIR}/arq-bim.db`);
            console.log(`📁 Uploads: ${UPLOAD_DIR}\n`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar:', error);
        process.exit(1);
    }
}

start().catch(console.error);
