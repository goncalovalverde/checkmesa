import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface SearchParams {
  from?: string;
  to?: string;
}

function fmt(iso: string | Date | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(ms: number | null): string {
  if (!ms) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function ImprimirPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session?.user.role !== "ADMIN") redirect("/sala");

  const { from, to } = await searchParams;

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

  const sessions = rawSessions.map((s) => {
    const total = s.orderItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const durationMs =
      s.closedAt && s.openedAt
        ? new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime()
        : null;
    return { ...s, total, durationMs };
  });

  const totalRevenue = sessions.reduce((acc, s) => acc + s.total, 0);
  const totalConsumers = sessions.reduce((acc, s) => acc + s.consumers, 0);

  const periodLabel =
    from && to ? `${from} → ${to}` : from ? `a partir de ${from}` : to ? `até ${to}` : "Todos os registos";

  const printedAt = new Date().toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <title>CheckMesa — Histórico {periodLabel}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px 24px; }
          h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
          .meta { font-size: 10px; color: #555; margin-bottom: 16px; }

          .summary { display: flex; gap: 24px; margin-bottom: 20px; padding: 12px 16px; background: #f6f6f4; border-radius: 6px; }
          .summary-item { display: flex; flex-direction: column; gap: 2px; }
          .summary-label { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #888; }
          .summary-value { font-size: 15px; font-weight: 700; color: #0F3D34; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead tr { background: #0F3D34; color: #fff; }
          th { padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
          th:last-child, td:last-child { text-align: right; }
          td { padding: 5px 8px; border-bottom: 1px solid #e8e8e4; vertical-align: top; }
          tr:nth-child(even) td { background: #fafaf8; }

          .items-table { width: 100%; border-collapse: collapse; margin: 4px 0 8px 16px; }
          .items-table th { background: #f0f0ec; color: #333; font-size: 8.5px; padding: 3px 6px; }
          .items-table td { padding: 3px 6px; border-bottom: 1px solid #eee; font-size: 10px; }
          .items-table td:nth-child(3),
          .items-table td:nth-child(4),
          .items-table td:nth-child(5) { text-align: right; }
          .items-table tfoot td { font-weight: 700; border-top: 1px solid #ccc; border-bottom: none; }
          .items-table tfoot td:last-child { text-align: right; color: #0F3D34; }

          .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8.5px; font-weight: 600; }
          .badge-drink { background: #DBEAFE; color: #1D4ED8; }
          .badge-dish  { background: #FEF3C7; color: #92400E; }

          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 9px; color: #888; display: flex; justify-content: space-between; }

          @media print {
            body { padding: 10px; }
            @page { margin: 15mm; size: A4; }
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Print / Back buttons — hidden when printing */}
        <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "6px 16px", background: "#1B6B5A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
          <a
            href="/admin/historico"
            style={{ padding: "6px 16px", background: "#f0f0ec", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", textDecoration: "none", fontWeight: 600 }}
          >
            ← Voltar
          </a>
        </div>

        <h1>CheckMesa — Histórico de Contas</h1>
        <p className="meta">Período: {periodLabel} · Impresso em {printedAt}</p>

        {/* Summary */}
        <div className="summary">
          <div className="summary-item">
            <span className="summary-label">Receita Total</span>
            <span className="summary-value">€{totalRevenue.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Serviços</span>
            <span className="summary-value">{sessions.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Média/Serviço</span>
            <span className="summary-value">
              €{sessions.length > 0 ? (totalRevenue / sessions.length).toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Consumidores</span>
            <span className="summary-value">{totalConsumers}</span>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>
            Nenhuma conta fechada no período selecionado.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Staff</th>
                <th>Abertura</th>
                <th>Fecho</th>
                <th>Duração</th>
                <th>Pax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <>
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.table.name}</td>
                    <td>{s.user.name}</td>
                    <td>{fmt(s.openedAt)}</td>
                    <td>{fmt(s.closedAt)}</td>
                    <td>{fmtDuration(s.durationMs)}</td>
                    <td style={{ textAlign: "center" }}>{s.consumers}</td>
                    <td style={{ fontWeight: 700, color: "#0F3D34" }}>€{s.total.toFixed(2)}</td>
                  </tr>
                  {s.orderItems.length > 0 && (
                    <tr key={`${s.id}-items`}>
                      <td colSpan={7} style={{ padding: "0 0 8px 8px", borderBottom: "2px solid #d0e8e0" }}>
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left" }}>Produto</th>
                              <th style={{ textAlign: "left" }}>Categoria</th>
                              <th>Qtd</th>
                              <th>Preço Unit.</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.orderItems.map((item) => (
                              <tr key={item.id}>
                                <td>{item.product.name}</td>
                                <td>
                                  <span className="badge">
                                    {item.product.category.name}
                                  </span>
                                </td>
                                <td>×{item.quantity}</td>
                                <td>€{item.unitPrice.toFixed(2)}</td>
                                <td>€{(item.quantity * item.unitPrice).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={4}>Total</td>
                              <td>€{s.total.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        <div className="footer">
          <span>CheckMesa · Histórico de Contas</span>
          <span>{periodLabel}</span>
        </div>
      </body>
    </html>
  );
}
