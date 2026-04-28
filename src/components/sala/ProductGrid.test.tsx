import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductGrid } from "./ProductGrid";

const PRODUCTS = [
  { id: "1", name: "Água",        category: "bebida",    finalPrice: 1.0,  basePrice: 0.81, vatAmount: 0.19, vatRate: 0.23, active: true },
  { id: "2", name: "Bife",        category: "prato",     finalPrice: 12.0, basePrice: 10.62, vatAmount: 1.38, vatRate: 0.13, active: true },
  { id: "3", name: "Mousse",      category: "sobremesa", finalPrice: 4.0,  basePrice: 3.54, vatAmount: 0.46, vatRate: 0.13, active: true },
  { id: "4", name: "Caldo Verde", category: "entrada",   finalPrice: 3.5,  basePrice: 3.1,  vatAmount: 0.40, vatRate: 0.13, active: true },
];

describe("ProductGrid", () => {
  it("renders products for the default Entradas tab", () => {
    render(<ProductGrid products={PRODUCTS} onAddProduct={jest.fn()} />);
    expect(screen.getByText("Caldo Verde")).toBeInTheDocument();
    expect(screen.queryByText("Bife")).not.toBeInTheDocument();
  });

  it("filters to Bebidas when that tab is clicked", async () => {
    render(<ProductGrid products={PRODUCTS} onAddProduct={jest.fn()} />);
    await userEvent.click(screen.getByText("Bebidas"));
    expect(screen.getByText("Água")).toBeInTheDocument();
    expect(screen.queryByText("Bife")).not.toBeInTheDocument();
  });

  it("filters to Sobremesas when that tab is clicked", async () => {
    render(<ProductGrid products={PRODUCTS} onAddProduct={jest.fn()} />);
    await userEvent.click(screen.getByText("Sobremesas"));
    expect(screen.getByText("Mousse")).toBeInTheDocument();
    expect(screen.queryByText("Bife")).not.toBeInTheDocument();
  });

  it("calls onAddProduct with the correct product when a card is clicked", async () => {
    const handler = jest.fn();
    render(<ProductGrid products={PRODUCTS} onAddProduct={handler} />);
    await userEvent.click(screen.getByText("Pratos"));
    await userEvent.click(screen.getByText("Bife"));
    expect(handler).toHaveBeenCalledWith(PRODUCTS[1]);
  });

  it("falls back to all products when the active tab has no matches", async () => {
    const drinkOnly = [PRODUCTS[0]];
    render(<ProductGrid products={drinkOnly} onAddProduct={jest.fn()} />);
    // Default tab is Entradas — no matches → fallback shows all products
    expect(screen.getByText("Água")).toBeInTheDocument();
  });
});
