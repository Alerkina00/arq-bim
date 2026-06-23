'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../client/public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));

// Pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../client/public/admin.html')));
app.get('/v/:slug', (req, res) => res.sendFile(path.join(__dirname, '../client/public/viewer.html')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  await require('./services/db').getDb();
  app.listen(PORT, () => {
    console.log(`🚀 Arq BIM rodando em http://localhost:${PORT}`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin`);
  });
}

start().catch(console.error);