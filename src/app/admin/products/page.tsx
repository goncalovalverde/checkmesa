"use client";
import { useEffect, useState } from "react";
import { ProductModal } from "@/components/admin/ProductModal";
import { DeleteCategoryModal } from "@/components/admin/DeleteCategoryModal";

interface Product {
  id: string; name: string; category: string; categoryId: string;
  finalPrice: number; basePrice: number; vatAmount: number; vatRate: number; active: boolean;
}

interface VatRate {
  id: string;
  label: string;
  rate: number;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
  vatRate: VatRate;
}

type Tab = "products" | "categories" | "iva";

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("products");

  // ── Products state ──────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined);

  // ── Categories state ────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatVatRateId, setNewCatVatRateId] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatVatRateId, setEditCatVatRateId] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  // ── VAT Rates state ─────────────────────────────────────────────
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [vatLoading, setVatLoading] = useState(true);
  const [vatError, setVatError] = useState("");
  const [newVatLabel, setNewVatLabel] = useState("");
  const [newVatRate, setNewVatRate] = useState("");
  const [editingVat, setEditingVat] = useState<VatRate | null>(null);
  const [editVatLabel, setEditVatLabel] = useState("");
  const [editVatRate, setEditVatRate] = useState("");
  const [vatSaving, setVatSaving] = useState(false);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      setProducts(await res.json());
    } catch (err) {
      setProductsError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setProductsLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      setCategories(await res.json());
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCatLoading(false);
    }
  }

  async function fetchVatRates() {
    try {
      const res = await fetch("/api/vat-rates");
      if (!res.ok) throw new Error("Erro ao carregar taxas IVA");
      const data: VatRate[] = await res.json();
      setVatRates(data);
      if (data.length > 0 && !newCatVatRateId) setNewCatVatRateId(data[0].id);
    } catch (err) {
      setVatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setVatLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); fetchCategories(); fetchVatRates(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Product actions ─────────────────────────────────────────────
  async function handleToggleActive(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      await fetchProducts();
    } catch (err) {
      setProductsError(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!confirm(`Desativar produto ${product.name}?`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao eliminar");
      await fetchProducts();
    } catch (err) {
      setProductsError(err instanceof Error ? err.message : "Erro ao eliminar");
    }
  }

  // ── Category actions ────────────────────────────────────────────
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim() || !newCatVatRateId) return;
    setCatSaving(true);
    setCatError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), vatRateId: newCatVatRateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao criar categoria");
      }
      setNewCatName("");
      await fetchCategories();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCatSaving(false);
    }
  }

  async function handleRenameCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCat || !editCatName.trim()) return;
    setCatSaving(true);
    setCatError("");
    try {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCatName.trim(), vatRateId: editCatVatRateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar");
      }
      setEditingCat(null);
      setEditCatName("");
      await fetchCategories();
      await fetchProducts(); // products' vatRate may have been recalculated
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCatSaving(false);
    }
  }

  // ── VAT Rate actions ────────────────────────────────────────────
  async function handleAddVatRate(e: React.FormEvent) {
    e.preventDefault();
    if (!newVatLabel.trim() || !newVatRate) return;
    setVatSaving(true);
    setVatError("");
    try {
      const res = await fetch("/api/vat-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newVatLabel.trim(), rate: parseFloat(newVatRate) / 100 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao criar taxa IVA");
      }
      setNewVatLabel("");
      setNewVatRate("");
      await fetchVatRates();
    } catch (err) {
      setVatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setVatSaving(false);
    }
  }

  async function handleUpdateVatRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVat || !editVatLabel.trim()) return;
    setVatSaving(true);
    setVatError("");
    try {
      const res = await fetch(`/api/vat-rates/${editingVat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editVatLabel.trim(), rate: parseFloat(editVatRate) / 100 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar taxa IVA");
      }
      setEditingVat(null);
      await fetchVatRates();
      await fetchCategories();
    } catch (err) {
      setVatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setVatSaving(false);
    }
  }

  async function handleDeleteVatRate(vr: VatRate) {
    if (!confirm(`Eliminar taxa "${vr.label}"?`)) return;
    setVatError("");
    try {
      const res = await fetch(`/api/vat-rates/${vr.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao eliminar taxa IVA");
      }
      await fetchVatRates();
    } catch (err) {
      setVatError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  const tabLabels: Record<Tab, string> = {
    products: "🍽️ Produtos",
    categories: "🏷️ Categorias",
    iva: "💶 IVA",
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="admin-header">
        <h1 className="admin-title">
          {tab === "products" ? "Produtos" : tab === "categories" ? "Categorias" : "Taxas IVA"}
        </h1>
        {tab === "products" && (
          <button
            onClick={() => setModalProduct(null)}
            className="btn btn-primary"
            style={{ fontSize: "var(--text-sm)", padding: "0 var(--s4)", minHeight: "var(--touch-sm)" }}
          >
            Novo Produto
          </button>
        )}
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{
        display: "flex",
        gap: "var(--s1)",
        padding: "0 var(--s5)",
        borderBottom: "1px solid var(--border)",
      }}>
        {(["products", "categories", "iva"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "var(--s2) var(--s4)",
              fontSize: "var(--text-sm)",
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? "var(--brand)" : "var(--text-secondary)",
              borderBottom: tab === t ? "2px solid var(--brand)" : "2px solid transparent",
              background: "none",
              border: "none",
              borderRadius: 0,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: "var(--s5)" }}>

        {/* ── Products tab ── */}
        {tab === "products" && (
          <>
            {productsError && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{productsError}</div>}
            {productsLoading
              ? <p style={{ color: "var(--text-muted)" }}>A carregar…</p>
              : (
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Categoria</th>
                          <th>Preço</th>
                          <th>IVA</th>
                          <th>Ativo</th>
                          <th style={{ textAlign: "right" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td style={{ fontWeight: 600 }}>{product.name}</td>
                            <td style={{ color: "var(--text-secondary)" }}>{product.category}</td>
                            <td style={{ fontWeight: 600 }}>€{product.finalPrice.toFixed(2)}</td>
                            <td style={{ color: "var(--text-secondary)" }}>{(product.vatRate * 100).toFixed(0)}%</td>
                            <td>
                              <button
                                onClick={() => handleToggleActive(product)}
                                style={{
                                  position: "relative", display: "inline-flex", height: 24, width: 44,
                                  alignItems: "center", borderRadius: 9999, border: "none", cursor: "pointer",
                                  background: product.active ? "var(--brand)" : "var(--border)",
                                  transition: "background var(--dur-fast)",
                                }}
                              >
                                <span style={{
                                  display: "inline-block", height: 16, width: 16, borderRadius: 9999, background: "#fff",
                                  transform: product.active ? "translateX(24px)" : "translateX(4px)",
                                  transition: "transform var(--dur-fast)",
                                }} />
                              </button>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => setModalProduct(product)}
                                className="btn btn-ghost"
                                style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)", marginRight: "var(--s2)" }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="btn btn-danger"
                                style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}
                              >
                                Desativar
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
          </>
        )}

        {/* ── Categories tab ── */}
        {tab === "categories" && (
          <>
            {catError && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{catError}</div>}

            {/* Add new category */}
            <div className="card" style={{ marginBottom: "var(--s4)", padding: "var(--s4)" }}>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--s3)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                Nova Categoria
              </p>
              <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "var(--s3)" }}>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria…"
                  required
                  className="input"
                  style={{ flex: 2 }}
                />
                <select
                  value={newCatVatRateId}
                  onChange={(e) => setNewCatVatRateId(e.target.value)}
                  required
                  className="input"
                  style={{ flex: 1, cursor: "pointer" }}
                >
                  <option value="">Taxa IVA…</option>
                  {vatRates.map((vr) => (
                    <option key={vr.id} value={vr.id}>{vr.label}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="btn btn-primary"
                  style={{ minWidth: 100, fontSize: "var(--text-sm)" }}
                >
                  {catSaving ? "A criar…" : "Criar"}
                </button>
              </form>
            </div>

            {/* Category list */}
            {catLoading
              ? <p style={{ color: "var(--text-muted)" }}>A carregar…</p>
              : categories.length === 0
                ? (
                  <div className="card" style={{ padding: "var(--s6)", textAlign: "center", color: "var(--text-muted)" }}>
                    Nenhuma categoria criada. Adiciona a primeira acima.
                  </div>
                )
                : (
                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Taxa IVA</th>
                            <th>Produtos</th>
                            <th style={{ textAlign: "right" }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((cat) => (
                            <tr key={cat.id}>
                              <td>
                                {editingCat?.id === cat.id
                                  ? (
                                    <form onSubmit={handleRenameCategory} style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
                                      <input
                                        value={editCatName}
                                        onChange={(e) => setEditCatName(e.target.value)}
                                        required
                                        autoFocus
                                        className="input"
                                        style={{ padding: "var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)", flex: 2, minWidth: 120 }}
                                      />
                                      <select
                                        value={editCatVatRateId}
                                        onChange={(e) => setEditCatVatRateId(e.target.value)}
                                        required
                                        className="input"
                                        style={{ padding: "var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)", flex: 1, cursor: "pointer", minWidth: 120 }}
                                      >
                                        {vatRates.map((vr) => (
                                          <option key={vr.id} value={vr.id}>{vr.label}</option>
                                        ))}
                                      </select>
                                      <button type="submit" disabled={catSaving} className="btn btn-primary" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}>
                                        {catSaving ? "…" : "Guardar"}
                                      </button>
                                      <button type="button" onClick={() => setEditingCat(null)} className="btn btn-ghost" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}>
                                        Cancelar
                                      </button>
                                    </form>
                                  )
                                  : <span style={{ fontWeight: 600 }}>{cat.name}</span>
                                }
                              </td>
                              <td style={{ color: "var(--text-secondary)" }}>
                                {editingCat?.id !== cat.id && (
                                  <span className="badge" style={{ background: "var(--bg-warm)", color: "var(--text-secondary)" }}>
                                    {cat.vatRate?.label ?? "—"}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    background: cat.productCount > 0 ? "#FEF3C7" : "var(--bg-warm)",
                                    color: cat.productCount > 0 ? "#92400E" : "var(--text-muted)",
                                  }}
                                >
                                  {cat.productCount} produto{cat.productCount !== 1 ? "s" : ""}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {editingCat?.id !== cat.id && (
                                  <button
                                    onClick={() => {
                                      setEditingCat(cat);
                                      setEditCatName(cat.name);
                                      setEditCatVatRateId(cat.vatRate?.id ?? "");
                                    }}
                                    className="btn btn-ghost"
                                    style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)", marginRight: "var(--s2)" }}
                                  >
                                    Editar
                                  </button>
                                )}
                                {editingCat?.id !== cat.id && (
                                  <button
                                    onClick={() => setDeletingCat(cat)}
                                    className="btn btn-danger"
                                    style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
            }
          </>
        )}

        {/* ── IVA tab ── */}
        {tab === "iva" && (
          <>
            {vatError && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{vatError}</div>}

            {/* Add new VAT rate */}
            <div className="card" style={{ marginBottom: "var(--s4)", padding: "var(--s4)" }}>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--s3)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                Nova Taxa IVA
              </p>
              <form onSubmit={handleAddVatRate} style={{ display: "flex", gap: "var(--s3)" }}>
                <input
                  value={newVatLabel}
                  onChange={(e) => setNewVatLabel(e.target.value)}
                  placeholder="Designação (ex: Normal (23%))…"
                  required
                  className="input"
                  style={{ flex: 2 }}
                />
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={newVatRate}
                    onChange={(e) => setNewVatRate(e.target.value)}
                    placeholder="Taxa %"
                    required
                    className="input"
                    style={{ width: "100%", paddingRight: "var(--s6)" }}
                  />
                  <span style={{ position: "absolute", right: "var(--s3)", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>%</span>
                </div>
                <button
                  type="submit"
                  disabled={vatSaving}
                  className="btn btn-primary"
                  style={{ minWidth: 100, fontSize: "var(--text-sm)" }}
                >
                  {vatSaving ? "A criar…" : "Criar"}
                </button>
              </form>
            </div>

            {/* VAT Rate list */}
            {vatLoading
              ? <p style={{ color: "var(--text-muted)" }}>A carregar…</p>
              : vatRates.length === 0
                ? (
                  <div className="card" style={{ padding: "var(--s6)", textAlign: "center", color: "var(--text-muted)" }}>
                    Nenhuma taxa IVA configurada.
                  </div>
                )
                : (
                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Designação</th>
                            <th>Taxa</th>
                            <th style={{ textAlign: "right" }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vatRates.map((vr) => (
                            <tr key={vr.id}>
                              <td>
                                {editingVat?.id === vr.id
                                  ? (
                                    <form onSubmit={handleUpdateVatRate} style={{ display: "flex", gap: "var(--s2)" }}>
                                      <input
                                        value={editVatLabel}
                                        onChange={(e) => setEditVatLabel(e.target.value)}
                                        required
                                        autoFocus
                                        className="input"
                                        style={{ padding: "var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)", flex: 2 }}
                                      />
                                      <div style={{ position: "relative", flex: 1 }}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          step={0.01}
                                          value={editVatRate}
                                          onChange={(e) => setEditVatRate(e.target.value)}
                                          required
                                          className="input"
                                          style={{ width: "100%", padding: "var(--s1) var(--s6) var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)" }}
                                        />
                                        <span style={{ position: "absolute", right: "var(--s3)", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>%</span>
                                      </div>
                                      <button type="submit" disabled={vatSaving} className="btn btn-primary" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}>
                                        {vatSaving ? "…" : "Guardar"}
                                      </button>
                                      <button type="button" onClick={() => setEditingVat(null)} className="btn btn-ghost" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}>
                                        Cancelar
                                      </button>
                                    </form>
                                  )
                                  : <span style={{ fontWeight: 600 }}>{vr.label}</span>
                                }
                              </td>
                              <td>
                                {editingVat?.id !== vr.id && (
                                  <span className="badge" style={{ background: "#DBEAFE", color: "#1D4ED8", fontWeight: 700 }}>
                                    {(vr.rate * 100).toFixed(0)}%
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {editingVat?.id !== vr.id && (
                                  <>
                                    <button
                                      onClick={() => { setEditingVat(vr); setEditVatLabel(vr.label); setEditVatRate(String(vr.rate * 100)); }}
                                      className="btn btn-ghost"
                                      style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)", marginRight: "var(--s2)" }}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVatRate(vr)}
                                      className="btn btn-danger"
                                      style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}
                                    >
                                      Eliminar
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
            }
          </>
        )}
      </div>

      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          categories={categories}
          onClose={() => setModalProduct(undefined)}
          onSaved={() => { setModalProduct(undefined); fetchProducts(); }}
        />
      )}

      {deletingCat && (
        <DeleteCategoryModal
          category={deletingCat}
          otherCategories={categories.filter((c) => c.id !== deletingCat.id)}
          onClose={() => setDeletingCat(null)}
          onDeleted={() => {
            setDeletingCat(null);
            fetchCategories();
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

