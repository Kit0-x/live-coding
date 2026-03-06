const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// ========== SEGURIDAD ==========
// Helmet con política de recursos cruzados para imágenes
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' } // permite cargar imágenes desde el mismo sitio (mismo dominio, diferente puerto)
}));

// CORS restringido al frontend
app.use(cors({ origin: 'http://localhost:8080' }));

// Rate limiting global (200 peticiones cada 15 minutos)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones, intente más tarde' }
});
app.use('/api', limiter);

// Rate limiting más estricto para autenticación (5 intentos cada 15 minutos)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos, espere 15 minutos' }
});

// Middlewares estándar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== RUTAS ==========
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

app.use('/api', authRoutes);               // authLimiter se aplica dentro de auth.js
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// ========== INICIALIZAR BD ==========
const initDb = require('./db');
initDb();

// ========== MANEJADOR DE ERRORES GLOBAL (sin stack traces) ==========
app.use((err, req, res, next) => {
  console.error(err.stack); // Solo para logs internos, no se envía al cliente
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`Servidor backend en http://localhost:${port}`);
});