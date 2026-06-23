'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb, saveDb } = require('../services/db');
const { JWT_SECRET } = require('../config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
    }

    try {
        const db = await getDb();
        const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
        
        if (!result[0] || !result[0].values.length) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result[0].values[0];
        const valid = await bcrypt.compare(password, user[2]);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user[0], username: user[1] },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({ 
            token,
            user: { id: user[0], username: user[1] }
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.get('/me', authMiddleware, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
});

module.exports = router;
