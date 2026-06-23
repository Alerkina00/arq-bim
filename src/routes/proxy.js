'use strict';
const express = require('express');
const { getDb } = require('../services/db');
const { getFileStream } = require('../services/storage');

const router = express.Router();

router.get('/:slug', async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec('SELECT file_key, file_name, file_type FROM projects WHERE slug = ?', [req.params.slug]);
        
        if (!result[0] || !result[0].values.length) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }

        const [fileKey, fileName, fileType] = result[0].values[0];
        
        // Configurar cabeçalhos
        const contentType = {
            'glb': 'model/gltf-binary',
            'gltf': 'model/gltf+json',
            'obj': 'text/plain',
            'fbx': 'application/octet-stream'
        }[fileType] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

        const stream = await getFileStream(fileKey);
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('Erro no stream:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erro ao servir arquivo' });
            }
        });

    } catch (err) {
        console.error('Erro no proxy:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = router;
