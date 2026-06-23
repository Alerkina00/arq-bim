const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Fix: usa variável de ambiente se definida, senão usa caminho padrão
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../../data/arq-bim.db');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm')
  });

  let data = null;
  if (fs.existsSync(DB_PATH)) data = fs.readFileSync(DB_PATH);

  db = new SQL.Database(data);

  // Fix: tabela criada apenas uma vez, sem duplicata
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
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

  // Cria admin padrão se não existir
  const adminExists = db.exec("SELECT * FROM users WHERE username = 'admin'");
  if (adminExists.length === 0 || adminExists[0].values.length === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hash]);
    console.log('✅ Usuário admin criado (senha padrão: admin123)');
  }

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

module.exports = { getDb, saveDb };
