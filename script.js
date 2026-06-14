// ========== 1. تعريف المفاتيح والبيانات ==========
const STORAGE_PRODUCTS = "pos_products";
const STORAGE_INVOICES = "pos_invoices";
let products = [];
let invoices = [];
let currentCart = [];

// DOM elements
let currentTab = "pos";

// ========== 2. الدوال الأساسية (CRUD) ==========
function loadData() {
    const storedProducts = localStorage.getItem(STORAGE_PRODUCTS);
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        // بيانات افتراضية للتجربة
        products = [
            { id: "1", name: "خبز", price: 5.00, stock: 50 },
            { id: "2", name: "حليب", price: 12.00, stock: 30 },
            { id: "3", name: "سكر", price: 15.00, stock: 20 }
        ];
        saveProducts();
    }
    const storedInvoices = localStorage.getItem(STORAGE_INVOICES);
    invoices = storedInvoices ? JSON.parse(storedInvoices) : [];
}

function saveProducts() { localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products)); }
function saveInvoices() { localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices)); }

function addProduct(product) { products.push(product); saveProducts(); }
function updateProduct(id, updated) { const index = products.findIndex(p => p.id == id); if(index !== -1) { products[index] = {...products[index], ...updated}; saveProducts(); } }
function deleteProduct(id) { products = products.filter(p => p.id != id); saveProducts(); }

function generateInvoiceId() { return 'INV-' + Date.now(); }
function addInvoice(invoice) { invoices.push(invoice); saveInvoices(); }

// ========== 3. دوال واجهة المستخدم (UI) ==========
function renderDateTime() {
    const now = new Date();
    const formatted = now.toLocaleDateString("ar-EG") + " " + now.toLocaleTimeString("ar-EG");
    const dateTimeEl = document.getElementById("dateTime");
    if(dateTimeEl) dateTimeEl.innerText = formatted;
}
setInterval(renderDateTime, 1000);

function renderProductsGrid(filter = "") {
    const container = document.getElementById("productsGrid");
    if(!container) return;
    const filtered = products.filter(p => p.name.includes(filter));
    if(filtered.length === 0) { container.innerHTML = "<div class='empty-msg'>لا توجد منتجات</div>"; return; }
    let html = "";
    for(let p of filtered) {
        html += `<div class='product-card' data-id='${p.id}'>
                    <div class='product-name'>${p.name}</div>
                    <div class='product-price'>${p.price} ج.م</div>
                    <div style='font-size:0.7rem; color:#666'>المخزون: ${p.stock}</div>
                </div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            const product = products.find(p => p.id == id);
            if(product && product.stock > 0) addToCart(product);
            else alert("المنتج غير متوفر في المخزون");
        });
    });
}

function addToCart(product) {
    const existing = currentCart.find(item => item.id == product.id);
    if(existing) { existing.quantity++; }
    else { currentCart.push({...product, quantity: 1}); }
    renderCart();
}

function renderCart() {
    const container = document.getElementById("cartItems");
    const totalSpan = document.getElementById("cartTotal");
    if(!container) return;
    if(currentCart.length === 0) { container.innerHTML = "<div class='empty-msg'>السلة فارغة</div>"; if(totalSpan) totalSpan.innerText = "0.00"; return; }
    let total = 0;
    let html = "";
    for(let item of currentCart) {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `<div class='cart-item' data-id='${item.id}'>
                    <div class='cart-item-info'>
                        <div class='cart-item-title'>${item.name}</div>
                        <div class='cart-item-price'>${item.price} ج.م</div>
                    </div>
                    <div class='cart-item-controls'>
                        <button class='cart-qty-minus' data-id='${item.id}'>-</button>
                        <span>${item.quantity}</span>
                        <button class='cart-qty-plus' data-id='${item.id}'>+</button>
                        <button class='cart-remove' data-id='${item.id}'>🗑️</button>
                    </div>
                </div>`;
    }
    container.innerHTML = html;
    if(totalSpan) totalSpan.innerText = total.toFixed(2);
    // attach events
    document.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', (e) => { const id = btn.getAttribute('data-id'); updateCartQuantity(id, -1); });
    });
    document.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', (e) => { const id = btn.getAttribute('data-id'); updateCartQuantity(id, 1); });
    });
    document.querySelectorAll('.cart-remove').forEach(btn => {
        btn.addEventListener('click', (e) => { const id = btn.getAttribute('data-id'); removeFromCart(id); });
    });
}

function updateCartQuantity(productId, delta) {
    const item = currentCart.find(i => i.id == productId);
    if(item) {
        item.quantity += delta;
        if(item.quantity <= 0) { currentCart = currentCart.filter(i => i.id != productId); }
        else {
            const product = products.find(p => p.id == productId);
            if(product && item.quantity > product.stock) { alert("لا يمكن تجاوز الكمية المتاحة في المخزون"); item.quantity = product.stock; }
        }
        renderCart();
    }
}

function removeFromCart(productId) { currentCart = currentCart.filter(i => i.id != productId); renderCart(); }

function checkout() {
    if(currentCart.length === 0) { alert("السلة فارغة"); return; }
    // check stock
    for(let item of currentCart) {
        const product = products.find(p => p.id == item.id);
        if(!product || product.stock < item.quantity) { alert(`الكمية المطلوبة من ${item.name} غير متوفرة`); return; }
    }
    // reduce stock
    for(let item of currentCart) {
        const product = products.find(p => p.id == item.id);
        product.stock -= item.quantity;
    }
    saveProducts();
    // create invoice
    const total = currentCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const invoice = {
        id: generateInvoiceId(),
        date: new Date().toISOString(),
        items: JSON.parse(JSON.stringify(currentCart)),
        total: total
    };
    addInvoice(invoice);
    currentCart = [];
    renderCart();
    renderProductsGrid(document.getElementById("productSearch")?.value || "");
    renderProductsTable();
    renderInvoices();
    renderReports();
    alert("تمت عملية البيع بنجاح");
}

// ========== 4. إدارة المنتجات (جدول) ==========
function renderProductsTable() {
    const container = document.getElementById("productsTable");
    if(!container) return;
    if(products.length === 0) { container.innerHTML = "<div class='empty-msg'>لا توجد منتجات</div>"; return; }
    let html = "<table><thead><tr><th>الرقم</th><th>الاسم</th><th>السعر</th><th>المخزون</th><th>إجراءات</th></tr></thead><tbody>";
    for(let p of products) {
        html += `<tr>
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td>${p.price}</td>
                    <td>${p.stock}</td>
                    <td><button class='action-btn edit-btn' data-id='${p.id}'>تعديل</button><button class='action-btn' data-id='${p.id}'>حذف</button></td>
                </tr>`;
    }
    html += "</tbody></table>";
    container.innerHTML = html;
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { const id = btn.getAttribute('data-id'); editProduct(id); });
    });
    document.querySelectorAll('.action-btn:not(.edit-btn)').forEach(btn => {
        btn.addEventListener('click', (e) => { const id = btn.getAttribute('data-id'); if(confirm("هل أنت متأكد من الحذف؟")) { deleteProduct(id); renderProductsTable(); renderProductsGrid(); } });
    });
}

function editProduct(id) {
    const product = products.find(p => p.id == id);
    if(product) {
        document.getElementById("prodId").value = product.id;
        document.getElementById("prodName").value = product.name;
        document.getElementById("prodPrice").value = product.price;
        document.getElementById("prodStock").value = product.stock;
    }
}

function saveProductFromForm() {
    const id = document.getElementById("prodId").value.trim();
    const name = document.getElementById("prodName").value.trim();
    const price = parseFloat(document.getElementById("prodPrice").value);
    const stock = parseInt(document.getElementById("prodStock").value);
    if(!name || isNaN(price) || isNaN(stock)) { alert("يرجى إدخال جميع البيانات بشكل صحيح"); return; }
    if(id) { updateProduct(id, { name, price, stock }); }
    else { const newId = Date.now().toString(); addProduct({ id: newId, name, price, stock }); }
    clearProductForm();
    renderProductsTable();
    renderProductsGrid(document.getElementById("productSearch")?.value || "");
}

function clearProductForm() {
    document.getElementById("prodId").value = "";
    document.getElementById("prodName").value = "";
    document.getElementById("prodPrice").value = "";
    document.getElementById("prodStock").value = "";
}

// ========== 5. الفواتير ==========
function renderInvoices() {
    const container = document.getElementById("invoicesList");
    if(!container) return;
    if(invoices.length === 0) { container.innerHTML = "<div class='empty-msg'>لا توجد فواتير بعد</div>"; return; }
    let html = "";
    for(let inv of invoices.slice().reverse()) {
        html += `<div class='invoice-card'>
                    <div><strong>رقم الفاتورة:</strong> ${inv.id}</div>
                    <div><strong>التاريخ:</strong> ${new Date(inv.date).toLocaleString("ar-EG")}</div>
                    <div><strong>الإجمالي:</strong> ${inv.total.toFixed(2)} ج.م</div>
                    <details><summary>عرض التفاصيل</summary>
                        <ul>${inv.items.map(item => `<li>${item.name} x ${item.quantity} = ${(item.price*item.quantity).toFixed(2)} ج.م</li>`).join('')}</ul>
                    </details>
                </div>`;
    }
    container.innerHTML = html;
}

// ========== 6. التقارير ==========
function renderReports() {
    const totalSalesSpan = document.getElementById("totalSales");
    const invoicesCountSpan = document.getElementById("invoicesCount");
    if(totalSalesSpan) {
        const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
        totalSalesSpan.innerText = total.toFixed(2) + " ج.م";
    }
    if(invoicesCountSpan) invoicesCountSpan.innerText = invoices.length;
}

// ========== 7. التنقل بين الأقسام ==========
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabId}Tab`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-tab="${tabId}"]`).classList.add('active');
    if(tabId === 'products') renderProductsTable();
    if(tabId === 'invoices') renderInvoices();
    if(tabId === 'reports') renderReports();
}

// ========== 8. التهيئة (Initialization) ==========
function init() {
    loadData();
    renderDateTime();
    renderProductsGrid();
    renderCart();
    renderProductsTable();
    renderInvoices();
    renderReports();
    // Event listeners
    document.getElementById("productSearch")?.addEventListener("input", (e) => renderProductsGrid(e.target.value));
    document.getElementById("clearCartBtn")?.addEventListener("click", () => { currentCart = []; renderCart(); });
    document.getElementById("checkoutBtn")?.addEventListener("click", checkout);
    document.getElementById("saveProductBtn")?.addEventListener("click", saveProductFromForm);
    document.getElementById("cancelEditBtn")?.addEventListener("click", clearProductForm);
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });
}
init();
