'use strict';
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

module.exports = (req, res, next) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = auth.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }
};
