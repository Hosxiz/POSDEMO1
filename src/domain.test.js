import { describe, it, expect } from 'vitest';
import { calculateCartTotals, addItemToCart, updateCartQuantity } from './cart.js';
import { calculateCashChange, formatQueueNumber, createOrderPayload } from './order.js';
import { canAddToCart, deductStockFromProducts, validateProductInput } from './inventory.js';
import { getOptionsForCategory } from './options.js';

describe('Domain: Cart logic', () => {
  it('calculates totals accurately', () => {
    const items = [
      { product: { id: '1', price: 45 }, qty: 2 },
      { product: { id: '2', price: 55 }, qty: 1 }
    ];
    const { totalCount, totalPrice } = calculateCartTotals(items);
    expect(totalCount).toBe(3);
    expect(totalPrice).toBe(145);
  });

  it('adds item to empty cart and increments existing item', () => {
    let cart = [];
    const prod1 = { id: 'p1', name: 'Coffee', price: 50 };
    cart = addItemToCart(cart, prod1);
    expect(cart.length).toBe(1);
    expect(cart[0].qty).toBe(1);

    cart = addItemToCart(cart, prod1);
    expect(cart.length).toBe(1);
    expect(cart[0].qty).toBe(2);
  });

  it('separates items with different options and groups identical options', () => {
    let cart = [];
    const prod = { id: 'p1', name: 'ชาไทย', price: 50 };
    cart = addItemToCart(cart, prod, 'หวานน้อย');
    cart = addItemToCart(cart, prod, 'หวานปกติ');
    expect(cart.length).toBe(2);

    // Adding identical option increments quantity
    cart = addItemToCart(cart, prod, 'หวานน้อย');
    expect(cart.length).toBe(2);
    expect(cart.find(i => i.options === 'หวานน้อย').qty).toBe(2);
  });

  it('updates quantity and removes item when qty drops to zero', () => {
    let cart = [{ product: { id: 'p1', price: 50 }, qty: 1 }];
    cart = updateCartQuantity(cart, 'p1', -1);
    expect(cart.length).toBe(0);
  });
});

describe('Domain: Order and Cash logic', () => {
  it('calculates cash change accurately without negatives', () => {
    expect(calculateCashChange(80, 100)).toBe(20);
    expect(calculateCashChange(100, 100)).toBe(0);
    expect(calculateCashChange(150, 100)).toBe(0);
  });

  it('formats queue number with 3-digit padding', () => {
    expect(formatQueueNumber(1)).toBe('Q-001');
    expect(formatQueueNumber(25)).toBe('Q-025');
  });

  it('creates complete order payload for cash transactions', () => {
    const cart = [
      { product: { id: '1', name: 'Tea', price: 45 }, qty: 2 }
    ];
    const order = createOrderPayload({
      orderNumber: 'Q-005',
      cartItems: cart,
      paymentMethod: 'cash',
      receivedAmount: 100,
      orderDate: '2026-10-09'
    });

    expect(order.order_number).toBe('Q-005');
    expect(order.total_amount).toBe(90);
    expect(order.change_amount).toBe(10);
    expect(order.order_items.length).toBe(1);
    expect(order.order_items[0].name).toBe('Tea');
  });
});

describe('Domain: Inventory and Product validation', () => {
  it('checks stock availability correctly', () => {
    const product = { id: 'p1', name: 'Coffee', stock: 5 };
    expect(canAddToCart(product, 0)).toBe(true);
    expect(canAddToCart(product, 4)).toBe(true);
    expect(canAddToCart(product, 5)).toBe(false);
    expect(canAddToCart(product, 6)).toBe(false);

    // Unlimited stock when null or empty
    const unmanagedProduct = { id: 'p2', name: 'Water', stock: null };
    expect(canAddToCart(unmanagedProduct, 999)).toBe(true);
  });

  it('deducts stock accurately and ignores unmanaged stock', () => {
    const products = [
      { id: 'p1', name: 'Tea', stock: 10 },
      { id: 'p2', name: 'Cookie', stock: 2 },
      { id: 'p3', name: 'Water', stock: null }
    ];
    const cart = [
      { product: { id: 'p1' }, qty: 3 },
      { product: { id: 'p2' }, qty: 5 },
      { product: { id: 'p3' }, qty: 10 }
    ];

    const updated = deductStockFromProducts(products, cart);
    expect(updated.find(p => p.id === 'p1').stock).toBe(7);
    expect(updated.find(p => p.id === 'p2').stock).toBe(0);
    expect(updated.find(p => p.id === 'p3').stock).toBe(null);
  });

  it('validates product input fields with optional stock', () => {
    const invalid = validateProductInput({ name: '', category: 'Tea', price: 40 });
    expect(invalid.valid).toBe(false);

    // With explicit stock
    const validWithStock = validateProductInput({ name: 'Latte', category: 'Coffee', price: 55, stock: '20' });
    expect(validWithStock.valid).toBe(true);
    expect(validWithStock.data.stock).toBe(20);

    // Without stock (empty string / unmanaged)
    const validWithoutStock = validateProductInput({ name: 'Latte', category: 'Coffee', price: 55, stock: '' });
    expect(validWithoutStock.valid).toBe(true);
    expect(validWithoutStock.data.stock).toBe(null);
  });

  describe('Category-based Dynamic Option Presets', () => {
    it('returns beverage options for tea, coffee, and drinks', () => {
      const teaOptions = getOptionsForCategory('เครื่องดื่ม');
      expect(teaOptions).toContain('หวานปกติ');
      expect(teaOptions).toContain('หวานน้อย (50%)');
      expect(teaOptions).toContain('ไม่หวาน (0%)');
      expect(teaOptions).toContain('แยกน้ำ');
      expect(teaOptions).not.toContain('เผ็ดน้อย');
      expect(teaOptions).not.toContain('เผ็ดมาก');

      const coffeeOptions = getOptionsForCategory('กาแฟสด');
      expect(coffeeOptions).toContain('หวานปกติ');
      expect(coffeeOptions).not.toContain('ไม่ใส่ผัก');
    });

    it('returns food spice & cooking options for food categories', () => {
      const foodOptions = getOptionsForCategory('อาหารจานเดียว');
      expect(foodOptions).toContain('เผ็ดน้อย');
      expect(foodOptions).toContain('เผ็ดมาก');
      expect(foodOptions).toContain('ไม่ใส่ผัก');
      expect(foodOptions).not.toContain('หวานน้อย (50%)');
      expect(foodOptions).not.toContain('แยกน้ำ');
    });

    it('returns bakery heating options for bakery items', () => {
      const bakeryOptions = getOptionsForCategory('เบเกอรี่');
      expect(bakeryOptions).toContain('อุ่นร้อน');
      expect(bakeryOptions).toContain('ทานที่ร้าน');
      expect(bakeryOptions).not.toContain('เผ็ดน้อย');
      expect(bakeryOptions).not.toContain('หวาน 25%');
    });

    it('returns default fallback options for unknown categories', () => {
      const defaultOptions = getOptionsForCategory('ของที่ระลึก');
      expect(defaultOptions).toContain('ทานที่ร้าน');
      expect(defaultOptions).toContain('ห่อกลับบ้าน');
      expect(defaultOptions).toContain('พิเศษ');
      expect(defaultOptions).not.toContain('เผ็ดมาก');
    });
  });

  describe('StorageService: Categories deduplication & persistence', () => {
    it('aggregates default, product, and custom categories uniquely', () => {
      const mockStorage = {
        getCustomCategories() {
          return ['ของทานเล่น', 'อาหารจานเดียว'];
        },
        getAllCategories(products) {
          const productCategories = products.map(p => p.category).filter(Boolean);
          const customCategories = this.getCustomCategories();
          const defaults = ['เครื่องดื่ม', 'กาแฟ', 'เบเกอรี่'];
          
          const combined = [...defaults, ...productCategories, ...customCategories];
          const unique = [];
          combined.forEach(cat => {
            const clean = (cat || '').trim();
            if (clean && !unique.some(u => u.toLowerCase() === clean.toLowerCase())) {
              unique.push(clean);
            }
          });
          return unique;
        }
      };

      const sampleProducts = [
        { id: '1', name: 'ชาไทย', category: 'เครื่องดื่ม' },
        { id: '2', name: 'สเต็กไก่', category: 'สเต็ก' }
      ];

      const all = mockStorage.getAllCategories(sampleProducts);
      expect(all).toContain('เครื่องดื่ม');
      expect(all).toContain('กาแฟ');
      expect(all).toContain('เบเกอรี่');
      expect(all).toContain('ของทานเล่น');
      expect(all).toContain('อาหารจานเดียว');
      expect(all).toContain('สเต็ก');
      // No duplicate 'เครื่องดื่ม'
      expect(all.filter(c => c === 'เครื่องดื่ม').length).toBe(1);
    });
  });
});

