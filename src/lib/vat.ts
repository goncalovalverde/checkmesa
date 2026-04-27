export type ProductType = "DRINK" | "DISH";

export const VAT_RATES: Record<ProductType, number> = {
  DRINK: 0.23,
  DISH: 0.13,
};

export interface VatBreakdown {
  finalPrice: number;
  basePrice: number;
  vatAmount: number;
  vatRate: number;
}

export function calculateVat(
  finalPrice: number,
  type: ProductType
): VatBreakdown {
  const vatRate = VAT_RATES[type];
  const basePrice = finalPrice / (1 + vatRate);
  const vatAmount = finalPrice - basePrice;

  return {
    finalPrice: round2(finalPrice),
    basePrice: round2(basePrice),
    vatAmount: round2(vatAmount),
    vatRate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
