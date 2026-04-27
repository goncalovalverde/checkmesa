"use client";
import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ModalShell";

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: "FREE" | "OCCUPIED";
}

interface Props {
  table: Table | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TableModal({ table, onClose, onSaved }: Props) {
  const isEdit = !!table;
  const [name, setName] = useState(table?.name ?? "");
  const [capacity, setCapacity] = useState(String(table?.capacity ?? "4"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(table?.name ?? "");
    setCapacity(String(table?.capacity ?? "4"));
    setError("");
  }, [table]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = isEdit ? `/api/tables/${table.id}` : "/api/tables";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, capacity: parseInt(capacity, 10) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao guardar mesa");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title={isEdit ? "Editar Mesa" : "Nova Mesa"} onClose={onClose} maxWidth={420}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>
            Nome da mesa
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex: Mesa 1, Esplanada A"
            className="input"
          />
        </div>

        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>
            Capacidade (lugares)
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
            className="input"
            style={{ fontSize: "var(--text-lg)", fontWeight: 700, textAlign: "center" }}
          />
        </div>

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

