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
// CORRIGIDO: usar 'public' na raiz, não 'client/public'
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

console.log(`📁 PUBLIC_DIR: ${PUBLIC_DIR}`);
console.log(`📁 DATA_DIR: ${DATA_DIR}`);

// Criar pastas se não existirem
[DATA_DIR, UPLOAD_DIR, PUBLIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Pasta criada: ${dir}`);
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(PUBLIC_DIR));

// Rotas de API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/proxy', require('./routes/proxy'));

// Páginas - usando /admin (não /admin.html)
app.get('/admin', (req, res) => {
    const filePath = path.join(PUBLIC_DIR, 'admin.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('admin.html não encontrado. Verifique se o arquivo existe em: ' + filePath);
    }
});

app.get('/v/:slug', (req, res) => {
    const filePath = path.join(PUBLIC_DIR, 'viewer.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('viewer.html não encontrado');
    }
});

// Rota raiz redireciona para admin
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Health check
app.get('/health', (req, res) => res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    public_dir: PUBLIC_DIR,
    files: fs.readdirSync(PUBLIC_DIR)
}));

async function start() {
    try {
        await require('./services/db').getDb();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Arq BIM rodando em http://0.0.0.0:${PORT}`);
            console.log(`📊 Admin: http://0.0.0.0:${PORT}/admin`);
            console.log(`📁 Banco de dados: ${DATA_DIR}/arq-bim.db`);
            console.log(`📁 Uploads: ${UPLOAD_DIR}`);
            console.log(`📁 Public: ${PUBLIC_DIR}`);
            
            // Listar arquivos na pasta public
            try {
                const files = fs.readdirSync(PUBLIC_DIR);
                console.log(`📄 Arquivos em public/: ${files.join(', ')}`);
            } catch (e) {
                console.log('⚠️ Não foi possível listar arquivos public');
            }
            console.log('');
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar:', error);
        process.exit(1);
    }
}

start().catch(console.error);
