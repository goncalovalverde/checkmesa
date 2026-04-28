"use client";
import { useState } from "react";

const CATEGORIES = [
  { label: "Entradas",    emoji: "🥗" },
  { label: "Pratos",      emoji: "🍽️" },
  { label: "Bebidas",     emoji: "🥤" },
  { label: "Sobremesas",  emoji: "🍮" },
];

interface Product {
  id: string;
  name: string;
  category: string;
  finalPrice: number;
  basePrice: number;
  vatAmount: number;
  vatRate: number;
  active: boolean;
}

interface Props {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

function matchCategory(p: Product, tab: string): boolean {
  const cat = p.category?.toLowerCase() ?? "";
  const keywords: Record<string, string> = {
    bebidas: "bebida",
    pratos: "prato",
    entradas: "entrada",
    sobremesas: "sobremesa",
  };
  const keyword = keywords[tab];
  return keyword ? cat.includes(keyword) : true;
}

export function ProductGrid({ products, onAddProduct }: Props) {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].label);

  const filtered = products.filter((p) => matchCategory(p, activeCat.toLowerCase()));
  const displayProducts = filtered.length > 0 ? filtered : products;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Category tabs */}
      <div className="cat-bar">
        {CATEGORIES.map(({ label, emoji }) => (
          <button
            key={label}
            onClick={() => setActiveCat(label)}
            className={`cat-tab${activeCat === label ? " active" : ""}`}
          >
            <span>{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="product-grid" style={{ flex: 1 }}>
        {displayProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddProduct(product)}
            className="prod-card"
          >
            <span className="pc-name">{product.name}</span>
            <span className="pc-price">€{product.finalPrice.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
