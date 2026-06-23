const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.resolve(__dirname, '../../data/arq-bim.db');
let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  let data = null;
  if (fs.existsSync(DB_PATH)) data = fs.readFileSync(DB_PATH);

  db = new SQL.Database(data);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT);
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      slug TEXT UNIQUE,
      name TEXT,
      description TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_type TEXT,
      file_key TEXT,
      qr_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminExists = db.exec("SELECT * FROM users WHERE username = 'admin'");
  if (!adminExists[0] || !adminExists[0].values.length) {
    const pwd = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(pwd, 10);
    db.run("INSERT INTO users (username, password) VALUES ('admin', ?)", [hash]);
    console.log('✅ Admin criado (senha configurada no .env)');
  }

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

module.exports = { getDb, saveDb };
