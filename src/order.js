// Domain logic: Order creation and cash change calculation
export function calculateCashChange(totalPrice, receivedAmount) {
  const total = Number(totalPrice || 0);
  const received = Number(receivedAmount || 0);
  if (received < total) return 0;
  return received - total;
}

export function formatQueueNumber(count) {
  const safeCount = Math.max(1, parseInt(count || '1', 10));
  return `Q-${String(safeCount).padStart(3, '0')}`;
}

export function createOrderPayload({
  orderNumber,
  cartItems,
  paymentMethod,
  receivedAmount,
  orderDate = new Date().toISOString().split('T')[0]
}) {
  const items = (cartItems || []).map(item => ({
    name: item.product.name,
    price: Number(item.product.price),
    qty: Number(item.qty),
    options: item.options || ''
  }));

  const totalAmount = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const changeAmount = paymentMethod === 'cash' 
    ? calculateCashChange(totalAmount, receivedAmount) 
    : 0;

  return {
    order_number: orderNumber,
    total_amount: totalAmount,
    payment_method: paymentMethod,
    amount_received: paymentMethod === 'cash' ? Number(receivedAmount) : totalAmount,
    change_amount: changeAmount,
    order_items: items,
    order_date: orderDate,
    created_at: new Date().toISOString()
  };
}
