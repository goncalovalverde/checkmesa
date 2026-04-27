"use client";
import { useEffect, useState } from "react";
import { ProductModal } from "@/components/admin/ProductModal";
import { DeleteCategoryModal } from "@/components/admin/DeleteCategoryModal";

interface Product {
  id: string; name: string; type: "DRINK" | "DISH"; category: string; categoryId: string;
  finalPrice: number; basePrice: number; vatAmount: number; vatRate: number; active: boolean;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

type Tab = "products" | "categories";

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
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

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

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

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
    if (!newCatName.trim()) return;
    setCatSaving(true);
    setCatError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
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
        body: JSON.stringify({ name: editCatName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao renomear");
      }
      setEditingCat(null);
      setEditCatName("");
      await fetchCategories();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCatSaving(false);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    setDeletingCat(cat);
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="admin-header">
        <h1 className="admin-title">
          {tab === "products" ? "Produtos" : "Categorias"}
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
        {(["products", "categories"] as Tab[]).map((t) => (
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
            {t === "products" ? "🍽️ Produtos" : "🏷️ Categorias"}
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
                          <th>Tipo</th>
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
                            <td>
                              <span className="badge" style={{
                                background: product.type === "DRINK" ? "#DBEAFE" : "#FEF3C7",
                                color: product.type === "DRINK" ? "#1D4ED8" : "#92400E",
                              }}>{product.type}</span>
                            </td>
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
                  style={{ flex: 1 }}
                />
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
                                    <form onSubmit={handleRenameCategory} style={{ display: "flex", gap: "var(--s2)" }}>
                                      <input
                                        value={editCatName}
                                        onChange={(e) => setEditCatName(e.target.value)}
                                        required
                                        autoFocus
                                        className="input"
                                        style={{ padding: "var(--s1) var(--s3)", minHeight: 36, fontSize: "var(--text-sm)" }}
                                      />
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
                                <button
                                  onClick={() => { setEditingCat(cat); setEditCatName(cat.name); }}
                                  className="btn btn-ghost"
                                  style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)", marginRight: "var(--s2)" }}
                                >
                                  Renomear
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="btn btn-danger"
                                  style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}
                                >
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
            fetchProducts(); // product category names change after reassignment
          }}
        />
      )}
    </div>
  );
}

