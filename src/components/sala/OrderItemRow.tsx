"use client";

interface OrderItem {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    category: string;
    finalPrice: number;
    basePrice: number;
    vatAmount: number;
    vatRate: number;
    active: boolean;
  };
}

interface Props {
  item: OrderItem;
  onQuantityChange: (itemId: string, newQty: number) => void;
}

export function OrderItemRow({ item, onQuantityChange }: Props) {
  const lineTotal = item.quantity * item.unitPrice;

  return (
    <div className="order-row">
      <div className="order-row-info">
        <p className="order-row-name">{item.product.name}</p>
        <p className="order-row-unit">€{item.unitPrice.toFixed(2)} / un.</p>
      </div>
      <div className="qty-ctrl">
        <button
          onClick={() => onQuantityChange(item.id, item.quantity - 1)}
          className="qty-btn minus"
          aria-label="Diminuir quantidade"
        >−</button>
        <span className="qty-num">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          className="qty-btn plus"
          aria-label="Aumentar quantidade"
        >+</button>
      </div>
      <span className="order-row-total">€{lineTotal.toFixed(2)}</span>
    </div>
  );
}
