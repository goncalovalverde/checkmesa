import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExportQuerySchema } from "@/lib/schemas";
import { requireRole } from "@/lib/auth-guard";

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  const FORMULA_CHARS = ["=", "+", "-", "@", "\t", "\r"];
  const safe = FORMULA_CHARS.some(c => str.startsWith(c)) ? `'${str}` : str;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
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
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const queryParsed = ExportQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to:   searchParams.get("to") ?? undefined,
  });
  if (!queryParsed.success) {
    return NextResponse.json({ error: "Parâmetros de data inválidos (formato: YYYY-MM-DD)" }, { status: 400 });
  }
  const { from, to } = queryParsed.data;

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
        include: { product: { select: { name: true, category: { select: { name: true } } } } },
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
            escapeCell(item.product.category.name),
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

  const sanitizeParam = (s: string) => s.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 30);
  const fromLabel = from ? sanitizeParam(from) : "inicio";
  const toLabel   = to   ? sanitizeParam(to)   : "fim";
  const filename  = `checkmesa-historico-${fromLabel}-${toLabel}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
