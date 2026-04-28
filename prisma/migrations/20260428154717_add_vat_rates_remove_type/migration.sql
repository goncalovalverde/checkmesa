/*
  Warnings:
  - Removes `type` column from `Product` table.
  - Adds `vatRateId` to `Category` (existing rows assigned Intermédio 13% by default).
  - Creates `VatRate` table seeded with standard Portuguese rates.
*/

-- CreateTable
CREATE TABLE "VatRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "rate" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VatRate_label_key" ON "VatRate"("label");

-- Seed standard Portuguese VAT rates
INSERT INTO "VatRate" ("id", "label", "rate") VALUES
    ('vr-isento',     'Isento (0%)',       0.0),
    ('vr-reduzido',   'Reduzido (6%)',     0.06),
    ('vr-intermedio', 'Intermédio (13%)',  0.13),
    ('vr-normal',     'Normal (23%)',      0.23);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Add nullable vatRateId to Category, assign default 13%, then rebuild as NOT NULL
ALTER TABLE "Category" ADD COLUMN "vatRateId" TEXT;
UPDATE "Category" SET "vatRateId" = 'vr-intermedio';

CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "vatRateId" TEXT NOT NULL,
    CONSTRAINT "Category_vatRateId_fkey" FOREIGN KEY ("vatRateId") REFERENCES "VatRate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("id", "name", "vatRateId") SELECT "id", "name", "vatRateId" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Rebuild Product without type column
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "finalPrice" REAL NOT NULL,
    "basePrice" REAL NOT NULL,
    "vatAmount" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("active", "basePrice", "categoryId", "finalPrice", "id", "name", "vatAmount", "vatRate") SELECT "active", "basePrice", "categoryId", "finalPrice", "id", "name", "vatAmount", "vatRate" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
