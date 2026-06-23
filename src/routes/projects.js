'use strict';
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../services/db');
const crypto = require('crypto');

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

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Selecione pelo menos um arquivo' });

    const slug = crypto.randomBytes(6).toString('hex');
    const mainFile = req.files[0];

    const db = await getDb();
    db.run(
      `INSERT INTO projects (slug, name, description, file_name, file_size, file_type, file_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, description || '', mainFile.originalname, mainFile.size, path.extname(mainFile.originalname).slice(1), mainFile.filename]
    );

    res.json({ 
      success: true, 
      slug,
      viewerUrl: `/v/${slug}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;