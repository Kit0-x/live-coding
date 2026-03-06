// Escapa caracteres HTML para prevenir XSS
function escapeHtml(unsafe) {
    if (!unsafe) return unsafe;
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function sanitizeProduct(product) {
    return {
      ...product,
      nombre: escapeHtml(product.nombre),
      descripcion: escapeHtml(product.descripcion)
    };
  }
  
  module.exports = { escapeHtml, sanitizeProduct };