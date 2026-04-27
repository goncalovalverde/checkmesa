"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IvaBreakdown } from "@/components/sala/consulta/IvaBreakdown";
import { SplitByPerson } from "@/components/sala/consulta/SplitByPerson";

interface Product {
  id: string; name: string; type: "DRINK" | "DISH"; category: string;
  finalPrice: number; basePrice: number; vatAmount: number; vatRate: number; active: boolean;
}
interface OrderItem {
  id: string; sessionId: string; productId: string; quantity: number; unitPrice: number; product: Product;
}
interface TableSession {
  id: string; tableId: string; consumers: number; status: "OPEN" | "CLOSED";
  table: { id: string; name: string; capacity: number; status: "FREE" | "OCCUPIED" };
  orderItems: OrderItem[];
}

export default function ConsultaPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<TableSession | null>(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [splitTab, setSplitTab] = useState<"pessoas" | "itens">("pessoas");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/tables/${tableId}/session`);
        if (!res.ok) throw new Error("Sessão não encontrada");
        const data: TableSession | null = await res.json();
        if (!data) { router.push("/sala"); return; }
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar sessão");
      }
    }
    init();
  }, [tableId, router]);

  async function handleClose() {
    if (!session) return;
    setClosing(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!res.ok) throw new Error("Erro ao fechar mesa");
      router.push("/sala");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setClosing(false);
    }
  }

  const items = session?.orderItems ?? [];
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const checkedTotal = items
    .filter((i) => checkedItems.has(i.id))
    .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  if (!session && !error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--brand)", fontFamily: "var(--font-display)" }}>A carregar…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* App bar */}
      <header className="app-bar">
        <button
          onClick={() => router.push(`/sala/${tableId}`)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xl)", color: "var(--text-secondary)", minHeight: "var(--touch-sm)", padding: "0 var(--s2)" }}
          aria-label="Voltar"
        >←</button>
        <div style={{ flex: 1, paddingLeft: "var(--s2)" }}>
          <p className="app-bar-title">Consulta de Conta</p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{session?.table?.name}</p>
        </div>
      </header>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--s4)", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        {error && <div className="alert-error" style={{ margin: 0 }}>{error}</div>}

        {/* Order summary */}
        <div className="card" style={{ padding: "var(--s4)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--s3)" }}>Resumo do pedido</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.product.name}
                  <span style={{ color: "var(--text-muted)", marginLeft: "var(--s1)" }}>×{item.quantity}</span>
                </span>
                <span style={{ fontWeight: 600 }}>€{(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: "var(--s3)", paddingTop: "var(--s3)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: "var(--brand)", fontSize: "var(--text-lg)" }}>€{total.toFixed(2)}</span>
          </div>
        </div>

        <IvaBreakdown orderItems={items} />

        {/* Split tabs */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="screen-tabs">
            {(["pessoas", "itens"] as const).map((tab) => (
              <button key={tab} onClick={() => setSplitTab(tab)} className={`screen-tab${splitTab === tab ? " active" : ""}`}>
                {tab === "pessoas" ? "Por Pessoas" : "Por Consumo"}
              </button>
            ))}
          </div>
          <div style={{ padding: "var(--s4)" }}>
            {splitTab === "pessoas" ? (
              <SplitByPerson total={total} defaultPeople={session?.consumers ?? 2} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Selecione itens para calcular parcial:</p>
                {items.map((item) => (
                  <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "var(--s3)", cursor: "pointer", minHeight: "var(--touch-sm)" }}>
                    <input
                      type="checkbox"
                      checked={checkedItems.has(item.id)}
                      onChange={(e) => {
                        const next = new Set(checkedItems);
                        e.target.checked ? next.add(item.id) : next.delete(item.id);
                        setCheckedItems(next);
                      }}
                      style={{ width: 20, height: 20, accentColor: "var(--brand)", cursor: "pointer" }}
                    />
                    <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                      {item.product.name} <span style={{ color: "var(--text-muted)" }}>×{item.quantity}</span>
                    </span>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>€{(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </label>
                ))}
                {checkedItems.size > 0 && (
                  <div style={{ background: "var(--brand-light)", borderRadius: "var(--r-md)", padding: "var(--s4)", textAlign: "center" }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--brand)" }}>€{checkedTotal.toFixed(2)}</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--brand-muted)" }}>selecionado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <button onClick={handleClose} disabled={closing} className="btn btn-primary btn-w100 btn-lg">
          {closing ? "A fechar…" : "Fechar Mesa"}
        </button>
      </div>
    </div>
  );
}
