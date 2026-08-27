const express = require('express');
const cors = require('cors');

const { verifyToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const sessionRoutes = require('./routes/session');
const usersRoutes = require('./routes/users');
const coursesRoutes = require('./routes/courses');
const examsRoutes = require('./routes/exams');
const knowledgeRoutes = require('./routes/knowledge');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Every route below requires a verified Firebase ID token. Read-only public
// browsing (previously unauthenticated in the prototype) is intentionally
// removed now that real corporate SSO exists — see roles_permisos.md
// "Pendientes" section, now resolved.
app.use('/api/session', verifyToken, sessionRoutes);
app.use('/api/users', verifyToken, usersRoutes);
app.use('/api/courses', verifyToken, coursesRoutes);
app.use('/api/exams', verifyToken, examsRoutes);
app.use('/api/knowledge', verifyToken, knowledgeRoutes);

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));
app.use(errorHandler);

const port = process.env.PORT || 8081;
app.listen(port, () => console.log(`linexAcademy backend listening on :${port}`));
