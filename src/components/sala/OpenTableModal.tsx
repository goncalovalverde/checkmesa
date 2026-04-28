"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ModalShell";
import type { Table } from "@/types/sala";

interface Props {
  table: Table;
  onClose: () => void;
  onOpened: () => void;
}

export function OpenTableModal({ table, onClose, onOpened }: Props) {
  const router = useRouter();
  const [consumers, setConsumers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOpen() {
    if (consumers < 1) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: table.id, consumers }),
      });
      if (!res.ok) throw new Error("Falha ao abrir mesa");
      onOpened();
      router.push(`/sala/${table.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir mesa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      title="Abrir Mesa"
      subtitle={`${table.name} · ${table.capacity} lugares`}
      onClose={onClose}
    >
      <div>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", marginBottom: "var(--s3)" }}>
          Número de pessoas
        </p>
        <div className="big-stepper">
          <button
            type="button"
            className="big-btn minus"
            onClick={() => setConsumers((n) => Math.max(1, n - 1))}
            aria-label="Diminuir"
          >−</button>
          <span className="big-num">{consumers}</span>
          <button
            type="button"
            className="big-btn plus"
            onClick={() => setConsumers((n) => n + 1)}
            aria-label="Aumentar"
          >+</button>
        </div>
      </div>

      {error && <div className="alert-error" style={{ margin: 0 }}>{error}</div>}

      <div style={{ display: "flex", gap: "var(--s3)" }}>
        <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
          Cancelar
        </button>
        <button type="button" onClick={handleOpen} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
          {loading ? "A abrir…" : "Abrir Mesa"}
        </button>
      </div>
    </ModalShell>
  );
}

