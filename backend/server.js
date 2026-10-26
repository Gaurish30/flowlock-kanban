require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', app: 'FlowLock Express API', database: states[mongoose.connection.readyState] || 'unknown' });
});
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Serve the static frontend from the sibling frontend directory.
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));

app.use((err, _req, res, _next) => {
  console.error('API error:', err.message);
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database is not connected. Check MONGODB_URI and Atlas network access.' });
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and configure Atlas.');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  app.listen(PORT, () => console.log(`FlowLock running at http://localhost:${PORT}`));
}
start().catch((error) => { console.error('Server startup failed:', error.message); process.exit(1); });
