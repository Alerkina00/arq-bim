'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Caminhos absolutos - tudo na raiz do projeto
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

console.log(`📁 ROOT_DIR: ${ROOT_DIR}`);
console.log(`📁 PUBLIC_DIR: ${PUBLIC_DIR}`);
console.log(`📁 DATA_DIR: ${DATA_DIR}`);

// Criar pastas
[DATA_DIR, UPLOAD_DIR, PUBLIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Pasta criada: ${dir}`);
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(PUBLIC_DIR));

// Rotas de API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/proxy', require('./routes/proxy'));

// Rota admin
app.get('/admin', (req, res) => {
    const filePath = path.join(PUBLIC_DIR, 'admin.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`
            <h1>admin.html não encontrado</h1>
            <p>Caminho: ${filePath}</p>
            <p>Arquivos em public: ${fs.readdirSync(PUBLIC_DIR).join(', ')}</p>
        `);
    }
});

// Rota viewer
app.get('/v/:slug', (req, res) => {
    const filePath = path.join(PUBLIC_DIR, 'viewer.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('viewer.html não encontrado');
    }
});

// Rota raiz
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Health check
app.get('/health', (req, res) => {
    const publicFiles = fs.existsSync(PUBLIC_DIR) ? fs.readdirSync(PUBLIC_DIR) : [];
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        root: ROOT_DIR,
        public_dir: PUBLIC_DIR,
        public_files: publicFiles,
        node_env: process.env.NODE_ENV
    });
});

async function start() {
    try {
        await require('./services/db').getDb();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Arq BIM rodando em http://0.0.0.0:${PORT}`);
            console.log(`📊 Admin: http://0.0.0.0:${PORT}/admin`);
            console.log(`📁 Data: ${DATA_DIR}`);
            console.log(`📁 Uploads: ${UPLOAD_DIR}`);
            console.log(`📁 Public: ${PUBLIC_DIR}`);
            
            // Listar arquivos
            if (fs.existsSync(PUBLIC_DIR)) {
                const files = fs.readdirSync(PUBLIC_DIR);
                console.log(`📄 Arquivos em public/: ${files.join(', ') || '(vazio)'}`);
            }
            console.log('');
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar:', error);
        process.exit(1);
    }
}

start().catch(console.error);
