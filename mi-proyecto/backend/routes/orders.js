const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Crear pedido (checkout)
router.post('/', authenticateToken, [
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isInt(),
  body('items.*.quantity').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const items = req.body.items;

  const productIds = items.map(i => i.product_id);
  const placeholders = productIds.map(() => '?').join(',');
  db.all(`SELECT id, precio FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
    if (err) return res.status(500).json({ error: 'Error al verificar productos' });

    let total = 0;
    const orderItems = [];
    for (let item of items) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Producto ${item.product_id} no existe` });
      }
      const subtotal = product.precio * item.quantity;
      total += subtotal;
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: product.precio
      });
    }
    // Redondear total a 2 decimales para evitar errores de punto flotante
    total = Math.round(total * 100) / 100;

    // Transacción
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al crear pedido' });
        }
        const orderId = this.lastID;

        const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)');
        for (let item of orderItems) {
          stmt.run([orderId, item.product_id, item.quantity, item.price_at_purchase], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al guardar detalles' });
            }
          });
        }
        stmt.finalize();

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al confirmar pedido' });
          }
          res.status(201).json({ orderId, total: total.toFixed(2), message: 'Pedido realizado' });
        });
      });
    });
  });
});

// Mis pedidos (compras)
router.get('/mine', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, orders) => {
    if (err) return res.status(500).json({ error: 'Error al obtener pedidos' });

    const promises = orders.map(order => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id], (err, items) => {
          if (err) reject(err);
          else {
            order.total = parseFloat(order.total).toFixed(2);
            order.items = items.map(i => ({
              ...i,
              price_at_purchase: parseFloat(i.price_at_purchase).toFixed(2)
            }));
            resolve(order);
          }
        });
      });
    });

    Promise.all(promises)
      .then(ordersWithItems => res.json(ordersWithItems))
      .catch(err => res.status(500).json({ error: 'Error al obtener detalles' }));
  });
});

module.exports = router;