require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

// conexão com banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// rota teste
app.get('/', (req, res) => {
  res.send('Servidor rodando 🚀');
});

// rota GET usuarios
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar usuários');
  }
});

// iniciar servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});

app.post('/usuarios', async (req, res) => {
  const { nome } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nome) VALUES ($1) RETURNING *',
      [nome]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar');
  }
});