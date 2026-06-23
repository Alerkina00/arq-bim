'use strict';
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, saveDb } = require('../services/db');
const { uploadFile } = require('../services/storage');
const authMiddleware = require('../middleware/auth'); // Fix: importa middleware

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = '/tmp/arq-bim-uploads';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 }
});

// Fix: GET para listar projetos (necessário para o painel admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT id, slug, name, description, file_name, file_size, file_type, created_at FROM projects ORDER BY created_at DESC');
    
    if (!result[0]) return res.json([]);

    const cols = result[0].columns;
    const projects = result[0].values.map(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fix: POST com autenticação + upload real para o storage
router.post('/', authMiddleware, upload.array('files', 10), async (req, res) => {
  const tmpFiles = (req.files || []).map(f => f.path);

  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Selecione pelo menos um arquivo' });

    const slug = crypto.randomBytes(6).toString('hex');
    const mainFile = req.files[0];

    // Fix: envia o arquivo para o storage (local ou R2)
    const fileBuffer = fs.readFileSync(mainFile.path);
    const fileKey = await uploadFile(fileBuffer, mainFile.filename);

    const db = await getDb();
    db.run(
      `INSERT INTO projects (slug, name, description, file_name, file_size, file_type, file_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, description || '', mainFile.originalname, mainFile.size, path.extname(mainFile.originalname).slice(1), fileKey]
    );
    saveDb();

    res.json({
      success: true,
      slug,
      viewerUrl: `/v/${slug}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    // Limpa arquivos temporários independente de sucesso ou erro
    tmpFiles.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
  }
});

// Fix: DELETE para remover projeto
router.delete('/:slug', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM projects WHERE slug = ?', [req.params.slug]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
