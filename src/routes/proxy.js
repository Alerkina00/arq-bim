'use strict';
const express = require('express');
const { getDb } = require('../services/db');
const { getFileStream } = require('../services/storage');

const router = express.Router();

router.get('/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const r = db.exec('SELECT file_key FROM projects WHERE slug = ?', [req.params.slug]);
    if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'Não encontrado' });

    const fileKey = r[0].values[0][0];
    res.setHeader('Cache-Control', 'public, max-age=604800');
    const stream = await getFileStream(fileKey);
    stream.pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
