import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

type ProductType = "DRINK" | "DISH";
function calculateVat(finalPrice: number, type: ProductType) {
  const vatRate = type === "DRINK" ? 0.23 : 0.13;
  const basePrice = Math.round((finalPrice / (1 + vatRate)) * 100) / 100;
  const vatAmount = Math.round((finalPrice - basePrice) * 100) / 100;
  return { finalPrice, basePrice, vatAmount, vatRate };
}

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const staffHash = await bcrypt.hash("staff123", 12);

  await prisma.user.upsert({
    where: { email: "admin@checkmesa.pt" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@checkmesa.pt",
      password: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@checkmesa.pt" },
    update: {},
    create: {
      name: "Staff",
      email: "staff@checkmesa.pt",
      password: staffHash,
      role: "STAFF",
    },
  });

  const tables = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Esplanada 1", "Esplanada 2", "Bar 1"];
  for (const name of tables) {
    await prisma.table.upsert({
      where: { name },
      update: {},
      create: { name, capacity: 4 },
    });
  }

  const categoryNames = ["Bebidas", "Entradas", "Pratos", "Sobremesas"];
  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap[name] = cat.id;
  }

  const products: { name: string; type: "DRINK" | "DISH"; category: string; finalPrice: number }[] = [
    { name: "Água 0.5L", type: "DRINK", category: "Bebidas", finalPrice: 1.5 },
    { name: "Sumo de Laranja", type: "DRINK", category: "Bebidas", finalPrice: 2.5 },
    { name: "Cerveja", type: "DRINK", category: "Bebidas", finalPrice: 2.0 },
    { name: "Vinho Tinto (copo)", type: "DRINK", category: "Bebidas", finalPrice: 3.0 },
    { name: "Café", type: "DRINK", category: "Bebidas", finalPrice: 1.0 },
    { name: "Sopa do Dia", type: "DISH", category: "Entradas", finalPrice: 3.5 },
    { name: "Salada Mista", type: "DISH", category: "Entradas", finalPrice: 4.5 },
    { name: "Frango Grelhado", type: "DISH", category: "Pratos", finalPrice: 12.5 },
    { name: "Bacalhau à Brás", type: "DISH", category: "Pratos", finalPrice: 14.0 },
    { name: "Bife com Batatas", type: "DISH", category: "Pratos", finalPrice: 15.5 },
    { name: "Peixe do Dia", type: "DISH", category: "Pratos", finalPrice: 13.0 },
    { name: "Pastel de Nata", type: "DISH", category: "Sobremesas", finalPrice: 1.8 },
    { name: "Mousse de Chocolate", type: "DISH", category: "Sobremesas", finalPrice: 3.5 },
  ];

  for (const p of products) {
    const vat = calculateVat(p.finalPrice, p.type);
    await prisma.product.upsert({
      where: { id: p.name },
      update: {},
      create: {
        id: p.name,
        name: p.name,
        type: p.type,
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
