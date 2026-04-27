"use client";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    vatRate: number;
  };
}

interface Props {
  orderItems: OrderItem[];
}

export function IvaBreakdown({ orderItems }: Props) {
  const vatGroups = orderItems.reduce((acc, item) => {
    const rate = item.product.vatRate;
    if (!acc[rate]) acc[rate] = { baseAmount: 0, vatAmount: 0 };
    const lineTotal = item.quantity * item.unitPrice;
    acc[rate].baseAmount += lineTotal / (1 + rate);
    acc[rate].vatAmount += lineTotal - lineTotal / (1 + rate);
    return acc;
  }, {} as Record<number, { baseAmount: number; vatAmount: number }>);

  const entries = Object.entries(vatGroups);
  if (entries.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Discriminação IVA</h3>
      {entries.map(([rate, { baseAmount, vatAmount }]) => (
        <div key={rate} className="flex justify-between text-sm">
          <span className="text-gray-600">
            IVA {(parseFloat(rate) * 100).toFixed(0)}% — Base: €{baseAmount.toFixed(2)}
          </span>
          <span className="font-medium text-gray-900">€{vatAmount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
