import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDatePT(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function durationMin(ms: number | null): string {
  if (!ms) return "";
  return String(Math.round(ms / 60000));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter =
    from || to
      ? {
          closedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {};

  const rawSessions = await prisma.tableSession.findMany({
    where: { status: "CLOSED", ...dateFilter },
    include: {
      table: { select: { name: true } },
      user: { select: { name: true } },
      orderItems: {
        include: { product: { select: { name: true, type: true } } },
        orderBy: { addedAt: "asc" },
      },
    },
    orderBy: { closedAt: "desc" },
  });

  const HEADERS = [
    "Mesa",
    "Staff",
    "Abertura",
    "Fecho",
    "Duração (min)",
    "Pax",
    "Total Sessão (€)",
    "Produto",
    "Tipo",
    "Qtd",
    "Preço Unit. (€)",
    "Subtotal (€)",
  ];

  const rows: string[] = [HEADERS.join(",")];

  for (const s of rawSessions) {
    const sessionTotal = s.orderItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const durationMs =
      s.closedAt && s.openedAt
        ? new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime()
        : null;

    if (s.orderItems.length === 0) {
      // Session with no items — one row, blank item columns
      rows.push(
        [
          escapeCell(s.table.name),
          escapeCell(s.user.name),
          escapeCell(formatDatePT(s.openedAt.toISOString())),
          escapeCell(formatDatePT(s.closedAt?.toISOString() ?? null)),
          escapeCell(durationMin(durationMs)),
          escapeCell(s.consumers),
          escapeCell(sessionTotal.toFixed(2)),
          "", "", "", "", "",
        ].join(",")
      );
    } else {
      for (const item of s.orderItems) {
        rows.push(
          [
            escapeCell(s.table.name),
            escapeCell(s.user.name),
            escapeCell(formatDatePT(s.openedAt.toISOString())),
            escapeCell(formatDatePT(s.closedAt?.toISOString() ?? null)),
            escapeCell(durationMin(durationMs)),
            escapeCell(s.consumers),
            escapeCell(sessionTotal.toFixed(2)),
            escapeCell(item.product.name),
            escapeCell(item.product.type === "DRINK" ? "Bebida" : "Prato"),
            escapeCell(item.quantity),
            escapeCell(item.unitPrice.toFixed(2)),
            escapeCell((item.quantity * item.unitPrice).toFixed(2)),
          ].join(",")
        );
      }
    }
  }

  // BOM prefix so Excel auto-detects UTF-8
  const csv = "\uFEFF" + rows.join("\r\n");

  const fromLabel = from ?? "inicio";
  const toLabel = to ?? "fim";
  const filename = `checkmesa-historico-${fromLabel}-${toLabel}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
