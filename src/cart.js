// Domain logic: Cart calculations and item manipulations
export function calculateCartTotals(cartItems) {
  if (!Array.isArray(cartItems)) {
    return { totalCount: 0, totalPrice: 0 };
  }

  const totalCount = cartItems.reduce((acc, item) => acc + (item.qty || 0), 0);
  const totalPrice = cartItems.reduce((acc, item) => {
    const price = Number(item.product?.price || 0);
    const qty = Number(item.qty || 0);
    return acc + (price * qty);
  }, 0);

  return { totalCount, totalPrice };
}

export function getCartItemKey(productId, options = '') {
  return `${productId}::${(options || '').trim()}`;
}

export function addItemToCart(cartItems, product, options = '') {
  if (!product || !product.id) return cartItems;
  const cleanOptions = (options || '').trim();
  const existingIndex = cartItems.findIndex(i => 
    i.product.id === product.id && (i.options || '').trim() === cleanOptions
  );

  if (existingIndex >= 0) {
    return cartItems.map((item, idx) => 
      idx === existingIndex ? { ...item, qty: item.qty + 1 } : item
    );
  }

  return [...cartItems, { product, qty: 1, options: cleanOptions }];
}

export function updateCartQuantity(cartItems, itemKeyOrProductId, change) {
  return cartItems
    .map(item => {
      const match = (item.key === itemKeyOrProductId) || 
                    (getCartItemKey(item.product.id, item.options) === itemKeyOrProductId) ||
                    (item.product.id === itemKeyOrProductId);
      if (match) {
        return { ...item, qty: item.qty + change };
      }
      return item;
    })
    .filter(item => item.qty > 0);
}

