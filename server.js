require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { Pool } = require('pg');

console.log('INICIANDO');
const app = express();
app.use(cors({ origin:'*', methods:['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders:['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });

// Keep-alive
setInterval(()=>{ require('https').get('https://feedback-sistema.onrender.com/health',()=>{}).on('error',()=>{}); }, 14*60*1000);

async function criarTabelas(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY, nome TEXT NOT NULL, login TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL DEFAULT '123', perfil TEXT NOT NULL DEFAULT 'atendente',
      turno TEXT DEFAULT '', primeiro_acesso BOOLEAN DEFAULT TRUE, criado_em TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vinculos (
      id SERIAL PRIMARY KEY, atendente_id INTEGER NOT NULL, gestor_id INTEGER NOT NULL,
      UNIQUE(atendente_id, gestor_id)
    );
    CREATE TABLE IF NOT EXISTS canais (
      id SERIAL PRIMARY KEY, nome TEXT UNIQUE NOT NULL, criado_em TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id SERIAL PRIMARY KEY, atendente_id INTEGER NOT NULL, gestor_id INTEGER NOT NULL,
      data TIMESTAMP NOT NULL, duracao TEXT DEFAULT '', protocolo TEXT DEFAULT '',
      canal TEXT DEFAULT '', turno TEXT DEFAULT '', nota NUMERIC(5,2) NOT NULL DEFAULT 0,
      relato TEXT DEFAULT '', penalidade TEXT DEFAULT 'nao', pen_tipo TEXT DEFAULT '',
      pen_obs TEXT DEFAULT '', observacoes JSONB DEFAULT '[]', criado_em TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS feedbacks (
      id SERIAL PRIMARY KEY, avaliacao_id INTEGER NOT NULL UNIQUE,
      texto TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pendente',
      gestor_id INTEGER, data_conclusao TIMESTAMP, criado_em TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('TABELAS OK');
}
criarTabelas().catch(err=>console.error('ERRO TABELAS:',err));
pool.query('SELECT NOW()').then(()=>console.log('BANCO OK')).catch(err=>console.error('ERRO BANCO:',err));

app.get('/', (req,res)=>res.send('API funcionando'));
app.get('/health', (req,res)=>res.json({status:'online'}));

// USUARIOS
app.get('/usuarios', async(req,res)=>{
  try{
    const r=await pool.query('SELECT id,nome,login,senha,perfil,turno,primeiro_acesso FROM usuarios ORDER BY id');
    res.json(r.rows.map(u=>({id:u.id,nome:u.nome,login:u.login,senha:u.senha,perfil:u.perfil,turno:u.turno||'',primeiroAcesso:u.primeiro_acesso??true})));
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao buscar usuários'});}
});
app.post('/usuarios', async(req,res)=>{
  const{nome,login,senha='123',perfil='atendente',turno='',primeiroAcesso=true}=req.body;
  try{
    const r=await pool.query(
      `INSERT INTO usuarios(nome,login,senha,perfil,turno,primeiro_acesso) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,nome,login,senha,perfil,turno,primeiro_acesso`,
      [nome,login,senha,perfil,turno,primeiroAcesso]
    );
    const u=r.rows[0];
    res.json({id:u.id,nome:u.nome,login:u.login,senha:u.senha,perfil:u.perfil,turno:u.turno||'',primeiroAcesso:u.primeiro_acesso});
  }catch(err){
    if(err.code==='23505')return res.status(409).json({erro:'Login já em uso'});
    console.error(err);res.status(500).json({erro:'Erro ao salvar usuário'});
  }
});
app.put('/usuarios/:id', async(req,res)=>{
  const{nome,login,perfil,turno,senha,primeiroAcesso}=req.body;
  try{
    await pool.query(
      `UPDATE usuarios SET nome=COALESCE($1,nome),login=COALESCE($2,login),perfil=COALESCE($3,perfil),turno=COALESCE($4,turno),senha=COALESCE($5,senha),primeiro_acesso=COALESCE($6,primeiro_acesso) WHERE id=$7`,
      [nome||null,login||null,perfil||null,turno!==undefined?turno:null,senha||null,primeiroAcesso!==undefined?primeiroAcesso:null,req.params.id]
    );
    res.json({ok:true});
  }catch(err){
    if(err.code==='23505')return res.status(409).json({erro:'Login já em uso'});
    console.error(err);res.status(500).json({erro:'Erro ao atualizar usuário'});
  }
});
app.delete('/usuarios/:id', async(req,res)=>{
  try{
    await pool.query('DELETE FROM vinculos WHERE atendente_id=$1 OR gestor_id=$1',[req.params.id]);
    await pool.query('DELETE FROM usuarios WHERE id=$1',[req.params.id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao remover usuário'});}
});

// VINCULOS
app.get('/vinculos', async(req,res)=>{
  try{
    const r=await pool.query('SELECT atendente_id,gestor_id FROM vinculos ORDER BY atendente_id');
    const v={};
    r.rows.forEach(row=>{if(!v[row.atendente_id])v[row.atendente_id]=[];v[row.atendente_id].push(row.gestor_id);});
    res.json(v);
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao buscar vínculos'});}
});
app.post('/vinculos', async(req,res)=>{
  const{atendenteId,gestorId}=req.body;
  try{
    await pool.query('INSERT INTO vinculos(atendente_id,gestor_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[atendenteId,gestorId]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao criar vínculo'});}
});
app.delete('/vinculos', async(req,res)=>{
  const{atendenteId,gestorId}=req.body;
  try{
    await pool.query('DELETE FROM vinculos WHERE atendente_id=$1 AND gestor_id=$2',[atendenteId,gestorId]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao remover vínculo'});}
});

// CANAIS
app.get('/canais', async(req,res)=>{
  try{const r=await pool.query('SELECT id,nome FROM canais ORDER BY id');res.json(r.rows);}
  catch(err){console.error(err);res.status(500).json({erro:'Erro ao buscar canais'});}
});
app.post('/canais', async(req,res)=>{
  const{nome}=req.body;
  try{
    const r=await pool.query('INSERT INTO canais(nome) VALUES($1) ON CONFLICT(nome) DO NOTHING RETURNING id,nome',[nome.toUpperCase()]);
    if(!r.rows.length)return res.status(409).json({erro:'Canal já existe'});
    res.json(r.rows[0]);
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao criar canal'});}
});
app.put('/canais/:id', async(req,res)=>{
  const{nome}=req.body;
  try{await pool.query('UPDATE canais SET nome=$1 WHERE id=$2',[nome.toUpperCase(),req.params.id]);res.json({ok:true});}
  catch(err){console.error(err);res.status(500).json({erro:'Erro ao editar canal'});}
});
app.delete('/canais/:id', async(req,res)=>{
  try{await pool.query('DELETE FROM canais WHERE id=$1',[req.params.id]);res.json({ok:true});}
  catch(err){console.error(err);res.status(500).json({erro:'Erro ao excluir canal'});}
});

// AVALIACOES
app.get('/avaliacoes', async(req,res)=>{
  try{
    const r=await pool.query('SELECT * FROM avaliacoes ORDER BY id');
    res.json(r.rows.map(a=>({
      id:a.id, atendenteId:a.atendente_id, gestorId:a.gestor_id,
      data:a.data, duracao:a.duracao||'', protocolo:a.protocolo||'',
      canal:a.canal||'', turno:a.turno||'', nota:parseFloat(a.nota),
      relato:a.relato||'', penalidade:a.penalidade||'nao',
      penTipo:a.pen_tipo||'', penObs:a.pen_obs||'', observacoes:a.observacoes||[]
    })));
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao buscar avaliações'});}
});
app.post('/avaliacoes', async(req,res)=>{
  const{atendenteId,gestorId,data,duracao,protocolo,canal,turno,nota,relato,penalidade,penTipo,penObs,observacoes}=req.body;
  try{
    const r=await pool.query(
      `INSERT INTO avaliacoes(atendente_id,gestor_id,data,duracao,protocolo,canal,turno,nota,relato,penalidade,pen_tipo,pen_obs,observacoes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [atendenteId,gestorId,data,duracao||'',protocolo||'',canal||'',turno||'',nota,relato||'',penalidade||'nao',penTipo||'',penObs||'',JSON.stringify(observacoes||[])]
    );
    res.json({id:r.rows[0].id});
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao salvar avaliação'});}
});

// FEEDBACKS
app.get('/feedbacks', async(req,res)=>{
  try{
    const r=await pool.query('SELECT * FROM feedbacks ORDER BY avaliacao_id');
    const f={};
    r.rows.forEach(fb=>{f[fb.avaliacao_id]={avaliacaoId:fb.avaliacao_id,texto:fb.texto||'',status:fb.status||'pendente',gestorId:fb.gestor_id,dataConclusao:fb.data_conclusao};});
    res.json(f);
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao buscar feedbacks'});}
});
app.post('/feedbacks', async(req,res)=>{
  const{avaliacaoId,texto='',status='pendente',gestorId=null,dataConclusao=null}=req.body;
  try{
    await pool.query(
      `INSERT INTO feedbacks(avaliacao_id,texto,status,gestor_id,data_conclusao) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(avaliacao_id) DO UPDATE SET texto=$2,status=$3,gestor_id=$4,data_conclusao=$5`,
      [avaliacaoId,texto,status,gestorId,dataConclusao]
    );
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({erro:'Erro ao salvar feedback'});}
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('PORTA '+PORT));