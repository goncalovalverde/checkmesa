"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderItemRow } from "@/components/sala/OrderItemRow";
import { ProductGrid } from "@/components/sala/ProductGrid";

interface Product {
  id: string; name: string; category: string;
  finalPrice: number; basePrice: number; vatAmount: number; vatRate: number; active: boolean;
}
interface OrderItem {
  id: string; sessionId: string; productId: string; quantity: number; unitPrice: number; product: Product;
}
interface Table { id: string; name: string; capacity: number; status: "FREE" | "OCCUPIED"; }
interface TableSession {
  id: string; tableId: string; openedBy: string; consumers: number;
  status: "OPEN" | "CLOSED"; openedAt: string; closedAt: string | null;
  table: Table; orderItems: OrderItem[];
}

export default function TablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<TableSession | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/tables/${tableId}/session`);
        if (!res.ok) throw new Error("Sem sessão activa");
        const data: TableSession | null = await res.json();
        if (!data) { router.push("/sala"); return; }
        setSessionId(data.id);
        setSession(data);
        setItems(data.orderItems ?? []);
      } catch {
        router.push("/sala");
      }
    }
    init();
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data.filter((p) => p.active)))
      .catch(() => setError("Erro ao carregar produtos"))
      .finally(() => setLoadingProducts(false));
  }, [tableId, router]);

  async function handleAddProduct(product: Product) {
    if (!sessionId) return;
    const optimisticItem: OrderItem = {
      id: `tmp-${Date.now()}`, sessionId, productId: product.id,
      quantity: 1, unitPrice: product.finalPrice, product,
    };
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, optimisticItem];
    });
    try {
      const res = await fetch("/api/order-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, productId: product.id }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar item");
      const newItem: OrderItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === optimisticItem.id || i.productId === product.id) ? newItem : i));
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== optimisticItem.id));
      setError("Erro ao adicionar produto");
    }
  }

  async function handleQuantityChange(itemId: string, newQty: number) {
    try {
      const res = await fetch(`/api/order-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (res.status === 204 || newQty === 0) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        return;
      }
      if (!res.ok) throw new Error("Erro ao atualizar");
      const updated: OrderItem = await res.json();
      setItems((prev) => prev.map((i) => i.id === itemId ? updated : i));
    } catch {
      setError("Erro ao atualizar quantidade");
    }
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (!session && !error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--brand)", fontFamily: "var(--font-display)" }}>A carregar…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* HUD */}
      <header className="hud">
        <button
          onClick={() => router.push("/sala")}
          style={{ color: "rgba(255,255,255,.7)", background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xl)", padding: "var(--s2)", minHeight: "var(--touch-sm)", display: "flex", alignItems: "center" }}
          aria-label="Voltar"
        >←</button>

        <div className="hud-cell">
          <span className="hud-val">{session?.table?.name ?? "Mesa"}</span>
          <span className="hud-lbl">Mesa</span>
        </div>
        <div className="hud-sep" />
        <div className="hud-cell">
          <span className="hud-val">{session?.consumers ?? 0}</span>
          <span className="hud-lbl">Pessoas</span>
        </div>
        <div className="hud-sep" />
        <div className="hud-cell">
          <span className="hud-val">{itemCount}</span>
          <span className="hud-lbl">Itens</span>
        </div>
        <div className="hud-sep" />
        <div className="hud-cell hud-total">
          <span className="hud-val">€{total.toFixed(2)}</span>
          <span className="hud-lbl">Total</span>
        </div>

        <button
          onClick={() => router.push(`/sala/${tableId}/consulta`)}
          className="btn btn-primary"
          style={{ minHeight: "var(--touch-sm)", fontSize: "var(--text-sm)", padding: "0 var(--s4)" }}
        >
          CONTA
        </button>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {/* Order list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {items.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--s10) var(--s4)", fontSize: "var(--text-sm)" }}>
            Nenhum item ainda. Selecione produtos abaixo.
          </p>
        ) : (
          items.map((item) => (
            <OrderItemRow key={item.id} item={item} onQuantityChange={handleQuantityChange} />
          ))
        )}
      </div>

      {/* Product picker */}
      <div style={{ height: 300, borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-card)" }}>
        {loadingProducts ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            A carregar produtos…
          </div>
        ) : (
          <ProductGrid products={products} onAddProduct={handleAddProduct} />
        )}
      </div>
    </div>
  );
}
