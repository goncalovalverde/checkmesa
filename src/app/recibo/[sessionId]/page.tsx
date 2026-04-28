import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ThermalReceiptBody, type ReceiptData } from "@/components/ThermalReceiptBody";

type Params = { params: Promise<{ sessionId: string }> };

export default async function ReciboPage({ params }: Params) {
  const { sessionId } = await params;

  const authSession = await getServerSession(authOptions);
  if (!authSession) redirect("/login");

  const record = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: {
      table: { select: { name: true } },
      user: { select: { name: true } },
      orderItems: {
        include: { product: { select: { name: true, vatRate: true } } },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!record) redirect("/sala");

  const data: ReceiptData = {
    tableName: record.table.name,
    staffName: record.user.name,
    consumers: record.consumers,
    openedAt: record.openedAt,
    closedAt: record.closedAt,
    items: record.orderItems.map((i) => ({
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      vatRate: i.product.vatRate,
    })),
  };

  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Recibo — ${data.tableName}`}</title>
      </head>
      <body>
        <ThermalReceiptBody data={data} />
      </body>
    </html>
  );
}
