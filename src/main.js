import './style.css';
import { storageService } from './storage.js';
import { formatCurrency, formatDateTime, printReceipt, printSalesReport } from './printer.js';
import { calculateCartTotals, addItemToCart, updateCartQuantity, getCartItemKey } from './cart.js';
import { calculateCashChange, createOrderPayload } from './order.js';
import { canAddToCart, validateProductInput } from './inventory.js';
import { getOptionsForCategory } from './options.js';

// State
let products = [];
let cart = []; // Array<{ product: Product, qty: number, options?: string }>
let selectedCategory = 'ทั้งหมด';
let lastCompletedOrder = null;
let currentPaymentMode = 'cash';
let storeProfile = storageService.getStoreProfile();
let pendingOptionProduct = null;
let selectedOptionPresets = new Set();

// Cached DOM Elements
const productsGrid = document.getElementById('products-grid');
const categoriesContainer = document.getElementById('categories-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartItemCount = document.getElementById('cart-item-count');
const cartTotalQty = document.getElementById('cart-total-qty');
const cartTotalPrice = document.getElementById('cart-total-price');
const btnCheckout = document.getElementById('btn-checkout');
const btnClearCart = document.getElementById('btn-clear-cart');
const searchInput = document.getElementById('search-input');

async function init() {
  setupEventListeners();
  updateStoreProfileUI();
  await refreshProducts();
  renderCart();
}

function updateStoreProfileUI() {
  storeProfile = storageService.getStoreProfile();
  const nameEl = document.getElementById('display-store-name');
  const branchEl = document.getElementById('display-store-branch');
  const logoEl = document.getElementById('brand-logo-letter');

  if (nameEl) nameEl.textContent = storeProfile.name || 'POS Store';
  if (branchEl) branchEl.textContent = storeProfile.branch || 'Counter Terminal';
  if (logoEl) logoEl.textContent = (storeProfile.name || 'P').charAt(0).toUpperCase();
}

async function refreshProducts() {
  products = await storageService.getProducts();
  renderCategories();
  renderProducts();
  renderManagementTable();
  populateCategorySelect();
}

function renderCategories() {
  const allCategories = storageService.getAllCategories(products);
  const cats = ['ทั้งหมด', ...allCategories];
  categoriesContainer.innerHTML = cats.map(cat => `
    <button class="category-pill ${cat === selectedCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');
}

function populateCategorySelect(selectedVal = '') {
  const selectEl = document.getElementById('select-prod-category');
  const customInput = document.getElementById('input-prod-category-custom');
  const hiddenInput = document.getElementById('input-prod-category');
  if (!selectEl) return;

  const categories = storageService.getAllCategories(products);
  let optionsHtml = categories.map(c => `
    <option value="${c}" ${c === selectedVal ? 'selected' : ''}>${c}</option>
  `).join('');

  optionsHtml += `
    <option value="__custom__" ${selectedVal && !categories.includes(selectedVal) ? 'selected' : ''}>✨ + เพิ่มหมวดหมู่ใหม่...</option>
  `;

  selectEl.innerHTML = optionsHtml;

  if (selectedVal && !categories.includes(selectedVal)) {
    selectEl.value = '__custom__';
    customInput.style.display = 'block';
    customInput.value = selectedVal;
    hiddenInput.value = selectedVal;
  } else {
    const current = selectedVal || selectEl.value;
    if (current === '__custom__') {
      customInput.style.display = 'block';
      hiddenInput.value = customInput.value.trim();
    } else {
      customInput.style.display = 'none';
      hiddenInput.value = current;
    }
  }
}

// Targeted DOM Rendering (High Performance)
function renderProducts() {
  const keyword = (searchInput.value || '').trim().toLowerCase();
  const filtered = products.filter(p => {
    const matchCat = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(keyword);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 48px 0;">
        <p style="font-size: 0.9rem;">ไม่พบรายการสินค้าที่ค้นหา</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const hasManagedStock = p.stock !== null && p.stock !== undefined && p.stock !== '';
    const numStock = Number(p.stock);
    const isOutOfStock = hasManagedStock && numStock <= 0;
    const isLowStock = hasManagedStock && !isOutOfStock && numStock <= 5;
    const cartItem = cart.find(i => i.product.id === p.id);
    const cartQty = cartItem ? cartItem.qty : 0;
    const canAdd = canAddToCart(p, cartQty);

    const stockText = hasManagedStock 
      ? (isOutOfStock ? 'หมด' : `คงเหลือ: ${p.stock}`) 
      : 'พร้อมขาย';

    return `
      <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${p.id}">
        <div class="card-top">
          <span class="product-category-tag">${p.category}</span>
          <span class="stock-tag ${isLowStock || isOutOfStock ? 'low' : ''}">
            ${stockText}
          </span>
        </div>
        <div>
          <div class="product-name">${p.name}</div>
          <div class="card-bottom">
            <span class="product-price">${formatCurrency(p.price)}</span>
            <span class="add-badge">${isOutOfStock ? '❌' : (canAdd ? '+' : 'เต็ม')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update only dynamic stock badges without re-rendering the whole catalog
function updateCardStockBadges() {
  document.querySelectorAll('.product-card').forEach(card => {
    const prodId = card.dataset.id;
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const hasManagedStock = prod.stock !== null && prod.stock !== undefined && prod.stock !== '';
    const numStock = Number(prod.stock);
    const cartItem = cart.find(i => i.product.id === prodId);
    const inCart = cartItem ? cartItem.qty : 0;
    const isOutOfStock = hasManagedStock && numStock <= 0;
    const isLow = hasManagedStock && !isOutOfStock && numStock <= 5;
    const canAdd = canAddToCart(prod, inCart);

    card.classList.toggle('out-of-stock', isOutOfStock);
    const stockTag = card.querySelector('.stock-tag');
    if (stockTag) {
      stockTag.className = `stock-tag ${isLow || isOutOfStock ? 'low' : ''}`;
      stockTag.textContent = hasManagedStock ? (isOutOfStock ? 'หมด' : `คงเหลือ: ${prod.stock}`) : 'พร้อมขาย';
    }
    const addBadge = card.querySelector('.add-badge');
    if (addBadge) {
      addBadge.textContent = isOutOfStock ? '❌' : (canAdd ? '+' : 'เต็ม');
    }
  });
}

function renderCart() {
  const { totalCount, totalPrice } = calculateCartTotals(cart);
  cartItemCount.textContent = totalCount;
  cartTotalQty.textContent = `${totalCount} ชิ้น`;
  cartTotalPrice.textContent = formatCurrency(totalPrice);

  // Sync Mobile Floating Cart Bar
  const mobileCartBar = document.getElementById('mobile-cart-bar');
  const mobileCartCount = document.getElementById('mobile-cart-count');
  const mobileCartTotal = document.getElementById('mobile-cart-total');
  if (mobileCartCount) mobileCartCount.textContent = totalCount;
  if (mobileCartTotal) mobileCartTotal.textContent = formatCurrency(totalPrice);
  if (mobileCartBar) {
    if (totalCount > 0) {
      mobileCartBar.classList.add('visible');
    } else {
      mobileCartBar.classList.remove('visible');
      closeMobileCart();
    }
  }

  if (cart.length === 0) {
    btnCheckout.disabled = true;
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-state">
        <p style="font-size: 0.9rem; font-weight: 500;">ยังไม่มีรายการสินค้า</p>
        <small style="color: #94a3b8;">เลือกสินค้าจากเมนูทางซ้ายเพื่อสั่งซื้อ</small>
      </div>
    `;
    return;
  }

  btnCheckout.disabled = false;
  cartItemsContainer.innerHTML = cart.map(item => {
    const prod = products.find(p => p.id === item.product.id) || item.product;
    const totalInCartForProd = cart.filter(i => i.product.id === item.product.id).reduce((s, i) => s + i.qty, 0);
    const canIncrement = canAddToCart(prod, totalInCartForProd);
    const itemKey = getCartItemKey(item.product.id, item.options);

    return `
      <div class="cart-item">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.product.name}</div>
          ${item.options ? `<div class="cart-item-options">📝 ${item.options}</div>` : ''}
          <div class="cart-item-price">${formatCurrency(item.product.price)} x ${item.qty} = ${formatCurrency(item.product.price * item.qty)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-minus-key="${itemKey}">-</button>
          <span class="item-qty">${item.qty}</span>
          <button class="qty-btn" data-plus-key="${itemKey}" data-prod-id="${item.product.id}" ${!canIncrement ? 'disabled' : ''}>+</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderManagementTable() {
  const tbody = document.getElementById('mgmt-products-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">ไม่มีสินค้าในระบบ</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const stockVal = (p.stock !== null && p.stock !== undefined) ? p.stock : '';
    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td style="text-align: right;">${formatCurrency(p.price)}</td>
        <td style="text-align: center;">
          <input type="number" class="stock-input-sm" data-stock-id="${p.id}" value="${stockVal}" placeholder="∞ ไม่จำกัด" min="0" style="width: 80px;" />
        </td>
        <td style="text-align: center;">
          <button class="btn-action-sm btn-edit-prod" data-edit-id="${p.id}">แก้ไข</button>
          <button class="btn-action-sm danger btn-del-prod" data-del-id="${p.id}">ลบ</button>
        </td>
      </tr>
    `;
  }).join('');
}

function resetProductForm() {
  document.getElementById('form-product').reset();
  document.getElementById('input-prod-id').value = '';
  document.getElementById('btn-save-product-form').textContent = 'บันทึก';
  document.getElementById('btn-cancel-edit').style.display = 'none';
  populateCategorySelect();
}

function openProductOptionsModal(product) {
  pendingOptionProduct = product;
  selectedOptionPresets.clear();

  document.getElementById('options-modal-product-name').textContent = `${product.name} (เลือก Option)`;
  const catLabel = product.category ? ` • หมวด: ${product.category}` : '';
  document.getElementById('options-modal-product-price').textContent = `ราคา: ${formatCurrency(product.price)}${catLabel}`;
  document.getElementById('input-custom-option').value = '';

  const chipsContainer = document.getElementById('options-preset-chips');
  if (chipsContainer) {
    const options = getOptionsForCategory(product.category);
    chipsContainer.innerHTML = options.map(opt => `
      <button type="button" class="category-pill opt-chip" data-text="${opt}">${opt}</button>
    `).join('');
  }

  openModal('modal-product-options');
  setTimeout(() => {
    const customInput = document.getElementById('input-custom-option');
    if (customInput) customInput.focus();
  }, 100);
}

function openPaymentModal() {
  if (cart.length === 0) return;
  const { totalPrice } = calculateCartTotals(cart);
  document.getElementById('modal-pay-amount').textContent = formatCurrency(totalPrice);

  const cashInput = document.getElementById('input-cash-received');
  cashInput.value = totalPrice;
  updateChangeDisplay(totalPrice);

  setPaymentTab('cash');
  openModal('modal-payment');
  setTimeout(() => cashInput.select(), 100);
}

function setPaymentTab(mode) {
  currentPaymentMode = mode;
  document.getElementById('tab-cash').classList.toggle('active', mode === 'cash');
  document.getElementById('tab-qr').classList.toggle('active', mode === 'qr');
  document.getElementById('payment-cash-section').style.display = mode === 'cash' ? 'block' : 'none';
  document.getElementById('payment-qr-section').style.display = mode === 'qr' ? 'block' : 'none';
}

function updateChangeDisplay(receivedAmount) {
  const { totalPrice } = calculateCartTotals(cart);
  const change = calculateCashChange(totalPrice, receivedAmount);
  document.getElementById('cash-change-display').textContent = formatCurrency(change);
}

// Direct 1-click Queue Ticket Generation and Instant Printing (No payment modal blocking)
async function triggerDirectQueuePrint() {
  if (cart.length === 0) return;

  const { totalPrice } = calculateCartTotals(cart);
  const queueNumber = storageService.getNextQueueNumber();
  
  const orderData = createOrderPayload({
    orderNumber: queueNumber,
    cartItems: cart,
    paymentMethod: 'counter_qr',
    receivedAmount: totalPrice
  });

  btnCheckout.disabled = true;
  const savedOrder = await storageService.saveOrder(orderData);
  lastCompletedOrder = savedOrder;

  // Immediately print queue ticket (Non-blocking hidden iframe)
  printReceipt(savedOrder, 'queue', storeProfile);

  // Clear cart and update stock on UI
  cart = [];
  closeMobileCart();
  renderCart();
  await refreshProducts();

  // Show quick success badge (No celebration delay)
  document.getElementById('success-queue-number').textContent = savedOrder.order_number;
  document.getElementById('success-summary-text').textContent = 
    `ยอดรวม: ${formatCurrency(savedOrder.total_amount)} (สั่งพิมพ์ใบคิวเรียบร้อย)`;
  openModal('modal-success');
}

async function openReportModal() {
  const orders = await storageService.getDailyOrders();
  const totalRev = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const count = orders.length;
  const avg = count > 0 ? (totalRev / count) : 0;

  document.getElementById('report-total-revenue').textContent = formatCurrency(totalRev);
  document.getElementById('report-total-orders').textContent = `${count} บิล`;
  document.getElementById('report-avg-order').textContent = formatCurrency(avg);

  const tbody = document.getElementById('report-orders-body');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">ยังไม่มีรายการขายในวันนี้</td></tr>`;
    openModal('modal-report');
    return;
  }

  tbody.innerHTML = orders.map(ord => {
    const itemsBrief = (ord.order_items || []).map(i => `${i.name} (x${i.qty})`).join(', ');
    return `
      <tr>
        <td>${formatDateTime(ord.created_at).split(' ')[1] || '-'}</td>
        <td><strong>${ord.order_number}</strong></td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemsBrief}</td>
        <td>${ord.payment_method === 'cash' ? 'เงินสด' : 'QR'}</td>
        <td style="text-align: right; font-weight: 600;">${formatCurrency(ord.total_amount)}</td>
        <td style="text-align: center;">
          <button class="btn-action-sm btn-reprint" data-ord='${JSON.stringify(ord).replace(/'/g, "&apos;")}' style="padding: 2px 6px;">
            พิมพ์
          </button>
        </td>
      </tr>
    `;
  }).join('');

  openModal('modal-report');
}

// Fast Event Delegation & Listeners Setup
function setupEventListeners() {
  // Category Delegation
  categoriesContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-pill');
    if (btn) {
      selectedCategory = btn.dataset.cat;
      renderCategories();
      renderProducts();
    }
  });

  // Fast Product Click Delegation (Zero Tap Delay)
  productsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card:not(.out-of-stock)');
    if (!card) return;

    const prodId = card.dataset.id;
    const product = products.find(p => p.id === prodId);
    if (!product) return;

    const totalInCartForProd = cart.filter(i => i.product.id === prodId).reduce((s, i) => s + i.qty, 0);
    if (!canAddToCart(product, totalInCartForProd)) {
      alert(`สินค้า "${product.name}" ในสต็อกมีเพียง ${product.stock} ชิ้น ไม่สามารถเพิ่มได้อีก`);
      return;
    }

    // Open Option Selection Modal
    openProductOptionsModal(product);
  });

  // Fast Cart Quantity Delegation (using unique item key)
  cartItemsContainer.addEventListener('click', (e) => {
    const btnMinus = e.target.closest('[data-minus-key]');
    if (btnMinus) {
      cart = updateCartQuantity(cart, btnMinus.dataset.minusKey, -1);
      renderCart();
      updateCardStockBadges();
      return;
    }

    const btnPlus = e.target.closest('[data-plus-key]');
    if (btnPlus) {
      const itemKey = btnPlus.dataset.plusKey;
      const prodId = btnPlus.dataset.prodId;
      const prod = products.find(p => p.id === prodId);
      const totalInCartForProd = cart.filter(i => i.product.id === prodId).reduce((s, i) => s + i.qty, 0);
      if (prod && !canAddToCart(prod, totalInCartForProd)) {
        alert(`สต็อกคงเหลือไม่พอ (${prod.stock} ชิ้น)`);
        return;
      }
      cart = updateCartQuantity(cart, itemKey, 1);
      renderCart();
      updateCardStockBadges();
    }
  });

  // Product Option Modal Handlers
  document.getElementById('options-preset-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.opt-chip');
    if (!chip) return;
    const text = chip.dataset.text;
    if (selectedOptionPresets.has(text)) {
      selectedOptionPresets.delete(text);
      chip.classList.remove('selected');
    } else {
      selectedOptionPresets.add(text);
      chip.classList.add('selected');
    }
  });

  document.getElementById('btn-confirm-add-option').addEventListener('click', () => {
    if (!pendingOptionProduct) return;
    const customText = document.getElementById('input-custom-option').value.trim();
    const presets = Array.from(selectedOptionPresets);
    const combinedOptions = [...presets, ...(customText ? [customText] : [])].join(', ');

    cart = addItemToCart(cart, pendingOptionProduct, combinedOptions);
    renderCart();
    updateCardStockBadges();
    closeModal('modal-product-options');
    pendingOptionProduct = null;
  });

  document.getElementById('btn-skip-option').addEventListener('click', () => {
    if (!pendingOptionProduct) return;
    cart = addItemToCart(cart, pendingOptionProduct, '');
    renderCart();
    updateCardStockBadges();
    closeModal('modal-product-options');
    pendingOptionProduct = null;
  });

  // Search Debouncing/Instant Input
  searchInput.addEventListener('input', renderProducts);

  btnClearCart.addEventListener('click', () => {
    if (cart.length > 0 && confirm('ต้องการล้างรายการสั่งซื้อทั้งหมดใช่หรือไม่?')) {
      cart = [];
      renderCart();
      updateCardStockBadges();
    }
  });

  // 1-Click Instant Queue Ticket Printing (No payment popup delay)
  btnCheckout.addEventListener('click', triggerDirectQueuePrint);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F9' && cart.length > 0) {
      e.preventDefault();
      triggerDirectQueuePrint();
    }
  });

  document.getElementById('btn-print-queue-only').addEventListener('click', () => {
    if (lastCompletedOrder) printReceipt(lastCompletedOrder, 'queue', storeProfile);
  });

  // Store Settings Modal triggers & save
  document.getElementById('btn-store-settings').addEventListener('click', () => {
    storeProfile = storageService.getStoreProfile();
    document.getElementById('input-store-name').value = storeProfile.name || '';
    document.getElementById('input-store-branch').value = storeProfile.branch || '';
    document.getElementById('input-store-footer').value = storeProfile.footer || '';
    openModal('modal-store-settings');
  });

  document.getElementById('form-store-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      name: document.getElementById('input-store-name').value.trim(),
      branch: document.getElementById('input-store-branch').value.trim(),
      footer: document.getElementById('input-store-footer').value.trim()
    };
    storageService.saveStoreProfile(updated);
    updateStoreProfileUI();
    closeModal('modal-store-settings');
  });

  document.getElementById('btn-report').addEventListener('click', openReportModal);

  // Print Daily Sales Summary Report
  document.getElementById('btn-print-sales-report').addEventListener('click', async () => {
    const orders = await storageService.getDailyOrders();
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    printSalesReport({
      totalRevenue,
      totalOrders,
      avgOrder,
      orders
    }, storeProfile);
  });
  document.getElementById('btn-manage-menu').addEventListener('click', () => {
    resetProductForm();
    renderManagementTable();
    openModal('modal-menu');
  });

  document.getElementById('btn-cancel-edit').addEventListener('click', resetProductForm);

  // Management Table Delegation (Stock edit, Edit, Delete)
  const mgmtBody = document.getElementById('mgmt-products-body');
  mgmtBody.addEventListener('change', async (e) => {
    if (e.target.dataset.stockId) {
      const prodId = e.target.dataset.stockId;
      const valStr = e.target.value.trim();
      const newStock = valStr === '' ? null : Math.max(0, parseInt(valStr, 10) || 0);
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        await storageService.saveProduct({ ...prod, stock: newStock });
        await refreshProducts();
      }
    }
  });

  mgmtBody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit-prod');
    if (editBtn) {
      const prod = products.find(p => p.id === editBtn.dataset.editId);
      if (prod) {
        document.getElementById('input-prod-id').value = prod.id;
        document.getElementById('input-prod-name').value = prod.name;
        document.getElementById('input-prod-price').value = prod.price;
        document.getElementById('input-prod-stock').value = prod.stock ?? 0;
        populateCategorySelect(prod.category);
        document.getElementById('btn-save-product-form').textContent = 'อัปเดต';
        document.getElementById('btn-cancel-edit').style.display = 'inline-block';
        document.getElementById('input-prod-name').focus();
      }
      return;
    }

    const delBtn = e.target.closest('.btn-del-prod');
    if (delBtn) {
      const prod = products.find(p => p.id === delBtn.dataset.delId);
      if (prod && confirm(`ต้องการลบสินค้า "${prod.name}" ใช่หรือไม่?`)) {
        await storageService.deleteProduct(delBtn.dataset.delId);
        cart = cart.filter(i => i.product.id !== delBtn.dataset.delId);
        await refreshProducts();
        renderCart();
      }
    }
  });

  // Report Modal Delegation (Reprint)
  document.getElementById('report-orders-body').addEventListener('click', (e) => {
    const reprintBtn = e.target.closest('.btn-reprint');
    if (reprintBtn) {
      const ord = JSON.parse(reprintBtn.getAttribute('data-ord'));
      printReceipt(ord, 'full', storeProfile);
    }
  });

  // Reset Sales Actions
  const btnTriggerReset = document.getElementById('btn-trigger-reset-sales');
  const inputResetText = document.getElementById('input-confirm-reset-text');
  const btnExecReset = document.getElementById('btn-execute-reset-sales');

  btnTriggerReset.addEventListener('click', () => {
    inputResetText.value = '';
    btnExecReset.disabled = true;
    openModal('modal-confirm-reset');
    setTimeout(() => inputResetText.focus(), 100);
  });

  inputResetText.addEventListener('input', (e) => {
    btnExecReset.disabled = e.target.value.trim().toUpperCase() !== 'RESET';
  });

  btnExecReset.addEventListener('click', async () => {
    btnExecReset.disabled = true;
    await storageService.resetAllSales();
    closeModal('modal-confirm-reset');
    closeModal('modal-report');
    alert('ล้างประวัติยอดขายทั้งหมดและรีเซ็ตเลขคิวเริ่มต้นที่ Q-001 สำเร็จแล้ว');
  });

    // Category Select in Product Management
    const selectProdCategory = document.getElementById('select-prod-category');
    const inputCustomCat = document.getElementById('input-prod-category-custom');
    const inputProdCat = document.getElementById('input-prod-category');

    if (selectProdCategory) {
      selectProdCategory.addEventListener('change', (e) => {
        if (e.target.value === '__custom__') {
          inputCustomCat.style.display = 'block';
          inputCustomCat.focus();
          inputProdCat.value = inputCustomCat.value.trim();
        } else {
          inputCustomCat.style.display = 'none';
          inputProdCat.value = e.target.value;
        }
      });
    }

    if (inputCustomCat) {
      inputCustomCat.addEventListener('input', (e) => {
        inputProdCat.value = e.target.value.trim();
      });
    }

    // Quick Add Category Modal Trigger & Submit
    const btnQuickAddCat = document.getElementById('btn-quick-add-category');
    if (btnQuickAddCat) {
      btnQuickAddCat.addEventListener('click', () => {
        document.getElementById('input-quick-cat-name').value = '';
        openModal('modal-add-category');
        setTimeout(() => {
          document.getElementById('input-quick-cat-name').focus();
        }, 100);
      });
    }

    const formQuickAddCat = document.getElementById('form-quick-add-category');
    if (formQuickAddCat) {
      formQuickAddCat.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catName = document.getElementById('input-quick-cat-name').value.trim();
        if (!catName) return;

        storageService.saveCustomCategory(catName);
        selectedCategory = catName;
        await refreshProducts();
        closeModal('modal-add-category');
      });
    }

    // Product Form Submit
    document.getElementById('form-product').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('input-prod-id').value;
      const name = document.getElementById('input-prod-name').value;
      const category = document.getElementById('input-prod-category').value.trim();
      const price = document.getElementById('input-prod-price').value;
      const stock = document.getElementById('input-prod-stock').value;

      if (!category) {
        alert('กรุณาระบุหมวดหมู่สินค้า');
        return;
      }

      // If it's a new category, save it to custom categories as well
      storageService.saveCustomCategory(category);

      const validation = validateProductInput({ name, category, price, stock });
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      const payload = {
        ...(id ? { id } : {}),
        ...validation.data
      };

      await storageService.saveProduct(payload);
      resetProductForm();
      await refreshProducts();
    });



  // Mobile Drawer Triggers
  const btnOpenMobileCart = document.getElementById('btn-open-mobile-cart');
  const btnCloseMobileCart = document.getElementById('btn-close-cart-drawer');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const mobileCartBar = document.getElementById('mobile-cart-bar');

  if (btnOpenMobileCart) btnOpenMobileCart.addEventListener('click', openMobileCart);
  if (mobileCartBar) mobileCartBar.addEventListener('click', openMobileCart);
  if (btnCloseMobileCart) btnCloseMobileCart.addEventListener('click', closeMobileCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeMobileCart);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
  });
}

function openMobileCart() {
  const sidebar = document.querySelector('.cart-sidebar');
  const backdrop = document.getElementById('cart-backdrop');
  if (sidebar) sidebar.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
}

function closeMobileCart() {
  const sidebar = document.querySelector('.cart-sidebar');
  const backdrop = document.getElementById('cart-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

init();
