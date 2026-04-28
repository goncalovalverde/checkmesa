"use client";
// Client component — owns the print/close buttons (event handlers).
// Renders the <body> content of a thermal 80mm POS receipt.

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // e.g. 0.13 or 0.23
}

export interface ReceiptData {
  tableName: string;
  staffName: string;
  consumers: number;
  openedAt: string | Date;
  closedAt?: string | Date | null;
  items: ReceiptItem[];
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildVatGroups(items: ReceiptItem[]) {
  const groups: Record<number, { base: number; vat: number }> = {};
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    const base = line / (1 + item.vatRate);
    const vat = line - base;
    if (!groups[item.vatRate]) groups[item.vatRate] = { base: 0, vat: 0 };
    groups[item.vatRate].base += base;
    groups[item.vatRate].vat += vat;
  }
  return groups;
}

export function ThermalReceiptBody({ data }: { data: ReceiptData }) {
  const total = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const vatGroups = buildVatGroups(data.items);
  const dash32 = "--------------------------------";
  const eq32   = "================================";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 9pt;
          color: #000;
          background: #fff;
        }
        .receipt {
          width: 72mm;
          max-width: 72mm;
          margin: 0 auto;
          padding: 4mm 0;
        }
        .center { text-align: center; }
        .right  { text-align: right; }
        .bold   { font-weight: bold; }
        .pre    { white-space: pre; font-family: inherit; font-size: inherit; }
        .sep    { color: #000; letter-spacing: -0.5px; }
        .header { text-align: center; margin-bottom: 4mm; }
        .header .logo { font-size: 13pt; font-weight: bold; letter-spacing: 2px; }
        .header .sub  { font-size: 7.5pt; color: #333; }
        .meta   { font-size: 8pt; margin: 2mm 0; line-height: 1.6; }
        .meta-row { display: flex; justify-content: space-between; }
        .items  { width: 100%; border-collapse: collapse; margin: 2mm 0; }
        .items th { font-size: 7.5pt; text-align: left; padding: 0; }
        .items th.r, .items td.r { text-align: right; }
        .items td { font-size: 8.5pt; padding: 0.5mm 0; vertical-align: top; }
        .items td.name { max-width: 38mm; word-break: break-word; }
        .totals { margin: 2mm 0; }
        .totals-row { display: flex; justify-content: space-between; font-size: 8.5pt; line-height: 1.7; }
        .totals-row.grand { font-size: 11pt; font-weight: bold; margin-top: 1mm; }
        .vat-section { font-size: 7.5pt; margin: 1mm 0; color: #333; }
        .vat-row { display: flex; justify-content: space-between; line-height: 1.6; }
        .footer { text-align: center; font-size: 8pt; margin-top: 3mm; line-height: 1.8; }

        .no-print { margin-bottom: 6mm; display: flex; gap: 6px; }
        @media print {
          .no-print { display: none !important; }
          @page { size: 80mm auto; margin: 3mm 4mm; }
          html, body { width: 80mm; }
        }
        @media screen {
          body { background: #e0e0e0; padding: 16px; }
          .receipt { background: #fff; padding: 6mm; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
        }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print">
        <button
          onClick={() => window.print()}
          style={{ padding: "6px 14px", background: "#1B6B5A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontFamily: "system-ui" }}
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: "6px 14px", background: "#f0f0ec", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "system-ui" }}
        >
          ✕ Fechar
        </button>
      </div>

      <div className="receipt">
        {/* Header */}
        <div className="header">
          <div className="logo">✦ CheckMesa ✦</div>
          <div className="sub">Gestão de Sala</div>
        </div>

        <div className="sep pre">{eq32}</div>

        {/* Session metadata */}
        <div className="meta">
          <div className="meta-row"><span>Mesa:</span><span className="bold">{data.tableName}</span></div>
          <div className="meta-row"><span>Data:</span><span>{fmtDate(data.openedAt)}</span></div>
          {data.closedAt && (
            <div className="meta-row"><span>Fecho:</span><span>{fmtDate(data.closedAt)}</span></div>
          )}
          <div className="meta-row"><span>Staff:</span><span>{data.staffName}</span></div>
          <div className="meta-row"><span>Pax:</span><span>{data.consumers}</span></div>
        </div>

        <div className="sep pre">{dash32}</div>

        {/* Column headers */}
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: "55%" }}>Descrição</th>
              <th className="r" style={{ width: "15%" }}>Qtd</th>
              <th className="r" style={{ width: "30%" }}>Total</th>
            </tr>
          </thead>
        </table>

        <div className="sep pre">{dash32}</div>

        {/* Line items */}
        <table className="items">
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td className="name">{item.name}</td>
                <td className="r">×{item.quantity}</td>
                <td className="r">€{(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="sep pre">{dash32}</div>

        {/* IVA breakdown */}
        {Object.entries(vatGroups).length > 0 && (
          <div className="vat-section">
            {Object.entries(vatGroups).map(([rate, { base, vat }]) => (
              <div key={rate} className="vat-row">
                <span>IVA {(parseFloat(rate) * 100).toFixed(0)}% (base €{base.toFixed(2)})</span>
                <span>€{vat.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="totals">
          <div className="sep pre">{eq32}</div>
          <div className="totals-row grand">
            <span>TOTAL</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <div className="sep pre">{eq32}</div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div>Obrigado pela visita!</div>
          <div>Volte sempre ✦</div>
        </div>
      </div>
    </>
  );
}
