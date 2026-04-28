import { calculateVat } from "./vat";

describe("calculateVat", () => {
  describe("23% rate", () => {
    it("returns correct vatRate", () => {
      const result = calculateVat(1.23, 0.23);
      expect(result.vatRate).toBe(0.23);
    });

    it("computes basePrice, vatAmount, finalPrice correctly", () => {
      const result = calculateVat(1.23, 0.23);
      expect(result.finalPrice).toBe(1.23);
      expect(result.basePrice).toBe(1.0);
      expect(result.vatAmount).toBe(0.23);
    });

    it("rounds to 2 decimal places", () => {
      const result = calculateVat(1.00, 0.23);
      expect(result.basePrice).toBe(0.81);
      expect(result.vatAmount).toBe(0.19);
    });
  });

  describe("13% rate", () => {
    it("returns correct vatRate", () => {
      const result = calculateVat(1.13, 0.13);
      expect(result.vatRate).toBe(0.13);
    });

    it("computes basePrice, vatAmount, finalPrice correctly", () => {
      const result = calculateVat(1.13, 0.13);
      expect(result.finalPrice).toBe(1.13);
      expect(result.basePrice).toBe(1.0);
      expect(result.vatAmount).toBe(0.13);
    });
  });

  describe("edge cases", () => {
    it("returns zeros for finalPrice of 0", () => {
      const result = calculateVat(0, 0.23);
      expect(result.finalPrice).toBe(0);
      expect(result.basePrice).toBe(0);
      expect(result.vatAmount).toBe(0);
    });

    it("rounding case: 10.00 at 23% produces stable rounded values", () => {
      const result = calculateVat(10.0, 0.23);
      expect(result.finalPrice).toBe(10.0);
      expect(result.basePrice + result.vatAmount).toBeCloseTo(10.0, 1);
    });

    it("0% rate returns full price as basePrice with no VAT", () => {
      const result = calculateVat(5.0, 0);
      expect(result.finalPrice).toBe(5.0);
      expect(result.basePrice).toBe(5.0);
      expect(result.vatAmount).toBe(0);
    });

    it("6% rate computes correctly", () => {
      const result = calculateVat(1.06, 0.06);
      expect(result.finalPrice).toBe(1.06);
      expect(result.basePrice).toBe(1.0);
      expect(result.vatAmount).toBe(0.06);
    });
  });
});
