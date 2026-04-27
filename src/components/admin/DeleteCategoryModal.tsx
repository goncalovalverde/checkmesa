"use client";
import { useState } from "react";
import { ModalShell } from "@/components/ModalShell";

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface DeleteCategoryModalProps {
  category: Category;
  otherCategories: Category[];
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteCategoryModal({ category, otherCategories, onClose, onDeleted }: DeleteCategoryModalProps) {
  const [reassignTo, setReassignTo] = useState<string>(otherCategories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasProducts = category.productCount > 0;
  const canReassign = hasProducts && otherCategories.length > 0;

  async function handleDelete() {
    setSaving(true);
    setError("");
    try {
      const body = canReassign && reassignTo ? JSON.stringify({ reassignTo }) : undefined;
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao eliminar categoria");
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  const productLabel = `${category.productCount} produto${category.productCount !== 1 ? "s" : ""}`;

  return (
    <ModalShell
      title={`Eliminar "${category.name}"`}
      subtitle={hasProducts ? `Esta categoria tem ${productLabel} associados.` : undefined}
      onClose={onClose}
      maxWidth={440}
    >
      {error && (
        <div className="alert-error" style={{ marginBottom: "var(--s4)" }}>{error}</div>
      )}

      {hasProducts && otherCategories.length === 0 && (
        <div className="alert-error" style={{ marginBottom: "var(--s4)" }}>
          Não existem outras categorias para onde mover os {productLabel}. Cria primeiro uma nova categoria ou elimina os produtos manualmente.
        </div>
      )}

      {canReassign && (
        <div style={{ marginBottom: "var(--s5)" }}>
          <label
            htmlFor="reassign-select"
            style={{
              display: "block",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: "var(--s2)",
            }}
          >
            Mover produtos para
          </label>
          <select
            id="reassign-select"
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className="input"
          >
            {otherCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.productCount} produto{cat.productCount !== 1 ? "s" : ""})
              </option>
            ))}
          </select>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--s2)" }}>
            Os {productLabel} serão movidos para a categoria selecionada antes da eliminação.
          </p>
        </div>
      )}

      {!hasProducts && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--s5)" }}>
          Esta categoria não tem produtos. Podes eliminá-la com segurança.
        </p>
      )}

      <div style={{ display: "flex", gap: "var(--s3)", flexDirection: "column" }}>
        <button
          onClick={handleDelete}
          disabled={saving || (hasProducts && otherCategories.length === 0)}
          className="btn btn-danger"
          style={{ minHeight: "var(--touch-sm)", fontSize: "var(--text-sm)", width: "100%", opacity: (hasProducts && otherCategories.length === 0) ? 0.5 : 1 }}
        >
          {saving
            ? "A processar…"
            : canReassign
              ? `Mover e Eliminar`
              : "Eliminar Categoria"}
        </button>
        <button
          onClick={onClose}
          disabled={saving}
          className="btn btn-ghost"
          style={{ minHeight: "var(--touch-sm)", fontSize: "var(--text-sm)", width: "100%" }}
        >
          Cancelar
        </button>
      </div>
    </ModalShell>
  );
}
