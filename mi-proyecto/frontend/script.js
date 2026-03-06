// ========== CONFIGURACIÓN ==========
const API_URL = 'http://localhost:3000/api';
const baseUrl = API_URL.replace('/api', ''); // http://localhost:3000

let currentUser = null;
let cart = [];

// Elementos del DOM
const viewContainer = document.getElementById('viewContainer');
const userDropdown = document.getElementById('userDropdown');
const usernameSpan = document.getElementById('usernameDisplay');
const loginNavItem = document.getElementById('loginNavItem');
const registerNavItem = document.getElementById('registerNavItem');
const logoutBtn = document.getElementById('logoutBtn');
const catalogoLink = document.getElementById('catalogoLink');
const misProductosLink = document.getElementById('misProductosLink');
const misComprasLink = document.getElementById('misComprasLink');

// Modales
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));

// ========== FUNCIONES AUXILIARES ==========
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : { 'Content-Type': 'application/json' };
}

function showAlert(message, type = 'success', container = viewContainer) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function updateUIForUser() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
        currentUser = JSON.parse(userData);
        usernameSpan.textContent = currentUser.username;
        userDropdown.style.display = 'block';
        loginNavItem.style.display = 'none';
        registerNavItem.style.display = 'none';
        misProductosLink.style.display = 'block';
        misComprasLink.style.display = 'block';
    } else {
        currentUser = null;
        userDropdown.style.display = 'none';
        loginNavItem.style.display = 'block';
        registerNavItem.style.display = 'block';
        misProductosLink.style.display = 'none';
        misComprasLink.style.display = 'none';
    }
}

// ========== CARGAR VISTAS ==========
function loadView(view) {
    switch(view) {
        case 'catalogo': renderCatalogo(); break;
        case 'misProductos':
            if (currentUser) renderMisProductos();
            else { showAlert('Debes iniciar sesión', 'warning'); renderCatalogo(); }
            break;
        case 'misCompras':
            if (currentUser) renderMisCompras();
            else { showAlert('Debes iniciar sesión', 'warning'); renderCatalogo(); }
            break;
        default: renderCatalogo();
    }
}

catalogoLink.addEventListener('click', (e) => { e.preventDefault(); loadView('catalogo'); });
misProductosLink.addEventListener('click', (e) => { e.preventDefault(); loadView('misProductos'); });
misComprasLink.addEventListener('click', (e) => { e.preventDefault(); loadView('misCompras'); });

// ========== CATÁLOGO ==========
async function renderCatalogo() {
    viewContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Cargando...</p></div>';
    try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) throw new Error('Error al cargar catálogo');
        const products = await res.json();

        let html = '<h2 class="view-title"><i class="fas fa-store me-2"></i>Catálogo</h2>';
        if (products.length === 0) {
            html += '<p class="text-muted">No hay productos.</p>';
        } else {
            html += '<div class="product-grid">';
            products.forEach(p => {
                const imageUrl = p.imagen ? baseUrl + p.imagen : 'https://via.placeholder.com/300x200?text=Sin+imagen';
                html += `
                    <div class="card product-card">
                        <img src="${imageUrl}" class="card-img-top" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Error'">
                        <div class="card-body">
                            <h5 class="card-title">${p.nombre}</h5>
                            <p class="card-text text-muted">${p.descripcion || ''}</p>
                            <p class="fw-bold text-primary fs-5">${parseFloat(p.precio).toFixed(2)} €</p>
                            ${currentUser ? `<button class="btn btn-primary w-100 add-to-cart" data-id="${p.id}" data-nombre="${p.nombre}" data-precio="${p.precio}"><i class="fas fa-cart-plus me-2"></i>Añadir</button>` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        viewContainer.innerHTML = html;
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const nombre = e.currentTarget.dataset.nombre;
                const precio = parseFloat(e.currentTarget.dataset.precio);
                addToCart({ id, nombre, precio });
            });
        });
    } catch (error) {
        viewContainer.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// ========== MIS PRODUCTOS ==========
async function renderMisProductos() {
    viewContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Cargando...</p></div>';
    try {
        const res = await fetch(`${API_URL}/products/mine`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Error al cargar productos');
        const products = await res.json();

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="view-title"><i class="fas fa-boxes me-2"></i>Mis productos</h2>
                <button class="btn btn-success" id="newProductBtn"><i class="fas fa-plus me-2"></i>Nuevo</button>
            </div>
        `;
        if (products.length === 0) {
            html += '<p class="text-muted">No has publicado nada.</p>';
        } else {
            html += '<div class="product-grid">';
            products.forEach(p => {
                const imageUrl = p.imagen ? baseUrl + p.imagen : 'https://via.placeholder.com/300x200?text=Sin+imagen';
                html += `
                    <div class="card">
                        <img src="${imageUrl}" class="card-img-top" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Error'">
                        <div class="card-body">
                            <h5 class="card-title">${p.nombre}</h5>
                            <p class="card-text text-muted">${p.descripcion || ''}</p>
                            <p class="fw-bold text-primary">${parseFloat(p.precio).toFixed(2)} €</p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary edit-product"
                                    data-id="${p.id}"
                                    data-nombre="${p.nombre}"
                                    data-desc="${p.descripcion || ''}"
                                    data-precio="${p.precio}"
                                    data-imagen="${p.imagen || ''}">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-product" data-id="${p.id}"><i class="fas fa-trash"></i> Eliminar</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        viewContainer.innerHTML = html;

        document.getElementById('newProductBtn').addEventListener('click', () => {
            document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Nuevo producto';
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            productModal.show();
        });

        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const nombre = e.currentTarget.dataset.nombre;
                const desc = e.currentTarget.dataset.desc;
                const precio = e.currentTarget.dataset.precio;
                const imagen = e.currentTarget.dataset.imagen;

                document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Editar producto';
                document.getElementById('productId').value = id;
                document.getElementById('productName').value = nombre;
                document.getElementById('productDesc').value = desc;
                document.getElementById('productPrice').value = precio;

                const preview = document.getElementById('imagePreview');
                if (imagen) {
                    preview.innerHTML = `<img src="${baseUrl + imagen}" class="img-thumbnail" style="max-width: 100px;">`;
                } else {
                    preview.innerHTML = '';
                }
                productModal.show();
            });
        });

        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('¿Eliminar?')) return;
                const id = e.currentTarget.dataset.id;
                try {
                    const res = await fetch(`${API_URL}/products/${id}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    if (res.ok) {
                        showAlert('Producto eliminado', 'success');
                        renderMisProductos();
                    } else {
                        const data = await res.json();
                        showAlert(data.error || 'Error', 'danger');
                    }
                } catch (error) {
                    showAlert('Error de conexión', 'danger');
                }
            });
        });
    } catch (error) {
        viewContainer.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// ========== MIS COMPRAS ==========
async function renderMisCompras() {
    viewContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Cargando...</p></div>';
    try {
        const res = await fetch(`${API_URL}/orders/mine`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Error al cargar compras');
        const orders = await res.json();

        let html = '<h2 class="view-title"><i class="fas fa-receipt me-2"></i>Mis compras</h2>';
        if (orders.length === 0) {
            html += '<p class="text-muted">No has realizado compras.</p>';
        } else {
            orders.forEach(order => {
                html += `
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            Pedido #${order.id} · ${new Date(order.created_at).toLocaleDateString()} · Total: <strong>${order.total} €</strong>
                        </div>
                        <div class="card-body">
                            <ul class="list-group">
                `;
                order.items.forEach(item => {
                    html += `
                        <li class="list-group-item d-flex justify-content-between">
                            <span>Producto ID ${item.product_id} x ${item.quantity}</span>
                            <span>${item.price_at_purchase} €/u</span>
                        </li>
                    `;
                });
                html += '</ul></div></div>';
            });
        }
        viewContainer.innerHTML = html;
    } catch (error) {
        viewContainer.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// ========== CARRITO ==========
function addToCart(product) {
    const existing = cart.find(item => item.product.id == product.id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ product, quantity: 1 });
    }
    updateCartCount();
    showAlert(`${product.nombre} añadido al carrito`, 'success');
}

function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function renderCartModal() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="text-muted">Carrito vacío</p>';
        cartTotalSpan.textContent = '0.00';
        return;
    }
    let html = '<ul class="list-group">';
    let total = 0;
    cart.forEach((item, index) => {
        const subtotal = item.product.precio * item.quantity;
        total += subtotal;
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${item.product.nombre}</strong><br>
                    <small>${item.product.precio} € x ${item.quantity}</small>
                </div>
                <span class="badge bg-primary rounded-pill">${subtotal.toFixed(2)} €</span>
                <button class="btn btn-sm btn-danger remove-item" data-index="${index}"><i class="fas fa-trash"></i></button>
            </li>
        `;
    });
    html += '</ul>';
    cartItemsDiv.innerHTML = html;
    cartTotalSpan.textContent = total.toFixed(2);

    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            cart.splice(index, 1);
            renderCartModal();
            updateCartCount();
        });
    });
}

document.getElementById('cartButton').addEventListener('click', () => {
    renderCartModal();
    cartModal.show();
});

document.getElementById('checkoutBtn').addEventListener('click', async () => {
    if (!currentUser) {
        showAlert('Debes iniciar sesión', 'warning');
        cartModal.hide();
        return;
    }
    if (cart.length === 0) {
        showAlert('Carrito vacío', 'warning');
        return;
    }
    const items = cart.map(item => ({
        product_id: parseInt(item.product.id),
        quantity: item.quantity
    }));
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ items })
        });
        const data = await res.json();
        if (res.ok) {
            showAlert('¡Compra realizada!', 'success');
            cart = [];
            updateCartCount();
            cartModal.hide();
        } else {
            showAlert(data.error || 'Error al procesar', 'danger');
        }
    } catch (error) {
        showAlert('Error de conexión', 'danger');
    }
});

// ========== AUTENTICACIÓN ==========
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            updateUIForUser();
            loginModal.hide();
            showAlert(`Bienvenido, ${data.user.username}!`, 'success');
            renderCatalogo();
        } else {
            showAlert(data.error || 'Credenciales inválidas', 'danger');
        }
    } catch (error) {
        showAlert('Error de conexión', 'danger');
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    if (password !== confirm) {
        showAlert('Las contraseñas no coinciden', 'danger');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        const data = await res.json();
        if (res.ok) {
            showAlert('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            registerModal.hide();
            document.getElementById('loginForm').reset();
        } else {
            showAlert(data.error || 'Error en el registro', 'danger');
        }
    } catch (error) {
        showAlert('Error de conexión', 'danger');
    }
});

// ========== CREAR/EDITAR PRODUCTO ==========
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const nombre = document.getElementById('productName').value;
    const descripcion = document.getElementById('productDesc').value;
    const precio = parseFloat(document.getElementById('productPrice').value);
    const imagenFile = document.getElementById('productImage').files[0];

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('descripcion', descripcion);
    formData.append('precio', precio);
    if (imagenFile) {
        formData.append('imagen', imagenFile);
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        if (res.ok) {
            showAlert(id ? 'Producto actualizado' : 'Producto creado', 'success');
            productModal.hide();
            renderMisProductos();
        } else {
            const data = await res.json();
            showAlert(data.error || 'Error', 'danger');
        }
    } catch (error) {
        showAlert('Error de conexión', 'danger');
    }
});

// ========== LOGOUT ==========
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    cart = [];
    updateUIForUser();
    renderCatalogo();
    showAlert('Sesión cerrada', 'info');
});

// ========== INICIO ==========
updateUIForUser();
renderCatalogo();