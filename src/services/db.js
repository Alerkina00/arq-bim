const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// CORRIGIDO: caminho absoluto correto
const DB_PATH = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(__dirname, '../../data/arq-bim.db');

// Garantir que a pasta existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Pasta do banco criada: ${dbDir}`);
}

let db = null;

async function getDb() {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm')
    });

    let data = null;
    if (fs.existsSync(DB_PATH)) {
        data = fs.readFileSync(DB_PATH);
        console.log(`📂 Banco de dados carregado: ${DB_PATH}`);
    } else {
        console.log(`📄 Criando novo banco de dados: ${DB_PATH}`);
    }

    db = new SQL.Database(data);

    // Criar tabelas
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE,
            name TEXT,
            description TEXT,
            file_name TEXT,
            file_size INTEGER,
            file_type TEXT,
            file_key TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Verificar e criar admin
    const adminCheck = db.exec("SELECT * FROM users WHERE username = 'admin'");
    let adminExists = adminCheck.length > 0 && adminCheck[0].values.length > 0;

    if (!adminExists) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hash = bcrypt.hashSync(adminPassword, 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hash]);
        console.log(`✅ Usuário admin criado (senha: ${adminPassword})`);
        saveDb();
    } else {
        console.log('✅ Usuário admin já existe');
    }

    return db;
}

function saveDb() {
    if (db) {
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
}

// Salvar automaticamente a cada 5 minutos
setInterval(() => {
    if (db) {
        try {
            saveDb();
        } catch (e) {
            console.error('Erro ao salvar DB:', e);
        }
    }
}, 5 * 60 * 1000);

module.exports = { getDb, saveDb };
