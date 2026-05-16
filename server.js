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
  ssl: { rejectUnauthorized: false }
});

// Garante que a tabela existe com todos os campos necessários
pool.query(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    nome            TEXT    NOT NULL,
    login           TEXT    UNIQUE NOT NULL,
    senha           TEXT    NOT NULL DEFAULT '123',
    perfil          TEXT    NOT NULL DEFAULT 'atendente',
    turno           TEXT    DEFAULT '',
    primeiro_acesso BOOLEAN DEFAULT TRUE,
    criado_em       TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => console.log('TABELA OK'))
  .catch(err => console.error('ERRO TABELA', err));

pool.query('SELECT NOW()')
  .then(() => console.log('BANCO OK'))
  .catch(err => console.error('ERRO BANCO', err));

// ── rotas básicas ──────────────────────────────────────────────
app.get('/', (req, res) => res.send('API funcionando'));

app.get('/health', (req, res) => res.json({ status: 'online' }));

// ── GET /usuarios ──────────────────────────────────────────────
// Retorna todos os usuários do banco mapeados para camelCase
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, login, senha, perfil, turno, primeiro_acesso FROM usuarios ORDER BY id'
    );

    const usuarios = result.rows.map(u => ({
      id:             u.id,
      nome:           u.nome,
      login:          u.login,
      senha:          u.senha,
      perfil:         u.perfil,
      turno:          u.turno || '',
      primeiroAcesso: u.primeiro_acesso !== null ? u.primeiro_acesso : true
    }));

    res.json(usuarios);
  } catch (err) {
    console.error('GET /usuarios erro:', err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// ── POST /usuarios ─────────────────────────────────────────────
// Salva novo usuário com todos os campos, incluindo senha e primeiro_acesso
app.post('/usuarios', async (req, res) => {
  const {
    nome,
    login,
    senha          = '123',
    perfil         = 'atendente',
    turno          = '',
    primeiroAcesso = true
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO usuarios (nome, login, senha, perfil, turno, primeiro_acesso)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, login, senha, perfil, turno, primeiro_acesso`,
      [nome, login, senha, perfil, turno, primeiroAcesso]
    );

    const u = result.rows[0];
    res.json({
      id:             u.id,
      nome:           u.nome,
      login:          u.login,
      senha:          u.senha,
      perfil:         u.perfil,
      turno:          u.turno || '',
      primeiroAcesso: u.primeiro_acesso
    });
  } catch (err) {
    console.error('POST /usuarios erro:', err);
    // Login duplicado
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Login já está em uso' });
    }
    res.status(500).json({ erro: 'Erro ao salvar usuário' });
  }
});

// ── PUT /usuarios/:id ──────────────────────────────────────────
// Atualiza senha e/ou primeiro_acesso (usado ao trocar senha no primeiro acesso)
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { senha, primeiroAcesso } = req.body;

  try {
    await pool.query(
      `UPDATE usuarios SET
         senha           = COALESCE($1, senha),
         primeiro_acesso = COALESCE($2, primeiro_acesso)
       WHERE id = $3`,
      [senha || null, primeiroAcesso !== undefined ? primeiroAcesso : null, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /usuarios/:id erro:', err);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
});

// ── DELETE /usuarios/:id ───────────────────────────────────────
app.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /usuarios/:id erro:', err);
    res.status(500).json({ erro: 'Erro ao remover usuário' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('PORTA ' + PORT));