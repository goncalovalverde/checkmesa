/**
 * @jest-environment node
 *
 * Tests for the CategoryService — covers all branches of updateCategory and
 * deleteCategory, including the VAT cascade transaction.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    vatRate: { findUnique: jest.fn() },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/vat", () => ({
  calculateVat: jest.fn((finalPrice: number, rate: number) => ({
    finalPrice,
    basePrice: Math.round((finalPrice / (1 + rate)) * 100) / 100,
    vatAmount: Math.round((finalPrice - finalPrice / (1 + rate)) * 100) / 100,
    vatRate: rate,
  })),
}));

import {
  updateCategory,
  deleteCategory,
  CategoryNotFoundError,
  VatRateNotFoundError,
  CategoryNameDuplicateError,
  CategoryInUseError,
  CategorySelfReassignError,
  TargetCategoryNotFoundError,
} from "./category.service";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";

const BASE_CATEGORY = {
  id: "cat-1",
  name: "Bebidas",
  vatRateId: "vr-normal",
  vatRate: { id: "vr-normal", label: "Normal (23%)", rate: 0.23 },
  _count: { products: 3 },
};

describe("updateCategory", () => {
  beforeEach(() => jest.clearAllMocks());

  // 1. name-only update
  it("updates name only — no transaction, no VAT recalculation", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.category.update as jest.Mock).mockResolvedValue(BASE_CATEGORY);
    (prisma.category.findUniqueOrThrow as jest.Mock).mockResolvedValue(BASE_CATEGORY);

    const result = await updateCategory("cat-1", { name: "Drinks" });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: { name: "Drinks" },
    });
    expect(result.productCount).toBe(3);
  });

  // 2. vatRateId changed — cascade transaction
  it("runs \$transaction with category update + one product update per active product", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.vatRate.findUnique as jest.Mock).mockResolvedValue({ rate: 0.06 });
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: "p-1", finalPrice: 10.00 },
      { id: "p-2", finalPrice: 20.00 },
    ]);
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    const updatedCat = { ...BASE_CATEGORY, vatRateId: "vr-reduzido", vatRate: { rate: 0.06 } };
    (prisma.category.findUniqueOrThrow as jest.Mock).mockResolvedValue(updatedCat);

    await updateCategory("cat-1", { vatRateId: "vr-reduzido" });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    // 1 category update + 2 product updates = 3 operations
    expect(ops).toHaveLength(3);
  });

  // 3. vatRateId unchanged (same as existing)
  it("does not cascade when vatRateId is identical to current", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.category.update as jest.Mock).mockResolvedValue(BASE_CATEGORY);
    (prisma.category.findUniqueOrThrow as jest.Mock).mockResolvedValue(BASE_CATEGORY);

    await updateCategory("cat-1", { vatRateId: "vr-normal" });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // 4. category not found
  it("throws CategoryNotFoundError when category does not exist", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateCategory("cat-missing", { name: "New" }))
      .rejects.toBeInstanceOf(CategoryNotFoundError);
  });

  // 5. vatRate not found
  it("throws VatRateNotFoundError when new vatRateId does not exist", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.vatRate.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateCategory("cat-1", { vatRateId: "vr-missing" }))
      .rejects.toBeInstanceOf(VatRateNotFoundError);
  });

  // 6. name duplicate
  it("throws CategoryNameDuplicateError when name update violates unique constraint", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.category.update as jest.Mock).mockRejectedValue(new Error("Unique constraint"));

    await expect(updateCategory("cat-1", { name: "Bebidas" }))
      .rejects.toBeInstanceOf(CategoryNameDuplicateError);
  });

  it("recalculates VAT correctly for each product using the new rate", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.vatRate.findUnique as jest.Mock).mockResolvedValue({ rate: 0.06 });
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: "p-1", finalPrice: 10.00 },
    ]);
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    (prisma.category.findUniqueOrThrow as jest.Mock).mockResolvedValue(BASE_CATEGORY);

    await updateCategory("cat-1", { vatRateId: "vr-reduzido" });

    expect(calculateVat).toHaveBeenCalledWith(10.00, 0.06);
  });

  it("returns the updated category with productCount flattened", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ vatRateId: "vr-normal" });
    (prisma.category.update as jest.Mock).mockResolvedValue(BASE_CATEGORY);
    (prisma.category.findUniqueOrThrow as jest.Mock).mockResolvedValue(BASE_CATEGORY);

    const result = await updateCategory("cat-1", { name: "Renamed" });

    expect(result).toHaveProperty("productCount", 3);
    expect(result).not.toHaveProperty("_count");
  });
});

describe("deleteCategory", () => {
  beforeEach(() => jest.clearAllMocks());

  // 7. no products, success
  it("deletes directly when no products are associated", async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
    (prisma.category.delete as jest.Mock).mockResolvedValue({});

    await expect(deleteCategory("cat-1")).resolves.toBeUndefined();
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
  });

  // 8. products > 0, no reassignTo
  it("throws CategoryInUseError with correct count when products exist and no reassign", async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(5);

    const err = await deleteCategory("cat-1").catch((e) => e);
    expect(err).toBeInstanceOf(CategoryInUseError);
    expect((err as CategoryInUseError).count).toBe(5);
  });

  // 9. products > 0, valid reassignTo
  it("reassigns products and deletes via transaction when reassignTo is valid", async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(3);
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat-2" });
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);

    await deleteCategory("cat-1", "cat-2");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });

  // 10. reassignTo === id
  it("throws CategorySelfReassignError before any DB calls when reassignTo equals id", async () => {
    await expect(deleteCategory("cat-1", "cat-1"))
      .rejects.toBeInstanceOf(CategorySelfReassignError);
    expect(prisma.product.count).not.toHaveBeenCalled();
  });

  // 11. unknown reassignTo (target not found)
  it("throws TargetCategoryNotFoundError when reassignTo does not exist", async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(2);
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(deleteCategory("cat-1", "cat-missing"))
      .rejects.toBeInstanceOf(TargetCategoryNotFoundError);
  });

  // 12. category not found on simple delete
  it("throws CategoryNotFoundError when delete throws (category not found)", async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
    (prisma.category.delete as jest.Mock).mockRejectedValue(new Error("Record not found"));

    await expect(deleteCategory("cat-missing"))
      .rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
