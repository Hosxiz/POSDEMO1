import { createClient } from '@supabase/supabase-js';
import { deductStockFromProducts } from './inventory.js';

export const DEFAULT_PRODUCTS = [
  { id: '1', name: 'ชาไทยเย็น (Thai Tea)', category: 'เครื่องดื่ม', price: 45, stock: 30 },
  { id: '2', name: 'ชาเขียวมัทฉะลาเต้ (Matcha Latte)', category: 'เครื่องดื่ม', price: 55, stock: 25 },
  { id: '3', name: 'อเมริกาโน่เย็น (Iced Americano)', category: 'กาแฟ', price: 50, stock: 40 },
  { id: '4', name: 'ลาเต้เย็น (Iced Latte)', category: 'กาแฟ', price: 55, stock: 35 },
  { id: '5', name: 'ชามะนาว (Lemon Tea)', category: 'เครื่องดื่ม', price: 45, stock: 20 },
  { id: '6', name: 'ครัวซองต์เนยสด (Butter Croissant)', category: 'เบเกอรี่', price: 65, stock: 15 },
  { id: '7', name: 'เค้กช็อกโกแลตฟัดจ์ (Chocolate Fudge)', category: 'เบเกอรี่', price: 75, stock: 8 },
  { id: '8', name: 'คุกกี้ช็อกโกแลตชิพ (Cookie)', category: 'เบเกอรี่', price: 35, stock: 5 }
];

class StorageService {
  constructor() {
    this.supabase = null;
    this.isSupabaseConnected = false;
    this.initSupabaseFromLocal();
  }

  initSupabaseFromLocal() {
    const config = this.getSupabaseConfig();
    if (config.url && config.key) {
      try {
        this.supabase = createClient(config.url, config.key);
        this.isSupabaseConnected = true;
      } catch (err) {
        this.supabase = null;
        this.isSupabaseConnected = false;
      }
    }
  }

  getSupabaseConfig() {
    return {
      url: import.meta.env?.VITE_SUPABASE_URL || localStorage.getItem('pos_supabase_url') || '',
      key: import.meta.env?.VITE_SUPABASE_KEY || localStorage.getItem('pos_supabase_key') || ''
    };
  }

  setSupabaseConfig(url, key) {
    if (url && key) {
      localStorage.setItem('pos_supabase_url', url.trim());
      localStorage.setItem('pos_supabase_key', key.trim());
      try {
        this.supabase = createClient(url.trim(), key.trim());
        this.isSupabaseConnected = true;
        return true;
      } catch (e) {
        return false;
      }
    }
    localStorage.removeItem('pos_supabase_url');
    localStorage.removeItem('pos_supabase_key');
    this.supabase = null;
    this.isSupabaseConnected = false;
    return true;
  }

  // --- STORE PROFILE & BRANDING ---
  getStoreProfile() {
    const defaultProfile = {
      name: 'POS Store',
      branch: 'Counter Terminal',
      footerNote: '*** กรุณารอเรียกหมายเลขคิว ขอบคุณครับ ***'
    };
    const local = localStorage.getItem('pos_store_profile');
    if (local) {
      try {
        return { ...defaultProfile, ...JSON.parse(local) };
      } catch (e) {
        return defaultProfile;
      }
    }
    return defaultProfile;
  }

  saveStoreProfile(profile) {
    const current = this.getStoreProfile();
    const updated = {
      ...current,
      ...profile,
      name: (profile.name || '').trim() || 'POS Store',
      branch: (profile.branch || '').trim() || 'Counter Terminal',
      footerNote: (profile.footerNote || '').trim() || '*** กรุณารอเรียกหมายเลขคิว ขอบคุณครับ ***'
    };
    localStorage.setItem('pos_store_profile', JSON.stringify(updated));
    return updated;
  }

  // --- PRODUCTS CRUD ---
  async getProducts() {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('products')
          .select('*')
          .order('name');
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Supabase fetch products error, fallback to local', e);
      }
    }

    const local = localStorage.getItem('pos_products');
    if (local) {
      const parsed = JSON.parse(local);
      return parsed.map(p => ({ ...p, stock: p.stock ?? 30 }));
    }
    localStorage.setItem('pos_products', JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }

  async saveProduct(product) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        if (product.id && product.id.length > 10) {
          const { data, error } = await this.supabase
            .from('products')
            .update(product)
            .eq('id', product.id)
            .select();
          if (!error && data) return data[0];
        } else {
          const { id, ...newProduct } = product;
          const { data, error } = await this.supabase
            .from('products')
            .insert([newProduct])
            .select();
          if (!error && data) return data[0];
        }
      } catch (e) {
        console.warn('Supabase save error, fallback to local', e);
      }
    }

    let products = await this.getProducts();
    if (product.id) {
      products = products.map(p => p.id === product.id ? product : p);
    } else {
      product.id = 'prod_' + Date.now();
      products.push(product);
    }
    localStorage.setItem('pos_products', JSON.stringify(products));
    return product;
  }

  async deleteProduct(productId) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        await this.supabase.from('products').delete().eq('id', productId);
      } catch (e) {
        console.warn('Supabase delete error', e);
      }
    }

    let products = await this.getProducts();
    products = products.filter(p => p.id !== productId);
    localStorage.setItem('pos_products', JSON.stringify(products));
    return true;
  }

  async deductStock(cartItems) {
    const products = await this.getProducts();
    const updatedProducts = deductStockFromProducts(products, cartItems);

    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    if (this.isSupabaseConnected && this.supabase) {
      for (const item of cartItems) {
        const prodId = item.product?.id;
        const updated = updatedProducts.find(p => p.id === prodId);
        if (prodId && updated) {
          try {
            await this.supabase.from('products').update({ stock: updated.stock }).eq('id', prodId);
          } catch (e) {
            console.warn('Failed to update stock on Supabase', e);
          }
        }
      }
    }

    return updatedProducts;
  }

  // --- ORDERS & QUEUE ---
  getNextQueueNumber() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('pos_last_queue_date');
    let count = parseInt(localStorage.getItem('pos_queue_count') || '0', 10);

    if (lastDate !== today) {
      count = 1;
      localStorage.setItem('pos_last_queue_date', today);
    } else {
      count += 1;
    }

    localStorage.setItem('pos_queue_count', count.toString());
    return `Q-${String(count).padStart(3, '0')}`;
  }

  async saveOrder(orderData) {
    const order = {
      ...orderData,
      created_at: new Date().toISOString()
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase.from('orders').insert([{
          order_number: order.order_number,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          amount_received: order.amount_received,
          change_amount: order.change_amount,
          order_items: order.order_items,
          order_date: order.order_date
        }]).select();
        if (!error && data && data.length > 0) {
          order.id = data[0].id;
        }
      } catch (e) {
        console.warn('Supabase save order error', e);
      }
    }

    const localOrders = this.getLocalOrders();
    order.id = order.id || 'ord_' + Date.now();
    localOrders.unshift(order);
    localStorage.setItem('pos_orders', JSON.stringify(localOrders.slice(0, 500)));

    await this.deductStock(order.order_items.map(item => ({
      product: { id: item.id || productsRef(item.name, localOrders) },
      qty: item.qty
    })));

    return order;
  }

  getLocalOrders() {
    const data = localStorage.getItem('pos_orders');
    return data ? JSON.parse(data) : [];
  }

  async getDailyOrders(dateStr = new Date().toISOString().split('T')[0]) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('orders')
          .select('*')
          .eq('order_date', dateStr)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase get orders fallback', e);
      }
    }
    return this.getLocalOrders().filter(o => o.order_date === dateStr);
  }

  // --- RESET SALES & QUEUE ---
  async resetAllSales() {
    // 1. Reset LocalStorage
    localStorage.removeItem('pos_orders');
    localStorage.setItem('pos_queue_count', '0');
    localStorage.removeItem('pos_last_queue_date');

    // 2. Reset Supabase orders table if connected
    if (this.isSupabaseConnected && this.supabase) {
      try {
        // Delete all records where id is not null
        await this.supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.warn('Supabase delete all orders error', e);
      }
    }

    return true;
  }
}

function productsRef(name, orders) {
  const local = localStorage.getItem('pos_products');
  if (local) {
    const prods = JSON.parse(local);
    const found = prods.find(p => p.name === name);
    if (found) return found.id;
  }
  return null;
}

export const storageService = new StorageService();
