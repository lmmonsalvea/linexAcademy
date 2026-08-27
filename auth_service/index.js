const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/auth';
const jwtSecret = process.env.JWT_SECRET || 'devsecret';
const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ultragroupla.com,linextravel.com')
  .split(',')
  .map(d => d.trim().toLowerCase());
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const allowedRoles = ['empleado', 'instructor', 'admin_area', 'admin_rrhh', 'knowledge_manager', 'superadmin'];
let db;

MongoClient.connect(mongoUri)
  .then(client => {
    db = client.db();
    console.log('Connected to MongoDB (auth)');
  })
  .catch(err => console.error(err));

function emailDomainAllowed(email) {
  const parts = email.toLowerCase().split('@');
  return parts.length === 2 && allowedDomains.includes(parts[1]);
}

// Register: { email, password, name, role }
app.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing' });
  if (!emailDomainAllowed(email)) {
    return res.status(400).json({ error: `Solo se aceptan correos de: ${allowedDomains.join(', ')}` });
  }
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número' });
  }
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Debe ser uno de: ${allowedRoles.join(', ')}` });
  }
  const existing = await db.collection('users').findOne({ email });
  if (existing) return res.status(409).json({ error: 'Exists' });
  const hash = await bcrypt.hash(password, 10);
  const token = Math.random().toString(36).slice(2, 10);
  const user = { email, password: hash, name: name || '', role: role || 'empleado', verified: false, verifyToken: token, createdAt: new Date() };
  const result = await db.collection('users').insertOne(user);
  // For dev: return verification token in response (in prod send email)
  res.json({ id: result.insertedId, verifyToken: token });
});

// Verify: /verify?token=...
app.get('/verify', async (req, res) => {
  const token = req.query.token;
  const user = await db.collection('users').findOne({ verifyToken: token });
  if (!user) return res.status(404).json({ error: 'Token invalid' });
  await db.collection('users').updateOne({ _id: user._id }, { $set: { verified: true }, $unset: { verifyToken: '' } });
  res.json({ ok: true });
});

// Login: { email, password }
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection('users').findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid' });
  if (!user.verified) return res.status(403).json({ error: 'Not verified' });
  const token = jwt.sign({ sub: user._id.toString(), email: user.email, name: user.name, role: user.role || 'empleado' }, jwtSecret, { expiresIn: '8h' });
  res.json({ token });
});

// Simple protected route
app.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(parts[1], jwtSecret);
    res.json({ user: payload });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.listen(5000, () => console.log('Auth service listening on port 5000'));
