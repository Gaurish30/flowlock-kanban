const path = require('path');
// Explicitly look for .env in the current directory (backend folder)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Debug check: This will print your URI or 'undefined' so you know immediately
console.log("MONGODB_URI check:", process.env.MONGODB_URI);

const authRoutes = require('./routes/auth');
const verifyToken = require('./middleware/auth');
const projectRoutes = require('./routes/projects'); 
const columnRoutes = require('./routes/columns'); 
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas (BE2)'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/columns', columnRoutes); 
app.use('/api/tasks', taskRoutes);

app.get('/api/protected-test', verifyToken, (req, res) => {
  res.json({ message: 'You have successfully accessed a protected route!', userId: req.userId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

