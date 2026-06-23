const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Caminho absoluto para o banco de dados na raiz
const DB_PATH = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(process.cwd(), 'data/arq-bim.db');

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

    // Criar admin
    const adminCheck = db.exec("SELECT * FROM users WHERE username = 'admin'");
    let adminExists = adminCheck.length > 0 && adminCheck[0].values.length > 0;

    if (!adminExists) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'ARQBIM2026';
        const hash = bcrypt.hashSync(adminPassword, 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hash]);
        console.log(`✅ Usuário admin criado (senha: ${adminPassword})`);
        saveDb();
    }

    return db;
}

function saveDb() {
    if (db) {
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
}

module.exports = { getDb, saveDb };
