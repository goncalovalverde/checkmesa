"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { OpenTableModal } from "@/components/sala/OpenTableModal";

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: "FREE" | "OCCUPIED";
}

export default function SalaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [sessionTotals, setSessionTotals] = useState<Record<string, number>>({});

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (!res.ok) throw new Error("Erro ao carregar mesas");
      const data: Table[] = await res.json();
      setTables(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionTotals = useCallback(async (tableList: Table[]) => {
    const occupied = tableList.filter((t) => t.status === "OCCUPIED");
    const totals: Record<string, number> = {};
    await Promise.all(
      occupied.map(async (table) => {
        try {
          const res = await fetch(`/api/tables/${table.id}/session`);
          if (!res.ok) return;
          const sess = await res.json();
          if (!sess) return;
          const total = (sess.orderItems ?? []).reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
              sum + item.quantity * item.unitPrice,
            0
          );
          totals[table.id] = total;
        } catch {}
      })
    );
    setSessionTotals(totals);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetchTables().then(fetchSessionTotals);
  }, [fetchTables, fetchSessionTotals]);

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--brand)", fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>
          A carregar…
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      {/* App Bar */}
      <header className="app-bar">
        <span className="app-bar-title" style={{ color: "var(--brand)" }}>CheckMesa</span>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{session?.user?.name}</span>
          {(session?.user as { role?: string })?.role === "ADMIN" && (
            <button onClick={() => router.push("/admin")} className="btn btn-outline" style={{ minHeight: "var(--touch-sm)", padding: "0 var(--s3)", fontSize: "var(--text-sm)" }}>
              Admin
            </button>
          )}
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn btn-ghost" style={{ minHeight: "var(--touch-sm)", padding: "0 var(--s3)", fontSize: "var(--text-sm)" }}>
            Sair
          </button>
        </div>
      </header>

      {/* Table grid */}
      <main>
        {error && <div className="alert-error">{error}</div>}
        <div className="table-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
          {tables.map((table) => {
            const isFree = table.status === "FREE";
            return (
              <button
                key={table.id}
                onClick={() => isFree ? setSelectedTable(table) : router.push(`/sala/${table.id}`)}
                className={`table-card ${isFree ? "free" : "occ"}`}
              >
                <span className="tc-icon">{isFree ? "🟢" : "🔴"}</span>
                <span className="tc-num">{table.name.replace(/\D+/, "") || table.name}</span>
                <span className="tc-status">{isFree ? "Livre" : "Ocupada"}</span>
                <span className="tc-info">
                  {table.name.includes(" ") ? table.name.split(" ").slice(0, -1).join(" ") : ""}
                  {"\n"}{table.capacity} lug.
                  {!isFree && sessionTotals[table.id] !== undefined
                    ? `\n€${sessionTotals[table.id].toFixed(2)}`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {selectedTable && (
        <OpenTableModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onOpened={() => { setSelectedTable(null); fetchTables().then(fetchSessionTotals); }}
        />
      )}
    </div>
  );
}
