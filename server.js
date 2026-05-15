require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

console.log('INICIANDO');

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()')
  .then(() => console.log('BANCO OK'))
  .catch(err => console.error('ERRO BANCO', err));

// rota principal
app.get('/', (req, res) => {
  res.send('API funcionando');
});

// health
app.get('/health', (req, res) => {
  res.json({
    status: 'online'
  });
});

// GET usuarios
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar usuários');
  }
});

// POST usuarios
app.post('/usuarios', async (req, res) => {
  const { nome, login, perfil, turno } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nome, login, perfil, turno) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, login, perfil, turno]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar usuário');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('PORTA ' + PORT);
});