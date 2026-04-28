import { calculateVat, VAT_RATES } from "./vat";

describe("calculateVat", () => {
  describe("DRINK (23% VAT)", () => {
    it("returns correct vatRate", () => {
      const result = calculateVat(1.23, "DRINK");
      expect(result.vatRate).toBe(VAT_RATES.DRINK);
    });

    it("computes basePrice, vatAmount, finalPrice correctly", () => {
      const result = calculateVat(1.23, "DRINK");
      expect(result.finalPrice).toBe(1.23);
      expect(result.basePrice).toBe(1.0);
      expect(result.vatAmount).toBe(0.23);
    });

    it("rounds to 2 decimal places", () => {
      const result = calculateVat(1.00, "DRINK");
      expect(result.basePrice).toBe(0.81);
      expect(result.vatAmount).toBe(0.19);
    });
  });

  describe("DISH (13% VAT)", () => {
    it("returns correct vatRate", () => {
      const result = calculateVat(1.13, "DISH");
      expect(result.vatRate).toBe(VAT_RATES.DISH);
    });

    it("computes basePrice, vatAmount, finalPrice correctly", () => {
      const result = calculateVat(1.13, "DISH");
      expect(result.finalPrice).toBe(1.13);
      expect(result.basePrice).toBe(1.0);
      expect(result.vatAmount).toBe(0.13);
    });
  });

  describe("edge cases", () => {
    it("returns zeros for finalPrice of 0", () => {
      const result = calculateVat(0, "DRINK");
      expect(result.finalPrice).toBe(0);
      expect(result.basePrice).toBe(0);
      expect(result.vatAmount).toBe(0);
    });

    it("rounding case: 10.00 DRINK produces stable rounded values", () => {
      const result = calculateVat(10.0, "DRINK");
      expect(result.finalPrice).toBe(10.0);
      expect(result.basePrice + result.vatAmount).toBeCloseTo(10.0, 1);
    });
  });
});
