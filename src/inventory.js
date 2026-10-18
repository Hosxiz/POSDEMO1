// Pure domain logic for inventory management and stock validation

// Checks if product can be added to cart.
// If product.stock is null or undefined, it's considered unmanaged/unlimited stock.
export function canAddToCart(product, currentQtyInCart = 0) {
  if (!product) return false;
  if (product.stock === null || product.stock === undefined || product.stock === '') {
    return true; // ไม่จำกัดสต็อก (ขายได้ตลอด)
  }
  const currentStock = Number(product.stock);
  return currentStock > currentQtyInCart;
}

export function deductStockFromProducts(products, cartItems) {
  if (!Array.isArray(products) || !Array.isArray(cartItems)) {
    return products || [];
  }

  const deductionMap = new Map();
  for (const item of cartItems) {
    const prodId = item.product?.id;
    if (prodId) {
      const current = deductionMap.get(prodId) || 0;
      deductionMap.set(prodId, current + (item.qty || 0));
    }
  }

  return products.map(product => {
    // If product does not track stock (null/undefined), do not deduct
    if (product.stock === null || product.stock === undefined || product.stock === '') {
      return product;
    }

    const deductQty = deductionMap.get(product.id) || 0;
    if (deductQty === 0) return product;

    const remainingStock = Math.max(0, Number(product.stock) - deductQty);
    return {
      ...product,
      stock: remainingStock
    };
  });
}

export function validateProductInput({ name, category, price, stock }) {
  const trimmedName = (name || '').trim();
  const trimmedCategory = (category || '').trim();
  const numPrice = Number(price);

  if (!trimmedName) return { valid: false, error: 'กรุณากรอกชื่อสินค้า' };
  if (!trimmedCategory) return { valid: false, error: 'กรุณากรอกหมวดหมู่' };
  if (isNaN(numPrice) || numPrice < 0) return { valid: false, error: 'ราคาต้องเป็นตัวเลขที่ถูกต้อง' };

  // Stock is optional: if empty string, null, or undefined -> null (ไม่จำกัดสต็อก)
  let parsedStock = null;
  if (stock !== undefined && stock !== null && String(stock).trim() !== '') {
    const num = parseInt(stock, 10);
    if (isNaN(num) || num < 0) {
      return { valid: false, error: 'สต็อกต้องเป็นจำนวนเต็มบวกหรือเว้นว่างไว้หากไม่จำกัด' };
    }
    parsedStock = num;
  }

  return {
    valid: true,
    data: {
      name: trimmedName,
      category: trimmedCategory,
      price: numPrice,
      stock: parsedStock
    }
  };
}
