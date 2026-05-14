rconsole.log('INICIANDO SERVIDOR...');

require('dotenv').config();
console.log('DOTENV OK');

const express = require('express');
console.log('EXPRESS OK');

const cors = require('cors');
console.log('CORS OK');

const { Pool } = require('pg');
console.log('PG OK');

const app = express();

app.use(cors());
app.use(express.json());

console.log('CRIANDO CONEXAO BANCO...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => {
    console.log('BANCO CONECTADO');
  })
  .catch(err => {
    console.error('ERRO BANCO:', err);
  });

app.get('/', (req, res) => {
  res.send('API funcionando 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('SERVIDOR RODANDO NA PORTA ' + PORT);
});