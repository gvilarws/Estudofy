import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Pool de conexões (melhor performance)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'senai103',
  database: process.env.DB_NAME || 'estudofy_omni',
  waitForConnections: true,
  connectionLimit: 10,
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_aqui', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ------------------- ROTAS -------------------

// Registro de usuário
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, password_hash]
    );
    res.status(201).json({ message: 'Usuário criado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'seu_segredo_aqui',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Listar usuários (protegido - só para admin, mas deixei como teste)
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, created_at FROM users');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Criar sessão (protegido)
app.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const {
      id, subject, duration, priority, method, topics, image_url
    } = req.body;
    const user_id = req.user.id;

    if (!id || !subject || !duration) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    await pool.query(
      `INSERT INTO sessions (id, user_id, subject, duration, priority, method, topics, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, subject, duration, priority || 'mid', method || 'pomodoro', topics || null, image_url || null]
    );
    res.status(201).json({ message: 'Sessão criada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Listar sessões do usuário logado (protegido)
app.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Atualizar sessão (ex.: concluir com relatório)
app.put('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, mood, mood_value, report_notes } = req.body;
    const user_id = req.user.id;

    // Verifica se a sessão pertence ao usuário
    const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [id, user_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    const completed_at = status === 'completed' ? new Date() : null;

    await pool.query(
      `UPDATE sessions SET status = ?, mood = ?, mood_value = ?, report_notes = ?, completed_at = ?
       WHERE id = ? AND user_id = ?`,
      [status || 'completed', mood || null, mood_value || null, report_notes || null, completed_at, id, user_id]
    );
    res.json({ message: 'Sessão atualizada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Deletar sessão
app.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const [result] = await pool.query('DELETE FROM sessions WHERE id = ? AND user_id = ?', [id, user_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }
    res.json({ message: 'Sessão deletada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});