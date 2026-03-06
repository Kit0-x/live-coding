const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);
const SECRET = process.env.JWT_SECRET;

// Helper para retardo
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Registro con mensaje genérico y retardo
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashed],
      async function(err) {
        // Retardo artificial para evitar timing attacks
        await delay(500);
        if (err) {
          // Mensaje genérico, no revelar duplicado
          return res.status(409).json({ error: 'No se pudo crear el usuario. Intente con otros datos.' });
        }
        res.status(201).json({ message: 'Usuario creado correctamente' });
      }
    );
  } catch (error) {
    await delay(500);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Login con mensaje genérico y retardo
router.post('/login', [
  body('username').trim().escape(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    await delay(500); // retardo uniforme

    if (err) return res.status(500).json({ error: 'Error en el servidor' });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  });
});

module.exports = router;