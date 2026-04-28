// docker-seed.js — run inside the production container on first deploy only.
// Invoked by the CI workflow via: docker cp + docker exec node /tmp/docker-seed.js
//
// Idempotency: exits immediately if ANY user exists (= not a fresh install).
// All-or-nothing: all data is created in a single transaction so a partial
// failure leaves the DB empty and re-runnable on the next deploy.

"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const VAT_RATES = [
  { id: "vr-isento",     label: "Isento (0%)",     rate: 0.0  },
  { id: "vr-reduzido",   label: "Reduzido (6%)",    rate: 0.06 },
  { id: "vr-intermedio", label: "Intermédio (13%)", rate: 0.13 },
  { id: "vr-normal",     label: "Normal (23%)",      rate: 0.23 },
];

const CATEGORIES = [
  { name: "Bebidas",    vatRateId: "vr-normal"     },
  { name: "Entradas",   vatRateId: "vr-intermedio" },
  { name: "Pratos",     vatRateId: "vr-intermedio" },
  { name: "Sobremesas", vatRateId: "vr-intermedio" },
];

const TABLES = [
  "Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4",
  "Esplanada 1", "Esplanada 2", "Bar 1",
];

// finalPrice is the VAT-inclusive price paid by the customer.
const PRODUCTS = [
  { name: "Água 0.5L",          category: "Bebidas",    vatRate: 0.23, finalPrice: 1.5  },
  { name: "Sumo de Laranja",     category: "Bebidas",    vatRate: 0.23, finalPrice: 2.5  },
  { name: "Cerveja",             category: "Bebidas",    vatRate: 0.23, finalPrice: 2.0  },
  { name: "Vinho Tinto (copo)",  category: "Bebidas",    vatRate: 0.23, finalPrice: 3.0  },
  { name: "Café",                category: "Bebidas",    vatRate: 0.23, finalPrice: 1.0  },
  { name: "Sopa do Dia",         category: "Entradas",   vatRate: 0.13, finalPrice: 3.5  },
  { name: "Salada Mista",        category: "Entradas",   vatRate: 0.13, finalPrice: 4.5  },
  { name: "Frango Grelhado",     category: "Pratos",     vatRate: 0.13, finalPrice: 12.5 },
  { name: "Bacalhau à Brás",     category: "Pratos",     vatRate: 0.13, finalPrice: 14.0 },
  { name: "Bife com Batatas",    category: "Pratos",     vatRate: 0.13, finalPrice: 15.5 },
  { name: "Peixe do Dia",        category: "Pratos",     vatRate: 0.13, finalPrice: 13.0 },
  { name: "Pastel de Nata",      category: "Sobremesas", vatRate: 0.13, finalPrice: 1.8  },
  { name: "Mousse de Chocolate", category: "Sobremesas", vatRate: 0.13, finalPrice: 3.5  },
];

function calcVat(finalPrice, rate) {
  const basePrice  = Math.round((finalPrice / (1 + rate)) * 100) / 100;
  const vatAmount  = Math.round((finalPrice - basePrice) * 100) / 100;
  return { basePrice, vatAmount };
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("✗ SEED_ADMIN_PASSWORD is not set");
    process.exit(1);
  }

  // Fresh-install guard — skip entirely if any user already exists.
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("✓ Database already seeded — skipping");
    return;
  }

  console.log("Seeding fresh database…");
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        name: "Administrador",
        email: "admin@checkmesa.pt",
        password: adminHash,
        role: "ADMIN",
      },
    });

    for (const vr of VAT_RATES) {
      await tx.vatRate.create({ data: vr });
    }

    // Build a name→id map so products can reference their category.
    const categoryMap = {};
    for (const cat of CATEGORIES) {
      const created = await tx.category.create({ data: cat });
      categoryMap[cat.name] = created.id;
    }

    for (const name of TABLES) {
      await tx.table.create({ data: { name, capacity: 4 } });
    }

    for (const p of PRODUCTS) {
      const { basePrice, vatAmount } = calcVat(p.finalPrice, p.vatRate);
      await tx.product.create({
        data: {
          name:       p.name,
          categoryId: categoryMap[p.category],
          finalPrice: p.finalPrice,
          basePrice,
          vatAmount,
          vatRate:    p.vatRate,
        },
      });
    }
  });

  console.log(
    `✓ Seed concluído — admin, ${VAT_RATES.length} IVAs, ` +
    `${CATEGORIES.length} categorias, ${TABLES.length} mesas, ` +
    `${PRODUCTS.length} produtos criados`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
