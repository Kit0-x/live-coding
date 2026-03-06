const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { sanitizeProduct } = require('../utils/sanitize');

const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Catálogo público (con datos sanitizados)
router.get('/', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener productos' });
    const sanitized = rows.map(sanitizeProduct);
    res.json(sanitized);
  });
});

// Mis productos (requiere autenticación)
router.get('/mine', authenticateToken, (req, res) => {
  db.all('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tus productos' });
    const sanitized = rows.map(sanitizeProduct);
    res.json(sanitized);
  });
});

// Crear producto con imagen
router.post('/', authenticateToken, upload.single('imagen'), [
  body('nombre').notEmpty().trim().escape().isLength({ max: 100 }),
  body('descripcion').optional().trim().escape().isLength({ max: 500 }),
  body('precio').isFloat({ min: 0.01 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nombre, descripcion, precio } = req.body;
  const userId = req.user.id;
  let imagen = null;
  if (req.file) {
    imagen = `/uploads/${req.file.filename}`;
  }

  db.run(
    'INSERT INTO products (user_id, nombre, descripcion, precio, imagen) VALUES (?, ?, ?, ?, ?)',
    [userId, nombre, descripcion, precio, imagen],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error al crear producto' });
      res.status(201).json({ id: this.lastID, nombre, descripcion, precio, imagen, user_id: userId });
    }
  );
});

// Editar producto (solo dueño)
router.put('/:id', authenticateToken, upload.single('imagen'), [
  body('nombre').notEmpty().trim().escape().isLength({ max: 100 }),
  body('descripcion').optional().trim().escape().isLength({ max: 500 }),
  body('precio').isFloat({ min: 0.01 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const productId = req.params.id;
  const userId = req.user.id;
  const { nombre, descripcion, precio } = req.body;
  let imagen = null;
  if (req.file) {
    imagen = `/uploads/${req.file.filename}`;
  }

  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) return res.status(500).json({ error: 'Error en BD' });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.user_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este producto' });
    }

    let sql = 'UPDATE products SET nombre = ?, descripcion = ?, precio = ?';
    let params = [nombre, descripcion, precio];
    if (imagen) {
      sql += ', imagen = ?';
      params.push(imagen);
    }
    sql += ' WHERE id = ?';
    params.push(productId);

    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: 'Error al actualizar' });
      res.json({ message: 'Producto actualizado' });
    });
  });
});

// Eliminar producto (solo dueño)
router.delete('/:id', authenticateToken, (req, res) => {
  const productId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) return res.status(500).json({ error: 'Error en BD' });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.user_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este producto' });
    }

    db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
      if (err) return res.status(500).json({ error: 'Error al eliminar' });
      res.json({ message: 'Producto eliminado' });
    });
  });
});

module.exports = router;