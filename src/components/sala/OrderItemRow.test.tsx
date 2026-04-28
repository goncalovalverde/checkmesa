import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderItemRow } from "./OrderItemRow";

const BASE_ITEM = {
  id: "item-1",
  sessionId: "session-1",
  productId: "prod-1",
  quantity: 2,
  unitPrice: 5.5,
  product: {
    id: "prod-1",
    name: "Bife com Fritas",
    type: "DISH",
    category: "prato",
    finalPrice: 5.5,
    basePrice: 4.87,
    vatAmount: 0.63,
    vatRate: 0.13,
    active: true,
  },
};

describe("OrderItemRow", () => {
  it("renders product name, unit price, and line total", () => {
    render(<OrderItemRow item={BASE_ITEM} onQuantityChange={jest.fn()} />);
    expect(screen.getByText("Bife com Fritas")).toBeInTheDocument();
    expect(screen.getByText("€5.50 / un.")).toBeInTheDocument();
    expect(screen.getByText("€11.00")).toBeInTheDocument();
  });

  it("calls onQuantityChange with (itemId, quantity + 1) on plus click", async () => {
    const handler = jest.fn();
    render(<OrderItemRow item={BASE_ITEM} onQuantityChange={handler} />);
    await userEvent.click(screen.getByLabelText("Aumentar quantidade"));
    expect(handler).toHaveBeenCalledWith("item-1", 3);
  });

  it("calls onQuantityChange with (itemId, quantity - 1) on minus click", async () => {
    const handler = jest.fn();
    render(<OrderItemRow item={BASE_ITEM} onQuantityChange={handler} />);
    await userEvent.click(screen.getByLabelText("Diminuir quantidade"));
    expect(handler).toHaveBeenCalledWith("item-1", 1);
  });

  it("calls onQuantityChange with (itemId, 0) when quantity is 1 and minus is clicked", async () => {
    const handler = jest.fn();
    const singleItem = { ...BASE_ITEM, quantity: 1 };
    render(<OrderItemRow item={singleItem} onQuantityChange={handler} />);
    await userEvent.click(screen.getByLabelText("Diminuir quantidade"));
    expect(handler).toHaveBeenCalledWith("item-1", 0);
  });
});
