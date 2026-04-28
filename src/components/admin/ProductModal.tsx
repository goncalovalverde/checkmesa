"use client";
import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ModalShell";

interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  finalPrice: number;
  basePrice: number;
  vatAmount: number;
  vatRate: number;
  active: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  vatRate: { id: string; label: string; rate: number };
}

interface Props {
  product: Product | null;
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProductModal({ product, categories, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [finalPrice, setFinalPrice] = useState(String(product?.finalPrice ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(product?.name ?? "");
    setCategoryId(product?.categoryId ?? "");
    setFinalPrice(String(product?.finalPrice ?? ""));
    setError("");
  }, [product]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const vatRate = selectedCategory?.vatRate?.rate ?? 0;
  const fp = parseFloat(finalPrice) || 0;
  const basePrice = vatRate > 0 ? fp / (1 + vatRate) : fp;
  const vatAmount = fp - basePrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = isEdit ? `/api/products/${product.id}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categoryId, finalPrice: fp }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao guardar produto");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title={isEdit ? "Editar Produto" : "Novo Produto"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        </div>

        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="input"
            style={{ cursor: "pointer" }}
          >
            <option value="">Selecionar categoria…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} — {cat.vatRate?.label ?? "IVA?"}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Preço Final (€)</label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.]*"
            value={finalPrice}
            onChange={(e) => setFinalPrice(e.target.value)}
            required
            placeholder="0.00"
            className="input"
            style={{ fontSize: "var(--text-lg)", fontWeight: 700, textAlign: "right" }}
          />
        </div>

        {fp > 0 && selectedCategory && (
          <div style={{
            background: "var(--bg-warm)",
            borderRadius: "var(--r-md)",
            padding: "var(--s3) var(--s4)",
            marginBottom: "var(--s4)",
            display: "flex",
            gap: "var(--s5)",
            justifyContent: "center",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
          }}>
            <span>IVA <strong style={{ color: "var(--brand)" }}>{(vatRate * 100).toFixed(0)}%</strong></span>
            <span>Base <strong>€{basePrice.toFixed(2)}</strong></span>
            <span>IVA <strong>€{vatAmount.toFixed(2)}</strong></span>
          </div>
        )}

        {error && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{error}</div>}

        <div style={{ display: "flex", gap: "var(--s3)" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
            {loading ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

