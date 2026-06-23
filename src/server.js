'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/proxy', require('./routes/proxy'));

app.get('/v/:slug', (req, res) => res.sendFile(path.join(__dirname, '../client/public/viewer.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../client/public/admin.html')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  const { getDb } = require('./services/db');
  await getDb();
  app.listen(PORT, () => {
    console.log(`✅ Arq BIM rodando em http://localhost:${PORT}`);
  });
}

start().catch(console.error);