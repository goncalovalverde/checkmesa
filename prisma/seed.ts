import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const VAT_RATE_IDS = {
  isento: "vr-isento",
  reduzido: "vr-reduzido",
  intermedio: "vr-intermedio",
  normal: "vr-normal",
} as const;

function calculateVat(finalPrice: number, rate: number) {
  const basePrice = Math.round((finalPrice / (1 + rate)) * 100) / 100;
  const vatAmount = Math.round((finalPrice - basePrice) * 100) / 100;
  return { finalPrice, basePrice, vatAmount, vatRate: rate };
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  if (!adminPassword || !staffPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD must be set in .env before seeding.\n" +
      "Example: SEED_ADMIN_PASSWORD=MyStr0ngP@ss SEED_STAFF_PASSWORD=St@ffP@ss npx prisma db seed"
    );
  }
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const staffHash = await bcrypt.hash(staffPassword, 12);

  await prisma.user.upsert({
    where: { email: "admin@checkmesa.pt" },
    update: { password: adminHash },
    create: { name: "Administrador", email: "admin@checkmesa.pt", password: adminHash, role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "staff@checkmesa.pt" },
    update: { password: staffHash },
    create: { name: "Staff", email: "staff@checkmesa.pt", password: staffHash, role: "STAFF" },
  });

  const tables = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Esplanada 1", "Esplanada 2", "Bar 1"];
  for (const name of tables) {
    await prisma.table.upsert({
      where: { name },
      update: {},
      create: { name, capacity: 4 },
    });
  }

  // Ensure VAT rates exist (migration seeds them, but upsert is safe for repeated runs)
  for (const [key, id] of Object.entries({
    [VAT_RATE_IDS.isento]: { label: "Isento (0%)", rate: 0.0 },
    [VAT_RATE_IDS.reduzido]: { label: "Reduzido (6%)", rate: 0.06 },
    [VAT_RATE_IDS.intermedio]: { label: "Intermédio (13%)", rate: 0.13 },
    [VAT_RATE_IDS.normal]: { label: "Normal (23%)", rate: 0.23 },
  })) {
    await prisma.vatRate.upsert({
      where: { id: key },
      update: {},
      create: { id: key, ...id },
    });
  }

  const categoryDefs: { name: string; vatRateId: string }[] = [
    { name: "Bebidas",     vatRateId: VAT_RATE_IDS.normal },
    { name: "Entradas",    vatRateId: VAT_RATE_IDS.intermedio },
    { name: "Pratos",      vatRateId: VAT_RATE_IDS.intermedio },
    { name: "Sobremesas",  vatRateId: VAT_RATE_IDS.intermedio },
  ];

  const categoryMap: Record<string, string> = {};
  for (const def of categoryDefs) {
    const cat = await prisma.category.upsert({
      where: { name: def.name },
      update: { vatRateId: def.vatRateId },
      create: def,
    });
    categoryMap[def.name] = cat.id;
  }

  const products: { name: string; vatRate: number; category: string; finalPrice: number }[] = [
    { name: "Água 0.5L",             vatRate: 0.23, category: "Bebidas",    finalPrice: 1.5  },
    { name: "Sumo de Laranja",        vatRate: 0.23, category: "Bebidas",    finalPrice: 2.5  },
    { name: "Cerveja",                vatRate: 0.23, category: "Bebidas",    finalPrice: 2.0  },
    { name: "Vinho Tinto (copo)",     vatRate: 0.23, category: "Bebidas",    finalPrice: 3.0  },
    { name: "Café",                   vatRate: 0.23, category: "Bebidas",    finalPrice: 1.0  },
    { name: "Sopa do Dia",            vatRate: 0.13, category: "Entradas",   finalPrice: 3.5  },
    { name: "Salada Mista",           vatRate: 0.13, category: "Entradas",   finalPrice: 4.5  },
    { name: "Frango Grelhado",        vatRate: 0.13, category: "Pratos",     finalPrice: 12.5 },
    { name: "Bacalhau à Brás",        vatRate: 0.13, category: "Pratos",     finalPrice: 14.0 },
    { name: "Bife com Batatas",       vatRate: 0.13, category: "Pratos",     finalPrice: 15.5 },
    { name: "Peixe do Dia",           vatRate: 0.13, category: "Pratos",     finalPrice: 13.0 },
    { name: "Pastel de Nata",         vatRate: 0.13, category: "Sobremesas", finalPrice: 1.8  },
    { name: "Mousse de Chocolate",    vatRate: 0.13, category: "Sobremesas", finalPrice: 3.5  },
  ];

  for (const p of products) {
    const vat = calculateVat(p.finalPrice, p.vatRate);
    await prisma.product.upsert({
      where: { id: p.name },
      update: {},
      create: {
        id: p.name,
        name: p.name,
        categoryId: categoryMap[p.category],
        finalPrice: vat.finalPrice,
        basePrice: vat.basePrice,
        vatAmount: vat.vatAmount,
        vatRate: vat.vatRate,
      },
    });
  }

  console.log("✅ Seed concluído");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
