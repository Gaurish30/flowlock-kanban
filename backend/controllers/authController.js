const bcrypt = require('bcryptjs');
const User = require('../models/User');

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt };
}

exports.register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a name and a valid email address.' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    return res.status(201).json({ message: 'User registered successfully.', user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    return res.json({ message: 'Login successful.', user: publicUser(user) });
  } catch (error) { next(error); }
};
