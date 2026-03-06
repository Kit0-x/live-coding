const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al abrir BD:', err.message);
  else console.log('Conectado a SQLite');
});

function initDb() {
  db.serialize(() => {
    // Tabla usuarios
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla productos (con campo imagen)
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio REAL NOT NULL,
        imagen TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Tabla pedidos
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Tabla detalle de pedidos
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price_at_purchase REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Insertar usuario demo si no existe
    db.get('SELECT id FROM users WHERE username = ?', ['demo'], (err, row) => {
      if (!row) {
        const hashed = bcrypt.hashSync('demo123', 10);
        db.run('INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
          ['demo@example.com', 'demo', hashed]);
      }
    });

    // Insertar productos de ejemplo si no hay ninguno
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
      if (row.count === 0) {
        const sampleProducts = [
          ['Leche', 'Leche entera 1L', 1.20],
          ['Pan', 'Barra de pan fresco', 0.90],
          ['Huevos', 'Docena de huevos ecológicos', 2.50],
          ['Arroz', 'Arroz redondo 1kg', 1.80],
          ['Aceite de oliva', 'Botella 1L', 4.50],
          ['Tomates', 'Tomates pera 1kg', 2.10],
          ['Pollo', 'Pollo entero 1kg', 5.30],
          ['Yogur', 'Pack 4 yogures naturales', 1.95],
          ['Café', 'Café molido 250g', 3.20],
          ['Galletas', 'Galletas digestivas 400g', 2.15]
        ];
        const stmt = db.prepare('INSERT INTO products (user_id, nombre, descripcion, precio) VALUES (?, ?, ?, ?)');
        sampleProducts.forEach(([nombre, desc, precio]) => {
          stmt.run([1, nombre, desc, precio]);
        });
        stmt.finalize();
        console.log('Productos de ejemplo insertados');
      }
    });
  });
}

module.exports = initDb;