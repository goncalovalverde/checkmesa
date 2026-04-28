"use client";
import { useCallback, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  productName: string;
  productType: "DRINK" | "DISH";
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface HistorySession {
  id: string;
  tableName: string;
  openedBy: string;
  openedAt: string;
  closedAt: string | null;
  consumers: number;
  total: number;
  durationMs: number | null;
  items: HistoryItem[];
}

interface Summary {
  totalRevenue: number;
  sessionCount: number;
  avgPerSession: number;
  totalConsumers: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ── Quick-filter presets ─────────────────────────────────────────────────────

type Preset = "today" | "week" | "month" | "all";

function getPresetDates(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "today") {
    const today = fmt(now);
    return { from: today, to: today };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    return { from: fmt(start), to: fmt(now) };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: fmt(now) };
  }
  return { from: "", to: "" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HistoricoPage() {
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState(() => getPresetDates("today").from);
  const [to, setTo] = useState(() => getPresetDates("today").to);
  const [page, setPage] = useState(1);

  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/historico?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar histórico");
      const data = await res.json();
      setSessions(data.sessions);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [from, to, page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  function applyPreset(p: Preset) {
    setPreset(p);
    const dates = getPresetDates(p);
    setFrom(dates.from);
    setTo(dates.to);
    setPage(1);
  }

  function handleCustomDate(field: "from" | "to", val: string) {
    setPreset("all"); // deselect preset
    if (field === "from") setFrom(val);
    else setTo(val);
    setPage(1);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "week",  label: "Esta Semana" },
    { key: "month", label: "Este Mês" },
    { key: "all",   label: "Tudo" },
  ];

  function exportParams() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="admin-header">
        <h1 className="admin-title">Histórico de Contas</h1>
        <div style={{ display: "flex", gap: "var(--s2)" }}>
          <a
            href={`/api/historico/export?${exportParams()}`}
            download
            className="btn btn-ghost"
            style={{ fontSize: "var(--text-sm)", padding: "0 var(--s4)", minHeight: "var(--touch-sm)", display: "flex", alignItems: "center", gap: "var(--s1)" }}
          >
            ⬇️ CSV
          </a>
          <a
            href={`/admin/historico/imprimir?${exportParams()}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ fontSize: "var(--text-sm)", padding: "0 var(--s4)", minHeight: "var(--touch-sm)", display: "flex", alignItems: "center", gap: "var(--s1)" }}
          >
            🖨️ PDF
          </a>
        </div>
      </div>

      <div style={{ padding: "var(--s5)" }}>

        {/* ── Summary cards ── */}
        {summary && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "var(--s4)",
            marginBottom: "var(--s5)",
          }}>
            {[
              { label: "Receita Total", value: `€${summary.totalRevenue.toFixed(2)}`, accent: true },
              { label: "Serviços",      value: summary.sessionCount },
              { label: "Média/Serviço", value: `€${summary.avgPerSession.toFixed(2)}` },
              { label: "Consumidores",  value: summary.totalConsumers },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className="card"
                style={{
                  padding: "var(--s4)",
                  borderLeft: accent ? "4px solid var(--brand)" : undefined,
                }}
              >
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "var(--s1)" }}>
                  {label}
                </p>
                <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: accent ? "var(--brand-dark)" : "var(--text-primary)", lineHeight: 1 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="card" style={{ padding: "var(--s4)", marginBottom: "var(--s4)" }}>
          <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap", alignItems: "center" }}>
            {/* Preset pills */}
            <div style={{ display: "flex", gap: "var(--s2)" }}>
              {PRESETS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  style={{
                    padding: "var(--s1) var(--s3)",
                    borderRadius: 9999,
                    fontSize: "var(--text-sm)",
                    fontWeight: preset === key ? 600 : 400,
                    background: preset === key ? "var(--brand)" : "var(--bg-warm)",
                    color: preset === key ? "#fff" : "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    transition: "background var(--dur-fast)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center", marginLeft: "auto" }}>
              <input
                type="date"
                value={from}
                onChange={(e) => handleCustomDate("from", e.target.value)}
                className="input"
                style={{ padding: "var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)", width: 150 }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => handleCustomDate("to", e.target.value)}
                className="input"
                style={{ padding: "var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)", width: 150 }}
              />
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && <div className="alert-error" style={{ marginBottom: "var(--s4)" }}>{error}</div>}

        {/* ── Table ── */}
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>A carregar…</p>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ padding: "var(--s8)", textAlign: "center", color: "var(--text-muted)" }}>
            Nenhuma conta fechada no período selecionado.
          </div>
        ) : (
          <>
            <div className="card" style={{ overflow: "hidden", marginBottom: "var(--s4)" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }} />
                      <th>Mesa</th>
                      <th>Staff</th>
                      <th>Abertura</th>
                      <th>Fecho</th>
                      <th>Duração</th>
                      <th>Pax</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const isOpen = expanded.has(s.id);
                      return (
                        <>
                          <tr
                            key={s.id}
                            onClick={() => toggleExpand(s.id)}
                            style={{ cursor: "pointer", background: isOpen ? "var(--bg-warm)" : undefined }}
                          >
                            <td style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", textAlign: "center" }}>
                              {isOpen ? "▲" : "▼"}
                            </td>
                            <td style={{ fontWeight: 600 }}>{s.tableName}</td>
                            <td style={{ color: "var(--text-secondary)" }}>{s.openedBy}</td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}>{formatTime(s.openedAt)}</td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}>{formatTime(s.closedAt)}</td>
                            <td style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{formatDuration(s.durationMs)}</td>
                            <td style={{ textAlign: "center" }}>{s.consumers}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--brand-dark)" }}>
                              €{s.total.toFixed(2)}
                            </td>
                          </tr>

                          {isOpen && (
                            <tr key={`${s.id}-detail`}>
                              <td colSpan={8} style={{ padding: 0, borderTop: "none" }}>
                                <div style={{
                                  background: "var(--bg-warm)",
                                  borderTop: "1px solid var(--border)",
                                  borderBottom: "1px solid var(--border)",
                                  padding: "var(--s3) var(--s5)",
                                }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                                    <thead>
                                      <tr style={{ color: "var(--text-muted)" }}>
                                        <th style={{ textAlign: "left", padding: "var(--s1) var(--s2)", fontWeight: 600, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em" }}>Produto</th>
                                        <th style={{ textAlign: "left", padding: "var(--s1) var(--s2)", fontWeight: 600, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em" }}>Tipo</th>
                                        <th style={{ textAlign: "right", padding: "var(--s1) var(--s2)", fontWeight: 600, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em" }}>Qtd</th>
                                        <th style={{ textAlign: "right", padding: "var(--s1) var(--s2)", fontWeight: 600, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em" }}>Preço Unit.</th>
                                        <th style={{ textAlign: "right", padding: "var(--s1) var(--s2)", fontWeight: 600, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em" }}>Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {s.items.map((item) => (
                                        <tr key={item.id}>
                                          <td style={{ padding: "var(--s1) var(--s2)" }}>{item.productName}</td>
                                          <td style={{ padding: "var(--s1) var(--s2)" }}>
                                            <span className="badge" style={{
                                              background: item.productType === "DRINK" ? "#DBEAFE" : "#FEF3C7",
                                              color: item.productType === "DRINK" ? "#1D4ED8" : "#92400E",
                                            }}>
                                              {item.productType === "DRINK" ? "Bebida" : "Prato"}
                                            </span>
                                          </td>
                                          <td style={{ textAlign: "right", padding: "var(--s1) var(--s2)" }}>×{item.quantity}</td>
                                          <td style={{ textAlign: "right", padding: "var(--s1) var(--s2)", color: "var(--text-secondary)" }}>€{item.unitPrice.toFixed(2)}</td>
                                          <td style={{ textAlign: "right", padding: "var(--s1) var(--s2)", fontWeight: 600 }}>€{item.subtotal.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ borderTop: "1px solid var(--border)" }}>
                                        <td colSpan={4} style={{ padding: "var(--s2) var(--s2)", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)" }}>Total</td>
                                        <td style={{ padding: "var(--s2) var(--s2)", textAlign: "right", fontWeight: 700, color: "var(--brand-dark)" }}>€{s.total.toFixed(2)}</td>
                                      </tr>
                                      <tr>
                                        <td colSpan={5} style={{ padding: "var(--s1) var(--s2)", textAlign: "right", borderTop: "none" }}>
                                          <a
                                            href={`/recibo/${s.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-ghost"
                                            style={{ fontSize: "var(--text-sm)", padding: "0 var(--s3)", minHeight: "var(--touch-sm)", display: "inline-flex", alignItems: "center", gap: "var(--s1)" }}
                                          >
                                            🧾 Recibo
                                          </a>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Pagination ── */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--s3)" }}>
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="btn btn-ghost"
                  style={{ minHeight: 36, padding: "0 var(--s4)", fontSize: "var(--text-sm)", opacity: page === 1 ? 0.4 : 1 }}
                >
                  ← Anterior
                </button>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  {page} / {pagination.totalPages}
                  <span style={{ color: "var(--text-muted)", marginLeft: "var(--s2)" }}>({pagination.totalCount} registos)</span>
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="btn btn-ghost"
                  style={{ minHeight: 36, padding: "0 var(--s4)", fontSize: "var(--text-sm)", opacity: page >= pagination.totalPages ? 0.4 : 1 }}
                >
                  Seguinte →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
