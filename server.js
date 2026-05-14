console.log('INICIANDO');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

console.log('MODULOS OK');

const app = express();

app.use(cors());
app.use(express.json());

console.log('CRIANDO POOL');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => {
    console.log('BANCO OK');
  })
  .catch((err) => {
    console.error('ERRO BANCO');
    console.error(err);
  });

app.get('/', (req, res) => {
  res.send('API funcionando');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'online'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('PORTA ' + PORT);
});