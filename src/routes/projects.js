'use strict';
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { getDb, saveDb } = require('../services/db');
const { uploadFile } = require('../services/storage');

const router = express.Router();
const auth = require('../middleware/auth');

const TMP_DIR = path.join(require('os').tmpdir(), 'arq-bim-uploads');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-]/g, '_');
      cb(null, crypto.randomBytes(8).toString('hex') + '__' + safe);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 }
});

function limparTemp(files) {
  for (const f of files || []) {
    try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (_) {}
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM projects ORDER BY created_at DESC');
    const projects = result[0] ? result[0].values.map(r => ({
      id: r[0], slug: r[1], name: r[2], description: r[3],
      file_name: r[4], file_size: r[5], file_type: r[6], file_key: r[7], qr_url: r[8]
    })) : [];
    res.json(projects);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const r = db.exec('SELECT * FROM projects WHERE slug = ?', [req.params.slug]);
    if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'Projeto não encontrado' });
    const row = r[0].values[0];
    res.json({
      slug: row[1], name: row[2], description: row[3],
      file_type: row[6], file_key: row[7]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, upload.array('files', 10), async (req, res) => {
  const files = req.files || [];
  try {
    const { name, description } = req.body;
    if (!name) { limparTemp(files); return res.status(400).json({ error: 'Nome obrigatório' }); }
    if (!files.length) { limparTemp(files); return res.status(400).json({ error: 'Selecione arquivos' }); }

    const slug = crypto.randomBytes(4).toString('hex');
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const mainFile = files[0];
    const ext = mainFile.originalname.split('.').pop().toLowerCase();

    const allowed = ['glb', 'gltf', 'obj', 'fbx'];
    if (!allowed.includes(ext)) {
      limparTemp(files);
      return res.status(400).json({ error: 'Formato suportado: GLB, GLTF, OBJ, FBX' });
    }

    const fileKey = await uploadFile(fs.readFileSync(mainFile.path), `${slug}.${ext}`, 'model/gltf-binary');
    const viewerUrl = `${baseUrl}/v/${slug}`;
    const qrUrl = await QRCode.toDataURL(viewerUrl);

    const db = await getDb();
    db.run(`INSERT INTO projects (slug, name, description, file_name, file_size, file_type, file_key, qr_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, description || '', mainFile.originalname, mainFile.size, ext, fileKey, qrUrl]);
    saveDb();

    limparTemp(files);
    res.status(201).json({ slug, viewerUrl, qrUrl });
  } catch (err) {
    limparTemp(files);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
