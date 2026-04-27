"use client";
import { useEffect, useState } from "react";
import { TableModal } from "@/components/admin/TableModal";

interface Table {
  id: string; name: string; capacity: number; status: "FREE" | "OCCUPIED";
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalTable, setModalTable] = useState<Table | null | undefined>(undefined);

  async function fetchTables() {
    try {
      const res = await fetch("/api/tables");
      if (!res.ok) throw new Error("Erro ao carregar mesas");
      setTables(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTables(); }, []);

  async function handleDelete(table: Table) {
    if (table.status !== "FREE") { setError("Só é possível eliminar mesas livres"); return; }
    if (!confirm(`Eliminar mesa ${table.name}?`)) return;
    try {
      const res = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao eliminar");
      await fetchTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao eliminar");
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1 className="admin-title">Mesas</h1>
        <button onClick={() => setModalTable(null)} className="btn btn-primary" style={{ fontSize: "var(--text-sm)", padding: "0 var(--s4)", minHeight: "var(--touch-sm)" }}>
          Nova Mesa
        </button>
      </div>

      <div style={{ padding: "var(--s5)" }}>
        {error && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{error}</div>}
        {loading
          ? <p style={{ color: "var(--text-muted)" }}>A carregar…</p>
          : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Capacidade</th>
                      <th>Estado</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => (
                      <tr key={table.id}>
                        <td style={{ fontWeight: 600 }}>{table.name}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{table.capacity}</td>
                        <td>
                          <span className={table.status === "FREE" ? "badge badge-free" : "badge badge-occ"}>
                            {table.status === "FREE" ? "Livre" : "Ocupada"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button onClick={() => setModalTable(table)} className="btn btn-ghost" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)", marginRight: "var(--s2)" }}>
                            Editar
                          </button>
                          <button onClick={() => handleDelete(table)} disabled={table.status !== "FREE"} className="btn btn-danger" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </div>

      {modalTable !== undefined && (
        <TableModal
          table={modalTable}
          onClose={() => setModalTable(undefined)}
          onSaved={() => { setModalTable(undefined); fetchTables(); }}
        />
      )}
    </div>
  );
}
