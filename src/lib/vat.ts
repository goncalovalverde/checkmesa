export interface VatBreakdown {
  finalPrice: number;
  basePrice: number;
  vatAmount: number;
  vatRate: number;
}

export function calculateVat(finalPrice: number, rate: number): VatBreakdown {
  const basePrice = finalPrice / (1 + rate);
  const vatAmount = finalPrice - basePrice;

  return {
    finalPrice: round2(finalPrice),
    basePrice: round2(basePrice),
    vatAmount: round2(vatAmount),
    vatRate: rate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
