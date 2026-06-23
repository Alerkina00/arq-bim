'use strict';
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, saveDb } = require('../services/db');
const { uploadFile, deleteFile } = require('../services/storage');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configurar multer para usar disco temporário
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = '/tmp/arq-bim-uploads';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const timestamp = Date.now();
            const random = crypto.randomBytes(6).toString('hex');
            cb(null, `${timestamp}-${random}${ext}`);
        }
    }),
    limits: { 
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

// Listar todos os projetos
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec(`
            SELECT id, slug, name, description, file_name, file_size, file_type, created_at 
            FROM projects 
            ORDER BY created_at DESC
        `);
        
        if (!result[0]) {
            return res.json([]);
        }

        const cols = result[0].columns;
        const projects = result[0].values.map(row => {
            const obj = {};
            cols.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });

        res.json(projects);
    } catch (err) {
        console.error('Erro ao listar projetos:', err);
        res.status(500).json({ error: err.message });
    }
});

// Criar novo projeto com upload
router.post('/', authMiddleware, upload.array('files', 10), async (req, res) => {
    const tmpFiles = (req.files || []).map(f => f.path);

    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos um arquivo' });
        }

        const slug = crypto.randomBytes(6).toString('hex');
        const mainFile = req.files[0];

        // Ler e enviar arquivo para storage
        const fileBuffer = fs.readFileSync(mainFile.path);
        const fileKey = await uploadFile(fileBuffer, mainFile.filename);

        const db = await getDb();
        db.run(
            `INSERT INTO projects (slug, name, description, file_name, file_size, file_type, file_key)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                slug,
                name,
                description || '',
                mainFile.originalname,
                mainFile.size,
                path.extname(mainFile.originalname).slice(1),
                fileKey
            ]
        );
        saveDb();

        res.json({
            success: true,
            slug,
            viewerUrl: `/v/${slug}`,
            message: 'Projeto criado com sucesso!'
        });

    } catch (err) {
        console.error('Erro no upload:', err);
        res.status(500).json({ error: err.message });
    } finally {
        // Limpar arquivos temporários
        tmpFiles.forEach(p => {
            try {
                if (fs.existsSync(p)) {
                    fs.unlinkSync(p);
                }
            } catch (_) {}
        });
    }
});

// Buscar um projeto específico
router.get('/:slug', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec(
            'SELECT id, slug, name, description, file_name, file_size, file_type, created_at FROM projects WHERE slug = ?',
            [req.params.slug]
        );
        
        if (!result[0] || !result[0].values.length) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }

        const cols = result[0].columns;
        const project = {};
        cols.forEach((col, i) => project[col] = result[0].values[0][i]);

        res.json(project);
    } catch (err) {
        console.error('Erro ao buscar projeto:', err);
        res.status(500).json({ error: err.message });
    }
});

// Deletar projeto
router.delete('/:slug', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        
        // Buscar file_key antes de deletar
        const result = db.exec('SELECT file_key FROM projects WHERE slug = ?', [req.params.slug]);
        if (result[0] && result[0].values.length) {
            const fileKey = result[0].values[0][0];
            if (fileKey) {
                await deleteFile(fileKey);
            }
        }

        db.run('DELETE FROM projects WHERE slug = ?', [req.params.slug]);
        saveDb();
        
        res.json({ success: true, message: 'Projeto removido com sucesso' });
    } catch (err) {
        console.error('Erro ao deletar projeto:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
