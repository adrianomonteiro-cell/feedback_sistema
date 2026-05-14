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
  ssl: {
    rejectUnauthorized: false,
  },
});

// testar conexão banco
pool.connect()
  .then(() => console.log('Banco conectado com sucesso'))
  .catch(err => console.error('Erro ao conectar no banco:', err));

// ✅ rota principal
app.get('/', (req, res) => {
  res.send('API funcionando 🚀');
});

// ✅ rota teste health
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    banco: 'ok',
  });
});

// ✅ buscar usuários
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar usuários');
  }
});

// ✅ salvar usuários
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

// ✅ captura erros gerais
process.on('uncaughtException', (err) => {
  console.error('Erro não tratado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Promise rejeitada:', err);
});

// ✅ porta Railway
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});